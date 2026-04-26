import path from "path";
import { ensureDir, slugify, writeFile } from "../utils.js";
import {
  buildPlaywrightActionLine,
  buildWdioActionLine,
  generateShortName,
  loadRouteAliases,
  getSelectorFallbacks,
  inferActionAndSelectors,
  loadSelectorAliases,
  toClassName
} from "./ui-utils.js";

export function generateUiAutomation({ scenario, gherkinFeatures, outputRoot }) {
  if (scenario.mode !== "ui" && scenario.mode !== "both") {
    return [];
  }

  const uiFeatures = gherkinFeatures.filter((feature) => feature.usage !== "api");
  if (!uiFeatures.length) {
    return [];
  }

  const selectorAliases = loadSelectorAliases(outputRoot);
  const routeAliases = loadRouteAliases(outputRoot);
  const selectorFallbacks = getSelectorFallbacks();
  const framework = scenario.automationTargets.ui;
  const frameworkRoot = path.join(outputRoot, "tests", "generated", "ui", framework);
  const pageObjectsDir = path.join(frameworkRoot, "pageobjects");
  const specsDir = path.join(frameworkRoot, "specs");
  ensureDir(pageObjectsDir);
  ensureDir(specsDir);

  if (framework === "playwright") {
    writeFile(path.join(pageObjectsDir, "page.js"), buildPlaywrightBasePage());
  } else {
    writeFile(path.join(pageObjectsDir, "page.js"), buildWdioBasePage());
  }

  const generatedFiles = [];

  for (const feature of uiFeatures) {
    const stepMap = createUiStepMap(feature, selectorAliases, selectorFallbacks, routeAliases);
    const baseName = slugify(feature.feature || feature.sourcePath);
    const className = `${toClassName(baseName)}Page`;
    const pageObjectPath = path.join(pageObjectsDir, `${baseName}.page.js`);
    const specPath = path.join(specsDir, `${baseName}.spec.js`);

    if (framework === "playwright") {
      writeFile(pageObjectPath, buildPlaywrightPageObject({ className, stepMap, baseName }));
      writeFile(specPath, buildPlaywrightSpec({ className, stepMap, baseName }));
    } else {
      writeFile(pageObjectPath, buildWdioPageObject({ className, stepMap, baseName }));
      writeFile(specPath, buildWdioSpec({ className, stepMap, baseName }));
    }

    generatedFiles.push(pageObjectPath, specPath);
  }

  return generatedFiles;
}

function createUiStepMap(feature, selectorAliases, selectorFallbacks, routeAliases) {
  const scenarios = (feature.scenarios || []).map((scenario) => ({
    title: scenario.title,
    steps: (scenario.steps || []).map((rawStep) => {
      const stepText = rawStep.text;
      const inferred = inferActionAndSelectors(stepText, selectorAliases, selectorFallbacks, routeAliases);
      return {
        raw: rawStep.raw,
        ...inferred
      };
    })
  }));

  return {
    feature: feature.feature,
    sourcePath: feature.sourcePath,
    scenarios
  };
}

function buildPlaywrightBasePage() {
  return `export default class Page {
  constructor(page) {
    this.page = page;
  }

  open(pathSegment = "/") {
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const normalized = pathSegment.startsWith("/") ? pathSegment : \`/\${pathSegment}\`;
    return this.page.goto(\`\${baseUrl}\${normalized}\`);
  }

  getLocatorChain(selectors = []) {
    const validSelectors = selectors.filter(Boolean);
    if (!validSelectors.length) {
      throw new Error("No selectors provided");
    }

    const locators = validSelectors.map((selector) => this.page.locator(selector));
    return locators.slice(1).reduce((acc, locator) => acc.or(locator), locators[0]);
  }
}
`;
}

function buildWdioBasePage() {
  return `export default class Page {
  open(pathSegment = "/") {
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const normalized = pathSegment.startsWith("/") ? pathSegment : \`/\${pathSegment}\`;
    return browser.url(\`\${baseUrl}\${normalized}\`);
  }

  async trySelector(primary, fallbacks = []) {
    const selectors = [primary, ...fallbacks].filter(Boolean);
    for (const selector of selectors) {
      const element = await $(selector);
      if (await element.isExisting()) {
        return element;
      }
    }
    throw new Error(\`Unable to resolve selector chain: \${selectors.join(", ")}\`);
  }
}
`;
}

function buildPlaywrightPageObject({ className, stepMap, baseName }) {
  const selectors = collectSelectors(stepMap);
  const lines = [
    "import { expect } from '@playwright/test';",
    "import Page from './page.js';",
    `export default class ${className} extends Page {`,
    "  constructor(page) {",
    "    super(page);",
    "  }"
  ];

  for (const selector of selectors) {
    const quoted = [selector.selector, ...selector.fallbackSelectors].map((value) => JSON.stringify(value)).join(", ");
    lines.push(`  get ${selector.selectorName}() {`);
    lines.push(`    return this.getLocatorChain([${quoted}]);`);
    lines.push("  }");
  }

  for (const scenario of stepMap.scenarios) {
    const methodName = generateShortName(scenario.title);
    lines.push(`  async ${methodName}() {`);
    lines.push("    await this.open();");
    for (const step of scenario.steps) {
      const line = buildPlaywrightActionLine(`this.${step.selectorName}`, step.action, step.note);
      lines.push(`    ${line}`);
    }
    lines.push("  }");
  }

  lines.push("}");
  return lines.join("\n") + "\n";
}

function buildPlaywrightSpec({ className, stepMap, baseName }) {
  const lines = [
    "import { test } from '@playwright/test';",
    `import ${className} from '../pageobjects/${baseName}.page.js';`,
    "",
    `test.describe(${JSON.stringify(`${stepMap.feature} generated UI coverage`)}, () => {`
  ];

  for (const scenario of stepMap.scenarios) {
    const methodName = generateShortName(scenario.title);
    lines.push(`  test(${JSON.stringify(scenario.title)}, async ({ page }) => {`);
    lines.push(`    const pageObject = new ${className}(page);`);
    lines.push(`    await pageObject.${methodName}();`);
    lines.push("  });");
  }

  lines.push("});");
  return lines.join("\n") + "\n";
}

function buildWdioPageObject({ className, stepMap }) {
  const selectors = collectSelectors(stepMap);
  const lines = [
    "import { expect } from '@wdio/globals';",
    "import Page from './page.js';",
    `class ${className} extends Page {`
  ];

  for (const selector of selectors) {
    lines.push(`  get ${selector.selectorName}() {`);
    lines.push(`    return this.trySelector(${JSON.stringify(selector.selector)}, ${JSON.stringify(selector.fallbackSelectors)});`);
    lines.push("  }");
  }

  for (const scenario of stepMap.scenarios) {
    const methodName = generateShortName(scenario.title);
    lines.push(`  async ${methodName}() {`);
    lines.push("    await this.open();");
    for (const step of scenario.steps) {
      const line = buildWdioActionLine(`(await this.${step.selectorName})`, step.action, step.note);
      lines.push(`    ${line}`);
    }
    lines.push("  }");
  }

  lines.push("}");
  lines.push(`export default new ${className}();`);
  return lines.join("\n") + "\n";
}

function buildWdioSpec({ className, stepMap, baseName }) {
  const lines = [
    `import pageObject from '../pageobjects/${baseName}.page.js';`,
    "",
    `describe(${JSON.stringify(`${stepMap.feature} generated UI coverage`)}, () => {`
  ];

  for (const scenario of stepMap.scenarios) {
    const methodName = generateShortName(scenario.title);
    lines.push(`  it(${JSON.stringify(scenario.title)}, async () => {`);
    lines.push(`    await pageObject.${methodName}();`);
    lines.push("  });");
  }

  lines.push("});");
  return lines.join("\n") + "\n";
}

function collectSelectors(stepMap) {
  const seen = new Map();
  for (const scenario of stepMap.scenarios) {
    for (const step of scenario.steps) {
      if (!seen.has(step.selectorName)) {
        seen.set(step.selectorName, {
          selectorName: step.selectorName,
          selector: step.selector,
          fallbackSelectors: step.fallbackSelectors
        });
      }
    }
  }
  return Array.from(seen.values());
}

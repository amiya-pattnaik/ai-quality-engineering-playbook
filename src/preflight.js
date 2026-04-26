import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { loadScenario } from "./scenario.js";

const FRAMEWORK_DEPENDENCIES = {
  playwright: [
    "@playwright/test@1.53.1"
  ],
  webdriverio: [
    "@wdio/cli@9.18.0",
    "@wdio/local-runner@9.18.0",
    "@wdio/mocha-framework@9.18.0",
    "webdriverio@9.18.0",
    "expect-webdriverio@5.4.3",
    "chromedriver@138.0.0"
  ]
};

function printHelp() {
  console.log("Usage: node src/preflight.js [scenario.json] [--fix]");
  console.log("Example: node src/preflight.js scenarios/sample-qe-scenario.json --fix");
}

function detectMissingDependencies(packageJson, scenario) {
  const missing = [];
  const mode = scenario.mode;

  if (mode === "ui" || mode === "both") {
    const framework = scenario?.automationTargets?.ui;
    for (const pkg of FRAMEWORK_DEPENDENCIES[framework] || []) {
      if (!isInstalledPackage(pkg)) {
        missing.push(pkg);
      }
    }
  }

  if (mode === "api" || mode === "both") {
    const apiTarget = scenario?.automationTargets?.api || "playwright";
    for (const pkg of FRAMEWORK_DEPENDENCIES[apiTarget] || []) {
      if (!isInstalledPackage(pkg)) {
        missing.push(pkg);
      }
    }
  }

  return Array.from(new Set(missing));
}

function packageNameFromSpecifier(specifier) {
  if (specifier.startsWith("@")) {
    const secondAt = specifier.indexOf("@", 1);
    return secondAt === -1 ? specifier : specifier.slice(0, secondAt);
  }
  const firstAt = specifier.indexOf("@");
  return firstAt === -1 ? specifier : specifier.slice(0, firstAt);
}

function isInstalledPackage(specifier) {
  const pkgName = packageNameFromSpecifier(specifier);
  const packageJsonPath = path.join(process.cwd(), "node_modules", pkgName, "package.json");
  return fs.existsSync(packageJsonPath);
}

function detectBinaryStatus(scenario) {
  const checks = [];

  checks.push(checkCommand("node", "--version"));
  checks.push(checkCommand("npm", "--version"));

  if (scenario.mode === "ui" || scenario.mode === "both" || scenario.mode === "api") {
    if ((scenario.mode === "ui" || scenario.mode === "both") && scenario?.automationTargets?.ui === "playwright") {
      checks.push(checkLocalBin("playwright"));
    }
    if ((scenario.mode === "api" || scenario.mode === "both") && (scenario?.automationTargets?.api || "playwright") === "playwright") {
      checks.push(checkLocalBin("playwright"));
    }
  }

  if (scenario.mode === "ui" || scenario.mode === "both") {
    if (scenario?.automationTargets?.ui === "webdriverio") {
      checks.push(checkLocalBin("wdio"));
      checks.push(checkLocalBin("chromedriver"));
    }
  }

  return checks;
}

function detectCompatibilityWarnings(scenario) {
  const warnings = [];
  if (scenario?.automationTargets?.ui === "webdriverio" && (scenario.mode === "ui" || scenario.mode === "both")) {
    const chromeVersion = checkCommand("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "--version");
    const chromedriverVersion = checkLocalBin("chromedriver");
    const chromeMajor = extractMajorVersion(chromeVersion.output);
    const driverMajor = extractMajorVersion(chromedriverVersion.output);
    if (chromeVersion.ok && chromedriverVersion.ok && chromeMajor && driverMajor && chromeMajor !== driverMajor) {
      warnings.push(`Chrome major version (${chromeMajor}) does not match chromedriver major version (${driverMajor}). WDIO execution may fail until they are aligned.`);
    }
  }
  return warnings;
}

function detectConfigStatus(scenario) {
  const targets = new Set();
  if (scenario.mode === "api" || scenario.mode === "both") {
    if ((scenario?.automationTargets?.api || "playwright") === "playwright") {
      targets.add("playwright.config.js");
    }
  }

  if (scenario.mode === "ui" || scenario.mode === "both") {
    if (scenario?.automationTargets?.ui === "playwright") {
      targets.add("playwright.config.js");
    }
    if (scenario?.automationTargets?.ui === "webdriverio") {
      targets.add("wdio.conf.js");
    }
  }

  return Array.from(targets).map((target) => checkFile(target));
}

function checkCommand(binary, argsString) {
  try {
    const output = execSync(`"${binary}" ${argsString}`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    return { ok: true, label: `${binary} ${argsString}`, output };
  } catch (error) {
    return {
      ok: false,
      label: `${binary} ${argsString}`,
      output: error.stderr?.toString?.().trim() || error.message
    };
  }
}

function checkLocalBin(name) {
  const extension = process.platform === "win32" ? ".cmd" : "";
  const binPath = path.join(process.cwd(), "node_modules", ".bin", `${name}${extension}`);
  if (!fs.existsSync(binPath)) {
    return {
      ok: false,
      label: `local bin ${name}`,
      output: `${binPath} not found`
    };
  }

  try {
    const output = execSync(`"${binPath}" --version`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
    return {
      ok: true,
      label: `local bin ${name}`,
      output
    };
  } catch (error) {
    return {
      ok: false,
      label: `local bin ${name}`,
      output: error.stderr?.toString?.().trim() || error.message
    };
  }
}

function checkFile(relativePath) {
  const fullPath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(fullPath)) {
    return {
      ok: false,
      label: `config ${relativePath}`,
      output: `${fullPath} not found`
    };
  }

  return {
    ok: true,
    label: `config ${relativePath}`,
    output: fullPath
  };
}

function extractMajorVersion(output = "") {
  const match = String(output).match(/(\d+)\./);
  return match ? Number(match[1]) : null;
}

function installMissingDependencies(packages) {
  if (!packages.length) return;
  execSync(`npm install -D ${packages.join(" ")}`, {
    stdio: "inherit",
    cwd: process.cwd()
  });
}

function installPlaywrightBrowserIfNeeded(scenario) {
  const usesPlaywright =
    ((scenario.mode === "api" || scenario.mode === "both") && (scenario?.automationTargets?.api || "playwright") === "playwright") ||
    ((scenario.mode === "ui" || scenario.mode === "both") && scenario?.automationTargets?.ui === "playwright");

  if (!usesPlaywright) return;

  execSync("npx playwright install chromium", {
    stdio: "inherit",
    cwd: process.cwd()
  });
}

function printSummary({ scenarioPath, scenario, missingDependencies, binaryChecks, configChecks, warnings, fixed }) {
  console.log(`Scenario: ${scenarioPath}`);
  console.log(`Mode: ${scenario.mode}`);
  console.log(`UI framework: ${scenario?.automationTargets?.ui || "n/a"}`);
  console.log(`API runner: ${scenario?.automationTargets?.api || "playwright"}`);
  console.log("");
  console.log("Binary checks:");
  binaryChecks.forEach((check) => {
    console.log(`- ${check.ok ? "OK" : "MISSING"} ${check.label}`);
    if (check.output) {
      console.log(`  ${check.output}`);
    }
  });
  console.log("");
  console.log("Config checks:");
  configChecks.forEach((check) => {
    console.log(`- ${check.ok ? "OK" : "MISSING"} ${check.label}`);
    if (check.output) {
      console.log(`  ${check.output}`);
    }
  });
  console.log("");
  console.log("Package checks:");
  if (missingDependencies.length) {
    missingDependencies.forEach((pkg) => console.log(`- MISSING ${pkg}`));
  } else {
    console.log("- OK all required packages are present for selected mode/framework");
  }
  console.log("");
  if (warnings.length) {
    console.log("Compatibility warnings:");
    warnings.forEach((warning) => console.log(`- ${warning}`));
    console.log("");
  }
  if (fixed) {
    console.log("Preflight fix completed.");
  } else {
    console.log("Run with --fix to install missing local dependencies for the selected framework.");
  }
  if (scenario?.automationTargets?.ui === "webdriverio") {
    console.log("Note: WebdriverIO may still require browser-driver/service setup depending on your environment.");
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const fix = args.includes("--fix");
  const scenarioPath = args.find((arg) => !arg.startsWith("--")) || "scenarios/sample-qe-scenario.json";
  const { scenario, absolutePath } = loadScenario(scenarioPath);
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const missingDependencies = detectMissingDependencies(packageJson, scenario);
  const binaryChecksBefore = detectBinaryStatus(scenario);
  const configChecks = detectConfigStatus(scenario);
  const warnings = detectCompatibilityWarnings(scenario);

  if (fix) {
    installMissingDependencies(missingDependencies);
    installPlaywrightBrowserIfNeeded(scenario);
  }

  const binaryChecksAfter = detectBinaryStatus(scenario);
  printSummary({
    scenarioPath: absolutePath,
    scenario,
    missingDependencies: fix ? [] : missingDependencies,
    binaryChecks: fix ? binaryChecksAfter : binaryChecksBefore,
    configChecks,
    warnings,
    fixed: fix
  });
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

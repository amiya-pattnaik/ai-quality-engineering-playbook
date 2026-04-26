import path from "path";
import { ensureDir, slugify, writeFile } from "../utils.js";

export function generateRestApiAutomation({ scenario, gherkinFeatures, functionalTests, outputRoot }) {
  if (scenario.mode !== "api" && scenario.mode !== "both") {
    return [];
  }

  const apiFeatures = gherkinFeatures.filter((feature) => feature.usage !== "ui");
  if (!apiFeatures.length) {
    return [];
  }

  const apiDir = path.join(outputRoot, "tests", "generated", "api");
  ensureDir(apiDir);

  const generatedFiles = [];
  const apiStepMaps = apiFeatures.map((feature) => createApiStepMap(feature));
  const structuredMaps = apiStepMaps.filter((item) => item.scenarios.some((scenarioItem) => scenarioItem.requests.length));

  if (!structuredMaps.length) {
    const filePath = path.join(apiDir, `${scenario.name}.api.spec.js`);
    writeFile(filePath, buildFallbackApiSpec(functionalTests, scenario));
    generatedFiles.push(filePath);
    return generatedFiles;
  }

  for (const stepMap of structuredMaps) {
    const baseName = slugify(stepMap.feature);
    const useRestRunner = (scenario?.automationTargets?.api || "playwright") === "basic-rest";
    const filePath = path.join(apiDir, useRestRunner ? `${baseName}.api.test.js` : `${baseName}.api.spec.js`);
    writeFile(filePath, useRestRunner ? buildStructuredRestSpec(stepMap) : buildStructuredApiSpec(stepMap));
    generatedFiles.push(filePath);
  }

  return generatedFiles;
}

function buildStructuredRestSpec(stepMap) {
  const lines = [
    "import test from 'node:test';",
    "import assert from 'node:assert/strict';",
    ""
  ];

  for (const scenario of stepMap.scenarios.filter((item) => item.requests.length)) {
    lines.push(`test(${JSON.stringify(`${stepMap.feature} :: ${scenario.name}`)}, async () => {`);
    lines.push(`  const resolvedBaseUrl = ${JSON.stringify(scenario.baseUrl)} || 'http://localhost:3000';`);
    lines.push(`  const sharedHeaders = ${JSON.stringify(scenario.sharedHeaders || {})};`);

    scenario.requests.forEach((requestStep, index) => {
      const responseVar = `response${index + 1}`;
      const bodyVar = `body${index + 1}`;
      const paramsExpression = requestStep.queryParams && Object.keys(requestStep.queryParams).length
        ? `new URLSearchParams(${JSON.stringify(requestStep.queryParams)}).toString()`
        : "''";
      lines.push(`  const query${index + 1} = ${paramsExpression};`);
      lines.push(`  const url${index + 1} = \`\${resolvedBaseUrl}${requestStep.endpoint}\${query${index + 1} ? \`?\${query${index + 1}}\` : ''}\`;`);
      if (requestStep.dataFile) {
        lines.push(`  const ${bodyVar} = (await import(${JSON.stringify(`../../../data/${requestStep.dataFile}`)}, { assert: { type: 'json' } })).default;`);
      } else if (requestStep.body) {
        lines.push(`  const ${bodyVar} = ${JSON.stringify(requestStep.body)};`);
      }
      const hasBody = requestStep.dataFile || requestStep.body;
      lines.push(`  const ${responseVar} = await fetch(url${index + 1}, {`);
      lines.push(`    method: ${JSON.stringify(requestStep.method)},`);
      lines.push(`    headers: { "content-type": "application/json", ...sharedHeaders, ...${JSON.stringify(requestStep.headers || {})} },`);
      if (hasBody) {
        lines.push(`    body: JSON.stringify(${bodyVar})`);
      }
      lines.push("  });");
      lines.push(`  const json${index + 1} = await ${responseVar}.json();`);

      scenario.assertions
        .filter((assertion) => assertion.requestIndex === index)
        .forEach((assertion) => {
          if (assertion.type === "status") {
            lines.push(`  assert.equal(${responseVar}.status, ${assertion.expected});`);
          }
          if (assertion.type === "contains") {
            lines.push(`  assert.ok(Object.prototype.hasOwnProperty.call(json${index + 1}, ${JSON.stringify(assertion.key)}));`);
          }
          if (assertion.type === "fieldEquals") {
            lines.push(`  assert.equal(json${index + 1}[${JSON.stringify(assertion.field)}], ${JSON.stringify(assertion.expected)});`);
          }
          if (assertion.type === "containsText") {
            lines.push(`  assert.match(JSON.stringify(json${index + 1}), new RegExp(${JSON.stringify(assertion.expected)}));`);
          }
        });
    });

    lines.push("});");
    lines.push("");
  }

  return lines.join("\n");
}

function createApiStepMap(feature) {
  return {
    feature: feature.feature,
    sourcePath: feature.sourcePath,
    scenarios: feature.scenarios.map((scenario) => parseApiScenario(scenario))
  };
}

function parseApiScenario(scenario) {
  const scenarioMap = {
    name: scenario.title,
    tags: scenario.tags || [],
    baseUrl: "",
    requests: [],
    assertions: [],
    sharedHeaders: {}
  };

  let currentRequestIndex = -1;

  for (const step of scenario.steps) {
    const text = step.text.replace(/[“”]/g, "\"").trim();

    const baseUrlMatch = text.match(/^base URL is "(.*?)"$/i);
    if (baseUrlMatch) {
      scenarioMap.baseUrl = baseUrlMatch[1];
      continue;
    }

    const requestMatch = text.match(/^I (GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS) "(.*?)"$/i);
    if (requestMatch) {
      currentRequestIndex += 1;
      scenarioMap.requests.push({
        method: requestMatch[1].toUpperCase(),
        endpoint: requestMatch[2],
        body: dataTableToBody(step.dataTable),
        headers: {},
        queryParams: {}
      });
      continue;
    }

    const usingDataMatch = text.match(/^I (?:send a )?(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS) request to "(.*?)" using data from "(.*?)"$/i);
    if (usingDataMatch) {
      currentRequestIndex += 1;
      scenarioMap.requests.push({
        method: usingDataMatch[1].toUpperCase(),
        endpoint: usingDataMatch[2],
        dataFile: usingDataMatch[3],
        headers: {},
        queryParams: {}
      });
      continue;
    }

    const headerMatch = text.match(/^(?:request )?header "(.*?)" should be set to "(.*?)"|^I set header "(.*?)" to "(.*?)"$/i);
    if (headerMatch) {
      const key = headerMatch[1] || headerMatch[3];
      const value = headerMatch[2] || headerMatch[4];
      if (currentRequestIndex >= 0) {
        scenarioMap.requests[currentRequestIndex].headers[key] = value;
      } else {
        scenarioMap.sharedHeaders[key] = value;
      }
      continue;
    }

    const queryMatch = text.match(/^(?:query param|query parameter) "(.*?)" (?:is|=|should be) "(.*?)"$/i);
    if (queryMatch && currentRequestIndex >= 0) {
      scenarioMap.requests[currentRequestIndex].queryParams[queryMatch[1]] = queryMatch[2];
      continue;
    }

    const statusMatch = text.match(/status should be (\d+)/i);
    if (statusMatch) {
      scenarioMap.assertions.push({
        type: "status",
        expected: Number(statusMatch[1]),
        requestIndex: currentRequestIndex
      });
      continue;
    }

    const containsMatch = text.match(/contain(?:s)? key "(.*?)"/i);
    if (containsMatch) {
      scenarioMap.assertions.push({
        type: "contains",
        key: containsMatch[1],
        requestIndex: currentRequestIndex
      });
      continue;
    }

    const fieldEqualsMatch = text.match(/response body field "(.*?)" should equal "(.*?)"/i);
    if (fieldEqualsMatch) {
      scenarioMap.assertions.push({
        type: "fieldEquals",
        field: fieldEqualsMatch[1],
        expected: fieldEqualsMatch[2],
        requestIndex: currentRequestIndex
      });
      continue;
    }

    const containsTextMatch = text.match(/response body should contain text "(.*?)"/i);
    if (containsTextMatch) {
      scenarioMap.assertions.push({
        type: "containsText",
        expected: containsTextMatch[1],
        requestIndex: currentRequestIndex
      });
    }
  }

  for (let index = 0; index < scenarioMap.requests.length; index += 1) {
    const hasStatus = scenarioMap.assertions.some((assertion) => assertion.type === "status" && assertion.requestIndex === index);
    if (!hasStatus) {
      scenarioMap.assertions.push({
        type: "status",
        expected: 200,
        requestIndex: index
      });
    }
  }

  return scenarioMap;
}

function dataTableToBody(dataTable = []) {
  if (!dataTable.length) {
    return null;
  }

  const body = {};
  for (const row of dataTable) {
    if (row.length >= 2) {
      body[row[0]] = row[1];
    }
  }
  return Object.keys(body).length ? body : null;
}

function buildStructuredApiSpec(stepMap) {
  const lines = [
    "import { test, expect, request } from '@playwright/test';",
    "",
    `test.describe(${JSON.stringify(`${stepMap.feature} API generated coverage`)}, () => {`
  ];

  for (const scenario of stepMap.scenarios.filter((item) => item.requests.length)) {
    const testFn = scenario.tags.includes("@only") ? "test.only" : scenario.tags.includes("@skip") ? "test.skip" : "test";
    lines.push(`  ${testFn}(${JSON.stringify(scenario.name)}, async ({ baseURL }) => {`);
    lines.push(`    const resolvedBaseUrl = ${JSON.stringify(scenario.baseUrl)} || baseURL || 'http://localhost:3000';`);
    lines.push(`    const sharedHeaders = ${JSON.stringify(scenario.sharedHeaders || {})};`);
    lines.push("    const api = await request.newContext({ baseURL: resolvedBaseUrl, extraHTTPHeaders: sharedHeaders });");

    scenario.requests.forEach((requestStep, index) => {
      const responseVar = `response${index + 1}`;
      const methodCall = requestStep.method.toLowerCase();
      const optionsParts = [];
      if (requestStep.body) {
        optionsParts.push(`data: ${JSON.stringify(requestStep.body)}`);
      }
      if (requestStep.headers && Object.keys(requestStep.headers).length) {
        optionsParts.push(`headers: ${JSON.stringify(requestStep.headers)}`);
      }
      if (requestStep.queryParams && Object.keys(requestStep.queryParams).length) {
        optionsParts.push(`params: ${JSON.stringify(requestStep.queryParams)}`);
      }
      if (requestStep.dataFile) {
        optionsParts.push(`data: require(${JSON.stringify(`../../../data/${requestStep.dataFile}`)})`);
      }
      const options = optionsParts.length ? `, { ${optionsParts.join(", ")} }` : "";
      lines.push(`    const ${responseVar} = await api.${methodCall}(${JSON.stringify(requestStep.endpoint)}${options});`);

      scenario.assertions
        .filter((assertion) => assertion.requestIndex === index)
        .forEach((assertion) => {
          if (assertion.type === "status") {
            lines.push(`    expect(${responseVar}.status()).toBe(${assertion.expected});`);
          }
          if (assertion.type === "contains") {
            lines.push(`    expect(await ${responseVar}.json()).toHaveProperty(${JSON.stringify(assertion.key)});`);
          }
          if (assertion.type === "fieldEquals") {
            lines.push(`    expect((await ${responseVar}.json())[${JSON.stringify(assertion.field)}]).toBe(${JSON.stringify(assertion.expected)});`);
          }
          if (assertion.type === "containsText") {
            lines.push(`    expect(JSON.stringify(await ${responseVar}.json())).toContain(${JSON.stringify(assertion.expected)});`);
          }
        });
    });

    lines.push("  });");
  }

  lines.push("});");
  return lines.join("\n") + "\n";
}

function buildFallbackApiSpec(functionalTests, scenario) {
  const relevant = functionalTests.slice(0, 3);
  return `import { test, expect, request } from "@playwright/test";

test.describe("${scenario.name} API generated coverage", () => {
${relevant
  .map(
    (testCase, index) => `  test("${index + 1}. ${escapeQuote(testCase.id)} ${escapeQuote(testCase.title)}", async ({ baseURL }) => {
    const api = await request.newContext({ baseURL: baseURL || "http://localhost:3000" });
    // TODO: Replace placeholder route and payload with API-specific Gherkin steps or endpoint mapping.
    const response = await api.post("/api/transfers", {
      data: { traceabilityId: "${escapeQuote(testCase.id)}" }
    });
    expect(response.ok()).toBeTruthy();
  });`
  )
  .join("\n\n")}
});
`;
}

function escapeQuote(value = "") {
  return String(value).replace(/"/g, '\\"');
}

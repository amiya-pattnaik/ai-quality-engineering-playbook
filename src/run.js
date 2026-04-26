import { loadScenario } from "./scenario.js";
import { runScenario } from "./orchestrator.js";

function printHelp() {
  console.log("Usage: node src/run.js [scenario.json] [--feature requirements/a.feature,requirements/b.feature]");
  console.log("Example: node src/run.js scenarios/sample-qe-scenario.json");
}

function printResult(result) {
  console.log(`Scenario executed with ${result.model.provider}/${result.model.name}`);
  console.log(`Functional tests generated: ${result.functionalTests.length}`);
  console.log(`Automation files generated: ${result.generatedFiles.length}`);
  console.log("Reports:");
  console.log(`- ${result.reportPaths.functionalTestCases}`);
  console.log(`- ${result.reportPaths.traceability}`);
  console.log(`- ${result.reportPaths.impactedSelection}`);
  console.log(`- ${result.reportPaths.executionSummary}`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const scenarioPath = args[0] || "scenarios/sample-qe-scenario.json";
  const featureFlagIndex = args.indexOf("--feature");
  const selectedFeaturePaths = featureFlagIndex !== -1
    ? (args[featureFlagIndex + 1] || "").split(",").map((item) => item.trim()).filter(Boolean)
    : [];

  const { scenario, absolutePath } = loadScenario(scenarioPath);
  if (selectedFeaturePaths.length) {
    scenario.requirementSources = (scenario.requirementSources || []).filter((source) => {
      if (source.type !== "gherkin") {
        return true;
      }
      return selectedFeaturePaths.includes(source.path);
    });
  }
  const result = runScenario({ scenario, scenarioPath: absolutePath });
  printResult(result);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

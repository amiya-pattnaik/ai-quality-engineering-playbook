import path from "path";
import { loadJiraRequirements } from "./connectors/jira.js";
import { loadGherkinFeatures } from "./connectors/gherkin.js";
import { analyzeGithubChanges } from "./connectors/github.js";
import { loadSonarSummary } from "./connectors/sonarqube.js";
import { generateFunctionalTests } from "./generators/functional-tests.js";
import { generateImpactAnalysis } from "./generators/change-impact.js";
import { generateAutomation } from "./generators/automation.js";
import { buildReports } from "./reporters/markdown.js";
import { resolveModelConfig } from "./models.js";
import { ensureDir, writeFile } from "./utils.js";

export function runScenario({ scenario, scenarioPath }) {
  const outputRoot = process.cwd();
  const reportsDir = path.join(outputRoot, "reports");
  ensureDir(reportsDir);

  const jiraItems = loadJiraRequirements(scenario.requirementSources);
  const gherkinFeatures = loadGherkinFeatures(scenario.requirementSources, outputRoot);
  const changeAnalysis = analyzeGithubChanges(scenario.changeContext);
  const sonarSummary = loadSonarSummary(scenario.qualitySignals);
  const model = resolveModelConfig(scenario);

  const functionalTests = generateFunctionalTests({ jiraItems, gherkinFeatures });
  const impactAnalysis = generateImpactAnalysis({ functionalTests, changeAnalysis, scenario });
  const generatedFiles = generateAutomation({ scenario, functionalTests, gherkinFeatures, outputRoot });
  const reports = buildReports({
    scenario,
    model,
    jiraItems,
    gherkinFeatures,
    functionalTests,
    impactAnalysis,
    sonarSummary,
    generatedFiles
  });

  const reportPaths = {
    functionalTestCases: path.join(reportsDir, "functional-test-cases.md"),
    traceability: path.join(reportsDir, "test-traceability.md"),
    impactedSelection: path.join(reportsDir, "impacted-test-selection.md"),
    executionSummary: path.join(reportsDir, "execution-summary.md")
  };

  writeFile(reportPaths.functionalTestCases, reports.functionalTestCases);
  writeFile(reportPaths.traceability, reports.traceability);
  writeFile(reportPaths.impactedSelection, reports.impactedSelection);
  writeFile(reportPaths.executionSummary, reports.executionSummary);

  return {
    model,
    jiraItems,
    gherkinFeatures,
    functionalTests,
    impactAnalysis,
    sonarSummary,
    generatedFiles,
    reportPaths
  };
}

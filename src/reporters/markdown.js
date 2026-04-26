export function buildReports({ scenario, model, jiraItems, gherkinFeatures, functionalTests, impactAnalysis, sonarSummary, generatedFiles }) {
  return {
    functionalTestCases: renderFunctionalTests(functionalTests),
    traceability: renderTraceability(jiraItems, gherkinFeatures, functionalTests),
    impactedSelection: renderImpactAnalysis(impactAnalysis),
    executionSummary: renderExecutionSummary(scenario, model, sonarSummary, generatedFiles)
  };
}

function renderFunctionalTests(functionalTests) {
  return [
    "# Functional Test Cases",
    "",
    ...functionalTests.flatMap((testCase) => [
      `## ${testCase.id} - ${testCase.title}`,
      `- Type: ${testCase.type}`,
      `- Sources: ${testCase.sourceIds.join(", ")}`,
      "- Steps:",
      ...testCase.steps.map((step) => `  - ${step}`),
      ""
    ])
  ].join("\n");
}

function renderTraceability(jiraItems, gherkinFeatures, functionalTests) {
  return [
    "# Test Traceability",
    "",
    "## Jira Sources",
    ...jiraItems.map((item) => `- ${item.id}: ${item.title}`),
    "",
    "## Gherkin Sources",
    ...gherkinFeatures.map((feature) => `- ${feature.sourcePath}: ${feature.feature}`),
    "",
    "## Mapping",
    ...functionalTests.map((testCase) => `- ${testCase.id} -> ${testCase.sourceIds.join(", ")}`)
  ].join("\n");
}

function renderImpactAnalysis(impactAnalysis) {
  return [
    "# Impacted Test Selection",
    "",
    `- Branch: ${impactAnalysis.branch}`,
    `- Changed files: ${impactAnalysis.changedFiles.join(", ") || "none"}`,
    `- Risk areas: ${impactAnalysis.riskAreas.join(", ") || "none"}`,
    "",
    "## Selected Tests",
    ...impactAnalysis.selectedTests.map((testCase) => `- ${testCase.id}: ${testCase.title}`),
    "",
    "## Notes",
    ...impactAnalysis.notes.map((note) => `- ${note}`)
  ].join("\n");
}

function renderExecutionSummary(scenario, model, sonarSummary, generatedFiles) {
  return [
    "# Execution Summary",
    "",
    `- Scenario: ${scenario.name}`,
    `- Goal: ${scenario.goal}`,
    `- Mode: ${scenario.mode}`,
    `- Model: ${model.provider}/${model.name}`,
    `- Orchestration: ${model.orchestration}`,
    `- Retrieval: ${model.retrieval}`,
    `- Sonar provider: ${sonarSummary.provider}`,
    `- Sonar project key: ${sonarSummary.projectKey}`,
    `- Sonar status: ${sonarSummary.status}`,
    "",
    "## Generated Files",
    ...generatedFiles.map((file) => `- ${file}`),
    "",
    "## Sonar Metrics",
    ...Object.entries(sonarSummary.metrics).map(([key, value]) => `- ${key}: ${value}`)
  ].join("\n");
}

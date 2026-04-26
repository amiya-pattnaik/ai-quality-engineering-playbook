export function generateFunctionalTests({ jiraItems, gherkinFeatures }) {
  const cases = [];

  for (const item of jiraItems) {
    item.acceptanceCriteria.forEach((criterion, index) => {
      cases.push({
        id: `${item.id}-AC${index + 1}`,
        title: criterion,
        type: inferCaseType(criterion),
        sourceIds: [item.id],
        steps: [
          `Review Jira requirement ${item.id}`,
          `Validate acceptance criterion: ${criterion}`,
          "Confirm expected business outcome and UI/API response"
        ]
      });
    });
  }

  for (const feature of gherkinFeatures) {
    feature.scenarios.forEach((scenario, index) => {
      cases.push({
        id: `GHERKIN-${index + 1}`,
        title: `${feature.feature} :: ${scenario.title}`,
        type: inferCaseType(scenario.title),
        sourceIds: [feature.sourcePath],
        steps: scenario.steps.map((step) => step.raw)
      });
    });
  }

  return dedupeCases(cases);
}

function inferCaseType(text = "") {
  return /cannot|invalid|error|reject|past/i.test(text) ? "negative" : "functional";
}

function dedupeCases(cases) {
  const seen = new Set();
  return cases.filter((testCase) => {
    const key = testCase.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

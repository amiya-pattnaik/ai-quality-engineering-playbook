export function loadSonarSummary(qualitySignals = {}) {
  return {
    provider: qualitySignals.provider || "sonarqube",
    projectKey: qualitySignals.projectKey || "unknown-project",
    status: qualitySignals.status || "not-fetched",
    metrics: qualitySignals.metrics || {
      bugs: "n/a",
      vulnerabilities: "n/a",
      codeSmells: "n/a",
      coverage: "n/a",
      duplicatedLinesDensity: "n/a"
    }
  };
}

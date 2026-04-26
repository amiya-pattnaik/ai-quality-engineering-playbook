export function generateImpactAnalysis({ functionalTests, changeAnalysis, scenario }) {
  const selectedTests = functionalTests.filter((testCase) => {
    const title = testCase.title.toLowerCase();
    return changeAnalysis.changedFiles.some((file) => {
      const normalized = file.toLowerCase();
      return (
        (normalized.includes("transfer") && title.includes("transfer")) ||
        (normalized.includes("api") && scenario.mode !== "ui") ||
        (normalized.includes("web") && scenario.mode !== "api")
      );
    });
  });

  return {
    branch: changeAnalysis.branch,
    changedFiles: changeAnalysis.changedFiles,
    riskAreas: changeAnalysis.riskAreas,
    selectedTests: selectedTests.length ? selectedTests : functionalTests.slice(0, 3),
    notes: [
      "V1 impact analysis uses file path heuristics and keyword matching.",
      "Upgrade in V2 to dependency graph, ownership metadata, and execution history."
    ]
  };
}

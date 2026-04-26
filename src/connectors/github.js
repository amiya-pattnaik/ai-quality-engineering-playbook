export function analyzeGithubChanges(changeContext = {}) {
  const changedFiles = changeContext.changedFiles || [];
  const categories = {
    api: changedFiles.filter((file) => /api|controller|route/i.test(file)),
    ui: changedFiles.filter((file) => /web|ui|component|page/i.test(file)),
    service: changedFiles.filter((file) => /service|domain/i.test(file))
  };

  const riskAreas = Object.entries(categories)
    .filter(([, files]) => files.length)
    .map(([name, files]) => `${name}: ${files.length} changed file(s)`);

  return {
    provider: changeContext.provider || "github",
    branch: changeContext.branch || "unknown",
    changedFiles,
    categories,
    riskAreas
  };
}

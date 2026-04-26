export function loadJiraRequirements(requirementSources = []) {
  return requirementSources
    .filter((source) => source.type === "jira")
    .map((source) => ({
      id: source.id,
      title: source.title || source.id,
      description: source.description || "",
      acceptanceCriteria: source.acceptanceCriteria || []
    }));
}

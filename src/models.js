export function resolveModelConfig(scenario) {
  return {
    provider: scenario?.model?.provider || "mock",
    name: scenario?.model?.name || "mock-v1",
    orchestration: scenario?.runtime?.orchestration || "langchain",
    retrieval: scenario?.runtime?.retrieval || "llamaindex"
  };
}

import path from "path";
import { readJson } from "./utils.js";

const VALID_MODES = new Set(["api", "ui", "both"]);
const VALID_UI_TARGETS = new Set(["playwright", "webdriverio"]);
const VALID_API_TARGETS = new Set(["playwright", "basic-rest"]);

export function loadScenario(scenarioPath) {
  const absolutePath = path.resolve(process.cwd(), scenarioPath);
  const scenario = readJson(absolutePath);
  validateScenario(scenario, absolutePath);
  return { scenario, absolutePath };
}

function validateScenario(scenario, scenarioPath) {
  const errors = [];

  if (!scenario?.name) errors.push("Missing scenario.name");
  if (!scenario?.goal) errors.push("Missing scenario.goal");
  if (!VALID_MODES.has(scenario?.mode)) {
    errors.push("scenario.mode must be one of: api, ui, both");
  }

  if (!Array.isArray(scenario?.requirementSources) || !scenario.requirementSources.length) {
    errors.push("scenario.requirementSources must contain at least one source");
  }

  const jiraSources = (scenario.requirementSources || []).filter((source) => source.type === "jira");
  const gherkinSources = (scenario.requirementSources || []).filter((source) => source.type === "gherkin");
  if (!jiraSources.length) errors.push("At least one Jira requirement source is required in V1");
  if (!gherkinSources.length) errors.push("At least one Gherkin requirement source is required in V1");

  for (const source of gherkinSources) {
    if (!source.path) {
      errors.push("Every Gherkin source must include a path");
    }
  }

  if (scenario.mode === "api" || scenario.mode === "both") {
    const apiTarget = scenario?.automationTargets?.api;
    if (!VALID_API_TARGETS.has(apiTarget)) {
      errors.push("automationTargets.api must be 'playwright' or 'basic-rest' for V1");
    }
  }

  if (scenario.mode === "ui" || scenario.mode === "both") {
    const uiTarget = scenario?.automationTargets?.ui;
    if (!VALID_UI_TARGETS.has(uiTarget)) {
      errors.push("automationTargets.ui must be 'playwright' or 'webdriverio' for V1");
    }
  }

  if (errors.length) {
    throw new Error(`Invalid scenario at ${scenarioPath}\n- ${errors.join("\n- ")}`);
  }
}

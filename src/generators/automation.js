import { generateRestApiAutomation } from "./restapi-automation.js";
import { generateUiAutomation } from "./ui-automation.js";

export function generateAutomation({ scenario, functionalTests, gherkinFeatures, outputRoot }) {
  return [
    ...generateRestApiAutomation({ scenario, gherkinFeatures, functionalTests, outputRoot }),
    ...generateUiAutomation({ scenario, gherkinFeatures, outputRoot })
  ];
}

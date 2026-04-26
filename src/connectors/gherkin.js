import path from "path";
import { Parser, AstBuilder, GherkinClassicTokenMatcher } from "@cucumber/gherkin";
import { IdGenerator } from "@cucumber/messages";
import { readText } from "../utils.js";

const parser = new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher());

export function loadGherkinFeatures(requirementSources = [], baseDir) {
  return requirementSources
    .filter((source) => source.type === "gherkin")
    .map((source) => {
      const absolutePath = path.resolve(baseDir, source.path);
      const content = readText(absolutePath);
      return parseFeature(content, source);
    });
}

function parseFeature(content, source) {
  const gherkinDocument = parser.parse(content);
  const featureNode = gherkinDocument.feature;
  if (!featureNode) {
    return {
      sourcePath: source.path,
      usage: source.usage || "both",
      feature: "Unnamed feature",
      scenarios: []
    };
  }

  const scenarios = (featureNode.children || [])
    .filter((child) => child.scenario)
    .map((child) => ({
      title: child.scenario.name,
      tags: (child.scenario.tags || []).map((tag) => tag.name),
      steps: (child.scenario.steps || []).map((step) => ({
        keyword: step.keyword?.trim() || "",
        text: step.text || "",
        raw: `${step.keyword || ""}${step.text || ""}`.trim(),
        dataTable: normalizeDataTable(step.dataTable)
      }))
    }));

  return {
    sourcePath: source.path,
    usage: source.usage || "both",
    feature: featureNode.name || "Unnamed feature",
    scenarios
  };
}

function normalizeDataTable(dataTable) {
  if (!dataTable?.rows?.length) {
    return [];
  }

  return dataTable.rows.map((row) => row.cells.map((cell) => cell.value));
}

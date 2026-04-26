import { execSync, spawn } from "child_process";
import { loadScenario } from "./scenario.js";

function printHelp() {
  console.log("Usage: node src/run-tests.js <ui|api|both> [scenario.json]");
  console.log("Examples:");
  console.log("  node src/run-tests.js ui scenarios/sample-qe-scenario.json");
  console.log("  node src/run-tests.js api scenarios/sample-qe-scenario.json");
}

function runCommand(command) {
  execSync(command, {
    stdio: "inherit",
    cwd: process.cwd()
  });
}

function runUiTests(scenario) {
  const framework = scenario?.automationTargets?.ui;
  if (framework === "playwright") {
    runCommand("npx playwright test tests/generated/ui/playwright/specs --config=playwright.config.js");
    return;
  }

  if (framework === "webdriverio") {
    const chromedriver = spawn(localBinPath("chromedriver"), ["--port=9515"], {
      cwd: process.cwd(),
      stdio: "ignore"
    });
    try {
      sleep(3000);
      runCommand(`"${localBinPath("wdio")}" run wdio.conf.js --suite generatedUI`);
    } finally {
      chromedriver.kill("SIGTERM");
    }
    return;
  }

  throw new Error(`Unsupported UI framework: ${framework || "undefined"}`);
}

function runApiTests() {
  throw new Error("API runner not provided");
}

function runPlaywrightApiTests() {
  runCommand("npx playwright test tests/generated/api --config=playwright.config.js");
}

function runRestApiTests() {
  runCommand("node --test tests/generated/api");
}

function localBinPath(name) {
  const extension = process.platform === "win32" ? ".cmd" : "";
  return `${process.cwd()}/node_modules/.bin/${name}${extension}`;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const target = args[0] || "both";
  const scenarioPath = args[1] || "scenarios/sample-qe-scenario.json";
  const { scenario } = loadScenario(scenarioPath);

  if (target === "ui") {
    runUiTests(scenario);
    return;
  }

  if (target === "api") {
    if ((scenario?.automationTargets?.api || "playwright") === "basic-rest") {
      runRestApiTests();
    } else {
      runPlaywrightApiTests();
    }
    return;
  }

  if (target === "both") {
    if (scenario.mode === "ui" || scenario.mode === "both") {
      runUiTests(scenario);
    }
    if (scenario.mode === "api" || scenario.mode === "both") {
      if ((scenario?.automationTargets?.api || "playwright") === "basic-rest") {
        runRestApiTests();
      } else {
        runPlaywrightApiTests();
      }
    }
    return;
  }

  throw new Error(`Unsupported target: ${target}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

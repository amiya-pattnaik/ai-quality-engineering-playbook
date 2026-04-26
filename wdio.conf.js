export const config = {
  runner: "local",
  specs: ["./tests/generated/ui/webdriverio/specs/**/*.spec.js"],
  maxInstances: 1,
  hostname: "127.0.0.1",
  port: 9515,
  path: "/",
  capabilities: [
    {
      browserName: "chrome",
      "goog:chromeOptions": {
        args: ["--headless=new", "--disable-gpu", "--no-sandbox"]
      }
    }
  ],
  logLevel: "info",
  baseUrl: process.env.BASE_URL || "http://localhost:3000",
  waitforTimeout: 10000,
  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: {
    ui: "bdd",
    timeout: 60000
  },
  suites: {
    generatedUI: ["./tests/generated/ui/webdriverio/specs/**/*.spec.js"]
  }
};

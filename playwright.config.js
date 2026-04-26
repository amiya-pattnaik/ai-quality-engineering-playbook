import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/generated",
  timeout: 30000,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry"
  }
});

import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    channel: process.env.CI ? undefined : "chrome",
    headless: true,
    viewport: { width: 1280, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node scripts/serve-test-api.mjs",
      url: "http://127.0.0.1:8000/up",
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: "node scripts/preview.mjs",
      url: "http://127.0.0.1:8081",
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});

import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"],["html",{open:"never"}]] : "list",
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER ? undefined : { command: "pnpm dev --host 127.0.0.1", url: "http://127.0.0.1:3000/ru", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});

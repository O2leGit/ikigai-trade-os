import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for ikigai-trade-os cockpit E2E smoke tests.
 *
 * Runs against a local Vite dev server by default. Set BASE_URL to test
 * a deployed environment (e.g. https://ikigaitradeos.netlify.app).
 *
 * One-time setup:
 *   npm install --save-dev @playwright/test
 *   npx playwright install chromium
 *
 * Run:
 *   npm run test:e2e
 *   npx playwright test --ui    # interactive mode
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

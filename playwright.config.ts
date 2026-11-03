import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3200";
const local = !process.env.BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: local ? 2 : 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: BASE_URL,
    locale: "en-US",
    timezoneId: "UTC",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile-390",
      use: {
        ...devices["Pixel 7"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1280, height: 860 } } },
  ],
  webServer: local
    ? {
        command: "npx next start -p 3200",
        url: "http://localhost:3200",
        reuseExistingServer: true,
        env: { DATABASE_URL: process.env.DATABASE_URL ?? "postgres://localhost/scout_dev" },
      }
    : undefined,
});

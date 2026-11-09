import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "data/review/e2e_report.json" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    viewport: { width: 400, height: 900 },
  },
  projects: [
    {
      name: "phone",
      use: { ...devices["Pixel 5"], viewport: { width: 400, height: 900 } },
    },
  ],
});

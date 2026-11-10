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
  },
  projects: [
    {
      // Small phone (≈ Pixel 5 width, taller for scroll-reveal). Matches
      // the viewport the signed-in shell is tightened to.
      name: "phone",
      use: { ...devices["Pixel 5"], viewport: { width: 400, height: 900 } },
    },
    {
      // Desktop. Covers wide-layout breakpoints — sm:grid-cols-* and
      // sm:flex-row branches. Chromium only to keep CI runtime down.
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
    },
  ],
});

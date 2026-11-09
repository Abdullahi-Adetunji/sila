import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import PrivacyReporter from "./scripts/privacy-reporter";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    reporters: ["default", new PrivacyReporter()],
    env: {
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
      // 32 bytes of zeros, base64url-encoded (43 chars). Test-only.
      SILA_KEK: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      SESSION_SECRET: "test_session_secret_" + "x".repeat(32),
      VOLUNTEER_HMAC_KEY: "test_volunteer_hmac_" + "y".repeat(32),
      NODE_ENV: "test",
    },
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // Playwright specs live under tests/e2e and run with `npm run test:e2e`.
    exclude: ["node_modules/**", ".next/**", "tests/e2e/**"],
  },
});

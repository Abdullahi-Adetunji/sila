import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    env: {
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
      // 32 bytes of zeros, base64url-encoded (43 chars). Test-only.
      SILA_KEK: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      SESSION_SECRET: "test_session_secret_" + "x".repeat(32),
      NODE_ENV: "test",
    },
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});

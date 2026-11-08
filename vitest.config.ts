import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
      SILA_KEK: "test_kek_" + "x".repeat(32),
      SESSION_SECRET: "test_session_secret_" + "x".repeat(32),
      NODE_ENV: "test",
    },
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});

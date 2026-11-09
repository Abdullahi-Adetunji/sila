import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupTestDb, type TestDbHandle } from "./testDb";

let app: Express;
let handle: TestDbHandle;

beforeAll(async () => {
  app = (await import("../app")).createApp();
});

beforeEach(async () => {
  handle = await setupTestDb();
});

afterEach(async () => {
  await handle.close();
});

describe("API security headers", () => {
  it("every response carries the expected headers", async () => {
    const r = await request(app).get("/api/auth/me");
    // 401, but headers still apply.
    expect(r.status).toBe(401);
    expect(r.headers["content-security-policy"]).toMatch(/default-src 'none'/);
    expect(r.headers["content-security-policy"]).toMatch(/frame-ancestors 'none'/);
    expect(r.headers["strict-transport-security"]).toMatch(/max-age=\d+/);
    expect(r.headers["referrer-policy"]).toBe("no-referrer");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["permissions-policy"]).toMatch(/camera=\(\)/);
  });

  it("an error response does not leak the stack trace in production", async () => {
    // Hit a deliberately broken route by sending malformed JSON.
    const prevNode = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    try {
      const r = await request(app)
        .post("/api/consent")
        .set("Content-Type", "application/json")
        .send("{ not json");
      expect([400, 500]).toContain(r.status);
      const body = JSON.stringify(r.body);
      expect(body).not.toMatch(/\bat\s+\S+:\d+:\d+/); // no stack frames
      expect(body).not.toContain("SyntaxError:");
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = prevNode;
    }
  });
});

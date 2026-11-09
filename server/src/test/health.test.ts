import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";

let app: Express;

beforeAll(async () => {
  const mod = await import("../app");
  app = mod.createApp();
});

describe("liveness vs readiness", () => {
  it("/health returns 200 without touching the database", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("/api/health returns 200 without touching the database", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("/api/ready is a separate route from /api/health (readiness runs select 1)", async () => {
    // /api/ready hits the pool and returns 503 if the pool cannot reach a
    // server. In tests the pool points at a fake DATABASE_URL, so 503 is
    // the expected outcome. The point of this test is that readiness is a
    // distinct endpoint so nothing accidentally wires it up as Render's
    // health check.
    const res = await request(app).get("/api/ready");
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("ready");
  });
});

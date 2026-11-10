import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { eq } from "drizzle-orm";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { signupAs, csrf, type AuthedUser } from "./helpers";
import { db } from "../db/client";
import { users } from "../db/schema";
import { reset as resetClock } from "../lib/clock";

let app: Express;
let handle: TestDbHandle;

beforeAll(async () => {
  app = (await import("../app")).createApp();
});

beforeEach(async () => {
  handle = await setupTestDb();
  resetClock();
  process.env.DEMO_MODE = "true";
});

afterEach(async () => {
  resetClock();
  delete process.env.DEMO_MODE;
  await handle.close();
});

async function makeEvaluator(email: string): Promise<AuthedUser> {
  const u = await signupAs(app, email);
  await db.update(users).set({ role: "evaluator" }).where(eq(users.id, u.id));
  return u;
}

async function makeDemoAccount(email: string): Promise<AuthedUser> {
  // Any @demo.sila email counts as a demo account.
  return signupAs(app, email);
}

describe("GET /api/dev/clock and POST /api/dev/clock/advance", () => {
  it("anonymous gets 401", async () => {
    const g = await request(app).get("/api/dev/clock");
    expect(g.status).toBe(401);
    const a = await request(app).post("/api/dev/clock/advance").send({ ms: 1000 });
    expect(a.status).toBe(401);
  });

  it("a normal person account gets 403 on both verbs and the attempt is audit-logged", async () => {
    const p = await signupAs(app, "person@example.com");
    const g = await request(app).get("/api/dev/clock").set("Cookie", p.cookie);
    expect(g.status).toBe(403);
    const a = await request(app)
      .post("/api/dev/clock/advance")
      .set(csrf(p))
      .send({ ms: 60000 });
    expect(a.status).toBe(403);

    const log = await request(app).get("/api/me/access-log").set("Cookie", p.cookie);
    const denied = log.body.entries.find(
      (e: { action: string; outcome: string }) =>
        e.action === "dev_clock_access" && e.outcome === "denied",
    );
    expect(denied).toBeDefined();
  });

  it("an evaluator can read and advance; each advance is audit-logged", async () => {
    const e = await makeEvaluator("eval@example.com");
    const g = await request(app).get("/api/dev/clock").set("Cookie", e.cookie);
    expect(g.status).toBe(200);
    const a = await request(app)
      .post("/api/dev/clock/advance")
      .set(csrf(e))
      .send({ ms: 60 * 60 * 1000 });
    expect(a.status).toBe(200);

    // /api/me/access-log is person-only now, so verify the audit entry
    // via a direct DB probe instead. (Evaluators cannot read a person-
    // scoped access log; this is the designed behaviour.)
    const rows = await handle.query<{ action: string; outcome: string }>(
      "select action, outcome from audit_log where actor_id = $1 and action = 'dev_clock_advance' and outcome = 'allowed'",
      [e.id],
    );
    expect(rows.rows.length).toBeGreaterThan(0);
  });

  it("a demo account can advance; the shift only touches demo users", async () => {
    const demo = await makeDemoAccount("partner.a@demo.sila");
    // A non-demo person who should NOT be shifted.
    await signupAs(app, "real@example.com");

    const a = await request(app)
      .post("/api/dev/clock/advance")
      .set(csrf(demo))
      .send({ ms: 24 * 60 * 60 * 1000 });
    expect(a.status).toBe(200);
    expect(a.body.shiftedCount).toBe(1); // exactly the one @demo.sila account

    const g = await request(app).get("/api/dev/clock").set("Cookie", demo.cookie);
    const offsets = g.body.offsets as Record<string, number>;
    // The demo account has a positive offset; the real person has none.
    const offsetValues = Object.values(offsets);
    expect(offsetValues.length).toBe(1);
    expect(offsetValues[0]).toBeGreaterThan(0);
  });

  it("returns 404 when neither NODE_ENV!=production nor DEMO_MODE=true", async () => {
    const env = process.env as Record<string, string | undefined>;
    const originalNode = env.NODE_ENV;
    env.NODE_ENV = "production";
    delete env.DEMO_MODE;
    try {
      const demo = await makeDemoAccount("partner.b@demo.sila");
      const g = await request(app).get("/api/dev/clock").set("Cookie", demo.cookie);
      expect(g.status).toBe(404);
    } finally {
      env.NODE_ENV = originalNode;
      env.DEMO_MODE = "true";
    }
  });
});

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { eq } from "drizzle-orm";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { signupAs, type AuthedUser } from "./helpers";
import { db } from "../db/client";
import { users } from "../db/schema";

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

async function makeEvaluator(email: string): Promise<AuthedUser> {
  const u = await signupAs(app, email);
  await db.update(users).set({ role: "evaluator" }).where(eq(users.id, u.id));
  return u;
}

describe("evaluator dashboard endpoints", () => {
  it("non-evaluator sessions get 403 on every endpoint and the attempt is logged", async () => {
    const p = await signupAs(app, "p@example.com");
    for (const url of [
      "/api/evaluator/clinician-accuracy",
      "/api/evaluator/privacy",
      "/api/evaluator/comprehension",
      "/api/evaluator/time-to-referral",
    ]) {
      const r = await request(app).get(url).set("Cookie", p.cookie);
      expect(r.status).toBe(403);
      expect(r.body.reason).toBe("not_evaluator");
    }
    const log = await request(app).get("/api/me/access-log").set("Cookie", p.cookie);
    const denied = log.body.entries.filter(
      (e: { action: string; outcome: string }) =>
        e.action === "read_evaluator_dashboard" && e.outcome === "denied",
    );
    expect(denied.length).toBeGreaterThanOrEqual(1);
  });

  it("clinician-accuracy reports awaiting_clinical_review when no import has run", async () => {
    const e = await makeEvaluator("e@example.com");
    const r = await request(app)
      .get("/api/evaluator/clinician-accuracy")
      .set("Cookie", e.cookie);
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("awaiting_clinical_review");
  });

  it("comprehension hides cells with n < 5", async () => {
    const e = await makeEvaluator("e2@example.com");
    // No volunteers yet — every cell should be < 5 → empty.
    const r = await request(app)
      .get("/api/evaluator/comprehension")
      .set("Cookie", e.cookie);
    expect(r.status).toBe(200);
    expect(r.body.cells).toEqual([]);
    expect(r.body.minGroup).toBe(5);
  });

  it("time-to-referral hides cells with n < 5 and never seeds numbers", async () => {
    const e = await makeEvaluator("e3@example.com");
    const r = await request(app)
      .get("/api/evaluator/time-to-referral")
      .set("Cookie", e.cookie);
    expect(r.status).toBe(200);
    expect(r.body.cells).toEqual([]);
  });

  it("CSV export is served as text/csv", async () => {
    const e = await makeEvaluator("e4@example.com");
    const r = await request(app)
      .get("/api/evaluator/comprehension?format=csv")
      .set("Cookie", e.cookie);
    expect(r.status).toBe(200);
    expect(r.headers["content-type"] ?? "").toMatch(/text\/csv/);
  });
});

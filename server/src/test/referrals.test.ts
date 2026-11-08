import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { eq } from "drizzle-orm";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { signupAs, csrf, type AuthedUser } from "./helpers";
import { db } from "../db/client";
import { users } from "../db/schema";
import { grantConsent, revokeConsent } from "../services/consent";
import { advance, reset as resetClock } from "../lib/clock";

let app: Express;
let handle: TestDbHandle;

beforeAll(async () => {
  app = (await import("../app")).createApp();
});

beforeEach(async () => {
  handle = await setupTestDb();
  resetClock();
});

afterEach(async () => {
  resetClock();
  await handle.close();
});

async function makeCounsellor(email: string): Promise<AuthedUser> {
  const u = await signupAs(app, email);
  await db.update(users).set({ role: "counsellor" }).where(eq(users.id, u.id));
  return u;
}

describe("referrals", () => {
  it("requires an active counsellor_access to create a referral", async () => {
    const p = await signupAs(app, "p@example.com");
    const c = await makeCounsellor("c@example.com");
    const denied = await request(app)
      .post("/api/referrals")
      .set(csrf(p))
      .send({ priority: "counsellor", reasonSnapshot: { r: "x" }, counsellorId: c.id });
    expect(denied.status).toBe(403);
    expect(denied.body.reason).toBe("no_counsellor_access");
  });

  it("creates a referral and seeds the 'referred' step with the simulated clock", async () => {
    const p = await signupAs(app, "p2@example.com");
    const c = await makeCounsellor("c2@example.com");
    await grantConsent({ grantorId: p.id, purpose: "counsellor_access", targetUserId: c.id });

    const res = await request(app)
      .post("/api/referrals")
      .set(csrf(p))
      .send({ priority: "counsellor_priority", reasonSnapshot: { r: "demo" }, counsellorId: c.id });
    expect(res.status).toBe(201);
    expect(res.body.referral.priority).toBe("counsellor_priority");
    expect(res.body.referral.steps).toHaveLength(1);
    expect(res.body.referral.steps[0].step).toBe("referred");
  });

  it("another person cannot read someone else's referral (403, denied audit entry)", async () => {
    const p = await signupAs(app, "p3@example.com");
    const stranger = await signupAs(app, "s3@example.com");
    const c = await makeCounsellor("c3@example.com");
    await grantConsent({ grantorId: p.id, purpose: "counsellor_access", targetUserId: c.id });
    const made = await request(app)
      .post("/api/referrals")
      .set(csrf(p))
      .send({ priority: "counsellor", reasonSnapshot: null, counsellorId: c.id });

    const res = await request(app)
      .get(`/api/referrals/${made.body.referral.id}`)
      .set("Cookie", stranger.cookie);
    expect(res.status).toBe(403);

    const log = await request(app).get("/api/me/access-log").set("Cookie", stranger.cookie);
    const denied = log.body.entries.find(
      (e: { action: string; outcome: string; targetId: string }) =>
        e.action === "read_referral" &&
        e.outcome === "denied" &&
        e.targetId === made.body.referral.id,
    );
    expect(denied).toBeDefined();
  });

  it("a counsellor cannot read the referral without counsellor_access", async () => {
    const p = await signupAs(app, "p4@example.com");
    const c = await makeCounsellor("c4@example.com");
    await grantConsent({ grantorId: p.id, purpose: "counsellor_access", targetUserId: c.id });
    const made = await request(app)
      .post("/api/referrals")
      .set(csrf(p))
      .send({ priority: "counsellor", reasonSnapshot: null, counsellorId: c.id });
    await revokeConsent({ grantorId: p.id, purpose: "counsellor_access", targetUserId: c.id });

    const res = await request(app)
      .get(`/api/referrals/${made.body.referral.id}`)
      .set("Cookie", c.cookie);
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe("no_counsellor_access");
  });

  it("a counsellor with counsellor_access can add a step and its timestamp uses the simulated clock", async () => {
    const p = await signupAs(app, "p5@example.com");
    const c = await makeCounsellor("c5@example.com");
    await grantConsent({ grantorId: p.id, purpose: "counsellor_access", targetUserId: c.id });
    const made = await request(app)
      .post("/api/referrals")
      .set(csrf(p))
      .send({ priority: "counsellor", reasonSnapshot: null, counsellorId: c.id });

    advance(60 * 60 * 1000); // 1 simulated hour later
    const step = await request(app)
      .post(`/api/referrals/${made.body.referral.id}/step`)
      .set(csrf(c))
      .send({ step: "counselling_booked" });
    expect(step.status).toBe(200);
    const steps = step.body.referral.steps;
    expect(steps.map((s: { step: string }) => s.step)).toContain("counselling_booked");
    const booked = steps.find((s: { step: string }) => s.step === "counselling_booked")!;
    const referred = steps.find((s: { step: string }) => s.step === "referred")!;
    const deltaMs =
      new Date(booked.occurredAt).getTime() - new Date(referred.occurredAt).getTime();
    expect(deltaMs).toBeGreaterThanOrEqual(60 * 60 * 1000);
  });

  it("step addition is denied for non-counsellor sessions even if they own the referral", async () => {
    const p = await signupAs(app, "p6@example.com");
    const c = await makeCounsellor("c6@example.com");
    await grantConsent({ grantorId: p.id, purpose: "counsellor_access", targetUserId: c.id });
    const made = await request(app)
      .post("/api/referrals")
      .set(csrf(p))
      .send({ priority: "counsellor", reasonSnapshot: null, counsellorId: c.id });
    const denied = await request(app)
      .post(`/api/referrals/${made.body.referral.id}/step`)
      .set(csrf(p))
      .send({ step: "counselling_booked" });
    expect(denied.status).toBe(403);
    expect(denied.body.reason).toBe("not_counsellor");
  });

  it("the referral lists no genetic data in its payload", async () => {
    const p = await signupAs(app, "p7@example.com");
    const c = await makeCounsellor("c7@example.com");
    await grantConsent({ grantorId: p.id, purpose: "counsellor_access", targetUserId: c.id });
    const made = await request(app)
      .post("/api/referrals")
      .set(csrf(p))
      .send({
        priority: "counsellor_priority",
        reasonSnapshot: { reasons: ["shared_risk_serious"] },
        counsellorId: c.id,
      });
    const text = JSON.stringify(made.body);
    for (const forbidden of ["HbS", "HbC", "beta", "CFTR-p", "GJB2-p", "variants"]) {
      expect(text).not.toContain(forbidden);
    }
  });
});

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { eq } from "drizzle-orm";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { signupAs, csrf, type AuthedUser } from "./helpers";
import { db } from "../db/client";
import { users } from "../db/schema";
import { grantConsent, revokeConsent } from "../services/consent";

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

async function makeCounsellor(email: string): Promise<AuthedUser> {
  const u = await signupAs(app, email);
  await db.update(users).set({ role: "counsellor" }).where(eq(users.id, u.id));
  return u;
}

async function openReferral(
  p: AuthedUser,
  c: AuthedUser,
  priority: "information" | "counsellor" | "counsellor_priority",
) {
  await grantConsent({ grantorId: p.id, purpose: "counsellor_access", targetUserId: c.id });
  const r = await request(app)
    .post("/api/referrals")
    .set(csrf(p))
    .send({ priority, reasonSnapshot: null, counsellorId: c.id });
  expect(r.status).toBe(201);
  return r.body.referral.id as string;
}

describe("counsellor queue", () => {
  it("returns 403 to non-counsellors", async () => {
    const stranger = await signupAs(app, "strq@example.com");
    const res = await request(app).get("/api/counsellor/queue").set("Cookie", stranger.cookie);
    expect(res.status).toBe(403);
  });

  it("shows only referrals from persons who currently grant counsellor_access", async () => {
    const c = await makeCounsellor("qc@example.com");
    const p1 = await signupAs(app, "qp1@example.com");
    const p2 = await signupAs(app, "qp2@example.com");
    const p3 = await signupAs(app, "qp3@example.com");
    await openReferral(p1, c, "counsellor");
    await openReferral(p2, c, "counsellor_priority");
    await openReferral(p3, c, "counsellor");
    // p3 revokes
    await revokeConsent({ grantorId: p3.id, purpose: "counsellor_access", targetUserId: c.id });

    const res = await request(app).get("/api/counsellor/queue").set("Cookie", c.cookie);
    expect(res.status).toBe(200);
    const emails = res.body.queue.map((q: { personEmail: string }) => q.personEmail);
    expect(emails).toContain("qp1@example.com");
    expect(emails).toContain("qp2@example.com");
    expect(emails).not.toContain("qp3@example.com");
  });

  it("orders counsellor_priority first, then counsellor, then information", async () => {
    const c = await makeCounsellor("q2c@example.com");
    const p1 = await signupAs(app, "q2a@example.com");
    const p2 = await signupAs(app, "q2b@example.com");
    const p3 = await signupAs(app, "q2d@example.com");
    await openReferral(p1, c, "counsellor");
    await openReferral(p2, c, "counsellor_priority");
    await openReferral(p3, c, "information");

    const res = await request(app).get("/api/counsellor/queue").set("Cookie", c.cookie);
    const priorities = res.body.queue.map((q: { referral: { priority: string } }) => q.referral.priority);
    expect(priorities[0]).toBe("counsellor_priority");
    expect(priorities[priorities.length - 1]).toBe("information");
  });

  it("the queue JSON contains no plaintext variant id or allele label", async () => {
    const c = await makeCounsellor("q3c@example.com");
    const p = await signupAs(app, "q3p@example.com");
    await openReferral(p, c, "counsellor_priority");
    const res = await request(app).get("/api/counsellor/queue").set("Cookie", c.cookie);
    const text = JSON.stringify(res.body);
    for (const needle of ["HbS", "HbC", "beta ", "CFTR-p", "GJB2-p", "variants"]) {
      expect(text).not.toContain(needle);
    }
  });
});

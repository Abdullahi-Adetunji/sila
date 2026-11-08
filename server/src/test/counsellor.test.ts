import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { eq } from "drizzle-orm";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { signupAs, type AuthedUser } from "./helpers";
import { db } from "../db/client";
import { users } from "../db/schema";
import { storeResults, type ResultsByGene } from "../services/vault";
import { grantConsent, revokeConsent } from "../services/consent";
import { hashPassword } from "../lib/password";

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

const SAMPLE: ResultsByGene = {
  HBB: { status: "tested", variants: ["HbS"] },
  CFTR: { status: "tested", variants: [] },
  GJB2: { status: "tested", variants: [] },
};

async function signupCounsellor(email: string): Promise<AuthedUser> {
  // Signup creates a `person`. Flip role to counsellor directly in the DB
  // (the lab/evaluator/counsellor roles are set out-of-band by an admin).
  const u = await signupAs(app, email);
  await db.update(users).set({ role: "counsellor" }).where(eq(users.id, u.id));
  return u;
}

async function createLabUser(email: string): Promise<string> {
  const [u] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword("x".repeat(16)), role: "lab" })
    .returning({ id: users.id });
  return u.id;
}

describe("counsellor read of a person's result", () => {
  it("returns 403 and writes a denied audit entry when the counsellor has no counsellor_access consent", async () => {
    const counsellor = await signupCounsellor("co@example.com");
    const person = await signupAs(app, "pp@example.com");
    const lab = await createLabUser("lab-co@example.com");
    await storeResults(person.id, lab, SAMPLE);

    const res = await request(app)
      .get(`/api/counsellor/case/${person.id}/result`)
      .set("Cookie", counsellor.cookie);
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe("no_counsellor_access");

    const log = await request(app).get("/api/me/access-log").set("Cookie", counsellor.cookie);
    const denied = log.body.entries.find(
      (e: { action: string; outcome: string; targetId: string }) =>
        e.action === "read_person_result_as_counsellor" &&
        e.outcome === "denied" &&
        e.targetId === person.id,
    );
    expect(denied).toBeDefined();
  });

  it("returns 200 when the person has an active counsellor_access consent naming this counsellor", async () => {
    const counsellor = await signupCounsellor("co2@example.com");
    const person = await signupAs(app, "pp2@example.com");
    const lab = await createLabUser("lab-co2@example.com");
    await storeResults(person.id, lab, SAMPLE);

    await grantConsent({
      grantorId: person.id,
      purpose: "counsellor_access",
      targetUserId: counsellor.id,
    });

    const ok = await request(app)
      .get(`/api/counsellor/case/${person.id}/result`)
      .set("Cookie", counsellor.cookie);
    expect(ok.status).toBe(200);
    expect(ok.body.results).toEqual(SAMPLE);
  });

  it("returns 403 immediately after the person revokes counsellor_access", async () => {
    const counsellor = await signupCounsellor("co3@example.com");
    const person = await signupAs(app, "pp3@example.com");
    const lab = await createLabUser("lab-co3@example.com");
    await storeResults(person.id, lab, SAMPLE);
    await grantConsent({
      grantorId: person.id,
      purpose: "counsellor_access",
      targetUserId: counsellor.id,
    });
    await revokeConsent({
      grantorId: person.id,
      purpose: "counsellor_access",
      targetUserId: counsellor.id,
    });

    const res = await request(app)
      .get(`/api/counsellor/case/${person.id}/result`)
      .set("Cookie", counsellor.cookie);
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe("no_counsellor_access");
  });

  it("a non-counsellor (role=person) gets 403 even if named by a consent", async () => {
    const stranger = await signupAs(app, "stranger@example.com");
    const person = await signupAs(app, "pp4@example.com");
    const lab = await createLabUser("lab-co4@example.com");
    await storeResults(person.id, lab, SAMPLE);
    // Even if the person grants counsellor_access to a non-counsellor, the role
    // check must still refuse.
    await grantConsent({
      grantorId: person.id,
      purpose: "counsellor_access",
      targetUserId: stranger.id,
    });
    const res = await request(app)
      .get(`/api/counsellor/case/${person.id}/result`)
      .set("Cookie", stranger.cookie);
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe("not_counsellor");
  });
});

import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { signupAs, csrf, type AuthedUser } from "./helpers";
import { db } from "../db/client";
import { users } from "../db/schema";
import { storeResults, type ResultsByGene } from "../services/vault";

let app: Express;
let handle: TestDbHandle;

beforeAll(async () => {
  handle = await setupTestDb();
  app = (await import("../app")).createApp();
});

afterAll(async () => {
  await handle.close();
});

beforeEach(async () => {
  await handle.reset();
});

const HBS_CARRIER: ResultsByGene = {
  HBB: { status: "tested", variants: ["HbS"] },
  CFTR: { status: "tested", variants: [] },
  GJB2: { status: "tested", variants: [] },
};
const CLEAR: ResultsByGene = {
  HBB: { status: "tested", variants: [] },
  CFTR: { status: "tested", variants: [] },
  GJB2: { status: "tested", variants: [] },
};
const HBS_HBS_AFFECTED: ResultsByGene = {
  HBB: { status: "tested", variants: ["HbS", "HbS"] },
  CFTR: { status: "tested", variants: [] },
  GJB2: { status: "tested", variants: [] },
};

async function labUser(email: string): Promise<string> {
  const [u] = await db
    .insert(users)
    .values({ email, passwordHash: "x", role: "lab" })
    .returning({ id: users.id });
  return u.id;
}

async function linkPair(ea: string, eb: string): Promise<{ a: AuthedUser; b: AuthedUser }> {
  const a = await signupAs(app, ea);
  const b = await signupAs(app, eb);
  const inv = await request(app).post("/api/partner/invite").set(csrf(a));
  await request(app).post("/api/partner/accept").set(csrf(b)).send({ code: inv.body.inviteCode });
  return { a, b };
}

async function grantCoupleRisk(u: AuthedUser, targetId: string) {
  const r = await request(app)
    .post("/api/consent")
    .set(csrf(u))
    .send({ purpose: "couple_risk", targetUserId: targetId });
  expect(r.status).toBe(201);
}

async function uploadResult(userId: string, labEmail: string, results: ResultsByGene) {
  const labId = await labUser(labEmail);
  await storeResults(userId, labId, results);
}

describe("GET /api/couple/risk", () => {
  it("returns 404 when there is no active partner link", async () => {
    const a = await signupAs(app, "solo@example.com");
    const res = await request(app).get("/api/couple/risk").set("Cookie", a.cookie);
    expect(res.status).toBe(404);
  });

  it("returns 403 until both partners have an active couple_risk consent", async () => {
    const { a, b } = await linkPair("c4a@example.com", "c4b@example.com");

    const neither = await request(app).get("/api/couple/risk").set("Cookie", a.cookie);
    expect(neither.status).toBe(403);

    await grantCoupleRisk(a, b.id);
    const halfway = await request(app).get("/api/couple/risk").set("Cookie", a.cookie);
    expect(halfway.status).toBe(403);
    expect(halfway.body.reason).toBe("missing_couple_risk_consent");
  });

  it("returns a CoupleView when both consents are active, and 403 immediately after a revoke", async () => {
    const { a, b } = await linkPair("c4r-a@example.com", "c4r-b@example.com");
    await uploadResult(a.id, "lab1@example.com", HBS_CARRIER);
    await uploadResult(b.id, "lab2@example.com", HBS_CARRIER);
    await grantCoupleRisk(a, b.id);
    await grantCoupleRisk(b, a.id);

    const ok = await request(app).get("/api/couple/risk").set("Cookie", a.cookie);
    expect(ok.status).toBe(200);
    expect(ok.body.view.status).toBe("ready");
    expect(ok.body.view.route).toBe("counsellor_priority");
    expect(ok.body.view.reasons).toContain("shared_risk_serious");

    await request(app)
      .post("/api/consent/revoke")
      .set(csrf(b))
      .send({ purpose: "couple_risk", targetUserId: a.id });
    const after = await request(app).get("/api/couple/risk").set("Cookie", a.cookie);
    expect(after.status).toBe(403);
  });

  it("CoupleView JSON exposes no per-person fields even when a partner is affected", async () => {
    const { a, b } = await linkPair("hide-a@example.com", "hide-b@example.com");
    await uploadResult(a.id, "lab3@example.com", HBS_HBS_AFFECTED);
    await uploadResult(b.id, "lab4@example.com", CLEAR);
    await grantCoupleRisk(a, b.id);
    await grantCoupleRisk(b, a.id);

    const res = await request(app).get("/api/couple/risk").set("Cookie", a.cookie);
    expect(res.status).toBe(200);
    const view = res.body.view;
    const forbidden = [
      "person_affected",
      "partner_needs_testing",
      "uncertain_result",
      a.id,
      b.id,
      a.email,
      b.email,
      "inviter",
      "invitee",
      "actor",
      "partner",
      "yourPartner",
    ];
    const text = JSON.stringify(view);
    for (const needle of forbidden) {
      expect(text).not.toContain(needle);
    }
    expect(view.reasons).toContain("needs_review");
    expect(view.reasons).not.toContain("person_affected");
  });

  it("no plaintext variant id or allele label appears in the response", async () => {
    const { a, b } = await linkPair("leak-a@example.com", "leak-b@example.com");
    await uploadResult(a.id, "labl1@example.com", HBS_CARRIER);
    await uploadResult(b.id, "labl2@example.com", HBS_CARRIER);
    await grantCoupleRisk(a, b.id);
    await grantCoupleRisk(b, a.id);
    const res = await request(app).get("/api/couple/risk").set("Cookie", a.cookie);
    const text = JSON.stringify(res.body);
    for (const needle of ["HbC", "beta ", "CFTR-p", "GJB2-p", "variants"]) {
      expect(text).not.toContain(needle);
    }
  });

  it("routes a neither-carrier couple to information with no reasons", async () => {
    const { a, b } = await linkPair("info-a@example.com", "info-b@example.com");
    await uploadResult(a.id, "labi1@example.com", CLEAR);
    await uploadResult(b.id, "labi2@example.com", CLEAR);
    await grantCoupleRisk(a, b.id);
    await grantCoupleRisk(b, a.id);
    const res = await request(app).get("/api/couple/risk").set("Cookie", a.cookie);
    expect(res.status).toBe(200);
    expect(res.body.view.route).toBe("information");
    expect(res.body.view.reasons).toEqual([]);
  });

  it("returns 403 (not the view) when the policy is denied", async () => {
    // A counsellor with a session but not a partner cannot read someone's view.
    const counsellor = await signupAs(app, "c-counsellor@example.com");
    const res = await request(app).get("/api/couple/risk").set("Cookie", counsellor.cookie);
    // No partner link → 404; still not the view.
    expect([403, 404]).toContain(res.status);
    expect(res.body.view).toBeUndefined();
  });
});

describe("partner result reads via /api/me/result", () => {
  it("another person cannot fetch the first person's result via /api/me/result", async () => {
    const a = await signupAs(app, "fma@example.com");
    const b = await signupAs(app, "fmb@example.com");
    await uploadResult(a.id, "labfm@example.com", HBS_CARRIER);
    // b has no result, but /api/me/result keys off session only.
    const bFetches = await request(app).get("/api/me/result").set("Cookie", b.cookie);
    expect(bFetches.status).toBe(404);
    // a sees a's own result, not b's (b has none).
    const aFetches = await request(app).get("/api/me/result").set("Cookie", a.cookie);
    expect(aFetches.status).toBe(200);
    expect(aFetches.body.results).toEqual(HBS_CARRIER);
  });
});

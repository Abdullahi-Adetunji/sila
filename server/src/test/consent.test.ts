import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { signupAs, csrf } from "./helpers";
import { canReadPartnerResult, canReadCoupleRisk } from "../lib/policy";

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

async function linkPair(aEmail: string, bEmail: string) {
  const a = await signupAs(app, aEmail);
  const b = await signupAs(app, bEmail);
  const inv = await request(app).post("/api/partner/invite").set(csrf(a));
  await request(app).post("/api/partner/accept").set(csrf(b)).send({ code: inv.body.inviteCode });
  return { a, b };
}

describe("consent routes and policy", () => {
  it("grant / list / revoke lifecycle", async () => {
    const { a, b } = await linkPair("a1@example.com", "b1@example.com");

    const list0 = await request(app).get("/api/consent").set("Cookie", a.cookie);
    expect(list0.body.consents).toEqual([]);

    const grant = await request(app).post("/api/consent").set(csrf(a)).send({
      purpose: "couple_risk",
      targetUserId: b.id,
    });
    expect(grant.status).toBe(201);

    const list1 = await request(app).get("/api/consent").set("Cookie", a.cookie);
    expect(list1.body.consents).toHaveLength(1);
    expect(list1.body.consents[0].purpose).toBe("couple_risk");
    expect(list1.body.consents[0].targetUserId).toBe(b.id);

    const revoke = await request(app).post("/api/consent/revoke").set(csrf(a)).send({
      purpose: "couple_risk",
      targetUserId: b.id,
    });
    expect(revoke.status).toBe(200);
    expect(revoke.body.revoked).toBe(1);

    const list2 = await request(app).get("/api/consent").set("Cookie", a.cookie);
    expect(list2.body.consents).toEqual([]);
  });

  it("grant requires required fields per purpose", async () => {
    const a = await signupAs(app, "req@example.com");
    const bad1 = await request(app).post("/api/consent").set(csrf(a)).send({ purpose: "couple_risk" });
    expect(bad1.status).toBe(400);
    const bad2 = await request(app)
      .post("/api/consent")
      .set(csrf(a))
      .send({ purpose: "share_with_partner", targetUserId: "00000000-0000-0000-0000-000000000000" });
    expect(bad2.status).toBe(400);
  });

  it("csrf is required for state-changing consent endpoints", async () => {
    const a = await signupAs(app, "csrf2@example.com");
    const r = await request(app)
      .post("/api/consent")
      .set("Cookie", a.cookie)
      .send({ purpose: "evaluation_data" });
    expect(r.status).toBe(403);
  });

  it("policy: canReadCoupleRisk is denied until both partners grant it", async () => {
    const { a, b } = await linkPair("cr-a@example.com", "cr-b@example.com");

    const none = await canReadCoupleRisk(a.id, b.id);
    expect(none.outcome).toBe("denied");
    expect(none.reason).toBe("missing_couple_risk_consent");

    await request(app).post("/api/consent").set(csrf(a)).send({
      purpose: "couple_risk",
      targetUserId: b.id,
    });
    const halfway = await canReadCoupleRisk(a.id, b.id);
    expect(halfway.outcome).toBe("denied");

    await request(app).post("/api/consent").set(csrf(b)).send({
      purpose: "couple_risk",
      targetUserId: a.id,
    });
    const full = await canReadCoupleRisk(a.id, b.id);
    expect(full.outcome).toBe("allowed");

    await request(app).post("/api/consent/revoke").set(csrf(a)).send({
      purpose: "couple_risk",
      targetUserId: b.id,
    });
    const after = await canReadCoupleRisk(a.id, b.id);
    expect(after.outcome).toBe("denied");
  });

  it("policy: canReadPartnerResult checks grant + scope", async () => {
    const { a, b } = await linkPair("pr-a@example.com", "pr-b@example.com");

    const none = await canReadPartnerResult(a.id, b.id, "conditions_carried");
    expect(none.outcome).toBe("denied");
    expect(none.reason).toBe("no_share_with_partner_consent");

    await request(app).post("/api/consent").set(csrf(b)).send({
      purpose: "share_with_partner",
      targetUserId: a.id,
      scope: "conditions_carried",
    });
    const cc = await canReadPartnerResult(a.id, b.id, "conditions_carried");
    expect(cc.outcome).toBe("allowed");
    const full = await canReadPartnerResult(a.id, b.id, "full_result");
    expect(full.outcome).toBe("denied");
    expect(full.reason).toBe("insufficient_scope");

    await request(app).post("/api/consent").set(csrf(b)).send({
      purpose: "share_with_partner",
      targetUserId: a.id,
      scope: "full_result",
    });
    const nowFull = await canReadPartnerResult(a.id, b.id, "full_result");
    expect(nowFull.outcome).toBe("allowed");
  });

  it("without an active partner link, canReadPartnerResult is denied regardless of consent", async () => {
    const a = await signupAs(app, "nolink-a@example.com");
    const b = await signupAs(app, "nolink-b@example.com");
    await request(app).post("/api/consent").set(csrf(b)).send({
      purpose: "share_with_partner",
      targetUserId: a.id,
      scope: "full_result",
    });
    const d = await canReadPartnerResult(a.id, b.id, "conditions_carried");
    expect(d.outcome).toBe("denied");
    expect(d.reason).toBe("no_active_partner_link");
  });
});

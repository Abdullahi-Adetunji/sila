import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { signupAs, csrf, type AuthedUser } from "./helpers";
import { appendAudit, verifyAuditChain } from "../lib/audit";
import { db } from "../db/client";
import { auditLog, users } from "../db/schema";
import { storeResults, type ResultsByGene } from "../services/vault";

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

describe("audit log", () => {
  it("UPDATE, DELETE and TRUNCATE on audit_log fail at the database level", async () => {
    await appendAudit({ actorId: null, action: "test_insert", outcome: "allowed" });
    await expect(
      handle.exec("UPDATE audit_log SET action = 'tampered'"),
    ).rejects.toThrow(/append-only|permission denied/i);
    await expect(handle.exec("DELETE FROM audit_log")).rejects.toThrow(
      /append-only|permission denied/i,
    );
    await expect(handle.exec("TRUNCATE TABLE audit_log")).rejects.toThrow(
      /append-only|permission denied|must be owner/i,
    );
  });

  it("chain verifies after a normal flow and breaks on an injected row", async () => {
    const { a, b } = await linkPair("aud-a@example.com", "aud-b@example.com");
    const lab = await labUser("aud-lab@example.com");
    await storeResults(a.id, lab, SAMPLE);
    await storeResults(b.id, lab, SAMPLE);
    await request(app).get("/api/me/result").set("Cookie", a.cookie);
    await request(app).get("/api/couple/risk").set("Cookie", a.cookie); // denied
    await request(app).post("/api/consent").set(csrf(a)).send({
      purpose: "couple_risk",
      targetUserId: b.id,
    });
    await request(app).post("/api/consent").set(csrf(b)).send({
      purpose: "couple_risk",
      targetUserId: a.id,
    });
    await request(app).get("/api/couple/risk").set("Cookie", a.cookie); // allowed

    const good = await verifyAuditChain();
    expect(good.ok).toBe(true);
    expect(good.checked).toBeGreaterThan(5);

    // The trigger does not block INSERT. Inject a row whose prev_hash does
    // not match the previous row's hash: the chain must detect the break.
    await db.insert(auditLog).values({
      prevHash: "not_the_previous_hash",
      hash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      actorId: null,
      action: "injected",
      targetType: null,
      targetId: null,
      purpose: null,
      outcome: "allowed",
      meta: null,
      createdAt: new Date().toISOString(),
    });
    const bad = await verifyAuditChain();
    expect(bad.ok).toBe(false);
    expect(bad.reason).toBeDefined();
  });

  it("logs a denied read when couple_risk is blocked, and allowed when both consent", async () => {
    const { a, b } = await linkPair("l1@example.com", "l2@example.com");
    const lab = await labUser("lab-aud@example.com");
    await storeResults(a.id, lab, SAMPLE);
    await storeResults(b.id, lab, SAMPLE);
    await request(app).get("/api/couple/risk").set("Cookie", a.cookie); // denied
    await request(app).post("/api/consent").set(csrf(a)).send({
      purpose: "couple_risk",
      targetUserId: b.id,
    });
    await request(app).post("/api/consent").set(csrf(b)).send({
      purpose: "couple_risk",
      targetUserId: a.id,
    });
    await request(app).get("/api/couple/risk").set("Cookie", a.cookie); // allowed

    const log = await request(app).get("/api/me/access-log").set("Cookie", a.cookie);
    expect(log.status).toBe(200);
    const couples = log.body.entries.filter((e: { action: string }) => e.action === "read_couple_risk");
    expect(couples.some((e: { outcome: string }) => e.outcome === "denied")).toBe(true);
    expect(couples.some((e: { outcome: string }) => e.outcome === "allowed")).toBe(true);
  });

  it("a person cannot see audit entries where they are neither actor nor target", async () => {
    const a = await signupAs(app, "x1@example.com");
    const b = await signupAs(app, "x2@example.com");
    const c = await signupAs(app, "x3@example.com");

    await request(app).get("/api/me/result").set("Cookie", b.cookie); // b-only action
    await request(app).post("/api/consent").set(csrf(c)).send({
      purpose: "evaluation_data",
    }); // c-only action

    const aLog = await request(app).get("/api/me/access-log").set("Cookie", a.cookie);
    expect(aLog.status).toBe(200);
    for (const e of aLog.body.entries) {
      // Every entry mentions a as actor or target; a was never involved.
      expect(e.targetId === a.id || e.youWere === "actor").toBe(true);
    }
    // In fact, `a` has done nothing audited yet.
    expect(aLog.body.entries).toEqual([]);
  });
});

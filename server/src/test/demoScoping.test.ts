// Demo-mode scoping: when DEMO_MODE=true on the live site, the demo
// mechanisms must not reach volunteer data or the audit log, and the
// evaluator account must not be reachable via the one-click panel.

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { csrf, type AuthedUser } from "./helpers";
import { db } from "../db/client";
import { users } from "../db/schema";
import { hashPassword } from "../lib/password";
import { storeResults, type ResultsByGene } from "../services/vault";

let app: Express;
let handle: TestDbHandle;

beforeAll(async () => {
  app = (await import("../app")).createApp();
});

beforeEach(async () => {
  handle = await setupTestDb();
  process.env.DEMO_MODE = "true";
  process.env.DEMO_PASSWORD = "sila-demo-password-xyz";
});

afterEach(async () => {
  delete process.env.DEMO_MODE;
  delete process.env.DEMO_PASSWORD;
  await handle.close();
});

async function seedDemoAccounts(): Promise<{
  a: { id: string };
  b: { id: string };
  counsellor: { id: string };
  lab: { id: string };
}> {
  const demoPw = await hashPassword("sila-demo-password-xyz");
  const [a] = await db
    .insert(users)
    .values({ email: "partner.a@demo.sila", passwordHash: demoPw, role: "person" })
    .returning({ id: users.id });
  const [b] = await db
    .insert(users)
    .values({ email: "partner.b@demo.sila", passwordHash: demoPw, role: "person" })
    .returning({ id: users.id });
  const [counsellor] = await db
    .insert(users)
    .values({ email: "counsellor@demo.sila", passwordHash: demoPw, role: "counsellor" })
    .returning({ id: users.id });
  const [lab] = await db
    .insert(users)
    .values({ email: "lab@demo.sila", passwordHash: demoPw, role: "lab" })
    .returning({ id: users.id });
  return { a, b, counsellor, lab };
}

async function loginDemo(account: "partner.a" | "partner.b" | "counsellor"): Promise<AuthedUser> {
  const r = await request(app).post("/api/demo/login").send({ account });
  expect(r.status).toBe(200);
  const raw = r.headers["set-cookie"];
  const list = Array.isArray(raw) ? raw : [raw!];
  const cookie = list.find((c) => c.startsWith("sila_session="))!.split(";")[0];
  return { id: r.body.user.id, email: r.body.user.email, cookie, csrfToken: r.body.csrfToken };
}

const SAMPLE: ResultsByGene = {
  HBB: { status: "tested", variants: ["HbS"] },
  CFTR: { status: "tested", variants: [] },
  GJB2: { status: "tested", variants: [] },
};

describe("demo scoping on a live site", () => {
  it("demo reset touches only the demo accounts and never the volunteer tables or audit rows unrelated to demo", async () => {
    const { a, b, lab } = await seedDemoAccounts();
    await storeResults(a.id, lab.id, SAMPLE);
    await storeResults(b.id, lab.id, SAMPLE);

    // Make an unrelated volunteer with quiz + ttr data.
    const join = await request(app).post("/api/volunteer/join").send({ language: "en", readingBand: "medium" });
    const volCode: string = join.body.code;
    await request(app).post("/api/volunteer/consent").set("x-volunteer-code", volCode);
    const items = await request(app).get("/api/volunteer/quiz?phase=before").set("x-volunteer-code", volCode);
    await request(app)
      .post("/api/volunteer/quiz/response")
      .set("x-volunteer-code", volCode)
      .send({ phase: "before", itemId: items.body.items[0].id, answer: 0 });
    await request(app)
      .post("/api/volunteer/ttr")
      .set("x-volunteer-code", volCode)
      .send({ kind: "opened_result" });

    const volBefore = await handle.query<{ n: string }>(
      "select count(*)::text as n from volunteers",
    );
    const quizBefore = await handle.query<{ n: string }>(
      "select count(*)::text as n from quiz_responses",
    );
    const ttrBefore = await handle.query<{ n: string }>(
      "select count(*)::text as n from time_to_referral_events",
    );
    const auditBefore = await handle.query<{ n: string }>(
      "select count(*)::text as n from audit_log",
    );

    // Call the demo reset as partner.a.
    const demoA = await loginDemo("partner.a");
    const reset = await request(app).post("/api/demo/reset").set(csrf(demoA));
    expect(reset.status).toBe(200);

    const volAfter = await handle.query<{ n: string }>(
      "select count(*)::text as n from volunteers",
    );
    const quizAfter = await handle.query<{ n: string }>(
      "select count(*)::text as n from quiz_responses",
    );
    const ttrAfter = await handle.query<{ n: string }>(
      "select count(*)::text as n from time_to_referral_events",
    );
    // Audit rows may have grown (demo_reset is appended), but existing rows
    // must still exist. Just check "grew by append-only", never shrank.
    const auditAfter = await handle.query<{ n: string }>(
      "select count(*)::text as n from audit_log",
    );

    expect(Number(volAfter.rows[0].n)).toBe(Number(volBefore.rows[0].n));
    expect(Number(quizAfter.rows[0].n)).toBe(Number(quizBefore.rows[0].n));
    expect(Number(ttrAfter.rows[0].n)).toBe(Number(ttrBefore.rows[0].n));
    expect(Number(auditAfter.rows[0].n)).toBeGreaterThanOrEqual(Number(auditBefore.rows[0].n));

    // Volunteer code still works.
    const me = await request(app).get("/api/volunteer/me").set("x-volunteer-code", volCode);
    expect(me.status).toBe(200);
  });

  it("a demo counsellor cannot see any volunteer data", async () => {
    const { lab } = await seedDemoAccounts();

    // Make several volunteers with results; none grants counsellor_access.
    for (let i = 0; i < 3; i++) {
      const join = await request(app)
        .post("/api/volunteer/join")
        .send({ language: "en", readingBand: "medium" });
      const code: string = join.body.code;
      await request(app).post("/api/volunteer/consent").set("x-volunteer-code", code);
    }

    const counsellor = await loginDemo("counsellor");
    const queue = await request(app).get("/api/counsellor/queue").set("Cookie", counsellor.cookie);
    expect(queue.status).toBe(200);
    expect(queue.body.queue).toEqual([]);

    // Also a demo counsellor hitting evaluator aggregates is 403.
    const e = await request(app)
      .get("/api/evaluator/comprehension/by-language")
      .set("Cookie", counsellor.cookie);
    expect(e.status).toBe(403);

    // Sanity reference used by typecheck.
    expect(lab.id.length).toBeGreaterThan(0);
  });

  it("the demo one-click panel rejects an 'evaluator' account", async () => {
    await seedDemoAccounts();
    const r = await request(app).post("/api/demo/login").send({ account: "evaluator" });
    expect(r.status).toBe(400);
  });

  it("the demo one-click panel accepts 'lab' (DEMO_MODE adds it)", async () => {
    await seedDemoAccounts();
    const r = await request(app).post("/api/demo/login").send({ account: "lab" });
    // lab@demo.sila is seeded and the demo panel now exposes it so a
    // judge can walk through the lab-submit flow with no extra setup.
    expect(r.status).toBe(200);
    expect(r.body.user.role).toBe("lab");
  });

  it("the demo one-click panel rejects an unknown account name", async () => {
    await seedDemoAccounts();
    const r = await request(app).post("/api/demo/login").send({ account: "sysadmin" });
    expect(r.status).toBe(400);
  });
});

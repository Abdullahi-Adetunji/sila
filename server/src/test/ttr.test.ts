import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupTestDb, type TestDbHandle } from "./testDb";

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

async function join() {
  const res = await request(app)
    .post("/api/volunteer/join")
    .send({ language: "en", readingBand: "medium" });
  return res.body.volunteer as { id: string };
}

async function consent(code: string) {
  await request(app).post("/api/volunteer/consent").set("x-volunteer-code", code);
}

describe("time-to-referral events", () => {
  it("records the three milestone kinds and withdraw deletes them", async () => {
    const v = await join();
    await consent(v.id);
    for (const kind of ["opened_result", "opened_referral_form", "submitted_referral"]) {
      const r = await request(app)
        .post("/api/volunteer/ttr")
        .set("x-volunteer-code", v.id)
        .send({ kind });
      expect(r.status).toBe(204);
    }
    const before = await handle.query<{ n: string }>(
      "select count(*)::text as n from time_to_referral_events where volunteer_id = $1",
      [v.id],
    );
    expect(Number(before.rows[0].n)).toBe(3);

    await request(app).post("/api/volunteer/withdraw").set("x-volunteer-code", v.id);
    const after = await handle.query<{ n: string }>(
      "select count(*)::text as n from time_to_referral_events where volunteer_id = $1",
      [v.id],
    );
    expect(Number(after.rows[0].n)).toBe(0);
  });

  it("refuses an unknown kind, requires a code, and requires consent", async () => {
    const anon = await request(app)
      .post("/api/volunteer/ttr")
      .send({ kind: "opened_result" });
    expect(anon.status).toBe(401);

    const v = await join();
    const noConsent = await request(app)
      .post("/api/volunteer/ttr")
      .set("x-volunteer-code", v.id)
      .send({ kind: "opened_result" });
    expect(noConsent.status).toBe(403);

    await consent(v.id);
    const bad = await request(app)
      .post("/api/volunteer/ttr")
      .set("x-volunteer-code", v.id)
      .send({ kind: "not_a_real_kind" });
    expect(bad.status).toBe(400);
  });

  it("the ttr row carries no name, email, or genetic field", async () => {
    const cols = await handle.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = $1",
      ["time_to_referral_events"],
    );
    const names = cols.rows.map((r) => r.column_name);
    for (const forbidden of ["email", "name", "variants", "variant"]) {
      expect(names).not.toContain(forbidden);
    }
  });
});

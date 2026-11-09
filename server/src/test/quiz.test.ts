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

async function join(language: "en" | "ar" = "en") {
  const res = await request(app)
    .post("/api/volunteer/join")
    .send({ language, readingBand: "medium" });
  return res.body.volunteer as {
    id: string;
    language: "en" | "ar";
    formOrder: "AB" | "BA";
    coupleId: string;
  };
}

async function consent(code: string) {
  const r = await request(app).post("/api/volunteer/consent").set("x-volunteer-code", code);
  expect(r.status).toBe(200);
}

describe("quiz endpoints: counterbalance, scoring, consent gating, privacy", () => {
  it("quiz is gated behind consent", async () => {
    const v = await join();
    const noConsent = await request(app)
      .get("/api/volunteer/quiz?phase=before")
      .set("x-volunteer-code", v.id);
    expect(noConsent.status).toBe(403);
    expect(noConsent.body.error).toBe("consent_required");
  });

  it("before and after draw from different forms and share no item text", async () => {
    const v = await join();
    await consent(v.id);
    const before = await request(app)
      .get("/api/volunteer/quiz?phase=before")
      .set("x-volunteer-code", v.id);
    const after = await request(app)
      .get("/api/volunteer/quiz?phase=after")
      .set("x-volunteer-code", v.id);
    expect(before.status).toBe(200);
    expect(after.status).toBe(200);
    expect(before.body.items[0].form).not.toBe(after.body.items[0].form);
    for (const b of before.body.items as Array<{ id: string; question: string }>) {
      const same = (after.body.items as Array<{ id: string; question: string }>).find(
        (x) => x.id === b.id,
      );
      expect(same).toBeTruthy();
      expect(same!.question).not.toBe(b.question);
    }
  });

  it("the correct index is never returned to the client", async () => {
    const v = await join();
    await consent(v.id);
    const res = await request(app)
      .get("/api/volunteer/quiz?phase=before")
      .set("x-volunteer-code", v.id);
    const text = JSON.stringify(res.body);
    expect(text).not.toContain("correct");
  });

  it("recording a response works and later withdraw removes it", async () => {
    const v = await join();
    await consent(v.id);
    const before = await request(app)
      .get("/api/volunteer/quiz?phase=before")
      .set("x-volunteer-code", v.id);
    const item = before.body.items[0];
    const r = await request(app)
      .post("/api/volunteer/quiz/response")
      .set("x-volunteer-code", v.id)
      .send({ phase: "before", itemId: item.id, answer: 0 });
    expect(r.status).toBe(204);

    const stored = await handle.query<{ n: string }>(
      "select count(*)::text as n from quiz_responses where volunteer_id = $1",
      [v.id],
    );
    expect(Number(stored.rows[0].n)).toBe(1);

    const out = await request(app).post("/api/volunteer/withdraw").set("x-volunteer-code", v.id);
    expect(out.status).toBe(200);
    const after = await handle.query<{ n: string }>(
      "select count(*)::text as n from quiz_responses where volunteer_id = $1",
      [v.id],
    );
    expect(Number(after.rows[0].n)).toBe(0);
  });

  it("the couple-view endpoint returns no per-person fields and no plaintext variant id", async () => {
    const v = await join();
    await consent(v.id);
    const res = await request(app)
      .get("/api/volunteer/couple-view")
      .set("x-volunteer-code", v.id);
    expect(res.status).toBe(200);
    const text = JSON.stringify(res.body);
    for (const forbidden of [
      "person_affected",
      "partner_needs_testing",
      "uncertain_result",
      "variants",
      "HbS",
      "HbC",
      "CFTR-p",
      "GJB2-p",
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("quiz endpoints are 401 without a valid code", async () => {
    const q = await request(app).get("/api/volunteer/quiz?phase=before");
    expect(q.status).toBe(401);
    const p = await request(app)
      .post("/api/volunteer/quiz/response")
      .send({ phase: "before", itemId: "quiz.carrier_vs_affected", answer: 0 });
    expect(p.status).toBe(401);
    const cv = await request(app).get("/api/volunteer/couple-view");
    expect(cv.status).toBe(401);
  });
});

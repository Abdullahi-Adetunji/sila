import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { isValidParticipantCode } from "../lib/participantCode";

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
  expect(res.status).toBe(201);
  return res.body.volunteer as {
    id: string;
    language: string;
    readingBand: string;
    formOrder: "AB" | "BA";
    coupleId: string;
  };
}

describe("volunteer mode: join / me / consent / withdraw", () => {
  it("join issues a participant code and never asks for a name or email", async () => {
    const v = await join();
    expect(v.id).toHaveLength(10);
    expect(isValidParticipantCode(v.id)).toBe(true);
    expect(["AB", "BA"]).toContain(v.formOrder);
    expect(v.coupleId).toMatch(/^C\d{3}$/);
    // Response carries no name/email/genetic-looking fields.
    const text = JSON.stringify(v);
    for (const needle of ["email", "name", "HbS", "variants", "password"]) {
      expect(text).not.toContain(needle);
    }
  });

  it("the volunteer row stores no name, email, or genetic field", async () => {
    await join();
    const columns = await handle.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = $1",
      ["volunteers"],
    );
    const names = columns.rows.map((r) => r.column_name);
    for (const forbidden of ["email", "name", "first_name", "last_name", "variant", "variants"]) {
      expect(names).not.toContain(forbidden);
    }
    // Sanity: the fields we expect are present.
    for (const needed of ["id", "language", "reading_band", "form_order", "couple_id"]) {
      expect(names).toContain(needed);
    }
  });

  it("GET /me requires a valid code", async () => {
    const anon = await request(app).get("/api/volunteer/me");
    expect(anon.status).toBe(401);
    const bad = await request(app).get("/api/volunteer/me").set("x-volunteer-code", "NOTAREALCODE");
    expect(bad.status).toBe(401);
    const malformed = await request(app)
      .get("/api/volunteer/me")
      .set("x-volunteer-code", "aaaa");
    expect(malformed.status).toBe(401);
  });

  it("consent records consentedAt and is returned on /me", async () => {
    const v = await join();
    const agree = await request(app)
      .post("/api/volunteer/consent")
      .set("x-volunteer-code", v.id);
    expect(agree.status).toBe(200);
    expect(agree.body.volunteer.consentedAt).toBeTruthy();
    const me = await request(app).get("/api/volunteer/me").set("x-volunteer-code", v.id);
    expect(me.body.volunteer.consentedAt).toBeTruthy();
  });

  it("withdraw deletes the volunteer row; the code becomes unknown", async () => {
    const v = await join();
    const out = await request(app)
      .post("/api/volunteer/withdraw")
      .set("x-volunteer-code", v.id);
    expect(out.status).toBe(200);
    expect(out.body.withdrawn).toBe(true);
    const me = await request(app).get("/api/volunteer/me").set("x-volunteer-code", v.id);
    expect(me.status).toBe(401);

    const rows = await handle.query<{ n: string }>(
      "select count(*)::text as n from volunteers where id = $1",
      [v.id],
    );
    expect(Number(rows.rows[0].n)).toBe(0);
  });

  it("a volunteer cannot read another volunteer's row through /me", async () => {
    const a = await join();
    const b = await join();
    const meA = await request(app).get("/api/volunteer/me").set("x-volunteer-code", a.id);
    expect(meA.body.volunteer.id).toBe(a.id);
    expect(meA.body.volunteer.coupleId).toBe(a.coupleId);
    // A's code never returns B's fields.
    expect(meA.body.volunteer.id).not.toBe(b.id);
  });

  it("the volunteer id in responses is the participant code (no account id, no email)", async () => {
    const v = await join();
    expect(v.id).toMatch(/^[BCDFGHJKMNPQRSTVWXZ23456789]{10}$/);
  });
});

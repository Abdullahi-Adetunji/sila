import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { isValidParticipantCode } from "../lib/participantCode";
import { volunteerHmac } from "../lib/volunteerHmac";

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

interface JoinResult {
  code: string;
  volunteer: {
    language: string;
    readingBand: string;
    formOrder: "AB" | "BA";
    coupleId: string;
  };
}

async function join(language: "en" | "ar" = "en"): Promise<JoinResult> {
  const res = await request(app)
    .post("/api/volunteer/join")
    .send({ language, readingBand: "medium" });
  expect(res.status).toBe(201);
  return { code: res.body.code as string, volunteer: res.body.volunteer };
}

describe("volunteer mode: join / me / consent / withdraw", () => {
  it("join issues a participant code and never asks for a name or email", async () => {
    const { code, volunteer: v } = await join();
    expect(code).toHaveLength(10);
    expect(isValidParticipantCode(code)).toBe(true);
    expect(["AB", "BA"]).toContain(v.formOrder);
    expect(v.coupleId).toMatch(/^C\d{3}$/);
    // Response carries no id / email / genetic-looking fields on /volunteer.
    const text = JSON.stringify(v);
    for (const needle of ["email", "name", "HbS", "variants", "password", "id"]) {
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
    for (const forbidden of [
      "email",
      "name",
      "first_name",
      "last_name",
      "variant",
      "variants",
      "ip",
      "ip_address",
      "user_agent",
      "remote_addr",
    ]) {
      expect(names).not.toContain(forbidden);
    }
    for (const needed of ["id", "language", "reading_band", "form_order", "couple_id"]) {
      expect(names).toContain(needed);
    }
  });

  it("the stored id is the HMAC of the code, not the code itself", async () => {
    const { code } = await join();
    const rows = await handle.query<{ id: string }>("select id from volunteers");
    expect(rows.rows.length).toBe(1);
    expect(rows.rows[0].id).not.toBe(code);
    expect(rows.rows[0].id).toBe(volunteerHmac(code));
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
    const { code } = await join();
    const agree = await request(app).post("/api/volunteer/consent").set("x-volunteer-code", code);
    expect(agree.status).toBe(200);
    expect(agree.body.volunteer.consentedAt).toBeTruthy();
    const me = await request(app).get("/api/volunteer/me").set("x-volunteer-code", code);
    expect(me.body.volunteer.consentedAt).toBeTruthy();
    // /me does not echo the code anywhere.
    expect(JSON.stringify(me.body)).not.toContain(code);
  });

  it("withdraw deletes the volunteer row; the code becomes unknown", async () => {
    const { code } = await join();
    const out = await request(app).post("/api/volunteer/withdraw").set("x-volunteer-code", code);
    expect(out.status).toBe(200);
    expect(out.body.withdrawn).toBe(true);
    const me = await request(app).get("/api/volunteer/me").set("x-volunteer-code", code);
    expect(me.status).toBe(401);

    const rows = await handle.query<{ n: string }>(
      "select count(*)::text as n from volunteers where id = $1",
      [volunteerHmac(code)],
    );
    expect(Number(rows.rows[0].n)).toBe(0);
  });

  it("a volunteer cannot read another volunteer's row through /me", async () => {
    const a = await join();
    const b = await join();
    const meA = await request(app).get("/api/volunteer/me").set("x-volunteer-code", a.code);
    expect(meA.body.volunteer.coupleId).toBe(a.volunteer.coupleId);
    expect(meA.body.volunteer.coupleId === b.volunteer.coupleId).toBe(
      a.volunteer.coupleId === b.volunteer.coupleId,
    );
  });

  it("the participant code alphabet is enforced", async () => {
    const { code } = await join();
    expect(code).toMatch(/^[BCDFGHJKMNPQRSTVWXZ23456789]{10}$/);
  });
});

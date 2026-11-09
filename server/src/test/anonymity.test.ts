import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupTestDb, type TestDbHandle } from "./testDb";
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

// Every table that is touched by the volunteer flow. If any of these ever
// grows an IP or user-agent column, the test fails loudly.
const VOLUNTEER_TABLES = [
  "volunteers",
  "quiz_responses",
  "time_to_referral_events",
  "audit_log",
  "sessions",
];

describe("volunteer anonymity: no IP, user agent, or raw code on disk or in logs", () => {
  it("no volunteer-touched table has an IP or user-agent column", async () => {
    for (const table of VOLUNTEER_TABLES) {
      const cols = await handle.query<{ column_name: string }>(
        "select column_name from information_schema.columns where table_name = $1",
        [table],
      );
      const names = cols.rows.map((r) => r.column_name);
      for (const forbidden of [
        "ip",
        "ip_address",
        "ipaddress",
        "user_agent",
        "useragent",
        "remote_addr",
        "request_ip",
      ]) {
        expect(names).not.toContain(forbidden);
      }
    }
  });

  it("the volunteer row stores the HMAC of the code, not the code itself; a code probe finds zero rows", async () => {
    const res = await request(app)
      .post("/api/volunteer/join")
      .send({ language: "en", readingBand: "medium" });
    const code: string = res.body.code;
    const byRaw = await handle.query<{ n: string }>(
      "select count(*)::text as n from volunteers where id = $1",
      [code],
    );
    expect(Number(byRaw.rows[0].n)).toBe(0);
    const byHmac = await handle.query<{ n: string }>(
      "select count(*)::text as n from volunteers where id = $1",
      [volunteerHmac(code)],
    );
    expect(Number(byHmac.rows[0].n)).toBe(1);
  });

  it("no row in the audit log mentions the raw code anywhere", async () => {
    const r = await request(app)
      .post("/api/volunteer/join")
      .send({ language: "en", readingBand: "medium" });
    const code: string = r.body.code;
    await request(app).post("/api/volunteer/consent").set("x-volunteer-code", code);
    await request(app).post("/api/volunteer/complete").set("x-volunteer-code", code);
    // Scan every text/jsonb field on audit_log for the raw code.
    const rows = await handle.query<{
      action: string;
      target_type: string | null;
      target_id: string | null;
      purpose: string | null;
      meta: unknown;
    }>(
      "select action, target_type, target_id, purpose, meta from audit_log",
    );
    for (const row of rows.rows) {
      const blob = JSON.stringify(row);
      expect(blob).not.toContain(code);
    }
  });

  it("the application logs (console) carry no raw code or IP during a volunteer flow", async () => {
    const captured: string[] = [];
    const push = (xs: unknown[]) => {
      captured.push(xs.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
    };
    const spies = [
      vi.spyOn(console, "log").mockImplementation((...a) => push(a)),
      vi.spyOn(console, "warn").mockImplementation((...a) => push(a)),
      vi.spyOn(console, "error").mockImplementation((...a) => push(a)),
      vi.spyOn(console, "info").mockImplementation((...a) => push(a)),
    ];
    try {
      const r = await request(app)
        .post("/api/volunteer/join")
        .send({ language: "en", readingBand: "medium" });
      const code: string = r.body.code;
      await request(app).post("/api/volunteer/consent").set("x-volunteer-code", code);
      const q = await request(app)
        .get("/api/volunteer/quiz?phase=before")
        .set("x-volunteer-code", code);
      const itemId = q.body.items[0].id;
      await request(app)
        .post("/api/volunteer/quiz/response")
        .set("x-volunteer-code", code)
        .send({ phase: "before", itemId, answer: 0 });
      await request(app)
        .post("/api/volunteer/ttr")
        .set("x-volunteer-code", code)
        .send({ kind: "opened_result" });
      await request(app).post("/api/volunteer/withdraw").set("x-volunteer-code", code);

      const haystack = captured.join("\n");
      expect(haystack).not.toContain(code);
      // Supertest uses 127.0.0.1; even that should not appear in server-side logs.
      expect(haystack).not.toMatch(/\b127\.0\.0\.1\b/);
    } finally {
      for (const s of spies) s.mockRestore();
    }
  });

  it("rate limiting uses IP in memory; no login rate state is written to the database", async () => {
    // Trigger a few failed logins to exercise the login limiter, then grep
    // every text/jsonb field in every table for the test IP. Nothing should
    // match: the limiter keeps its state in memory only.
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/auth/login")
        .send({ email: `rl${i}@example.com`, password: "wrong wrong wrong!" });
    }
    const tables = await handle.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    for (const t of tables.rows) {
      const cols = await handle.query<{ column_name: string; data_type: string }>(
        "select column_name, data_type from information_schema.columns where table_name = $1 and table_schema = 'public' and data_type in ('text','character varying','jsonb','json')",
        [t.table_name],
      );
      for (const c of cols.rows) {
        const rows = await handle.query<Record<string, unknown>>(
          `select "${c.column_name}"::text as v from "${t.table_name}" where "${c.column_name}"::text like '%127.0.0.1%'`,
        );
        expect(rows.rows.length).toBe(0);
      }
    }
  });
});

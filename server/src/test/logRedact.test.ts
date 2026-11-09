import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { signupAs, csrf } from "./helpers";
import { db } from "../db/client";
import { users } from "../db/schema";
import { storeResults, type ResultsByGene } from "../services/vault";
import { installLogRedactor, redactLine } from "../lib/log-redact";
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

describe("log redactor", () => {
  it("strips argon2 hashes, hex tokens, variant ids and password keys", () => {
    const argon = "$argon2id$v=19$m=65536,t=3,p=1$abc$def";
    const hex = "a".repeat(64);
    const code = "BCDFGHJKMN";
    const json = '{"password":"hunter2","foo":"bar"}';
    const variants = "HbS and HbC and CFTR-p and GJB2-p";
    const line = `password=${argon} session=${hex} code=${code} ${json} ${variants}`;
    const out = redactLine(line);
    expect(out).not.toContain(argon);
    expect(out).not.toContain(hex);
    expect(out).not.toContain(code);
    expect(out).not.toContain("hunter2");
    for (const v of ["HbS", "HbC", "CFTR-p", "GJB2-p"]) expect(out).not.toContain(v);
    expect(out).toContain("[REDACTED_ARGON2]");
    expect(out).toContain("[REDACTED_HEX_TOKEN]");
    expect(out).toContain("[REDACTED_CODE]");
    expect(out).toContain("[REDACTED_VARIANT]");
  });

  it("a full couple flow emits no password, session id, code, variant id or argon hash in the captured log", async () => {
    installLogRedactor();
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
      const a = await signupAs(app, "a@example.com");
      const b = await signupAs(app, "b@example.com");
      // Lab uploads results into each vault.
      const [lab] = await db
        .insert(users)
        .values({
          email: "lab@example.com",
          passwordHash: await hashPassword("a strong lab password 123"),
          role: "lab",
        })
        .returning({ id: users.id });
      const sample: ResultsByGene = {
        HBB: { status: "tested", variants: ["HbS"] },
        CFTR: { status: "tested", variants: [] },
        GJB2: { status: "tested", variants: [] },
      };
      await storeResults(a.id, lab.id, sample);
      await storeResults(b.id, lab.id, sample);

      // Link + consent + couple view.
      const inv = await request(app).post("/api/partner/invite").set(csrf(a));
      await request(app)
        .post("/api/partner/accept")
        .set(csrf(b))
        .send({ code: inv.body.inviteCode });
      await request(app)
        .post("/api/consent")
        .set(csrf(a))
        .send({ purpose: "couple_risk", targetUserId: b.id });
      await request(app)
        .post("/api/consent")
        .set(csrf(b))
        .send({ purpose: "couple_risk", targetUserId: a.id });
      await request(app).get("/api/couple/risk").set("Cookie", a.cookie);

      const haystack = captured.join("\n");
      for (const v of ["HbS", "HbC", "CFTR-p", "GJB2-p"]) expect(haystack).not.toContain(v);
      expect(haystack).not.toMatch(/\$argon2/);
      expect(haystack).not.toMatch(/[a-f0-9]{64}/);
      expect(haystack).not.toContain(a.csrfToken);
      expect(haystack).not.toContain(b.csrfToken);
      // Session cookies are 64 hex chars after sila_session=; verify the raw
      // cookie value doesn't appear.
      expect(haystack).not.toContain(a.cookie.replace(/^sila_session=/, ""));
    } finally {
      for (const s of spies) s.mockRestore();
    }
  });
});

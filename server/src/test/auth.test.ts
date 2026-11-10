import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { setupTestDb, type TestDbHandle } from "./testDb";

let app: Express;
let handle: TestDbHandle;

beforeAll(async () => {
  const mod = await import("../app");
  app = mod.createApp();
});

beforeEach(async () => {
  handle = await setupTestDb();
});

afterEach(async () => {
  await handle.close();
});

describe("auth routes", () => {
  it("signs up a new user and returns a session cookie + csrf token", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "a@example.com", password: "correct horse battery staple", locale: "en" });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: "a@example.com", role: "person", locale: "en" });
    expect(typeof res.body.user.id).toBe("string");
    expect(typeof res.body.csrfToken).toBe("string");
    expect(res.body.csrfToken.length).toBeGreaterThanOrEqual(32);
    const cookies = res.headers["set-cookie"];
    const cookieHeader = Array.isArray(cookies) ? cookies.join("\n") : (cookies ?? "");
    expect(cookieHeader).toMatch(/sila_session=/);
    expect(cookieHeader).toMatch(/HttpOnly/i);
    expect(cookieHeader).toMatch(/SameSite=Lax/i);
  });

  it("rejects a weak password at signup", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "a@example.com", password: "short" });
    expect(res.status).toBe(400);
  });

  // Each row: [label, password, expected reason fragment]. The reason is a
  // substring match — the server returns the full user-facing sentence; the
  // test only asserts the signal survives, not the exact wording.
  const WEAK_CASES: Array<[string, string, string]> = [
    ["common password (lowercase)", "password1234", "common"],
    ["common password (mixed case)", "PASSWORD1234", "common"],
    ["common keyboard walk", "qwertyuiop[]", "common"],
    ["all digits", "748392015673", "digits"],
    ["few distinct characters", "aaaaaaaaaaaaaa", "distinct"],
    ["contains email prefix", "alice-wonderland-123", "email"],
  ];

  for (const [label, password, reasonFragment] of WEAK_CASES) {
    it(`rejects ${label}`, async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: "alice@example.com", password });
      expect(res.status).toBe(400);
      expect(String(res.body.error ?? "").toLowerCase()).toContain(reasonFragment);
    });
  }

  it("accepts a strong passphrase (long, high entropy, not common)", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "strong@example.com", password: "copper-sunset-meadow-47" });
    expect(res.status).toBe(201);
  });

  it("rejects a duplicate email (case-insensitive)", async () => {
    const payload = { email: "dup@example.com", password: "correct horse battery staple" };
    const first = await request(app).post("/api/auth/signup").send(payload);
    expect(first.status).toBe(201);
    const second = await request(app)
      .post("/api/auth/signup")
      .send({ email: "DUP@example.com", password: "another strong password 123" });
    expect(second.status).toBe(409);
  });

  it("logs in with correct credentials and refuses wrong ones", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send({ email: "login@example.com", password: "correct horse battery staple" });

    const good = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.com", password: "correct horse battery staple" });
    expect(good.status).toBe(200);
    expect(good.body.user.email).toBe("login@example.com");
    expect(typeof good.body.csrfToken).toBe("string");

    const bad = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.com", password: "wrong wrong wrong wrong" });
    expect(bad.status).toBe(401);

    const unknown = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "anything but right 1234" });
    expect(unknown.status).toBe(401);
  });

  it("GET /me requires a session and returns the user with csrf token", async () => {
    const signup = await request(app)
      .post("/api/auth/signup")
      .send({ email: "me@example.com", password: "correct horse battery staple" });
    const cookie = extractSessionCookie(signup);
    expect(cookie).toBeTruthy();

    const unauth = await request(app).get("/api/auth/me");
    expect(unauth.status).toBe(401);

    const authed = await request(app).get("/api/auth/me").set("Cookie", cookie!);
    expect(authed.status).toBe(200);
    expect(authed.body.user.email).toBe("me@example.com");
    expect(typeof authed.body.csrfToken).toBe("string");
  });

  it("logout clears the session so /me returns 401", async () => {
    const signup = await request(app)
      .post("/api/auth/signup")
      .send({ email: "out@example.com", password: "correct horse battery staple" });
    const cookie = extractSessionCookie(signup);

    const logout = await request(app).post("/api/auth/logout").set("Cookie", cookie!);
    expect(logout.status).toBe(204);

    const after = await request(app).get("/api/auth/me").set("Cookie", cookie!);
    expect(after.status).toBe(401);
  });

  it("stores a password hash, not the plaintext", async () => {
    const password = "correct horse battery staple";
    await request(app).post("/api/auth/signup").send({ email: "hash@example.com", password });
    const rows = await handle.query<{ password_hash: string }>(
      "select password_hash from users where email = $1",
      ["hash@example.com"],
    );
    expect(rows.rows[0].password_hash).not.toBe(password);
    expect(rows.rows[0].password_hash).toMatch(/^\$argon2id\$/);
  });
});

function extractSessionCookie(res: request.Response): string | undefined {
  const raw = res.headers["set-cookie"];
  if (!raw) return undefined;
  const cookies = Array.isArray(raw) ? raw : [raw];
  const sess = cookies.find((c) => c.startsWith("sila_session="));
  if (!sess) return undefined;
  return sess.split(";")[0];
}

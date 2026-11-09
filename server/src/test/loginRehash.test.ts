import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import argon2 from "argon2";
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

// Verifies the transparent rehash flow in server/src/routes/auth.ts: a user
// whose stored hash was written with the previous (stronger) parameters gets
// their hash quietly upgraded on their next successful login, so a
// parameter change applies to real users without a password reset email.

describe("rehash on login", () => {
  const password = "correct horse battery staple";

  it("rewrites a legacy m=65536 hash to the current m=19456 on successful login", async () => {
    // Create the account through the API so we exercise the real signup
    // path, then overwrite the stored hash with the legacy parameters.
    const email = "rehash@example.com";
    const signup = await request(app).post("/api/auth/signup").send({ email, password });
    expect(signup.status).toBe(201);

    const legacy = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 1 << 16,
      timeCost: 3,
      parallelism: 1,
    });
    await handle.exec(`update users set password_hash = '${legacy}' where email = '${email}'`);

    const before = await handle.query<{ password_hash: string }>(
      "select password_hash from users where email = $1",
      [email],
    );
    expect(before.rows[0].password_hash).toMatch(/m=65536,t=3,p=1/);

    const login = await request(app).post("/api/auth/login").send({ email, password });
    expect(login.status).toBe(200);

    const after = await handle.query<{ password_hash: string }>(
      "select password_hash from users where email = $1",
      [email],
    );
    expect(after.rows[0].password_hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });

  it("leaves a current-parameter hash alone on login", async () => {
    const email = "nokeep@example.com";
    const signup = await request(app).post("/api/auth/signup").send({ email, password });
    expect(signup.status).toBe(201);

    const before = await handle.query<{ password_hash: string }>(
      "select password_hash from users where email = $1",
      [email],
    );
    const hashBefore = before.rows[0].password_hash;

    const login = await request(app).post("/api/auth/login").send({ email, password });
    expect(login.status).toBe(200);

    const after = await handle.query<{ password_hash: string }>(
      "select password_hash from users where email = $1",
      [email],
    );
    expect(after.rows[0].password_hash).toBe(hashBefore);
  });

  it("does not touch the hash on a failed login", async () => {
    const email = "fail@example.com";
    const signup = await request(app).post("/api/auth/signup").send({ email, password });
    expect(signup.status).toBe(201);

    // Legacy hash — would be a rehash target on a successful login.
    const legacy = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 1 << 16,
      timeCost: 3,
      parallelism: 1,
    });
    await handle.exec(`update users set password_hash = '${legacy}' where email = '${email}'`);

    const badLogin = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrong wrong wrong wrong" });
    expect(badLogin.status).toBe(401);

    const after = await handle.query<{ password_hash: string }>(
      "select password_hash from users where email = $1",
      [email],
    );
    expect(after.rows[0].password_hash).toMatch(/m=65536,t=3,p=1/);
  });
});

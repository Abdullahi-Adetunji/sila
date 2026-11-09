import { describe, expect, it } from "vitest";
import argon2 from "argon2";
import { ARGON2_OPTIONS, hashPassword, needsRehash, verifyPassword } from "../lib/password";

// Covers the OWASP-minimum argon2id configuration and the rehash-on-login
// policy. The deliberate downgrade from m=65536,t=3 to m=19456,t=2 is
// documented in docs/security-controls.md.

describe("argon2id policy", () => {
  it("ARGON2_OPTIONS matches OWASP minimums (m=19456 KiB, t=2, p=1)", () => {
    expect(ARGON2_OPTIONS).toMatchObject({
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  });

  it("hashPassword produces an argon2id hash the verifier accepts", async () => {
    const h = await hashPassword("correct horse battery staple");
    expect(h).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await verifyPassword(h, "correct horse battery staple")).toBe(true);
    expect(await verifyPassword(h, "wrong wrong wrong wrong")).toBe(false);
  });

  it("needsRehash is false for a fresh hash, true for a stronger legacy hash", async () => {
    const fresh = await hashPassword("correct horse battery staple");
    expect(await needsRehash(fresh)).toBe(false);

    const legacy = await argon2.hash("correct horse battery staple", {
      type: argon2.argon2id,
      memoryCost: 1 << 16, // 64 MiB — the previous Sila setting
      timeCost: 3,
      parallelism: 1,
    });
    expect(await needsRehash(legacy)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  consumeRecoveryCode,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  totpGenerate,
  totpUri,
  totpVerify,
} from "../lib/totp";

describe("TOTP lib", () => {
  it("base32 round-trip handles non-multiple-of-5 byte lengths", () => {
    const samples = [
      Buffer.from([0x01, 0x02, 0x03]),
      Buffer.from("hello"),
      Buffer.from("a longer sample string with punctuation!"),
    ];
    for (const s of samples) {
      const encoded = base32Encode(s);
      expect(encoded.length).toBeGreaterThan(0);
      expect(base32Decode(encoded).subarray(0, s.length)).toEqual(s);
    }
  });

  it("generateSecret returns a base32 string that totp can use", () => {
    const secret = generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    const code = totpGenerate(secret);
    expect(code).toMatch(/^\d{6}$/);
    expect(totpVerify(secret, code)).toBe(true);
  });

  it("verifies codes within a ±1-step window", () => {
    const secret = generateSecret();
    const now = Date.now();
    const codeNow = totpGenerate(secret, { nowMs: now });
    const codePrev = totpGenerate(secret, { nowMs: now - 30_000 });
    const codeNext = totpGenerate(secret, { nowMs: now + 30_000 });
    const codeFarFuture = totpGenerate(secret, { nowMs: now + 90_000 });
    expect(totpVerify(secret, codeNow, { nowMs: now })).toBe(true);
    expect(totpVerify(secret, codePrev, { nowMs: now })).toBe(true);
    expect(totpVerify(secret, codeNext, { nowMs: now })).toBe(true);
    expect(totpVerify(secret, codeFarFuture, { nowMs: now })).toBe(false);
  });

  it("rejects non-6-digit input without a thrown error", () => {
    const secret = generateSecret();
    expect(totpVerify(secret, "abc")).toBe(false);
    expect(totpVerify(secret, "1234567")).toBe(false);
    expect(totpVerify(secret, "")).toBe(false);
  });

  it("otpauth URI carries the issuer + account + base32 secret", () => {
    const uri = totpUri({ secret: "JBSWY3DPEHPK3PXP", accountName: "a@b", issuer: "Sila" });
    expect(uri).toMatch(/^otpauth:\/\/totp\/Sila%3Aa%40b\?/);
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("issuer=Sila");
    expect(uri).toContain("algorithm=SHA1");
  });

  it("recovery codes are 10 x 10-char base32 formatted as XXXXX-XXXXX", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    for (const c of codes) {
      expect(c).toMatch(/^[A-Z2-7]{5}-[A-Z2-7]{5}$/);
    }
  });

  it("consumeRecoveryCode removes a matching hash and refuses reuse", () => {
    const codes = generateRecoveryCodes();
    const hashed = codes.map(hashRecoveryCode).join(",");
    const after = consumeRecoveryCode(hashed, codes[3]);
    expect(after).not.toBeNull();
    expect(after!.split(",").length).toBe(9);
    // Using the same code again now fails.
    expect(consumeRecoveryCode(after!, codes[3])).toBeNull();
    // A random non-matching code is rejected.
    expect(consumeRecoveryCode(hashed, "AAAAA-AAAAA")).toBeNull();
  });
});

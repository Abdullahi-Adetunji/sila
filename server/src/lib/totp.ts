// Tiny TOTP (RFC 6238) + base32 (RFC 4648) + QR URI builder. No third-party
// dependency so we keep the repo self-contained and our CSP pure.
//
// Verifies with a ±1-step window (default 30s period) so a user whose
// device clock is slightly off still succeeds. The verify function always
// does both comparisons regardless of input, so the time it takes to say
// "yes" or "no" doesn't leak whether the code was close.
//
// Secrets are 160-bit (20 bytes), base32-encoded — standard for TOTP
// authenticator apps. Recovery codes are 10 x 10 base32 characters, hashed
// with SHA-256 before storage.

import { createHmac, randomBytes, timingSafeEqual, createHash } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let out = "";
  let bits = 0;
  let value = 0;
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const c of clean) {
    const idx = BASE32_ALPHABET.indexOf(c);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

function hotp(secret: Buffer, counter: number): string {
  const counterBuf = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = counter & 0xff;
    counter = Math.floor(counter / 256);
  }
  const hmac = createHmac("sha1", secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = bin % 1_000_000;
  return code.toString().padStart(6, "0");
}

export interface TotpOptions {
  period?: number; // seconds (default 30)
  window?: number; // steps either side to accept (default 1 = ±30s)
  nowMs?: number; // for tests
}

export function totpGenerate(base32Secret: string, opts: TotpOptions = {}): string {
  const period = opts.period ?? 30;
  const now = opts.nowMs ?? Date.now();
  const counter = Math.floor(now / 1000 / period);
  return hotp(base32Decode(base32Secret), counter);
}

export function totpVerify(
  base32Secret: string,
  code: string,
  opts: TotpOptions = {},
): boolean {
  const period = opts.period ?? 30;
  const window = opts.window ?? 1;
  const now = opts.nowMs ?? Date.now();
  const counter = Math.floor(now / 1000 / period);
  const secret = base32Decode(base32Secret);
  const clean = code.replace(/\s+/g, "").padStart(6, "0");
  if (!/^\d{6}$/.test(clean)) return false;
  const codeBuf = Buffer.from(clean, "utf8");
  // Walk the full window every call; OR the results so an early match
  // doesn't short-circuit and leak timing. Uses constant-time comparison
  // on every candidate.
  let matched = false;
  for (let i = -window; i <= window; i++) {
    const candidate = hotp(secret, counter + i);
    const eq = candidate.length === clean.length;
    const rc = eq && timingSafeEqual(Buffer.from(candidate, "utf8"), codeBuf);
    matched = matched || rc;
  }
  return matched;
}

// otpauth URI an authenticator app renders into the account entry.
export function totpUri(args: {
  secret: string;
  accountName: string; // e.g. the email
  issuer: string; // e.g. "Sila"
}): string {
  const label = encodeURIComponent(`${args.issuer}:${args.accountName}`);
  const params = new URLSearchParams({
    secret: args.secret,
    issuer: args.issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// Ten recovery codes, each 10 base32 characters, grouped as 5-5 for
// legibility. Hash before storage; compare with SHA-256 timing-safe eq.
export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const raw = base32Encode(randomBytes(7)).slice(0, 10);
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

export function hashRecoveryCode(code: string): string {
  const clean = code.replace(/[^A-Z2-7]/gi, "").toUpperCase();
  return createHash("sha256").update(clean).digest("hex");
}

// Verify a submitted recovery code against the comma-separated list of
// SHA-256 hashes stored on admin_totp.recovery_codes. Returns the
// updated hash-list (with the matched hash removed) if the code is
// valid; null otherwise.
export function consumeRecoveryCode(storedCsv: string, submitted: string): string | null {
  const submittedHash = hashRecoveryCode(submitted);
  const hashes = storedCsv.split(",").map((h) => h.trim()).filter((h) => h.length > 0);
  let matchedIndex = -1;
  for (let i = 0; i < hashes.length; i++) {
    const rc = hashes[i].length === submittedHash.length
      && timingSafeEqual(Buffer.from(hashes[i], "utf8"), Buffer.from(submittedHash, "utf8"));
    if (rc && matchedIndex === -1) matchedIndex = i;
  }
  if (matchedIndex === -1) return null;
  hashes.splice(matchedIndex, 1);
  return hashes.join(",");
}

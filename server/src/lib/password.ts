import argon2 from "argon2";

// OWASP Application Security Verification Standard (ASVS) 4.0 and the OWASP
// Password Storage Cheat Sheet both list argon2id with m=19 MiB, t=2, p=1 as
// a minimum acceptable configuration. We adopt it so both Node processes
// (Next.js + Express) fit together inside Render's free 512 MB instance; the
// previous 64 MiB / t=3 setting would have pushed a single login over the
// cap. The trade-off is recorded in docs/security-controls.md. Existing
// hashes with stronger parameters still verify fine; new ones use these.
export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

// Returns true when `hash` uses parameters that differ from the current
// ARGON2_OPTIONS. Called on every successful login so a user whose hash was
// written under a stronger or older configuration gets quietly upgraded (or
// downgraded, during a deliberate parameter change) to the current policy.
export async function needsRehash(hash: string): Promise<boolean> {
  return argon2.needsRehash(hash, ARGON2_OPTIONS);
}

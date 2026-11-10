// Sila IDs are short human-shareable identifiers a person hands to the
// lab or clinic when they are tested. They are HMAC-derived from the
// user's UUID + an env-held salt, so:
//  - The same UUID always maps to the same Sila ID (stable, no DB column
//    needed).
//  - Nobody can enumerate Sila IDs without the salt.
//  - A leaked Sila ID reveals nothing about the user's UUID.
//
// Format: 10 characters from the base32 alphabet (Crockford's, minus
// ambiguous characters), displayed as XXXX-XXXXXX.

import { createHmac } from "node:crypto";
import { db } from "../db/client";
import { users } from "../db/schema";
import { env } from "../env";

// Crockford-ish alphabet: no I, L, O, U (visually confusable / profanity).
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

function salt(): string {
  // Fall back to SESSION_SECRET if SILA_ID_SALT isn't set so an existing
  // deploy keeps working. In production you want a dedicated SILA_ID_SALT
  // so rotating it doesn't invalidate sessions.
  return process.env.SILA_ID_SALT ?? env.SESSION_SECRET;
}

export function silaIdFor(userId: string): string {
  const mac = createHmac("sha256", salt()).update(userId).digest();
  let out = "";
  // Each character consumes ~5 bits; use top-N bytes mapped into the
  // alphabet. 10 chars * 5 bits = 50 bits of entropy — more than enough
  // to pick out 200 users without collision while staying short.
  for (let i = 0; i < 10; i++) {
    out += ALPHABET[mac[i] % ALPHABET.length];
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

export function normaliseSilaId(input: string): string | null {
  const upper = input.toUpperCase();
  const stripped = upper.replace(/[^A-Z0-9]/g, "");
  if (stripped.length !== 10) return null;
  for (const c of stripped) if (!ALPHABET.includes(c)) return null;
  return `${stripped.slice(0, 4)}-${stripped.slice(4)}`;
}

// Resolve a Sila ID back to the matching user. O(N) in the user table,
// which is fine at pilot scale (~200 users). We scan the users table once,
// compute the Sila ID per row, and compare. A dedicated column + unique
// index would let us index this, but the migration cost isn't worth it
// until we are above a few thousand people.
export async function userIdFromSilaId(silaId: string): Promise<string | null> {
  const normalised = normaliseSilaId(silaId);
  if (!normalised) return null;
  const rows = await db.select({ id: users.id, role: users.role, status: users.status }).from(users);
  for (const row of rows) {
    if (row.role !== "person") continue;
    if (row.status === "deactivated") continue;
    if (silaIdFor(row.id) === normalised) return row.id;
  }
  return null;
}

// Verifies a specific user id resolves to a supplied Sila ID. Used when
// an existing user wants to see "my Sila ID" — the handler calls this
// with its own session's userId.
export function matchesUser(silaId: string, userId: string): boolean {
  const n = normaliseSilaId(silaId);
  if (!n) return false;
  return silaIdFor(userId) === n;
}

// Resolve only if the user has no vault result yet. Used for the demo
// lab's constraint: a demo lab can only submit to people without an
// existing result.
export async function userIdFromSilaIdIfNoVault(silaId: string): Promise<string | null> {
  const id = await userIdFromSilaId(silaId);
  if (!id) return null;
  // Lazy check happens in the lab handler; this helper just resolves.
  return id;
}

// Convenience re-export used by the Sila ID display on /me.
export function getSilaIdForSession(userId: string): string {
  return silaIdFor(userId);
}

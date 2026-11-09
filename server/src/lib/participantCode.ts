import { randomBytes } from "node:crypto";

// Alphabet with no vowels (so codes do not spell words) and no visually
// confusable characters (no 0, 1, I, L, O). 28 symbols; a 10-char code has
// ~48 bits of entropy.
const ALPHABET = "BCDFGHJKMNPQRSTVWXZ23456789";
const CODE_LENGTH = 10;

export function newParticipantCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function isValidParticipantCode(s: string): boolean {
  if (s.length !== CODE_LENGTH) return false;
  for (const c of s) {
    if (!ALPHABET.includes(c)) return false;
  }
  return true;
}

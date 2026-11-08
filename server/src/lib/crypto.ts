import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { env } from "../env";

const AES = "aes-256-gcm" as const;
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function fromBase64url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

function toBase64url(b: Buffer): string {
  return b.toString("base64url");
}

function getKek(): Buffer {
  const kek = fromBase64url(env.SILA_KEK);
  if (kek.length !== KEY_LEN) {
    throw new Error("SILA_KEK must decode to 32 bytes (base64url)");
  }
  return kek;
}

export function randomDataKey(): Buffer {
  return randomBytes(KEY_LEN);
}

function encryptGcm(key: Buffer, plaintext: Buffer, aad: Buffer): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(AES, key, iv, { authTagLength: TAG_LEN });
  cipher.setAAD(aad);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]);
}

function decryptGcm(key: Buffer, packed: Buffer, aad: Buffer): Buffer {
  if (packed.length < IV_LEN + TAG_LEN) {
    throw new Error("ciphertext is too short");
  }
  const iv = packed.subarray(0, IV_LEN);
  const tag = packed.subarray(packed.length - TAG_LEN);
  const ct = packed.subarray(IV_LEN, packed.length - TAG_LEN);
  const decipher = createDecipheriv(AES, key, iv, { authTagLength: TAG_LEN });
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

// Wrap a per-person data key with the KEK. AAD binds the wrapper to the user id
// and key version so a row cannot be swapped between people or versions.
export function wrapDataKey(dataKey: Buffer, userId: string, keyVersion: number): string {
  if (dataKey.length !== KEY_LEN) throw new Error("data key must be 32 bytes");
  const aad = Buffer.from(`kek:${userId}|v${keyVersion}`);
  return toBase64url(encryptGcm(getKek(), dataKey, aad));
}

export function unwrapDataKey(wrapped: string, userId: string, keyVersion: number): Buffer {
  const aad = Buffer.from(`kek:${userId}|v${keyVersion}`);
  return decryptGcm(getKek(), fromBase64url(wrapped), aad);
}

export function resultAad(userId: string, recordId: string, payloadVersion: number): Buffer {
  return Buffer.from(`person:${userId}|record:${recordId}|v${payloadVersion}`);
}

export function encryptPayload(
  dataKey: Buffer,
  plaintext: string,
  aad: Buffer,
): string {
  return toBase64url(encryptGcm(dataKey, Buffer.from(plaintext, "utf8"), aad));
}

export function decryptPayload(dataKey: Buffer, ciphertext: string, aad: Buffer): string {
  return decryptGcm(dataKey, fromBase64url(ciphertext), aad).toString("utf8");
}

export function keysEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

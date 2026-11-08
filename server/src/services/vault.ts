import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { vaultKeys, vaultResults } from "../db/schema";
import {
  decryptPayload,
  encryptPayload,
  randomDataKey,
  resultAad,
  unwrapDataKey,
  wrapDataKey,
} from "../lib/crypto";
import type { GeneResult } from "@/lib/genetics/engine";

export type ResultsByGene = Record<string, GeneResult>;
export const PAYLOAD_VERSION = 1;

async function readKey(userId: string): Promise<{ key: Buffer; version: number } | null> {
  const rows = await db
    .select({
      wrapped: vaultKeys.wrappedDataKey,
      version: vaultKeys.keyVersion,
    })
    .from(vaultKeys)
    .where(eq(vaultKeys.userId, userId));
  const row = rows[0];
  if (!row) return null;
  return { key: unwrapDataKey(row.wrapped, userId, row.version), version: row.version };
}

async function ensureKey(userId: string): Promise<{ key: Buffer; version: number }> {
  const existing = await readKey(userId);
  if (existing) return existing;
  const dataKey = randomDataKey();
  const wrapped = wrapDataKey(dataKey, userId, 1);
  await db.insert(vaultKeys).values({ userId, wrappedDataKey: wrapped, keyVersion: 1 });
  return { key: dataKey, version: 1 };
}

// Lab-style upload: encrypt and store (or replace) the person's results.
// Returns the record id. Plaintext is never persisted.
export async function storeResults(
  userId: string,
  uploadedById: string,
  results: ResultsByGene,
): Promise<{ id: string }> {
  const { key } = await ensureKey(userId);
  const id = randomUUID();
  const aad = resultAad(userId, id, PAYLOAD_VERSION);
  const ciphertext = encryptPayload(key, JSON.stringify(results), aad);
  await db.delete(vaultResults).where(eq(vaultResults.userId, userId));
  await db.insert(vaultResults).values({
    id,
    userId,
    ciphertext,
    payloadVersion: PAYLOAD_VERSION,
    uploadedById,
  });
  return { id };
}

export async function readResults(userId: string): Promise<ResultsByGene | null> {
  const key = await readKey(userId);
  if (!key) return null;
  const rows = await db
    .select({
      id: vaultResults.id,
      ciphertext: vaultResults.ciphertext,
      payloadVersion: vaultResults.payloadVersion,
    })
    .from(vaultResults)
    .where(eq(vaultResults.userId, userId));
  const row = rows[0];
  if (!row) return null;
  const aad = resultAad(userId, row.id, row.payloadVersion);
  const plaintext = decryptPayload(key.key, row.ciphertext, aad);
  return JSON.parse(plaintext) as ResultsByGene;
}

// Crypto-shred: deleting the wrapped data key renders every ciphertext row
// unreadable even though it stays on disk. "Withdraw and delete" removes both.
export async function shredVault(userId: string): Promise<void> {
  await db.delete(vaultResults).where(eq(vaultResults.userId, userId));
  await db.delete(vaultKeys).where(eq(vaultKeys.userId, userId));
}

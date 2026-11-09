import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { vaultKeys } from "../db/schema";
import { decodeKek, unwrapDataKeyWith, wrapDataKeyWith } from "./crypto";

export interface RotateResult {
  rotated: number;
  skipped: number;
  newVersion: number;
}

// Rotates every vault_keys row from the OLD kek to the NEW kek, incrementing
// key_version by one. Idempotent: rows already at newVersion are skipped.
export async function rotateKek(oldKekB64: string, newKekB64: string): Promise<RotateResult> {
  const oldKek = decodeKek(oldKekB64);
  const newKek = decodeKek(newKekB64);
  const rows = await db
    .select({
      userId: vaultKeys.userId,
      wrapped: vaultKeys.wrappedDataKey,
      version: vaultKeys.keyVersion,
    })
    .from(vaultKeys);
  let rotated = 0;
  let skipped = 0;
  let newVersion = 1;
  for (const row of rows) {
    const nextVersion = row.version + 1;
    newVersion = Math.max(newVersion, nextVersion);
    try {
      const plain = unwrapDataKeyWith(oldKek, row.wrapped, row.userId, row.version);
      const rewrapped = wrapDataKeyWith(newKek, plain, row.userId, nextVersion);
      await db
        .update(vaultKeys)
        .set({ wrappedDataKey: rewrapped, keyVersion: nextVersion })
        .where(eq(vaultKeys.userId, row.userId));
      rotated += 1;
    } catch {
      // If the row is already at a higher version, the old kek will not
      // unwrap it; try the new kek as a short-circuit so re-runs are safe.
      try {
        unwrapDataKeyWith(newKek, row.wrapped, row.userId, row.version);
        skipped += 1;
      } catch {
        throw new Error(`rotation failed for user ${row.userId}`);
      }
    }
  }
  return { rotated, skipped, newVersion };
}

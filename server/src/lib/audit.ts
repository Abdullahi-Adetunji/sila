import { createHash } from "node:crypto";
import { asc, desc } from "drizzle-orm";
import { db } from "../db/client";
import { auditLog } from "../db/schema";

export type Outcome = "allowed" | "denied";

export interface AuditInput {
  actorId: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  purpose?: string | null;
  outcome: Outcome;
  meta?: Record<string, unknown> | null;
}

type CanonicalRow = {
  prevHash: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  purpose: string | null;
  outcome: Outcome;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

function canonicalise(row: CanonicalRow): string {
  // Fixed key order, no whitespace, no undefined.
  return JSON.stringify({
    prevHash: row.prevHash,
    actorId: row.actorId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    purpose: row.purpose,
    outcome: row.outcome,
    meta: row.meta,
    createdAt: row.createdAt,
  });
}

function sha256b64url(s: string): string {
  return createHash("sha256").update(s).digest("base64url");
}

export async function appendAudit(input: AuditInput): Promise<{ seq: number; hash: string }> {
  const last = await db
    .select({ hash: auditLog.hash })
    .from(auditLog)
    .orderBy(desc(auditLog.seq))
    .limit(1);
  const prevHash = last[0]?.hash ?? "";

  const createdAtIso = new Date().toISOString();
  const row: CanonicalRow = {
    prevHash,
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    purpose: input.purpose ?? null,
    outcome: input.outcome,
    meta: input.meta ?? null,
    createdAt: createdAtIso,
  };
  const hash = sha256b64url(canonicalise(row));

  const [inserted] = await db
    .insert(auditLog)
    .values({
      prevHash: row.prevHash,
      hash,
      actorId: row.actorId,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      purpose: row.purpose,
      outcome: row.outcome,
      meta: row.meta,
      createdAt: createdAtIso,
    })
    .returning({ seq: auditLog.seq, hash: auditLog.hash });
  return { seq: inserted.seq, hash: inserted.hash };
}

export interface VerifyResult {
  ok: boolean;
  checked: number;
  brokenAt?: number;
  reason?: string;
}

export async function verifyAuditChain(): Promise<VerifyResult> {
  const rows = await db
    .select({
      seq: auditLog.seq,
      prevHash: auditLog.prevHash,
      hash: auditLog.hash,
      actorId: auditLog.actorId,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      purpose: auditLog.purpose,
      outcome: auditLog.outcome,
      meta: auditLog.meta,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .orderBy(asc(auditLog.seq));

  let expectedPrev = "";
  for (const r of rows) {
    if (r.prevHash !== expectedPrev) {
      return {
        ok: false,
        checked: r.seq,
        brokenAt: r.seq,
        reason: "prev_hash mismatch",
      };
    }
    const canonical = canonicalise({
      prevHash: r.prevHash,
      actorId: r.actorId,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      purpose: r.purpose,
      outcome: r.outcome as Outcome,
      meta: (r.meta as Record<string, unknown> | null) ?? null,
      createdAt: r.createdAt,
    });
    if (sha256b64url(canonical) !== r.hash) {
      return {
        ok: false,
        checked: r.seq,
        brokenAt: r.seq,
        reason: "hash mismatch",
      };
    }
    expectedPrev = r.hash;
  }
  return { ok: true, checked: rows.length };
}

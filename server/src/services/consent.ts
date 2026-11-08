import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { consents } from "../db/schema";

export type ConsentPurpose =
  | "couple_risk"
  | "share_with_partner"
  | "share_with_relative"
  | "counsellor_access"
  | "evaluation_data";

export type ConsentScope = "conditions_carried" | "full_result" | null;

export const CURRENT_WORDING_VERSION = "2026-11-draft";

export interface GrantInput {
  grantorId: string;
  purpose: ConsentPurpose;
  targetUserId?: string | null;
  targetOther?: string | null;
  scope?: ConsentScope;
  wordingVersion?: string;
}

export async function grantConsent(input: GrantInput): Promise<{ id: string }> {
  // Revoke any existing active grants of the same shape first; one active row at a time.
  await revokeConsent({
    grantorId: input.grantorId,
    purpose: input.purpose,
    targetUserId: input.targetUserId ?? null,
    targetOther: input.targetOther ?? null,
  });
  const [row] = await db
    .insert(consents)
    .values({
      grantorId: input.grantorId,
      purpose: input.purpose,
      targetUserId: input.targetUserId ?? null,
      targetOther: input.targetOther ?? null,
      scope: input.scope ?? null,
      wordingVersion: input.wordingVersion ?? CURRENT_WORDING_VERSION,
    })
    .returning({ id: consents.id });
  return { id: row.id };
}

export interface RevokeInput {
  grantorId: string;
  purpose: ConsentPurpose;
  targetUserId?: string | null;
  targetOther?: string | null;
}

export async function revokeConsent(input: RevokeInput): Promise<{ revoked: number }> {
  const targetFilter = input.targetOther
    ? eq(consents.targetOther, input.targetOther)
    : input.targetUserId
      ? eq(consents.targetUserId, input.targetUserId)
      : and(isNull(consents.targetUserId), isNull(consents.targetOther));
  const result = await db
    .update(consents)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(consents.grantorId, input.grantorId),
        eq(consents.purpose, input.purpose),
        targetFilter,
        isNull(consents.revokedAt),
      ),
    )
    .returning({ id: consents.id });
  return { revoked: result.length };
}

export interface ActiveConsent {
  id: string;
  purpose: ConsentPurpose;
  targetUserId: string | null;
  scope: ConsentScope;
  grantedAt: Date;
  wordingVersion: string;
}

export async function listActiveConsentsBy(grantorId: string): Promise<ActiveConsent[]> {
  const rows = await db
    .select({
      id: consents.id,
      purpose: consents.purpose,
      targetUserId: consents.targetUserId,
      scope: consents.scope,
      grantedAt: consents.grantedAt,
      wordingVersion: consents.wordingVersion,
    })
    .from(consents)
    .where(and(eq(consents.grantorId, grantorId), isNull(consents.revokedAt)))
    .orderBy(desc(consents.grantedAt));
  return rows.map((r) => ({
    ...r,
    scope: (r.scope as ConsentScope) ?? null,
  }));
}

export async function hasActiveConsent(
  grantorId: string,
  purpose: ConsentPurpose,
  targetUserId: string | null,
): Promise<ActiveConsent | null> {
  const rows = await db
    .select({
      id: consents.id,
      purpose: consents.purpose,
      targetUserId: consents.targetUserId,
      scope: consents.scope,
      grantedAt: consents.grantedAt,
      wordingVersion: consents.wordingVersion,
    })
    .from(consents)
    .where(
      and(
        eq(consents.grantorId, grantorId),
        eq(consents.purpose, purpose),
        targetUserId ? eq(consents.targetUserId, targetUserId) : isNull(consents.targetUserId),
        isNull(consents.revokedAt),
      ),
    )
    .orderBy(desc(consents.grantedAt));
  const row = rows[0];
  if (!row) return null;
  return { ...row, scope: (row.scope as ConsentScope) ?? null };
}

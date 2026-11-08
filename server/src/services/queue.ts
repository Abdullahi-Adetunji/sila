import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { consents, referrals, users } from "../db/schema";
import { getReferral, type Referral } from "./referral";

const PRIORITY_RANK: Record<"counsellor_priority" | "counsellor" | "information", number> = {
  counsellor_priority: 0,
  counsellor: 1,
  information: 2,
};

export interface QueueItem {
  referral: Referral;
  personEmail: string;
}

export async function counsellorQueue(counsellorId: string): Promise<QueueItem[]> {
  // Find every person who has an active counsellor_access consent naming this
  // counsellor.
  const consented = await db
    .select({ grantorId: consents.grantorId })
    .from(consents)
    .where(
      and(
        eq(consents.purpose, "counsellor_access"),
        eq(consents.targetUserId, counsellorId),
        isNull(consents.revokedAt),
      ),
    );
  const consentedPersonIds = Array.from(new Set(consented.map((r) => r.grantorId)));
  if (consentedPersonIds.length === 0) return [];

  // Open referrals for those people.
  const rows = await db
    .select({
      id: referrals.id,
      personId: referrals.personId,
      createdAt: referrals.createdAt,
      closedAt: referrals.closedAt,
    })
    .from(referrals)
    .where(and(inArray(referrals.personId, consentedPersonIds), isNull(referrals.closedAt)))
    .orderBy(desc(referrals.createdAt));

  const userRows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.id, consentedPersonIds));
  const emailById = new Map(userRows.map((u) => [u.id, u.email]));

  const items: QueueItem[] = [];
  for (const r of rows) {
    const full = await getReferral(r.id);
    if (!full) continue;
    items.push({ referral: full, personEmail: emailById.get(r.personId) ?? "" });
  }
  items.sort((a, b) => PRIORITY_RANK[a.referral.priority] - PRIORITY_RANK[b.referral.priority]);
  return items;
}

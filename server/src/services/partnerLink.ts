import { randomBytes } from "node:crypto";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "../db/client";
import { partnerLinks } from "../db/schema";

export type PartnerLinkStatus = "pending" | "active" | "broken";

export interface PartnerLink {
  id: string;
  inviterId: string;
  inviteeId: string | null;
  inviteCode: string;
  status: PartnerLinkStatus;
  acceptedAt: Date | null;
}

function newCode(): string {
  // 6 bytes = 48 bits = 10 base32-ish chars. Readable, short, unique enough.
  return randomBytes(6)
    .toString("base64url")
    .replace(/[-_]/g, "")
    .slice(0, 10)
    .toUpperCase();
}

export async function createInvite(inviterId: string): Promise<PartnerLink> {
  // Replace any prior pending invite from this inviter.
  await db
    .delete(partnerLinks)
    .where(and(eq(partnerLinks.inviterId, inviterId), eq(partnerLinks.status, "pending")));
  const code = newCode();
  const [row] = await db
    .insert(partnerLinks)
    .values({ inviterId, inviteCode: code, status: "pending" })
    .returning();
  return normalise(row);
}

export async function acceptInvite(code: string, inviteeId: string): Promise<PartnerLink | null> {
  const rows = await db
    .select()
    .from(partnerLinks)
    .where(and(eq(partnerLinks.inviteCode, code), eq(partnerLinks.status, "pending")));
  const row = rows[0];
  if (!row) return null;
  if (row.inviterId === inviteeId) return null;
  // Neither partner may already have an active link.
  const existing = await db
    .select({ id: partnerLinks.id })
    .from(partnerLinks)
    .where(
      and(
        eq(partnerLinks.status, "active"),
        or(
          eq(partnerLinks.inviterId, inviteeId),
          eq(partnerLinks.inviteeId, inviteeId),
          eq(partnerLinks.inviterId, row.inviterId),
          eq(partnerLinks.inviteeId, row.inviterId),
        ),
      ),
    );
  if (existing.length > 0) return null;
  const [accepted] = await db
    .update(partnerLinks)
    .set({ inviteeId, status: "active", acceptedAt: new Date() })
    .where(eq(partnerLinks.id, row.id))
    .returning();
  return normalise(accepted);
}

export async function getActiveLinkFor(userId: string): Promise<PartnerLink | null> {
  const rows = await db
    .select()
    .from(partnerLinks)
    .where(
      and(
        eq(partnerLinks.status, "active"),
        or(eq(partnerLinks.inviterId, userId), eq(partnerLinks.inviteeId, userId)),
      ),
    );
  const row = rows[0];
  return row ? normalise(row) : null;
}

export async function getPendingInvitesFrom(userId: string): Promise<PartnerLink[]> {
  const rows = await db
    .select()
    .from(partnerLinks)
    .where(
      and(
        eq(partnerLinks.inviterId, userId),
        eq(partnerLinks.status, "pending"),
        isNull(partnerLinks.inviteeId),
      ),
    );
  return rows.map(normalise);
}

export function partnerOf(link: PartnerLink, userId: string): string | null {
  if (link.inviterId === userId) return link.inviteeId;
  if (link.inviteeId === userId) return link.inviterId;
  return null;
}

function normalise(row: typeof partnerLinks.$inferSelect): PartnerLink {
  return {
    id: row.id,
    inviterId: row.inviterId,
    inviteeId: row.inviteeId,
    inviteCode: row.inviteCode,
    status: row.status,
    acceptedAt: row.acceptedAt,
  };
}

// Admin + staff invite service. The admin dashboard asks it to create an
// invite; the invite page asks it to consume one. Codes are 32-byte URL-
// safe base64 (so ~192 bits of entropy), hashed with SHA-256 before
// storage. The raw code appears only in the admin's browser at creation
// time and in the URL on claim.
//
// Invites expire 72 hours after creation and are single-use. Revoking an
// invite sets revoked_at so it can never be consumed.

import { and, eq, isNull, sql } from "drizzle-orm";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { db } from "../db/client";
import { adminInvites, users } from "../db/schema";
import type { Role } from "../lib/session";

const INVITE_TTL_MS = 72 * 60 * 60 * 1000;

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function newCode(): string {
  // 32 bytes -> 43 chars base64url. Comfortably unguessable.
  return randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface CreatedInvite {
  id: string;
  code: string; // raw code, shown once
  expiresAt: Date;
}

export async function createInvite(args: {
  createdBy: string;
  role: Exclude<Role, "person">;
  email: string;
  displayName: string;
}): Promise<CreatedInvite> {
  const code = newCode();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const [row] = await db
    .insert(adminInvites)
    .values({
      codeHash: hashCode(code),
      role: args.role,
      email: args.email,
      displayName: args.displayName,
      createdBy: args.createdBy,
      expiresAt,
    })
    .returning({ id: adminInvites.id });
  return { id: row.id, code, expiresAt };
}

export async function regenerateInvite(args: {
  inviteId: string;
  createdBy: string;
}): Promise<CreatedInvite> {
  // Revoke the old row, create a fresh one with the same role + email +
  // display name. Two rows in the audit trail: old revoked, new created.
  const [old] = await db
    .select({
      id: adminInvites.id,
      role: adminInvites.role,
      email: adminInvites.email,
      displayName: adminInvites.displayName,
      consumedAt: adminInvites.consumedAt,
      revokedAt: adminInvites.revokedAt,
    })
    .from(adminInvites)
    .where(eq(adminInvites.id, args.inviteId));
  if (!old) throw new Error("not found");
  if (old.consumedAt) throw new Error("already consumed");
  if (old.revokedAt) throw new Error("already revoked");
  await db
    .update(adminInvites)
    .set({ revokedAt: new Date() })
    .where(eq(adminInvites.id, args.inviteId));
  return createInvite({
    createdBy: args.createdBy,
    role: old.role as Exclude<Role, "person">,
    email: old.email,
    displayName: old.displayName,
  });
}

export async function revokeInvite(inviteId: string): Promise<void> {
  await db
    .update(adminInvites)
    .set({ revokedAt: new Date() })
    .where(and(eq(adminInvites.id, inviteId), isNull(adminInvites.consumedAt), isNull(adminInvites.revokedAt)));
}

export interface InviteLookup {
  id: string;
  role: Role;
  email: string;
  displayName: string;
  expiresAt: Date;
}

// Resolve a raw code to its invite row if still usable. We hash the
// submitted code and compare with a constant-time eq to avoid leaking
// prefix info over the network.
export async function lookupByCode(code: string): Promise<InviteLookup | null> {
  const h = hashCode(code);
  const rows = await db
    .select({
      id: adminInvites.id,
      role: adminInvites.role,
      email: adminInvites.email,
      displayName: adminInvites.displayName,
      expiresAt: adminInvites.expiresAt,
      consumedAt: adminInvites.consumedAt,
      revokedAt: adminInvites.revokedAt,
      codeHash: adminInvites.codeHash,
    })
    .from(adminInvites)
    .where(eq(adminInvites.codeHash, h));
  const row = rows[0];
  if (!row) return null;
  // Constant-time equality check just to be extra defensive — the WHERE
  // already narrowed on codeHash, but we assert the full-hash equality in
  // code too.
  const ok = row.codeHash.length === h.length
    && timingSafeEqual(Buffer.from(row.codeHash, "utf8"), Buffer.from(h, "utf8"));
  if (!ok) return null;
  if (row.consumedAt) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  return {
    id: row.id,
    role: row.role as Role,
    email: row.email,
    displayName: row.displayName,
    expiresAt: row.expiresAt,
  };
}

// Mark the invite consumed and link to the newly created user. Safe
// against double-consume: only updates rows whose consumed_at is still
// null, returning 0 updates if the invite was already consumed by a
// concurrent request.
export async function consume(args: {
  inviteId: string;
  newUserId: string;
}): Promise<boolean> {
  const res = await db
    .update(adminInvites)
    .set({ consumedAt: new Date(), consumedUserId: args.newUserId })
    .where(
      and(
        eq(adminInvites.id, args.inviteId),
        isNull(adminInvites.consumedAt),
        isNull(adminInvites.revokedAt),
      ),
    );
  return (res.rowCount ?? 0) > 0;
}

export interface StaffRow {
  id: string;
  email: string;
  displayName: string | null;
  role: Role;
  status: "active" | "deactivated";
  createdAt: Date;
  lastLoginAt: Date | null;
}

// List every account that is NOT a person. Used by /admin.
export async function listStaff(): Promise<StaffRow[]> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(sql`${users.role} <> 'person'`)
    .orderBy(users.createdAt);
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    displayName: null,
    role: r.role as Role,
    status: r.status as "active" | "deactivated",
    createdAt: r.createdAt,
    lastLoginAt: r.lastLoginAt,
  }));
}

// Pending (= not yet consumed, not revoked, not expired) invites.
export async function listPendingInvites(): Promise<
  Array<{ id: string; email: string; displayName: string; role: Role; expiresAt: Date }>
> {
  const rows = await db
    .select({
      id: adminInvites.id,
      email: adminInvites.email,
      displayName: adminInvites.displayName,
      role: adminInvites.role,
      expiresAt: adminInvites.expiresAt,
      consumedAt: adminInvites.consumedAt,
      revokedAt: adminInvites.revokedAt,
    })
    .from(adminInvites)
    .orderBy(adminInvites.createdAt);
  return rows
    .filter((r) => !r.consumedAt && !r.revokedAt && r.expiresAt.getTime() > Date.now())
    .map((r) => ({
      id: r.id,
      email: r.email,
      displayName: r.displayName,
      role: r.role as Role,
      expiresAt: r.expiresAt,
    }));
}

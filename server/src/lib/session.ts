import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { sessions, users } from "../db/schema";

export const SESSION_COOKIE = "sila_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type Role = "person" | "counsellor" | "lab" | "evaluator" | "admin";

export interface SessionInfo {
  id: string;
  userId: string;
  csrfToken: string;
  // Carried on the session so middleware (requirePersonRole, future
  // requireCounsellorRole, etc.) can gate without a second round trip.
  role: Role;
}

export function newToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<SessionInfo> {
  const id = newToken();
  const csrfToken = newToken();
  await db.insert(sessions).values({
    id,
    userId,
    csrfToken,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  const [u] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  return { id, userId, csrfToken, role: (u?.role ?? "person") as Role };
}

export async function resolveSession(id: string | undefined): Promise<SessionInfo | null> {
  if (!id) return null;
  const rows = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      csrfToken: sessions.csrfToken,
      expiresAt: sessions.expiresAt,
      role: users.role,
      status: users.status,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id));
  const s = rows[0];
  if (!s) return null;
  if (s.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  // Deactivated accounts cannot use a lingering session. Delete the row
  // so a future resolve is also a no-op.
  if (s.status === "deactivated") {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  return { id: s.id, userId: s.userId, csrfToken: s.csrfToken, role: s.role as Role };
}

export async function deleteSessionsForUser(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function deleteSession(id: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, id));
}

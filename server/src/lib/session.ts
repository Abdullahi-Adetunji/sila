import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { sessions } from "../db/schema";

export const SESSION_COOKIE = "sila_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export interface SessionInfo {
  id: string;
  userId: string;
  csrfToken: string;
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
  return { id, userId, csrfToken };
}

export async function resolveSession(id: string | undefined): Promise<SessionInfo | null> {
  if (!id) return null;
  const rows = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      csrfToken: sessions.csrfToken,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(eq(sessions.id, id));
  const s = rows[0];
  if (!s) return null;
  if (s.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  return { id: s.id, userId: s.userId, csrfToken: s.csrfToken };
}

export async function deleteSession(id: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, id));
}

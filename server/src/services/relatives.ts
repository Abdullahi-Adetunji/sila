import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { relatives } from "../db/schema";

export interface Relative {
  id: string;
  personId: string;
  displayName: string;
  createdAt: Date;
}

export async function addRelative(personId: string, displayName: string): Promise<Relative> {
  const [row] = await db
    .insert(relatives)
    .values({ personId, displayName })
    .returning();
  return normalise(row);
}

export async function listRelatives(personId: string): Promise<Relative[]> {
  const rows = await db
    .select()
    .from(relatives)
    .where(eq(relatives.personId, personId))
    .orderBy(desc(relatives.createdAt));
  return rows.map(normalise);
}

export async function getRelative(
  personId: string,
  relativeId: string,
): Promise<Relative | null> {
  const rows = await db
    .select()
    .from(relatives)
    .where(and(eq(relatives.id, relativeId), eq(relatives.personId, personId)));
  return rows[0] ? normalise(rows[0]) : null;
}

export async function removeRelative(personId: string, relativeId: string): Promise<boolean> {
  const result = await db
    .delete(relatives)
    .where(and(eq(relatives.id, relativeId), eq(relatives.personId, personId)))
    .returning({ id: relatives.id });
  return result.length > 0;
}

function normalise(row: typeof relatives.$inferSelect): Relative {
  return {
    id: row.id,
    personId: row.personId,
    displayName: row.displayName,
    createdAt: row.createdAt,
  };
}

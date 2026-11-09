import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { volunteers, quizResponses, timeToReferralEvents } from "../db/schema";
import { newParticipantCode } from "../lib/participantCode";

const here = dirname(fileURLToPath(import.meta.url));
const couplesJsonPath = resolve(here, "../../../data/synthetic/couples.json");

let COUPLE_IDS: string[] | null = null;
function coupleIds(): string[] {
  if (COUPLE_IDS) return COUPLE_IDS;
  const raw = readFileSync(couplesJsonPath, "utf8");
  const parsed = JSON.parse(raw) as { couples: { coupleId: string }[] };
  COUPLE_IDS = parsed.couples.map((c) => c.coupleId);
  return COUPLE_IDS;
}

export type Language = "en" | "ar";
export type ReadingBand = "low" | "medium" | "high" | "unknown";
export type FormOrder = "AB" | "BA";

export interface Volunteer {
  id: string;
  language: Language;
  readingBand: ReadingBand;
  formOrder: FormOrder;
  coupleId: string;
  startedAt: string;
  consentedAt: string | null;
  completedAt: string | null;
  withdrawnAt: string | null;
}

export async function joinVolunteer(input: {
  language: Language;
  readingBand?: ReadingBand;
}): Promise<Volunteer> {
  const id = newParticipantCode();
  const now = new Date().toISOString();
  const order: FormOrder = Math.random() < 0.5 ? "AB" : "BA";
  const ids = coupleIds();
  const coupleId = ids[Math.floor(Math.random() * ids.length)];
  const [row] = await db
    .insert(volunteers)
    .values({
      id,
      language: input.language,
      readingBand: input.readingBand ?? "unknown",
      formOrder: order,
      coupleId,
      startedAt: now,
    })
    .returning();
  return normalise(row);
}

export async function getByCode(code: string): Promise<Volunteer | null> {
  const rows = await db.select().from(volunteers).where(eq(volunteers.id, code));
  const row = rows[0];
  if (!row) return null;
  if (row.withdrawnAt) return null;
  return normalise(row);
}

export async function consent(code: string): Promise<Volunteer | null> {
  const now = new Date().toISOString();
  const [row] = await db
    .update(volunteers)
    .set({ consentedAt: now })
    .where(eq(volunteers.id, code))
    .returning();
  return row ? normalise(row) : null;
}

export async function complete(code: string): Promise<Volunteer | null> {
  const now = new Date().toISOString();
  const [row] = await db
    .update(volunteers)
    .set({ completedAt: now })
    .where(eq(volunteers.id, code))
    .returning();
  return row ? normalise(row) : null;
}

// Hard delete. Removes the volunteer row and every response and event tied
// to it. The participant code becomes unusable afterwards.
export async function withdraw(code: string): Promise<boolean> {
  const deletedResponses = await db
    .delete(quizResponses)
    .where(eq(quizResponses.volunteerId, code))
    .returning({ id: quizResponses.id });
  const deletedEvents = await db
    .delete(timeToReferralEvents)
    .where(eq(timeToReferralEvents.volunteerId, code))
    .returning({ id: timeToReferralEvents.id });
  const deleted = await db
    .delete(volunteers)
    .where(eq(volunteers.id, code))
    .returning({ id: volunteers.id });
  return deleted.length > 0 || deletedResponses.length > 0 || deletedEvents.length > 0;
}

function normalise(row: typeof volunteers.$inferSelect): Volunteer {
  return {
    id: row.id,
    language: row.language,
    readingBand: row.readingBand,
    formOrder: row.formOrder,
    coupleId: row.coupleId,
    startedAt: row.startedAt,
    consentedAt: row.consentedAt,
    completedAt: row.completedAt,
    withdrawnAt: row.withdrawnAt,
  };
}

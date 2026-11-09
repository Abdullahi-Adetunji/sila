import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { referrals, referralSteps } from "../db/schema";
import { nowIso } from "../lib/clock";

export type ReferralPriority = "information" | "counsellor" | "counsellor_priority";
export type ReferralStep =
  | "referred"
  | "counselling_booked"
  | "counselling_done"
  | "confirmatory_ordered"
  | "result_received"
  | "specialist_referral"
  | "closed";

export interface Referral {
  id: string;
  personId: string;
  priority: ReferralPriority;
  reasonSnapshot: unknown;
  createdAt: string;
  closedAt: string | null;
  steps: Array<{
    id: string;
    step: ReferralStep;
    occurredAt: string;
    actorId: string | null;
    meta: unknown;
  }>;
}

export async function createReferral(input: {
  personId: string;
  priority: ReferralPriority;
  reasonSnapshot: unknown;
}): Promise<Referral> {
  // Timestamp is scoped to this person's clock, so an /api/dev/clock advance
  // only shifts demo users' referrals, never anyone else's.
  const createdAt = nowIso(input.personId);
  const [row] = await db
    .insert(referrals)
    .values({
      personId: input.personId,
      priority: input.priority,
      reasonSnapshot: input.reasonSnapshot as object,
      createdAt,
    })
    .returning();
  // First step is always "referred", occurring at the same simulated time.
  await db.insert(referralSteps).values({
    referralId: row.id,
    step: "referred",
    occurredAt: createdAt,
    actorId: input.personId,
    meta: null,
  });
  return hydrate(row.id);
}

export async function listReferralsFor(personId: string): Promise<Referral[]> {
  const rows = await db
    .select()
    .from(referrals)
    .where(eq(referrals.personId, personId))
    .orderBy(desc(referrals.createdAt));
  const result: Referral[] = [];
  for (const r of rows) {
    result.push(await hydrate(r.id));
  }
  return result;
}

export async function getReferral(referralId: string): Promise<Referral | null> {
  const rows = await db.select().from(referrals).where(eq(referrals.id, referralId));
  if (!rows[0]) return null;
  return hydrate(rows[0].id);
}

export async function addStep(input: {
  referralId: string;
  step: ReferralStep;
  actorId: string;
  meta?: unknown;
}): Promise<Referral> {
  // The step's timestamp is on the referred person's clock, not the
  // counsellor's, so advance() moves time for the case being tracked.
  const current = await getReferral(input.referralId);
  const occurredAt = nowIso(current?.personId);
  await db.insert(referralSteps).values({
    referralId: input.referralId,
    step: input.step,
    occurredAt,
    actorId: input.actorId,
    meta: (input.meta ?? null) as object | null,
  });
  if (input.step === "closed") {
    await db
      .update(referrals)
      .set({ closedAt: occurredAt })
      .where(eq(referrals.id, input.referralId));
  }
  return (await getReferral(input.referralId))!;
}

async function hydrate(referralId: string): Promise<Referral> {
  const [row] = await db.select().from(referrals).where(eq(referrals.id, referralId));
  const steps = await db
    .select()
    .from(referralSteps)
    .where(eq(referralSteps.referralId, referralId))
    .orderBy(asc(referralSteps.occurredAt));
  return {
    id: row.id,
    personId: row.personId,
    priority: row.priority,
    reasonSnapshot: row.reasonSnapshot,
    createdAt: row.createdAt,
    closedAt: row.closedAt,
    steps: steps.map((s) => ({
      id: s.id,
      step: s.step,
      occurredAt: s.occurredAt,
      actorId: s.actorId,
      meta: s.meta,
    })),
  };
}

export function elapsedMsBetween(from: string, to: string): number {
  return Math.max(0, new Date(to).getTime() - new Date(from).getTime());
}

export async function hasStep(referralId: string, step: ReferralStep): Promise<boolean> {
  const rows = await db
    .select({ id: referralSteps.id })
    .from(referralSteps)
    .where(and(eq(referralSteps.referralId, referralId), eq(referralSteps.step, step)));
  return rows.length > 0;
}

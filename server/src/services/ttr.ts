import { asc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { timeToReferralEvents } from "../db/schema";

export type TtrKind = "opened_result" | "opened_referral_form" | "submitted_referral";

export async function recordTtrEvent(volunteerId: string, kind: TtrKind): Promise<void> {
  await db.insert(timeToReferralEvents).values({
    volunteerId,
    kind,
    at: new Date().toISOString(),
  });
}

export interface TtrEvent {
  kind: TtrKind;
  at: string;
}

export async function eventsFor(volunteerId: string): Promise<TtrEvent[]> {
  const rows = await db
    .select({ kind: timeToReferralEvents.kind, at: timeToReferralEvents.at })
    .from(timeToReferralEvents)
    .where(eq(timeToReferralEvents.volunteerId, volunteerId))
    .orderBy(asc(timeToReferralEvents.at));
  return rows.map((r) => ({ kind: r.kind as TtrKind, at: r.at }));
}

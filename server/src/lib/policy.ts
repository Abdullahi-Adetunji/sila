import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { consents } from "../db/schema";
import { hasActiveConsent, type ConsentScope } from "../services/consent";
import { getActiveLinkFor, partnerOf } from "../services/partnerLink";

export type Outcome = "allowed" | "denied";

export interface Decision {
  outcome: Outcome;
  reason: string;
}

const ALLOW: Decision = { outcome: "allowed", reason: "ok" };

// Reading one's own result is always allowed by the policy module (auth still
// has to pass). This exists so that every personal-data read goes through
// `authorize()`, as the brief requires.
export function canReadOwnResult(_actorId: string, _targetId: string, actorIsTarget: boolean): Decision {
  if (actorIsTarget) return ALLOW;
  return { outcome: "denied", reason: "not_own_result" };
}

// Can `actorId` see `targetId`'s result at `scope` or better?
// Needs an active `share_with_partner` consent grantor=target → target=actor.
export async function canReadPartnerResult(
  actorId: string,
  targetId: string,
  required: Exclude<ConsentScope, null>,
): Promise<Decision> {
  if (actorId === targetId) return ALLOW;
  const link = await getActiveLinkFor(targetId);
  if (!link || partnerOf(link, targetId) !== actorId) {
    return { outcome: "denied", reason: "no_active_partner_link" };
  }
  const consent = await hasActiveConsent(targetId, "share_with_partner", actorId);
  if (!consent) return { outcome: "denied", reason: "no_share_with_partner_consent" };
  if (required === "full_result" && consent.scope !== "full_result") {
    return { outcome: "denied", reason: "insufficient_scope" };
  }
  return ALLOW;
}

// Can we show the couple view to `actorId` for their link with `partnerId`?
// Both partners must have an active `couple_risk` grant for each other.
export async function canReadCoupleRisk(actorId: string, partnerId: string): Promise<Decision> {
  if (actorId === partnerId) return { outcome: "denied", reason: "self_pair" };
  const link = await getActiveLinkFor(actorId);
  if (!link || partnerOf(link, actorId) !== partnerId) {
    return { outcome: "denied", reason: "no_active_partner_link" };
  }
  const a = await hasActiveConsent(actorId, "couple_risk", partnerId);
  const b = await hasActiveConsent(partnerId, "couple_risk", actorId);
  if (!a || !b) return { outcome: "denied", reason: "missing_couple_risk_consent" };
  return ALLOW;
}

// Counsellor read of a referred person's result needs an active
// `counsellor_access` grant that names this counsellor.
export async function canCounsellorRead(counsellorId: string, personId: string): Promise<Decision> {
  const consent = await hasActiveConsent(personId, "counsellor_access", counsellorId);
  if (!consent) return { outcome: "denied", reason: "no_counsellor_access" };
  return ALLOW;
}

// Share with a named relative. targetOther on the consent row is the relative
// id. The relative does not have a Sila account; this check is used before
// producing any relative-shaped payload.
export async function canShareWithRelative(
  grantorId: string,
  relativeId: string,
  required: Exclude<ConsentScope, null>,
): Promise<Decision> {
  const rows = await db
    .select({ scope: consents.scope })
    .from(consents)
    .where(
      and(
        eq(consents.grantorId, grantorId),
        eq(consents.purpose, "share_with_relative"),
        eq(consents.targetOther, relativeId),
        isNull(consents.revokedAt),
      ),
    );
  const match = rows[0];
  if (!match) return { outcome: "denied", reason: "no_share_with_relative_consent" };
  if (required === "full_result" && match.scope !== "full_result") {
    return { outcome: "denied", reason: "insufficient_scope" };
  }
  return ALLOW;
}

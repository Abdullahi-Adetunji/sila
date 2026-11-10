import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "../middleware/requireSession";
import { requirePersonRole } from "../middleware/requirePersonRole";
import { requireCsrf } from "../middleware/requireCsrf";
import { db } from "../db/client";
import { users } from "../db/schema";
import { appendAudit } from "../lib/audit";
import { canCounsellorRead } from "../lib/policy";
import { hasActiveConsent } from "../services/consent";
import {
  addStep,
  createReferral,
  getReferral,
  listReferralsFor,
  type ReferralStep,
} from "../services/referral";

const router: Router = Router();

const createSchema = z.object({
  priority: z.enum(["information", "counsellor", "counsellor_priority"]),
  reasonSnapshot: z.unknown(),
  counsellorId: z.string().uuid(),
});

router.get("/", requireSession, requirePersonRole, async (req: Request, res: Response) => {
  const actorId = req.session!.userId;
  // Person-only: list the signed-in person's own referrals. Counsellors
  // see referrals through /api/counsellor/queue, not here.
  const rows = await listReferralsFor(actorId);
  res.json({ referrals: rows });
});

router.post("/", requireSession, requirePersonRole, requireCsrf, async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request" });
    return;
  }
  const actorId = req.session!.userId;
  // The person must have granted counsellor_access to this counsellor. For the
  // `information` route the brief says "If they decline, show how to book a
  // counsellor directly"; so only allow referral creation when access exists.
  const consent = await hasActiveConsent(actorId, "counsellor_access", parsed.data.counsellorId);
  if (!consent) {
    await appendAudit({
      actorId,
      action: "create_referral",
      targetType: "user",
      targetId: parsed.data.counsellorId,
      purpose: "counsellor_access",
      outcome: "denied",
      meta: { reason: "no_counsellor_access" },
    });
    res.status(403).json({ error: "forbidden", reason: "no_counsellor_access" });
    return;
  }
  const referral = await createReferral({
    personId: actorId,
    priority: parsed.data.priority,
    reasonSnapshot: parsed.data.reasonSnapshot,
  });
  await appendAudit({
    actorId,
    action: "create_referral",
    targetType: "referral",
    targetId: referral.id,
    purpose: "counsellor_access",
    outcome: "allowed",
    meta: { priority: referral.priority },
  });
  res.status(201).json({ referral });
});

const stepSchema = z.object({
  step: z.enum([
    "counselling_booked",
    "counselling_done",
    "confirmatory_ordered",
    "result_received",
    "specialist_referral",
    "closed",
  ]),
  meta: z.unknown().optional(),
});

router.post(
  "/:id/step",
  requireSession,
  requireCsrf,
  async (req: Request, res: Response) => {
    const actorId = req.session!.userId;
    const referralId = String(req.params.id);
    const referral = await getReferral(referralId);
    if (!referral) {
      res.status(404).json({ error: "not found" });
      return;
    }
    // Only a counsellor with counsellor_access on this person can add steps.
    const [actor] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, actorId));
    if (actor?.role !== "counsellor") {
      await appendAudit({
        actorId,
        action: "add_referral_step",
        targetType: "referral",
        targetId: referralId,
        purpose: "counsellor_access",
        outcome: "denied",
        meta: { reason: "not_counsellor" },
      });
      res.status(403).json({ error: "forbidden", reason: "not_counsellor" });
      return;
    }
    const decision = await canCounsellorRead(actorId, referral.personId);
    if (decision.outcome === "denied") {
      await appendAudit({
        actorId,
        action: "add_referral_step",
        targetType: "referral",
        targetId: referralId,
        purpose: "counsellor_access",
        outcome: "denied",
        meta: { reason: decision.reason },
      });
      res.status(403).json({ error: "forbidden", reason: decision.reason });
      return;
    }
    const parsed = stepSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid request" });
      return;
    }
    try {
      const updated = await addStep({
        referralId,
        step: parsed.data.step as ReferralStep,
        actorId,
        meta: parsed.data.meta ?? null,
      });
      await appendAudit({
        actorId,
        action: "add_referral_step",
        targetType: "referral",
        targetId: referralId,
        purpose: "counsellor_access",
        outcome: "allowed",
        meta: { step: parsed.data.step },
      });
      res.json({ referral: updated });
    } catch {
      res.status(409).json({ error: "duplicate_step" });
    }
  },
);

router.get("/:id", requireSession, async (req: Request, res: Response) => {
  const actorId = req.session!.userId;
  const referralId = String(req.params.id);
  const referral = await getReferral(referralId);
  if (!referral) {
    res.status(404).json({ error: "not found" });
    return;
  }
  if (referral.personId === actorId) {
    await appendAudit({
      actorId,
      action: "read_referral",
      targetType: "referral",
      targetId: referralId,
      outcome: "allowed",
      meta: { as: "self" },
    });
    res.json({ referral });
    return;
  }
  const [actor] = await db.select({ role: users.role }).from(users).where(eq(users.id, actorId));
  if (actor?.role !== "counsellor") {
    await appendAudit({
      actorId,
      action: "read_referral",
      targetType: "referral",
      targetId: referralId,
      purpose: "counsellor_access",
      outcome: "denied",
      meta: { reason: "not_counsellor" },
    });
    res.status(403).json({ error: "forbidden", reason: "not_counsellor" });
    return;
  }
  const decision = await canCounsellorRead(actorId, referral.personId);
  if (decision.outcome === "denied") {
    await appendAudit({
      actorId,
      action: "read_referral",
      targetType: "referral",
      targetId: referralId,
      purpose: "counsellor_access",
      outcome: "denied",
      meta: { reason: decision.reason },
    });
    res.status(403).json({ error: "forbidden", reason: decision.reason });
    return;
  }
  await appendAudit({
    actorId,
    action: "read_referral",
    targetType: "referral",
    targetId: referralId,
    purpose: "counsellor_access",
    outcome: "allowed",
  });
  res.json({ referral });
});

export default router;

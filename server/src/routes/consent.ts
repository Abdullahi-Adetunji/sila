import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireSession } from "../middleware/requireSession";
import { requireCsrf } from "../middleware/requireCsrf";
import {
  CURRENT_WORDING_VERSION,
  grantConsent,
  listActiveConsentsBy,
  revokeConsent,
  type ConsentPurpose,
} from "../services/consent";
import { appendAudit } from "../lib/audit";

const router: Router = Router();

const purposeEnum = z.enum([
  "couple_risk",
  "share_with_partner",
  "share_with_relative",
  "counsellor_access",
  "evaluation_data",
]);

const grantSchema = z.object({
  purpose: purposeEnum,
  targetUserId: z.string().uuid().nullish(),
  targetOther: z.string().max(200).nullish(),
  scope: z.enum(["conditions_carried", "full_result"]).nullish(),
  wordingVersion: z.string().max(32).optional(),
});

const revokeSchema = z.object({
  purpose: purposeEnum,
  targetUserId: z.string().uuid().nullish(),
  targetOther: z.string().max(200).nullish(),
});

router.get("/", requireSession, async (req: Request, res: Response) => {
  const rows = await listActiveConsentsBy(req.session!.userId);
  res.json({
    wordingVersion: CURRENT_WORDING_VERSION,
    consents: rows.map((r) => ({
      id: r.id,
      purpose: r.purpose,
      targetUserId: r.targetUserId,
      scope: r.scope,
      grantedAt: r.grantedAt,
      wordingVersion: r.wordingVersion,
    })),
  });
});

router.post("/", requireSession, requireCsrf, async (req: Request, res: Response) => {
  const parsed = grantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request" });
    return;
  }
  const d = parsed.data;
  // Each purpose has a target-type contract. Enforce it.
  if ((d.purpose === "couple_risk" || d.purpose === "share_with_partner") && !d.targetUserId) {
    res.status(400).json({ error: "target user required" });
    return;
  }
  if (d.purpose === "share_with_partner" && !d.scope) {
    res.status(400).json({ error: "scope required" });
    return;
  }
  const result = await grantConsent({
    grantorId: req.session!.userId,
    purpose: d.purpose as ConsentPurpose,
    targetUserId: d.targetUserId ?? null,
    targetOther: d.targetOther ?? null,
    scope: d.scope ?? null,
    wordingVersion: d.wordingVersion,
  });
  await appendAudit({
    actorId: req.session!.userId,
    action: "grant_consent",
    targetType: d.targetUserId ? "user" : "other",
    targetId: d.targetUserId ?? d.targetOther ?? null,
    purpose: d.purpose,
    outcome: "allowed",
    meta: { scope: d.scope ?? null },
  });
  res.status(201).json({ id: result.id });
});

router.post("/revoke", requireSession, requireCsrf, async (req: Request, res: Response) => {
  const parsed = revokeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request" });
    return;
  }
  const result = await revokeConsent({
    grantorId: req.session!.userId,
    purpose: parsed.data.purpose as ConsentPurpose,
    targetUserId: parsed.data.targetUserId ?? null,
    targetOther: parsed.data.targetOther ?? null,
  });
  await appendAudit({
    actorId: req.session!.userId,
    action: "revoke_consent",
    targetType: parsed.data.targetUserId
      ? "user"
      : parsed.data.targetOther
        ? "other"
        : null,
    targetId: parsed.data.targetUserId ?? parsed.data.targetOther ?? null,
    purpose: parsed.data.purpose,
    outcome: "allowed",
    meta: { revoked: result.revoked },
  });
  res.status(200).json({ revoked: result.revoked });
});

export default router;

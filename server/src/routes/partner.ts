import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireSession } from "../middleware/requireSession";
import { requirePersonRole } from "../middleware/requirePersonRole";
import { requireCsrf } from "../middleware/requireCsrf";
import {
  acceptInvite,
  createInvite,
  getActiveLinkFor,
  getPendingInvitesFrom,
  partnerOf,
} from "../services/partnerLink";
import { appendAudit } from "../lib/audit";

const router: Router = Router();

router.get("/", requireSession, requirePersonRole, async (req: Request, res: Response) => {
  const userId = req.session!.userId;
  const active = await getActiveLinkFor(userId);
  if (active) {
    res.json({
      link: {
        id: active.id,
        status: active.status,
        acceptedAt: active.acceptedAt,
        partnerId: partnerOf(active, userId),
      },
    });
    return;
  }
  const pending = await getPendingInvitesFrom(userId);
  res.json({
    link: null,
    pendingInvites: pending.map((p) => ({ id: p.id, inviteCode: p.inviteCode, createdAt: p.acceptedAt })),
  });
});

router.post("/invite", requireSession, requirePersonRole, requireCsrf, async (req: Request, res: Response) => {
  const existing = await getActiveLinkFor(req.session!.userId);
  if (existing) {
    res.status(409).json({ error: "already linked" });
    return;
  }
  const link = await createInvite(req.session!.userId);
  await appendAudit({
    actorId: req.session!.userId,
    action: "create_partner_invite",
    targetType: "partner_link",
    targetId: link.id,
    outcome: "allowed",
  });
  res.status(201).json({ inviteCode: link.inviteCode });
});

const acceptSchema = z.object({ code: z.string().min(1).max(32) });

router.post("/accept", requireSession, requirePersonRole, requireCsrf, async (req: Request, res: Response) => {
  const parsed = acceptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request" });
    return;
  }
  const link = await acceptInvite(parsed.data.code, req.session!.userId);
  if (!link) {
    await appendAudit({
      actorId: req.session!.userId,
      action: "accept_partner_invite",
      targetType: "invite_code",
      targetId: null,
      outcome: "denied",
      meta: { reason: "invite_not_usable" },
    });
    res.status(404).json({ error: "invite not usable" });
    return;
  }
  await appendAudit({
    actorId: req.session!.userId,
    action: "accept_partner_invite",
    targetType: "partner_link",
    targetId: link.id,
    outcome: "allowed",
  });
  res.status(200).json({
    link: {
      id: link.id,
      status: link.status,
      acceptedAt: link.acceptedAt,
      partnerId: partnerOf(link, req.session!.userId),
    },
  });
});

export default router;

// /api/admin — staff management for the admin role.
//
// Hard rules enforced here:
// - Admins can only create counsellor, lab, evaluator or admin accounts.
//   Cannot create a person account. Cannot change their own role.
// - Admins cannot read any person's vault, consent, couple view,
//   referral, relative or volunteer data. There is NO endpoint here that
//   returns personal genetic surface; the only data an admin can see is
//   the staff roster, their own admin-action log, and the pending invite
//   list.
// - Deactivation sets users.status = 'deactivated' AND deletes every
//   session row for that user (so a currently signed-in staff member is
//   forced out at the next request). Accounts are NEVER DELETE-d so the
//   audit chain stays intact.

import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { adminInvites, auditLog, users } from "../db/schema";
import { requireSession } from "../middleware/requireSession";
import { requireAdminRole } from "../middleware/requireAdminRole";
import { requireCsrf } from "../middleware/requireCsrf";
import { appendAudit } from "../lib/audit";
import { deleteSessionsForUser } from "../lib/session";
import {
  createInvite,
  listPendingInvites,
  listStaff,
  regenerateInvite,
  revokeInvite,
} from "../services/invite";

const router: Router = Router();

const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `admin-invite:${req.session?.userId ?? "anon"}`,
});

router.get("/staff", requireSession, requireAdminRole, async (_req: Request, res: Response) => {
  const [staff, invites] = await Promise.all([listStaff(), listPendingInvites()]);
  res.json({ staff, pendingInvites: invites });
});

const inviteSchema = z.object({
  email: z.string().email().max(254),
  displayName: z.string().trim().min(1).max(120),
  role: z.enum(["counsellor", "lab", "evaluator", "admin"]),
});

router.post(
  "/invite",
  requireSession,
  requireAdminRole,
  requireCsrf,
  inviteLimiter,
  async (req: Request, res: Response) => {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid request" });
      return;
    }
    const session = req.session!;
    try {
      const invite = await createInvite({
        createdBy: session.userId,
        role: parsed.data.role,
        email: parsed.data.email,
        displayName: parsed.data.displayName,
      });
      await appendAudit({
        actorId: session.userId,
        action: "admin_invite_create",
        targetType: "invite",
        targetId: invite.id,
        outcome: "allowed",
        meta: { role: parsed.data.role, email: parsed.data.email },
      });
      res.status(201).json({
        invite: {
          id: invite.id,
          email: parsed.data.email,
          displayName: parsed.data.displayName,
          role: parsed.data.role,
          code: invite.code,
          expiresAt: invite.expiresAt,
        },
      });
    } catch (err) {
      res.status(500).json({ error: "invite_failed" });
      throw err;
    }
  },
);

router.post(
  "/invite/:id/regenerate",
  requireSession,
  requireAdminRole,
  requireCsrf,
  inviteLimiter,
  async (req: Request, res: Response) => {
    const session = req.session!;
    try {
      const invite = await regenerateInvite({
        inviteId: String(req.params.id),
        createdBy: session.userId,
      });
      await appendAudit({
        actorId: session.userId,
        action: "admin_invite_regenerate",
        targetType: "invite",
        targetId: invite.id,
        outcome: "allowed",
        meta: null,
      });
      res.status(201).json({
        invite: { id: invite.id, code: invite.code, expiresAt: invite.expiresAt },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      if (msg === "not found") {
        res.status(404).json({ error: "not_found" });
        return;
      }
      if (msg === "already consumed" || msg === "already revoked") {
        res.status(409).json({ error: msg.replace(/\s+/g, "_") });
        return;
      }
      throw err;
    }
  },
);

router.post(
  "/invite/:id/revoke",
  requireSession,
  requireAdminRole,
  requireCsrf,
  async (req: Request, res: Response) => {
    await revokeInvite(String(req.params.id));
    await appendAudit({
      actorId: req.session!.userId,
      action: "admin_invite_revoke",
      targetType: "invite",
      targetId: String(req.params.id),
      outcome: "allowed",
      meta: null,
    });
    res.status(204).send();
  },
);

const userIdSchema = z.object({ id: z.string().uuid() });

router.post(
  "/user/:id/deactivate",
  requireSession,
  requireAdminRole,
  requireCsrf,
  async (req: Request, res: Response) => {
    const parsed = userIdSchema.safeParse({ id: req.params.id });
    if (!parsed.success) {
      res.status(400).json({ error: "invalid request" });
      return;
    }
    const session = req.session!;
    // Prevent the admin from deactivating themselves — avoids the classic
    // 'last admin locks themselves out' footgun.
    if (parsed.data.id === session.userId) {
      res.status(400).json({ error: "cannot_deactivate_self" });
      return;
    }
    // Only let the admin act on staff accounts. Person accounts have their
    // own withdraw flow; touching them here would blur the responsibility.
    const [target] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, parsed.data.id));
    if (!target) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (target.role === "person") {
      res.status(403).json({ error: "person_accounts_not_managed_here" });
      return;
    }
    await db
      .update(users)
      .set({ status: "deactivated" })
      .where(eq(users.id, parsed.data.id));
    await deleteSessionsForUser(parsed.data.id);
    await appendAudit({
      actorId: session.userId,
      action: "admin_user_deactivate",
      targetType: "user",
      targetId: parsed.data.id,
      outcome: "allowed",
      meta: { role: target.role },
    });
    res.status(204).send();
  },
);

router.post(
  "/user/:id/reactivate",
  requireSession,
  requireAdminRole,
  requireCsrf,
  async (req: Request, res: Response) => {
    const parsed = userIdSchema.safeParse({ id: req.params.id });
    if (!parsed.success) {
      res.status(400).json({ error: "invalid request" });
      return;
    }
    const [target] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, parsed.data.id));
    if (!target || target.role === "person") {
      res.status(404).json({ error: "not_found" });
      return;
    }
    await db
      .update(users)
      .set({ status: "active" })
      .where(eq(users.id, parsed.data.id));
    await appendAudit({
      actorId: req.session!.userId,
      action: "admin_user_reactivate",
      targetType: "user",
      targetId: parsed.data.id,
      outcome: "allowed",
      meta: { role: target.role },
    });
    res.status(204).send();
  },
);

// The admin's own action feed. Only entries whose action starts with
// 'admin_' are shown — we never expose a person's entries here.
router.get(
  "/actions",
  requireSession,
  requireAdminRole,
  async (_req: Request, res: Response) => {
    const rows = await db
      .select({
        seq: auditLog.seq,
        createdAt: auditLog.createdAt,
        actorId: auditLog.actorId,
        action: auditLog.action,
        targetType: auditLog.targetType,
        targetId: auditLog.targetId,
        outcome: auditLog.outcome,
        meta: auditLog.meta,
      })
      .from(auditLog)
      .where(and(sql`${auditLog.action} like 'admin_%'`))
      .orderBy(desc(auditLog.seq))
      .limit(200);
    res.json({ actions: rows });
  },
);

// A simple read-only count of invites + staff + sessions. Useful header
// stats for /admin.
router.get(
  "/stats",
  requireSession,
  requireAdminRole,
  async (_req: Request, res: Response) => {
    const [staffCount] = await db
      .select({ n: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.role} <> 'person'`);
    const [activeStaff] = await db
      .select({ n: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.role} <> 'person' and ${users.status} = 'active'`);
    const [pendingInvites] = await db
      .select({ n: sql<number>`count(*)` })
      .from(adminInvites)
      .where(
        sql`${adminInvites.consumedAt} is null and ${adminInvites.revokedAt} is null and ${adminInvites.expiresAt} > now()`,
      );
    res.json({
      staffCount: Number(staffCount.n),
      activeStaff: Number(activeStaff.n),
      pendingInvites: Number(pendingInvites.n),
    });
  },
);

export default router;

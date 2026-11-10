import { Router, type Request, type Response } from "express";
import { and, desc, eq, or } from "drizzle-orm";
import { requireSession } from "../middleware/requireSession";
import { requirePersonRole } from "../middleware/requirePersonRole";
import { db } from "../db/client";
import { auditLog } from "../db/schema";

const router: Router = Router();

// A person sees every audit entry they were the actor of, plus every entry
// where they were the target of a user-type access. They never see other
// users' actions on other users.
router.get("/access-log", requireSession, requirePersonRole, async (req: Request, res: Response) => {
  const userId = req.session!.userId;
  const rows = await db
    .select({
      seq: auditLog.seq,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      purpose: auditLog.purpose,
      outcome: auditLog.outcome,
      actorId: auditLog.actorId,
      createdAt: auditLog.createdAt,
      meta: auditLog.meta,
    })
    .from(auditLog)
    .where(
      or(eq(auditLog.actorId, userId), and(eq(auditLog.targetType, "user"), eq(auditLog.targetId, userId))),
    )
    .orderBy(desc(auditLog.seq));

  res.json({
    entries: rows.map((r) => ({
      seq: r.seq,
      action: r.action,
      outcome: r.outcome,
      purpose: r.purpose,
      youWere: r.actorId === userId ? "actor" : "target",
      targetType: r.targetType,
      targetId: r.targetId,
      createdAt: r.createdAt,
      meta: r.meta,
    })),
  });
});

export default router;

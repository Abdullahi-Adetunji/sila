import { Router, type Request, type Response } from "express";
import { requireSession } from "../middleware/requireSession";
import { canCounsellorRead } from "../lib/policy";
import { readResults } from "../services/vault";
import { appendAudit } from "../lib/audit";
import { db } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { counsellorQueue } from "../services/queue";

const router: Router = Router();

router.get("/queue", requireSession, async (req: Request, res: Response) => {
  const actorId = req.session!.userId;
  const [actor] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, actorId));
  if (!actor || actor.role !== "counsellor") {
    await appendAudit({
      actorId,
      action: "read_counsellor_queue",
      outcome: "denied",
      meta: { reason: "not_counsellor" },
    });
    res.status(403).json({ error: "forbidden", reason: "not_counsellor" });
    return;
  }
  const items = await counsellorQueue(actorId);
  await appendAudit({
    actorId,
    action: "read_counsellor_queue",
    outcome: "allowed",
    meta: { items: items.length },
  });
  res.json({ queue: items });
});

// A counsellor viewing a person's result. Denied without an active
// counsellor_access consent naming this counsellor.
router.get(
  "/case/:personId/result",
  requireSession,
  async (req: Request, res: Response) => {
    const actorId = req.session!.userId;
    const personId = String(req.params.personId);

    const [actor] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, actorId));
    if (!actor || actor.role !== "counsellor") {
      await appendAudit({
        actorId,
        action: "read_person_result_as_counsellor",
        targetType: "user",
        targetId: personId,
        purpose: "counsellor_access",
        outcome: "denied",
        meta: { reason: "not_counsellor" },
      });
      res.status(403).json({ error: "forbidden", reason: "not_counsellor" });
      return;
    }

    const decision = await canCounsellorRead(actorId, personId);
    if (decision.outcome === "denied") {
      await appendAudit({
        actorId,
        action: "read_person_result_as_counsellor",
        targetType: "user",
        targetId: personId,
        purpose: "counsellor_access",
        outcome: "denied",
        meta: { reason: decision.reason },
      });
      res.status(403).json({ error: "forbidden", reason: decision.reason });
      return;
    }

    const results = await readResults(personId);
    await appendAudit({
      actorId,
      action: "read_person_result_as_counsellor",
      targetType: "user",
      targetId: personId,
      purpose: "counsellor_access",
      outcome: "allowed",
      meta: { hasResult: results !== null },
    });
    if (!results) {
      res.status(404).json({ error: "no_result_on_file" });
      return;
    }
    res.json({ results });
  },
);

export default router;

import { Router, type Request, type Response } from "express";
import { eq, like } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "../middleware/requireSession";
import { requireCsrf } from "../middleware/requireCsrf";
import { advance, allOffsets, now, offsetFor } from "../lib/clock";
import { db } from "../db/client";
import { users } from "../db/schema";
import { appendAudit } from "../lib/audit";

const router: Router = Router();

function devEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";
}

// The dev clock is only usable by evaluator or @demo.sila accounts. Everyone
// else is 403 even if they are signed in. Anonymous is 401.
async function requireDemoOrEvaluator(
  req: Request,
  res: Response,
): Promise<{ id: string; email: string; role: string } | null> {
  const actorId = req.session!.userId;
  const [row] = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, actorId));
  if (!row) {
    res.status(401).json({ error: "not authenticated" });
    return null;
  }
  const isDemo = row.email.endsWith("@demo.sila");
  const isEvaluator = row.role === "evaluator";
  if (!isDemo && !isEvaluator) {
    await appendAudit({
      actorId,
      action: "dev_clock_access",
      outcome: "denied",
      meta: { reason: "not_demo_or_evaluator" },
    });
    res.status(403).json({ error: "forbidden", reason: "not_demo_or_evaluator" });
    return null;
  }
  return row;
}

async function demoUserIds(): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, "%@demo.sila"));
  return rows.map((r) => r.id);
}

router.get("/clock", requireSession, async (req: Request, res: Response) => {
  if (!devEnabled()) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const actor = await requireDemoOrEvaluator(req, res);
  if (!actor) return;
  res.json({
    now: now().toISOString(),
    yourOffsetMs: offsetFor(actor.id),
    offsets: allOffsets(),
  });
});

const advanceSchema = z.object({ ms: z.number().int().min(0).max(1000 * 60 * 60 * 24 * 365) });

router.post("/clock/advance", requireSession, requireCsrf, async (req: Request, res: Response) => {
  if (!devEnabled()) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const actor = await requireDemoOrEvaluator(req, res);
  if (!actor) return;
  const parsed = advanceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid ms" });
    return;
  }
  // The advance applies only to demo users. It cannot touch any other row.
  const scope = await demoUserIds();
  const shifted = advance(parsed.data.ms, scope);
  await appendAudit({
    actorId: actor.id,
    action: "dev_clock_advance",
    outcome: "allowed",
    meta: { ms: parsed.data.ms, shiftedCount: shifted.length },
  });
  res.json({
    now: now().toISOString(),
    yourOffsetMs: offsetFor(actor.id),
    shiftedCount: shifted.length,
  });
});

export default router;

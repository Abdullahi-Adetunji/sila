import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { requireSession } from "../middleware/requireSession";
import { db } from "../db/client";
import { users } from "../db/schema";
import { appendAudit } from "../lib/audit";
import {
  clinicianAccuracy,
  comprehensionByCell,
  privacyReport,
  timeToReferralByLanguage,
  toCsv,
} from "../services/metrics";

const router: Router = Router();

async function requireEvaluator(
  req: Request,
  res: Response,
): Promise<{ id: string } | null> {
  const actorId = req.session!.userId;
  const [row] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, actorId));
  if (!row || row.role !== "evaluator") {
    await appendAudit({
      actorId,
      action: "read_evaluator_dashboard",
      outcome: "denied",
      meta: { reason: "not_evaluator" },
    });
    res.status(403).json({ error: "forbidden", reason: "not_evaluator" });
    return null;
  }
  return { id: row.id };
}

function respond<T extends object>(
  res: Response,
  req: Request,
  rows: T[],
  envelope: (rows: T[]) => Record<string, unknown>,
) {
  if (req.query.format === "csv") {
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.send(toCsv(rows as unknown as Array<Record<string, unknown>>));
    return;
  }
  res.json(envelope(rows));
}

router.get("/clinician-accuracy", requireSession, async (req: Request, res: Response) => {
  if (!(await requireEvaluator(req, res))) return;
  const acc = await clinicianAccuracy();
  if (req.query.format === "csv") {
    const rows =
      acc.status === "ready" && acc.mismatches
        ? acc.mismatches.map((m) => ({ ...m }))
        : [];
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.send(toCsv(rows));
    return;
  }
  res.json(acc);
});

router.get("/privacy", requireSession, async (req: Request, res: Response) => {
  if (!(await requireEvaluator(req, res))) return;
  const rep = privacyReport();
  if (req.query.format === "csv") {
    const rows = rep.files ?? [];
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.send(
      toCsv(
        rows.map((r) => ({
          file: r.file,
          pass: r.counts.pass ?? 0,
          fail: r.counts.fail ?? 0,
        })),
      ),
    );
    return;
  }
  res.json(rep);
});

router.get("/comprehension", requireSession, async (req: Request, res: Response) => {
  if (!(await requireEvaluator(req, res))) return;
  const cells = await comprehensionByCell();
  respond(res, req, cells, (rows) => ({ cells: rows, minGroup: 5 }));
});

router.get("/time-to-referral", requireSession, async (req: Request, res: Response) => {
  if (!(await requireEvaluator(req, res))) return;
  const cells = await timeToReferralByLanguage();
  respond(res, req, cells, (rows) => ({ cells: rows, minGroup: 5 }));
});

export default router;

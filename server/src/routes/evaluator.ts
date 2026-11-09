import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { requireSession } from "../middleware/requireSession";
import { db } from "../db/client";
import { users } from "../db/schema";
import { appendAudit } from "../lib/audit";
import {
  attackReport,
  clinicianAccuracy,
  comprehensionByLanguage,
  comprehensionByReadingBand,
  privacyReport,
  toCsv,
  ttrByLanguage,
  ttrByReadingBand,
} from "../services/metrics";

const router: Router = Router();

async function requireEvaluator(req: Request, res: Response): Promise<{ id: string } | null> {
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

function respondCells<T extends object>(res: Response, req: Request, rows: T[]) {
  if (req.query.format === "csv") {
    res.setHeader("content-type", "text/csv; charset=utf-8");
    // We never include a total row that would let an evaluator work out a
    // hidden cell by subtraction. CSV is just the n >= 5 rows in order.
    res.send(toCsv(rows as unknown as Array<Record<string, unknown>>));
    return;
  }
  // Same for JSON: no total, no grandN; just the visible cells.
  res.json({ cells: rows, minGroup: 5 });
}

router.get("/clinician-accuracy", requireSession, async (req: Request, res: Response) => {
  if (!(await requireEvaluator(req, res))) return;
  const acc = await clinicianAccuracy();
  if (req.query.format === "csv") {
    const rows = acc.status === "ready" && acc.mismatches ? acc.mismatches.map((m) => ({ ...m })) : [];
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
        rows.map((r) => ({ file: r.file, pass: r.counts.pass ?? 0, fail: r.counts.fail ?? 0 })),
      ),
    );
    return;
  }
  res.json(rep);
});

router.get("/attack", requireSession, async (req: Request, res: Response) => {
  if (!(await requireEvaluator(req, res))) return;
  const rep = attackReport();
  if (req.query.format === "csv") {
    const rows = rep.findings ?? [];
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.send(
      toCsv(
        rows.map((f) => ({ name: f.name, passed: f.passed ? "Y" : "N", detail: f.detail ?? "" })),
      ),
    );
    return;
  }
  res.json(rep);
});

// Two single-axis tables (not crossed). Each cell obeys n >= 5. No totals.
router.get("/comprehension/by-language", requireSession, async (req: Request, res: Response) => {
  if (!(await requireEvaluator(req, res))) return;
  respondCells(res, req, await comprehensionByLanguage());
});

router.get(
  "/comprehension/by-reading-band",
  requireSession,
  async (req: Request, res: Response) => {
    if (!(await requireEvaluator(req, res))) return;
    respondCells(res, req, await comprehensionByReadingBand());
  },
);

router.get("/time-to-referral/by-language", requireSession, async (req: Request, res: Response) => {
  if (!(await requireEvaluator(req, res))) return;
  respondCells(res, req, await ttrByLanguage());
});

router.get(
  "/time-to-referral/by-reading-band",
  requireSession,
  async (req: Request, res: Response) => {
    if (!(await requireEvaluator(req, res))) return;
    respondCells(res, req, await ttrByReadingBand());
  },
);

export default router;

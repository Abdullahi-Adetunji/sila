// /api/lab — submit a carrier result into a person's vault.
//
// Lab accounts can:
//   - POST /api/lab/submit {silaId, results}: write results to the vault.
//     A correction replaces the previous ciphertext row; the audit log
//     preserves the chain of submissions (one allowed-write per attempt,
//     plus an allowed-replace flag on the second).
//
// Lab accounts CANNOT read any result back. There is no GET here.

import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireSession } from "../middleware/requireSession";
import { requireLabRole } from "../middleware/requireLabRole";
import { requireCsrf } from "../middleware/requireCsrf";
import { PANEL } from "../../../src/lib/genetics/panel";
import type { GeneResult } from "../../../src/lib/genetics/engine";
import { readResults, storeResults, type ResultsByGene } from "../services/vault";
import { userIdFromSilaId } from "../lib/silaId";
import { appendAudit } from "../lib/audit";
import { db } from "../db/client";
import { users } from "../db/schema";

const router: Router = Router();

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `lab-submit:${req.session?.userId ?? "anon"}`,
});

// Build a zod schema from PANEL so we can't accept a gene or allele the
// panel doesn't recognise. Changing panel.ts implicitly changes what the
// lab can submit — no duplicate declaration here.
const panelGenes = PANEL.map((g) => g.gene);
const panelAlleles = new Set<string>();
for (const g of PANEL) for (const a of g.alleles) panelAlleles.add(a.id);

const geneResultSchema = z.union([
  z.object({ status: z.literal("not_tested") }),
  z.object({ status: z.literal("uncertain") }),
  z.object({
    status: z.literal("tested"),
    variants: z
      .array(z.string().refine((v) => panelAlleles.has(v), "unknown variant"))
      .max(2),
  }),
]);

const submitSchema = z.object({
  silaId: z.string().min(1).max(32),
  results: z.record(z.string(), geneResultSchema),
});

function isValidResults(results: Record<string, GeneResult>): boolean {
  // Every result key must name a gene in the panel. Missing genes default
  // to not_tested so the lab doesn't have to send every gene.
  for (const k of Object.keys(results)) {
    if (!panelGenes.includes(k)) return false;
  }
  return true;
}

function completeResults(partial: Record<string, GeneResult>): ResultsByGene {
  const full: ResultsByGene = {};
  for (const g of panelGenes) {
    full[g] = partial[g] ?? { status: "not_tested" };
  }
  return full;
}

router.post(
  "/submit",
  requireSession,
  requireLabRole,
  requireCsrf,
  submitLimiter,
  async (req: Request, res: Response) => {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid request" });
      return;
    }
    if (!isValidResults(parsed.data.results)) {
      res.status(400).json({ error: "unknown_gene" });
      return;
    }

    const labId = req.session!.userId;
    const personId = await userIdFromSilaId(parsed.data.silaId);
    if (!personId) {
      // Don't leak whether a Sila ID exists; always 404 on unknown.
      await appendAudit({
        actorId: labId,
        action: "lab_submit",
        outcome: "denied",
        targetType: null,
        targetId: null,
        meta: { reason: "sila_id_not_resolved" },
      });
      res.status(404).json({ error: "sila_id_not_found" });
      return;
    }

    // Demo-mode constraint: the demo lab (lab@demo.sila) can only submit
    // to a person who has no existing result. Real lab accounts are not
    // constrained here; that's enforced per deployment policy.
    if (process.env.DEMO_MODE === "true") {
      const [labRow] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, labId));
      const labEmail = labRow?.email;
      if (labEmail === "lab@demo.sila") {
        const existing = await readResults(personId);
        if (existing !== null) {
          await appendAudit({
            actorId: labId,
            action: "lab_submit",
            targetType: "user",
            targetId: personId,
            outcome: "denied",
            meta: { reason: "demo_lab_only_fresh_submissions" },
          });
          res.status(409).json({ error: "existing_result" });
          return;
        }
      }
    }

    const full = completeResults(parsed.data.results);
    const hadExisting = (await readResults(personId)) !== null;
    try {
      const { id } = await storeResults(personId, labId, full);
      await appendAudit({
        actorId: labId,
        action: "lab_submit",
        targetType: "user",
        targetId: personId,
        outcome: "allowed",
        meta: { recordId: id, replaced: hadExisting },
      });
      res.status(201).json({ id, replaced: hadExisting });
    } catch (err) {
      await appendAudit({
        actorId: labId,
        action: "lab_submit",
        targetType: "user",
        targetId: personId,
        outcome: "denied",
        meta: { reason: "server_error" },
      });
      throw err;
    }
  },
);

export default router;

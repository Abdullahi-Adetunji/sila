import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
  complete,
  consent as consentVolunteer,
  getByCode,
  joinVolunteer,
  withdraw,
  type Volunteer,
} from "../services/volunteer";
import { isValidParticipantCode } from "../lib/participantCode";
import {
  formFor,
  itemsForPhase,
  recordResponse,
  responsesFor,
  syntheticCoupleView,
} from "../services/quiz";
import { recordTtrEvent } from "../services/ttr";

const router: Router = Router();

const joinSchema = z.object({
  language: z.enum(["en", "ar"]),
  readingBand: z.enum(["low", "medium", "high", "unknown"]).default("unknown"),
});

function publicView(v: Volunteer) {
  return {
    id: v.id,
    language: v.language,
    readingBand: v.readingBand,
    formOrder: v.formOrder,
    coupleId: v.coupleId,
    consentedAt: v.consentedAt,
    completedAt: v.completedAt,
  };
}

async function fromHeader(req: Request): Promise<Volunteer | null> {
  const raw = req.header("x-volunteer-code");
  if (!raw || !isValidParticipantCode(raw)) return null;
  return getByCode(raw);
}

router.post("/join", async (req: Request, res: Response) => {
  const parsed = joinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request" });
    return;
  }
  const v = await joinVolunteer(parsed.data);
  res.status(201).json({ volunteer: publicView(v) });
});

router.get("/me", async (req: Request, res: Response) => {
  const v = await fromHeader(req);
  if (!v) {
    res.status(401).json({ error: "unknown or withdrawn code" });
    return;
  }
  res.json({ volunteer: publicView(v) });
});

router.post("/consent", async (req: Request, res: Response) => {
  const v = await fromHeader(req);
  if (!v) {
    res.status(401).json({ error: "unknown or withdrawn code" });
    return;
  }
  const after = await consentVolunteer(v.id);
  if (!after) {
    res.status(500).json({ error: "could not record consent" });
    return;
  }
  res.json({ volunteer: publicView(after) });
});

router.post("/complete", async (req: Request, res: Response) => {
  const v = await fromHeader(req);
  if (!v) {
    res.status(401).json({ error: "unknown or withdrawn code" });
    return;
  }
  const after = await complete(v.id);
  res.json({ volunteer: after ? publicView(after) : null });
});

router.post("/withdraw", async (req: Request, res: Response) => {
  const v = await fromHeader(req);
  if (!v) {
    res.status(401).json({ error: "unknown or withdrawn code" });
    return;
  }
  const ok = await withdraw(v.id);
  res.json({ withdrawn: ok });
});

const phaseSchema = z.object({ phase: z.enum(["before", "after"]) });

router.get("/quiz", async (req: Request, res: Response) => {
  const v = await fromHeader(req);
  if (!v) {
    res.status(401).json({ error: "unknown or withdrawn code" });
    return;
  }
  const parsed = phaseSchema.safeParse({ phase: req.query.phase });
  if (!parsed.success) {
    res.status(400).json({ error: "invalid phase" });
    return;
  }
  if (!v.consentedAt) {
    res.status(403).json({ error: "consent_required" });
    return;
  }
  const items = itemsForPhase(v, parsed.data.phase);
  res.json({ phase: parsed.data.phase, items });
});

const responseSchema = z.object({
  phase: z.enum(["before", "after"]),
  itemId: z.string().min(1).max(200),
  answer: z.number().int().min(0).max(10),
});

router.post("/quiz/response", async (req: Request, res: Response) => {
  const v = await fromHeader(req);
  if (!v) {
    res.status(401).json({ error: "unknown or withdrawn code" });
    return;
  }
  if (!v.consentedAt) {
    res.status(403).json({ error: "consent_required" });
    return;
  }
  const parsed = responseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request" });
    return;
  }
  const form = formFor(v, parsed.data.phase);
  await recordResponse({
    volunteerId: v.id,
    phase: parsed.data.phase,
    itemId: parsed.data.itemId,
    answer: parsed.data.answer,
    form,
    language: v.language,
  });
  // The scoring of individual answers is never returned to the client;
  // we only acknowledge the write. Aggregates come from the evaluator role.
  res.status(204).send();
});

router.get("/quiz/progress", async (req: Request, res: Response) => {
  const v = await fromHeader(req);
  if (!v) {
    res.status(401).json({ error: "unknown or withdrawn code" });
    return;
  }
  const [before, after] = await Promise.all([responsesFor(v.id, "before"), responsesFor(v.id, "after")]);
  res.json({ beforeAnswered: before.length, afterAnswered: after.length });
});

const ttrSchema = z.object({
  kind: z.enum(["opened_result", "opened_referral_form", "submitted_referral"]),
});

router.post("/ttr", async (req: Request, res: Response) => {
  const v = await fromHeader(req);
  if (!v) {
    res.status(401).json({ error: "unknown or withdrawn code" });
    return;
  }
  if (!v.consentedAt) {
    res.status(403).json({ error: "consent_required" });
    return;
  }
  const parsed = ttrSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request" });
    return;
  }
  await recordTtrEvent(v.id, parsed.data.kind);
  res.status(204).send();
});

router.get("/couple-view", async (req: Request, res: Response) => {
  const v = await fromHeader(req);
  if (!v) {
    res.status(401).json({ error: "unknown or withdrawn code" });
    return;
  }
  if (!v.consentedAt) {
    res.status(403).json({ error: "consent_required" });
    return;
  }
  const view = syntheticCoupleView(v.coupleId);
  if (!view) {
    res.status(404).json({ error: "couple_not_found" });
    return;
  }
  // Collapse engine reasons to couple-level labels, matching the main
  // couple-risk service. The volunteer screen never shows per-person info.
  const reasons = new Set<string>();
  for (const r of view.reasons) {
    if (r === "shared_risk_serious") reasons.add("shared_risk_serious");
    else if (r === "shared_risk") reasons.add("shared_risk");
    else if (r === "uncertain_result" || r === "partner_needs_testing") reasons.add("incomplete");
    else if (r === "person_affected") reasons.add("needs_review");
  }
  res.json({
    route: view.route,
    reasons: [...reasons],
    genes: view.genes.map((g) => ({
      gene: g.gene,
      computable: g.computable,
      outcomes: g.outcomes,
      affectedQuarters: g.affectedQuarters,
      status:
        g.reason === "uncertain_result"
          ? "uncertain"
          : g.reason === "partner_needs_testing"
            ? "incomplete"
            : "ready",
    })),
  });
});

export default router;

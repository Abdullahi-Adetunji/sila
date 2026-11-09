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

export default router;

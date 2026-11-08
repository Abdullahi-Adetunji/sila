import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { advance, currentOffsetMs, now } from "../lib/clock";

const router: Router = Router();

function devEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";
}

router.get("/clock", (_req: Request, res: Response) => {
  if (!devEnabled()) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json({ now: now().toISOString(), offsetMs: currentOffsetMs() });
});

const advanceSchema = z.object({ ms: z.number().int().min(0).max(1000 * 60 * 60 * 24 * 365) });

router.post("/clock/advance", (req: Request, res: Response) => {
  if (!devEnabled()) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const parsed = advanceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid ms" });
    return;
  }
  advance(parsed.data.ms);
  res.json({ now: now().toISOString(), offsetMs: currentOffsetMs() });
});

export default router;

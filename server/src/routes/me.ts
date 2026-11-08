import { Router, type Request, type Response } from "express";
import { requireSession } from "../middleware/requireSession";
import { readResults } from "../services/vault";
import { appendAudit } from "../lib/audit";

const router: Router = Router();

router.get("/result", requireSession, async (req: Request, res: Response) => {
  const userId = req.session!.userId;
  const results = await readResults(userId);
  await appendAudit({
    actorId: userId,
    action: "read_own_result",
    targetType: "user",
    targetId: userId,
    outcome: "allowed",
    meta: { hasResult: results !== null },
  });
  if (!results) {
    res.status(404).json({ error: "no result on file" });
    return;
  }
  res.json({ results });
});

export default router;

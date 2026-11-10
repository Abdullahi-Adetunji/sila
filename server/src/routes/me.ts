import { Router, type Request, type Response } from "express";
import { requireSession } from "../middleware/requireSession";
import { requirePersonRole } from "../middleware/requirePersonRole";
import { readResults } from "../services/vault";
import { appendAudit } from "../lib/audit";
import { silaIdFor } from "../lib/silaId";

const router: Router = Router();

// Per-person stable identifier, derived from HMAC(user.id, SILA_ID_SALT).
// Shown to the person; they hand it to the lab or clinic when tested.
router.get("/sila-id", requireSession, requirePersonRole, (req: Request, res: Response) => {
  res.json({ silaId: silaIdFor(req.session!.userId) });
});

router.get("/result", requireSession, requirePersonRole, async (req: Request, res: Response) => {
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

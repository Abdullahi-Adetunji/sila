import { Router, type Request, type Response } from "express";
import { requireSession } from "../middleware/requireSession";
import { canReadCoupleRisk } from "../lib/policy";
import { getActiveLinkFor, partnerOf } from "../services/partnerLink";
import { computeCoupleView } from "../services/coupleRisk";

const router: Router = Router();

router.get("/risk", requireSession, async (req: Request, res: Response) => {
  const actorId = req.session!.userId;
  const link = await getActiveLinkFor(actorId);
  const partnerId = link ? partnerOf(link, actorId) : null;
  if (!partnerId) {
    res.status(404).json({ error: "no_active_partner_link" });
    return;
  }
  const decision = await canReadCoupleRisk(actorId, partnerId);
  if (decision.outcome === "denied") {
    res.status(403).json({ error: "forbidden", reason: decision.reason });
    return;
  }
  const view = await computeCoupleView(actorId, partnerId);
  if (!view) {
    res.status(404).json({ error: "awaiting_results" });
    return;
  }
  res.json({ view });
});

export default router;

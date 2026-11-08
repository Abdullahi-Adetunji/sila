import { Router, type Request, type Response } from "express";
import { requireSession } from "../middleware/requireSession";
import { readResults } from "../services/vault";

const router: Router = Router();

router.get("/result", requireSession, async (req: Request, res: Response) => {
  const results = await readResults(req.session!.userId);
  if (!results) {
    res.status(404).json({ error: "no result on file" });
    return;
  }
  res.json({ results });
});

export default router;

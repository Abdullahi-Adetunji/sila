import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireSession } from "../middleware/requireSession";
import { requireCsrf } from "../middleware/requireCsrf";
import {
  addRelative,
  getRelative,
  listRelatives,
  removeRelative,
} from "../services/relatives";
import { appendAudit } from "../lib/audit";

const router: Router = Router();

const addSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
});

router.get("/", requireSession, async (req: Request, res: Response) => {
  const rows = await listRelatives(req.session!.userId);
  res.json({
    relatives: rows.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      createdAt: r.createdAt,
    })),
  });
});

router.post("/", requireSession, requireCsrf, async (req: Request, res: Response) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request" });
    return;
  }
  const relative = await addRelative(req.session!.userId, parsed.data.displayName);
  await appendAudit({
    actorId: req.session!.userId,
    action: "add_relative",
    targetType: "relative",
    targetId: relative.id,
    outcome: "allowed",
  });
  res.status(201).json({ relative: { id: relative.id, displayName: relative.displayName } });
});

router.delete("/:id", requireSession, requireCsrf, async (req: Request, res: Response) => {
  const relativeId = String(req.params.id);
  const relative = await getRelative(req.session!.userId, relativeId);
  if (!relative) {
    res.status(404).json({ error: "not found" });
    return;
  }
  await removeRelative(req.session!.userId, relativeId);
  await appendAudit({
    actorId: req.session!.userId,
    action: "remove_relative",
    targetType: "relative",
    targetId: relativeId,
    outcome: "allowed",
  });
  res.status(204).send();
});

export default router;

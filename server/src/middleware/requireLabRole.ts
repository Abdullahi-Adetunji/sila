import type { NextFunction, Request, Response } from "express";
import { appendAudit } from "../lib/audit";

// Gates /api/lab/* endpoints. Returns 403 (audit-logged) for anyone whose
// session role isn't 'lab'. requireSession runs first.
export async function requireLabRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const session = req.session;
  if (!session) {
    res.status(401).json({ error: "not authenticated" });
    return;
  }
  if (session.role !== "lab") {
    await appendAudit({
      actorId: session.userId,
      action: "lab_endpoint_access",
      outcome: "denied",
      targetType: null,
      targetId: null,
      meta: { role: session.role, path: req.path, method: req.method },
    });
    res.status(403).json({ error: "lab account required" });
    return;
  }
  next();
}

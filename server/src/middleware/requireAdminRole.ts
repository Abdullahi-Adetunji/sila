import type { NextFunction, Request, Response } from "express";
import { appendAudit } from "../lib/audit";

// Gate the /api/admin/* endpoints. Returns 403 (and audit-logs the
// denial) if the signed-in user is anything other than role=admin, or if
// their account has been deactivated. requireSession must run first.
export async function requireAdminRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const session = req.session;
  if (!session) {
    res.status(401).json({ error: "not authenticated" });
    return;
  }
  if (session.role !== "admin") {
    await appendAudit({
      actorId: session.userId,
      action: "admin_endpoint_access",
      outcome: "denied",
      targetType: null,
      targetId: null,
      meta: { role: session.role, path: req.path, method: req.method },
    });
    res.status(403).json({ error: "admin account required" });
    return;
  }
  next();
}

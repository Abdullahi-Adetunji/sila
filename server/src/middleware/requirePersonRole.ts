import type { NextFunction, Request, Response } from "express";
import { appendAudit } from "../lib/audit";

// Gate every person-only endpoint (/api/me, /api/consent, /api/couple,
// /api/partner, /api/relatives, /api/referrals) so a signed-in staff
// account (counsellor, lab, evaluator, admin) can't call them. Returns 403
// and writes a denied-by-role row to the audit log, so any such attempt is
// visible to a reviewer and to the person on their own access log if one
// of their endpoints was the target.
//
// requireSession must run before this.
export async function requirePersonRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const session = req.session;
  if (!session) {
    res.status(401).json({ error: "not authenticated" });
    return;
  }
  if (session.role !== "person") {
    await appendAudit({
      actorId: session.userId,
      action: "person_endpoint_access",
      outcome: "denied",
      targetType: null,
      targetId: null,
      meta: { role: session.role, path: req.path, method: req.method },
    });
    res.status(403).json({ error: "person account required" });
    return;
  }
  next();
}

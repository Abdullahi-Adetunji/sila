import type { NextFunction, Request, Response } from "express";
import { csrfOk } from "../lib/csrf";

export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  const session = req.session;
  if (!session) {
    res.status(401).json({ error: "not authenticated" });
    return;
  }
  const header = req.get("x-csrf-token");
  if (!csrfOk(session.csrfToken, header)) {
    res.status(403).json({ error: "bad csrf" });
    return;
  }
  next();
}

import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE, resolveSession, type SessionInfo } from "../lib/session";

declare module "express-serve-static-core" {
  interface Request {
    session?: SessionInfo;
  }
}

export async function requireSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const session = await resolveSession(id);
  if (!session) {
    res.status(401).json({ error: "not authenticated" });
    return;
  }
  req.session = session;
  next();
}

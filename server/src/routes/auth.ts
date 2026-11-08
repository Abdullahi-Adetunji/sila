import { Router, type Request, type Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { sql, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { users } from "../db/schema";
import { hashPassword, verifyPassword } from "../lib/password";
import { SESSION_COOKIE, SESSION_TTL_MS, createSession, deleteSession } from "../lib/session";
import { requireSession } from "../middleware/requireSession";

const router: Router = Router();

const signupSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(1024),
  locale: z.enum(["en", "ar"]).default("en"),
});

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(1024),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = (req.body as { email?: unknown } | undefined)?.email;
    const emailKey = typeof email === "string" ? email.toLowerCase() : "";
    const ipKey = ipKeyGenerator(req.ip ?? "");
    return `${ipKey}:${emailKey}`;
  },
});

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  };
}

router.post("/signup", async (req: Request, res: Response) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request" });
    return;
  }
  const { email, password, locale } = parsed.data;
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`);
  if (existing.length > 0) {
    res.status(409).json({ error: "email already registered" });
    return;
  }
  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(users)
    .values({ email, passwordHash, locale })
    .returning({ id: users.id, email: users.email, role: users.role, locale: users.locale });
  const session = await createSession(created.id);
  res
    .cookie(SESSION_COOKIE, session.id, sessionCookieOptions())
    .status(201)
    .json({ user: created, csrfToken: session.csrfToken });
});

router.post("/login", loginLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request" });
    return;
  }
  const { email, password } = parsed.data;
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      locale: users.locale,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`);
  const row = rows[0];
  const ok = row ? await verifyPassword(row.passwordHash, password) : false;
  if (!ok || !row) {
    res.status(401).json({ error: "invalid email or password" });
    return;
  }
  const session = await createSession(row.id);
  res
    .cookie(SESSION_COOKIE, session.id, sessionCookieOptions())
    .json({
      user: { id: row.id, email: row.email, role: row.role, locale: row.locale },
      csrfToken: session.csrfToken,
    });
});

router.post("/logout", requireSession, async (req: Request, res: Response) => {
  await deleteSession(req.session!.id);
  res.clearCookie(SESSION_COOKIE, { path: "/" }).status(204).send();
});

router.get("/me", requireSession, async (req: Request, res: Response) => {
  const rows = await db
    .select({ id: users.id, email: users.email, role: users.role, locale: users.locale })
    .from(users)
    .where(eq(users.id, req.session!.userId));
  const user = rows[0];
  if (!user) {
    res.status(401).json({ error: "not authenticated" });
    return;
  }
  res.json({ user, csrfToken: req.session!.csrfToken });
});

export default router;

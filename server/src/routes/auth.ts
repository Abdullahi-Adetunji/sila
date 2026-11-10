import { Router, type Request, type Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { sql, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { adminTotp, users } from "../db/schema";
import { totpVerify } from "../lib/totp";
import { hashPassword, needsRehash, verifyPassword } from "../lib/password";
import { checkPasswordStrength } from "../lib/weakPassword";
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
  // Optional. Only required when the account is staff and has enrolled a
  // TOTP second factor. The client calls login once with just email +
  // password; if the response is `totp_required`, it re-calls with the
  // code.
  totpCode: z.string().regex(/^\d{6}$/).optional(),
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
  const strength = checkPasswordStrength(password, email);
  if (!strength.ok) {
    res.status(400).json({ error: strength.reason });
    return;
  }
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
  const { email, password, totpCode } = parsed.data;
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      status: users.status,
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
  // Deactivated accounts cannot log in.
  if (row.status === "deactivated") {
    res.status(403).json({ error: "account_deactivated" });
    return;
  }
  // Staff accounts MUST have a second factor enrolled to log in via this
  // endpoint. "Required once enrolled" would let a staff account whose
  // admin_totp row is missing (dropped migration, cleanup script, DB
  // restore from before TOTP was mandatory, etc.) slip past the check,
  // so we fail closed: if the staff account has no TOTP row, refuse the
  // login with 403 'totp_not_enrolled'.
  //
  // The demo admin (admin@demo.sila) is explicitly allowed to log in
  // without TOTP via /api/demo/login, which is a separate endpoint that
  // is 404 outside DEMO_MODE. This endpoint (/api/auth/login) applies
  // the strict rule to every staff account including the demo ones.
  if (row.role !== "person") {
    const [totpRow] = await db
      .select({ secret: adminTotp.secret })
      .from(adminTotp)
      .where(eq(adminTotp.userId, row.id));
    if (!totpRow) {
      res.status(403).json({ error: "totp_not_enrolled" });
      return;
    }
    if (!totpCode) {
      res.status(401).json({ error: "totp_required" });
      return;
    }
    if (!totpVerify(totpRow.secret, totpCode)) {
      res.status(401).json({ error: "invalid_totp" });
      return;
    }
  }
  // Transparent rehash on login when the stored hash uses parameters that
  // differ from the current ARGON2_OPTIONS. Failure to update is tolerated:
  // the login itself succeeded, and the next login will try again.
  if (await needsRehash(row.passwordHash)) {
    try {
      const upgraded = await hashPassword(password);
      await db.update(users).set({ passwordHash: upgraded }).where(eq(users.id, row.id));
    } catch (e) {
      console.error("password rehash failed", e);
    }
  }
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, row.id));
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

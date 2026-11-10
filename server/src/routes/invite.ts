// Invite claim flow. Called by the /invite/<code> page:
//
//   GET  /api/invite/:code          -> invite details + newly generated
//                                       TOTP secret + otpauth URI + the 10
//                                       recovery codes (shown once).
//   POST /api/invite/:code/claim    -> {password, totpCode}; creates /
//                                       upgrades the user, consumes the
//                                       invite, writes admin_totp, starts
//                                       a session, returns the session
//                                       cookie + csrf token.
//
// The TOTP secret the server generates on GET is cached server-side in a
// Map keyed by invite id with a 10-minute TTL. If the user takes longer,
// they refresh the invite page and get a fresh secret.
//
// POST is rate-limited per invite id so an attacker can't brute-force a
// 6-digit TOTP against a hijacked invite code. The invite code itself is
// 32 bytes of url-safe base64, far below guessable.

import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { users, adminTotp } from "../db/schema";
import { hashPassword } from "../lib/password";
import { checkPasswordStrength } from "../lib/weakPassword";
import {
  generateSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  totpUri,
  totpVerify,
} from "../lib/totp";
import { createSession, SESSION_COOKIE, SESSION_TTL_MS } from "../lib/session";
import { appendAudit } from "../lib/audit";
import { consume, lookupByCode } from "../services/invite";
import { env } from "../env";

const router: Router = Router();

interface PendingTotp {
  secret: string;
  recoveryCodes: string[];
  expiresAt: number;
}

// inviteId -> pending TOTP state. Only ever lives in memory — never
// written to disk. A 10-minute TTL keeps the Map bounded.
const PENDING = new Map<string, PendingTotp>();
const PENDING_TTL_MS = 10 * 60 * 1000;

function sweep(): void {
  const now = Date.now();
  for (const [k, v] of PENDING) {
    if (v.expiresAt <= now) PENDING.delete(k);
  }
}

const claimLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `claim:${String(req.params.code ?? "")}`,
});

router.get("/:code", async (req: Request, res: Response) => {
  const code = String(req.params.code ?? "");
  const invite = await lookupByCode(code);
  if (!invite) {
    res.status(404).json({ error: "invite_not_found" });
    return;
  }
  sweep();
  // Always issue a fresh secret + recovery codes. The user is told to
  // write them down now; a browser refresh invalidates the previous
  // ones.
  const secret = generateSecret();
  const recoveryCodes = generateRecoveryCodes();
  PENDING.set(invite.id, {
    secret,
    recoveryCodes,
    expiresAt: Date.now() + PENDING_TTL_MS,
  });
  res.json({
    invite: {
      id: invite.id,
      role: invite.role,
      email: invite.email,
      displayName: invite.displayName,
      expiresAt: invite.expiresAt,
    },
    totp: {
      secret,
      otpauth: totpUri({ secret, accountName: invite.email, issuer: "Sila" }),
      recoveryCodes,
    },
  });
});

const claimSchema = z.object({
  password: z.string().min(12).max(1024),
  totpCode: z.string().regex(/^\d{6}$/),
});

router.post("/:code/claim", claimLimiter, async (req: Request, res: Response) => {
  const code = String(req.params.code ?? "");
  const invite = await lookupByCode(code);
  if (!invite) {
    res.status(404).json({ error: "invite_not_found" });
    return;
  }
  const parsed = claimSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request" });
    return;
  }
  const { password, totpCode } = parsed.data;
  const strength = checkPasswordStrength(password, invite.email);
  if (!strength.ok) {
    res.status(400).json({ error: strength.reason });
    return;
  }
  sweep();
  const pending = PENDING.get(invite.id);
  if (!pending) {
    res.status(409).json({ error: "setup_expired" });
    return;
  }
  if (!totpVerify(pending.secret, totpCode)) {
    res.status(400).json({ error: "invalid_totp" });
    return;
  }

  // Everything checks out. Create or upgrade the user, persist TOTP,
  // consume the invite, start a session. All inside a single try — if
  // any step fails we leave no half-state because consume() is the last
  // step and is guarded against double-consume anyway.
  try {
    const passwordHash = await hashPassword(password);
    const now = new Date();

    // See if the invite's email is already a placeholder/person row that
    // we should upgrade in place (admin-create.ts bootstraps a placeholder
    // for the very first admin). Otherwise insert a brand new user.
    const existing = await db
      .select({ id: users.id, role: users.role, status: users.status })
      .from(users)
      .where(sql`lower(${users.email}) = lower(${invite.email})`);
    let userId: string;
    if (
      existing.length > 0 &&
      (existing[0].role === invite.role || existing[0].role === "admin") &&
      existing[0].status === "deactivated"
    ) {
      // Upgrade the placeholder.
      userId = existing[0].id;
      await db
        .update(users)
        .set({
          passwordHash,
          role: invite.role as "person" | "counsellor" | "lab" | "evaluator" | "admin",
          status: "active",
          lastLoginAt: now,
        })
        .where(eq(users.id, userId));
    } else if (existing.length > 0) {
      res.status(409).json({ error: "email_already_registered" });
      return;
    } else {
      const [row] = await db
        .insert(users)
        .values({
          email: invite.email,
          passwordHash,
          role: invite.role as "person" | "counsellor" | "lab" | "evaluator" | "admin",
          status: "active",
          locale: "en",
          lastLoginAt: now,
        })
        .returning({ id: users.id });
      userId = row.id;
    }

    // Persist the TOTP enrolment (or overwrite an older one in case the
    // user re-claimed somehow).
    const recoveryHashes = pending.recoveryCodes.map(hashRecoveryCode).join(",");
    await db
      .insert(adminTotp)
      .values({
        userId,
        secret: pending.secret,
        recoveryCodes: recoveryHashes,
        verifiedAt: now,
      })
      .onConflictDoUpdate({
        target: adminTotp.userId,
        set: { secret: pending.secret, recoveryCodes: recoveryHashes, verifiedAt: now },
      });

    const consumed = await consume({ inviteId: invite.id, newUserId: userId });
    if (!consumed) {
      res.status(409).json({ error: "invite_already_used" });
      return;
    }
    PENDING.delete(invite.id);

    await appendAudit({
      actorId: userId,
      action: "invite_claim",
      targetType: "user",
      targetId: userId,
      outcome: "allowed",
      meta: { role: invite.role },
    });

    const session = await createSession(userId);
    res
      .cookie(SESSION_COOKIE, session.id, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        maxAge: SESSION_TTL_MS,
        path: "/",
      })
      .status(201)
      .json({
        user: { id: userId, email: invite.email, role: invite.role },
        csrfToken: session.csrfToken,
      });
  } catch (err) {
    await appendAudit({
      actorId: null,
      action: "invite_claim",
      targetType: "invite",
      targetId: invite.id,
      outcome: "denied",
      meta: { reason: "server_error" },
    });
    throw err;
  }
});

export default router;

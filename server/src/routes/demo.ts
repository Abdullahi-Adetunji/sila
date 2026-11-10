import { Router, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "../middleware/requireSession";
import { requireCsrf } from "../middleware/requireCsrf";
import { db } from "../db/client";
import { partnerLinks, users } from "../db/schema";
import { verifyPassword } from "../lib/password";
import { createSession, SESSION_COOKIE, SESSION_TTL_MS } from "../lib/session";
import { appendAudit } from "../lib/audit";
import { storeResults, shredVault, type ResultsByGene } from "../services/vault";
import { grantConsent, revokeConsent } from "../services/consent";
import { acceptInvite, createInvite } from "../services/partnerLink";

const router: Router = Router();

function demoEnabled(): boolean {
  return process.env.DEMO_MODE === "true";
}

router.get("/config", (_req: Request, res: Response) => {
  res.json({ enabled: demoEnabled() });
});

const DEMO_ACCOUNTS: Record<string, string> = {
  "partner.a": "partner.a@demo.sila",
  "partner.b": "partner.b@demo.sila",
  counsellor: "counsellor@demo.sila",
  lab: "lab@demo.sila",
  admin: "admin@demo.sila",
};

const loginSchema = z.object({
  account: z.enum(["partner.a", "partner.b", "counsellor", "lab", "admin"]),
});

router.post("/login", async (req: Request, res: Response) => {
  if (!demoEnabled()) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request" });
    return;
  }
  const password = process.env.DEMO_PASSWORD;
  if (!password) {
    res.status(503).json({ error: "demo unavailable", reason: "DEMO_PASSWORD not set" });
    return;
  }
  const email = DEMO_ACCOUNTS[parsed.data.account];
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      locale: users.locale,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email));
  if (!row || !(await verifyPassword(row.passwordHash, password))) {
    res.status(401).json({ error: "demo account not seeded" });
    return;
  }
  const session = await createSession(row.id);
  await appendAudit({
    actorId: row.id,
    action: "demo_login",
    targetType: "user",
    targetId: row.id,
    outcome: "allowed",
    meta: { account: parsed.data.account },
  });
  res
    .cookie(SESSION_COOKIE, session.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_TTL_MS,
      path: "/",
    })
    .json({
      user: { id: row.id, email: row.email, role: row.role, locale: row.locale },
      csrfToken: session.csrfToken,
    });
});

const HBS_CARRIER: ResultsByGene = {
  HBB: { status: "tested", variants: ["HbS"] },
  CFTR: { status: "tested", variants: [] },
  GJB2: { status: "tested", variants: [] },
};

router.post("/reset", requireSession, requireCsrf, async (req: Request, res: Response) => {
  if (!demoEnabled()) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const actorId = req.session!.userId;
  // Only allow the three demo accounts (or a counsellor demo account) to reset.
  const [actor] = await db.select({ email: users.email }).from(users).where(eq(users.id, actorId));
  if (!actor || !Object.values(DEMO_ACCOUNTS).includes(actor.email)) {
    res.status(403).json({ error: "forbidden", reason: "not_a_demo_account" });
    return;
  }

  const look = (email: string) =>
    db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .then((rs) => rs[0]?.id ?? null);
  const [aId, bId, labId] = await Promise.all([
    look("partner.a@demo.sila"),
    look("partner.b@demo.sila"),
    look("lab@demo.sila"),
  ]);
  if (!aId || !bId || !labId) {
    res.status(503).json({ error: "demo not seeded" });
    return;
  }

  // Tear down the link + consents + results for both demo partners.
  await db.delete(partnerLinks).where(sql`inviter_id = ${aId} OR invitee_id = ${aId}`);
  await db.delete(partnerLinks).where(sql`inviter_id = ${bId} OR invitee_id = ${bId}`);
  await revokeConsent({ grantorId: aId, purpose: "couple_risk", targetUserId: bId });
  await revokeConsent({ grantorId: bId, purpose: "couple_risk", targetUserId: aId });
  await shredVault(aId);
  await shredVault(bId);

  // Re-seed: upload results, re-link, re-grant couple_risk from both sides.
  await storeResults(aId, labId, HBS_CARRIER);
  await storeResults(bId, labId, HBS_CARRIER);
  const invite = await createInvite(aId);
  await acceptInvite(invite.inviteCode, bId);
  await grantConsent({ grantorId: aId, purpose: "couple_risk", targetUserId: bId });
  await grantConsent({ grantorId: bId, purpose: "couple_risk", targetUserId: aId });

  await appendAudit({
    actorId,
    action: "demo_reset",
    targetType: null,
    targetId: null,
    outcome: "allowed",
    meta: null,
  });

  res.json({ ok: true });
});

export default router;

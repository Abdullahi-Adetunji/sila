import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { db, pool } from "../server/src/db/client";
import { users } from "../server/src/db/schema";
import { hashPassword } from "../server/src/lib/password";
import { storeResults, type ResultsByGene } from "../server/src/services/vault";
import { createInvite, acceptInvite } from "../server/src/services/partnerLink";
import { grantConsent } from "../server/src/services/consent";

function requirePassword(name: string): string {
  const v = process.env[name];
  if (!v || v.length < 12) {
    console.error(
      `${name} is not set (or is shorter than 12 characters). Set it in .env before running the seed.`,
    );
    process.exit(1);
  }
  return v;
}
const DEMO_PASSWORD = requirePassword("DEMO_PASSWORD");
const EVALUATOR_PASSWORD = requirePassword("EVALUATOR_PASSWORD");

interface CoupleFile {
  seed: number;
  couples: {
    coupleId: string;
    category: string;
    a: { id: string; results: ResultsByGene };
    b: { id: string; results: ResultsByGene };
  }[];
}

async function upsertUser(
  email: string,
  role: "person" | "counsellor" | "lab" | "evaluator" | "admin",
  locale: "en" | "ar" = "en",
): Promise<string> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing.length) return existing[0].id;
  // evaluator uses its own password; it is intentionally NOT on the demo
  // one-click panel.
  const password = role === "evaluator" ? EVALUATOR_PASSWORD : DEMO_PASSWORD;
  const passwordHash = await hashPassword(password);
  const [row] = await db
    .insert(users)
    .values({ email, passwordHash, role, locale })
    .returning({ id: users.id });
  return row.id;
}

async function main() {
  const path = resolve(process.cwd(), "data/synthetic/couples.json");
  const file = JSON.parse(readFileSync(path, "utf8")) as CoupleFile;
  console.log(`Loaded ${file.couples.length} synthetic couples (seed=${file.seed})`);

  // Single simulated lab for all uploads.
  const labId = await upsertUser("lab@demo.sila", "lab");

  let people = 0;
  for (const c of file.couples) {
    const aEmail = `${c.a.id.toLowerCase()}@demo.sila`;
    const bEmail = `${c.b.id.toLowerCase()}@demo.sila`;
    const aId = await upsertUser(aEmail, "person");
    const bId = await upsertUser(bEmail, "person");
    await storeResults(aId, labId, c.a.results);
    await storeResults(bId, labId, c.b.results);
    people += 2;
  }
  console.log(`Seeded ${people} synthetic people and uploaded their results.`);

  // Named demo accounts for the walkthrough.
  const demoA = await upsertUser("partner.a@demo.sila", "person");
  const demoB = await upsertUser("partner.b@demo.sila", "person");
  const demoCounsellor = await upsertUser("counsellor@demo.sila", "counsellor");
  const demoEvaluator = await upsertUser("evaluator@demo.sila", "evaluator");
  // Demo admin — appears in the one-click panel, uses DEMO_PASSWORD, and
  // is the ONLY admin account that bypasses TOTP (gated on DEMO_MODE).
  const demoAdmin = await upsertUser("admin@demo.sila", "admin");

  const HBS_CARRIER: ResultsByGene = {
    HBB: { status: "tested", variants: ["HbS"] },
    CFTR: { status: "tested", variants: [] },
    GJB2: { status: "tested", variants: [] },
  };
  await storeResults(demoA, labId, HBS_CARRIER);
  await storeResults(demoB, labId, HBS_CARRIER);

  // Link the demo couple and grant both couple_risk consents by default so
  // the walkthrough shows the result screen straight away. The consent
  // screen can still revoke to demo the "consent withdrawn" state.
  const invite = await createInvite(demoA);
  const link = await acceptInvite(invite.inviteCode, demoB);
  if (!link) throw new Error("failed to link demo couple");
  await grantConsent({ grantorId: demoA, purpose: "couple_risk", targetUserId: demoB });
  await grantConsent({ grantorId: demoB, purpose: "couple_risk", targetUserId: demoA });

  console.log("Demo accounts ready:");
  console.log("  partner.a@demo.sila    (password: DEMO_PASSWORD)");
  console.log("  partner.b@demo.sila    (password: DEMO_PASSWORD)");
  console.log("  counsellor@demo.sila   (password: DEMO_PASSWORD)");
  console.log("  lab@demo.sila          (password: DEMO_PASSWORD)");
  console.log("  admin@demo.sila        (password: DEMO_PASSWORD, skips TOTP in DEMO_MODE)");
  console.log("  evaluator@demo.sila    (password: EVALUATOR_PASSWORD, NOT on one-click panel)");
  console.log(`  counsellor id: ${demoCounsellor}`);
  console.log(`  evaluator id:  ${demoEvaluator}`);
  console.log(`  admin id:      ${demoAdmin}`);
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    try {
      await pool.end();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });

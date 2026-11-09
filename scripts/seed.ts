import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { db, pool } from "../server/src/db/client";
import { users } from "../server/src/db/schema";
import { hashPassword } from "../server/src/lib/password";
import { storeResults, type ResultsByGene } from "../server/src/services/vault";
import { createInvite, acceptInvite } from "../server/src/services/partnerLink";
import { grantConsent } from "../server/src/services/consent";

function requireDemoPassword(): string {
  const v = process.env.DEMO_PASSWORD;
  if (!v || v.length < 12) {
    console.error(
      "DEMO_PASSWORD is not set (or is shorter than 12 characters). Set it in .env before running the seed.",
    );
    process.exit(1);
  }
  return v;
}
const DEMO_PASSWORD = requireDemoPassword();

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
  role: "person" | "counsellor" | "lab" | "evaluator",
  locale: "en" | "ar" = "en",
): Promise<string> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing.length) return existing[0].id;
  const passwordHash = await hashPassword(DEMO_PASSWORD);
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

  console.log("Demo accounts ready (password is the DEMO_PASSWORD from your .env):");
  console.log("  partner.a@demo.sila");
  console.log("  partner.b@demo.sila");
  console.log("  counsellor@demo.sila");
  console.log("  evaluator@demo.sila");
  console.log("  lab@demo.sila");
  console.log(`  counsellor id: ${demoCounsellor}`);
  console.log(`  evaluator id:  ${demoEvaluator}`);
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

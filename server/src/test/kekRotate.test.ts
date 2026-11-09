import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { db } from "../db/client";
import { users, vaultKeys } from "../db/schema";
import { eq } from "drizzle-orm";
import { readResults, storeResults, type ResultsByGene } from "../services/vault";
import { rotateKek } from "../lib/kekRotate";

let handle: TestDbHandle;

beforeAll(() => {
  if (!process.env.SILA_KEK) {
    process.env.SILA_KEK = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  }
});

beforeEach(async () => {
  handle = await setupTestDb();
});

afterEach(async () => {
  await handle.close();
  // Restore the all-zero test KEK for the next suite.
  process.env.SILA_KEK = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
});

const SAMPLE: ResultsByGene = {
  HBB: { status: "tested", variants: ["HbS"] },
  CFTR: { status: "tested", variants: [] },
  GJB2: { status: "tested", variants: [] },
};

function newKek(): string {
  return randomBytes(32).toString("base64url");
}

async function makeUser(email: string, role: "person" | "lab" = "person"): Promise<string> {
  const [u] = await db
    .insert(users)
    .values({ email, passwordHash: "x", role })
    .returning({ id: users.id });
  return u.id;
}

describe("KEK rotation", () => {
  it("rewraps every vault_keys row and increments key_version; old results still decrypt", async () => {
    const oldKek = process.env.SILA_KEK!;
    const newKek1 = newKek();
    // Set up: two people with results under the old kek.
    const a = await makeUser("rot-a@example.com");
    const b = await makeUser("rot-b@example.com");
    const lab = await makeUser("rot-lab@example.com", "lab");
    await storeResults(a, lab, SAMPLE);
    await storeResults(b, lab, SAMPLE);
    const beforeVersions = await db
      .select({ v: vaultKeys.keyVersion })
      .from(vaultKeys)
      .where(eq(vaultKeys.userId, a));
    expect(beforeVersions[0].v).toBe(1);

    // Rotate.
    const res = await rotateKek(oldKek, newKek1);
    expect(res.rotated).toBe(2);
    expect(res.newVersion).toBe(2);

    // Switch the runtime KEK to the new one and verify results still decrypt.
    process.env.SILA_KEK = newKek1;
    const resA = await readResults(a);
    const resB = await readResults(b);
    expect(resA).toEqual(SAMPLE);
    expect(resB).toEqual(SAMPLE);

    // vault_keys rows are now at version 2.
    const afterVersions = await db
      .select({ v: vaultKeys.keyVersion })
      .from(vaultKeys)
      .where(eq(vaultKeys.userId, a));
    expect(afterVersions[0].v).toBe(2);
  });

  it("re-running rotation is idempotent (second pass skips already-rotated rows)", async () => {
    const oldKek = process.env.SILA_KEK!;
    const newKek1 = newKek();
    const a = await makeUser("rot-c@example.com");
    const lab = await makeUser("rot-cl@example.com", "lab");
    await storeResults(a, lab, SAMPLE);

    const pass1 = await rotateKek(oldKek, newKek1);
    expect(pass1.rotated).toBe(1);
    const pass2 = await rotateKek(oldKek, newKek1);
    expect(pass2.rotated).toBe(0);
    expect(pass2.skipped).toBe(1);

    process.env.SILA_KEK = newKek1;
    const r = await readResults(a);
    expect(r).toEqual(SAMPLE);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setupTestDb, type TestDbHandle } from "./testDb";
import { readResults, shredVault, storeResults, type ResultsByGene } from "../services/vault";
import { db } from "../db/client";
import { users } from "../db/schema";

let handle: TestDbHandle;

beforeEach(async () => {
  handle = await setupTestDb();
});

afterEach(async () => {
  await handle.close();
});

async function makeUser(email: string, role: "person" | "lab" = "person"): Promise<string> {
  const [u] = await db
    .insert(users)
    .values({ email, passwordHash: "x", role })
    .returning({ id: users.id });
  return u.id;
}

const SAMPLE: ResultsByGene = {
  HBB: { status: "tested", variants: ["HbS"] },
  CFTR: { status: "tested", variants: [] },
  GJB2: { status: "not_tested" },
};

describe("vault service", () => {
  it("round-trips encrypted results", async () => {
    const person = await makeUser("p@example.com");
    const lab = await makeUser("lab@example.com", "lab");
    await storeResults(person, lab, SAMPLE);
    const got = await readResults(person);
    expect(got).toEqual(SAMPLE);
  });

  it("does not store plaintext variant ids in the vault_results row", async () => {
    const person = await makeUser("p2@example.com");
    const lab = await makeUser("lab2@example.com", "lab");
    await storeResults(person, lab, SAMPLE);
    const raw = await handle.query<{
      ciphertext: string;
      payload_version: number;
      id: string;
    }>("select id, ciphertext, payload_version from vault_results where user_id = $1", [person]);
    const row = raw.rows[0];
    expect(row).toBeTruthy();
    // No plaintext variant id, gene name, or status word appears anywhere in the row.
    const haystack = [row.ciphertext, row.id, String(row.payload_version)].join("|");
    for (const needle of ["HbS", "HbC", "beta", "CFTR-p", "GJB2-p", "HBB", "CFTR", "GJB2", "tested", "not_tested", "uncertain"]) {
      expect(haystack).not.toContain(needle);
    }
  });

  it("stores no plaintext in the wrapped data key either", async () => {
    const person = await makeUser("p3@example.com");
    const lab = await makeUser("lab3@example.com", "lab");
    await storeResults(person, lab, SAMPLE);
    const raw = await handle.query<{ wrapped_data_key: string }>(
      "select wrapped_data_key from vault_keys where user_id = $1",
      [person],
    );
    expect(raw.rows[0].wrapped_data_key).not.toContain("HbS");
    // A random 32-byte wrapped key + 12B IV + 16B tag = 60 bytes = 80 chars base64url.
    expect(raw.rows[0].wrapped_data_key.length).toBeGreaterThanOrEqual(60);
  });

  it("crypto-shred: deleting the key leaves the row unreadable", async () => {
    const person = await makeUser("shred@example.com");
    const lab = await makeUser("labs@example.com", "lab");
    await storeResults(person, lab, SAMPLE);
    await shredVault(person);
    const after = await readResults(person);
    expect(after).toBeNull();
  });

  it("tampered ciphertext fails to decrypt", async () => {
    const person = await makeUser("tamp@example.com");
    const lab = await makeUser("labt@example.com", "lab");
    await storeResults(person, lab, SAMPLE);
    // Flip a byte in the middle of the ciphertext.
    await handle.query(
      "update vault_results set ciphertext = overlay(ciphertext placing 'A' from 20 for 1) where user_id = $1",
      [person],
    );
    await expect(readResults(person)).rejects.toThrow();
  });

  it("a ciphertext moved to another person's vault row fails to decrypt (AAD binding)", async () => {
    const victim = await makeUser("victim@example.com");
    const attacker = await makeUser("attacker@example.com");
    const lab = await makeUser("labm@example.com", "lab");
    await storeResults(victim, lab, SAMPLE);
    await storeResults(attacker, lab, SAMPLE);
    // Take the victim's ciphertext and splat it onto the attacker's row.
    // The AAD is bound to person_id and record_id and payload_version, so
    // decryption as the attacker must fail.
    await handle.query(
      "update vault_results set ciphertext = (select ciphertext from vault_results where user_id = $1) where user_id = $2",
      [victim, attacker],
    );
    await expect(readResults(attacker)).rejects.toThrow();
  });
});

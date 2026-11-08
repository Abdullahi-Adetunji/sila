// Real-Postgres-only tests of the app role's privileges on audit_log.
// PGLite is single-user, so there is nothing to enforce there.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setupTestDb, type TestDbHandle } from "./testDb";

const realPg = process.env.SILA_TEST_DB === "postgres";
const descOrSkip = realPg ? describe : describe.skip;

let handle: TestDbHandle;

descOrSkip("app role is least-privilege on audit_log (real Postgres)", () => {
  beforeEach(async () => {
    handle = await setupTestDb();
    // Seed one row so UPDATE/DELETE have something to target.
    await handle.query(
      "INSERT INTO audit_log (prev_hash, hash, action, outcome, created_at) VALUES ($1, $2, $3, $4, $5)",
      [
        "",
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        "role_test_seed",
        "allowed",
        new Date().toISOString(),
      ],
    );
  });

  afterEach(async () => {
    await handle.close();
  });

  it("cannot UPDATE audit_log", async () => {
    await expect(
      handle.query("UPDATE audit_log SET action = 'tampered' WHERE action = 'role_test_seed'"),
    ).rejects.toThrow(/permission denied|append-only/i);
  });

  it("cannot DELETE from audit_log", async () => {
    await expect(
      handle.query("DELETE FROM audit_log WHERE action = 'role_test_seed'"),
    ).rejects.toThrow(/permission denied|append-only/i);
  });

  it("cannot TRUNCATE audit_log", async () => {
    await expect(handle.query("TRUNCATE TABLE audit_log")).rejects.toThrow(
      /permission denied|append-only|must be owner/i,
    );
  });

  it("cannot ALTER audit_log or disable its triggers", async () => {
    await expect(handle.query("ALTER TABLE audit_log DROP COLUMN hash")).rejects.toThrow(
      /must be owner|permission denied/i,
    );
    await expect(handle.query("ALTER TABLE audit_log DISABLE TRIGGER ALL")).rejects.toThrow(
      /must be owner|permission denied/i,
    );
  });

  it("cannot DROP the audit trigger or its function", async () => {
    await expect(
      handle.query("DROP TRIGGER audit_log_no_update ON audit_log"),
    ).rejects.toThrow(/must be owner|permission denied/i);
    await expect(handle.query("DROP FUNCTION audit_log_block_mutation()")).rejects.toThrow(
      /must be owner|permission denied/i,
    );
  });

  it("can SELECT and INSERT audit_log (the only two allowed verbs)", async () => {
    const before = await handle.query<{ n: string }>("SELECT count(*)::text AS n FROM audit_log");
    await handle.query(
      "INSERT INTO audit_log (prev_hash, hash, action, outcome, created_at) VALUES ($1, $2, $3, $4, $5)",
      ["", "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", "role_test_write", "allowed", new Date().toISOString()],
    );
    const after = await handle.query<{ n: string }>("SELECT count(*)::text AS n FROM audit_log");
    expect(Number(after.rows[0].n)).toBe(Number(before.rows[0].n) + 1);
  });

  it("is not the owner of audit_log", async () => {
    const r = await handle.query<{ tableowner: string }>(
      "SELECT tableowner FROM pg_tables WHERE tablename = 'audit_log'",
    );
    expect(r.rows[0].tableowner).not.toBe("sila_app");
  });
});

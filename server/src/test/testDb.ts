import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { setTestDb } from "../db/client";

export interface TestDbHandle {
  client: PGlite;
  reset: () => Promise<void>;
  close: () => Promise<void>;
}

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(here, "../../../drizzle");

async function applyMigrations(client: PGlite): Promise<void> {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const raw = readFileSync(join(migrationsDir, file), "utf8");
    const statements = raw
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await client.exec(stmt);
    }
  }
}

export async function setupTestDb(): Promise<TestDbHandle> {
  const client = new PGlite();
  await applyMigrations(client);
  const db = drizzlePglite(client);
  setTestDb(db);
  return {
    client,
    reset: async () => {
      // Truncate app tables; keep schema in place.
      await db.execute(
        sql`TRUNCATE TABLE vault_results, vault_keys, sessions, users RESTART IDENTITY CASCADE`,
      );
    },
    close: async () => {
      await client.close();
    },
  };
}

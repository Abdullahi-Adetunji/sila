import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { setTestDb } from "../db/client";

export interface TestDbHandle {
  // Raw query handle for tests that want to peek at the database directly.
  // Uniform across PGLite and real Postgres: returns { rows }.
  query: <T = unknown>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }>;
  exec: (sql: string) => Promise<unknown>;
  close: () => Promise<void>;
}

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(here, "../../../drizzle");
const grantAppSqlPath = resolve(here, "../../../scripts/sql/grant-app.sql");

function loadMigrationStatements(): string[] {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const all: string[] = [];
  for (const file of files) {
    const raw = readFileSync(join(migrationsDir, file), "utf8");
    const statements = raw
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    all.push(...statements);
  }
  return all;
}

function loadGrantAppSql(): string {
  return readFileSync(grantAppSqlPath, "utf8");
}

export async function setupTestDb(): Promise<TestDbHandle> {
  if (process.env.SILA_TEST_DB === "postgres") {
    return setupRealPgTestDb();
  }
  return setupPgliteTestDb();
}

async function setupPgliteTestDb(): Promise<TestDbHandle> {
  const client = new PGlite();
  for (const stmt of loadMigrationStatements()) {
    await client.exec(stmt);
  }
  setTestDb(drizzlePglite(client));
  return {
    query: <T = unknown>(sql: string, params?: unknown[]) =>
      client.query<T>(sql, params) as Promise<{ rows: T[] }>,
    exec: (sql: string) => client.exec(sql),
    close: async () => {
      await client.close();
    },
  };
}

async function setupRealPgTestDb(): Promise<TestDbHandle> {
  const adminUrl = requireEnv("SILA_PG_ADMIN_URL");
  const appUrl = requireEnv("SILA_PG_APP_URL");

  // Owner rebuilds the schema from scratch. DROP SCHEMA is DDL, so the
  // audit_log append-only triggers do not fire here (they are gone with the
  // table). Then apply migrations, then apply the app-role grants.
  const admin = new Pool({ connectionString: adminUrl });
  try {
    await admin.query("DROP SCHEMA IF EXISTS public CASCADE");
    await admin.query("CREATE SCHEMA public");
    await admin.query("GRANT USAGE ON SCHEMA public TO sila_app");
    for (const stmt of loadMigrationStatements()) {
      await admin.query(stmt);
    }
    await admin.query(loadGrantAppSql());
  } finally {
    await admin.end();
  }

  const appPool = new Pool({ connectionString: appUrl });
  setTestDb(drizzlePg(appPool));
  return {
    query: <T = unknown>(sql: string, params?: unknown[]) =>
      appPool.query<Record<string, unknown>>(sql, params ?? []) as unknown as Promise<{
        rows: T[];
      }>,
    exec: async (sql: string) => {
      await appPool.query(sql);
    },
    close: async () => {
      await appPool.end();
    },
  };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} must be set when SILA_TEST_DB=postgres`);
  }
  return v;
}

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../env";

export type AppDb = NodePgDatabase<Record<string, never>>;

export const pool: Pool = new Pool({ connectionString: env.DATABASE_URL });

// `db` is a live binding so tests can swap in a PGLite-backed Drizzle instance
// via `setTestDb` without changing route code. Prod always uses the pg Pool.
export let db: AppDb = drizzle(pool);

export function setTestDb(testDb: unknown): void {
  db = testDb as AppDb;
}

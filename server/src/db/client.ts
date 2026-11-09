import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type QueryConfig, type QueryResult, type QueryResultRow } from "pg";
import { env } from "../env";

export type AppDb = NodePgDatabase<Record<string, never>>;

// Pool settings tuned for Neon's free compute, which suspends after ~5
// minutes idle and takes several seconds to wake on the first query. The
// pool evicts idle clients so none of ours hold a long-dead TCP socket, and
// we keep the pool small so two processes (API + Next.js) stay inside the
// free instance's 512 MB cap.
export const pool: Pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 10_000,
  // If a client's connection drops while idle we want the next getClient() to
  // open a fresh one rather than reuse the dead one.
  allowExitOnIdle: false,
});

// The list of pg error codes that mean "the connection went away" — all of
// these are expected the first time we touch the DB after Neon suspends and
// resumes. On a single retry inside the same pool call the pg Pool itself
// will fetch a new TCP connection.
const WAKE_PG_CODES = new Set(["57P01", "57P02", "57P03", "08006", "08003", "08001", "08004"]);
const WAKE_SYS_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "EPIPE"]);

function isWakeError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const code = (e as { code?: unknown }).code;
  if (typeof code === "string" && (WAKE_PG_CODES.has(code) || WAKE_SYS_CODES.has(code))) return true;
  const msg = (e as { message?: unknown }).message;
  if (typeof msg === "string" && /Connection terminated|server closed the connection/i.test(msg)) {
    return true;
  }
  return false;
}

// Monkey-patch pool.query so drizzle (which calls through pool.query) gets
// the retry transparently without needing to know about Neon's wake timing.
// We retry at most once per outer call. Non-connection errors (query
// syntax, constraint, row-level, etc.) pass straight through.
const originalQuery = pool.query.bind(pool);
async function queryWithWakeRetry<R extends QueryResultRow = QueryResultRow>(
  textOrConfig: string | QueryConfig,
  values?: unknown[],
): Promise<QueryResult<R>> {
  try {
    return (await (originalQuery as unknown as (...a: unknown[]) => Promise<QueryResult<R>>)(
      textOrConfig,
      values,
    )) as QueryResult<R>;
  } catch (e) {
    if (!isWakeError(e)) throw e;
    // Neon is waking. Give pg's pool one tick to evict the dead client and
    // try again with a fresh one.
    await new Promise((r) => setTimeout(r, 25));
    return (await (originalQuery as unknown as (...a: unknown[]) => Promise<QueryResult<R>>)(
      textOrConfig,
      values,
    )) as QueryResult<R>;
  }
}
(pool.query as unknown) = queryWithWakeRetry;

// `db` is a live binding so tests can swap in a PGLite-backed Drizzle instance
// via `setTestDb` without changing route code. Prod always uses the pg Pool.
export let db: AppDb = drizzle(pool);

export function setTestDb(testDb: unknown): void {
  db = testDb as AppDb;
}

// Exported for the dbWake test. Not used by product code.
export const __internal = { isWakeError };

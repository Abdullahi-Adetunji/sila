import { Pool } from "pg";
import { env } from "../env";

// Production-only safety check. Before the API accepts its first request we
// verify that the connection string it was given is for the least-privilege
// runtime role, not an owner or superuser. This protects against a deploy
// where someone accidentally set DATABASE_URL to the owner credentials: that
// would silently give the API the right to disable the audit-log triggers,
// drop tables and rewrite history. The role-privilege test (roles.test.ts)
// is the primary line of defence; this is a belt-and-braces at startup.
//
// Throws (so the process exits 1 under start.sh / Render) if any check
// fails.
export async function preflightProductionDbRole(): Promise<void> {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  try {
    const { rows } = await pool.query<{
      current_user: string;
      is_superuser: boolean;
      owned_tables: number;
    }>(
      `select
         current_user as "current_user",
         (select rolsuper from pg_roles where rolname = current_user) as is_superuser,
         (select count(*) from pg_tables
          where tableowner = current_user and schemaname = 'public')::int as owned_tables`,
    );
    const r = rows[0];
    if (r.current_user !== "sila_app") {
      throw new Error(
        `[preflight] API refuses to start: current_user is '${r.current_user}', expected 'sila_app'`,
      );
    }
    if (r.is_superuser) {
      throw new Error(`[preflight] API refuses to start: current_user is a superuser`);
    }
    if (Number(r.owned_tables) > 0) {
      throw new Error(
        `[preflight] API refuses to start: current_user owns ${r.owned_tables} tables in public`,
      );
    }
    console.log(
      `[preflight] db role ok: current_user=sila_app, superuser=false, owned_tables=0`,
    );
  } finally {
    await pool.end();
  }
}

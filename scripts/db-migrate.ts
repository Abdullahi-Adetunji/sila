import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Enum-value additions that must run OUTSIDE the drizzle transaction, since
// Postgres refuses `ALTER TYPE ... ADD VALUE` inside a transaction block.
// Each entry is a one-liner and uses IF NOT EXISTS so re-runs are safe.
// Keep this list minimal: anything that can live inside a transaction
// belongs in the normal drizzle migration file.
const PREFLIGHT_ENUM_ADDS: string[] = [
  `ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'admin'`,
];

async function main() {
  const connectionString = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "Neither DATABASE_ADMIN_URL nor DATABASE_URL is set. Migrations should run as the sila_owner role.",
    );
    process.exit(1);
  }
  const pool = new Pool({ connectionString });

  // Preflight enum adds — each on its own connection so they don't share
  // an implicit transaction. IF NOT EXISTS keeps them idempotent.
  for (const sql of PREFLIGHT_ENUM_ADDS) {
    try {
      await pool.query(sql);
      console.log(`[preflight] ${sql}`);
    } catch (err) {
      console.error(`[preflight] failed: ${sql}`);
      throw err;
    }
  }

  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

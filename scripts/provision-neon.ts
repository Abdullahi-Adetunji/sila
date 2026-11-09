// One-shot Neon provisioning for Sila. No psql required — uses the pg
// package the API already depends on.
//
// What it does:
//   1. Reads NEON_OWNER_URL from .env (which is gitignored).
//   2. Connects as the Neon-level owner and runs scripts/sql/setup-roles.sql
//      to create sila_owner and sila_app if absent.
//   3. Sets fresh random passwords on both.
//   4. Transfers ownership of the database and the public schema to
//      sila_owner.
//   5. Runs the drizzle migrations as sila_owner.
//   6. Applies scripts/sql/grant-app.sql.
//   7. Sanity-checks that sila_app can connect.
//   8. Writes:
//        .env.render  (chmod 600, gitignored) — the exact runtime env for
//                     the Render service. No admin URL.
//        .env.github  (chmod 600, gitignored) — DATABASE_ADMIN_URL only,
//                     for the GitHub repo secret of the same name.
//
// Never prints a secret to stdout. Idempotent on re-run.

import { readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";

function env(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function loadDotEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    const [, k, raw] = m;
    const v = raw.replace(/^['"]|['"]$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}

function gen(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

async function exec(pool: Pool, sql: string, label: string): Promise<void> {
  console.log(`[provision] ${label}`);
  await pool.query(sql);
}

async function execFile(pool: Pool, path: string, label: string): Promise<void> {
  const sql = readFileSync(path, "utf8");
  await exec(pool, sql, label);
}

async function main(): Promise<void> {
  loadDotEnv(resolve(process.cwd(), ".env"));
  const ownerUrl = env("NEON_OWNER_URL");
  if (!ownerUrl) {
    throw new Error("NEON_OWNER_URL is not set (checked process.env and .env)");
  }

  const parsed = new URL(ownerUrl);
  // Neon's default database name is 'neondb'. Keep whatever the URL path
  // says so we can be repointed without code changes.
  const database = parsed.pathname.replace(/^\//, "") || "neondb";
  const host = parsed.host;
  // Preserve the owner URL's query (sslmode, channel binding, project id).
  const search = parsed.search || "?sslmode=require";
  console.log(`[provision] target: ${host}/${database}`);

  const silaOwnerPw = gen(32);
  const silaAppPw = gen(32);
  const silaKek = gen(32);
  const sessionSecret = gen(32);
  const volunteerHmacKey = gen(32);
  const demoPassword = gen(24);
  const evaluatorPassword = gen(24);

  const ownerPool = new Pool({ connectionString: ownerUrl, max: 2 });
  try {
    await execFile(
      ownerPool,
      resolve(process.cwd(), "scripts/sql/setup-roles.sql"),
      "creating sila_owner and sila_app (idempotent)",
    );

    console.log("[provision] setting fresh passwords on both roles");
    // Parameterised ALTER ROLE isn't supported; the password is a random
    // base64url string with no quote or backslash, so simple quoting is
    // safe.
    await ownerPool.query(`ALTER ROLE sila_owner WITH LOGIN PASSWORD '${silaOwnerPw}'`);
    await ownerPool.query(`ALTER ROLE sila_app   WITH LOGIN PASSWORD '${silaAppPw}'`);

    // Neon's owner role isn't a superuser and isn't yet a member of
    // sila_owner, so ALTER DATABASE/SCHEMA ... OWNER TO sila_owner would
    // fail with "must be able to SET ROLE sila_owner". Making the current
    // session user a member of sila_owner is Postgres's standard way out.
    console.log("[provision] granting sila_owner membership to the current Neon login");
    await ownerPool.query(`
      DO $$
      BEGIN
        EXECUTE format('GRANT sila_owner TO %I', current_user);
      END
      $$;
    `);

    console.log("[provision] transferring ownership of database and schema");
    await ownerPool.query(`ALTER DATABASE "${database}" OWNER TO sila_owner`);
    await ownerPool.query(`ALTER SCHEMA  public OWNER TO sila_owner`);
  } finally {
    await ownerPool.end();
  }

  const adminUrl = `postgres://sila_owner:${encodeURIComponent(silaOwnerPw)}@${host}/${database}${search}`;
  const appUrl = `postgres://sila_app:${encodeURIComponent(silaAppPw)}@${host}/${database}${search}`;

  console.log("[provision] applying migrations as sila_owner");
  // Run db-migrate via spawning the existing script, so we pick up any
  // migrator-specific setup. drizzle-migrator uses DATABASE_ADMIN_URL.
  const { spawnSync } = await import("node:child_process");
  const migrate = spawnSync("npx", ["tsx", "scripts/db-migrate.ts"], {
    env: { ...process.env, DATABASE_ADMIN_URL: adminUrl },
    stdio: "inherit",
  });
  if (migrate.status !== 0) {
    throw new Error(`migration failed with exit code ${migrate.status}`);
  }

  console.log("[provision] applying sila_app grants");
  const adminPool = new Pool({ connectionString: adminUrl, max: 2 });
  try {
    await execFile(
      adminPool,
      resolve(process.cwd(), "scripts/sql/grant-app.sql"),
      "applying grant-app.sql",
    );
  } finally {
    await adminPool.end();
  }

  console.log("[provision] verifying sila_app can connect");
  const appPool = new Pool({ connectionString: appUrl, max: 2 });
  try {
    const { rows } = await appPool.query<{
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
    if (r.current_user !== "sila_app" || r.is_superuser || Number(r.owned_tables) > 0) {
      throw new Error(
        `sila_app verification failed: user=${r.current_user} super=${r.is_superuser} owned=${r.owned_tables}`,
      );
    }
    console.log(`[provision] sila_app connects as ${r.current_user} (superuser=false, owned=0)`);
  } finally {
    await appPool.end();
  }

  // Write .env.render (runtime env for Render; never contains admin URL).
  const renderBody = [
    "# Generated by scripts/provision-neon.ts — DO NOT COMMIT.",
    "# Paste these KEY=VALUE pairs into Render's Environment tab.",
    `DATABASE_URL=${appUrl}`,
    `SILA_KEK=${silaKek}`,
    `SESSION_SECRET=${sessionSecret}`,
    `VOLUNTEER_HMAC_KEY=${volunteerHmacKey}`,
    `DEMO_PASSWORD=${demoPassword}`,
    `EVALUATOR_PASSWORD=${evaluatorPassword}`,
    `DEMO_MODE=true`,
    `NODE_ENV=production`,
    "",
  ].join("\n");
  writeFileSync(resolve(process.cwd(), ".env.render"), renderBody, { mode: 0o600 });
  chmodSync(resolve(process.cwd(), ".env.render"), 0o600);

  // Write .env.github (only the owner URL, for the GitHub repo secret).
  const ghBody = [
    "# Generated by scripts/provision-neon.ts — DO NOT COMMIT.",
    "# Paste this into GitHub → Settings → Secrets and variables → Actions → New repository secret",
    "# Name: DATABASE_ADMIN_URL",
    `DATABASE_ADMIN_URL=${adminUrl}`,
    "",
  ].join("\n");
  writeFileSync(resolve(process.cwd(), ".env.github"), ghBody, { mode: 0o600 });
  chmodSync(resolve(process.cwd(), ".env.github"), 0o600);

  console.log("[provision] wrote .env.render and .env.github (0600, gitignored)");
  console.log("[provision] IMPORTANT: copy SILA_KEK from .env.render into your password manager.");
  console.log("[provision] IMPORTANT: if SILA_KEK is lost, every vault becomes unreadable.");
  console.log("[provision] done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env sh
# Fly.io release-command script for the API. Runs ONCE per deploy, before
# the new machines take traffic. Applies migrations as sila_owner, then
# applies the app-role grants.
#
# Required secrets on the api app:
#   DATABASE_ADMIN_URL   postgres://sila_owner:<pw>@<pghost>:5432/sila
#   DATABASE_URL         postgres://sila_app:<pw>@<pghost>:5432/sila
# (plus the usual SILA_KEK, SESSION_SECRET, DEMO_PASSWORD, EVALUATOR_PASSWORD)

set -euo pipefail

echo "[release] applying migrations as sila_owner"
npx tsx scripts/db-migrate.ts

echo "[release] applying app-role grants"
# Fly machines have psql installed if the image does; this build does not.
# Pipe the grants file into a short Node psql-equivalent via pg.
node -e "
const { Pool } = require('pg');
const fs = require('fs');
async function main() {
  const p = new Pool({ connectionString: process.env.DATABASE_ADMIN_URL });
  const sql = fs.readFileSync('scripts/sql/grant-app.sql', 'utf8');
  await p.query(sql);
  await p.end();
  console.log('[release] grants applied');
}
main().catch(e => { console.error(e); process.exit(1); });
"

echo "[release] done"

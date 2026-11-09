# Deploy runbook — Render + Neon (Frankfurt)

**Audience.** Whoever is running the Render + Neon deploy of Sila. The CI runs on every push already; this document covers the one-shot provisioning and the subsequent deploys.

Scope: one free Render web service in `frankfurt`, one Neon Postgres project in `eu-central-1`, GitHub Actions for migrations + deploy trigger and for nightly encrypted backups.

---

## 0. One-time prerequisites

- GitHub CLI (`gh`) authenticated to the repo, or ready to click through Settings → Secrets.
- `RENDER_API_KEY` and `NEON_OWNER_URL` in a **gitignored** `.env` at the repo root. The owner URL is the Neon owner role (direct, not pooled) for the project in the Frankfurt region.
- `openssl`, `age-keygen`, `age` and `psql` (PG 16 client) installed locally.
- A password manager you will actually open.

---

## 1. Create the two Postgres roles and lock them down

The Neon owner URL is for the automated owner role Neon created. Sila's owner is a separate role, so the API never runs as the Neon-level owner.

```sh
set -a; . .env; set +a    # loads RENDER_API_KEY and NEON_OWNER_URL
psql "$NEON_OWNER_URL" -f scripts/sql/setup-roles.sql
```

Then, in psql, set fresh long passwords. **Never** reuse the docker-compose defaults.

```sh
SILA_OWNER_PW=$(openssl rand -base64 36 | tr -d '=+/' | cut -c1-32)
SILA_APP_PW=$(openssl rand -base64 36 | tr -d '=+/' | cut -c1-32)
psql "$NEON_OWNER_URL" \
  -c "ALTER ROLE sila_owner WITH LOGIN PASSWORD '$SILA_OWNER_PW';" \
  -c "ALTER ROLE sila_app   WITH LOGIN PASSWORD '$SILA_APP_PW';"
# Neon databases are named 'neondb' by default. Adjust if yours differs.
psql "$NEON_OWNER_URL" \
  -c "ALTER DATABASE neondb OWNER TO sila_owner;" \
  -c "ALTER SCHEMA  public OWNER TO sila_owner;"
```

Construct the two connection URLs. Both point at Neon's **direct** endpoint (non-pooled) — the pooler is a PgBouncer that drops prepared statements and can confuse drizzle on wake.

```sh
# Example host: ep-foo-bar-123456.eu-central-1.aws.neon.tech
NEON_HOST=$(python3 -c "from urllib.parse import urlparse; import os; print(urlparse(os.environ['NEON_OWNER_URL']).hostname)")
NEON_DB=$(python3 -c "from urllib.parse import urlparse; import os; print(urlparse(os.environ['NEON_OWNER_URL']).path.strip('/'))")
export DATABASE_ADMIN_URL="postgres://sila_owner:$SILA_OWNER_PW@$NEON_HOST/$NEON_DB?sslmode=require"
export DATABASE_URL="postgres://sila_app:$SILA_APP_PW@$NEON_HOST/$NEON_DB?sslmode=require"
```

Run migrations and grants.

```sh
DATABASE_ADMIN_URL="$DATABASE_ADMIN_URL" npx tsx scripts/db-migrate.ts
psql "$DATABASE_ADMIN_URL" -f scripts/sql/grant-app.sql
```

## 2. Generate application secrets (local only)

```sh
export SILA_KEK=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")
export SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")
export VOLUNTEER_HMAC_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")
export DEMO_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('base64url'))")
export EVALUATOR_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('base64url'))")
```

Save them to `.env.render` (which is gitignored by the existing `.env*` rule):

```sh
umask 077
cat > .env.render <<EOF
DATABASE_URL=$DATABASE_URL
SILA_KEK=$SILA_KEK
SESSION_SECRET=$SESSION_SECRET
VOLUNTEER_HMAC_KEY=$VOLUNTEER_HMAC_KEY
DEMO_PASSWORD=$DEMO_PASSWORD
EVALUATOR_PASSWORD=$EVALUATOR_PASSWORD
DEMO_MODE=true
NODE_ENV=production
EOF
chmod 600 .env.render
```

**Copy `SILA_KEK` into your password manager now.** If `SILA_KEK` is lost, every vault becomes unreadable. The `.env.render` is a working copy; the password manager is the source of truth.

## 3. Age key pair for backups

```sh
mkdir -p ~/.sila && chmod 700 ~/.sila
age-keygen -o ~/.sila/sila-backup-key.txt
chmod 600 ~/.sila/sila-backup-key.txt
# The public key (recipient) is on the last line of that file:
AGE_RECIPIENT=$(grep -oE 'age1[a-z0-9]+' ~/.sila/sila-backup-key.txt | head -1)
echo "AGE_RECIPIENT=$AGE_RECIPIENT"
```

**Copy the private key (the whole `~/.sila/sila-backup-key.txt` file) to your password manager now.**

## 4. Create the Render service (auto-deploy OFF)

Through the Render REST API, authenticated via `RENDER_API_KEY`. Set `autoDeploy: "no"` so pushes do **not** trigger deploys; only the GitHub Actions `Deploy` workflow does.

```sh
# Confirm no second free service already exists.
curl -s -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/services \
  | python3 -c "import json,sys; svcs=[s['service'] for s in json.load(sys.stdin)]; \
    print('free services:', [s['name'] for s in svcs if s.get('serviceDetails',{}).get('plan')=='free'])"

# Create the service. Replace <owner-id> and <repo> with yours.
curl -s -X POST -H "Authorization: Bearer $RENDER_API_KEY" -H "Content-Type: application/json" \
  https://api.render.com/v1/services -d @- <<JSON
{
  "type": "web_service",
  "name": "sila",
  "ownerId": "<owner-id>",
  "repo": "https://github.com/<you>/sila",
  "autoDeploy": "no",
  "branch": "main",
  "serviceDetails": {
    "region": "frankfurt",
    "plan": "free",
    "env": "docker",
    "envSpecificDetails": { "dockerfilePath": "./Dockerfile" },
    "healthCheckPath": "/api/healthz"
  }
}
JSON
```

`/api/healthz` is liveness only (no DB call). An external uptime monitor that pings it every few minutes keeps Render awake without preventing Neon's free compute from auto-suspending. Use `/api/ready` (runs `select 1`) from the verification scripts only — never from Render's health check or from an uptime monitor, or Neon will never sleep.

Save the returned `id` as `SERVICE_ID`. Then create a deploy hook and set the env vars.

```sh
# Deploy hook — URL returned here goes into the GitHub secret RENDER_DEPLOY_HOOK.
curl -s -X POST -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services/$SERVICE_ID/deploy-hooks | tee /tmp/hook.json
export RENDER_DEPLOY_HOOK=$(python3 -c "import json;print(json.load(open('/tmp/hook.json'))['url'])")

# Env vars — bulk set.
python3 -c "
import json, os
env = {}
for line in open('.env.render'):
    line=line.strip()
    if not line or line.startswith('#'): continue
    k,v=line.split('=',1); env[k]=v
print(json.dumps([{'key':k,'value':v} for k,v in env.items()]))
" > /tmp/envvars.json
curl -s -X PUT -H "Authorization: Bearer $RENDER_API_KEY" -H "Content-Type: application/json" \
  https://api.render.com/v1/services/$SERVICE_ID/env-vars -d @/tmp/envvars.json
```

## 5. GitHub secrets

Three secrets go on the repo. If `gh` is installed:

```sh
gh secret set DATABASE_ADMIN_URL --body "$DATABASE_ADMIN_URL"
gh secret set RENDER_DEPLOY_HOOK --body "$RENDER_DEPLOY_HOOK"
gh secret set AGE_RECIPIENT --body "$AGE_RECIPIENT"
```

Without `gh`, do it on the web:

1. `https://github.com/<you>/sila/settings/secrets/actions`.
2. Click **New repository secret**. Add `DATABASE_ADMIN_URL`, value = the owner URL you built in step 1.
3. Add `RENDER_DEPLOY_HOOK`, value = the URL from the deploy-hook creation in step 4.
4. Add `AGE_RECIPIENT`, value = the `age1...` public key from step 3.

## 6. First deploy

```sh
gh workflow run deploy.yml --ref main
# or on the web: Actions → Deploy → Run workflow → main
```

The workflow will:
- Refuse to run if `ci.yml` is not green on this SHA.
- Install deps, run migrations as `sila_owner`, apply `grant-app.sql`.
- POST the Render deploy hook; Render pulls the image and starts a build.

Watch the build logs in Render until the service is `live` and `/api/healthz` returns 200. Cold first build takes ~5–10 minutes.

## 7. Seed the live database, once

Seeding runs from this machine so `.env.render`'s `SILA_KEK` is the one the seeded vaults are wrapped under. Read the file; do not print it.

```sh
set -a; . .env.render; set +a
DEMO_PASSWORD="$DEMO_PASSWORD" EVALUATOR_PASSWORD="$EVALUATOR_PASSWORD" \
  DATABASE_URL="$DATABASE_URL" SILA_KEK="$SILA_KEK" \
  SESSION_SECRET="$SESSION_SECRET" VOLUNTEER_HMAC_KEY="$VOLUNTEER_HMAC_KEY" \
  npm run seed
```

The seed is idempotent on users; a re-run only re-stores results and re-grants the demo couple's consents.

## 8. Wake + verify

Render's free service sleeps after 15 minutes of inactivity. Wake it before each test run:

```sh
export BASE_URL=https://<your-service>.onrender.com

# Step 1: wake Render (liveness only, no DB — this does not wake Neon).
i=0; until curl -fsS "$BASE_URL/api/healthz" >/dev/null 2>&1; do
  i=$((i+1)); [ $i -ge 45 ] && echo "wake timeout" && exit 1; sleep 2
done
echo "render live"

# Step 2: wake Neon for the test run (readiness — runs select 1 on the DB).
# Do this before the attack / Playwright run, because those will exercise
# the database and a cold Neon would make the first calls time out.
i=0; until curl -fsS "$BASE_URL/api/ready" >/dev/null 2>&1; do
  i=$((i+1)); [ $i -ge 30 ] && echo "ready timeout" && exit 1; sleep 2
done
echo "db ready"

# Black-box attack suite (demo-mode-on profile).
SILA_EXPECT_DEMO_MODE=true BASE_URL="$BASE_URL" npm run attack

# Playwright end-to-end.
BASE_URL="$BASE_URL" npx playwright install chromium
BASE_URL="$BASE_URL" npx playwright test

# Submission screenshots.
BASE_URL="$BASE_URL" npm run screenshots
```

Paste the resulting `data/review/attack_report.json` and `data/review/e2e_report.json` into [docs/evaluation-results.md](evaluation-results.md). Leave the volunteer and clinician cells empty.

## 9. Finalise

```sh
# Update the Live URL line at the top of README.md, the heading of
# docs/demo-script.md, and the landing-page footer link.
#   README.md               line 3
#   docs/demo-script.md     any mention of the live URL
#   src/app/(landing)/...   footer href

git commit -am "live URL"
git push origin main
# wait for CI to go green, then tag
git tag v1.0.0-pilot
git push origin v1.0.0-pilot
```

## 10. Backup restore drill (before any volunteer uses the site)

The daily workflow writes an encrypted artifact. Do one practice restore.

```sh
# Download the most recent artifact.
gh run list --workflow=backup.yml --limit 1 --json databaseId -q '.[0].databaseId' > /tmp/run_id
gh run download "$(cat /tmp/run_id)" --name "sila-db-backup-$(cat /tmp/run_id)" --dir /tmp/backup
ls /tmp/backup/*.dump.age

# Decrypt with the private key held locally.
age -d -i ~/.sila/sila-backup-key.txt -o /tmp/backup/latest.dump /tmp/backup/*.dump.age

# Create a Neon branch (so we don't disturb prod).
# In the Neon console: Branches → Create branch from current → name "restore-drill".
# Copy its connection URL as $RESTORE_URL.
pg_restore --no-owner --clean --if-exists -d "$RESTORE_URL" /tmp/backup/latest.dump

# Sanity check row counts.
psql "$RESTORE_URL" -c "select
  (select count(*) from users) as users,
  (select count(*) from vault_results) as results,
  (select count(*) from volunteers) as volunteers,
  (select count(*) from audit_log) as audit_rows;"

# Delete the Neon branch when you're done.
```

If the row counts match production within a reasonable delta for the time of day, the backup is good. Record the test in [evaluation-results.md](evaluation-results.md) under "privacy and backups".

## 11. Rotating `SILA_KEK` in production

```sh
export SILA_KEK_NEXT=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")

# Rotate from this machine — the live DATABASE_URL + current SILA_KEK are in .env.render.
set -a; . .env.render; set +a
SILA_KEK_NEXT="$SILA_KEK_NEXT" DATABASE_URL="$DATABASE_URL" SILA_KEK="$SILA_KEK" \
  npm run kek:rotate

# Point the live service at the new KEK, then restart it.
curl -s -X PUT -H "Authorization: Bearer $RENDER_API_KEY" -H "Content-Type: application/json" \
  https://api.render.com/v1/services/$SERVICE_ID/env-vars/SILA_KEK \
  -d "{\"value\":\"$SILA_KEK_NEXT\"}"
# Update .env.render too.
sed -i.bak "s|^SILA_KEK=.*|SILA_KEK=$SILA_KEK_NEXT|" .env.render && rm .env.render.bak
# Copy the new SILA_KEK into your password manager now.

# Trigger a deploy (picks up the new secret).
curl -s -X POST "$RENDER_DEPLOY_HOOK"
```

# Deploy runbook

**Audience.** Whoever is running the first Fly.io deploy of Sila. The CI runs on every push already; this document covers the one-shot provisioning + the subsequent deploys.

## 0. One-time prerequisites

- `fly auth login` already done.
- A `FLY_API_TOKEN` is stored as a GitHub repository secret named `FLY_API_TOKEN`. Generate one with `fly tokens create deploy -x 72h` (longer for the pilot window).
- Your local `.env` is **not** used by the deploy; secrets are set via `fly secrets set`.

## 1. Create the two apps

```sh
fly apps create sila-api
fly apps create sila-web
```

## 2. Create managed Postgres in fra

```sh
# Fly managed Postgres (automated daily encrypted backups included).
fly mpg create --name sila-db --region fra --plan basic --org <your-org>
# Attach to the api app so DATABASE_URL + related are populated.
fly mpg attach sila-db --app sila-api
```

If `fly mpg` is not available in your org, fall back to the legacy unmanaged Postgres:

```sh
fly postgres create --name sila-db --region fra --vm-size shared-cpu-1x --volume-size 10
fly postgres attach --app sila-api sila-db
# Then schedule your own daily `pg_dump` to Fly Volumes or S3. See
# docs/pilot-path.md for the backup drill expectations.
```

Record the connection string Fly prints. We will use it for both `DATABASE_URL` (sila_app) and `DATABASE_ADMIN_URL` (sila_owner) after creating those roles.

## 3. Create the two Postgres roles and lock them down

Connect as the admin role Fly created:

```sh
fly mpg connect sila-db
# Or: fly pg connect -a sila-db
```

Then in `psql`:

```sql
\i scripts/sql/setup-roles.sql
-- Generate two FRESH long passwords; NEVER the docker-compose defaults.
ALTER ROLE sila_owner WITH LOGIN PASSWORD '<generated-pw-1>';
ALTER ROLE sila_app   WITH LOGIN PASSWORD '<generated-pw-2>';
-- Hand ownership of the Sila database and schema to sila_owner.
ALTER DATABASE sila         OWNER TO sila_owner;
ALTER SCHEMA  public        OWNER TO sila_owner;
```

If your database is not named `sila`, adjust the `ALTER DATABASE` line. The grants file applied later also lives in `scripts/sql/grant-app.sql`; it is run automatically by the api app's `deploy.release_command`.

## 4. Generate the application secrets

```sh
export SILA_KEK=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")
export SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")
export DEMO_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('base64url'))")
export EVALUATOR_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('base64url'))")
```

Keep these in your password manager; Fly will never print them back.

## 5. Set secrets on the api app

```sh
# Replace <sila_owner-pw> / <sila_app-pw> with the values you set in step 3,
# and the host with what Fly printed. Fly stores these encrypted.
fly secrets set -a sila-api \
  DATABASE_URL="postgres://sila_app:<sila_app-pw>@sila-db.flycast:5432/sila" \
  DATABASE_ADMIN_URL="postgres://sila_owner:<sila_owner-pw>@sila-db.flycast:5432/sila" \
  SILA_KEK="$SILA_KEK" \
  SESSION_SECRET="$SESSION_SECRET" \
  DEMO_PASSWORD="$DEMO_PASSWORD" \
  EVALUATOR_PASSWORD="$EVALUATOR_PASSWORD" \
  DEMO_MODE="true" \
  NODE_ENV="production"
```

## 6. Set secrets on the web app

Only one real secret is needed; the internal API host is already in `fly/web.fly.toml`.

```sh
fly secrets set -a sila-web NODE_ENV=production
```

## 7. First deploy

Deploys run via GitHub Actions (`.github/workflows/deploy.yml`). Fire a manual run:

```sh
gh workflow run deploy.yml --ref main
```

The workflow will:
- Check that the latest `ci.yml` run on `main` is green.
- Deploy the api (its `release_command` runs the migrations + grants).
- Deploy the web.

Or, from your local machine (bypasses the CI-green precheck — avoid for anything that isn't a hotfix):

```sh
flyctl deploy --config fly/api.fly.toml --remote-only
flyctl deploy --config fly/web.fly.toml --remote-only
```

## 8. Seed the database, once

```sh
fly ssh console -a sila-api \
  -C "sh -c 'DEMO_PASSWORD=$DEMO_PASSWORD EVALUATOR_PASSWORD=$EVALUATOR_PASSWORD npm run seed'"
```

The seed is idempotent on users; a re-run only re-stores results and re-grants the demo couple's consents.

## 9. Verify

```sh
# Replace with your actual web host (fly shows it after deploy).
export BASE_URL=https://sila-web.fly.dev

# Attack suite (demo-on profile since DEMO_MODE=true on the live site).
SILA_EXPECT_DEMO_MODE=true BASE_URL="$BASE_URL" npm run attack

# Playwright end-to-end (phone viewport).
BASE_URL="$BASE_URL" npx playwright install chromium
BASE_URL="$BASE_URL" npx playwright test

# Screenshots for the submission package.
BASE_URL="$BASE_URL" npm run screenshots
```

Update the "Live URL" line at the top of [README.md](../README.md), commit, and tag the release:

```sh
git tag v1.0.0-pilot
git push origin v1.0.0-pilot
```

## 10. Backups drill

Within 24 hours of the first deploy, run a test restore.

### Fly managed Postgres

```sh
# List automated snapshots.
fly mpg snapshots list sila-db
# Restore the latest to a new cluster.
fly mpg restore --snapshot <id> --name sila-db-restore --region fra
fly mpg connect sila-db-restore
# In psql: verify `select count(*) from users;` and `select count(*) from volunteers;`
# are the expected numbers from production.
# When done:
fly mpg destroy sila-db-restore
```

### Fallback (unmanaged) Postgres

Document the `pg_dump` cadence and keep two off-site encrypted copies. Run a restore drill to a throwaway cluster the same day. The volunteer data cannot be recreated once a session is done; the drill is non-optional.

## 11. Rotating the KEK in production

```sh
export SILA_KEK_NEXT=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")
fly ssh console -a sila-api \
  -C "sh -c 'SILA_KEK_NEXT=$SILA_KEK_NEXT npm run kek:rotate'"
fly secrets set -a sila-api SILA_KEK="$SILA_KEK_NEXT"
fly apps restart sila-api
```

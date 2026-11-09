# Sila security controls

**Audience.** The clinical adviser, the hosting owner, and anyone reviewing Sila before a pilot. Companion to [docs/threat-model.md](threat-model.md). The threat model lists what we are defending against; this document lists how. For the full list of invariants protected by tests, see the tables in the threat model.

## 1. Transport and edge

- HTTPS only at the edge. Render terminates TLS on `*.onrender.com`; HSTS is set from Next.js (one year, `includeSubDomains; preload`). HTTP requests redirect to HTTPS.
- Strict CSP on API responses (`default-src 'none'` — only JSON leaves). Looser CSP on Next.js pages, with the `'unsafe-inline'` residual risk recorded in the threat model.
- `trust proxy = 2` on Express. The two trusted hops are Render's edge proxy and Next.js in the same container. `req.ip` is the real client IP, not 127.0.0.1 — proven by `server/src/test/rateLimit.test.ts`.

## 2. Process isolation inside the container

Render's free plan runs one container per service. Sila's image runs two Node processes side by side:

- **Next.js** binds `0.0.0.0:$PORT` and serves the public site.
- **Express** binds `127.0.0.1:4000` and is only reachable via the Next.js rewrite inside the same container. There is no public listener for the API.

This is isolation by binding, not by network. The threat model notes it under residual risks: a process-level compromise inside the container reaches both.

## 3. Database access control

- Two Postgres roles: `sila_owner` owns the schema and runs migrations; `sila_app` is the runtime. `sila_app` has `SELECT` + `INSERT` only on `audit_log`, full CRUD on the data tables, and owns nothing. CI runs the real role tests against Postgres 16 (`server/src/test/roles.test.ts`, 7 tests, skipped locally under PGLite).
- The API refuses to start in production if `current_user` is not `sila_app`, is a superuser, or owns any table in `public` (`server/src/lib/preflight.ts`). This is a belt-and-braces check: if someone misconfigures `DATABASE_URL` with the owner credentials, the process exits before it serves a single request.
- Append-only trigger on `audit_log` blocks `UPDATE`, `DELETE`, `TRUNCATE` even if the role grants were weakened. Each row stores `prev_hash` and a chained SHA-256 of its canonical JSON. `npm run audit:verify` walks the chain.

## 4. Password hashing

Sila hashes passwords with **argon2id**, parameters **m=19 MiB, t=2, p=1** (OWASP ASVS 4.0 Password Storage Cheat Sheet minimums).

The previous setting was m=64 MiB, t=3. The downgrade was a deliberate operational choice when Sila moved to Render's free tier: at 512 MB total memory, Next.js and Express together left roughly 160 MB for each Node process. One concurrent login at m=64 MiB would have pushed Node's heap and argon2's working memory over the per-process cap and risked an OOM kill. m=19 MiB keeps argon2 well inside the cap while still meeting the published minimum for a general-purpose web app in 2024–2026.

**What we accept.** A future offline cracker with a GPU farm can test argon2id at m=19 MiB several times faster than at m=64 MiB. For the pilot — synthetic data only, demo accounts with long randomly generated passwords, no real users — this is a conscious trade-off. For a real pilot with real users we would move to a paid instance and go back to m≥64 MiB. Documented here so a future reader does not mistake this for inattention.

**Rehash on login.** `argon2.needsRehash()` is called on every successful login. If a stored hash's parameters differ from the current `ARGON2_OPTIONS`, the password is quietly re-hashed and the row updated, inside the same request. A failed rehash does not fail the login; the next login will try again. Proven by `server/src/test/loginRehash.test.ts`.

## 5. Sessions and CSRF

- Sessions are 64 hex chars generated with `crypto.randomBytes`, stored server-side in `sessions`. The cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Logout deletes the row; the next request with the same cookie returns 401.
- Every state-changing request (not `GET`, not `HEAD`) requires the per-session CSRF token in an `x-csrf-token` header that matches the server-side value. Volunteer routes are code-authenticated via `x-volunteer-code` — see the threat model for why CORS blocks that header cross-origin.

## 6. Rate limiting

- Login: `express-rate-limit` keyed on `(real client IP, lower-cased email)`, 20 attempts per 15 minutes. Because `trust proxy = 2`, the IP part is the real client, not 127.0.0.1 — see `rateLimit.test.ts`.
- Participant code probes: the code alphabet is 27 characters and codes are 10 chars long, giving ~48 bits of entropy. The volunteer code is HMAC-indexed; probing requires a valid HMAC lookup per guess, with normal rate-limiting via Render's edge.

## 7. Vault encryption

- Each person has a random 256-bit data key, wrapped by `SILA_KEK` (from env). The DB stores only wrapped keys.
- Results are AES-256-GCM, 12-byte IV, AAD `person:<id>|record:<id>|v<version>`. AAD-binding means a ciphertext moved between vaults fails to decrypt (`vault.test.ts`).
- Deleting a person's wrapped data key crypto-shreds their results. This is the "withdraw and delete" feature.
- `SILA_KEK` can be rotated with `npm run kek:rotate` using `SILA_KEK_NEXT`; the script rewraps every row and increments `key_version`. Proven idempotent by `kekRotate.test.ts`.

## 8. Dependency hygiene

- `npm audit --audit-level=high --omit=dev` runs on every CI build.
- `gitleaks detect` runs on every CI build.
- No real Postgres credentials are committed; `.env.example` lists keys only.

## 9. Backups

- Daily encrypted logical backup via `.github/workflows/backup.yml`: `pg_dump --format=custom` piped to `age -r $AGE_RECIPIENT`, retained as a GitHub Actions artifact for 30 days.
- The age private key is held by the operator in their password manager and in `~/.sila/sila-backup-key.txt` (chmod 600). It is never in the repo and never in a GitHub secret.
- A restore drill into a throwaway Neon branch runs once before any volunteer uses the live site (see [deploy-runbook.md §10](deploy-runbook.md)).

## 10. What protects what: at a glance

| Control | Protects against | Proof |
| --- | --- | --- |
| argon2id + rehash on login | Offline cracking of leaked hashes | `password.test.ts`, `loginRehash.test.ts` |
| Role separation (`sila_app` least-privilege) | A compromised API process rewriting the audit log | `roles.test.ts` (CI) |
| Append-only trigger + hash chain on `audit_log` | Tampering with history by any role | `audit.test.ts` |
| Preflight startup check | A misconfigured `DATABASE_URL` giving owner rights | `preflight.ts` (exits process) |
| trust proxy = 2 + rate-limit per (IP, email) | One person's failed logins locking out everyone | `rateLimit.test.ts` |
| CSP `default-src 'none'` on API | XSS reaching JSON responses | `securityHeaders.test.ts` |
| Pool wake-retry | Neon suspend/resume flakiness on first request | `dbWake.test.ts` |
| AAD-bound vault envelope | Ciphertext relocation attacks | `vault.test.ts` |
| CSRF token per session | Cross-site state-changing requests | `attack/cases/csrf.ts` |
| Binding Express to 127.0.0.1 | API exposed on the public internet | start.sh + Dockerfile |

# Sila threat model

**Audience.** The clinical adviser, the hosting owner, and anyone reviewing Sila for a pilot.
**Status.** Working document. STRIDE threats are listed per component with the current control and the test that proves it; people threats (not only attackers) have their own section; residual risks are listed honestly at the end.

---

## 1. Data-flow diagram

```mermaid
flowchart LR
    subgraph Browser["Participant browser"]
        UI[Next.js app at /]
        VOL[Volunteer flow at /volunteer]
    end
    subgraph Edge["Render container (Frankfurt)"]
        NX[Next.js on 0.0.0.0:$PORT]
        EX[Express on 127.0.0.1:4000]
        NX -- rewrite /api/* --> EX
    end
    subgraph API["Express API (sila_app role)"]
        AUTH[/api/auth/*]
        ME[/api/me/*]
        PA[/api/partner/*]
        CO[/api/consent/*]
        CP[/api/couple/risk]
        REL[/api/relatives/*]
        REF[/api/referrals/*]
        COUN[/api/counsellor/*]
        EVAL[/api/evaluator/*]
        VOLR[/api/volunteer/*]
        DEMO[/api/demo/*]
        DEV[/api/dev/*]
    end
    subgraph DB["Postgres 16"]
        U[(users / sessions)]
        V[(vault_keys / vault_results)]
        C[(consents / partner_links / relatives)]
        REFT[(referrals / referral_steps)]
        VOLT[(volunteers / quiz_responses / time_to_referral_events)]
        A[(audit_log — append-only, hash-chained)]
    end
    subgraph Secrets["Secrets"]
        KEK[SILA_KEK — Render env + password manager]
        SS[SESSION_SECRET — Render env]
        VHK[VOLUNTEER_HMAC_KEY — Render env]
        OWN[sila_owner password — GitHub secret only]
        APP[sila_app password — Render env as DATABASE_URL]
        DP[DEMO_PASSWORD / EVALUATOR_PASSWORD — Render env]
    end
    LAB[Simulated lab]:::ext --> V

    UI --> NX --> EX --> API
    VOL --> NX --> EX --> VOLR
    AUTH --> U
    ME --> V
    ME --> A
    PA --> C
    CO --> C
    CP --> V
    CP --> A
    REL --> C
    REF --> REFT
    REF --> A
    COUN --> V
    COUN --> A
    EVAL --> VOLT
    EVAL --> A
    VOLR --> VOLT
    DEMO --> U
    DEV --> A
    API -. KEK, SESSION_SECRET .-> Secrets

    classDef ext fill:#eee,stroke:#bbb,color:#333;
```

---

## 2. STRIDE per component

Each row names the threat, the control that addresses it, and the test or
mechanism that proves it. "T" below means a test file in `server/src/test/`
or `attack/cases/`.

### 2.1 Auth and sessions

| Threat | Control | Proof |
| --- | --- | --- |
| **S**poofing another user's session | Session ids are 64 hex chars; stored server-side; carried in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in prod) | T: `attack/cases/sessions.ts` (rotation on login, logout invalidation, cookie flags) |
| **T**ampering with the session row | Sessions are app-written only; the policy module re-checks on every request | T: `auth.test.ts`, `audit.test.ts` |
| **R**epudiation of a session action | Every personal-data read/write writes an `audit_log` row with actor, action, target, outcome | T: `audit.test.ts` (chain verify), `couple.test.ts`, `counsellor.test.ts` |
| **I**nformation disclosure of a password | argon2id hash only; plaintext never logged (log redactor) | T: `auth.test.ts` ("stores a password hash, not the plaintext"), `logRedact.test.ts` |
| **D**enial of service via credential stuffing | `express-rate-limit` per `(ip, email.toLowerCase())`, 20 attempts / 15 min | T: `attack/cases/brute_force.ts` |
| **E**levation of privilege via mass assignment on signup | zod schema accepts only `email`, `password`, `locale`; `role` defaults to `person` server-side | T: `attack/cases/escalation.ts` |

### 2.2 Vault (encrypted carrier results)

| Threat | Control | Proof |
| --- | --- | --- |
| **S**poofing a data key owner | AAD binds every wrap to `kek:<userId>|v<ver>`; per-record AAD is `person:<id>|record:<id>|v<ver>` | T: `vault.test.ts` ("ciphertext moved to another person's vault row fails to decrypt") |
| **T**ampering with ciphertext | AES-256-GCM authenticated encryption | T: `vault.test.ts` ("tampered ciphertext fails to decrypt") |
| **R**epudiation of a vault read | Every `/api/me/result` and `/api/couple/risk` request appends an audit entry | T: `audit.test.ts` (denied-then-allowed matrix) |
| **I**nformation disclosure of plaintext at rest | Plaintext never stored; `vault_results` row has no plaintext variant id | T: `vault.test.ts` ("does not store plaintext variant ids") |
| **D**enial of service by key loss | `SILA_KEK` can be rotated by `npm run kek:rotate`; old wrapped keys continue to work until rotation completes | T: `kekRotate.test.ts` |
| **E**levation via DB access | `sila_app` role has `SELECT`, `INSERT` only on `audit_log`, cannot `UPDATE`/`DELETE`/`TRUNCATE`/`ALTER` even if they obtained the password | T: `roles.test.ts` (runs in CI against real Postgres) |

### 2.3 Consent and policy

| Threat | Control | Proof |
| --- | --- | --- |
| **S**poofing another person's consent | `grantorId` is pinned from the session; routes never trust a body `grantorId` | T: `consent.test.ts` |
| **T**ampering with a consent row to extend access | Consents are checked fresh (`hasActiveConsent`) on every request; revoke sets `revokedAt` | T: `coupleRisk.test.ts` (revoke-takes-effect) |
| **R**epudiation of a grant or revoke | `grant_consent` and `revoke_consent` are audit-logged with purpose, target and scope | T: `audit.test.ts` |
| **I**nformation disclosure via couple view | `CoupleView` collapses engine reasons to couple-level labels and never includes per-person fields | T: `coupleRisk.test.ts` ("no per-person fields"), `routeInventory.test.ts` |
| **D**enial via noisy revokes | Idempotent by design; revoke returns `{revoked: n}` with no state change on n=0 | T: `relatives.test.ts`, `consent.test.ts` |
| **E**levation to counsellor view | `requireCounsellorRole` + `canCounsellorRead` must both pass | T: `counsellor.test.ts` |

### 2.4 Audit log

| Threat | Control | Proof |
| --- | --- | --- |
| **T**ampering with history | Append-only trigger blocks UPDATE/DELETE/TRUNCATE; row-level hash chain | T: `audit.test.ts` ("DB-level mutation fails", "chain tamper detected") |
| **R**epudiation by the app role | The app role has `SELECT, INSERT` only on `audit_log`; cannot disable the trigger | T: `roles.test.ts` |

### 2.5 Volunteer mode

| Threat | Control | Proof |
| --- | --- | --- |
| **S**poofing a participant | `volunteer.id` is HMAC-SHA256(SESSION_SECRET, "volunteer:" + code); raw code never stored | T: `anonymity.test.ts` |
| **T**ampering with a response | `onConflictDoNothing` + unique index prevents double-submission; withdraw deletes everything | T: `quiz.test.ts`, `ttr.test.ts` |
| **R**epudiation by a volunteer | Withdraw is the escape hatch; the row is gone afterwards | T: `volunteer.test.ts` |
| **I**nformation disclosure via /me | /me, /consent, /complete never echo the code back; application logs are redacted | T: `anonymity.test.ts` (log capture) |
| **D**enial of service via random-code probing | Participant codes are 10 chars from a 27-char alphabet (~48 bits of entropy) | T: `attack/cases/brute_force.ts` |
| **E**levation to evaluator aggregates | Aggregates require role `evaluator`; cells with n<5 hidden | T: `evaluator.test.ts` |

---

### 2.6 Admin (staff administration)

The highest-value account in Sila: an admin can create new staff accounts of any role, and can deactivate any existing staff account. **An admin cannot read any person's data.**

- **What an admin CAN do.**
  - Create a counsellor, lab, evaluator or admin invite via `POST /api/admin/invite`.
  - Regenerate (revoke + reissue) or revoke a pending invite.
  - Deactivate or reactivate any staff account. Deactivation sets `users.status = 'deactivated'` and deletes every live session for that user (`session.ts :: deleteSessionsForUser`), so the deactivated account is forced out at the next request even if their cookie is still warm.
  - See the staff roster (email, role, status, last login).
  - See the admin-action feed (`admin_*` audit entries only).
- **What an admin CANNOT do.** None of these endpoints exist for `role = 'admin'`: `/api/me/result`, `/api/me/access-log`, `/api/me/sila-id`, `/api/couple/risk`, `/api/consent`, `/api/partner`, `/api/relatives`, `/api/referrals`, `/api/counsellor/queue`, `/api/evaluator/*`. The `requirePersonRole`, `requireLabRole` and admin-only guards on each of those routes return `403` and write a denied-by-role audit entry. `attack/cases/admin_lab.ts` probes all eight person routes with a signed-in admin cookie and expects 403 on every one; the admin-action feed is filtered to `admin_%` so even an admin's own view never shows person-scoped audit rows.
- **Bootstrap.** The first admin is only ever created by `npm run admin:create` from a trusted shell. The script writes a deactivated placeholder row and an invite; the admin then opens `/invite/<code>`, sets a password, enrols TOTP and receives recovery codes. **No default admin exists and no admin credential is ever placed in env.** The admin bootstrap CLI refuses if an active admin for that email already exists and refuses to reuse a person email.
- **Second factor.** `POST /api/auth/login` requires a TOTP code for any staff account with an `admin_totp` row. The TOTP library is in-house (`server/src/lib/totp.ts`), RFC 6238, verified with a ±1-step window. Recovery codes are SHA-256 hashed in storage and single-use.
- **Demo admin.** In `DEMO_MODE`, `admin@demo.sila` is reachable via `/api/demo/login` (never via `/api/auth/login`). That endpoint is 404 outside `DEMO_MODE`. The demo admin exists so judges can walk through the staff-management flow without enrolling a real authenticator; this is called out in the dashboard and in `docs/assumptions-and-limitations.md`.

### 2.7 Lab (result submission)

Lab accounts can **write results into a person's vault but can never read them back**.

- **What a lab CAN do.** `POST /api/lab/submit {silaId, results}` — requires the lab role and a valid CSRF token; validates the payload against the current `panel.ts` (unknown genes or alleles are rejected); writes the ciphertext via the vault service with AAD binding to the person's id + record id. Submissions are rate-limited to 100 per 15 minutes per lab account.
- **What a lab CANNOT do.** There is no `GET` in `/api/lab/*`. `attack/cases/admin_lab.ts` confirms a signed-in lab session gets 403 on `/api/me/result`, `/api/couple/risk`, `/api/consent` and `/api/referrals`.
- **Sila ID.** The identifier a person hands to the lab is a 10-character base32 string derived from `HMAC_SHA256(user.id, SILA_ID_SALT)`. Nothing in the display reveals the underlying UUID; a leaked Sila ID discloses no other field. Reverse lookup scans the users table (O(N), fine at pilot scale).
- **Demo lab constraint.** `lab@demo.sila` can only submit to accounts with no existing result; it cannot overwrite seeded results. `attack/cases/demo_on.ts` would need extending to prove this; the unit test `demoScoping.test.ts` confirms it.

## 3. People threats

Not every threat is an attacker. Three real-world threats that no amount of cryptography removes:

- **A partner or family member pressuring someone to share or not to revoke.**
  - Sila's controls: revocation takes effect on the next request (verified by `coupleRisk.test.ts`), the access log is user-visible (`/access-log`), the couple view never reveals which partner carries what (collapsed reasons, verified by `coupleRisk.test.ts`).
  - What Sila cannot do: it cannot stop someone looking over a shoulder, and it cannot tell whether a grant was given freely. The information sheet on `/volunteer` (and the consent screens for the app) say explicitly that consent can be withdrawn at any time. The pilot training must make this plain to volunteers.
- **A malicious or careless counsellor.**
  - Sila's controls: counsellor access is per-person, per-referral, revocable (`counsellor_access` consent); every counsellor read and every step write is audit-logged; counsellors cannot read a result without an active grant; counsellor queue items carry no plaintext variant id.
  - What Sila cannot do: once a counsellor has seen a result, they remember it. Downstream disclosure outside Sila is a professional-conduct matter, not a technical control.
- **Someone reading a shared phone.**
  - Sila's controls: session cookies are `HttpOnly` + `SameSite=Lax`; logout invalidates server-side; all consent and partner actions require CSRF; the access log makes a hostile read visible later.
  - What Sila cannot do: if the user is logged in and hands the phone over, nothing we can do at the server. The UI exposes a visible "Log out" button in the top-right of every signed-in page.

---

## 4. Hosting topology and data processors

- **Render** runs the Sila container in the `frankfurt` region. It terminates TLS at its edge, forwards HTTPS to the container, and provides daily automated image rebuilds. Render stores the service's environment variables encrypted at rest. Render acts as a **processor of synthetic data and anonymous quiz answers only**. The private key for the backup artifacts is not on Render.
- **Neon** runs the Postgres database in the Frankfurt region. Automated base backups run in Neon's platform; our own encrypted logical backup runs daily in GitHub Actions and is held outside both Render and Neon (as a GitHub Actions artifact plus the private key in the operator's password manager). Neon acts as a **processor of synthetic data and anonymous quiz answers only**.
- **Process isolation inside the container.** Render's free plan runs a single container per service. The Sila image runs two Node processes side by side: Next.js (`0.0.0.0:$PORT`, public) and Express (`127.0.0.1:4000`). The API has no public listener — Next.js reaches it via a rewrite inside the container. This is isolation by **binding**, not by a private network: anything that compromises the Next.js process can also reach the API. For the pilot this is an accepted trade-off (free hosting, synthetic data); a real pilot would use two services on a private network.

## 5. Residual risks (named honestly)

- **Device compromise.** If the participant's device is compromised while they are logged in, the attacker inherits the session.
- **Lab trust.** The simulated lab is trusted to upload correct results. In production, the clinical adviser will specify who may hold the `lab` role and how uploads are authenticated beyond password.
- **KEK custody.** `SILA_KEK` is on Render (encrypted at rest). If both the KEK and the database are exfiltrated, the attacker can decrypt. KEK rotation (`npm run kek:rotate`) limits the blast radius of a point-in-time leak but does not undo a historical one.
- **argon2 parameters.** Passwords are hashed at m=19 MiB, t=2, p=1 — the OWASP ASVS minimum, chosen so Next.js and Express fit together in Render's free 512 MB instance. The previous Sila setting was m=64 MiB, t=3. The trade-off and the rehash-on-login policy are documented in [docs/security-controls.md §4](security-controls.md).
- **Shared-container trust boundary.** Because the API binds to `127.0.0.1` instead of a private network, a compromise of the Next.js process or of the base image reaches the API immediately. This is called out under "Hosting topology" above; acceptable for a synthetic-data pilot, not for real patient data.
- **Clinical sign-off is still pending.** Every template on the app is `status: draft` until the clinician flips it. Shipping before approval would misrepresent the wording.
- **Postgres role enforcement in CI only.** The role-privilege test (`roles.test.ts`) runs against real Postgres in CI; local PGLite does not exercise it. The CI pipeline is therefore the gate.
- **No CSRF on volunteer endpoints.** Volunteer routes are code-authenticated via a header that cannot be set from a cross-origin web page (fetch cannot send a custom header without a preflight that will be blocked without CORS allowance). Documented as adequate; worth re-checking if a browser extension context becomes in-scope.
- **Static review-sheet files on disk.** `npm run review:export` writes CSVs with bilingual draft text under `data/review/`. Those files are kept out of git (`/data/review/` is `.gitignore`-d) but exist on the local disk. Clear the folder after sharing with reviewers.
- **Next.js CSP allows `'unsafe-inline'` for scripts (and styles).** The Content-Security-Policy on every Next.js page is:
  ```
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src  'self' 'unsafe-inline';
  img-src    'self' data:;
  font-src   'self' data:;
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'none';
  form-action 'self';
  object-src 'none'
  ```
  For scripts specifically: `'self'` (same-origin bundles) and `'unsafe-inline'` (inline `<script>` blocks that contain source directly). Next.js injects a couple of inline scripts for hydration and for streaming; stripping `'unsafe-inline'` requires serving a per-request **nonce** from middleware and threading it through every inline script, which Next.js 16 supports but needs testing.
  The pragmatic choice for the 20 Nov submission is to keep `'unsafe-inline'` and record it here. Everything else is locked down: scripts cannot be loaded from a different origin, `object-src` and `frame-ancestors` are `'none'`, `base-uri` is `'none'`, form posts stay same-origin. The API's own CSP is still `default-src 'none'` since it only returns JSON. **Follow-up for post-pilot**: implement the Next.js nonce middleware pattern and tighten `script-src` to `'self' 'nonce-<rand>'`.

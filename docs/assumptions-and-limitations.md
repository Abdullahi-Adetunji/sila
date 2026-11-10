# Assumptions and limitations

**Audience.** Judges, reviewers and anyone deciding whether Sila is safe to touch real data.

## 1. Headline assumption

**All data in the deployed submission is synthetic.** `scripts/generate-synthetic.ts` builds 100 couples with a fixed seed and no real person's data is used. The lab account `lab@demo.sila` is a placeholder for a real lab feed; it exists only to upload synthetic results during `npm run seed`.

## 2. What we assume

- Participants in the volunteer flow are informed via the info sheet and consent screen before any quiz question runs. They can withdraw via their participant code, which deletes every quiz response and every time-to-referral event they produced.
- A clinical adviser will sign off every explanation template and every quiz item before any real data touches Sila. Until then every item is `status: draft`.
- The native Arabic reviewer will sign off every Arabic string. The Arabic draft today is machine-reviewed by the dev team only.
- The engine's panel (HBB, CFTR, GJB2) is complete for the prototype. Panel composition, severity labels and escalation rules are clinician-owned (see [panel-decisions.md](panel-decisions.md)).
- Pre-marital or pre-conception couples run the flow together (two sessions, mutual consent). Sila does not try to model single-partner cases on the couple screen — that screen is 403 until both consent.
- Counsellors are trusted professionals. Sila's controls limit what a counsellor sees (per-referral `counsellor_access`); it cannot stop a counsellor sharing information outside Sila.
- `DEMO_MODE=true` is appropriate for the submission host so judges can click through. Judges and volunteers use the same URL. The demo reset is scoped to demo accounts only (tested in `demoScoping.test.ts`).

## 3. What we do not claim

- **Not a diagnosis.** Carrier screening and couple risk are chances, not clinical decisions. Every couple result page carries this line.
- **Not a recommendation to marry or not to marry.** This is explicit on the landing page and on the options page.
- **Not a prediction about individual pregnancies.** The engine reports the Mendelian chance per pregnancy and the templates state plainly that "the chance is the same in every pregnancy, whatever happened in earlier pregnancies."
- **Not a complete panel.** Residual risk is acknowledged in `residual_risk.general` and in the "no variant found" template.
- **No AI in the risk calculation.** The engine is deterministic Mendelian arithmetic in `src/lib/genetics/engine.ts`.
- **No AI in the clinical text.** Every user-facing explanation comes from a fixed template in `src/content/templates/catalog.ts`.

## 3b. Staff administration (single login, admin-created staff, TOTP in prod)

- **One `/login` for everyone.** Person, counsellor, lab, evaluator and admin all use the same page. After login, each role is sent to its own start page (`/home`, `/counsellor-queue`, `/lab`, `/evaluator`, `/admin`) and its navigation shows only its own pages. Server-side `requirePersonRole` / `requireLabRole` / `requireAdminRole` middleware returns 403 on cross-role access, audit-logged on every attempt.
- **Signup always creates a `person`.** The zod schema on `/api/auth/signup` has no `role` field; staff accounts can never be created through signup, only via the admin invite flow.
- **Staff accounts come from an admin, not from a seed.** The first admin is created by `npm run admin:create` from a trusted shell; it prints a one-time setup URL to stdout and does not send email. Every subsequent staff account (counsellor, lab, evaluator, additional admins) is created through `/admin` by an existing admin.
- **TOTP second factor is required for every staff account in production.** `POST /api/auth/login` returns `401 { error: "totp_required" }` for any staff account that has an `admin_totp` row; the login page then reveals a 6-digit input and re-submits. The TOTP library is in-house (no third-party), RFC 6238, ±1-step verification window, SHA-256-hashed recovery codes.
- **The demo admin skips TOTP — DEMO_MODE only.** `admin@demo.sila` is reachable only through the one-click panel on the landing page, which calls `/api/demo/login`. That endpoint is 404 outside `DEMO_MODE`. The seeded demo admin exists so judges can exercise the admin dashboard without enrolling a real authenticator. In a production deployment (`DEMO_MODE=false`), no such bypass exists; the admin must enrol TOTP via `/invite/<code>` like every other staff account.
- **Admins never read person data.** The admin role has no `/api/me/*`, `/api/couple/*`, `/api/consent/*`, `/api/partner/*`, `/api/relatives/*`, `/api/referrals/*`, `/api/counsellor/*`, or `/api/evaluator/*` route. `attack/cases/admin_lab.ts` probes all of them with a signed-in admin cookie and expects 403 on every one.
- **Deactivation is instant; accounts are never deleted.** Deactivating a staff account sets `users.status = 'deactivated'`, deletes every live session for that user, and the row stays so the audit chain remains intact. An admin cannot deactivate themselves (avoids the last-admin-locks-themselves-out footgun) and cannot touch person accounts (persons use the withdraw flow).

## 4. Known limitations

- **Phase of two variants.** A screening report often does not state whether two variants in the same gene are on the same copy (cis) or on different copies (trans). The engine treats `variants.length === 2` as `affected`; the `individual.affected` draft template hedges accordingly. Resolving this cleanly needs the clinician's call (see [panel-decisions.md](panel-decisions.md) decision 9).
- **Sickle beta thalassaemia severity.** The combined phenotype is `variable` and routes to `counsellor`, not `counsellor_priority`. The clinician must choose whether to split the beta allele into β⁰ and β⁺ (decision 1).
- **GJB2 hearing loss inclusion.** On the panel today at `moderate`. Culture-sensitive; the clinician's call (decision 2).
- **CFTR variant scope.** One abstract allele in the prototype; a real panel would list specific variants (decision 3).
- **Consanguinity.** No question is asked and no data is stored. The explainer template is a draft proposal (decision 7).
- **Disclosure of a possible condition in the person themselves.** The current UI shows `individual.affected` directly with a referral prompt. The alternative ("hold until counsellor contact") is open (decision 8).
- **CSP for Next.js scripts.** Keeps `'unsafe-inline'` because switching to nonces needs middleware testing. Documented in [threat-model.md](threat-model.md); follow-up is to move to nonces post-pilot.
- **Postgres role enforcement is covered in CI only.** Local PGLite tests do not exercise it; the GitHub Actions run against real Postgres is the gate.
- **Time-to-referral and comprehension cells show numbers only when n ≥ 5.** At the submission scale we expect many hidden cells. No cell is ever estimated.
- **Volunteer data retention.** Deleted on 30 November 2026 per [data-governance.md](data-governance.md).

## 5. Not in scope for this submission

- Direct lab integration with a real LIS.
- A production-grade KMS or HSM for the KEK. The pilot uses `fly secrets`.
- Scheduled attack-suite runs (weekly). Today it runs at deploy time.
- Mobile apps. The web app is phone-first and works in any modern browser, but there is no iOS or Android package.
- Multi-tenant / organisation isolation. One Sila deployment serves one cohort.

# Evaluation results

**Audience.** The clinical adviser, judges, and anyone reading the submission.

**Status.** Methods + table structures are in place. Numeric cells are **intentionally empty** until the volunteer sessions complete and the clinician import runs. The dev team will not estimate, infer or invent any value here. Cells remain blank, not zero.

## 1. Method

### 1.1 Risk and escalation accuracy

- Ground truth: the clinical adviser's answers in `data/synthetic/clinician_review.csv`, one row per synthetic couple.
- Engine output: the exact Mendelian routing from `assessCouple` per couple, generated with a fixed seed.
- `npm run clinician:import` compares the two and writes a run row with per-row pct scores and a list of mismatches.
- The evaluator dashboard shows the latest run under "Risk accuracy (clinician import)".

### 1.2 Comprehension (before and after)

- Two parallel forms A and B, each covering the same eight concepts: carrier vs affected; chance per pregnancy; independence between pregnancies; risk vs diagnosis; residual risk; consanguinity; uncertainty; neutrality.
- The neutrality item is a distribution, not a score.
- The form order is randomised at `/volunteer/join` (AB or BA). A volunteer sees form X before the explanation and form Y after, where X ≠ Y.
- Scoring is server-side; the correct index is never returned to the client.
- Cells on the dashboard are **by language** or **by reading band** — never crossed. Every cell with n < 5 is hidden. No totals are shown.

### 1.3 Time to referral

- Captured only in real volunteer sessions. The server records three milestones: `opened_result`, `opened_referral_form`, `submitted_referral`.
- The dashboard reports median elapsed minutes and median click count, by language and by reading band, with n ≥ 5 per cell.
- No value is simulated or seeded.

### 1.4 Privacy and access control

- Vitest privacy suite writes `data/review/privacy_report.json` after every `npm test`. The report lists per-file pass counts; a passing privacy test is a blocked access attempt.
- Black-box attack suite (`npm run attack`) writes `data/review/attack_report.json`. The evaluator dashboard shows both.

### 1.5 Equity across language and reading comfort

- Comprehension cells by language (en, ar) show before %, after %, and change.
- Comprehension cells by reading band (low, medium, high, unknown) show the same columns.

## 2. Results

**The cells below are blank by design.** They will be filled from the dashboard CSV exports after the volunteer sessions and the clinician import. If a cell is blank at submission time, that is the truthful state.

### 2.1 Risk accuracy (clinician import)

| metric | value |
| --- | --- |
| Rows reviewed |  |
| Risk agreement (%) |  |
| Escalation agreement (%) |  |
| Mismatches |  |

### 2.2 Comprehension by language

| language | n | before % | after % | change |
| --- | --- | --- | --- | --- |
| en |  |  |  |  |
| ar |  |  |  |  |

### 2.3 Comprehension by reading band

| band | n | before % | after % | change |
| --- | --- | --- | --- | --- |
| low |  |  |  |  |
| medium |  |  |  |  |
| high |  |  |  |  |
| unknown |  |  |  |  |

### 2.4 Time to referral by language

| language | n | median clicks | median minutes |
| --- | --- | --- | --- |
| en |  |  |  |
| ar |  |  |  |

### 2.5 Time to referral by reading band

| band | n | median clicks | median minutes |
| --- | --- | --- | --- |
| low |  |  |  |
| medium |  |  |  |
| high |  |  |  |
| unknown |  |  |  |

### 2.6 Privacy test results (latest Vitest run)

| metric | value |
| --- | --- |
| Blocked attempts (passed privacy tests) | 80 |
| Failed privacy assertions | 0 |
| Last run | 2026-11-10T10:52:59Z |

### 2.7 Attack suite results (latest black-box run)

| metric | value |
| --- | --- |
| BASE_URL | https://sila-a7fx.onrender.com |
| Cases passed | 31 |
| Cases failed | 0 |
| Last run | 2026-11-10T10:59:18Z |

Coverage: IDOR (×4), CSRF (×4), consent revocation takes effect immediately for every purpose (×5), session hygiene incl. id rotation + logout invalidation + cookie flags (×3), brute-force resistance incl. login cap + XFF-spoof resistance + random partner-invite + random participant-code (×4), privilege escalation incl. mass-assignment + cross-role (×3), **counsellor hits 403 on every person-only API route (×1, covers 13 routes)**, demo-mode-off assurances (×3), and demo-on scoping (×4).

### 2.8 Accessibility (axe, WCAG 2.2 AA)

Automated axe sweep via `@axe-core/playwright`, run against the live site. Scans: eight pages (landing, login, signup, me, couple, consent, options, volunteer), two languages (English + Arabic where a LangSwitch is present), two viewports (phone 400×900, desktop 1280×800). Serious and critical violations fail the test; moderate and minor land in `data/review/a11y_report.jsonl` for review.

| metric | value |
| --- | --- |
| BASE_URL | https://sila-a7fx.onrender.com |
| Scans | 26 (13 page+lang combinations × 2 viewports) |
| Serious or critical violations | 0 |
| Last run | 2026-11-10T11:00Z |

### 2.8 Neutrality distribution (from the neutrality quiz item)

| answer | count |
| --- | --- |
| no, it felt neutral |  |
| a little |  |
| yes, it pushed me |  |

## 3. Caveats

- No significance claims are made at this sample size. The pilot's purpose is to check whether the explanations and the flow work, not to draw statistical conclusions.
- Every explanation and every quiz item was still `status: draft` on the day sessions began unless the clinician signed them off; any item whose `approved_by` is still `null` is marked in the review CSV.

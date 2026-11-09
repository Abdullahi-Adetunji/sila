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
| Blocked attempts (passed privacy tests) |  |
| Failed privacy assertions |  |
| Last run |  |

### 2.7 Attack suite results (latest black-box run)

| metric | value |
| --- | --- |
| BASE_URL |  |
| Cases passed |  |
| Cases failed |  |
| Last run |  |

### 2.8 Neutrality distribution (from the neutrality quiz item)

| answer | count |
| --- | --- |
| no, it felt neutral |  |
| a little |  |
| yes, it pushed me |  |

## 3. Caveats

- No significance claims are made at this sample size. The pilot's purpose is to check whether the explanations and the flow work, not to draw statistical conclusions.
- Every explanation and every quiz item was still `status: draft` on the day sessions began unless the clinician signed them off; any item whose `approved_by` is still `null` is marked in the review CSV.

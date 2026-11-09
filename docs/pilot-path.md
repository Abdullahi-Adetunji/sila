# Pilot path

**Audience.** The clinical adviser, the hosting owner and anyone deciding whether to run a Sila pilot at a real clinic or community site.

## 1. Who could run a pilot

A pilot would need:
- **A clinical adviser** (genetic counsellor or medical geneticist) to sign off every explanation template and every escalation rule, to fill in `data/synthetic/clinician_review.csv`, and to review open panel decisions in [panel-decisions.md](panel-decisions.md).
- **A native Arabic reviewer** to approve every Arabic string.
- **A pilot host** with clinical governance and a point of contact for referrals (hospital genetics clinic; community genetics programme; pre-marital counselling centre).
- **A simulated or real lab feed.** In the prototype, `lab@demo.sila` uploads results during `npm run seed`. A pilot would need either a continuation of that simulation or a real lab integration (see Production changes).
- **Ethics approval + a DPIA** for the jurisdiction the pilot runs in.

## 2. What the pilot measures

The same six axes the submission's scoring maps to:
- Risk accuracy: engine answers vs clinician answers on the 100 synthetic couples.
- Escalation accuracy: do priority cases reach the counsellor queue? do information cases stay out?
- Comprehension: before vs after on the 8-concept quiz, by language and by reading band (no crossed tables, n ≥ 5).
- Time to referral: real clicks and real elapsed minutes between opening the couple result and submitting a referral.
- Privacy: passed/failed attempt counts from the Vitest privacy suite and the black-box attack suite.
- Equity: comprehension and completion compared across en/ar and across reading comfort bands.

All six are read from the evaluator dashboard (`/evaluator`, role `evaluator`) and can be exported as CSV per card.

## 3. Rough costs (ESTIMATES, not quotes)

| Item | Monthly estimate (EUR) | Notes |
| --- | --- | --- |
| Fly.io web + api (shared-CPU, 256 MB each) | 5 – 15 | Single region `fra`. |
| Fly.io managed Postgres (shared-CPU, 1 GB RAM, 10 GB disk) | 15 – 25 | Daily snapshots; restore test scripted. |
| Domain + TLS | 0 | Fly issues Let's Encrypt automatically. |
| Backup storage for snapshots | 0 – 2 | 7-day retention default. |
| **Pilot total** | **~ EUR 20 – 42 / month** | Scales up with volunteer traffic. |

Human time dominates the true cost: ~2 hours per week of clinician time for review, ~1 hour per volunteer session, ~0.5 days of pilot-host time for safeguarding.

## 4. Changes before Sila could run on real data

- **In-country hosting.** Health-data regimes often require data residency. The current pick (Fly in `fra`) is fine for EU-scoped research; a pilot in the Gulf or North Africa would likely require in-region Postgres and compute.
- **Cloud KMS or an HSM for the KEK.** Today `SILA_KEK` is held in the host secret store (`fly secrets`). For real data, move it to AWS KMS, GCP KMS, Azure Key Vault or an HSM, with per-record decryption staying in the API process.
- **Real lab integration.** The simulated lab account must be replaced with a signed-upload API from a certified lab, or a point-to-point integration with a hospital LIS. The `lab` role must not be reachable by human login; service accounts only.
- **Ethics approval and a DPIA.** Every jurisdiction has its own flavour. The clinical adviser leads this.
- **Clinical governance.** A named clinician accountable for every referral, an escalation SOP for `counsellor_priority` routing, and a duty-of-care path when a counsellor becomes unavailable.
- **Monitoring and incident response.** Alerts for failed logins over threshold, for a broken audit chain, for a KEK-rotation failure, and for a `npm audit` or `gitleaks` finding in CI. On-call rota and a timed incident-response procedure.
- **A production-grade attack-suite run on a schedule** (weekly), not just at deploy time.
- **A documented withdraw-and-delete SLA** with evidence of execution for every request.

## 5. Residual risks (named in [threat-model.md](threat-model.md))

- Device compromise.
- Lab trust.
- KEK custody.
- CSP `'unsafe-inline'` for Next.js hydration scripts (follow-up: nonce middleware).
- Clinical sign-off is still pending for the pilot content.

These are not blockers for a volunteer-only pilot. They are blockers for touching real genetic data.

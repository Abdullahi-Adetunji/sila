# Open panel and escalation decisions

**Audience.** The clinical adviser.
**Status.** Decisions pending. These shape the panel and how couples are routed. The development team will not change the panel or the risk/routing rules without the clinician's sign-off (per CLAUDE.md non-negotiable rule 7).

---

## Decision 1. Severity of sickle beta thalassaemia (HbS + β)

**Where it lives.**
- [src/lib/genetics/panel.ts](../src/lib/genetics/panel.ts): the phenotype `["HbS", "beta"]` is tagged `severity: "variable"`.
- [src/lib/genetics/engine.ts](../src/lib/genetics/engine.ts): a child outcome whose `severity === "serious"` adds `shared_risk_serious` to the couple's reasons, which routes to `counsellor_priority`. Any other severity adds `shared_risk`, which routes to `counsellor`.

**What's at stake.** Sickle-β⁰ thalassaemia is clinically similar in severity to HbSS. Sickle-β⁺ thalassaemia is milder. By tagging the combined phenotype `variable` and routing it to `counsellor` (not priority), couples with sickle-β⁰ risk may not see the urgency signal that HbSS + HbS couples see.

**Options.**
- A. Keep `variable` and `counsellor` route. Trusts the counsellor to triage once reached.
- B. Split the panel into `beta0` and `beta+` alleles so HbS + β⁰ can be tagged `serious` while HbS + β⁺ stays `variable`. Requires lab reports to distinguish the two — confirm this is realistic for the pilot setting.
- C. Keep one `beta` allele but tag the combined phenotype `serious`. Escalates every HbS + β couple, including milder cases.

**Clinician's call.** Mark A, B or C here and we will update the panel and the tests together.

---

## Decision 2. Does GJB2 hearing loss (DFNB1) stay on the panel?

**Where it lives.**
- [src/lib/genetics/panel.ts](../src/lib/genetics/panel.ts): `GJB2` with phenotype `["GJB2-p", "GJB2-p"]` tagged `severity: "moderate"`.

**What's at stake.** Non-syndromic hearing loss is a culture-sensitive inclusion on a pre-marital or pre-conception carrier panel. Some communities ask for it, others decline it. Including it raises carrier-rate expectations for the user's cultural context and counsellor availability.

**Options.**
- A. Keep on the panel at `moderate`. Status quo.
- B. Keep on the panel but downgrade to `mild`, so HbS/HbC-like couples still route to `counsellor`.
- C. Remove GJB2 from the panel entirely for the pilot.

**Clinician's call.** Mark A, B or C here.

---

## Decision 3. CFTR variant scope

**Where it lives.**
- [src/lib/genetics/panel.ts](../src/lib/genetics/panel.ts): CFTR is modelled with one abstract allele `CFTR-p` ("Cystic fibrosis variant"). The lab therefore reports one of: no variant found, one copy of `CFTR-p`, or two copies of `CFTR-p`.

**What's at stake.** Real CFTR panels report specific variants (F508del, G551D, and so on), and some variant-variant combinations behave differently (classic CF vs CFTR-related conditions). Using one abstract allele is adequate for a prototype that counts carriers, but it cannot support differential severity.

**Options.**
- A. Keep one abstract allele for the pilot. Severity stays "serious" for homozygotes.
- B. Introduce a named-variant panel for CFTR before the pilot. Requires the clinician to confirm which variants, and the lab to report them.

**Clinician's call.** Mark A or B.

---

## Decision 4. Severity → route mapping

The engine escalates every `shared_risk_serious` and every `person_affected` to `counsellor_priority`. Every other reason (shared_risk, uncertain_result, partner_needs_testing) goes to `counsellor`. If no reason fires, the couple goes to `information`.

Confirm:
- `shared_risk_serious` is always priority — **yes / no**.
- `person_affected` is always priority — **yes / no**.
- `partner_needs_testing` is always counsellor (not priority) — **yes / no**.
- `uncertain_result` is always counsellor (not priority) — **yes / no**.
- Empty reasons go to `information` — **yes / no**.

---

## Decision 5. Residual-risk number

Right now the residual-risk template says "lowers the risk but does not remove it" without naming a number. Some services quote a residual carrier risk (e.g. "the residual risk for a Levantine Arab background is approximately X%"). We can:

- A. Keep the qualitative phrasing (no number). Lower risk of mis-stating.
- B. Add a number per gene for a specific population when the clinician provides sources.

If the clinician wants B, name the population and source and we will put the number in the template and cite it in a footer.

---

## Decision 6. "needs_review" wording vs minimum disclosure

The couple view uses `couple.needs_review` when the engine's reasons include `person_affected`. The wording is deliberately vague ("A specialist should review this result with you before any couple-level conclusion is drawn") to avoid revealing which partner is affected. Confirm:

- Vagueness is acceptable — **yes / no**.
- If no, the clinician should propose wording that gives enough clinical signal without naming the partner.

---

## Decision 7. Consanguinity: shown wording, figure, and whether to ask

**Why.** For couples related by family (for example, first cousins), the chance of a rare inherited condition not covered by this panel is higher than for unrelated couples. The panel cannot guarantee that risk is bounded by the panel alone.

**Current build.** Nothing about consanguinity is shown.

**Three sub-decisions for the clinician:**
- A. **Wording.** Approve or edit this draft (`template id: consanguinity.explainer`, currently proposed in clinical-review-notes.md, not yet in the catalog):
  > If you are related to each other by family (for example, cousins), the chance of a rare inherited condition that is not on this panel is a little higher than for unrelated couples. A counsellor can talk this through with you.
- B. **Figure.** Keep qualitative (as drafted), or quote a number from a cited source for a specific population. If a number is wanted, the clinician names the population and the source.
- C. **Whether to ask about relatedness at all.** Asking turns relatedness into sensitive personal data. If Sila ever asks, a new `consent purpose` ("consanguinity_data") would be added and the person could revoke, and the answer would never be shared with the partner without an explicit separate grant. Current proposal: do not ask. Show the explainer to every couple instead.

**Clinician's call.** Mark A — approved/edited, B — qualitative/number, C — ask/don't ask.

---

## Decision 8. Disclosure of a possible condition in the person themselves

**Why.** `individual.affected` runs when a person's own result shows two variants on record. Today the UI displays this directly on `/me`, with a note that a specialist should review. An alternative is to hold the result (show a short "your result needs specialist review" card instead of the full carrier/affected wording) until a counsellor has made contact.

**Options.**
- A. **Show directly with an offer of counselling** (status quo). The person sees `individual.affected` wording and a referral prompt.
- B. **Hold until counsellor contact.** The `affected` branch renders a neutral "this result needs a specialist to walk you through it" card and a counsellor-access consent prompt, but no clinical detail, until a counsellor has acknowledged the case.

**Clinician's call.** Mark A or B.

---

## Decision 9. Phase of two variants

**Why.** A screening report often does not state whether two variants in the same gene sit on the same copy (cis) or on different copies (trans). "Two variants" is only "affected" when they are in trans. This matters most for CFTR compound heterozygotes and for HbS + beta thal.

**Current build.** The engine treats `variants.length === 2` as `affected`. No phase information is stored.

**Options.**
- A. **Keep current behaviour**, and note the limitation in the `individual.affected` template (the suggested wording in clinical-review-notes.md already hedges on phase).
- B. **Extend the vault schema** to record phase per variant pair when the lab report provides it. Would require a schema migration and clinician agreement on the labels (cis / trans / unknown).

**Clinician's call.** Mark A or B.

---

## Decision 10. Local-context check on every option

**Why.** Every option on `/options` must be checked against what is legal and available in the target country and against its cultural and religious context. Pregnancy-related options in particular must not imply any particular course.

**Current options.**
- `options.talk_counsellor` — universally available.
- `options.confirm_test` — universally available.
- `options.pregnancy_testing` — CVS and amniocentesis availability varies; NIPT not always offered.
- `options.fertility_services` — IVF with PGT-M is legally and religiously sensitive in parts of the target context.
- `options.continue_with_care` — universally available.

**Clinician's and cultural reviewer's call.** For each of the five options, mark **keep / edit / remove** for the pilot setting. If any option is removed, we remove it from the catalog and the /options and /couple screens (both read from the templates, so it is one-file change).

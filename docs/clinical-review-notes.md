# Clinical review notes

**Audience.** The clinical adviser.
**Status.** Working notes prepared by the development team as a starting point. Nothing in this file is sign-off. Every template keeps `status: "draft"` until the adviser flips it.

## How to use this document

- Each section mirrors one template id (or one engine decision) in the build.
- Items begin with the current wording (English only here; the Arabic draft awaits the Arabic reviewer and the clinical sense in this doc applies to both).
- Items marked **Decision needed** list open calls only the clinician can make.
- Items marked **Suggested change** are candidate replacements. The clinician can approve as-is, edit, or reject.

If the clinician approves a template, bump its `version`, set `status: "approved"`, and fill `approvedBy` in `src/content/templates/catalog.ts`.

---

## Individual result templates

### `individual.no_variant_found`

Current:
> No pathogenic variant was found for this condition in the tested set. That lowers the chance of a child being affected but does not reduce it to zero, because screening does not detect every possible variant.

Review:
- "pathogenic variant" is acceptable but "tested set" is jargon. Suggest **"the variants this test looks for"** or **"the variants on this panel"**.
- The sentence couples an individual finding to child risk in one breath. For a person who has not linked a partner, this can be confusing. Consider an individual-only half ("No variant was found for you") and letting the couple screen own the couple framing.
- Residual-risk acknowledgement is correctly present.

Suggested change:
> No variant was found for you for this condition in the variants this panel looks for. That lowers your couple's chance of an affected child but does not reduce it to zero, because the panel does not cover every possible variant.

### `individual.carrier`

Current:
> You carry one copy of a variant for this condition. Carriers are healthy. What it may mean for your children depends on whether your partner also carries a variant for the same condition.

Review:
- **"Carriers are healthy"** is too absolute. Sickle cell trait, for example, can show mild symptoms under extreme physical stress; alpha-thalassaemia trait can mildly affect blood counts. For a patient-facing explanation **"Carriers usually have no symptoms related to this condition"** is safer.
- Carrier vs affected distinction is clear, which is the main educational goal of this template.

Suggested change:
> You carry one copy of a variant for this condition. Carriers usually have no symptoms related to this condition. What it may mean for your children depends on whether your partner also carries a variant for the same condition.

### `individual.affected`

Current:
> Your result shows two copies of a variant for this condition. A genetic counsellor should review this with you before any couple-level conclusion is drawn.

Review:
- Labelling someone with two variants as "affected" is a strong clinical claim. For HbS/HbS it is accurate; for HbS/beta thal or compound HbC/beta it depends on which variants and on the person's clinical history. Our engine uses `personGeneStatus === "affected"` when `variants.length === 2`, which flattens this nuance.
- **Phase.** A screening report often does not state the phase of the two variants — whether they sit on the same parental copy (cis) or on different copies (trans). "Two variants" is only "affected" when they are in trans. This matters most for CFTR compound heterozygotes and for HbS with beta thal. The suggested wording below hedges accordingly; the clinician may want to add an explicit phase note.
- Better wording keeps the fact (two variants on record) and defers the clinical meaning to the specialist.

Suggested change:
> Your result shows two variants on record for this condition. Whether both copies are affected depends on which variants and on whether they sit on different copies of the gene (phase). A specialist should review it with you.

Also open as a separate decision: **should Sila show a two-variant result directly, with an offer of counselling, or hold it until a counsellor has made contact first?** See `panel-decisions.md` decision 7.

### `individual.uncertain`

Current:
> One part of your result was uncertain. A genetic counsellor can explain what this means for you and whether a further test would help.

Review:
- Clear and appropriately cautious. Likely approve as-is.

### `individual.not_tested`

Current:
> This condition was not part of the test on file for you. A couple-level risk cannot be computed for it without a result for both of you.

Review:
- Clear. "On file" is friendly. Likely approve as-is.

---

## Residual risk

### `residual_risk.general`

Current:
> A "no variant found" result lowers the risk but does not remove it. The test looks for a known set of variants, and a child can still inherit a rare variant not covered by the test.

Review:
- Good acknowledgement. One tweak: it talks about "the test". For a reader who had the test some time ago, naming the panel ("this screening panel") may be clearer.

Suggested change:
> A "no variant found" result lowers the risk but does not remove it. This screening panel looks for a known set of variants, and a child can still inherit a rare variant that the panel does not cover.

---

## Couple-level reason labels

### `couple.shared_risk`

Current:
> Each pregnancy carries a shared risk for one or more conditions on the panel.

Review:
- "Shared risk" is Sila terminology. For first-time readers "a chance that a future child could be affected" is more direct.

Suggested change:
> Each pregnancy carries a chance that a future child could be affected by one or more conditions on this panel. The exact chance is shown per condition below.

### `couple.shared_risk_serious`

Current:
> Each pregnancy carries a shared risk for a serious condition on the panel. A genetic counsellor is recommended soon.

Review:
- "Serious" is a loaded word that can land harder than intended, especially in Arabic. Clinician judgement call; many services use "significant health effects" or "major health impact". Keep neutral and specific.

Suggested change:
> Each pregnancy carries a chance that a future child could be affected by a condition on this panel that can have major health effects. We suggest a genetic counsellor soon.

### `couple.incomplete`

Current:
> Your shared risk cannot be computed for every condition yet — one of the results is uncertain or missing.

Review:
- Wording respects minimum disclosure (does not say "which partner"). Good.

### `couple.needs_review`

Current:
> A specialist should review this result with you before any couple-level conclusion is drawn.

Review:
- Deliberately vague to avoid revealing which partner is affected. Good. The couple view will not expose `person_affected` to either partner. Confirm this with the clinician (minimum-disclosure trade-off).

---

## Route next-steps

### `route.information`

Current:
> Next step: read more about your results. You can book a counsellor at any time if you have questions.

Review:
- Good. Carries no urgency and leaves the door open.

### `route.counsellor`

Current:
> Next step: we suggest a session with a genetic counsellor to go through your result.

Review:
- Good. Neutral verb ("suggest"), not prescriptive.

### `route.counsellor_priority`

Current:
> Next step: we suggest booking a genetic counsellor soon. Your options are easiest to discuss early.

Review:
- "Soon" is intentionally non-specific. Clinician may prefer **"within the next few weeks"** or similar. Patient reaction to "priority" wording should be tested in user studies before launch.

---

## Options page (neutrality)

- Header plus five options. All non-ranked. All framed as "things to consider". No implicit pressure toward any direction. **Core safety property of Sila** — confirm wording survives the clinician pass intact.
- `options.pregnancy_testing` is vague ("Testing during a future pregnancy"). Specific modalities (CVS, amniocentesis, NIPT) can be explained by the counsellor; adding them to this panel could dilute neutrality. Keep abstract unless the clinician asks for specifics.
- `options.fertility_services` is vague ("Options available through fertility services"). Same reasoning; IVF with PGT-M should be named by a counsellor in context.
- `options.continue_with_care` explicitly supports continuing without changing anything. Important for neutrality.
- **Local context check needed on every option.** Each option must be checked against what is legal and available in the target country, and against its cultural and religious context. Pregnancy-related options in particular must not imply any particular course. A separate decision (panel-decisions.md decision 8) lists this for the clinician and the cultural reviewer.

## Consanguinity (new, proposal only)

- Many couples in the target context are related by family (for example, first cousins). For such couples the chance of a rare inherited condition that is not on the Sila panel is higher than for unrelated couples.
- **Proposal, not approved.** Show every couple a short, non-personal explainer:
  > If you are related to each other by family (for example, cousins), the chance of a rare inherited condition that is not on this panel is a little higher than for unrelated couples. A counsellor can talk this through with you.
- No question is asked. No data is stored. The sentence is shown on the couple result for every couple, framed with a `SectionLabel: education` chip, worded so a couple who are not related feels neither accused nor highlighted.
- See `panel-decisions.md` decision 7 for the wording, whether a figure should appear, and whether Sila should ever ask about relatedness (which would make it sensitive data and require its own `consent purpose`).

---

## Referral tracker labels

- `referral.step.referred` through `referral.step.closed` are short and factual.
- `referral.step.confirmatory_ordered` and `referral.step.result_received` are tagged `clinical_advice` in the catalog so the UI chip colour matches. Confirm the clinician is comfortable with "specialist referral" being tagged `clinical_advice` as well (currently it is).

---

## Engine and panel — clinical concerns

These are in [src/lib/genetics/panel.ts](../src/lib/genetics/panel.ts) and [src/lib/genetics/engine.ts](../src/lib/genetics/engine.ts). The development team must not change them without the clinician's sign-off.

- **HbS + beta thalassaemia** has severity `variable` and currently routes to `counsellor` (not `counsellor_priority`). Sickle-β⁰ thal is clinically similar to HbSS; sickle-β⁺ thal is milder. The panel does not distinguish the two sub-variants. See [panel-decisions.md](./panel-decisions.md).
- **GJB2 hearing loss (DFNB1)** is currently on the panel at `moderate` severity. Including non-syndromic hearing loss on a pre-marital/pre-conception carrier panel is a culture-sensitive choice. See [panel-decisions.md](./panel-decisions.md).
- **CFTR** is modelled with one abstract allele `CFTR-p`. A real panel would list specific variants (F508del and others). Confirm the simplification is acceptable for the prototype or ask for a named-variant panel.
- **Inheritance model** assumes autosomal recessive for every condition on the panel. True for the current three. Confirm the engine does not need to support X-linked or dominant conditions before any future addition.
- **Severity → route mapping** is in `assessCouple` and `geneCoupleRisk`: `shared_risk_serious` and `person_affected` escalate to `counsellor_priority`; any other reason to `counsellor`. Confirm the map matches the clinician's referral preferences.

---

## Open items for the clinician

1. Approve or edit every template above. Set `status: "approved"` and `approvedBy` on each approved row in [src/content/templates/catalog.ts](../src/content/templates/catalog.ts). Bump `version` when text changes.
2. Fill in [data/synthetic/clinician_review.csv](../data/synthetic/clinician_review.csv) for all 100 synthetic couples. The columns are set up with the engine's answer on one side and empty cells for the clinician's agreement and expected route.
3. Make the panel decisions in [panel-decisions.md](./panel-decisions.md).
4. Confirm the "needs_review" couple-level label gives enough signal to a couple when one partner is affected, given that we deliberately do not reveal which partner.
5. Confirm the escalation-to-counsellor rules are the right ones for the pilot setting.

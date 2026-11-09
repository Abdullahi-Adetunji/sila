// Quiz items used in the before/after comprehension study. Every item has
// TWO parallel forms (A and B) covering the same concept. The volunteer sees
// one form before reading the couple result and the other form after; which
// form goes before vs after is counterbalanced at /join time ("AB" or "BA").
//
// Every item is DRAFT until the clinician signs it off and (for Arabic) the
// native-speaker reviewer signs it off. `npm run review:export` writes a
// side-by-side EN/AR review sheet.

export type QuizConcept =
  | "carrier_vs_affected"
  | "chance_per_pregnancy"
  | "independence_between_pregnancies"
  | "risk_vs_diagnosis"
  | "residual_risk"
  | "consanguinity"
  | "uncertainty"
  | "neutrality";

export type QuizStatus = "draft" | "approved";

export interface QuizFormText {
  question: string;
  choices: string[];
  // Index into `choices` of the correct answer. `null` for the neutrality
  // item, which is not scored — it measures a distribution, not a right
  // answer.
  correct: number | null;
}

export interface QuizItem {
  id: string;
  version: number;
  status: QuizStatus;
  approvedBy: string | null;
  concept: QuizConcept;
  note: string;
  forms: {
    A: { en: QuizFormText; ar: QuizFormText };
    B: { en: QuizFormText; ar: QuizFormText };
  };
}

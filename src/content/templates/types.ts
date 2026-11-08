// Every user-facing explanation in Sila comes from a template here.
// AI never generates clinical text.

export type SectionLabel = "education" | "decision_support" | "clinical_advice";
export type TemplateStatus = "draft" | "approved";

export interface BilingualText {
  en: string;
  ar: string;
}

export interface Template {
  id: string;
  version: number;
  status: TemplateStatus;
  // Who approved this template, when status is "approved". Null while draft.
  approvedBy: string | null;
  sectionLabel: SectionLabel;
  // Short one-line description, for reviewers. Not shown to users.
  note: string;
  text: BilingualText;
}

export const SECTION_LABEL_COPY: Record<SectionLabel, BilingualText> = {
  education: { en: "Education", ar: "تثقيف" },
  decision_support: { en: "Decision support", ar: "دعم القرار" },
  clinical_advice: { en: "Clinical advice", ar: "استشارة سريرية" },
};

"use client";

import { SECTION_LABEL_COPY, type SectionLabel as SL } from "@/content/templates";
import { type Lang } from "@/lib/content";

// Label backgrounds pair with their matching text token in globals.css. The
// token values were darkened so that `text-<accent>` on `bg-<accent>-soft`
// clears WCAG AA everywhere the pattern is used.
const STYLE: Record<SL, string> = {
  education: "bg-teal-soft text-teal",
  decision_support: "bg-carrier-soft text-carrier",
  clinical_advice: "bg-affected-soft text-affected",
};

export function SectionLabel({ section, lang }: { section: SL; lang: Lang }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STYLE[section]}`}
      aria-label={`Section type: ${SECTION_LABEL_COPY[section].en}`}
    >
      {SECTION_LABEL_COPY[section][lang]}
    </span>
  );
}

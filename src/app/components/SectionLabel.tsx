"use client";

import { SECTION_LABEL_COPY, type SectionLabel as SL } from "@/content/templates";
import { type Lang } from "@/lib/content";

const BG: Record<SL, string> = {
  education: "bg-teal-soft text-teal",
  decision_support: "bg-carrier-soft text-ink",
  clinical_advice: "bg-affected-soft text-affected",
};

export function SectionLabel({ section, lang }: { section: SL; lang: Lang }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${BG[section]}`}
      aria-label={`Section type: ${SECTION_LABEL_COPY[section].en}`}
    >
      {SECTION_LABEL_COPY[section][lang]}
    </span>
  );
}

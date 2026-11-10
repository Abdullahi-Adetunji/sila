"use client";

import { SECTION_LABEL_COPY, type SectionLabel as SL } from "@/content/templates";
import { type Lang } from "@/lib/content";

// Colour pairs chosen for WCAG 2.2 AA contrast against their matching soft
// background. The brand accent colours (--teal, --carrier, --affected) are
// used as borders / fills elsewhere, but as *text on a soft wash of the
// same hue* they sit around 4.1–4.6:1 — right at the AA threshold and
// flagged by axe. The darker tones below give 6–8:1 and keep the family
// relationship intact.
const BG: Record<SL, string> = {
  education: "bg-teal-soft",
  decision_support: "bg-carrier-soft",
  clinical_advice: "bg-affected-soft",
};

const FG: Record<SL, string> = {
  education: "#0a4846",
  decision_support: "#4a3312",
  clinical_advice: "#7a3620",
};

export function SectionLabel({ section, lang }: { section: SL; lang: Lang }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BG[section]}`}
      style={{ color: FG[section] }}
      aria-label={`Section type: ${SECTION_LABEL_COPY[section].en}`}
    >
      {SECTION_LABEL_COPY[section][lang]}
    </span>
  );
}

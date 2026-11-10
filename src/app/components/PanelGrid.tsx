"use client";

import { PANEL } from "@/lib/genetics/panel";
import type { Lang } from "@/lib/content";
import { Reveal } from "./Reveal";

// Panel coverage displayed straight from src/lib/genetics/panel.ts so the
// landing never claims more than the engine actually screens. Each card
// shows the gene, the condition name, and the phenotype count. We do not
// show severity on the landing: severity is a clinical decision point the
// adviser is still reviewing.

export function PanelGrid({ lang }: { lang: Lang }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {PANEL.map((gene, i) => (
        <Reveal
          as="article"
          key={gene.gene}
          delay={((Math.min(i + 1, 6)) as 1 | 2 | 3 | 4 | 5 | 6)}
        >
          <div className="glass-card h-full p-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-accent-mint">
              {gene.gene}
            </p>
            <p className="mt-2 text-lg font-semibold text-glass-ink">
              {gene.condition[lang]}
            </p>
            <dl className="mt-4 grid gap-y-2 text-xs text-glass-ink-muted">
              <div className="flex items-center justify-between">
                <dt>{lang === "en" ? "Variants tracked" : "المتغيّرات المتتبَّعة"}</dt>
                <dd className="font-mono text-glass-ink">{gene.alleles.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>{lang === "en" ? "Phenotypes resolved" : "الأنماط الظاهرية المعالَجة"}</dt>
                <dd className="font-mono text-glass-ink">{gene.phenotypes.length}</dd>
              </div>
            </dl>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

import type { ChildOutcome } from "@/lib/genetics/engine";
import { T, type Lang } from "@/lib/content";

const FILL: Record<ChildOutcome["kind"], { body: string; stroke: string }> = {
  affected: { body: "var(--affected)", stroke: "var(--affected)" },
  carrier: { body: "var(--carrier-soft)", stroke: "var(--carrier)" },
  unaffected: { body: "var(--surface)", stroke: "var(--muted)" },
};

function Child({ kind, x }: { kind: ChildOutcome["kind"]; x: number }) {
  const c = FILL[kind];
  return (
    <g transform={`translate(${x} 0)`}>
      <circle cx="28" cy="24" r="12" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      <path d="M8 76 C8 34 48 34 48 76 Z" fill={c.body} stroke={c.stroke} strokeWidth="2" />
      {kind === "carrier" && <path d="M28 44.5 L28 76 L48 76 C48 56 40 45 28 44.5 Z" fill="var(--carrier)" />}
    </g>
  );
}

export function ChildrenPicture({ outcomes, lang }: { outcomes: ChildOutcome[]; lang: Lang }) {
  const ordered = outcomes.flatMap((o) => Array<ChildOutcome["kind"]>(o.quarters).fill(o.kind));
  // In Arabic the eye starts on the right, so the affected child is drawn on the right.
  const kinds = lang === "ar" ? [...ordered].reverse() : ordered;
  const present = new Set(kinds);
  return (
    <figure className="mt-4">
      <svg viewBox="0 0 240 80" className="w-full max-w-xs" role="img" aria-label="Chance for each pregnancy">
        {kinds.map((k, i) => (
          <Child key={i} kind={k} x={i * 58 + 4} />
        ))}
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
        {present.has("affected") && (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-affected" />
            {T.legendAffected[lang]}
          </span>
        )}
        {present.has("carrier") && (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-carrier bg-carrier-soft" />
            {T.legendCarrier[lang]}
          </span>
        )}
        {present.has("unaffected") && (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-muted bg-surface" />
            {T.legendUnaffected[lang]}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

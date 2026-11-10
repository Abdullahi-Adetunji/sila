"use client";

import { useEffect, useRef, useState } from "react";

// A compact strip of defensible numbers for the landing page. Values come
// from real artefacts in the repo:
//  - couples count: data/synthetic/couples.json (100 couples = 200 people)
//  - panel conditions: src/lib/genetics/panel.ts (3 genes)
//  - attack cases: current attack suite (31 blocked)
//  - privacy tests: latest Vitest privacy_report (80 blocked, 0 failed)
// Numbers are rendered with a short "count-up" tween once the strip enters
// the viewport. prefers-reduced-motion falls back to the final value.
export interface Stat {
  value: number;
  suffix?: string;
  label: string;
  sublabel?: string;
}

const DEFAULT_STATS: Stat[] = [
  { value: 200, label: "Synthetic people", sublabel: "100 couples, fixed seed" },
  { value: 3, label: "Conditions on the panel", sublabel: "HBB · CFTR · GJB2" },
  { value: 31, label: "Attack cases blocked", sublabel: "IDOR · CSRF · brute-force · role scope" },
  { value: 80, label: "Privacy tests passed", sublabel: "Vitest · every revocation path" },
];

export function StatStrip({ stats = DEFAULT_STATS }: { stats?: Stat[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <section
      ref={ref}
      aria-label="Pilot numbers"
      className="glass-card mt-10 grid gap-x-6 gap-y-5 p-6 sm:grid-cols-2 sm:p-8 md:grid-cols-4"
    >
      {stats.map((s, i) => (
        <StatCell key={i} stat={s} go={visible} delayMs={i * 120} />
      ))}
    </section>
  );
}

function StatCell({ stat, go, delayMs }: { stat: Stat; go: boolean; delayMs: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!go) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(stat.value);
      return;
    }
    let raf = 0;
    const start = performance.now() + delayMs;
    const duration = 900;
    const tick = (t: number) => {
      const elapsed = t - start;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setValue(Math.round(stat.value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [go, stat.value, delayMs]);

  return (
    <div>
      <div
        aria-live="polite"
        className="flex items-baseline gap-1 font-mono text-4xl font-semibold text-glass-ink"
      >
        <span>{value.toLocaleString()}</span>
        {stat.suffix && <span className="text-xl text-accent-mint">{stat.suffix}</span>}
      </div>
      <p className="mt-2 text-sm font-medium text-glass-ink">{stat.label}</p>
      {stat.sublabel && (
        <p className="mt-0.5 text-xs text-glass-ink-muted">{stat.sublabel}</p>
      )}
    </div>
  );
}

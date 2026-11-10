"use client";

import { useState } from "react";
import { LANDING } from "@/lib/content-landing";
import { type Lang } from "@/lib/content";

// Slim amber strip that prints the "prototype, synthetic data only, not
// medical advice" guarantee at the very top of every page. The `onDark`
// prop used to pick a glass variant for the old dark hero; now the whole
// app is one palette and the amber strip reads cleanly on either page,
// so onDark is accepted but ignored.
export function PrototypeBanner({ lang }: { lang: Lang; onDark?: boolean }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <div role="status" aria-live="polite" className="bg-carrier-soft text-ink">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-xs">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-carrier" />
        <span className="font-medium">{LANDING.prototypeBanner[lang]}</span>
        <button
          onClick={() => setHidden(true)}
          aria-label="Dismiss banner"
          className="ml-auto rounded-full px-2 py-1 text-xs text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { LANDING } from "@/lib/content-landing";
import { type Lang } from "@/lib/content";

// Visible on every landing-page render and inside the (app) / (auth) /
// (volunteer) shells. The banner is the one bit of chrome every page shares,
// so it carries both the "prototype, synthetic data only" label and a
// dismiss button.
//
// The `onDark` prop switches the styling to a frosted glass pill that reads
// against the dark landing hero, while the default amber style keeps the
// in-app look consistent on light surfaces.
export function PrototypeBanner({
  lang,
  onDark = false,
}: {
  lang: Lang;
  onDark?: boolean;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  if (onDark) {
    return (
      <div role="status" aria-live="polite" className="relative z-10">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pt-4">
          <div className="glass-pill flex items-center gap-2 px-3 py-1.5 text-xs text-glass-ink">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--accent-mint)" }}
            />
            <span>{LANDING.prototypeBanner[lang]}</span>
            <button
              onClick={() => setHidden(true)}
              aria-label="Dismiss banner"
              className="ml-2 rounded-full px-1.5 py-0.5 text-glass-ink-muted hover:text-glass-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className="bg-carrier-soft text-ink">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2 text-xs">
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

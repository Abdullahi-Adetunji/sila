"use client";

import { useState } from "react";
import { LANDING } from "@/lib/content-landing";
import { type Lang } from "@/lib/content";

export function PrototypeBanner({ lang }: { lang: Lang }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-carrier-soft text-ink"
    >
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

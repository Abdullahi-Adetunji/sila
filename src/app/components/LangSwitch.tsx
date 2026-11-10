"use client";

import { type Lang } from "@/lib/content";

// Bilingual segmented control. The `onDark` variant swaps the chrome to the
// glass pill used across the landing page so it reads cleanly over the dark
// aurora; the default is the light in-app treatment.
export function LangSwitch({
  lang,
  onChange,
  onDark = false,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
  onDark?: boolean;
}) {
  const container = onDark
    ? "glass-pill flex p-1 text-xs"
    : "flex rounded-full border border-line bg-surface p-1 text-sm";
  const activeBtn = onDark
    ? "bg-accent-mint text-deep-900"
    : "bg-teal text-white";
  const inactiveBtn = onDark ? "text-glass-ink-muted" : "text-muted";
  const ring = onDark ? "focus-visible:ring-accent-mint" : "focus-visible:ring-teal";

  return (
    <div className={container} dir="ltr">
      {(["en", "ar"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`rounded-full px-3 py-1 transition-colors focus:outline-none focus-visible:ring-2 ${ring} ${
            lang === l ? activeBtn : inactiveBtn
          }`}
          aria-pressed={lang === l}
          aria-label={l === "en" ? "Switch to English" : "التبديل إلى العربية"}
        >
          {l === "en" ? "English" : "العربية"}
        </button>
      ))}
    </div>
  );
}

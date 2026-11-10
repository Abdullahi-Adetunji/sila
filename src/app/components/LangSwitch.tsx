"use client";

import { type Lang } from "@/lib/content";

// Bilingual segmented control. onDark prop kept for compatibility but the
// palette is now one light theme so both branches render the same chip.
export function LangSwitch({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
  onDark?: boolean;
}) {
  return (
    <div className="flex rounded-full border border-line bg-surface p-1 text-xs" dir="ltr">
      {(["en", "ar"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`rounded-full px-3 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
            lang === l ? "bg-teal text-white" : "text-muted hover:text-ink"
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

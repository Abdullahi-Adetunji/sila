"use client";

import { type Lang } from "@/lib/content";

export function LangSwitch({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
}) {
  return (
    <div className="flex rounded-full border border-line bg-surface p-1 text-sm" dir="ltr">
      {(["en", "ar"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`rounded-full px-3 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
            lang === l ? "bg-teal text-white" : "text-muted"
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

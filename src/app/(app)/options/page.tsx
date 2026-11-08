"use client";

import { useEffect, useState } from "react";
import { getTemplate } from "@/content/templates";
import { type Lang } from "@/lib/content";
import { useSession } from "../../lib/session";
import { LangSwitch } from "../../components/LangSwitch";
import { SectionLabel } from "../../components/SectionLabel";

const OPTIONS = [
  "options.talk_counsellor",
  "options.confirm_test",
  "options.pregnancy_testing",
  "options.fertility_services",
  "options.continue_with_care",
] as const;

export default function OptionsPage() {
  const { user } = useSession();
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    if (user?.locale) setLang(user.locale);
  }, [user]);

  const dir = lang === "ar" ? "rtl" : "ltr";
  const header = getTemplate("options.header");

  return (
    <main dir={dir} lang={lang}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {lang === "en" ? "Options to consider" : "خيارات للتفكير فيها"}
        </h1>
        <LangSwitch lang={lang} onChange={setLang} />
      </div>

      <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <SectionLabel section={header.sectionLabel} lang={lang} />
        <p className="mt-2 text-sm">{header.text[lang]}</p>
      </section>

      <ul className="mt-6 space-y-3">
        {OPTIONS.map((id) => {
          const t = getTemplate(id);
          return (
            <li key={id} className="rounded-2xl border border-line bg-surface p-4">
              <SectionLabel section={t.sectionLabel} lang={lang} />
              <p className="mt-2 text-sm">{t.text[lang]}</p>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-xs text-muted">
        {lang === "en"
          ? "Sila never recommends a reproductive or marriage decision. The choice is yours."
          : "لا توصي صلة أبداً باتخاذ قرار إنجابي أو زواجي. القرار لكما."}
      </p>
    </main>
  );
}

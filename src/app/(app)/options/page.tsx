"use client";

import { useEffect, useState } from "react";
import { getTemplate } from "@/content/templates";
import { type Lang } from "@/lib/content";
import { useSession } from "../../lib/session";
import { LangSwitch } from "../../components/LangSwitch";
import { SectionLabel } from "../../components/SectionLabel";
import { Reveal } from "../../components/Reveal";

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
      <Reveal>
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Choices</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {lang === "en" ? "Options to consider" : "خيارات للتفكير فيها"}
            </h1>
          </div>
          <LangSwitch lang={lang} onChange={setLang} />
        </header>
      </Reveal>

      <Reveal>
        <section className="rounded-2xl border border-line bg-surface p-5">
          <SectionLabel section={header.sectionLabel} lang={lang} />
          <p className="mt-3 text-sm leading-relaxed">{header.text[lang]}</p>
        </section>
      </Reveal>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((id, i) => {
          const t = getTemplate(id);
          return (
            <Reveal
              as="li"
              key={id}
              delay={((Math.min(i + 1, 6)) as 1 | 2 | 3 | 4 | 5 | 6)}
            >
              <article className="h-full rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-teal/40">
                <SectionLabel section={t.sectionLabel} lang={lang} />
                <p className="mt-3 text-sm leading-relaxed">{t.text[lang]}</p>
              </article>
            </Reveal>
          );
        })}
      </ul>

      <Reveal>
        <p className="mt-8 rounded-xl border border-dashed border-line bg-surface p-4 text-xs text-muted">
          {lang === "en"
            ? "Sila never recommends a reproductive or marriage decision. The choice is yours."
            : "لا توصي صلة أبداً باتخاذ قرار إنجابي أو زواجي. القرار لكما."}
        </p>
      </Reveal>
    </main>
  );
}

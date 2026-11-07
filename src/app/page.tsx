"use client";

import { useMemo, useState } from "react";
import data from "../../data/synthetic/couples.json";
import { assessCouple, type PersonResult } from "@/lib/genetics/engine";
import { ROUTE_TEXT, T, conditionName, odds, phenotypeName, type Lang } from "@/lib/content";
import { ChildrenPicture } from "@/components/ChildrenPicture";

type Couple = { coupleId: string; category: string; a: PersonResult; b: PersonResult };
const couples = data.couples as unknown as Couple[];
const firstSharedRisk = couples.find((c) => c.category.includes("HbS + HbS"))?.coupleId ?? couples[0].coupleId;

export default function CoupleResultPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [coupleId, setCoupleId] = useState(firstSharedRisk);
  const couple = couples.find((c) => c.coupleId === coupleId)!;
  const result = useMemo(() => assessCouple(couple.a, couple.b), [couple]);
  const dir = lang === "ar" ? "rtl" : "ltr";

  const shared = result.genes.filter((g) => g.affectedQuarters > 0);
  const uncertain = result.genes.filter((g) => g.reason === "uncertain_result");
  const needsTesting = result.genes.filter((g) => g.reason === "partner_needs_testing");
  const nothingToFlag = result.reasons.length === 0;

  return (
    <main dir={dir} lang={lang} className="mx-auto max-w-xl px-4 pb-16 pt-6">
      <header className="flex items-center justify-between">
        <span className="text-xl font-semibold tracking-tight text-teal">{T.appName[lang]}</span>
        <div className="flex rounded-full border border-line bg-surface p-1 text-sm" dir="ltr">
          {(["en", "ar"] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`rounded-full px-3 py-1 ${lang === l ? "bg-teal text-white" : "text-muted"}`}
              aria-pressed={lang === l}
            >
              {l === "en" ? "English" : "العربية"}
            </button>
          ))}
        </div>
      </header>

      <p className="mt-4 rounded-lg bg-carrier-soft px-3 py-2 text-xs text-ink">{T.draft[lang]}</p>

      <label className="mt-4 block text-xs text-muted">
        {T.demoControl[lang]}
        <select
          className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          value={coupleId}
          onChange={(e) => setCoupleId(e.target.value)}
          dir="ltr"
        >
          {couples.map((c) => (
            <option key={c.coupleId} value={c.coupleId}>
              {c.coupleId}: {c.category}
            </option>
          ))}
        </select>
      </label>

      <h1 className="mt-8 text-2xl font-semibold">{T.screenTitle[lang]}</h1>
      <p className="mt-2 text-sm text-muted">{T.privacy[lang]}</p>

      {shared.map((g) => {
        const affected = g.outcomes.filter((o) => o.kind === "affected");
        return (
          <section key={g.gene} className="mt-6 rounded-2xl border border-line bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{conditionName(lang, g.gene)}</p>
            {affected.map((o) => (
              <p key={o.phenotype} className="mt-2 text-lg font-semibold leading-snug">
                {lang === "en"
                  ? `Each pregnancy has ${odds("en", o.quarters)} of a child with ${phenotypeName("en", o.phenotype!)}.`
                  : `في كل حمل ${odds("ar", o.quarters)} أن يولد طفل مصاب ب${phenotypeName("ar", o.phenotype!)}.`}
              </p>
            ))}
            <ChildrenPicture outcomes={g.outcomes} lang={lang} />
            <p className="mt-4 text-sm text-muted">{T.everyPregnancy[lang]}</p>
          </section>
        );
      })}

      {nothingToFlag && (
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <p className="text-lg font-semibold">{T.noSharedTitle[lang]}</p>
          <p className="mt-2 text-sm text-muted">{T.noSharedBody[lang]}</p>
        </section>
      )}

      {uncertain.map((g) => (
        <section key={`u-${g.gene}`} className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <p className="text-base font-semibold">
            {T.uncertain[lang]} {conditionName(lang, g.gene)}.
          </p>
        </section>
      ))}

      {needsTesting.map((g) => (
        <section key={`t-${g.gene}`} className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <p className="text-base font-semibold">
            {T.partnerNeedsTesting[lang]} {conditionName(lang, g.gene)}.
          </p>
        </section>
      ))}

      {result.reasons.includes("person_affected") && (
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <p className="text-base font-semibold">{T.personAffected[lang]}</p>
        </section>
      )}

      <section className="mt-6 rounded-2xl bg-teal-soft p-5">
        <p className="text-base font-medium">{ROUTE_TEXT[result.route][lang]}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white">{T.bookCounsellor[lang]}</button>
          <button className="rounded-full border border-teal px-5 py-2.5 text-sm font-medium text-teal">{T.askQuestion[lang]}</button>
        </div>
      </section>

      {shared.length > 0 && (
        <section className="mt-6">
          <h2 className="text-base font-semibold">{T.optionsTitle[lang]}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(["opt1", "opt2", "opt3", "opt4", "opt5"] as const).map((k) => (
              <li key={k} className="rounded-lg border border-line bg-surface px-4 py-3">
                {T[k][lang]}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">{T.optionsNote[lang]}</p>
        </section>
      )}
    </main>
  );
}

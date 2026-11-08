"use client";

import { useEffect, useState } from "react";
import { api, isApiError } from "../../lib/api";
import { useSession } from "../../lib/session";
import type { GeneResult, PersonGeneStatus } from "@/lib/genetics/engine";
import { PANEL } from "@/lib/genetics/panel";
import { getTemplate } from "@/content/templates";
import { type Lang } from "@/lib/content";
import { SectionLabel } from "../../components/SectionLabel";
import { LangSwitch } from "../../components/LangSwitch";

type ResultsByGene = Record<string, GeneResult>;

function personGeneStatus(r: GeneResult | undefined): PersonGeneStatus {
  if (!r || r.status === "not_tested") return "not_tested";
  if (r.status === "uncertain") return "uncertain";
  if (r.variants.length === 0) return "no_variant_found";
  return r.variants.length === 1 ? "carrier" : "affected";
}

function templateIdFor(status: PersonGeneStatus): string {
  return `individual.${status}`;
}

export default function MyResultPage() {
  const { user } = useSession();
  const [lang, setLang] = useState<Lang>("en");
  const [results, setResults] = useState<ResultsByGene | null>(null);
  const [state, setState] = useState<"loading" | "empty" | "ready" | "error">("loading");
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (user?.locale) setLang(user.locale);
  }, [user]);

  useEffect(() => {
    api
      .get<{ results: ResultsByGene }>("/api/me/result")
      .then((res) => {
        setResults(res.results);
        setState("ready");
      })
      .catch((e: unknown) => {
        if (isApiError(e) && e.status === 404) setState("empty");
        else setState("error");
      });
  }, []);

  const hasNoVariantFound =
    results && Object.values(results).some((r) => r.status === "tested" && r.variants.length === 0);

  return (
    <main dir={dir} lang={lang}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {lang === "en" ? "Your result" : "نتيجتك"}
        </h1>
        <LangSwitch lang={lang} onChange={setLang} />
      </div>
      <p className="mt-2 text-sm text-muted">
        {lang === "en"
          ? "This page shows your own carrier result only. Your partner cannot see it unless you choose to share it on the Consent page."
          : "تعرض هذه الصفحة نتيجتك الفردية فقط. لا يمكن لشريك حياتك أن يراها إلا إذا اخترت مشاركتها في صفحة الموافقة."}
      </p>

      {state === "loading" && (
        <p className="mt-6 text-sm text-muted">{lang === "en" ? "Loading…" : "جار التحميل…"}</p>
      )}
      {state === "error" && (
        <p className="mt-6 text-sm text-red-600">
          {lang === "en" ? "Could not load your result." : "تعذّر تحميل نتيجتك."}
        </p>
      )}
      {state === "empty" && (
        <p className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm">
          {lang === "en"
            ? "No carrier result has been uploaded to your account yet. In this prototype, a simulated lab uploads results via npm run seed."
            : "لم تُحمَّل أي نتيجة إلى حسابك بعد. في هذا النموذج الأولي، يرفع مختبر محاكى النتائج عبر npm run seed."}
        </p>
      )}

      {state === "ready" && results && (
        <>
          <ul className="mt-6 space-y-3">
            {PANEL.map((gene) => {
              const r = results[gene.gene];
              const status = personGeneStatus(r);
              const tmpl = getTemplate(templateIdFor(status));
              return (
                <li key={gene.gene} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <SectionLabel section={tmpl.sectionLabel} lang={lang} />
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      {gene.condition[lang]}
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{statusHeadline(status, lang)}</p>
                  <p className="mt-2 text-sm text-ink">{tmpl.text[lang]}</p>
                </li>
              );
            })}
          </ul>

          {hasNoVariantFound && (
            <section className="mt-6 rounded-2xl border border-teal bg-teal-soft p-4">
              <div className="flex flex-wrap items-center gap-2">
                <SectionLabel section="education" lang={lang} />
                <p className="text-xs font-medium uppercase tracking-wide text-teal">
                  {lang === "en" ? "Residual risk" : "الخطر المتبقي"}
                </p>
              </div>
              <p className="mt-2 text-sm">{getTemplate("residual_risk.general").text[lang]}</p>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function statusHeadline(status: PersonGeneStatus, lang: Lang): string {
  const EN: Record<PersonGeneStatus, string> = {
    no_variant_found: "No variant found",
    carrier: "Carrier of one variant",
    affected: "Two variants on record",
    uncertain: "Uncertain result",
    not_tested: "Not tested",
  };
  const AR: Record<PersonGeneStatus, string> = {
    no_variant_found: "لا متغير",
    carrier: "حامل لمتغير واحد",
    affected: "متغيران مُسجَّلان",
    uncertain: "نتيجة غير مؤكدة",
    not_tested: "لم يُفحص",
  };
  return lang === "en" ? EN[status] : AR[status];
}

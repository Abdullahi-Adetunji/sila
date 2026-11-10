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
import { Reveal } from "../../components/Reveal";

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

  const [silaId, setSilaId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    api
      .get<{ silaId: string }>("/api/me/sila-id")
      .then((r) => setSilaId(r.silaId))
      .catch(() => {});
  }, []);

  async function copySilaId() {
    if (!silaId) return;
    try {
      await navigator.clipboard.writeText(silaId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  const hasNoVariantFound =
    results &&
    Object.values(results).some((r) => r.status === "tested" && r.variants.length === 0);

  return (
    <main dir={dir} lang={lang}>
      <Reveal>
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">You</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {lang === "en" ? "Your result" : "نتيجتك"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              {lang === "en"
                ? "This page shows your own carrier result only. Your partner cannot see it unless you choose to share it on the Consent page."
                : "تعرض هذه الصفحة نتيجتك الفردية فقط. لا يمكن لشريك حياتك أن يراها إلا إذا اخترت مشاركتها في صفحة الموافقة."}
            </p>
          </div>
          <LangSwitch lang={lang} onChange={setLang} />
        </header>
      </Reveal>

      {silaId && (
        <Reveal>
          <section className="tile mb-6 flex flex-wrap items-center gap-3 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              {lang === "en" ? "Your Sila ID" : "معرّف صلة الخاص بك"}
            </p>
            <p className="font-mono text-xl tracking-widest text-ink">{silaId}</p>
            <button
              onClick={copySilaId}
              className="rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              {copied ? (lang === "en" ? "Copied" : "تم النسخ") : lang === "en" ? "Copy" : "نسخ"}
            </button>
            <p className="ml-auto text-xs text-muted">
              {lang === "en"
                ? "Hand this ID to the lab or clinic when you are tested."
                : "اعطِ هذا المعرّف للمختبر أو العيادة عند إجراء الفحص."}
            </p>
          </section>
        </Reveal>
      )}

      {state === "loading" && (
        <p className="text-sm text-muted">{lang === "en" ? "Loading…" : "جار التحميل…"}</p>
      )}
      {state === "error" && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {lang === "en" ? "Could not load your result." : "تعذّر تحميل نتيجتك."}
        </p>
      )}
      {state === "empty" && (
        <Reveal>
          <p className="rounded-2xl border border-dashed border-line bg-surface p-5 text-sm text-muted">
            {lang === "en"
              ? "No carrier result has been uploaded to your account yet. In this prototype, a simulated lab uploads results via npm run seed."
              : "لم تُحمَّل أي نتيجة إلى حسابك بعد. في هذا النموذج الأولي، يرفع مختبر محاكى النتائج عبر npm run seed."}
          </p>
        </Reveal>
      )}

      {state === "ready" && results && (
        <>
          <ul className="space-y-4">
            {PANEL.map((gene, i) => {
              const r = results[gene.gene];
              const status = personGeneStatus(r);
              const tmpl = getTemplate(templateIdFor(status));
              const tone = STATUS_TONE[status];
              return (
                <Reveal
                  as="li"
                  key={gene.gene}
                  delay={((Math.min(i + 1, 6)) as 1 | 2 | 3 | 4 | 5 | 6)}
                >
                  <article
                    className={`relative overflow-hidden rounded-2xl border bg-surface p-5 transition-shadow hover:shadow-md ${tone.border}`}
                  >
                    <div
                      aria-hidden
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.wash} to-transparent`}
                    />
                    <div className="relative">
                      <div className="flex flex-wrap items-center gap-2">
                        <SectionLabel section={tmpl.sectionLabel} lang={lang} />
                        <p className="text-xs font-medium uppercase tracking-wider text-muted">
                          {gene.condition[lang]}
                        </p>
                        <span
                          className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tone.pill}`}
                        >
                          {statusHeadline(status, lang)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-ink">{tmpl.text[lang]}</p>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </ul>

          {hasNoVariantFound && (
            <Reveal>
              <section className="mt-6 rounded-2xl border border-teal/40 bg-teal-soft p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <SectionLabel section="education" lang={lang} />
                  <p className="text-xs font-medium uppercase tracking-wider text-teal">
                    {lang === "en" ? "Residual risk" : "الخطر المتبقي"}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-relaxed">
                  {getTemplate("residual_risk.general").text[lang]}
                </p>
              </section>
            </Reveal>
          )}
        </>
      )}
    </main>
  );
}

const STATUS_TONE: Record<
  PersonGeneStatus,
  { border: string; wash: string; pill: string }
> = {
  no_variant_found: {
    border: "border-teal/30",
    wash: "from-teal-soft/60",
    pill: "bg-teal-soft text-teal",
  },
  carrier: {
    border: "border-carrier/40",
    wash: "from-carrier-soft/60",
    pill: "bg-carrier-soft text-carrier",
  },
  affected: {
    border: "border-affected/40",
    wash: "from-affected-soft/60",
    pill: "bg-affected-soft text-affected",
  },
  uncertain: {
    border: "border-carrier/30",
    wash: "from-carrier-soft/40",
    pill: "bg-carrier-soft text-ink",
  },
  not_tested: {
    border: "border-line",
    wash: "from-transparent",
    pill: "bg-surface text-muted border border-line",
  },
};

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

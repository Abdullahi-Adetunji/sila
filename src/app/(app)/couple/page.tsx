"use client";

import { useCallback, useEffect, useState } from "react";
import { api, isApiError } from "../../lib/api";
import { ChildrenPicture } from "@/components/ChildrenPicture";
import { T, conditionName, odds, phenotypeName, type Lang } from "@/lib/content";
import type { ChildOutcome } from "@/lib/genetics/engine";
import { getTemplate } from "@/content/templates";
import { SectionLabel } from "../../components/SectionLabel";

interface CoupleGeneRisk {
  gene: string;
  condition: { en: string; ar: string };
  status: "ready" | "uncertain" | "incomplete";
  computable: boolean;
  outcomes: ChildOutcome[];
  affectedQuarters: number;
}

interface CoupleView {
  status: "ready";
  route: "information" | "counsellor" | "counsellor_priority";
  reasons: Array<"shared_risk_serious" | "shared_risk" | "incomplete" | "needs_review">;
  genes: CoupleGeneRisk[];
}

type ScreenState =
  | { kind: "loading" }
  | { kind: "ready"; view: CoupleView }
  | { kind: "no_link" }
  | { kind: "awaiting_results" }
  | { kind: "no_consent"; reason: string }
  | { kind: "error" };

export default function CoupleResultPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [state, setState] = useState<ScreenState>({ kind: "loading" });
  const dir = lang === "ar" ? "rtl" : "ltr";

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ view: CoupleView }>("/api/couple/risk");
      setState({ kind: "ready", view: res.view });
    } catch (e: unknown) {
      if (isApiError(e)) {
        if (e.status === 404 && (e.body as { error?: string } | null)?.error === "no_active_partner_link") {
          setState({ kind: "no_link" });
          return;
        }
        if (e.status === 404 && (e.body as { error?: string } | null)?.error === "awaiting_results") {
          setState({ kind: "awaiting_results" });
          return;
        }
        if (e.status === 403) {
          setState({
            kind: "no_consent",
            reason: (e.body as { reason?: string } | null)?.reason ?? "missing_couple_risk_consent",
          });
          return;
        }
      }
      setState({ kind: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main dir={dir} lang={lang}>
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{T.screenTitle[lang]}</h1>
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
      <p
        role="note"
        className="mt-3 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted"
      >
        {lang === "en"
          ? "This is an educational result, not a diagnosis. A qualified genetic counsellor is the person who gives clinical advice."
          : "هذه نتيجة تثقيفية وليست تشخيصاً. المرشد الوراثي المؤهّل هو من يقدّم الاستشارة السريرية."}
      </p>
      <p className="mt-4 text-sm text-muted">{T.privacy[lang]}</p>

      {state.kind === "loading" && <p className="mt-6 text-sm text-muted">Loading…</p>}
      {state.kind === "error" && <p className="mt-6 text-sm text-red-600">Could not load the couple result.</p>}
      {state.kind === "no_link" && (
        <p className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm">
          You have not linked to a partner yet. Visit the Partner page to start.
        </p>
      )}
      {state.kind === "awaiting_results" && (
        <p className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm">
          Waiting on a result upload from the simulated lab for one or both partners.
        </p>
      )}
      {state.kind === "no_consent" && (
        <p className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm">
          Waiting for both of you to consent on the Consent page. Either of you can revoke at
          any time, and this screen will reflect the change on the next load.
        </p>
      )}

      {state.kind === "ready" && <ReadyView view={state.view} lang={lang} />}
    </main>
  );
}

function ReadyView({ view, lang }: { view: CoupleView; lang: Lang }) {
  const shared = view.genes.filter((g) => g.affectedQuarters > 0);
  const uncertain = view.genes.filter((g) => g.status === "uncertain");
  const incomplete = view.genes.filter((g) => g.status === "incomplete");
  const nothingToFlag = view.reasons.length === 0;

  const routeTmpl = getTemplate(
    view.route === "information"
      ? "route.information"
      : view.route === "counsellor"
        ? "route.counsellor"
        : "route.counsellor_priority",
  );

  const hasSevere = view.reasons.includes("shared_risk_serious");
  const hasShared = view.reasons.includes("shared_risk");

  return (
    <>
      {shared.map((g) => {
        const affected = g.outcomes.filter((o) => o.kind === "affected");
        return (
          <section key={g.gene} className="mt-6 rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center gap-2">
              <SectionLabel section="education" lang={lang} />
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {conditionName(lang, g.gene)}
              </p>
            </div>
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

      {hasSevere && (
        <SharedBanner section="education" lang={lang} tmplId="couple.shared_risk_serious" />
      )}
      {hasShared && !hasSevere && (
        <SharedBanner section="education" lang={lang} tmplId="couple.shared_risk" />
      )}

      {nothingToFlag && (
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center gap-2">
            <SectionLabel section="education" lang={lang} />
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {lang === "en" ? "Shared risk on the panel" : "الخطر المشترك في الفحص"}
            </p>
          </div>
          <p className="mt-2 text-lg font-semibold">{T.noSharedTitle[lang]}</p>
          <p className="mt-2 text-sm text-muted">{T.noSharedBody[lang]}</p>
        </section>
      )}

      {(uncertain.length > 0 || incomplete.length > 0) && (
        <section className="mt-6 rounded-2xl border border-carrier bg-carrier-soft p-5">
          <div className="flex flex-wrap items-center gap-2">
            <SectionLabel section="education" lang={lang} />
            <p className="text-xs font-medium uppercase tracking-wide text-ink">
              {lang === "en" ? "Uncertainty" : "عدم اليقين"}
            </p>
          </div>
          <p className="mt-2 text-base font-semibold">
            {getTemplate("couple.incomplete").text[lang]}
          </p>
          <ul className="mt-2 list-disc ps-6 text-sm">
            {[...uncertain, ...incomplete].map((g) => (
              <li key={g.gene}>{conditionName(lang, g.gene)}</li>
            ))}
          </ul>
        </section>
      )}

      {view.reasons.includes("needs_review") && (
        <section className="mt-6 rounded-2xl border border-affected bg-affected-soft p-5">
          <div className="flex flex-wrap items-center gap-2">
            <SectionLabel section="clinical_advice" lang={lang} />
            <p className="text-xs font-medium uppercase tracking-wide text-affected">
              {lang === "en" ? "Needs specialist review" : "يحتاج مراجعة مختص"}
            </p>
          </div>
          <p className="mt-2 text-base font-semibold">
            {getTemplate("couple.needs_review").text[lang]}
          </p>
        </section>
      )}

      <section className="mt-6 rounded-2xl bg-teal-soft p-5">
        <div className="flex flex-wrap items-center gap-2">
          <SectionLabel section="decision_support" lang={lang} />
          <p className="text-xs font-medium uppercase tracking-wide text-teal">
            {lang === "en" ? "Next step" : "الخطوة التالية"}
          </p>
        </div>
        <p className="mt-2 text-base font-medium">{routeTmpl.text[lang]}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white">
            {T.bookCounsellor[lang]}
          </button>
          <button className="rounded-full border border-teal px-5 py-2.5 text-sm font-medium text-teal">
            {T.askQuestion[lang]}
          </button>
        </div>
      </section>

      {shared.length > 0 && (
        <section className="mt-6">
          <h2 className="text-base font-semibold">{T.optionsTitle[lang]}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(
              [
                "options.talk_counsellor",
                "options.confirm_test",
                "options.pregnancy_testing",
                "options.fertility_services",
                "options.continue_with_care",
              ] as const
            ).map((k) => (
              <li key={k} className="rounded-lg border border-line bg-surface px-4 py-3">
                {getTemplate(k).text[lang]}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">{getTemplate("options.header").text[lang]}</p>
        </section>
      )}
    </>
  );
}

function SharedBanner({
  section,
  lang,
  tmplId,
}: {
  section: "education" | "decision_support" | "clinical_advice";
  lang: Lang;
  tmplId: string;
}) {
  const tmpl = getTemplate(tmplId);
  return (
    <section className="mt-6 rounded-2xl border border-teal bg-teal-soft p-5">
      <SectionLabel section={section} lang={lang} />
      <p className="mt-2 text-base font-semibold">{tmpl.text[lang]}</p>
    </section>
  );
}

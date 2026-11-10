"use client";

import { useCallback, useEffect, useState } from "react";
import { api, isApiError } from "../../lib/api";
import { ChildrenPicture } from "@/components/ChildrenPicture";
import { T, conditionName, phenotypeName, type Lang } from "@/lib/content";
import type { ChildOutcome } from "@/lib/genetics/engine";
import { getTemplate } from "@/content/templates";
import { SectionLabel } from "../../components/SectionLabel";
import { LangSwitch } from "../../components/LangSwitch";
import { Reveal } from "../../components/Reveal";

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
        if (
          e.status === 404 &&
          (e.body as { error?: string } | null)?.error === "no_active_partner_link"
        ) {
          setState({ kind: "no_link" });
          return;
        }
        if (
          e.status === 404 &&
          (e.body as { error?: string } | null)?.error === "awaiting_results"
        ) {
          setState({ kind: "awaiting_results" });
          return;
        }
        if (e.status === 403) {
          setState({
            kind: "no_consent",
            reason:
              (e.body as { reason?: string } | null)?.reason ?? "missing_couple_risk_consent",
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
      <Reveal>
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Together</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {T.screenTitle[lang]}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{T.privacy[lang]}</p>
          </div>
          <LangSwitch lang={lang} onChange={setLang} />
        </header>
      </Reveal>

      <Reveal>
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="rounded-xl border border-carrier/40 bg-carrier-soft px-4 py-3 text-xs text-ink">
            <strong className="font-medium">Draft.</strong> {T.draft[lang]}
          </p>
          <p
            role="note"
            className="rounded-xl border border-line bg-surface px-4 py-3 text-xs text-muted"
          >
            {lang === "en"
              ? "This is an educational result, not a diagnosis. A qualified genetic counsellor is the person who gives clinical advice."
              : "هذه نتيجة تثقيفية وليست تشخيصاً. المرشد الوراثي المؤهّل هو من يقدّم الاستشارة السريرية."}
          </p>
        </div>
      </Reveal>

      {state.kind === "loading" && <p className="mt-8 text-sm text-muted">Loading…</p>}
      {state.kind === "error" && (
        <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load the couple result.
        </p>
      )}
      {state.kind === "no_link" && (
        <EmptyCard title={lang === "en" ? "No partner yet" : "لا يوجد شريك بعد"}>
          {lang === "en"
            ? "You have not linked to a partner yet. Visit the Partner page to start."
            : "لم تربط حسابك بشريك بعد. اذهب إلى صفحة الشريك للبدء."}
        </EmptyCard>
      )}
      {state.kind === "awaiting_results" && (
        <EmptyCard title={lang === "en" ? "Awaiting a result" : "بانتظار نتيجة"}>
          {lang === "en"
            ? "Waiting on a result upload from the simulated lab for one or both partners."
            : "بانتظار رفع نتيجة من المختبر المحاكى لأحد الشريكين أو كليهما."}
        </EmptyCard>
      )}
      {state.kind === "no_consent" && (
        <EmptyCard title={lang === "en" ? "Awaiting consent" : "بانتظار الموافقة"}>
          {lang === "en"
            ? "Waiting for both of you to consent on the Consent page. Either of you can revoke at any time, and this screen will reflect the change on the next load."
            : "في انتظار موافقة كليكما من صفحة الموافقات. يمكن لأي منكما السحب في أي وقت، وستنعكس التغييرات عند التحميل التالي."}
        </EmptyCard>
      )}

      {state.kind === "ready" && <ReadyView view={state.view} lang={lang} />}
    </main>
  );
}

function EmptyCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <section className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-6">
        <p className="text-base font-semibold">{title}</p>
        <p className="mt-2 text-sm text-muted">{children}</p>
      </section>
    </Reveal>
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
    <div className="mt-8 space-y-6">
      {shared.map((g, i) => {
        const affected = g.outcomes.filter((o) => o.kind === "affected");
        return (
          <Reveal
            as="section"
            key={g.gene}
            delay={((Math.min(i + 1, 6)) as 1 | 2 | 3 | 4 | 5 | 6)}
          >
            <article className="relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-sm">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-soft/50 to-transparent"
              />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  <SectionLabel section="education" lang={lang} />
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    {conditionName(lang, g.gene)}
                  </p>
                </div>
                {affected.map((o) => (
                  <div key={o.phenotype} className="mt-3">
                    <p className="text-xl font-semibold leading-snug">
                      {dualFramingFor(o.quarters, lang)}{" "}
                      <span className="text-muted">({phenotypeName(lang, o.phenotype!)})</span>
                    </p>
                  </div>
                ))}
                <div className="mt-4">
                  <ChildrenPicture outcomes={g.outcomes} lang={lang} />
                </div>
                <p className="mt-5 text-sm leading-relaxed text-ink">
                  {getTemplate("couple.independence").text[lang]}
                </p>
              </div>
            </article>
          </Reveal>
        );
      })}

      {hasSevere && <SharedBanner section="education" lang={lang} tmplId="couple.shared_risk_serious" />}
      {hasShared && !hasSevere && (
        <SharedBanner section="education" lang={lang} tmplId="couple.shared_risk" />
      )}

      {nothingToFlag && (
        <Reveal as="section">
          <article className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex flex-wrap items-center gap-2">
              <SectionLabel section="education" lang={lang} />
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                {lang === "en" ? "Shared risk on the panel" : "الخطر المشترك في الفحص"}
              </p>
            </div>
            <p className="mt-3 text-lg font-semibold">{T.noSharedTitle[lang]}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{T.noSharedBody[lang]}</p>
          </article>
        </Reveal>
      )}

      {(uncertain.length > 0 || incomplete.length > 0) && (
        <Reveal as="section">
          <article className="rounded-2xl border border-carrier/50 bg-carrier-soft p-6">
            <div className="flex flex-wrap items-center gap-2">
              <SectionLabel section="education" lang={lang} />
              <p className="text-xs font-medium uppercase tracking-wider text-ink">
                {lang === "en" ? "Uncertainty" : "عدم اليقين"}
              </p>
            </div>
            <p className="mt-3 text-base font-semibold">
              {getTemplate("couple.incomplete").text[lang]}
            </p>
            <ul className="mt-3 list-disc ps-6 text-sm leading-relaxed">
              {[...uncertain, ...incomplete].map((g) => (
                <li key={g.gene}>{conditionName(lang, g.gene)}</li>
              ))}
            </ul>
          </article>
        </Reveal>
      )}

      {view.reasons.includes("needs_review") && (
        <Reveal as="section">
          <article className="rounded-2xl border border-affected/50 bg-affected-soft p-6">
            <div className="flex flex-wrap items-center gap-2">
              <SectionLabel section="clinical_advice" lang={lang} />
              <p className="text-xs font-medium uppercase tracking-wider text-affected">
                {lang === "en" ? "Needs specialist review" : "يحتاج مراجعة مختص"}
              </p>
            </div>
            <p className="mt-3 text-base font-semibold">
              {getTemplate("couple.needs_review").text[lang]}
            </p>
          </article>
        </Reveal>
      )}

      <Reveal as="section">
        <article className="rounded-2xl bg-gradient-to-br from-teal-soft to-teal-soft/40 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <SectionLabel section="decision_support" lang={lang} />
            <p className="text-xs font-medium uppercase tracking-wider text-teal">
              {lang === "en" ? "Next step" : "الخطوة التالية"}
            </p>
          </div>
          <p className="mt-3 text-base font-medium">{routeTmpl.text[lang]}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white transition-[filter,transform] hover:brightness-110 hover:translate-y-[-1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal">
              {T.bookCounsellor[lang]}
            </button>
            <button className="rounded-full border border-teal/40 bg-white px-5 py-2.5 text-sm font-medium text-teal transition-colors hover:border-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal">
              {T.askQuestion[lang]}
            </button>
          </div>
        </article>
      </Reveal>

      {shared.length > 0 && (
        <Reveal as="section">
          <h2 className="text-base font-semibold">{T.optionsTitle[lang]}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                "options.talk_counsellor",
                "options.confirm_test",
                "options.pregnancy_testing",
                "options.fertility_services",
                "options.continue_with_care",
              ] as const
            ).map((k) => (
              <li
                key={k}
                className="rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed transition-colors hover:border-teal/40"
              >
                {getTemplate(k).text[lang]}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">{getTemplate("options.header").text[lang]}</p>
        </Reveal>
      )}
    </div>
  );
}

function dualFramingFor(quarters: number, lang: Lang): string {
  const id =
    quarters === 1
      ? "couple.chance.affected.1_in_4"
      : quarters === 2
        ? "couple.chance.affected.1_in_2"
        : quarters === 3
          ? "couple.chance.affected.3_in_4"
          : "couple.chance.affected.every";
  return getTemplate(id).text[lang];
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
    <Reveal as="section">
      <article className="rounded-2xl border border-teal/40 bg-teal-soft p-6">
        <SectionLabel section={section} lang={lang} />
        <p className="mt-3 text-base font-semibold">{tmpl.text[lang]}</p>
      </article>
    </Reveal>
  );
}

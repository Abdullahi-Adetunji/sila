"use client";

import { useCallback, useEffect, useState } from "react";
import { api, isApiError } from "../../lib/api";
import { useSession } from "../../lib/session";
import { getTemplate } from "@/content/templates";
import { type Lang } from "@/lib/content";
import { SectionLabel } from "../../components/SectionLabel";
import { Reveal } from "../../components/Reveal";
import { IconArrowRight } from "../../components/Icons";

type ReferralStep =
  | "referred"
  | "counselling_booked"
  | "counselling_done"
  | "confirmatory_ordered"
  | "result_received"
  | "specialist_referral"
  | "closed";

const STEP_TEMPLATE_ID: Record<ReferralStep, string> = {
  referred: "referral.step.referred",
  counselling_booked: "referral.step.counselling_booked",
  counselling_done: "referral.step.counselling_done",
  confirmatory_ordered: "referral.step.confirmatory_ordered",
  result_received: "referral.step.result_received",
  specialist_referral: "referral.step.specialist_referral",
  closed: "referral.step.closed",
};

const NEXT_STEP: ReferralStep[] = [
  "counselling_booked",
  "counselling_done",
  "confirmatory_ordered",
  "result_received",
  "specialist_referral",
  "closed",
];

interface QueueItem {
  personEmail: string;
  referral: {
    id: string;
    priority: "information" | "counsellor" | "counsellor_priority";
    createdAt: string;
    steps: Array<{ step: ReferralStep; occurredAt: string }>;
  };
}

export default function CounsellorQueuePage() {
  const { csrfToken, user } = useSession();
  const [lang, setLang] = useState<Lang>("en");
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.locale) setLang(user.locale);
  }, [user]);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ queue: QueueItem[] }>("/api/counsellor/queue");
      setItems(res.queue);
    } catch (e: unknown) {
      if (isApiError(e) && e.status === 403) {
        setError("counsellor-only");
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addStep(referralId: string, step: ReferralStep) {
    if (!csrfToken) return;
    try {
      await api.post(`/api/referrals/${referralId}/step`, { step }, csrfToken);
      await load();
    } catch {
      setError("Could not add that step.");
    }
  }

  const dir = lang === "ar" ? "rtl" : "ltr";

  if (error === "counsellor-only") {
    return (
      <main dir={dir} lang={lang}>
        <h1 className="text-2xl font-semibold tracking-tight">
          {lang === "en" ? "Counsellor queue" : "قائمة المرشدين"}
        </h1>
        <p className="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
          {lang === "en"
            ? "This page is only visible to counsellor accounts."
            : "هذه الصفحة متاحة لحسابات المرشدين فقط."}
        </p>
      </main>
    );
  }

  const priorityCount =
    items?.filter((q) => q.referral.priority === "counsellor_priority").length ?? 0;
  const counsellorCount =
    items?.filter((q) => q.referral.priority === "counsellor").length ?? 0;
  const infoCount =
    items?.filter((q) => q.referral.priority === "information").length ?? 0;

  return (
    <main dir={dir} lang={lang}>
      <Reveal>
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            {lang === "en" ? "Counsellor workspace" : "مساحة عمل المرشد"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {lang === "en" ? "Counsellor queue" : "قائمة المرشدين"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            {lang === "en"
              ? "Priority cases first. Only referrals from people who currently grant you counsellor_access are shown."
              : "الحالات ذات الأولوية أولاً. تُعرض فقط إحالات الأشخاص الذين منحوك counsellor_access حالياً."}
          </p>
        </header>
      </Reveal>

      <Reveal>
        <div className="grid gap-3 sm:grid-cols-3">
          <PriorityTile
            label={lang === "en" ? "Priority" : "أولوية"}
            count={priorityCount}
            tone="affected"
          />
          <PriorityTile
            label={lang === "en" ? "Counsellor" : "مرشد"}
            count={counsellorCount}
            tone="carrier"
          />
          <PriorityTile
            label={lang === "en" ? "Information" : "معلومات"}
            count={infoCount}
            tone="teal"
          />
        </div>
      </Reveal>

      {!items && <p className="mt-6 text-sm text-muted">Loading…</p>}

      <ul className="mt-8 space-y-4">
        {items?.map((q, idx) => {
          const taken = new Set(q.referral.steps.map((s) => s.step));
          const next = NEXT_STEP.find((s) => !taken.has(s));
          const toneCls =
            q.referral.priority === "counsellor_priority"
              ? "bg-affected-soft text-affected ring-1 ring-affected/40"
              : q.referral.priority === "counsellor"
                ? "bg-carrier-soft text-ink ring-1 ring-carrier/40"
                : "bg-teal-soft text-teal ring-1 ring-teal/30";
          return (
            <Reveal
              as="li"
              key={q.referral.id}
              delay={((Math.min(idx + 1, 6)) as 1 | 2 | 3 | 4 | 5 | 6)}
            >
              <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-semibold">{q.personEmail}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium tracking-wide ${toneCls}`}
                  >
                    {q.referral.priority}
                  </span>
                </div>
                <ol className="mt-4 space-y-2 text-sm text-muted">
                  {q.referral.steps.map((s) => {
                    const t = getTemplate(STEP_TEMPLATE_ID[s.step]);
                    return (
                      <li key={s.step} className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 rounded-full bg-teal/70"
                        />
                        <SectionLabel section={t.sectionLabel} lang={lang} />
                        <span>{t.text[lang]}</span>
                      </li>
                    );
                  })}
                </ol>
                {next && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => addStep(q.referral.id, next)}
                      className="group inline-flex items-center gap-1.5 rounded-full bg-teal px-4 py-1.5 text-xs font-medium text-white transition-[filter,transform] hover:brightness-110 hover:translate-y-[-1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                    >
                      {lang === "en" ? "Next step: " : "الخطوة التالية: "}
                      {getTemplate(STEP_TEMPLATE_ID[next]).text[lang]}
                      <span
                        aria-hidden
                        className="transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:-scale-x-100"
                      >
                        <IconArrowRight />
                      </span>
                    </button>
                  </div>
                )}
              </article>
            </Reveal>
          );
        })}
        {items && items.length === 0 && (
          <Reveal as="li">
            <div className="rounded-2xl border border-dashed border-line bg-surface p-6 text-center text-sm text-muted">
              {lang === "en" ? "No active cases." : "لا توجد حالات نشطة."}
            </div>
          </Reveal>
        )}
      </ul>
      {error && error !== "counsellor-only" && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}
    </main>
  );
}

function PriorityTile({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "affected" | "carrier" | "teal";
}) {
  const styles: Record<string, string> = {
    affected:
      "border-affected/30 bg-affected-soft/50 from-affected-soft to-transparent text-affected",
    carrier:
      "border-carrier/30 bg-carrier-soft/50 from-carrier-soft to-transparent text-carrier",
    teal: "border-teal/30 bg-teal-soft/70 from-teal-soft to-transparent text-teal",
  };
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br to-transparent p-4 ${styles[tone]}`}
    >
      <p className="text-xs uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{count}</p>
    </section>
  );
}

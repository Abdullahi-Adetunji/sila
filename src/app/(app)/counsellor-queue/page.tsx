"use client";

import { useCallback, useEffect, useState } from "react";
import { api, isApiError } from "../../lib/api";
import { useSession } from "../../lib/session";
import { getTemplate } from "@/content/templates";
import { type Lang } from "@/lib/content";
import { SectionLabel } from "../../components/SectionLabel";

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
        <h1 className="text-2xl font-semibold">
          {lang === "en" ? "Counsellor queue" : "قائمة المرشدين"}
        </h1>
        <p className="mt-4 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          {lang === "en"
            ? "This page is only visible to counsellor accounts."
            : "هذه الصفحة متاحة لحسابات المرشدين فقط."}
        </p>
      </main>
    );
  }

  return (
    <main dir={dir} lang={lang}>
      <h1 className="text-2xl font-semibold">
        {lang === "en" ? "Counsellor queue" : "قائمة المرشدين"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {lang === "en"
          ? "Priority cases first. Only referrals from people who currently grant you counsellor_access are shown."
          : "الحالات ذات الأولوية أولاً. تُعرض فقط إحالات الأشخاص الذين منحوك counsellor_access حالياً."}
      </p>
      {!items && <p className="mt-6 text-sm text-muted">Loading…</p>}
      <ul className="mt-6 space-y-4">
        {items?.map((q) => {
          const taken = new Set(q.referral.steps.map((s) => s.step));
          const next = NEXT_STEP.find((s) => !taken.has(s));
          return (
            <li key={q.referral.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold">{q.personEmail}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    q.referral.priority === "counsellor_priority"
                      ? "bg-affected-soft text-affected"
                      : q.referral.priority === "counsellor"
                        ? "bg-carrier-soft text-ink"
                        : "bg-teal-soft text-teal"
                  }`}
                >
                  {q.referral.priority}
                </span>
              </div>
              <ol className="mt-3 space-y-1 text-sm text-muted">
                {q.referral.steps.map((s) => {
                  const t = getTemplate(STEP_TEMPLATE_ID[s.step]);
                  return (
                    <li key={s.step} className="flex items-center gap-2">
                      <SectionLabel section={t.sectionLabel} lang={lang} />
                      <span>{t.text[lang]}</span>
                    </li>
                  );
                })}
              </ol>
              {next && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => addStep(q.referral.id, next)}
                    className="rounded-full bg-teal px-3 py-1 text-xs font-medium text-white"
                  >
                    {lang === "en" ? "Next step: " : "الخطوة التالية: "}
                    {getTemplate(STEP_TEMPLATE_ID[next]).text[lang]}
                  </button>
                </div>
              )}
            </li>
          );
        })}
        {items && items.length === 0 && (
          <li className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
            {lang === "en" ? "No active cases." : "لا توجد حالات نشطة."}
          </li>
        )}
      </ul>
      {error && error !== "counsellor-only" && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}
    </main>
  );
}

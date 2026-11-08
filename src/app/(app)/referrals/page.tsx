"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
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

interface Referral {
  id: string;
  priority: "information" | "counsellor" | "counsellor_priority";
  createdAt: string;
  closedAt: string | null;
  steps: Array<{ step: ReferralStep; occurredAt: string }>;
}

function elapsed(ms: number, lang: Lang): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return lang === "en" ? `${mins} min` : `${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === "en" ? `${hours} h` : `${hours} س`;
  const days = Math.floor(hours / 24);
  return lang === "en" ? `${days} d` : `${days} ي`;
}

export default function ReferralsPage() {
  const { user } = useSession();
  const [lang, setLang] = useState<Lang>("en");
  const [items, setItems] = useState<Referral[] | null>(null);

  useEffect(() => {
    if (user?.locale) setLang(user.locale);
  }, [user]);

  const load = useCallback(async () => {
    const res = await api.get<{ referrals: Referral[] }>("/api/referrals");
    setItems(res.referrals);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <main dir={dir} lang={lang}>
      <h1 className="text-2xl font-semibold">
        {lang === "en" ? "Referrals" : "الإحالات"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {lang === "en"
          ? "Every step of your referral and when it happened. Timestamps use the simulated clock."
          : "كل خطوة من إحالتك ووقت حدوثها. تستخدم الأوقات الساعة المحاكاة."}
      </p>
      {!items && (
        <p className="mt-6 text-sm text-muted">
          {lang === "en" ? "Loading…" : "جار التحميل…"}
        </p>
      )}
      {items && items.length === 0 && (
        <p className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          {lang === "en" ? "No referrals yet." : "لا توجد إحالات بعد."}
        </p>
      )}
      <ul className="mt-6 space-y-5">
        {items?.map((r) => {
          const createdMs = new Date(r.createdAt).getTime();
          return (
            <li key={r.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold">
                  {lang === "en" ? "Referral" : "إحالة"}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    r.priority === "counsellor_priority"
                      ? "bg-affected-soft text-affected"
                      : r.priority === "counsellor"
                        ? "bg-carrier-soft text-ink"
                        : "bg-teal-soft text-teal"
                  }`}
                >
                  {r.priority}
                </span>
              </div>
              <ol className="mt-4 space-y-2">
                {r.steps.map((s) => {
                  const t = getTemplate(STEP_TEMPLATE_ID[s.step]);
                  const dt = new Date(s.occurredAt).getTime();
                  return (
                    <li key={s.step} className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-teal"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <SectionLabel section={t.sectionLabel} lang={lang} />
                          <p className="text-sm font-medium">{t.text[lang]}</p>
                        </div>
                        <p className="text-xs text-muted">
                          {new Date(s.occurredAt).toLocaleString()} · +
                          {elapsed(dt - createdMs, lang)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

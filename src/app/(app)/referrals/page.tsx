"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useSession } from "../../lib/session";
import { getTemplate } from "@/content/templates";
import { type Lang } from "@/lib/content";
import { SectionLabel } from "../../components/SectionLabel";
import { Reveal } from "../../components/Reveal";

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
      <Reveal>
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Follow-up</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {lang === "en" ? "Referrals" : "الإحالات"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            {lang === "en"
              ? "Every step of your referral and when it happened. Timestamps use the simulated clock."
              : "كل خطوة من إحالتك ووقت حدوثها. تستخدم الأوقات الساعة المحاكاة."}
          </p>
        </header>
      </Reveal>

      {!items && (
        <p className="text-sm text-muted">{lang === "en" ? "Loading…" : "جار التحميل…"}</p>
      )}
      {items && items.length === 0 && (
        <Reveal>
          <p className="rounded-2xl border border-dashed border-line bg-surface p-5 text-sm text-muted">
            {lang === "en" ? "No referrals yet." : "لا توجد إحالات بعد."}
          </p>
        </Reveal>
      )}
      <ul className="space-y-5">
        {items?.map((r, idx) => {
          const createdMs = new Date(r.createdAt).getTime();
          const priorityCls =
            r.priority === "counsellor_priority"
              ? "bg-affected-soft text-affected ring-1 ring-affected/40"
              : r.priority === "counsellor"
                ? "bg-carrier-soft text-ink ring-1 ring-carrier/40"
                : "bg-teal-soft text-teal ring-1 ring-teal/30";
          return (
            <Reveal
              as="li"
              key={r.id}
              delay={((Math.min(idx + 1, 6)) as 1 | 2 | 3 | 4 | 5 | 6)}
            >
              <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-semibold">
                    {lang === "en" ? "Referral" : "إحالة"}
                  </p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityCls}`}>
                    {r.priority}
                  </span>
                </div>

                <ol className="relative mt-5 space-y-4 before:absolute before:bottom-1 before:top-1 before:w-[2px] before:bg-teal-soft before:left-[5px] rtl:before:left-auto rtl:before:right-[5px]">
                  {r.steps.map((s) => {
                    const t = getTemplate(STEP_TEMPLATE_ID[s.step]);
                    const dt = new Date(s.occurredAt).getTime();
                    return (
                      <li key={s.step} className="relative flex items-start gap-3 ps-5">
                        <span
                          aria-hidden
                          className="absolute left-0 top-1.5 inline-block h-3 w-3 rounded-full border-2 border-teal bg-surface rtl:left-auto rtl:right-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <SectionLabel section={t.sectionLabel} lang={lang} />
                            <p className="text-sm font-medium">{t.text[lang]}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted">
                            {new Date(s.occurredAt).toLocaleString()} · +
                            {elapsed(dt - createdMs, lang)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </article>
            </Reveal>
          );
        })}
      </ul>
    </main>
  );
}

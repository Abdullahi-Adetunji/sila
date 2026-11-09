"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PrototypeBanner } from "../../components/PrototypeBanner";
import { LangSwitch } from "../../components/LangSwitch";
import { VOLUNTEER } from "@/lib/content-volunteer";
import { T, conditionName, phenotypeName, type Lang } from "@/lib/content";
import { getTemplate } from "@/content/templates";
import { SectionLabel } from "../../components/SectionLabel";
import { ChildrenPicture } from "@/components/ChildrenPicture";
import type { ChildOutcome } from "@/lib/genetics/engine";

type Stage =
  | "info"
  | "consent"
  | "code"
  | "quiz_before"
  | "result"
  | "quiz_after"
  | "done"
  | "resume";

interface VolunteerShape {
  id: string;
  language: Lang;
  readingBand: "low" | "medium" | "high" | "unknown";
  formOrder: "AB" | "BA";
  coupleId: string;
  consentedAt: string | null;
  completedAt: string | null;
}

interface QuizItem {
  id: string;
  concept: string;
  form: "A" | "B";
  question: string;
  choices: string[];
}

interface CoupleView {
  route: "information" | "counsellor" | "counsellor_priority";
  reasons: Array<"shared_risk_serious" | "shared_risk" | "incomplete" | "needs_review">;
  genes: Array<{
    gene: string;
    computable: boolean;
    outcomes: ChildOutcome[];
    affectedQuarters: number;
    status: "ready" | "uncertain" | "incomplete";
  }>;
}

const CODE_KEY = "sila_participant_code";

async function volunteerFetch<T>(path: string, code: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "x-volunteer-code": code,
      "content-type": init?.body ? "application/json" : "",
    },
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(String(res.status));
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}

export default function VolunteerLanding() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [stage, setStage] = useState<Stage>("info");
  const [readingBand, setReadingBand] = useState<"low" | "medium" | "high" | "unknown">("unknown");
  const [volunteer, setVolunteer] = useState<VolunteerShape | null>(null);
  const [resumeCode, setResumeCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const existing = typeof window !== "undefined" ? localStorage.getItem(CODE_KEY) : null;
      if (existing) setResumeCode(existing);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (volunteer?.language) setLang(volunteer.language);
  }, [volunteer]);

  const dir = lang === "ar" ? "rtl" : "ltr";

  async function join() {
    setError(null);
    try {
      const res = await fetch("/api/volunteer/join", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language: lang, readingBand }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { volunteer: VolunteerShape };
      try {
        localStorage.setItem(CODE_KEY, body.volunteer.id);
      } catch {
        /* ignore */
      }
      setVolunteer(body.volunteer);
      setStage("consent");
    } catch {
      setError("Could not start the study.");
    }
  }

  async function agree() {
    if (!volunteer) return;
    setError(null);
    try {
      const body = await volunteerFetch<{ volunteer: VolunteerShape }>(
        "/api/volunteer/consent",
        volunteer.id,
        { method: "POST" },
      );
      setVolunteer(body.volunteer);
      setStage("code");
    } catch {
      setError("Could not record consent.");
    }
  }

  async function resume() {
    setError(null);
    try {
      const body = await volunteerFetch<{ volunteer: VolunteerShape }>(
        "/api/volunteer/me",
        resumeCode,
      );
      try {
        localStorage.setItem(CODE_KEY, body.volunteer.id);
      } catch {
        /* ignore */
      }
      setVolunteer(body.volunteer);
      setStage(body.volunteer.consentedAt ? "code" : "consent");
    } catch {
      setError("Unknown or withdrawn code.");
    }
  }

  async function withdraw() {
    if (!volunteer) return;
    setError(null);
    try {
      await fetch("/api/volunteer/withdraw", {
        method: "POST",
        headers: { "x-volunteer-code": volunteer.id },
      });
      try {
        localStorage.removeItem(CODE_KEY);
      } catch {
        /* ignore */
      }
      setVolunteer(null);
      setStage("info");
    } catch {
      setError("Could not withdraw.");
    }
  }

  return (
    <div dir={dir} lang={lang} className="min-h-screen">
      <PrototypeBanner lang={lang} />
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold text-teal">Sila</span>
          <LangSwitch lang={lang} onChange={setLang} />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {stage === "info" && (
          <>
            <h1 className="text-2xl font-semibold">{VOLUNTEER.infoHeading[lang]}</h1>
            <p className="mt-3 text-sm">{VOLUNTEER.infoBody[lang]}</p>
            <p className="mt-3 text-sm">{VOLUNTEER.infoNoAccount[lang]}</p>
            <p className="mt-3 text-sm">{VOLUNTEER.infoVoluntary[lang]}</p>

            <div className="mt-6">
              <label className="block text-sm font-medium">
                {VOLUNTEER.readingBandLabel[lang]}
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["low", VOLUNTEER.readLow],
                    ["medium", VOLUNTEER.readMedium],
                    ["high", VOLUNTEER.readHigh],
                    ["unknown", VOLUNTEER.readUnknown],
                  ] as const
                ).map(([val, t]) => (
                  <button
                    key={val}
                    onClick={() => setReadingBand(val)}
                    className={`rounded-full px-3 py-1 text-sm ${
                      readingBand === val
                        ? "bg-teal text-white"
                        : "border border-line text-muted"
                    }`}
                    aria-pressed={readingBand === val}
                  >
                    {t[lang]}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={join}
              className="mt-6 rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white"
            >
              {VOLUNTEER.joinButton[lang]}
            </button>

            <button
              onClick={() => setStage("resume")}
              className="mt-3 block text-xs text-muted underline"
            >
              {VOLUNTEER.resumeButton[lang]}
            </button>
          </>
        )}

        {stage === "consent" && volunteer && (
          <>
            <h2 className="text-2xl font-semibold">{VOLUNTEER.consentHeading[lang]}</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="rounded-xl border border-line bg-surface p-3">
                {VOLUNTEER.consentItem1[lang]}
              </li>
              <li className="rounded-xl border border-line bg-surface p-3">
                {VOLUNTEER.consentItem2[lang]}
              </li>
              <li className="rounded-xl border border-line bg-surface p-3">
                {VOLUNTEER.consentItem3[lang]}
              </li>
            </ul>
            <button
              onClick={agree}
              className="mt-6 rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white"
            >
              {VOLUNTEER.consentButton[lang]}
            </button>
          </>
        )}

        {stage === "code" && volunteer && (
          <>
            <h2 className="text-2xl font-semibold">{VOLUNTEER.codeHeading[lang]}</h2>
            <p className="mt-2 text-sm text-muted">{VOLUNTEER.codeBody[lang]}</p>
            <p className="mt-4 rounded-xl border border-teal bg-teal-soft p-4 text-center font-mono text-xl tracking-widest">
              {volunteer.id}
            </p>
            <button
              onClick={() => setStage("quiz_before")}
              className="mt-6 rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white"
            >
              {lang === "en" ? "Start quiz (before)" : "ابدأ الاختبار (قبل)"}
            </button>
            <button
              onClick={withdraw}
              className="mt-3 block rounded-full border border-line px-4 py-2 text-xs text-muted"
            >
              {VOLUNTEER.withdrawButton[lang]}
            </button>
          </>
        )}

        {stage === "quiz_before" && volunteer && (
          <Quiz
            phase="before"
            lang={lang}
            volunteer={volunteer}
            onDone={() => setStage("result")}
          />
        )}

        {stage === "result" && volunteer && (
          <CoupleResultView lang={lang} volunteer={volunteer} onContinue={() => setStage("quiz_after")} />
        )}

        {stage === "quiz_after" && volunteer && (
          <Quiz
            phase="after"
            lang={lang}
            volunteer={volunteer}
            onDone={async () => {
              try {
                await volunteerFetch("/api/volunteer/complete", volunteer.id, { method: "POST" });
              } catch {
                /* ignore */
              }
              setStage("done");
            }}
          />
        )}

        {stage === "done" && volunteer && (
          <>
            <h2 className="text-2xl font-semibold">
              {lang === "en" ? "Thank you" : "شكراً لك"}
            </h2>
            <p className="mt-3 text-sm text-muted">
              {lang === "en"
                ? "Your answers help us measure whether the explanation worked for you. You can withdraw and delete them at any time with your code."
                : "إجاباتك تساعدنا في قياس مدى وضوح الشرح لك. يمكنك الانسحاب وحذفها في أي وقت باستخدام رمزك."}
            </p>
            <button
              onClick={withdraw}
              className="mt-6 rounded-full border border-line px-4 py-2 text-xs text-muted"
            >
              {VOLUNTEER.withdrawButton[lang]}
            </button>
          </>
        )}

        {stage === "resume" && (
          <>
            <h2 className="text-2xl font-semibold">
              {lang === "en" ? "Enter your code" : "أدخل رمزك"}
            </h2>
            <input
              value={resumeCode}
              onChange={(e) => setResumeCode(e.target.value.toUpperCase())}
              className="mt-4 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono tracking-widest"
              maxLength={10}
            />
            <button
              onClick={resume}
              className="mt-4 rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white"
            >
              {lang === "en" ? "Continue" : "متابعة"}
            </button>
            <button
              onClick={() => {
                router.push("/volunteer");
                setStage("info");
              }}
              className="mt-3 block text-xs text-muted underline"
            >
              {lang === "en" ? "Back" : "رجوع"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}

function Quiz({
  phase,
  lang,
  volunteer,
  onDone,
}: {
  phase: "before" | "after";
  lang: Lang;
  volunteer: VolunteerShape;
  onDone: () => void;
}) {
  const [items, setItems] = useState<QuizItem[] | null>(null);
  const [index, setIndex] = useState(0);

  const load = useCallback(async () => {
    const body = await volunteerFetch<{ items: QuizItem[] }>(
      `/api/volunteer/quiz?phase=${phase}`,
      volunteer.id,
    );
    setItems(body.items);
  }, [phase, volunteer.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function answer(a: number) {
    if (!items) return;
    const it = items[index];
    await volunteerFetch("/api/volunteer/quiz/response", volunteer.id, {
      method: "POST",
      body: JSON.stringify({ phase, itemId: it.id, answer: a }),
    });
    if (index + 1 >= items.length) onDone();
    else setIndex(index + 1);
  }

  if (!items)
    return (
      <p className="text-sm text-muted">{lang === "en" ? "Loading…" : "جار التحميل…"}</p>
    );

  const it = items[index];
  return (
    <>
      <p className="text-xs text-muted">
        {lang === "en"
          ? `Quiz (${phase}) · question ${index + 1} of ${items.length}`
          : `اختبار (${phase === "before" ? "قبل" : "بعد"}) · سؤال ${index + 1} من ${items.length}`}
      </p>
      <h2 className="mt-2 text-xl font-semibold">{it.question}</h2>
      <ul className="mt-5 space-y-2">
        {it.choices.map((c, i) => (
          <li key={i}>
            <button
              onClick={() => answer(i)}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-start text-sm hover:border-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              {c}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function CoupleResultView({
  lang,
  volunteer,
  onContinue,
}: {
  lang: Lang;
  volunteer: VolunteerShape;
  onContinue: () => void;
}) {
  const [view, setView] = useState<CoupleView | null>(null);

  useEffect(() => {
    volunteerFetch<CoupleView>("/api/volunteer/couple-view", volunteer.id).then(setView);
  }, [volunteer.id]);

  if (!view)
    return (
      <p className="text-sm text-muted">{lang === "en" ? "Loading…" : "جار التحميل…"}</p>
    );

  const shared = view.genes.filter((g) => g.affectedQuarters > 0);
  const nothingToFlag = view.reasons.length === 0;
  const dualFraming = (q: number) => {
    const id =
      q === 1
        ? "couple.chance.affected.1_in_4"
        : q === 2
          ? "couple.chance.affected.1_in_2"
          : q === 3
            ? "couple.chance.affected.3_in_4"
            : "couple.chance.affected.every";
    return getTemplate(id).text[lang];
  };
  const routeTmpl = getTemplate(
    view.route === "information"
      ? "route.information"
      : view.route === "counsellor"
        ? "route.counsellor"
        : "route.counsellor_priority",
  );

  return (
    <>
      <h2 className="text-2xl font-semibold">{T.screenTitle[lang]}</h2>
      <p
        className="mt-3 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted"
        role="note"
      >
        {lang === "en"
          ? "This is an educational result, not a diagnosis. A qualified genetic counsellor is the person who gives clinical advice."
          : "هذه نتيجة تثقيفية وليست تشخيصاً. المرشد الوراثي المؤهّل هو من يقدّم الاستشارة السريرية."}
      </p>

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
                {dualFraming(o.quarters)}{" "}
                <span className="text-muted">({phenotypeName(lang, o.phenotype!)})</span>
              </p>
            ))}
            <ChildrenPicture outcomes={g.outcomes} lang={lang} />
            <p className="mt-4 text-sm text-ink">{getTemplate("couple.independence").text[lang]}</p>
          </section>
        );
      })}

      {nothingToFlag && (
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <p className="text-lg font-semibold">{T.noSharedTitle[lang]}</p>
          <p className="mt-2 text-sm text-muted">{T.noSharedBody[lang]}</p>
        </section>
      )}

      <section className="mt-6 rounded-2xl bg-teal-soft p-5">
        <SectionLabel section={routeTmpl.sectionLabel} lang={lang} />
        <p className="mt-2 text-base font-medium">{routeTmpl.text[lang]}</p>
      </section>

      <button
        onClick={onContinue}
        className="mt-6 rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white"
      >
        {lang === "en" ? "Continue to the after-quiz" : "متابعة إلى اختبار البعد"}
      </button>
    </>
  );
}

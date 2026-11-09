"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, isApiError } from "../../lib/api";
import { PrototypeBanner } from "../../components/PrototypeBanner";
import { LangSwitch } from "../../components/LangSwitch";
import { VOLUNTEER } from "@/lib/content-volunteer";
import { type Lang } from "@/lib/content";

type Stage = "info" | "consent" | "code" | "resume";

interface VolunteerShape {
  id: string;
  language: Lang;
  readingBand: "low" | "medium" | "high" | "unknown";
  formOrder: "AB" | "BA";
  coupleId: string;
  consentedAt: string | null;
  completedAt: string | null;
}

const CODE_KEY = "sila_participant_code";

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

  const dir = lang === "ar" ? "rtl" : "ltr";

  async function join() {
    setError(null);
    try {
      const res = await api.post<{ volunteer: VolunteerShape }>("/api/volunteer/join", {
        language: lang,
        readingBand,
      });
      try {
        localStorage.setItem(CODE_KEY, res.volunteer.id);
      } catch {
        /* ignore */
      }
      setVolunteer(res.volunteer);
      setStage("consent");
    } catch {
      setError("Could not start the study.");
    }
  }

  async function agree() {
    if (!volunteer) return;
    setError(null);
    try {
      const res = await fetch("/api/volunteer/consent", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-volunteer-code": volunteer.id,
        },
      });
      if (!res.ok) throw new Error(String(res.status));
      setStage("code");
    } catch {
      setError("Could not record consent.");
    }
  }

  async function resume() {
    setError(null);
    try {
      const res = await fetch("/api/volunteer/me", {
        headers: { "x-volunteer-code": resumeCode },
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { volunteer: VolunteerShape };
      setVolunteer(body.volunteer);
      try {
        localStorage.setItem(CODE_KEY, body.volunteer.id);
      } catch {
        /* ignore */
      }
      setStage("code");
    } catch (e: unknown) {
      if (isApiError(e) || e instanceof Error) {
        setError("Unknown or withdrawn code.");
      }
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
            <p className="mt-6 text-sm text-muted">
              {lang === "en"
                ? "The quiz and the study flow come next. The server-side flow is in place; the UI for step 2 will arrive in the next commit."
                : "يأتي الاختبار وتدفق الدراسة بعد ذلك. تدفق الخادم جاهز، وستصل واجهة الخطوة 2 في الإصدار القادم."}
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

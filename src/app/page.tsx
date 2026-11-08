"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LANDING } from "@/lib/content-landing";
import { T, type Lang } from "@/lib/content";
import { PrototypeBanner } from "./components/PrototypeBanner";
import { LangSwitch } from "./components/LangSwitch";
import { DemoPanel } from "./components/DemoPanel";
import { useSession } from "./lib/session";

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("en");
  const dir = lang === "ar" ? "rtl" : "ltr";
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/home");
  }, [loading, user, router]);

  return (
    <div dir={dir} lang={lang} className="min-h-screen">
      <PrototypeBanner lang={lang} />
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="text-xl font-semibold tracking-tight text-teal">{T.appName[lang]}</span>
          <LangSwitch lang={lang} onChange={setLang} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16">
        {/* Hero */}
        <section className="pt-10 pb-6">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            {LANDING.hero.tagline[lang]}
          </h1>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              {LANDING.hero.ctaCreate[lang]}
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-teal px-5 py-2.5 text-sm font-medium text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              {LANDING.hero.ctaSignIn[lang]}
            </Link>
          </div>
          {lang === "ar" && (
            <p className="mt-6 rounded-lg bg-carrier-soft px-3 py-2 text-xs text-ink">
              {LANDING.draftNote[lang]}
            </p>
          )}
        </section>

        {/* How it works */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">{LANDING.how.heading[lang]}</h2>
          <ol className="mt-4 space-y-4">
            {([
              { title: LANDING.how.step1Title, body: LANDING.how.step1Body },
              { title: LANDING.how.step2Title, body: LANDING.how.step2Body },
              { title: LANDING.how.step3Title, body: LANDING.how.step3Body },
            ] as const).map((step, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-2xl border border-line bg-surface p-4"
              >
                <StepNumber n={i + 1} />
                <div>
                  <p className="text-base font-semibold">{step.title[lang]}</p>
                  <p className="mt-1 text-sm text-muted">{step.body[lang]}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Privacy promises */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">{LANDING.privacy.heading[lang]}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {(["p1", "p2", "p3", "p4", "p5"] as const).map((k) => (
              <li key={k} className="rounded-xl border border-line bg-surface p-3">
                {LANDING.privacy[k][lang]}
              </li>
            ))}
          </ul>
        </section>

        {/* What Sila is / isn't */}
        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-teal bg-teal-soft p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-teal">
              {LANDING.scope.isTitle[lang]}
            </p>
            <p className="mt-2 text-sm">{LANDING.scope.isBody[lang]}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {LANDING.scope.isntTitle[lang]}
            </p>
            <p className="mt-2 text-sm">{LANDING.scope.isntBody[lang]}</p>
          </div>
        </section>

        {/* Demo panel (only when DEMO_MODE=true) */}
        <DemoPanel lang={lang} />

        {/* Footer */}
        <footer className="mt-12 border-t border-line pt-6 text-xs text-muted">
          <p>{LANDING.footer.builtBy[lang]}</p>
          <p className="mt-2">
            <Link href="/docs/data-governance" className="text-teal underline">
              {LANDING.footer.governance[lang]}
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <div
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal text-base font-semibold text-white"
    >
      {n}
    </div>
  );
}

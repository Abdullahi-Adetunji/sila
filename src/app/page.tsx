"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LANDING } from "@/lib/content-landing";
import { T, type Lang } from "@/lib/content";
import { PrototypeBanner } from "./components/PrototypeBanner";
import { LangSwitch } from "./components/LangSwitch";
import { DemoPanel } from "./components/DemoPanel";
import { Reveal } from "./components/Reveal";
import { StatStrip } from "./components/StatStrip";
import { SecurityFlow } from "./components/SecurityFlow";
import { PanelGrid } from "./components/PanelGrid";
import {
  IconArrowRight,
  IconEye,
  IconHandshake,
  IconHelix,
  IconLock,
  IconScroll,
  IconShield,
  IconUsers,
} from "./components/Icons";
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
    <div dir={dir} lang={lang} className="landing-root min-h-screen">
      {/* Very soft green-tinted wash in the top-right of the hero. No
          animation — a clinical app doesn't need motion in the background. */}
      <div aria-hidden className="aurora" />

      <div className="relative z-10">
        <PrototypeBanner lang={lang} />

        {/* Nav */}
        <header className="relative z-10 border-b border-line bg-surface/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 text-ink">
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal/30 bg-teal-soft text-teal"
              >
                <IconHelix />
              </span>
              <span className="text-lg font-semibold tracking-tight">{T.appName[lang]}</span>
            </div>
            <div className="flex items-center gap-3">
              <LangSwitch lang={lang} onChange={setLang} />
              <Link
                href="/login"
                className="hidden rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-teal hover:text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal sm:inline-flex"
              >
                {LANDING.hero.ctaSignIn[lang]}
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-teal px-4 py-1.5 text-sm font-medium text-white transition-[filter,transform] hover:brightness-110 hover:translate-y-[-1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                {LANDING.hero.ctaCreate[lang]}
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-20">
          {/* Hero */}
          <section className="relative pt-16 pb-16">
            <Reveal>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal-soft px-3 py-1 text-xs font-medium uppercase tracking-wider text-teal">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-teal" />
                Carrier screening for couples
              </p>
            </Reveal>

            <Reveal delay={1}>
              <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl md:text-6xl">
                <span className="hero-gradient-text">
                  {LANDING.hero.tagline[lang]}
                </span>
              </h1>
            </Reveal>

            <Reveal delay={2}>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
                {LANDING.scope.isBody[lang]}
              </p>
            </Reveal>

            <Reveal delay={3}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white transition-[filter,transform] hover:brightness-110 hover:translate-y-[-1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  {LANDING.hero.ctaCreate[lang]}
                  <span
                    aria-hidden
                    className="transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:-scale-x-100"
                  >
                    <IconArrowRight />
                  </span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-teal hover:text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  {LANDING.hero.ctaSignIn[lang]}
                </Link>
              </div>
            </Reveal>

            {lang === "ar" && (
              <Reveal delay={4}>
                <p className="mt-6 inline-block rounded-xl border border-carrier/40 bg-carrier-soft px-3 py-2 text-xs text-ink">
                  {LANDING.draftNote[lang]}
                </p>
              </Reveal>
            )}
          </section>

          {/* Numbers strip */}
          <Reveal as="section" className="mt-6">
            <SectionHeader eyebrow="At a glance" title={LANDING.stats.heading[lang]} />
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              {LANDING.stats.body[lang]}
            </p>
            <StatStrip />
          </Reveal>

          {/* How it works */}
          <Reveal as="section" className="mt-20">
            <SectionHeader eyebrow="Process" title={LANDING.how.heading[lang]} />
            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {([
                { title: LANDING.how.step1Title, body: LANDING.how.step1Body, Icon: IconLock },
                { title: LANDING.how.step2Title, body: LANDING.how.step2Body, Icon: IconUsers },
                { title: LANDING.how.step3Title, body: LANDING.how.step3Body, Icon: IconHandshake },
              ] as const).map((step, i) => (
                <Reveal as="li" key={i} delay={((i + 1) as 1 | 2 | 3)}>
                  <div className="glass-card h-full p-6">
                    <div className="flex items-center justify-between">
                      <span
                        aria-hidden
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-soft text-teal"
                      >
                        <step.Icon />
                      </span>
                      <span className="font-mono text-xs text-muted">0{i + 1}</span>
                    </div>
                    <p className="mt-5 text-base font-semibold text-ink">{step.title[lang]}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{step.body[lang]}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </Reveal>

          {/* Security flow */}
          <Reveal as="section" className="mt-20">
            <SectionHeader eyebrow="Mechanics" title={LANDING.flow.heading[lang]} />
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              {LANDING.flow.body[lang]}
            </p>
            <SecurityFlow lang={lang} />
          </Reveal>

          {/* Privacy promises */}
          <Reveal as="section" className="mt-20">
            <SectionHeader eyebrow="Guarantees" title={LANDING.privacy.heading[lang]} />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {([
                { k: "p1", Icon: IconLock },
                { k: "p2", Icon: IconShield },
                { k: "p3", Icon: IconEye },
                { k: "p4", Icon: IconScroll },
                { k: "p5", Icon: IconHandshake },
              ] as const).map((row, i) => (
                <Reveal
                  as="li"
                  key={row.k}
                  delay={((Math.min(i + 1, 6)) as 1 | 2 | 3 | 4 | 5 | 6)}
                >
                  <div className="glass-card h-full p-5">
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal"
                      >
                        <row.Icon />
                      </span>
                      <p className="text-sm leading-relaxed text-ink">
                        {LANDING.privacy[row.k][lang]}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ul>
          </Reveal>

          {/* Panel coverage */}
          <Reveal as="section" className="mt-20">
            <SectionHeader eyebrow="Coverage" title={LANDING.panel.heading[lang]} />
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              {LANDING.panel.body[lang]}
            </p>
            <PanelGrid lang={lang} />
          </Reveal>

          {/* Scope */}
          <Reveal as="section" className="mt-20">
            <SectionHeader eyebrow="Scope" title={LANDING.scope.heading[lang]} />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Reveal delay={1}>
                <article className="glass-card glass-card-strong h-full p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal">
                    {LANDING.scope.isTitle[lang]}
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-ink">
                    {LANDING.scope.isBody[lang]}
                  </p>
                </article>
              </Reveal>
              <Reveal delay={2}>
                <article className="glass-card h-full p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {LANDING.scope.isntTitle[lang]}
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-ink">
                    {LANDING.scope.isntBody[lang]}
                  </p>
                </article>
              </Reveal>
            </div>
          </Reveal>

          {/* Demo panel */}
          <Reveal as="section">
            <DemoPanel lang={lang} />
          </Reveal>

          {/* Footer */}
          <footer className="mt-20 border-t border-line pt-10 text-sm text-muted">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="flex items-center gap-2 text-ink">
                  <span
                    aria-hidden
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal/30 bg-teal-soft text-teal"
                  >
                    <IconHelix />
                  </span>
                  <span className="text-lg font-semibold tracking-tight">{T.appName[lang]}</span>
                </div>
                <p className="mt-4 text-xs leading-relaxed">{LANDING.footer.builtBy[lang]}</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-ink">
                  {lang === "en" ? "Documentation" : "التوثيق"}
                </p>
                <ul className="mt-4 space-y-2 text-xs">
                  <li>
                    <Link href="/docs/data-governance" className="hover:text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm">
                      {LANDING.footer.governance[lang]}
                    </Link>
                  </li>
                  <li>
                    <Link href="/docs/threat-model" className="hover:text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm">
                      {lang === "en" ? "Threat model (STRIDE)" : "نموذج التهديدات (STRIDE)"}
                    </Link>
                  </li>
                  <li>
                    <Link href="/docs/security-controls" className="hover:text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm">
                      {lang === "en" ? "Security controls" : "ضوابط الأمن"}
                    </Link>
                  </li>
                  <li>
                    <Link href="/docs/evaluation-results" className="hover:text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm">
                      {lang === "en" ? "Evaluation results" : "نتائج التقييم"}
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-ink">
                  {lang === "en" ? "Get started" : "ابدأ"}
                </p>
                <ul className="mt-4 space-y-2 text-xs">
                  <li>
                    <Link href="/signup" className="hover:text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm">
                      {LANDING.hero.ctaCreate[lang]}
                    </Link>
                  </li>
                  <li>
                    <Link href="/login" className="hover:text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm">
                      {LANDING.hero.ctaSignIn[lang]}
                    </Link>
                  </li>
                  <li>
                    <Link href="/volunteer" className="hover:text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm">
                      {lang === "en" ? "Volunteer (study mode)" : "المشاركة في الدراسة"}
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-ink">
                  {lang === "en" ? "Scope" : "النطاق"}
                </p>
                <p className="mt-4 text-xs leading-relaxed">
                  {lang === "en"
                    ? "Prototype using synthetic data. Not medical advice. Not a diagnosis. No real genetic data is collected or processed."
                    : "نموذج تجريبي باستخدام بيانات اصطناعية. ليس استشارة طبية. ليس تشخيصاً. لا تُجمَع أو تُعالَج أي بيانات وراثية حقيقية."}
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-muted">
                CEDELA Tech Park Solutions · Future Health Digital Innovation Challenge 03
              </p>
              <p className="font-mono text-muted">
                {lang === "en"
                  ? "No AI in risk calculation. No AI in clinical text."
                  : "لا ذكاء اصطناعي في حساب الخطر. لا ذكاء اصطناعي في النصوص السريرية."}
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
        <span aria-hidden className="rule-green" />
        {eyebrow}
      </p>
      <h2 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {title}
      </h2>
    </div>
  );
}

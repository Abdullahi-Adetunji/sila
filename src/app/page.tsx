"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LANDING } from "@/lib/content-landing";
import { T, type Lang } from "@/lib/content";
import { PrototypeBanner } from "./components/PrototypeBanner";
import { LangSwitch } from "./components/LangSwitch";
import { DemoPanel } from "./components/DemoPanel";
import { BackgroundAurora } from "./components/BackgroundAurora";
import { Reveal } from "./components/Reveal";
import { StatStrip } from "./components/StatStrip";
import { SecurityFlow } from "./components/SecurityFlow";
import { PanelGrid } from "./components/PanelGrid";
import {
  IconArrowRight,
  IconChevronDown,
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
      <BackgroundAurora />

      <div className="relative z-10">
        <PrototypeBanner lang={lang} onDark />

        {/* Nav */}
        <header className="relative z-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 pb-6 pt-4">
            <div className="flex items-center gap-2 text-glass-ink">
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-accent-mint"
              >
                <IconHelix />
              </span>
              <span className="text-xl font-semibold tracking-tight">{T.appName[lang]}</span>
            </div>
            <LangSwitch lang={lang} onChange={setLang} onDark />
          </div>
        </header>

        {/* Hero */}
        <main className="mx-auto max-w-6xl px-4 pb-20">
          <section className="relative pt-10 pb-20 sm:pt-16">
            <Reveal>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wider text-glass-ink-muted">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--accent-mint)" }}
                />
                Carrier screening, built for couples
              </p>
            </Reveal>

            <Reveal delay={1}>
              <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
                <span className="hero-gradient-text">{LANDING.hero.tagline[lang]}</span>
              </h1>
            </Reveal>

            <Reveal delay={2}>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-glass-ink-muted sm:text-lg">
                {LANDING.scope.isBody[lang]}
              </p>
            </Reveal>

            <Reveal delay={3}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 rounded-full bg-accent-mint px-5 py-2.5 text-sm font-medium text-deep-900 transition-[filter,transform] hover:brightness-110 hover:translate-y-[-1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint"
                >
                  {LANDING.hero.ctaCreate[lang]}
                  <span className="transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:-scale-x-100" aria-hidden>
                    <IconArrowRight />
                  </span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-glass-ink backdrop-blur transition-colors hover:border-white/30 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint"
                >
                  {LANDING.hero.ctaSignIn[lang]}
                </Link>
              </div>
            </Reveal>

            {lang === "ar" && (
              <Reveal delay={4}>
                <p className="mt-8 inline-block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-glass-ink-muted">
                  {LANDING.draftNote[lang]}
                </p>
              </Reveal>
            )}

            {/* Scroll affordance */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center text-glass-ink-muted"
              style={{ animation: "drift 3.6s ease-in-out infinite" }}
            >
              <IconChevronDown />
            </div>
          </section>

          {/* Numbers strip — immediately under the hero so a skimming reader
              sees defensible figures without having to scroll. */}
          <Reveal as="section" className="mt-6">
            <SectionHeader eyebrow="At a glance" title={LANDING.stats.heading[lang]} />
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-glass-ink-muted">
              {LANDING.stats.body[lang]}
            </p>
            <StatStrip />
          </Reveal>

          {/* How it works */}
          <Reveal as="section" className="mt-20">
            <SectionHeader
              eyebrow="Process"
              title={LANDING.how.heading[lang]}
            />
            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {([
                {
                  title: LANDING.how.step1Title,
                  body: LANDING.how.step1Body,
                  Icon: IconLock,
                },
                {
                  title: LANDING.how.step2Title,
                  body: LANDING.how.step2Body,
                  Icon: IconUsers,
                },
                {
                  title: LANDING.how.step3Title,
                  body: LANDING.how.step3Body,
                  Icon: IconHandshake,
                },
              ] as const).map((step, i) => (
                <Reveal as="li" key={i} delay={((i + 1) as 1 | 2 | 3)}>
                  <div className="glass-card h-full p-6">
                    <div className="flex items-center justify-between">
                      <span
                        aria-hidden
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-mint/30 bg-accent-mint/10 text-xl text-accent-mint"
                      >
                        <step.Icon />
                      </span>
                      <span className="font-mono text-xs text-glass-ink-muted">
                        0{i + 1}
                      </span>
                    </div>
                    <p className="mt-5 text-base font-semibold text-glass-ink">
                      {step.title[lang]}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-glass-ink-muted">
                      {step.body[lang]}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </Reveal>

          {/* Security flow — concrete, mirrors the code path. */}
          <Reveal as="section" className="mt-20">
            <SectionHeader eyebrow="Mechanics" title={LANDING.flow.heading[lang]} />
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-glass-ink-muted">
              {LANDING.flow.body[lang]}
            </p>
            <SecurityFlow lang={lang} />
          </Reveal>

          {/* Privacy promises */}
          <Reveal as="section" className="mt-20">
            <SectionHeader
              eyebrow="Guarantees"
              title={LANDING.privacy.heading[lang]}
            />
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
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-accent-mint"
                      >
                        <row.Icon />
                      </span>
                      <p className="text-sm leading-relaxed text-glass-ink">
                        {LANDING.privacy[row.k][lang]}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ul>
          </Reveal>

          {/* Panel coverage — the only honest answer to 'what does Sila
              screen for'. Rendered straight from src/lib/genetics/panel.ts. */}
          <Reveal as="section" className="mt-20">
            <SectionHeader eyebrow="Coverage" title={LANDING.panel.heading[lang]} />
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-glass-ink-muted">
              {LANDING.panel.body[lang]}
            </p>
            <PanelGrid lang={lang} />
          </Reveal>

          {/* What Sila is / isn't */}
          <Reveal as="section" className="mt-20">
            <SectionHeader
              eyebrow="Scope"
              title={LANDING.scope.heading[lang]}
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Reveal delay={1}>
                <article className="glass-card glass-card-strong h-full p-6">
                  <p className="text-xs font-medium uppercase tracking-wider text-accent-mint">
                    {LANDING.scope.isTitle[lang]}
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-glass-ink">
                    {LANDING.scope.isBody[lang]}
                  </p>
                </article>
              </Reveal>
              <Reveal delay={2}>
                <article className="glass-card h-full p-6">
                  <p className="text-xs font-medium uppercase tracking-wider text-glass-ink-muted">
                    {LANDING.scope.isntTitle[lang]}
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-glass-ink">
                    {LANDING.scope.isntBody[lang]}
                  </p>
                </article>
              </Reveal>
            </div>
          </Reveal>

          {/* Demo panel (only when DEMO_MODE=true). The component gates on
              /api/demo/config internally. */}
          <Reveal as="section">
            <DemoPanel lang={lang} onDark />
          </Reveal>

          {/* Footer — scope statement, mark + live URL, three link columns
              (governance, repo, contact-less contact). No stock imagery, no
              social buttons, no newsletter. */}
          <footer className="mt-20 border-t border-white/10 pt-10 text-sm text-glass-ink-muted">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="flex items-center gap-2 text-glass-ink">
                  <span
                    aria-hidden
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-accent-mint"
                  >
                    <IconHelix />
                  </span>
                  <span className="text-lg font-semibold tracking-tight">{T.appName[lang]}</span>
                </div>
                <p className="mt-4 text-xs leading-relaxed">{LANDING.footer.builtBy[lang]}</p>
                <p className="mt-3 text-xs">
                  <a
                    href="https://sila-a7fx.onrender.com"
                    className="inline-flex items-center gap-1 rounded-full border border-accent-mint/30 bg-accent-mint/10 px-2.5 py-1 font-mono text-accent-mint transition-colors hover:border-accent-mint/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint"
                  >
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent-mint)" }} />
                    {LANDING.footer.liveUrl[lang]}
                  </a>
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-glass-ink">
                  {lang === "en" ? "Documentation" : "التوثيق"}
                </p>
                <ul className="mt-4 space-y-2 text-xs">
                  <li>
                    <Link
                      href="/docs/data-governance"
                      className="hover:text-glass-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint rounded-sm"
                    >
                      {LANDING.footer.governance[lang]}
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://github.com/Abdullahi-Adetunji/sila/blob/main/docs/threat-model.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-glass-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint rounded-sm"
                    >
                      {lang === "en" ? "Threat model (STRIDE)" : "نموذج التهديدات (STRIDE)"}
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/Abdullahi-Adetunji/sila/blob/main/docs/security-controls.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-glass-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint rounded-sm"
                    >
                      {lang === "en" ? "Security controls" : "ضوابط الأمن"}
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/Abdullahi-Adetunji/sila/blob/main/docs/evaluation-results.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-glass-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint rounded-sm"
                    >
                      {lang === "en" ? "Evaluation results" : "نتائج التقييم"}
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-glass-ink">
                  {lang === "en" ? "Source" : "الشيفرة"}
                </p>
                <ul className="mt-4 space-y-2 text-xs">
                  <li>
                    <a
                      href="https://github.com/Abdullahi-Adetunji/sila"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-glass-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint rounded-sm"
                    >
                      {lang === "en" ? "Repository on GitHub" : "المستودع على GitHub"}
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/Abdullahi-Adetunji/sila/blob/main/data/synthetic/couples.json"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-glass-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint rounded-sm"
                    >
                      {lang === "en" ? "Synthetic dataset" : "البيانات الاصطناعية"}
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/Abdullahi-Adetunji/sila/blob/main/src/lib/genetics/panel.ts"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-glass-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-mint rounded-sm"
                    >
                      {lang === "en" ? "Panel definition" : "تعريف الفحص"}
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-glass-ink">
                  {lang === "en" ? "Scope" : "النطاق"}
                </p>
                <p className="mt-4 text-xs leading-relaxed">
                  {lang === "en"
                    ? "Prototype using synthetic data. Not medical advice. Not a diagnosis. No real genetic data is collected or processed."
                    : "نموذج تجريبي باستخدام بيانات اصطناعية. ليس استشارة طبية. ليس تشخيصاً. لا تُجمَع أو تُعالَج أي بيانات وراثية حقيقية."}
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-glass-ink-muted">
                CEDELA Tech Park Solutions · Future Health Digital Innovation Challenge 03
              </p>
              <p className="font-mono text-glass-ink-muted">
                {lang === "en" ? "No AI in risk calculation. No AI in clinical text." : "لا ذكاء اصطناعي في حساب الخطر. لا ذكاء اصطناعي في النصوص السريرية."}
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
      <p className="text-xs uppercase tracking-[0.2em] text-glass-ink-muted">{eyebrow}</p>
      <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-glass-ink sm:text-3xl">
        {title}
      </h2>
    </div>
  );
}

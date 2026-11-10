"use client";

import Link from "next/link";
import { useSession } from "../../lib/session";
import { Reveal } from "../../components/Reveal";
import {
  IconArrowRight,
  IconEye,
  IconHandshake,
  IconHelix,
  IconLock,
  IconScroll,
  IconUsers,
} from "../../components/Icons";

type CardDef = {
  href: string;
  title: string;
  body: string;
  Icon: (p: { className?: string }) => React.ReactElement;
  accent: "teal" | "mint" | "sand";
};

export default function HomePage() {
  const { user } = useSession();

  const cards: CardDef[] = [
    {
      href: "/me",
      title: "Your result",
      body: "The carrier screening result held in your own vault.",
      Icon: IconLock,
      accent: "teal",
    },
    {
      href: "/partner",
      title: "Partner",
      body: "Link to a partner by invite code.",
      Icon: IconUsers,
      accent: "mint",
    },
    {
      href: "/consent",
      title: "Consent",
      body: "Grant or revoke sharing. Revocation takes effect at once.",
      Icon: IconHandshake,
      accent: "teal",
    },
    {
      href: "/couple",
      title: "Couple result",
      body: "Shown when both of you have granted couple risk.",
      Icon: IconHelix,
      accent: "mint",
    },
    {
      href: "/options",
      title: "Options",
      body: "A neutral list of things couples can consider. No ranking, no recommendation.",
      Icon: IconEye,
      accent: "sand",
    },
    {
      href: "/access-log",
      title: "Access log",
      body: "Every access decision about your data, newest first.",
      Icon: IconScroll,
      accent: "sand",
    },
  ];

  const accentCls: Record<CardDef["accent"], string> = {
    teal: "text-teal bg-teal-soft",
    mint: "text-teal bg-[color:var(--accent-mint)]/15",
    sand: "text-carrier bg-carrier-soft",
  };

  return (
    <main>
      <Reveal>
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Overview</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome{user ? `, ${user.email.split("@")[0]}` : ""}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            You hold your own result. Nothing is shared with your partner, a relative, or a
            counsellor until you say so on the Consent page.
          </p>
        </header>
      </Reveal>

      <ul className="grid gap-4 sm:grid-cols-2">
        {cards.map((c, i) => (
          <Reveal
            as="li"
            key={c.href}
            delay={((Math.min(i + 1, 6)) as 1 | 2 | 3 | 4 | 5 | 6)}
          >
            <Link
              href={c.href}
              className="group relative block overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              <div className="flex items-start justify-between">
                <span
                  aria-hidden
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentCls[c.accent]} transition-transform group-hover:scale-105`}
                >
                  <c.Icon />
                </span>
                <span
                  aria-hidden
                  className="text-muted opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100"
                >
                  <IconArrowRight />
                </span>
              </div>
              <p className="mt-4 text-base font-semibold">{c.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{c.body}</p>
            </Link>
          </Reveal>
        ))}
      </ul>
    </main>
  );
}

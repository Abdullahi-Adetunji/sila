"use client";

import Link from "next/link";
import { useSession } from "../../lib/session";

export default function HomePage() {
  const { user } = useSession();

  const cards: Array<{ href: string; title: string; body: string }> = [
    {
      href: "/me",
      title: "Your result",
      body: "The carrier screening result held in your own vault.",
    },
    {
      href: "/partner",
      title: "Partner",
      body: "Link to a partner by invite code.",
    },
    {
      href: "/consent",
      title: "Consent",
      body: "Grant or revoke sharing. Revocation takes effect at once.",
    },
    {
      href: "/couple",
      title: "Couple result",
      body: "Shown when both of you have granted couple risk.",
    },
    {
      href: "/options",
      title: "Options",
      body: "A neutral list of things couples can consider. No ranking, no recommendation.",
    },
    {
      href: "/access-log",
      title: "Access log",
      body: "Every access decision about your data, newest first.",
    },
  ];

  return (
    <main>
      <h1 className="text-2xl font-semibold">
        Welcome{user ? `, ${user.email}` : ""}
      </h1>
      <p className="mt-2 text-sm text-muted">
        You hold your own result. Nothing is shared with your partner, a relative, or a
        counsellor until you say so on the Consent page.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="block rounded-2xl border border-line bg-surface p-4 hover:border-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              <p className="text-base font-semibold">{c.title}</p>
              <p className="mt-1 text-sm text-muted">{c.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

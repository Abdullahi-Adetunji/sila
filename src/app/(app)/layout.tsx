"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "../lib/session";
import { api } from "../lib/api";
import { useEffect } from "react";
import { PrototypeBanner } from "../components/PrototypeBanner";
import { IconHelix } from "../components/Icons";

// The signed-in shell. Everything a signed-in person, counsellor, lab or
// evaluator sees is wrapped by this layout. It keeps the chrome calm and
// clinical: a thin gradient accent on top links the page back to the
// landing aesthetic, the nav tabs animate their active state, and content
// below sits on the existing light surface so forms and result cards stay
// legible.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, csrfToken, loading, refresh } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  async function logout() {
    if (!csrfToken) return;
    try {
      await api.post("/api/auth/logout", undefined, csrfToken);
    } catch {
      /* ignore, still refresh */
    }
    await refresh();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">
        Loading…
      </main>
    );
  }
  if (!user) return null;

  const tabs: Array<{ href: string; label: string }> = [
    { href: "/home", label: "Home" },
    { href: "/me", label: "My result" },
    { href: "/partner", label: "Partner" },
    { href: "/consent", label: "Consent" },
    { href: "/couple", label: "Couple result" },
    { href: "/relatives", label: "Relatives" },
    { href: "/referrals", label: "Referrals" },
    { href: "/options", label: "Options" },
    { href: "/access-log", label: "Access log" },
  ];
  if (user.role === "counsellor") {
    tabs.push({ href: "/counsellor-queue", label: "Queue" });
  }
  if (user.role === "evaluator") {
    tabs.push({ href: "/evaluator", label: "Evaluator" });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Accent gradient strip — the only bit of the landing's palette that
          comes through on signed-in pages. It makes the site feel like one
          product without dragging the dark hero into clinical screens. */}
      <div
        aria-hidden
        className="h-[3px] w-full"
        style={{
          background:
            "linear-gradient(90deg, var(--teal) 0%, var(--accent-mint) 50%, var(--accent-sand) 100%)",
        }}
      />
      <PrototypeBanner lang={user.locale} />

      <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/home"
            className="group inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
          >
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal/30 bg-teal-soft text-teal transition-transform group-hover:scale-105"
            >
              <IconHelix />
            </span>
            Sila
          </Link>
          <div className="hidden text-xs text-muted sm:block">{user.email}</div>
          <button
            onClick={logout}
            className="rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-teal hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            Log out
          </button>
        </div>

        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 text-sm"
        >
          {tabs.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-full px-3 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
                  active
                    ? "bg-teal text-white shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-16 pt-8">{children}</section>
    </div>
  );
}

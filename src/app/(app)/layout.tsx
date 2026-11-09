"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "../lib/session";
import { api } from "../lib/api";
import { useEffect } from "react";
import { PrototypeBanner } from "../components/PrototypeBanner";

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
    return <main className="p-6 text-sm text-muted">Loading…</main>;
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
    <div className="min-h-screen">
      <PrototypeBanner lang={user.locale} />
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/home" className="text-lg font-semibold text-teal">
            Sila
          </Link>
          <div className="text-xs text-muted">{user.email}</div>
          <button
            onClick={logout}
            className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            Log out
          </button>
        </div>
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2 text-sm"
        >
          {tabs.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`rounded-full px-3 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
                  active ? "bg-teal text-white" : "text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <section className="mx-auto max-w-3xl px-4 pb-16 pt-6">{children}</section>
    </div>
  );
}

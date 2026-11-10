"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "../lib/session";
import { api } from "../lib/api";
import { useEffect } from "react";
import { PrototypeBanner } from "../components/PrototypeBanner";
import { IconHelix } from "../components/Icons";
import { isAllowedPath, startPathFor, tabsFor, type Role } from "../lib/roleRouting";

// The signed-in shell. Every signed-in page sits inside this layout; the
// tabs and the start-page redirect are driven by the user's role so a
// counsellor, lab, evaluator or admin never sees the person navigation.
// Server-side middleware (requirePersonRole and friends) refuses cross-role
// API calls separately; this layer is the UI mirror.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, csrfToken, loading, refresh } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Not signed in -> login.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Signed in but on a page not in this role's tabs -> role's start page.
  // We skip the redirect while loading so we don't flash a redirect before
  // the session is ready. The server-side guards return 403 if a client
  // ever skips this hop.
  useEffect(() => {
    if (loading || !user) return;
    const role = user.role as Role;
    if (!isAllowedPath(role, pathname)) {
      router.replace(startPathFor(role));
    }
  }, [loading, user, pathname, router]);

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

  const role = user.role as Role;
  const tabs = tabsFor(role);
  const start = startPathFor(role);

  return (
    <div className="min-h-screen bg-background">
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
            href={start}
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
          <div className="hidden items-center gap-2 text-xs text-muted sm:flex">
            <span>{user.email}</span>
            <span
              aria-label={`Role: ${role}`}
              className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wider"
            >
              {role}
            </span>
          </div>
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
            const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
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

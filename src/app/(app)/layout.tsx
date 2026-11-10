"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "../lib/session";
import { api } from "../lib/api";
import { useEffect, useState } from "react";
import { PrototypeBanner } from "../components/PrototypeBanner";
import {
  IconHelix,
  IconLock,
  IconUsers,
  IconHandshake,
  IconScroll,
  IconEye,
  IconSparkle,
  IconStethoscope,
  IconShield,
  IconArrowRight,
} from "../components/Icons";
import { isAllowedPath, startPathFor, tabsFor, type Role } from "../lib/roleRouting";

type TabIcon = (p: { className?: string }) => React.ReactElement;

// Icon per nav href. Clinical dashboards favour a left sidebar with a
// small icon per entry; this map keeps the sidebar readable without a
// marketing-y illustration set.
const NAV_ICON: Record<string, TabIcon> = {
  "/home": IconHelix,
  "/me": IconLock,
  "/partner": IconUsers,
  "/consent": IconHandshake,
  "/couple": IconHelix,
  "/relatives": IconUsers,
  "/referrals": IconHandshake,
  "/options": IconEye,
  "/access-log": IconScroll,
  "/counsellor-queue": IconStethoscope,
  "/evaluator": IconSparkle,
  "/lab": IconShield,
  "/admin": IconShield,
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, csrfToken, loading, refresh } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (loading || !user) return;
    const role = user.role as Role;
    if (!isAllowedPath(role, pathname)) {
      router.replace(startPathFor(role));
    }
  }, [loading, user, pathname, router]);

  // Close the mobile nav when the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
  const currentTab = tabs.find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`));

  return (
    <div className="dash-shell flex min-h-screen flex-col">
      <PrototypeBanner lang={user.locale} />

      <div className="flex min-h-0 flex-1">
        {/* Sidebar (desktop) */}
        <aside className="dash-side hidden w-64 shrink-0 flex-col lg:flex">
          <div className="flex h-14 items-center gap-2 border-b border-line px-4">
            <Link
              href={start}
              className="group inline-flex items-center gap-2 text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
            >
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal/30 bg-teal-soft text-teal transition-transform group-hover:scale-105"
              >
                <IconHelix />
              </span>
              <span className="text-base font-semibold tracking-tight">Sila</span>
            </Link>
          </div>
          <nav aria-label="Primary" className="flex-1 overflow-y-auto p-3">
            <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
              {role === "person" ? "Account" : role}
            </p>
            <ul className="mt-1 space-y-1">
              {tabs.map((t) => {
                const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
                const Icon = NAV_ICON[t.href];
                return (
                  <li key={t.href}>
                    <Link
                      href={t.href}
                      aria-current={active ? "page" : undefined}
                      className="dash-side-link"
                    >
                      {Icon && (
                        <span aria-hidden className="text-base">
                          <Icon />
                        </span>
                      )}
                      <span>{t.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="border-t border-line p-3 text-xs">
            <p className="truncate text-muted" title={user.email}>
              {user.email}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className="rounded-full bg-teal-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal"
                aria-label={`Role: ${role}`}
              >
                {role}
              </span>
              <button
                onClick={logout}
                className="ml-auto rounded-full border border-line px-3 py-1 text-[11px] text-muted transition-colors hover:border-teal hover:text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                Log out
              </button>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar (mobile = logo + hamburger; desktop = breadcrumb) */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface/80 px-4 backdrop-blur">
            <div className="flex items-center gap-2 lg:hidden">
              <Link
                href={start}
                className="inline-flex items-center gap-2 text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
              >
                <span
                  aria-hidden
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal/30 bg-teal-soft text-teal"
                >
                  <IconHelix />
                </span>
                <span className="text-base font-semibold tracking-tight">Sila</span>
              </Link>
            </div>
            <div className="hidden items-center gap-2 text-sm text-muted lg:flex">
              <Link href={start} className="hover:text-ink">
                {role === "person" ? "Home" : role[0].toUpperCase() + role.slice(1)}
              </Link>
              {currentTab && currentTab.href !== start && (
                <>
                  <span aria-hidden className="text-muted/50">
                    /
                  </span>
                  <span className="font-medium text-ink">{currentTab.label}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:border-teal lg:hidden"
              >
                <span aria-hidden className="flex h-4 w-4 flex-col justify-between">
                  <span className="h-0.5 w-full rounded bg-current" />
                  <span className="h-0.5 w-full rounded bg-current" />
                  <span className="h-0.5 w-full rounded bg-current" />
                </span>
              </button>
              <button
                onClick={logout}
                className="hidden rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-teal hover:text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal lg:hidden"
              >
                Log out
              </button>
            </div>
          </header>

          {/* Mobile drawer */}
          {mobileOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Primary menu"
              className="fixed inset-0 z-30 lg:hidden"
            >
              <div
                aria-hidden
                onClick={() => setMobileOpen(false)}
                className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
              />
              <div className="dash-side absolute inset-y-0 start-0 flex w-72 flex-col shadow-xl">
                <div className="flex h-14 items-center justify-between border-b border-line px-4">
                  <span className="text-base font-semibold text-ink">Menu</span>
                  <button
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close menu"
                    className="rounded-full p-1 text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                  >
                    ✕
                  </button>
                </div>
                <nav aria-label="Primary" className="flex-1 overflow-y-auto p-3">
                  <ul className="space-y-1">
                    {tabs.map((t) => {
                      const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
                      const Icon = NAV_ICON[t.href];
                      return (
                        <li key={t.href}>
                          <Link
                            href={t.href}
                            aria-current={active ? "page" : undefined}
                            className="dash-side-link"
                          >
                            {Icon && (
                              <span aria-hidden className="text-base">
                                <Icon />
                              </span>
                            )}
                            <span>{t.label}</span>
                            <IconArrowRight />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
                <div className="border-t border-line p-3 text-xs">
                  <p className="truncate text-muted" title={user.email}>
                    {user.email}
                  </p>
                  <button
                    onClick={logout}
                    className="mt-3 w-full rounded-full border border-line px-3 py-1.5 text-[11px] text-muted transition-colors hover:border-teal hover:text-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </div>
          )}

          <main className="flex-1 overflow-x-hidden">
            <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

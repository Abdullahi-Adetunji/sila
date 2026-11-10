"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, isApiError } from "../lib/api";
import { startPathFor, type Role } from "../lib/roleRouting";
import { LANDING } from "@/lib/content-landing";
import { type Lang } from "@/lib/content";

type DemoAccount = "partner.a" | "partner.b" | "counsellor";

// Rendered on the landing page below the hero copy. Only visible when the
// server reports DEMO_MODE=true. The `onDark` prop ships the glass styling
// used on the landing; without it, the panel keeps its light treatment for
// any future in-app embed.
export function DemoPanel({
  lang,
  onDark = false,
}: {
  lang: Lang;
  onDark?: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<null | DemoAccount | "reset">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ enabled: boolean }>("/api/demo/config")
      .then((r) => setEnabled(r.enabled))
      .catch(() => setEnabled(false));
  }, []);

  if (enabled !== true) return null;

  async function signIn(account: DemoAccount) {
    setBusy(account);
    setError(null);
    try {
      const r = await api.post<{ user: { role: string } }>("/api/demo/login", { account });
      router.push(startPathFor((r.user?.role ?? "person") as Role));
    } catch (e: unknown) {
      if (isApiError(e) && e.status === 401) {
        setError("Demo accounts are not seeded. Run `npm run seed` first.");
      } else {
        setError("Could not sign you in to the demo.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function reset() {
    setBusy("reset");
    setError(null);
    try {
      const me = await api.get<{ user: { email: string }; csrfToken: string }>("/api/auth/me");
      if (!me.user.email.endsWith("@demo.sila")) {
        setError("Sign in as a demo account before resetting.");
        return;
      }
      await api.post("/api/demo/reset", {}, me.csrfToken);
    } catch {
      setError("Could not reset the demo. Sign in as a demo account, then try again.");
    } finally {
      setBusy(null);
    }
  }

  const container = onDark
    ? "glass-card mt-10 p-6"
    : "mt-10 rounded-2xl border border-line bg-surface p-5";
  const headingCls = onDark ? "text-lg font-semibold text-glass-ink" : "text-lg font-semibold";
  const bodyCls = onDark ? "mt-1 text-sm text-glass-ink-muted" : "mt-1 text-sm text-muted";
  const primaryBtn = onDark
    ? "bg-accent-mint text-deep-900 hover:brightness-110"
    : "bg-teal text-white";
  const ghostBtn = onDark
    ? "border border-accent-mint/60 text-accent-mint hover:bg-white/5"
    : "border border-teal text-teal";
  const resetBtn = onDark
    ? "border border-white/15 text-glass-ink-muted hover:text-glass-ink"
    : "border border-line text-muted hover:text-ink";
  const resetNoteCls = onDark ? "mt-3 text-xs text-glass-ink-muted" : "mt-3 text-xs text-muted";
  const ring = onDark ? "focus-visible:ring-accent-mint" : "focus-visible:ring-teal";

  return (
    <section aria-labelledby="demo-heading" className={container}>
      <h2 id="demo-heading" className={headingCls}>
        {LANDING.demo.heading[lang]}
      </h2>
      <p className={bodyCls}>{LANDING.demo.body[lang]}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => signIn("partner.a")}
          disabled={busy !== null}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-[filter,background] disabled:opacity-50 focus:outline-none focus-visible:ring-2 ${ring} ${primaryBtn}`}
        >
          {LANDING.demo.partnerA[lang]}
        </button>
        <button
          onClick={() => signIn("partner.b")}
          disabled={busy !== null}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-[filter,background] disabled:opacity-50 focus:outline-none focus-visible:ring-2 ${ring} ${primaryBtn}`}
        >
          {LANDING.demo.partnerB[lang]}
        </button>
        <button
          onClick={() => signIn("counsellor")}
          disabled={busy !== null}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-[filter,background] disabled:opacity-50 focus:outline-none focus-visible:ring-2 ${ring} ${ghostBtn}`}
        >
          {LANDING.demo.counsellor[lang]}
        </button>
        <button
          onClick={reset}
          disabled={busy !== null}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 ${ring} ${resetBtn}`}
        >
          {LANDING.demo.reset[lang]}
        </button>
      </div>
      <p className={resetNoteCls}>{LANDING.demo.resetNote[lang]}</p>
      {error && (
        <p className={onDark ? "mt-3 text-sm text-red-300" : "mt-3 text-sm text-red-600"} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

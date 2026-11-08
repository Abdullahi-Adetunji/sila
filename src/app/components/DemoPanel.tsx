"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, isApiError } from "../lib/api";
import { LANDING } from "@/lib/content-landing";
import { type Lang } from "@/lib/content";

type DemoAccount = "partner.a" | "partner.b" | "counsellor";

export function DemoPanel({ lang }: { lang: Lang }) {
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
      await api.post("/api/demo/login", { account });
      router.push("/home");
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
      // Need to be signed in as a demo account first.
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

  return (
    <section
      aria-labelledby="demo-heading"
      className="mt-10 rounded-2xl border border-line bg-surface p-5"
    >
      <h2 id="demo-heading" className="text-lg font-semibold">
        {LANDING.demo.heading[lang]}
      </h2>
      <p className="mt-1 text-sm text-muted">{LANDING.demo.body[lang]}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => signIn("partner.a")}
          disabled={busy !== null}
          className="rounded-full bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          {LANDING.demo.partnerA[lang]}
        </button>
        <button
          onClick={() => signIn("partner.b")}
          disabled={busy !== null}
          className="rounded-full bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          {LANDING.demo.partnerB[lang]}
        </button>
        <button
          onClick={() => signIn("counsellor")}
          disabled={busy !== null}
          className="rounded-full border border-teal px-4 py-2 text-sm font-medium text-teal disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          {LANDING.demo.counsellor[lang]}
        </button>
        <button
          onClick={reset}
          disabled={busy !== null}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-muted hover:text-ink disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          {LANDING.demo.reset[lang]}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted">{LANDING.demo.resetNote[lang]}</p>
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

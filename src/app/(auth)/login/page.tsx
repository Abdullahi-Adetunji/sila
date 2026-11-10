"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { api, isApiError } from "../../lib/api";
import { startPathFor, type Role } from "../../lib/roleRouting";
import { PasswordInput } from "../../components/PasswordInput";
import {
  IconArrowLeft,
  IconArrowRight,
  IconHelix,
  IconLock,
  IconShield,
} from "../../components/Icons";
import { Reveal } from "../../components/Reveal";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const r = await api.post<{ user: { role: string } }>("/api/auth/login", { email, password });
      router.push(startPathFor((r.user?.role ?? "person") as Role));
    } catch (e: unknown) {
      if (isApiError(e) && e.status === 401) setError("Incorrect email or password.");
      else setError("Could not log you in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Soft tinted radial — subtle, no layout cost. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(1200px 500px at 50% -10%, rgba(15,110,106,0.10), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="h-[3px] w-full"
        style={{
          background:
            "linear-gradient(90deg, var(--teal) 0%, var(--accent-mint) 50%, var(--accent-sand) 100%)",
        }}
      />

      <div className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1.5 text-sm text-muted backdrop-blur transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          <span aria-hidden className="transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 rtl:-scale-x-100">
            <IconArrowLeft />
          </span>
          Back to Sila
        </Link>
        <div className="flex items-center gap-2 text-teal">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal/30 bg-teal-soft"
          >
            <IconHelix />
          </span>
          <span className="text-sm font-semibold tracking-tight">Sila</span>
        </div>
      </div>

      <main className="relative z-10 mx-auto max-w-md px-4 pb-16 pt-6 sm:pt-12">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Members</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Welcome back.</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Prototype using synthetic data. Wording awaits clinical review.
          </p>
        </Reveal>

        <Reveal delay={1}>
          <form
            onSubmit={onSubmit}
            className="mt-8 space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-sm"
            aria-labelledby="login-heading"
          >
            <h2 id="login-heading" className="sr-only">
              Log in
            </h2>
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            </label>
            <label className="block text-sm font-medium">
              Password
              <PasswordInput
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="group inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white transition-[filter,transform] disabled:opacity-50 hover:brightness-110 hover:translate-y-[-1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              {submitting ? "Signing you in…" : "Sign in"}
              {!submitting && (
                <span
                  aria-hidden
                  className="transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:-scale-x-100"
                >
                  <IconArrowRight />
                </span>
              )}
            </button>
          </form>
        </Reveal>

        <Reveal delay={2}>
          <div className="mt-5 flex items-center justify-between text-xs text-muted">
            <div className="flex items-center gap-2">
              <IconLock /> <span>End-to-end session security</span>
            </div>
            <div className="flex items-center gap-2">
              <IconShield /> <span>Private by default</span>
            </div>
          </div>
        </Reveal>

        <p className="mt-8 text-center text-sm text-muted">
          No account yet?{" "}
          <Link
            href="/signup"
            className="font-medium text-teal underline underline-offset-4 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
          >
            Create one
          </Link>
          .
        </p>
      </main>
    </div>
  );
}

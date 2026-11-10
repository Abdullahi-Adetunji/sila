"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { api, isApiError } from "../../lib/api";
import { PasswordInput } from "../../components/PasswordInput";
import { IconArrowRight, IconHelix } from "../../components/Icons";
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
      await api.post("/api/auth/login", { email, password });
      router.push("/home");
    } catch (e: unknown) {
      if (isApiError(e) && e.status === 401) setError("Incorrect email or password.");
      else setError("Could not log you in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 pt-16">
      <Reveal>
        <div className="mb-6 flex items-center gap-2 text-teal">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal/30 bg-teal-soft"
          >
            <IconHelix />
          </span>
          <span className="text-lg font-semibold tracking-tight">Sila</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-2 text-sm text-muted">
          Prototype using synthetic data. Wording awaits clinical review.
        </p>
      </Reveal>

      <Reveal delay={1}>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
          </label>
          <label className="block text-sm">
            Password
            <PasswordInput
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="group inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white transition-[filter,transform] disabled:opacity-50 hover:brightness-110 hover:translate-y-[-1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            {submitting ? "Logging in…" : "Log in"}
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

      <p className="mt-6 text-sm text-muted">
        No account yet?{" "}
        <Link
          href="/signup"
          className="text-teal underline underline-offset-4 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
        >
          Create one
        </Link>
        .
      </p>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { api, isApiError } from "../../lib/api";
import { PasswordInput } from "../../components/PasswordInput";
import { IconArrowRight, IconHelix } from "../../components/Icons";
import { Reveal } from "../../components/Reveal";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [locale, setLocale] = useState<"en" | "ar">("en");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/auth/signup", { email, password, locale });
      router.push("/home");
    } catch (e: unknown) {
      if (isApiError(e) && e.status === 400) setError("Password must be at least 12 characters.");
      else if (isApiError(e) && e.status === 409) setError("That email is already registered.");
      else setError("Could not sign you up. Please try again.");
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
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-muted">
          You hold your own carrier result. A couple result is only shown when both partners
          consent.
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
            Password (at least 12 characters)
            <PasswordInput
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
              minLength={12}
            />
          </label>
          <label className="block text-sm">
            Language
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as "en" | "ar")}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="group inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white transition-[filter,transform] disabled:opacity-50 hover:brightness-110 hover:translate-y-[-1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            {submitting ? "Creating…" : "Create account"}
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
        Already have one?{" "}
        <Link
          href="/login"
          className="text-teal underline underline-offset-4 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
        >
          Log in
        </Link>
        .
      </p>
    </main>
  );
}

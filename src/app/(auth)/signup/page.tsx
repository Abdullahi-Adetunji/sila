"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { api, isApiError } from "../../lib/api";
import { PasswordInput } from "../../components/PasswordInput";
import {
  IconArrowLeft,
  IconArrowRight,
  IconHelix,
  IconLock,
  IconShield,
} from "../../components/Icons";
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
      if (isApiError(e) && e.status === 400) {
        // The server returns a specific reason for every failed strength
        // check (length, common password, digits-only, email-prefix, few
        // distinct chars). Surface it verbatim so people know what to fix.
        const msg = (e.body as { error?: string } | null)?.error;
        setError(msg || "Password did not meet the strength requirements.");
      } else if (isApiError(e) && e.status === 409) setError("That email is already registered.");
      else setError("Could not sign you up. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // A small helper — we show a single-line strength hint while they type so
  // the 12-character minimum doesn't fail silently on submit.
  const hint =
    password.length === 0
      ? ""
      : password.length < 12
        ? `${12 - password.length} more characters needed`
        : "Looks good.";

  return (
    <div className="relative min-h-screen bg-background">
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
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Get started</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Create your account.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            You hold your own carrier result. A couple result is only shown when both partners
            consent.
          </p>
        </Reveal>

        <Reveal delay={1}>
          <form
            onSubmit={onSubmit}
            className="mt-8 space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-sm"
            aria-labelledby="signup-heading"
          >
            <h2 id="signup-heading" className="sr-only">
              Create account
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
                autoComplete="new-password"
                required
                minLength={12}
              />
              <span
                aria-live="polite"
                className={`mt-1.5 inline-block text-xs ${
                  password.length === 0
                    ? "text-muted"
                    : password.length < 12
                      ? "text-carrier"
                      : "text-teal"
                }`}
              >
                {hint || "At least 12 characters; avoid common passwords and all-digit sequences."}
              </span>
            </label>
            <label className="block text-sm font-medium">
              Language
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as "en" | "ar")}
                className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
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
              {submitting ? "Creating your account…" : "Create account"}
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
              <IconLock /> <span>Argon2id password hashing</span>
            </div>
            <div className="flex items-center gap-2">
              <IconShield /> <span>Encrypted vault, you hold the key</span>
            </div>
          </div>
        </Reveal>

        <p className="mt-8 text-center text-sm text-muted">
          Already have one?{" "}
          <Link
            href="/login"
            className="font-medium text-teal underline underline-offset-4 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
          >
            Sign in
          </Link>
          .
        </p>
      </main>
    </div>
  );
}

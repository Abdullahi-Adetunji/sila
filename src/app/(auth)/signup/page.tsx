"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { api, isApiError } from "../../lib/api";

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
      <h1 className="text-2xl font-semibold">Create your Sila account</h1>
      <p className="mt-2 text-sm text-muted">
        You hold your own carrier result. A couple result is only shown when both partners
        consent.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Password (at least 12 characters)
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Language
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as "en" | "ar")}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2"
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        Already have one?{" "}
        <Link href="/login" className="text-teal underline">
          Log in
        </Link>
        .
      </p>
    </main>
  );
}

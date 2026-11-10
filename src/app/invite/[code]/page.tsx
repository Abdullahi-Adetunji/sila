"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, isApiError } from "../../lib/api";
import { startPathFor, type Role } from "../../lib/roleRouting";
import { PasswordInput } from "../../components/PasswordInput";
import { IconArrowLeft, IconArrowRight, IconHelix, IconShield } from "../../components/Icons";
import { Reveal } from "../../components/Reveal";

interface InviteResponse {
  invite: {
    id: string;
    role: Role;
    email: string;
    displayName: string;
    expiresAt: string;
  };
  totp: {
    secret: string;
    otpauth: string;
    recoveryCodes: string[];
  };
}

type Step = "set-password" | "enrol-totp" | "save-recovery" | "done";

export default function InviteClaimPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [data, setData] = useState<InviteResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "not-found" | "expired" | "error">(
    "loading",
  );
  const [step, setStep] = useState<Step>("set-password");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [savedRecovery, setSavedRecovery] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<InviteResponse>(`/api/invite/${encodeURIComponent(code)}`)
      .then((r) => {
        setData(r);
        setState("ready");
      })
      .catch((e: unknown) => {
        if (isApiError(e) && e.status === 404) setState("not-found");
        else setState("error");
      });
  }, [code]);

  async function submit() {
    if (!data) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await api.post<{ user: { role: string } }>(
        `/api/invite/${encodeURIComponent(code)}/claim`,
        { password, totpCode },
      );
      setStep("save-recovery");
      // Router push happens from the save-recovery screen after the user
      // confirms they've stored the codes.
      void r;
    } catch (e: unknown) {
      if (isApiError(e)) {
        const msg = (e.body as { error?: string } | null)?.error ?? "";
        if (msg === "invalid_totp") setSubmitError("That code didn't match. Open your authenticator app, wait for a new 6-digit code, and try again.");
        else if (msg === "setup_expired") setSubmitError("The setup window expired. Refresh the page to start over.");
        else if (msg === "invite_already_used") setSubmitError("This invite link has already been used. Ask the admin for a new one.");
        else if (msg === "email_already_registered") setSubmitError("An account with this email already exists. Ask the admin for help.");
        else if (msg) setSubmitError(msg);
        else setSubmitError("Could not complete sign up. Please try again.");
      } else {
        setSubmitError("Could not complete sign up. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function finish() {
    if (!data) return;
    router.push(startPathFor(data.invite.role));
  }

  if (state === "loading") {
    return <Shell><p className="text-sm text-muted">Loading…</p></Shell>;
  }
  if (state === "not-found") {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold tracking-tight">Invite not found</h1>
        <p className="mt-3 text-sm text-muted">
          This invite link isn&apos;t usable — it may have been consumed, revoked, or expired. Ask
          the admin who created it for a new one.
        </p>
      </Shell>
    );
  }
  if (state === "error" || !data) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-3 text-sm text-muted">Please reload the page and try again.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
          <span aria-hidden className="rule-green" />
          Staff invite
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Set up your Sila {data.invite.role} account
        </h1>
        <p className="mt-3 text-sm text-muted">
          Invited as <strong>{data.invite.displayName}</strong> ({data.invite.email}). Link expires{" "}
          {new Date(data.invite.expiresAt).toLocaleString()}.
        </p>
      </Reveal>

      <Reveal delay={1}>
        <ol className="mt-8 flex items-center gap-2 text-xs text-muted">
          <StepDot label="Password" active={step === "set-password"} done={step !== "set-password"} />
          <span aria-hidden className="h-px w-8 bg-line" />
          <StepDot label="Authenticator" active={step === "enrol-totp"} done={step === "save-recovery" || step === "done"} />
          <span aria-hidden className="h-px w-8 bg-line" />
          <StepDot label="Recovery codes" active={step === "save-recovery"} done={step === "done"} />
        </ol>
      </Reveal>

      {step === "set-password" && (
        <Reveal delay={2}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password.length < 12) return;
              setStep("enrol-totp");
            }}
            className="mt-8 space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-sm"
          >
            <label className="block text-sm font-medium">
              Choose a password
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
                {password.length === 0
                  ? "At least 12 characters; avoid common passwords and all-digit sequences."
                  : password.length < 12
                    ? `${12 - password.length} more characters needed`
                    : "Looks good."}
              </span>
            </label>
            <button
              type="submit"
              disabled={password.length < 12}
              className="group inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white transition-[filter,transform] hover:brightness-110 hover:translate-y-[-1px] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              Next: enrol two-step <IconArrowRight />
            </button>
          </form>
        </Reveal>
      )}

      {step === "enrol-totp" && (
        <Reveal delay={2}>
          <section className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Enrol your authenticator</h2>
            <p className="mt-2 text-sm text-muted">
              Open an authenticator app (1Password, Google Authenticator, Authy, etc.) and add a new
              entry for <code className="font-mono">Sila: {data.invite.email}</code>. Scan the QR or
              type the secret, then enter the 6-digit code the app shows.
            </p>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Secret (type into your app)
              </p>
              <p className="mt-2 break-all rounded-xl border border-line bg-background px-4 py-3 font-mono text-sm tracking-widest text-ink">
                {data.totp.secret}
              </p>
              <p className="mt-2 text-xs text-muted">
                SHA1, 6 digits, 30-second period. Every authenticator app supports manual key entry.
              </p>
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer text-teal">
                  Or copy the full otpauth URI
                </summary>
                <p className="mt-2 break-all rounded-lg bg-background px-3 py-2 font-mono text-[10px] text-muted">
                  {data.totp.otpauth}
                </p>
              </details>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="mt-6"
            >
              <label className="block text-sm font-medium">
                6-digit code
                <input
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-lg tracking-widest outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
                />
              </label>
              {submitError && (
                <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </p>
              )}
              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep("set-password")}
                  className="rounded-full border border-line px-4 py-2 text-xs text-muted transition-colors hover:border-teal hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  <IconArrowLeft /> Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || totpCode.length !== 6}
                  className="group ml-auto inline-flex items-center gap-1.5 rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white transition-[filter,transform] hover:brightness-110 hover:translate-y-[-1px] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  {submitting ? "Verifying…" : "Verify and create account"}
                  {!submitting && <IconArrowRight />}
                </button>
              </div>
            </form>
          </section>
        </Reveal>
      )}

      {step === "save-recovery" && (
        <Reveal delay={2}>
          <section className="mt-8 rounded-2xl border border-teal/40 bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Save your recovery codes</h2>
            <p className="mt-2 text-sm text-muted">
              These one-time codes let you sign in if you lose your authenticator. Store them in
              your password manager now — Sila will not show them again.
            </p>
            <ul className="mt-4 grid gap-2 font-mono text-sm sm:grid-cols-2">
              {data.totp.recoveryCodes.map((rc) => (
                <li
                  key={rc}
                  className="rounded-lg border border-line bg-background px-3 py-2 tracking-wider text-ink"
                >
                  {rc}
                </li>
              ))}
            </ul>
            <label className="mt-6 flex items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={savedRecovery}
                onChange={(e) => setSavedRecovery(e.target.checked)}
                className="h-4 w-4 rounded border-line text-teal focus:ring-teal"
              />
              I&apos;ve saved my recovery codes somewhere safe.
            </label>
            <button
              type="button"
              disabled={!savedRecovery}
              onClick={finish}
              className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-white transition-[filter,transform] hover:brightness-110 hover:translate-y-[-1px] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              Continue to {data.invite.role === "admin" ? "/admin" : `/${data.invite.role}`} <IconArrowRight />
            </button>
          </section>
        </Reveal>
      )}
    </Shell>
  );
}

function StepDot({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  const color = done
    ? "bg-teal text-white"
    : active
      ? "border border-teal text-teal"
      : "border border-line text-muted";
  return (
    <span className="flex items-center gap-2">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${color}`}>
        {done ? "✓" : ""}
      </span>
      <span className={active || done ? "text-ink" : ""}>{label}</span>
    </span>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(1200px 500px at 50% -10%, rgba(14,120,84,0.10), transparent 60%)",
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
      <div className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
        >
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal/30 bg-teal-soft text-teal"
          >
            <IconHelix />
          </span>
          <span className="text-lg font-semibold tracking-tight">Sila</span>
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
          <IconShield /> staff enrolment
        </span>
      </div>
      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-24 pt-6">{children}</main>
    </div>
  );
}


"use client";

import { useCallback, useEffect, useState } from "react";
import { api, isApiError } from "../../lib/api";
import { useSession } from "../../lib/session";
import { Reveal } from "../../components/Reveal";
import { IconHandshake, IconUsers } from "../../components/Icons";

interface PartnerState {
  link: { id: string; status: string; partnerId: string; acceptedAt: string | null } | null;
  pendingInvites?: { id: string; inviteCode: string }[];
}

export default function PartnerPage() {
  const { csrfToken } = useSession();
  const [state, setState] = useState<PartnerState | null>(null);
  const [acceptCode, setAcceptCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get<PartnerState>("/api/partner");
    setState(res);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite() {
    if (!csrfToken) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/partner/invite", {}, csrfToken);
      await load();
    } catch {
      setError("Could not create an invite.");
    } finally {
      setBusy(false);
    }
  }

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    if (!csrfToken) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/partner/accept", { code: acceptCode.trim() }, csrfToken);
      setAcceptCode("");
      await load();
    } catch (e: unknown) {
      if (isApiError(e) && e.status === 404) setError("That invite code is not usable.");
      else setError("Could not accept the invite.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  const pending = state?.pendingInvites?.[0];

  return (
    <main>
      <Reveal>
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Linking</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Partner</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Link to one partner at a time. Either of you can start.
          </p>
        </header>
      </Reveal>

      {state?.link ? (
        <Reveal>
          <section className="relative overflow-hidden rounded-2xl border border-teal/40 bg-surface p-6 shadow-sm">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-soft/70 to-transparent"
            />
            <div className="relative">
              <div className="flex items-start gap-4">
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-white"
                >
                  <IconHandshake />
                </span>
                <div>
                  <p className="text-base font-semibold">Linked with partner</p>
                  <p className="mt-1 text-sm text-muted">
                    Status: <span className="font-medium text-ink">{state.link.status}</span>.{" "}
                    Linked at{" "}
                    {state.link.acceptedAt
                      ? new Date(state.link.acceptedAt).toLocaleString()
                      : "—"}
                    .
                  </p>
                  <p className="mt-3 text-sm leading-relaxed">
                    Next: grant <strong>couple risk</strong> on the Consent page. Your couple
                    result shows once both of you consent.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Reveal delay={1}>
            <section className="relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-soft text-teal"
                >
                  <IconUsers />
                </span>
                <div>
                  <p className="text-base font-semibold">Start a link</p>
                  <p className="mt-1 text-xs text-muted">
                    Create a code, then share it with your partner.
                  </p>
                </div>
              </div>
              <button
                onClick={invite}
                disabled={busy}
                className="mt-4 rounded-full bg-teal px-4 py-2 text-xs font-medium text-white transition-[filter,transform] hover:brightness-110 hover:translate-y-[-1px] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                Create invite code
              </button>
              {pending && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-teal/40 bg-teal-soft/40 p-3 text-sm">
                  <span className="text-xs uppercase tracking-wider text-muted">Your code</span>
                  <code className="font-mono text-base tracking-widest">
                    {pending.inviteCode}
                  </code>
                  <button
                    onClick={() => copyCode(pending.inviteCode)}
                    className="ml-auto rounded-full border border-line bg-white px-3 py-1 text-xs text-muted transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
            </section>
          </Reveal>

          <Reveal delay={2}>
            <section className="relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-soft text-teal"
                >
                  <IconHandshake />
                </span>
                <div>
                  <p className="text-base font-semibold">Enter a code</p>
                  <p className="mt-1 text-xs text-muted">The code your partner shared with you.</p>
                </div>
              </div>
              <form onSubmit={accept} className="mt-4 flex gap-2">
                <input
                  value={acceptCode}
                  onChange={(e) => setAcceptCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB12CD34"
                  className="flex-1 rounded-lg border border-line bg-white px-3 py-2 font-mono text-sm tracking-wider outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
                />
                <button
                  type="submit"
                  disabled={busy || acceptCode.length === 0}
                  className="rounded-full bg-teal px-4 py-2 text-xs font-medium text-white transition-[filter,transform] hover:brightness-110 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  Accept
                </button>
              </form>
            </section>
          </Reveal>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </main>
  );
}

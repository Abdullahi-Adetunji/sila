"use client";

import { useCallback, useEffect, useState } from "react";
import { api, isApiError } from "../../lib/api";
import { useSession } from "../../lib/session";

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

  return (
    <main>
      <h1 className="text-2xl font-semibold">Partner</h1>
      <p className="mt-2 text-sm text-muted">
        Link to one partner at a time. Either of you can start.
      </p>

      {state?.link ? (
        <section className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm">
          <p className="font-semibold">Linked with partner</p>
          <p className="mt-1 text-muted">
            Status: {state.link.status}. Linked at{" "}
            {state.link.acceptedAt ? new Date(state.link.acceptedAt).toLocaleString() : "—"}.
          </p>
          <p className="mt-3 text-muted">
            Next: grant <strong>couple risk</strong> on the Consent page. Your couple result
            shows once both of you consent.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm">
            <p className="font-semibold">Start a link</p>
            <p className="mt-1 text-muted">Create a code, then share it with your partner.</p>
            <button
              onClick={invite}
              disabled={busy}
              className="mt-3 rounded-full bg-teal px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              Create invite code
            </button>
            {state?.pendingInvites && state.pendingInvites.length > 0 && (
              <p className="mt-3 text-muted">
                Your pending code: <code className="font-mono">{state.pendingInvites[0].inviteCode}</code>
              </p>
            )}
          </section>

          <section className="mt-4 rounded-xl border border-line bg-surface p-4 text-sm">
            <p className="font-semibold">Enter a code from your partner</p>
            <form onSubmit={accept} className="mt-3 flex gap-2">
              <input
                value={acceptCode}
                onChange={(e) => setAcceptCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD34"
                className="flex-1 rounded-lg border border-line bg-white px-3 py-2 font-mono text-sm"
              />
              <button
                type="submit"
                disabled={busy || acceptCode.length === 0}
                className="rounded-full bg-teal px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                Accept
              </button>
            </form>
          </section>
        </>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </main>
  );
}

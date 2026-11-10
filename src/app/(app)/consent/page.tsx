"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useSession } from "../../lib/session";
import { Reveal } from "../../components/Reveal";
import { IconHandshake, IconShield } from "../../components/Icons";

interface ConsentRow {
  id: string;
  purpose: string;
  targetUserId: string | null;
  scope: string | null;
  grantedAt: string;
  wordingVersion: string;
}

interface PartnerLink {
  partnerId: string;
}

export default function ConsentPage() {
  const { csrfToken } = useSession();
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [wordingVersion, setWordingVersion] = useState<string>("");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [cRes, pRes] = await Promise.all([
      api.get<{ consents: ConsentRow[]; wordingVersion: string }>("/api/consent"),
      api.get<{ link: PartnerLink | null }>("/api/partner"),
    ]);
    setConsents(cRes.consents);
    setWordingVersion(cRes.wordingVersion);
    setPartnerId(pRes.link?.partnerId ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function grant(purpose: string, extras: Record<string, unknown> = {}) {
    if (!csrfToken) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/consent", { purpose, ...extras }, csrfToken);
      await load();
    } catch {
      setError(`Could not grant ${purpose}.`);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(purpose: string, targetUserId: string | null) {
    if (!csrfToken) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/consent/revoke", { purpose, targetUserId }, csrfToken);
      await load();
    } catch {
      setError(`Could not revoke ${purpose}.`);
    } finally {
      setBusy(false);
    }
  }

  const hasCoupleRisk = consents.some(
    (c) => c.purpose === "couple_risk" && c.targetUserId === partnerId,
  );
  const hasShareCarried = consents.some(
    (c) =>
      c.purpose === "share_with_partner" &&
      c.targetUserId === partnerId &&
      c.scope === "conditions_carried",
  );
  const hasShareFull = consents.some(
    (c) =>
      c.purpose === "share_with_partner" &&
      c.targetUserId === partnerId &&
      c.scope === "full_result",
  );
  const hasEvaluation = consents.some((c) => c.purpose === "evaluation_data");

  return (
    <main>
      <Reveal>
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Permissions</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Consent centre
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Any grant can be revoked. A revocation takes effect immediately for every future
            request.
            {wordingVersion && (
              <>
                {" "}
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-soft px-2 py-0.5 text-[11px] font-medium text-teal">
                  <IconShield /> wording v{wordingVersion}
                </span>
              </>
            )}
          </p>
        </header>
      </Reveal>

      {!partnerId && (
        <Reveal>
          <p className="mb-6 rounded-2xl border border-dashed border-line bg-surface p-5 text-sm text-muted">
            You have not linked to a partner yet. Visit the Partner page first.
          </p>
        </Reveal>
      )}

      {partnerId && (
        <section className="space-y-4">
          <Reveal delay={1}>
            <Row
              icon={<IconHandshake />}
              title="Share the couple risk with my partner"
              body="Both of you must grant this for the couple result screen to show. The couple result can reveal something about each partner — for example, a 1 in 4 chance of sickle cell anaemia means both of you carry a variant."
              active={hasCoupleRisk}
              busy={busy}
              onGrant={() => grant("couple_risk", { targetUserId: partnerId })}
              onRevoke={() => revoke("couple_risk", partnerId)}
            />
          </Reveal>
          <Reveal delay={2}>
            <Row
              icon={<IconShield />}
              title="Share which conditions I carry with my partner"
              body="This does not share variant ids or detailed test wording, only the conditions I carry a variant for."
              active={hasShareCarried}
              busy={busy}
              onGrant={() =>
                grant("share_with_partner", {
                  targetUserId: partnerId,
                  scope: "conditions_carried",
                })
              }
              onRevoke={() => revoke("share_with_partner", partnerId)}
            />
          </Reveal>
          <Reveal delay={3}>
            <Row
              icon={<IconShield />}
              title="Share my full result with my partner"
              body="Supersedes conditions-carried. Variants and statuses by gene."
              active={hasShareFull}
              busy={busy}
              onGrant={() =>
                grant("share_with_partner", { targetUserId: partnerId, scope: "full_result" })
              }
              onRevoke={() => revoke("share_with_partner", partnerId)}
            />
          </Reveal>
        </section>
      )}

      <Reveal>
        <section className="mt-6">
          <Row
            icon={<IconShield />}
            title="Include my quiz scores in the evaluation data"
            body="Never includes genetic data. Purely how well the explanations work."
            active={hasEvaluation}
            busy={busy}
            onGrant={() => grant("evaluation_data")}
            onRevoke={() => revoke("evaluation_data", null)}
          />
        </section>
      </Reveal>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </main>
  );
}

function Row({
  icon,
  title,
  body,
  active,
  busy,
  onGrant,
  onRevoke,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  active: boolean;
  busy: boolean;
  onGrant: () => void;
  onRevoke: () => void;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-surface p-5 transition-colors ${
        active ? "border-teal/40 ring-1 ring-teal/10" : "border-line"
      }`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent ${
          active ? "from-teal-soft/60" : "from-transparent"
        }`}
      />
      <div className="relative flex items-start gap-4">
        <span
          aria-hidden
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
            active ? "bg-teal text-white" : "bg-teal-soft text-teal"
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{title}</p>
            {active && (
              <span className="rounded-full bg-teal px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                Active
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
          <div className="mt-3">
            {active ? (
              <button
                onClick={onRevoke}
                disabled={busy}
                className="rounded-full border border-teal px-3.5 py-1.5 text-xs font-medium text-teal transition-colors hover:bg-teal-soft/50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                Revoke
              </button>
            ) : (
              <button
                onClick={onGrant}
                disabled={busy}
                className="rounded-full bg-teal px-3.5 py-1.5 text-xs font-medium text-white transition-[filter,transform] hover:brightness-110 hover:translate-y-[-1px] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                Grant
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useSession } from "../../lib/session";

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
      <h1 className="text-2xl font-semibold">Consent centre</h1>
      <p className="mt-2 text-sm text-muted">
        Any grant can be revoked. A revocation takes effect immediately for every future
        request. Wording version: {wordingVersion || "—"}.
      </p>

      {!partnerId && (
        <p className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          You have not linked to a partner yet. Visit the Partner page first.
        </p>
      )}

      {partnerId && (
        <section className="mt-6 space-y-4">
          <Row
            title="Share the couple risk with my partner"
            body="Both of you must grant this for the couple result screen to show. The couple result can reveal something about each partner — for example, a 1 in 4 chance of sickle cell anaemia means both of you carry a variant."
            active={hasCoupleRisk}
            busy={busy}
            onGrant={() => grant("couple_risk", { targetUserId: partnerId })}
            onRevoke={() => revoke("couple_risk", partnerId)}
          />
          <Row
            title="Share which conditions I carry with my partner"
            body="This does not share variant ids or detailed test wording, only the conditions I carry a variant for."
            active={hasShareCarried}
            busy={busy}
            onGrant={() =>
              grant("share_with_partner", { targetUserId: partnerId, scope: "conditions_carried" })
            }
            onRevoke={() => revoke("share_with_partner", partnerId)}
          />
          <Row
            title="Share my full result with my partner"
            body="Supersedes conditions-carried. Variants and statuses by gene."
            active={hasShareFull}
            busy={busy}
            onGrant={() =>
              grant("share_with_partner", { targetUserId: partnerId, scope: "full_result" })
            }
            onRevoke={() => revoke("share_with_partner", partnerId)}
          />
        </section>
      )}

      <section className="mt-6">
        <Row
          title="Include my quiz scores in the evaluation data"
          body="Never includes genetic data. Purely how well the explanations work."
          active={hasEvaluation}
          busy={busy}
          onGrant={() => grant("evaluation_data")}
          onRevoke={() => revoke("evaluation_data", null)}
        />
      </section>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </main>
  );
}

function Row({
  title,
  body,
  active,
  busy,
  onGrant,
  onRevoke,
}: {
  title: string;
  body: string;
  active: boolean;
  busy: boolean;
  onGrant: () => void;
  onRevoke: () => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted">{body}</p>
      <div className="mt-3">
        {active ? (
          <button
            onClick={onRevoke}
            disabled={busy}
            className="rounded-full border border-teal px-3 py-1 text-xs font-medium text-teal disabled:opacity-50"
          >
            Granted — revoke
          </button>
        ) : (
          <button
            onClick={onGrant}
            disabled={busy}
            className="rounded-full bg-teal px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            Grant
          </button>
        )}
      </div>
    </div>
  );
}

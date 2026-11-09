"use client";

import { useCallback, useEffect, useState } from "react";
import { api, isApiError } from "../../lib/api";
import { useSession } from "../../lib/session";

interface ClinicianAccuracy {
  status: "awaiting_clinical_review" | "ready";
  rowsImported?: number;
  riskAccuracyPct?: number;
  escalationAccuracyPct?: number;
  mismatches?: Array<Record<string, string>>;
  ranAt?: string;
}
interface PrivacyReport {
  status: "awaiting_run" | "ready";
  passed?: number;
  failed?: number;
  blocked?: number;
  files?: Array<{ file: string; counts: Record<string, number> }>;
  endedAt?: string;
}
interface ComprehensionCell {
  language: "en" | "ar";
  readingBand: string;
  n: number;
  beforePct: number | null;
  afterPct: number | null;
  changePct: number | null;
}
interface TtrCell {
  language: "en" | "ar";
  n: number;
  medianClicks: number | null;
  medianMinutes: number | null;
}

export default function EvaluatorDashboard() {
  const { user } = useSession();
  const [clinician, setClinician] = useState<ClinicianAccuracy | null>(null);
  const [privacy, setPrivacy] = useState<PrivacyReport | null>(null);
  const [comp, setComp] = useState<ComprehensionCell[] | null>(null);
  const [ttr, setTtr] = useState<TtrCell[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, p, co, t] = await Promise.all([
        api.get<ClinicianAccuracy>("/api/evaluator/clinician-accuracy"),
        api.get<PrivacyReport>("/api/evaluator/privacy"),
        api.get<{ cells: ComprehensionCell[] }>("/api/evaluator/comprehension"),
        api.get<{ cells: TtrCell[] }>("/api/evaluator/time-to-referral"),
      ]);
      setClinician(c);
      setPrivacy(p);
      setComp(co.cells);
      setTtr(t.cells);
    } catch (e: unknown) {
      if (isApiError(e) && e.status === 403) setError("evaluator-only");
      else setError("load_failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error === "evaluator-only") {
    return (
      <main>
        <h1 className="text-2xl font-semibold">Evaluator dashboard</h1>
        <p className="mt-4 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          This page is only visible to evaluator accounts.
        </p>
      </main>
    );
  }

  const asCsvLink = (endpoint: string) => `/api${endpoint}?format=csv`;

  return (
    <main>
      <h1 className="text-2xl font-semibold">Evaluator dashboard</h1>
      <p className="mt-2 text-sm text-muted">
        Aggregates only, with group size n shown. Groups with fewer than 5 are hidden. No
        significance claims at this sample size. Each card has a CSV export.
      </p>
      {error && error !== "evaluator-only" && (
        <p className="mt-3 text-sm text-red-600">Could not load dashboard data.</p>
      )}

      <Card title="Risk accuracy (clinician import)" csv={asCsvLink("/evaluator/clinician-accuracy")}>
        {clinician?.status === "awaiting_clinical_review" && (
          <p className="text-sm text-muted">Awaiting clinical review.</p>
        )}
        {clinician?.status === "ready" && (
          <ul className="space-y-1 text-sm">
            <li>Rows reviewed: {clinician.rowsImported}</li>
            <li>Risk agreement: {clinician.riskAccuracyPct}%</li>
            <li>Escalation agreement: {clinician.escalationAccuracyPct}%</li>
            <li>Mismatches: {clinician.mismatches?.length ?? 0}</li>
          </ul>
        )}
      </Card>

      <Card title="Privacy and access-control" csv={asCsvLink("/evaluator/privacy")}>
        {privacy?.status === "awaiting_run" && (
          <p className="text-sm text-muted">Awaiting a test run that writes privacy_report.json.</p>
        )}
        {privacy?.status === "ready" && (
          <ul className="space-y-1 text-sm">
            <li>
              Blocked (passed) attempts: <strong>{privacy.blocked}</strong>
            </li>
            <li>Failed assertions: {privacy.failed}</li>
            <li>Last run: {privacy.endedAt}</li>
          </ul>
        )}
      </Card>

      <Card title="Comprehension by language and reading band" csv={asCsvLink("/evaluator/comprehension")}>
        {comp && comp.length === 0 && (
          <p className="text-sm text-muted">No cells with n &ge; 5 yet.</p>
        )}
        {comp && comp.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th>language</th>
                <th>reading band</th>
                <th>n</th>
                <th>before %</th>
                <th>after %</th>
                <th>change</th>
              </tr>
            </thead>
            <tbody>
              {comp.map((c, i) => (
                <tr key={i} className="border-t border-line">
                  <td>{c.language}</td>
                  <td>{c.readingBand}</td>
                  <td>{c.n}</td>
                  <td>{c.beforePct ?? "—"}</td>
                  <td>{c.afterPct ?? "—"}</td>
                  <td>{c.changePct ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Time to referral (real volunteer sessions)" csv={asCsvLink("/evaluator/time-to-referral")}>
        {ttr && ttr.length === 0 && (
          <p className="text-sm text-muted">Awaiting sessions (n &lt; 5).</p>
        )}
        {ttr && ttr.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th>language</th>
                <th>n</th>
                <th>median clicks</th>
                <th>median minutes</th>
              </tr>
            </thead>
            <tbody>
              {ttr.map((c, i) => (
                <tr key={i} className="border-t border-line">
                  <td>{c.language}</td>
                  <td>{c.n}</td>
                  <td>{c.medianClicks ?? "—"}</td>
                  <td>{c.medianMinutes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {user && <p className="mt-6 text-xs text-muted">Signed in as {user.email}.</p>}
    </main>
  );
}

function Card({
  title,
  csv,
  children,
}: {
  title: string;
  csv: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        <a
          href={csv}
          className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:text-ink"
        >
          CSV
        </a>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

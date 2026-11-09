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
  endedAt?: string;
}
interface Cell {
  axis: "language" | "reading_band";
  value: string;
  n: number;
  beforePct?: number | null;
  afterPct?: number | null;
  changePct?: number | null;
  medianClicks?: number | null;
  medianMinutes?: number | null;
}

export default function EvaluatorDashboard() {
  const { user } = useSession();
  const [clinician, setClinician] = useState<ClinicianAccuracy | null>(null);
  const [privacy, setPrivacy] = useState<PrivacyReport | null>(null);
  const [compLang, setCompLang] = useState<Cell[] | null>(null);
  const [compBand, setCompBand] = useState<Cell[] | null>(null);
  const [ttrLang, setTtrLang] = useState<Cell[] | null>(null);
  const [ttrBand, setTtrBand] = useState<Cell[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, p, cL, cB, tL, tB] = await Promise.all([
        api.get<ClinicianAccuracy>("/api/evaluator/clinician-accuracy"),
        api.get<PrivacyReport>("/api/evaluator/privacy"),
        api.get<{ cells: Cell[] }>("/api/evaluator/comprehension/by-language"),
        api.get<{ cells: Cell[] }>("/api/evaluator/comprehension/by-reading-band"),
        api.get<{ cells: Cell[] }>("/api/evaluator/time-to-referral/by-language"),
        api.get<{ cells: Cell[] }>("/api/evaluator/time-to-referral/by-reading-band"),
      ]);
      setClinician(c);
      setPrivacy(p);
      setCompLang(cL.cells);
      setCompBand(cB.cells);
      setTtrLang(tL.cells);
      setTtrBand(tB.cells);
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
        Each table is a single axis (by language OR by reading band — never crossed).
        Any cell with n &lt; 5 is hidden. No totals are shown, so no hidden cell can be
        worked out by subtraction. No significance claims at this sample size.
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

      <ComprehensionTable
        title="Comprehension by language"
        csv={asCsvLink("/evaluator/comprehension/by-language")}
        rows={compLang}
        axisLabel="language"
      />
      <ComprehensionTable
        title="Comprehension by reading band"
        csv={asCsvLink("/evaluator/comprehension/by-reading-band")}
        rows={compBand}
        axisLabel="reading band"
      />

      <TtrTable
        title="Time to referral by language"
        csv={asCsvLink("/evaluator/time-to-referral/by-language")}
        rows={ttrLang}
        axisLabel="language"
      />
      <TtrTable
        title="Time to referral by reading band"
        csv={asCsvLink("/evaluator/time-to-referral/by-reading-band")}
        rows={ttrBand}
        axisLabel="reading band"
      />

      {user && <p className="mt-6 text-xs text-muted">Signed in as {user.email}.</p>}
    </main>
  );
}

function ComprehensionTable({
  title,
  csv,
  rows,
  axisLabel,
}: {
  title: string;
  csv: string;
  rows: Cell[] | null;
  axisLabel: string;
}) {
  return (
    <Card title={title} csv={csv}>
      {rows && rows.length === 0 && (
        <p className="text-sm text-muted">No cells with n &ge; 5 yet.</p>
      )}
      {rows && rows.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th>{axisLabel}</th>
              <th>n</th>
              <th>before %</th>
              <th>after %</th>
              <th>change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={i} className="border-t border-line">
                <td>{c.value}</td>
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
  );
}

function TtrTable({
  title,
  csv,
  rows,
  axisLabel,
}: {
  title: string;
  csv: string;
  rows: Cell[] | null;
  axisLabel: string;
}) {
  return (
    <Card title={title} csv={csv}>
      {rows && rows.length === 0 && (
        <p className="text-sm text-muted">Awaiting sessions (n &lt; 5).</p>
      )}
      {rows && rows.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th>{axisLabel}</th>
              <th>n</th>
              <th>median clicks</th>
              <th>median minutes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={i} className="border-t border-line">
                <td>{c.value}</td>
                <td>{c.n}</td>
                <td>{c.medianClicks ?? "—"}</td>
                <td>{c.medianMinutes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function Card({ title, csv, children }: { title: string; csv: string; children: React.ReactNode }) {
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

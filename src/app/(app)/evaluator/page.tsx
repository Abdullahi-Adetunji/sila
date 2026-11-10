"use client";

import { useCallback, useEffect, useState } from "react";
import { api, isApiError } from "../../lib/api";
import { useSession } from "../../lib/session";
import { Reveal } from "../../components/Reveal";
import { IconArrowRight, IconShield, IconSparkle, IconStethoscope } from "../../components/Icons";

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
interface AttackReport {
  status: "awaiting_run" | "ready";
  baseUrl?: string;
  endedAt?: string;
  passed?: number;
  failed?: number;
  findings?: Array<{ name: string; passed: boolean; detail?: string }>;
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
  const [attack, setAttack] = useState<AttackReport | null>(null);
  const [compLang, setCompLang] = useState<Cell[] | null>(null);
  const [compBand, setCompBand] = useState<Cell[] | null>(null);
  const [ttrLang, setTtrLang] = useState<Cell[] | null>(null);
  const [ttrBand, setTtrBand] = useState<Cell[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, p, a, cL, cB, tL, tB] = await Promise.all([
        api.get<ClinicianAccuracy>("/api/evaluator/clinician-accuracy"),
        api.get<PrivacyReport>("/api/evaluator/privacy"),
        api.get<AttackReport>("/api/evaluator/attack"),
        api.get<{ cells: Cell[] }>("/api/evaluator/comprehension/by-language"),
        api.get<{ cells: Cell[] }>("/api/evaluator/comprehension/by-reading-band"),
        api.get<{ cells: Cell[] }>("/api/evaluator/time-to-referral/by-language"),
        api.get<{ cells: Cell[] }>("/api/evaluator/time-to-referral/by-reading-band"),
      ]);
      setClinician(c);
      setPrivacy(p);
      setAttack(a);
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
        <h1 className="text-2xl font-semibold tracking-tight">Evaluator dashboard</h1>
        <p className="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
          This page is only visible to evaluator accounts.
        </p>
      </main>
    );
  }

  const asCsvLink = (endpoint: string) => `/api${endpoint}?format=csv`;

  return (
    <main>
      <Reveal>
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Review &amp; evaluation</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Evaluator dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Each table is a single axis (by language OR by reading band — never crossed). Any cell
            with n &lt; 5 is hidden. No totals are shown, so no hidden cell can be worked out by
            subtraction. No significance claims at this sample size.
          </p>
        </header>
      </Reveal>

      {error && error !== "evaluator-only" && (
        <p className="mt-3 text-sm text-red-600">Could not load dashboard data.</p>
      )}

      {/* The three top-line health signals, as wide stat tiles. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Reveal delay={1}>
          <StatTile
            title="Risk accuracy"
            subtitle="Clinician import"
            Icon={IconStethoscope}
            csv={asCsvLink("/evaluator/clinician-accuracy")}
            accent="teal"
          >
            {clinician?.status === "awaiting_clinical_review" && (
              <p className="text-sm text-muted">Awaiting clinical review.</p>
            )}
            {clinician?.status === "ready" && (
              <>
                <div className="text-3xl font-semibold tracking-tight">
                  {clinician.riskAccuracyPct}
                  <span className="text-base text-muted">%</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Risk agreement · Escalation {clinician.escalationAccuracyPct}% ·{" "}
                  {clinician.mismatches?.length ?? 0} mismatch
                  {(clinician.mismatches?.length ?? 0) === 1 ? "" : "es"} over{" "}
                  {clinician.rowsImported} rows
                </p>
              </>
            )}
          </StatTile>
        </Reveal>

        <Reveal delay={2}>
          <StatTile
            title="Privacy &amp; access"
            subtitle="Vitest suite"
            Icon={IconShield}
            csv={asCsvLink("/evaluator/privacy")}
            accent="mint"
          >
            {privacy?.status === "awaiting_run" && (
              <p className="text-sm text-muted">Awaiting a test run that writes privacy_report.json.</p>
            )}
            {privacy?.status === "ready" && (
              <>
                <div className="text-3xl font-semibold tracking-tight">
                  {privacy.blocked ?? 0}
                </div>
                <p className="mt-1 text-xs text-muted">
                  Unauthorised attempts blocked · {privacy.failed ?? 0} failed assertion
                  {(privacy.failed ?? 0) === 1 ? "" : "s"}
                </p>
              </>
            )}
          </StatTile>
        </Reveal>

        <Reveal delay={3}>
          <StatTile
            title="Attack suite"
            subtitle="Black-box"
            Icon={IconSparkle}
            csv={asCsvLink("/evaluator/attack")}
            accent="sand"
          >
            {attack?.status === "awaiting_run" && (
              <p className="text-sm text-muted">Awaiting a run.</p>
            )}
            {attack?.status === "ready" && (
              <>
                <div className="text-3xl font-semibold tracking-tight">
                  {attack.passed}
                  <span className="text-base text-muted">
                    /{(attack.passed ?? 0) + (attack.failed ?? 0)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Blocked attacks · {attack.failed ?? 0} failing case
                  {(attack.failed ?? 0) === 1 ? "" : "s"}
                </p>
              </>
            )}
          </StatTile>
        </Reveal>
      </div>

      {attack?.status === "ready" && attack.failed && attack.findings?.some((f) => !f.passed) ? (
        <Reveal>
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-red-700">
              Failing cases
            </p>
            <ul className="mt-2 list-disc space-y-1 ps-6 text-xs text-red-800">
              {attack
                .findings!.filter((f) => !f.passed)
                .map((f) => (
                  <li key={f.name}>
                    {f.name}
                    {f.detail ? ` — ${f.detail}` : null}
                  </li>
                ))}
            </ul>
          </div>
        </Reveal>
      ) : null}

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

      {user && <p className="mt-8 text-xs text-muted">Signed in as {user.email}.</p>}
    </main>
  );
}

type AccentKey = "teal" | "mint" | "sand";
const ACCENT_STYLE: Record<AccentKey, { border: string; glow: string; icon: string }> = {
  teal: {
    border: "border-teal/30",
    glow: "from-teal/10",
    icon: "text-teal bg-teal-soft",
  },
  mint: {
    border: "border-[color:var(--accent-mint)]/30",
    glow: "from-[color:var(--accent-mint)]/12",
    icon: "text-teal bg-[color:var(--accent-mint)]/15",
  },
  sand: {
    border: "border-[color:var(--accent-sand)]/40",
    glow: "from-[color:var(--accent-sand)]/15",
    icon: "text-carrier bg-carrier-soft",
  },
};

function StatTile({
  title,
  subtitle,
  Icon,
  csv,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  Icon: (p: { className?: string }) => React.ReactElement;
  csv: string;
  accent: AccentKey;
  children: React.ReactNode;
}) {
  const a = ACCENT_STYLE[accent];
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border ${a.border} bg-surface p-5 shadow-sm transition-shadow hover:shadow-md`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${a.glow} to-transparent opacity-80`}
      />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${a.icon}`}
            >
              <Icon />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">{subtitle}</p>
              <p className="text-sm font-semibold">{title}</p>
            </div>
          </div>
          <a
            href={csv}
            className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-teal hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            CSV <IconArrowRight />
          </a>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </section>
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
    <Reveal>
      <TableCard title={title} csv={csv}>
        {rows && rows.length === 0 && (
          <p className="text-sm text-muted">No cells with n &ge; 5 yet.</p>
        )}
        {rows && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="py-2 font-medium">{axisLabel}</th>
                  <th className="py-2 font-medium">n</th>
                  <th className="py-2 font-medium">before %</th>
                  <th className="py-2 font-medium">after %</th>
                  <th className="py-2 font-medium">change</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-2">{c.value}</td>
                    <td className="py-2 font-mono text-xs">{c.n}</td>
                    <td className="py-2 font-mono text-xs">{c.beforePct ?? "—"}</td>
                    <td className="py-2 font-mono text-xs">{c.afterPct ?? "—"}</td>
                    <td className="py-2 font-mono text-xs">{c.changePct ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    </Reveal>
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
    <Reveal>
      <TableCard title={title} csv={csv}>
        {rows && rows.length === 0 && (
          <p className="text-sm text-muted">Awaiting sessions (n &lt; 5).</p>
        )}
        {rows && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="py-2 font-medium">{axisLabel}</th>
                  <th className="py-2 font-medium">n</th>
                  <th className="py-2 font-medium">median clicks</th>
                  <th className="py-2 font-medium">median minutes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-2">{c.value}</td>
                    <td className="py-2 font-mono text-xs">{c.n}</td>
                    <td className="py-2 font-mono text-xs">{c.medianClicks ?? "—"}</td>
                    <td className="py-2 font-mono text-xs">{c.medianMinutes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    </Reveal>
  );
}

function TableCard({
  title,
  csv,
  children,
}: {
  title: string;
  csv: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        <a
          href={csv}
          className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-teal hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          CSV <IconArrowRight />
        </a>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

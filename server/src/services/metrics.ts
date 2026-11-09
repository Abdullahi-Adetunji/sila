import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import {
  clinicianImportRuns,
  quizResponses,
  timeToReferralEvents,
  volunteers,
} from "../db/schema";

const MIN_GROUP = 5;

const here = dirname(fileURLToPath(import.meta.url));
const privacyReportPath = resolve(here, "../../../data/review/privacy_report.json");

export interface ComprehensionCell {
  language: "en" | "ar";
  readingBand: "low" | "medium" | "high" | "unknown";
  n: number;
  beforePct: number | null;
  afterPct: number | null;
  changePct: number | null;
}

export interface TtrCell {
  language: "en" | "ar";
  n: number;
  medianClicks: number | null;
  medianMinutes: number | null;
}

export interface ClinicianAccuracy {
  status: "awaiting_clinical_review" | "ready";
  rowsImported?: number;
  riskAccuracyPct?: number;
  escalationAccuracyPct?: number;
  mismatches?: Array<{
    coupleId: string;
    engineRoute: string;
    clinicianRoute: string;
    clinicianAgreesRisk: string;
    notes: string;
  }>;
  ranAt?: string;
}

export interface PrivacyReport {
  status: "awaiting_run" | "ready";
  passed?: number;
  failed?: number;
  blocked?: number;
  files?: Array<{ file: string; counts: Record<string, number> }>;
  endedAt?: string;
}

export async function clinicianAccuracy(): Promise<ClinicianAccuracy> {
  const rows = await db
    .select()
    .from(clinicianImportRuns)
    .orderBy(desc(clinicianImportRuns.ranAt))
    .limit(1);
  const r = rows[0];
  if (!r) return { status: "awaiting_clinical_review" };
  return {
    status: "ready",
    rowsImported: r.rowsImported,
    riskAccuracyPct: r.riskAccuracyPct ?? undefined,
    escalationAccuracyPct: r.escalationAccuracyPct ?? undefined,
    mismatches:
      (r.mismatches as ClinicianAccuracy["mismatches"]) ?? [],
    ranAt: r.ranAt,
  };
}

export function privacyReport(): PrivacyReport {
  if (!existsSync(privacyReportPath)) return { status: "awaiting_run" };
  try {
    const raw = JSON.parse(readFileSync(privacyReportPath, "utf8")) as {
      passed?: number;
      failed?: number;
      blocked?: number;
      files?: Array<{ file: string; counts: Record<string, number> }>;
      endedAt?: string;
    };
    return {
      status: "ready",
      passed: raw.passed,
      failed: raw.failed,
      blocked: raw.blocked,
      files: raw.files,
      endedAt: raw.endedAt,
    };
  } catch {
    return { status: "awaiting_run" };
  }
}

export async function comprehensionByCell(): Promise<ComprehensionCell[]> {
  // Compute pct-correct per volunteer per phase, then average over the cell.
  const all = await db
    .select({
      id: volunteers.id,
      language: volunteers.language,
      readingBand: volunteers.readingBand,
    })
    .from(volunteers);

  const responses = await db
    .select({
      volunteerId: quizResponses.volunteerId,
      phase: quizResponses.phase,
      correct: quizResponses.correct,
    })
    .from(quizResponses);

  const perVolunteer = new Map<
    string,
    { before: number[]; after: number[]; language: "en" | "ar"; readingBand: ComprehensionCell["readingBand"] }
  >();
  for (const v of all) {
    perVolunteer.set(v.id, {
      before: [],
      after: [],
      language: v.language,
      readingBand: v.readingBand,
    });
  }
  for (const r of responses) {
    const entry = perVolunteer.get(r.volunteerId);
    if (!entry) continue;
    if (r.correct < 0) continue; // -1 = not scored (neutrality)
    (r.phase === "before" ? entry.before : entry.after).push(r.correct);
  }

  type Key = string;
  const cells = new Map<Key, ComprehensionCell>();
  const key = (l: string, b: string) => `${l}|${b}`;
  for (const entry of perVolunteer.values()) {
    const k = key(entry.language, entry.readingBand);
    if (!cells.has(k)) {
      cells.set(k, {
        language: entry.language,
        readingBand: entry.readingBand,
        n: 0,
        beforePct: null,
        afterPct: null,
        changePct: null,
      });
    }
    const cell = cells.get(k)!;
    cell.n += 1;
    const beforeAvg =
      entry.before.length > 0
        ? entry.before.reduce((a, b) => a + b, 0) / entry.before.length
        : null;
    const afterAvg =
      entry.after.length > 0
        ? entry.after.reduce((a, b) => a + b, 0) / entry.after.length
        : null;
    if (beforeAvg !== null) {
      cell.beforePct = (cell.beforePct ?? 0) + beforeAvg;
    }
    if (afterAvg !== null) {
      cell.afterPct = (cell.afterPct ?? 0) + afterAvg;
    }
  }
  const out: ComprehensionCell[] = [];
  for (const c of cells.values()) {
    if (c.n < MIN_GROUP) continue;
    if (c.beforePct !== null) c.beforePct = Math.round((c.beforePct / c.n) * 100);
    if (c.afterPct !== null) c.afterPct = Math.round((c.afterPct / c.n) * 100);
    if (c.beforePct !== null && c.afterPct !== null) c.changePct = c.afterPct - c.beforePct;
    out.push(c);
  }
  return out;
}

export async function timeToReferralByLanguage(): Promise<TtrCell[]> {
  // For each volunteer, find opened_result and submitted_referral and compute
  // the elapsed time and click count. Then aggregate by language with n>=5.
  const volunteersAll = await db
    .select({ id: volunteers.id, language: volunteers.language })
    .from(volunteers);

  const cells = new Map<"en" | "ar", TtrCell>();
  for (const lang of ["en", "ar"] as const) {
    cells.set(lang, { language: lang, n: 0, medianClicks: null, medianMinutes: null });
  }
  const samplesByLang: Record<"en" | "ar", { clicks: number[]; minutes: number[] }> = {
    en: { clicks: [], minutes: [] },
    ar: { clicks: [], minutes: [] },
  };

  for (const v of volunteersAll) {
    const evs = await db
      .select({ kind: timeToReferralEvents.kind, at: timeToReferralEvents.at })
      .from(timeToReferralEvents)
      .where(eq(timeToReferralEvents.volunteerId, v.id));
    const opened = evs.find((e) => e.kind === "opened_result");
    const submitted = evs.find((e) => e.kind === "submitted_referral");
    if (!opened || !submitted) continue;
    const minutes =
      (new Date(submitted.at).getTime() - new Date(opened.at).getTime()) / 60_000;
    samplesByLang[v.language].clicks.push(evs.length);
    samplesByLang[v.language].minutes.push(minutes);
  }

  for (const [lang, sample] of Object.entries(samplesByLang) as Array<[
    "en" | "ar",
    { clicks: number[]; minutes: number[] },
  ]>) {
    const cell = cells.get(lang)!;
    cell.n = sample.clicks.length;
    if (cell.n >= MIN_GROUP) {
      cell.medianClicks = median(sample.clicks);
      cell.medianMinutes = Number(median(sample.minutes).toFixed(1));
    } else {
      cell.n = 0; // hide below the threshold entirely
    }
  }
  return [...cells.values()].filter((c) => c.n >= MIN_GROUP);
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

// Simple CSV encoder shared by every endpoint's ?format=csv variant.
export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "\n";
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = keys.map(esc).join(",");
  const body = rows.map((r) => keys.map((k) => esc(r[k])).join(","));
  return [header, ...body].join("\n") + "\n";
}

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
const attackReportPath = resolve(here, "../../../data/review/attack_report.json");

export type Language = "en" | "ar";
export type ReadingBand = "low" | "medium" | "high" | "unknown";

export interface ComprehensionCell {
  axis: "language" | "reading_band";
  value: string;
  n: number;
  beforePct: number | null;
  afterPct: number | null;
  changePct: number | null;
}

export interface TtrCell {
  axis: "language" | "reading_band";
  value: string;
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
    mismatches: (r.mismatches as ClinicianAccuracy["mismatches"]) ?? [],
    ranAt: r.ranAt,
  };
}

export interface AttackReport {
  status: "awaiting_run" | "ready";
  baseUrl?: string;
  endedAt?: string;
  passed?: number;
  failed?: number;
  findings?: Array<{ name: string; passed: boolean; detail?: string }>;
}

export function attackReport(): AttackReport {
  if (!existsSync(attackReportPath)) return { status: "awaiting_run" };
  try {
    const raw = JSON.parse(readFileSync(attackReportPath, "utf8")) as Omit<AttackReport, "status">;
    return { ...raw, status: "ready" };
  } catch {
    return { status: "awaiting_run" };
  }
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

interface VolunteerShape {
  id: string;
  language: Language;
  readingBand: ReadingBand;
}

async function allVolunteers(): Promise<VolunteerShape[]> {
  return db
    .select({
      id: volunteers.id,
      language: volunteers.language,
      readingBand: volunteers.readingBand,
    })
    .from(volunteers);
}

async function perVolunteerScores(): Promise<
  Map<string, { before: number[]; after: number[]; language: Language; readingBand: ReadingBand }>
> {
  const vs = await allVolunteers();
  const resp = await db
    .select({
      volunteerId: quizResponses.volunteerId,
      phase: quizResponses.phase,
      correct: quizResponses.correct,
    })
    .from(quizResponses);
  const map = new Map<string, { before: number[]; after: number[]; language: Language; readingBand: ReadingBand }>();
  for (const v of vs) {
    map.set(v.id, { before: [], after: [], language: v.language, readingBand: v.readingBand });
  }
  for (const r of resp) {
    const entry = map.get(r.volunteerId);
    if (!entry) continue;
    if (r.correct < 0) continue;
    (r.phase === "before" ? entry.before : entry.after).push(r.correct);
  }
  return map;
}

function aggregateCells(
  per: ReturnType<typeof perVolunteerScores> extends Promise<infer T> ? T : never,
  axis: "language" | "reading_band",
): ComprehensionCell[] {
  const buckets = new Map<string, { n: number; before: number; beforeN: number; after: number; afterN: number }>();
  for (const entry of per.values()) {
    const key = axis === "language" ? entry.language : entry.readingBand;
    if (!buckets.has(key)) {
      buckets.set(key, { n: 0, before: 0, beforeN: 0, after: 0, afterN: 0 });
    }
    const b = buckets.get(key)!;
    b.n += 1;
    const beforeAvg = entry.before.length > 0 ? entry.before.reduce((a, x) => a + x, 0) / entry.before.length : null;
    const afterAvg = entry.after.length > 0 ? entry.after.reduce((a, x) => a + x, 0) / entry.after.length : null;
    if (beforeAvg !== null) {
      b.before += beforeAvg;
      b.beforeN += 1;
    }
    if (afterAvg !== null) {
      b.after += afterAvg;
      b.afterN += 1;
    }
  }
  const out: ComprehensionCell[] = [];
  for (const [value, b] of buckets.entries()) {
    if (b.n < MIN_GROUP) continue;
    const beforePct = b.beforeN > 0 ? Math.round((b.before / b.beforeN) * 100) : null;
    const afterPct = b.afterN > 0 ? Math.round((b.after / b.afterN) * 100) : null;
    const changePct = beforePct !== null && afterPct !== null ? afterPct - beforePct : null;
    out.push({ axis, value, n: b.n, beforePct, afterPct, changePct });
  }
  return out;
}

export async function comprehensionByLanguage(): Promise<ComprehensionCell[]> {
  const per = await perVolunteerScores();
  return aggregateCells(per, "language");
}

export async function comprehensionByReadingBand(): Promise<ComprehensionCell[]> {
  const per = await perVolunteerScores();
  return aggregateCells(per, "reading_band");
}

async function ttrSamples(): Promise<
  Array<{ language: Language; readingBand: ReadingBand; clicks: number; minutes: number }>
> {
  const vs = await allVolunteers();
  const out: Array<{ language: Language; readingBand: ReadingBand; clicks: number; minutes: number }> = [];
  for (const v of vs) {
    const evs = await db
      .select({ kind: timeToReferralEvents.kind, at: timeToReferralEvents.at })
      .from(timeToReferralEvents)
      .where(eq(timeToReferralEvents.volunteerId, v.id));
    const opened = evs.find((e) => e.kind === "opened_result");
    const submitted = evs.find((e) => e.kind === "submitted_referral");
    if (!opened || !submitted) continue;
    const minutes = (new Date(submitted.at).getTime() - new Date(opened.at).getTime()) / 60_000;
    out.push({ language: v.language, readingBand: v.readingBand, clicks: evs.length, minutes });
  }
  return out;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function ttrByAxis(samples: Awaited<ReturnType<typeof ttrSamples>>, axis: "language" | "reading_band"): TtrCell[] {
  const buckets = new Map<string, { clicks: number[]; minutes: number[] }>();
  for (const s of samples) {
    const key = axis === "language" ? s.language : s.readingBand;
    if (!buckets.has(key)) buckets.set(key, { clicks: [], minutes: [] });
    const b = buckets.get(key)!;
    b.clicks.push(s.clicks);
    b.minutes.push(s.minutes);
  }
  const out: TtrCell[] = [];
  for (const [value, b] of buckets.entries()) {
    if (b.clicks.length < MIN_GROUP) continue;
    out.push({
      axis,
      value,
      n: b.clicks.length,
      medianClicks: median(b.clicks),
      medianMinutes: Number(median(b.minutes).toFixed(1)),
    });
  }
  return out;
}

export async function ttrByLanguage(): Promise<TtrCell[]> {
  return ttrByAxis(await ttrSamples(), "language");
}

export async function ttrByReadingBand(): Promise<TtrCell[]> {
  return ttrByAxis(await ttrSamples(), "reading_band");
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "\n";
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = keys.map(esc).join(",");
  const body = rows.map((r) => keys.map((k) => esc(r[k])).join(","));
  return [header, ...body].join("\n") + "\n";
}

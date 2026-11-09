import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { db, pool } from "../server/src/db/client";
import { clinicianImportRuns } from "../server/src/db/schema";

const CSV_PATH = resolve(process.cwd(), "data/synthetic/clinician_review.csv");

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    if (c === "\r") {
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function main(): Promise<void> {
  if (!existsSync(CSV_PATH)) {
    console.error(`No file at ${CSV_PATH}`);
    process.exit(1);
  }
  const csv = parseCsv(readFileSync(CSV_PATH, "utf8"));
  const header = csv[0];
  const idx = {
    coupleId: header.indexOf("couple_id"),
    engineRoute: header.indexOf("engine_route"),
    clinicianAgreesRisk: header.indexOf("clinician_agrees_risk (Y/N)"),
    clinicianExpectedRoute: header.indexOf("clinician_expected_route"),
    clinicianNotes: header.indexOf("clinician_notes"),
  };
  if (Object.values(idx).some((v) => v < 0)) {
    console.error("clinician_review.csv header is missing required columns");
    process.exit(1);
  }

  const rows = csv.slice(1).filter((r) => r.length && r[idx.coupleId]);
  const reviewed = rows.filter(
    (r) =>
      (r[idx.clinicianAgreesRisk] ?? "").trim().length > 0 ||
      (r[idx.clinicianExpectedRoute] ?? "").trim().length > 0,
  );
  if (reviewed.length === 0) {
    console.log("No clinician rows filled in. Dashboard will keep showing 'awaiting clinical review'.");
    await pool.end();
    process.exit(0);
  }

  let riskAgreed = 0;
  let escalationAgreed = 0;
  const mismatches: Array<{
    coupleId: string;
    engineRoute: string;
    clinicianRoute: string;
    clinicianAgreesRisk: string;
    notes: string;
  }> = [];

  for (const r of reviewed) {
    const coupleId = r[idx.coupleId];
    const engineRoute = (r[idx.engineRoute] ?? "").trim();
    const clinAgrees = (r[idx.clinicianAgreesRisk] ?? "").trim().toUpperCase();
    const clinRoute = (r[idx.clinicianExpectedRoute] ?? "").trim();
    const notes = (r[idx.clinicianNotes] ?? "").trim();

    if (clinAgrees === "Y") riskAgreed += 1;
    if (clinRoute && clinRoute === engineRoute) escalationAgreed += 1;

    if (clinAgrees !== "Y" || (clinRoute && clinRoute !== engineRoute)) {
      mismatches.push({
        coupleId,
        engineRoute,
        clinicianRoute: clinRoute,
        clinicianAgreesRisk: clinAgrees,
        notes,
      });
    }
  }

  const n = reviewed.length;
  const riskPct = Math.round((riskAgreed / n) * 100);
  const escalationPct = Math.round((escalationAgreed / n) * 100);

  const ranAt = new Date().toISOString();
  await db.insert(clinicianImportRuns).values({
    ranAt,
    rowsImported: n,
    riskAccuracyPct: riskPct,
    escalationAccuracyPct: escalationPct,
    mismatches,
  });

  console.log(
    `clinician:import: ${n} reviewed rows\n  risk agreement:        ${riskPct}%\n  escalation agreement:  ${escalationPct}%\n  mismatches:            ${mismatches.length}`,
  );
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});

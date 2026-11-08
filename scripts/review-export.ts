// Writes a side-by-side EN/AR review sheet for the clinical adviser and the
// Arabic reviewer. Output: data/review/<YYYY-MM-DD>_templates.csv
//
// Usage: npm run review:export

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { allTemplates } from "../src/content/templates";

function csvCell(s: string): string {
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function main() {
  const rows = allTemplates();
  const header = [
    "id",
    "version",
    "status",
    "approved_by",
    "section_label",
    "note",
    "english",
    "arabic",
    "clinical_ok (Y/N)",
    "arabic_ok (Y/N)",
    "notes_from_reviewer",
  ];
  const lines = rows.map((t) =>
    [
      t.id,
      String(t.version),
      t.status,
      t.approvedBy ?? "",
      t.sectionLabel,
      t.note,
      t.text.en,
      t.text.ar,
      "",
      "",
      "",
    ]
      .map(csvCell)
      .join(","),
  );
  const outDir = join(process.cwd(), "data", "review");
  mkdirSync(outDir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const outPath = join(outDir, `${today}_templates.csv`);
  writeFileSync(outPath, [header.join(","), ...lines].join("\n") + "\n");
  console.log(`Wrote ${rows.length} templates to ${outPath}`);
}

main();

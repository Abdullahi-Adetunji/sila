// Writes a side-by-side EN/AR review sheet for the clinical adviser and the
// Arabic reviewer. Output:
//   data/review/<YYYY-MM-DD>_templates.csv  — explanation templates
//   data/review/<YYYY-MM-DD>_quiz.csv       — quiz items, forms A and B
//
// Usage: npm run review:export

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { allTemplates } from "../src/content/templates";
import { allQuizItems } from "../src/content/quiz";

function csvCell(s: string): string {
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function main() {
  const outDir = join(process.cwd(), "data", "review");
  mkdirSync(outDir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);

  // Templates
  const tplHeader = [
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
  const tplLines = allTemplates().map((t) =>
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
  const tplPath = join(outDir, `${today}_templates.csv`);
  writeFileSync(tplPath, [tplHeader.join(","), ...tplLines].join("\n") + "\n");
  console.log(`Wrote ${allTemplates().length} templates to ${tplPath}`);

  // Quiz items: one row per (item, form), covering both languages side by side.
  const quizHeader = [
    "id",
    "form",
    "concept",
    "version",
    "status",
    "approved_by",
    "note",
    "english_question",
    "english_choices (pipe-separated)",
    "english_correct_index",
    "arabic_question",
    "arabic_choices (pipe-separated)",
    "arabic_correct_index",
    "clinical_ok (Y/N)",
    "arabic_ok (Y/N)",
    "parallel_difficulty_ok (Y/N)",
    "notes_from_reviewer",
  ];
  const quizRows = allQuizItems().flatMap((q) =>
    (["A", "B"] as const).map((form) => {
      const en = q.forms[form].en;
      const ar = q.forms[form].ar;
      return [
        q.id,
        form,
        q.concept,
        String(q.version),
        q.status,
        q.approvedBy ?? "",
        q.note,
        en.question,
        en.choices.join(" | "),
        en.correct === null ? "n/a" : String(en.correct),
        ar.question,
        ar.choices.join(" | "),
        ar.correct === null ? "n/a" : String(ar.correct),
        "",
        "",
        "",
        "",
      ]
        .map(csvCell)
        .join(",");
    }),
  );
  const quizPath = join(outDir, `${today}_quiz.csv`);
  writeFileSync(quizPath, [quizHeader.join(","), ...quizRows].join("\n") + "\n");
  console.log(`Wrote ${allQuizItems().length} quiz items (× 2 forms) to ${quizPath}`);
}

main();

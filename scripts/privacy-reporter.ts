// Vitest reporter that writes data/review/privacy_report.json after every
// test run. The "privacy-tagged" set is the union of test files whose
// filename matches the regex below (M1/M2/M3 privacy and access-control
// tests). No test content is in the report; only pass/fail counts and the
// names of the files touched.

import { mkdirSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const PRIVACY_FILES = [
  "vault.test.ts",
  "consent.test.ts",
  "coupleRisk.test.ts",
  "counsellor.test.ts",
  "referrals.test.ts",
  "relatives.test.ts",
  "audit.test.ts",
  "roles.test.ts",
  "dev.test.ts",
  "volunteer.test.ts",
  "quiz.test.ts",
  "ttr.test.ts",
  "anonymity.test.ts",
  "demoScoping.test.ts",
  "routeInventory.test.ts",
];

interface MinimalTask {
  type?: string;
  mode?: string;
  result?: { state?: string };
  tasks?: MinimalTask[];
}

interface MinimalFile {
  filepath?: string;
  name?: string;
  tasks?: MinimalTask[];
}

function countStates(tasks: MinimalTask[] | undefined, counts: Record<string, number>) {
  if (!tasks) return;
  for (const t of tasks) {
    if (t.type === "test" || (!t.type && t.tasks === undefined)) {
      const s = t.result?.state ?? "unknown";
      counts[s] = (counts[s] ?? 0) + 1;
    } else if (t.tasks) {
      countStates(t.tasks, counts);
    }
  }
}

export default class PrivacyReporter {
  async onFinished(files: MinimalFile[] = []) {
    const started = new Date().toISOString();
    const reportFiles: Array<{ file: string; counts: Record<string, number> }> = [];
    let overallPassed = 0;
    let overallFailed = 0;
    for (const f of files) {
      const name = f.filepath ? basename(f.filepath) : (f.name ?? "unknown");
      if (!PRIVACY_FILES.includes(name)) continue;
      const counts: Record<string, number> = {};
      countStates(f.tasks, counts);
      overallPassed += counts.pass ?? 0;
      overallFailed += counts.fail ?? 0;
      reportFiles.push({ file: name, counts });
    }
    const report = {
      startedAt: started,
      endedAt: new Date().toISOString(),
      passed: overallPassed,
      failed: overallFailed,
      blocked: overallPassed, // passing a privacy test means an access attempt was blocked as expected
      files: reportFiles,
    };
    const outDir = resolve(process.cwd(), "data", "review");
    mkdirSync(outDir, { recursive: true });
    const outPath = resolve(outDir, "privacy_report.json");
    writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
    console.log(`privacy-report: wrote ${outPath} (passed=${overallPassed}, failed=${overallFailed})`);
  }
}

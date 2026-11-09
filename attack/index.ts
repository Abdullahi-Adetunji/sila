// Black-box HTTP attack suite. Reads BASE_URL from env and writes
// data/review/attack_report.json. Exits non-zero on any failure.
//
// Usage:
//   BASE_URL=http://localhost:3000 npm run attack
//
// For a production deployment:
//   BASE_URL=https://pilot.example.org npm run attack

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { BASE_URL, CaseReporter } from "./helpers";
import { run as idor } from "./cases/idor";
import { run as csrf } from "./cases/csrf";
import { run as revocations } from "./cases/revocations";
import { run as sessions } from "./cases/sessions";
import { run as bruteForce } from "./cases/brute_force";
import { run as escalation } from "./cases/escalation";
import { run as demoOff } from "./cases/demo_off";
import { run as demoOn } from "./cases/demo_on";

async function main(): Promise<number> {
  const started = new Date().toISOString();
  const profile = process.env.SILA_EXPECT_DEMO_MODE === "true" ? "demo-on" : "demo-off";
  process.stdout.write(`attack-suite: BASE_URL=${BASE_URL} profile=${profile}\n`);
  const reporter = new CaseReporter();
  for (const section of [idor, csrf, revocations, sessions, bruteForce, escalation, demoOff, demoOn]) {
    await section(reporter);
  }
  const ended = new Date().toISOString();
  const passed = reporter.findings.filter((f) => f.passed).length;
  const failed = reporter.findings.filter((f) => !f.passed).length;
  const report = {
    baseUrl: BASE_URL,
    startedAt: started,
    endedAt: ended,
    passed,
    failed,
    findings: reporter.findings,
  };
  const outDir = resolve(process.cwd(), "data", "review");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "attack_report.json"), JSON.stringify(report, null, 2) + "\n");
  process.stdout.write(`attack-suite: passed=${passed}, failed=${failed}\n`);
  return failed === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`attack-suite: fatal ${err}\n`);
    process.exit(2);
  },
);

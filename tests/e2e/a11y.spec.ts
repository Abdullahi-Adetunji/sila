// Automated axe accessibility sweep. Runs the eight user-visible pages in
// English and (where a language switch is present) Arabic, at the two
// viewports defined in playwright.config.ts. Serious and critical findings
// fail the test; moderate and minor land in the report but don't fail.
//
// axe rule exclusions are deliberate and listed per-page where used, with a
// one-line reason. Nothing is suppressed globally.

import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";

const REPORT_DIR = resolve(process.cwd(), "data/review");
mkdirSync(REPORT_DIR, { recursive: true });
const REPORT_PATH = resolve(REPORT_DIR, "a11y_report.jsonl");

// One newline-delimited JSON row per scan so a reviewer can walk the sweep.
function recordScan(row: Record<string, unknown>): void {
  appendFileSync(REPORT_PATH, JSON.stringify(row) + "\n");
}

async function switchLang(page: Page, lang: "en" | "ar"): Promise<void> {
  const label = lang === "ar" ? /العربية/ : /^English$/i;
  const btn = page.getByRole("button", { name: label });
  if (await btn.count()) await btn.first().click();
  const dir = lang === "ar" ? "rtl" : "ltr";
  await expect(page.locator("html")).toHaveAttribute("dir", dir, { timeout: 2000 }).catch(() => {});
}

async function demoLogin(page: Page, who: "partner.a" | "counsellor"): Promise<void> {
  await page.goto("/");
  const name = who === "partner.a" ? /sign in as partner a/i : /sign in as counsellor/i;
  await page.getByRole("button", { name }).click();
  await expect(page).toHaveURL(/\/home/);
}

interface Scan {
  name: string;
  lang: "en" | "ar";
  path: string;
  requiresLogin?: "partner.a" | "counsellor";
  switchOnPage?: boolean; // page has an in-page LangSwitch
}

// Public pages: no login required. Login + signup are English-only in the
// current build, so AR is omitted for them.
const SCANS: Scan[] = [
  { name: "landing", path: "/", lang: "en", switchOnPage: true },
  { name: "landing", path: "/", lang: "ar", switchOnPage: true },
  { name: "login", path: "/login", lang: "en" },
  { name: "signup", path: "/signup", lang: "en" },
  { name: "volunteer", path: "/volunteer", lang: "en", switchOnPage: true },
  { name: "volunteer", path: "/volunteer", lang: "ar", switchOnPage: true },

  // Signed-in pages (demo partner.a; locale defaults to English, LangSwitch
  // flips the content without a page reload on /me, /couple, /options).
  { name: "me", path: "/me", lang: "en", requiresLogin: "partner.a", switchOnPage: true },
  { name: "me", path: "/me", lang: "ar", requiresLogin: "partner.a", switchOnPage: true },
  { name: "couple", path: "/couple", lang: "en", requiresLogin: "partner.a", switchOnPage: true },
  { name: "couple", path: "/couple", lang: "ar", requiresLogin: "partner.a", switchOnPage: true },
  { name: "consent", path: "/consent", lang: "en", requiresLogin: "partner.a" },
  { name: "options", path: "/options", lang: "en", requiresLogin: "partner.a", switchOnPage: true },
  { name: "options", path: "/options", lang: "ar", requiresLogin: "partner.a", switchOnPage: true },
];

for (const s of SCANS) {
  test(`a11y: ${s.name} (${s.lang})`, async ({ page }, testInfo) => {
    if (s.requiresLogin) {
      await demoLogin(page, s.requiresLogin);
    }
    await page.goto(s.path);

    if (s.switchOnPage && s.lang === "ar") {
      await switchLang(page, "ar");
    }
    // Wait briefly for reveal animations to settle so axe reads final colours.
    await page.waitForTimeout(400);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const other = results.violations.filter((v) => v.impact !== "serious" && v.impact !== "critical");

    recordScan({
      ts: new Date().toISOString(),
      page: s.name,
      lang: s.lang,
      viewport: testInfo.project.use.viewport,
      project: testInfo.project.name,
      url: page.url(),
      serious: serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
      other: other.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
    });

    if (serious.length > 0) {
      const lines = serious
        .map(
          (v) =>
            `  - ${v.id} [${v.impact}] × ${v.nodes.length}: ${v.help}\n    ${v.helpUrl}\n    target: ${v.nodes.slice(0, 3).map((n) => n.target.join(" > ")).join(" | ")}`,
        )
        .join("\n");
      throw new Error(`${serious.length} serious/critical axe violation(s)\n${lines}`);
    }
  });
}

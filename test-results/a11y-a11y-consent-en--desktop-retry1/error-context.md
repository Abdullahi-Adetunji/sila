# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y.spec.ts >> a11y: consent (en)
- Location: tests/e2e/a11y.spec.ts:68:3

# Error details

```
Error: 1 serious/critical axe violation(s)
  - color-contrast [serious] × 2: Elements must meet minimum color contrast ratio thresholds
    https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
    target: .text-\[10px\] | .reveal-delay-2 > .overflow-hidden.rounded-2xl.bg-surface > .items-start.gap-4.relative > .min-w-0.flex-1 > .mt-3 > .transition-\[filter\,transform\].hover\:brightness-110.hover\:translate-y-\[-1px\]
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - alert [ref=f1e2]
  - generic [ref=f1e3]:
    - status [ref=f1e5]:
      - generic [ref=f1e6]:
        - generic [ref=f1e7]: "Prototype: synthetic data only, not medical advice."
        - button "Dismiss banner" [ref=f1e8]: ✕
    - banner [ref=f1e9]:
      - generic [ref=f1e10]:
        - link "Sila" [ref=f1e11] [cursor=pointer]:
          - /url: /home
        - generic [ref=f1e17]: partner.a@demo.sila
        - button "Log out" [ref=f1e18]
      - navigation "Primary" [ref=f1e19]:
        - link "Home" [ref=f1e20] [cursor=pointer]:
          - /url: /home
        - link "My result" [ref=f1e21] [cursor=pointer]:
          - /url: /me
        - link "Partner" [ref=f1e22] [cursor=pointer]:
          - /url: /partner
        - link "Consent" [ref=f1e23] [cursor=pointer]:
          - /url: /consent
        - link "Couple result" [ref=f1e24] [cursor=pointer]:
          - /url: /couple
        - link "Relatives" [ref=f1e25] [cursor=pointer]:
          - /url: /relatives
        - link "Referrals" [ref=f1e26] [cursor=pointer]:
          - /url: /referrals
        - link "Options" [ref=f1e27] [cursor=pointer]:
          - /url: /options
        - link "Access log" [ref=f1e28] [cursor=pointer]:
          - /url: /access-log
    - main [ref=f1e30]:
      - generic [ref=f1e32]:
        - paragraph [ref=f1e33]: Permissions
        - heading "Consent centre" [level=1] [ref=f1e34]
        - paragraph [ref=f1e35]:
          - text: Any grant can be revoked. A revocation takes effect immediately for every future request.
          - generic [ref=f1e36]: wording v2026-11-draft
      - generic [ref=f1e40]:
        - generic [ref=f1e48]:
          - generic [ref=f1e49]:
            - paragraph [ref=f1e50]: Share the couple risk with my partner
            - generic [ref=f1e51]: Active
          - paragraph [ref=f1e52]: Both of you must grant this for the couple result screen to show. The couple result can reveal something about each partner — for example, a 1 in 4 chance of sickle cell anaemia means both of you carry a variant.
          - button "Revoke" [ref=f1e54]
        - generic [ref=f1e62]:
          - paragraph [ref=f1e64]: Share which conditions I carry with my partner
          - paragraph [ref=f1e65]: This does not share variant ids or detailed test wording, only the conditions I carry a variant for.
          - button "Grant" [ref=f1e67]
        - generic [ref=f1e75]:
          - paragraph [ref=f1e77]: Share my full result with my partner
          - paragraph [ref=f1e78]: Supersedes conditions-carried. Variants and statuses by gene.
          - button "Grant" [ref=f1e80]
      - generic [ref=f1e89]:
        - paragraph [ref=f1e91]: Include my quiz scores in the evaluation data
        - paragraph [ref=f1e92]: Never includes genetic data. Purely how well the explanations work.
        - button "Grant" [ref=f1e94]
```

# Test source

```ts
  5   | //
  6   | // axe rule exclusions are deliberate and listed per-page where used, with a
  7   | // one-line reason. Nothing is suppressed globally.
  8   | 
  9   | import { expect, test, type Page } from "@playwright/test";
  10  | import AxeBuilder from "@axe-core/playwright";
  11  | import { mkdirSync, appendFileSync } from "node:fs";
  12  | import { resolve } from "node:path";
  13  | 
  14  | const REPORT_DIR = resolve(process.cwd(), "data/review");
  15  | mkdirSync(REPORT_DIR, { recursive: true });
  16  | const REPORT_PATH = resolve(REPORT_DIR, "a11y_report.jsonl");
  17  | 
  18  | // One newline-delimited JSON row per scan so a reviewer can walk the sweep.
  19  | function recordScan(row: Record<string, unknown>): void {
  20  |   appendFileSync(REPORT_PATH, JSON.stringify(row) + "\n");
  21  | }
  22  | 
  23  | async function switchLang(page: Page, lang: "en" | "ar"): Promise<void> {
  24  |   const label = lang === "ar" ? /العربية/ : /^English$/i;
  25  |   const btn = page.getByRole("button", { name: label });
  26  |   if (await btn.count()) await btn.first().click();
  27  |   const dir = lang === "ar" ? "rtl" : "ltr";
  28  |   await expect(page.locator("html")).toHaveAttribute("dir", dir, { timeout: 2000 }).catch(() => {});
  29  | }
  30  | 
  31  | async function demoLogin(page: Page, who: "partner.a" | "counsellor"): Promise<void> {
  32  |   await page.goto("/");
  33  |   const name = who === "partner.a" ? /sign in as partner a/i : /sign in as counsellor/i;
  34  |   await page.getByRole("button", { name }).click();
  35  |   await expect(page).toHaveURL(/\/home/);
  36  | }
  37  | 
  38  | interface Scan {
  39  |   name: string;
  40  |   lang: "en" | "ar";
  41  |   path: string;
  42  |   requiresLogin?: "partner.a" | "counsellor";
  43  |   switchOnPage?: boolean; // page has an in-page LangSwitch
  44  | }
  45  | 
  46  | // Public pages: no login required. Login + signup are English-only in the
  47  | // current build, so AR is omitted for them.
  48  | const SCANS: Scan[] = [
  49  |   { name: "landing", path: "/", lang: "en", switchOnPage: true },
  50  |   { name: "landing", path: "/", lang: "ar", switchOnPage: true },
  51  |   { name: "login", path: "/login", lang: "en" },
  52  |   { name: "signup", path: "/signup", lang: "en" },
  53  |   { name: "volunteer", path: "/volunteer", lang: "en", switchOnPage: true },
  54  |   { name: "volunteer", path: "/volunteer", lang: "ar", switchOnPage: true },
  55  | 
  56  |   // Signed-in pages (demo partner.a; locale defaults to English, LangSwitch
  57  |   // flips the content without a page reload on /me, /couple, /options).
  58  |   { name: "me", path: "/me", lang: "en", requiresLogin: "partner.a", switchOnPage: true },
  59  |   { name: "me", path: "/me", lang: "ar", requiresLogin: "partner.a", switchOnPage: true },
  60  |   { name: "couple", path: "/couple", lang: "en", requiresLogin: "partner.a", switchOnPage: true },
  61  |   { name: "couple", path: "/couple", lang: "ar", requiresLogin: "partner.a", switchOnPage: true },
  62  |   { name: "consent", path: "/consent", lang: "en", requiresLogin: "partner.a" },
  63  |   { name: "options", path: "/options", lang: "en", requiresLogin: "partner.a", switchOnPage: true },
  64  |   { name: "options", path: "/options", lang: "ar", requiresLogin: "partner.a", switchOnPage: true },
  65  | ];
  66  | 
  67  | for (const s of SCANS) {
  68  |   test(`a11y: ${s.name} (${s.lang})`, async ({ page }, testInfo) => {
  69  |     if (s.requiresLogin) {
  70  |       await demoLogin(page, s.requiresLogin);
  71  |     }
  72  |     await page.goto(s.path);
  73  | 
  74  |     if (s.switchOnPage && s.lang === "ar") {
  75  |       await switchLang(page, "ar");
  76  |     }
  77  |     // Wait briefly for reveal animations to settle so axe reads final colours.
  78  |     await page.waitForTimeout(400);
  79  | 
  80  |     const results = await new AxeBuilder({ page })
  81  |       .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
  82  |       .analyze();
  83  | 
  84  |     const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  85  |     const other = results.violations.filter((v) => v.impact !== "serious" && v.impact !== "critical");
  86  | 
  87  |     recordScan({
  88  |       ts: new Date().toISOString(),
  89  |       page: s.name,
  90  |       lang: s.lang,
  91  |       viewport: testInfo.project.use.viewport,
  92  |       project: testInfo.project.name,
  93  |       url: page.url(),
  94  |       serious: serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
  95  |       other: other.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
  96  |     });
  97  | 
  98  |     if (serious.length > 0) {
  99  |       const lines = serious
  100 |         .map(
  101 |           (v) =>
  102 |             `  - ${v.id} [${v.impact}] × ${v.nodes.length}: ${v.help}\n    ${v.helpUrl}\n    target: ${v.nodes.slice(0, 3).map((n) => n.target.join(" > ")).join(" | ")}`,
  103 |         )
  104 |         .join("\n");
> 105 |       throw new Error(`${serious.length} serious/critical axe violation(s)\n${lines}`);
      |             ^ Error: 1 serious/critical axe violation(s)
  106 |     }
  107 |   });
  108 | }
  109 | 
```
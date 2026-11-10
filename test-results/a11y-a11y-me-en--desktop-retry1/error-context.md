# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y.spec.ts >> a11y: me (en)
- Location: tests/e2e/a11y.spec.ts:68:3

# Error details

```
Error: 1 serious/critical axe violation(s)
  - color-contrast [serious] × 1: Elements must meet minimum color contrast ratio thresholds
    https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright
    target: .text-carrier
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
        - generic [ref=f1e33]:
          - paragraph [ref=f1e34]: You
          - heading "Your result" [level=1] [ref=f1e35]
          - paragraph [ref=f1e36]: This page shows your own carrier result only. Your partner cannot see it unless you choose to share it on the Consent page.
        - generic [ref=f1e37]:
          - button "Switch to English" [pressed] [ref=f1e38]: English
          - button "التبديل إلى العربية" [ref=f1e39]: العربية
      - list [ref=f1e40]:
        - listitem [ref=f1e41]:
          - article [ref=f1e42]:
            - generic [ref=f1e43]:
              - generic [ref=f1e44]:
                - 'generic "Section type: Education" [ref=f1e45]': Education
                - paragraph [ref=f1e46]: Haemoglobin disorders
                - generic [ref=f1e47]: Carrier of one variant
              - paragraph [ref=f1e48]: You carry one copy of a variant for this condition. Carriers are healthy. What it may mean for your children depends on whether your partner also carries a variant for the same condition.
        - listitem [ref=f1e49]:
          - article [ref=f1e50]:
            - generic [ref=f1e51]:
              - generic [ref=f1e52]:
                - 'generic "Section type: Education" [ref=f1e53]': Education
                - paragraph [ref=f1e54]: Cystic fibrosis
                - generic [ref=f1e55]: No variant found
              - paragraph [ref=f1e56]: No pathogenic variant was found for this condition in the tested set. That lowers the chance of a child being affected but does not reduce it to zero, because screening does not detect every possible variant.
        - listitem [ref=f1e57]:
          - article [ref=f1e58]:
            - generic [ref=f1e59]:
              - generic [ref=f1e60]:
                - 'generic "Section type: Education" [ref=f1e61]': Education
                - paragraph [ref=f1e62]: Inherited hearing loss
                - generic [ref=f1e63]: No variant found
              - paragraph [ref=f1e64]: No pathogenic variant was found for this condition in the tested set. That lowers the chance of a child being affected but does not reduce it to zero, because screening does not detect every possible variant.
      - generic [ref=f1e66]:
        - generic [ref=f1e67]:
          - 'generic "Section type: Education" [ref=f1e68]': Education
          - paragraph [ref=f1e69]: Residual risk
        - paragraph [ref=f1e70]: A “no variant found” result lowers the risk but does not remove it. The test looks for a known set of variants, and a child can still inherit a rare variant not covered by the test.
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
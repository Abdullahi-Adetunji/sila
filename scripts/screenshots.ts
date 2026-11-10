// Captures every main screen in EN and AR, at phone and desktop widths.
// Outputs to docs/screenshots/<lang>-<width>/<slug>.png.
//
// Requires a running site at BASE_URL (default http://localhost:3000) and a
// seeded database with the demo accounts (DEMO_MODE=true).
//
// Run: BASE_URL=... DEMO_PASSWORD=... npm run screenshots

import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type BrowserContext, type Page } from "@playwright/test";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const OUT = resolve(process.cwd(), "docs", "screenshots");

const WIDTHS: Array<{ name: string; width: number; height: number }> = [
  { name: "phone", width: 400, height: 900 },
  { name: "desktop", width: 1280, height: 900 },
];

const LANGS: Array<"en" | "ar"> = ["en", "ar"];

const PUBLIC_PAGES: Array<{ slug: string; path: string }> = [
  { slug: "landing", path: "/" },
  { slug: "volunteer-info", path: "/volunteer" },
  { slug: "login", path: "/login" },
  { slug: "signup", path: "/signup" },
  { slug: "docs-data-governance", path: "/docs/data-governance" },
];

const AUTHED_PAGES: Array<{ slug: string; path: string }> = [
  { slug: "home", path: "/home" },
  { slug: "me", path: "/me" },
  { slug: "partner", path: "/partner" },
  { slug: "consent", path: "/consent" },
  { slug: "couple", path: "/couple" },
  { slug: "relatives", path: "/relatives" },
  { slug: "referrals", path: "/referrals" },
  { slug: "options", path: "/options" },
  { slug: "access-log", path: "/access-log" },
];

async function clickLangIfNeeded(page: Page, lang: "en" | "ar"): Promise<void> {
  const html = page.locator("html");
  const currentDir = await html.getAttribute("dir").catch(() => null);
  const desiredDir = lang === "ar" ? "rtl" : "ltr";
  if (currentDir === desiredDir) return;
  const btn = page.getByRole("button", { name: lang === "ar" ? /العربية/i : /english/i });
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(150);
  }
}

async function demoSignInPartnerA(ctx: BrowserContext): Promise<void> {
  await demoSignInAs(ctx, /sign in as partner a/i, /\/home/);
}

async function demoSignInAs(ctx: BrowserContext, buttonName: RegExp, urlPattern: RegExp): Promise<void> {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await page.getByRole("button", { name: buttonName }).click();
  await page.waitForURL(urlPattern);
  await page.close();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  try {
    for (const w of WIDTHS) {
      for (const lang of LANGS) {
        const dir = resolve(OUT, `${lang}-${w.name}`);
        mkdirSync(dir, { recursive: true });

        // Public pages in their own context (no auth).
        const pubCtx = await browser.newContext({ viewport: { width: w.width, height: w.height } });
        for (const p of PUBLIC_PAGES) {
          const page = await pubCtx.newPage();
          await page.goto(`${BASE}${p.path}`);
          await clickLangIfNeeded(page, lang);
          await page.waitForLoadState("networkidle").catch(() => {});
          await page.screenshot({
            path: resolve(dir, `${p.slug}.png`),
            fullPage: true,
          });
          await page.close();
        }
        await pubCtx.close();

        // Authed pages (as Partner A).
        const authCtx = await browser.newContext({ viewport: { width: w.width, height: w.height } });
        await demoSignInPartnerA(authCtx);
        for (const p of AUTHED_PAGES) {
          const page = await authCtx.newPage();
          await page.goto(`${BASE}${p.path}`);
          await clickLangIfNeeded(page, lang);
          await page.waitForLoadState("networkidle").catch(() => {});
          await page.screenshot({
            path: resolve(dir, `${p.slug}.png`),
            fullPage: true,
          });
          await page.close();
        }
        await authCtx.close();

        // Admin dashboard (demo admin, no TOTP in DEMO_MODE).
        const adminCtx = await browser.newContext({ viewport: { width: w.width, height: w.height } });
        await demoSignInAs(adminCtx, /sign in as admin/i, /\/admin/);
        const adminPage = await adminCtx.newPage();
        await adminPage.goto(`${BASE}/admin`);
        await adminPage.waitForLoadState("networkidle").catch(() => {});
        await adminPage.screenshot({
          path: resolve(dir, `admin.png`),
          fullPage: true,
        });
        await adminPage.close();
        await adminCtx.close();

        // Lab submission page (demo lab).
        const labCtx = await browser.newContext({ viewport: { width: w.width, height: w.height } });
        await demoSignInAs(labCtx, /sign in as lab/i, /\/lab/);
        const labPage = await labCtx.newPage();
        await labPage.goto(`${BASE}/lab`);
        await labPage.waitForLoadState("networkidle").catch(() => {});
        await labPage.screenshot({
          path: resolve(dir, `lab.png`),
          fullPage: true,
        });
        await labPage.close();
        await labCtx.close();

        // Counsellor queue (demo counsellor).
        const coCtx = await browser.newContext({ viewport: { width: w.width, height: w.height } });
        await demoSignInAs(coCtx, /sign in as counsellor/i, /\/counsellor-queue/);
        const coPage = await coCtx.newPage();
        await coPage.goto(`${BASE}/counsellor-queue`);
        await coPage.waitForLoadState("networkidle").catch(() => {});
        await coPage.screenshot({
          path: resolve(dir, `counsellor-queue.png`),
          fullPage: true,
        });
        await coPage.close();
        await coCtx.close();
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`screenshots: wrote ${PUBLIC_PAGES.length + AUTHED_PAGES.length + 3} × ${LANGS.length} × ${WIDTHS.length} to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

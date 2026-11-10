// Each demo one-click button must land on the account's role-specific
// start page. Partner A and Partner B are persons so they land on /home;
// counsellor lands on /counsellor-queue. The nav on each screen must only
// show that role's tabs; a staff account must not see the person tabs at
// all.

import { expect, test, type Page } from "@playwright/test";

async function expectTabs(page: Page, present: RegExp[], absent: RegExp[]): Promise<void> {
  const nav = page.getByRole("navigation", { name: /primary/i });
  for (const r of present) {
    await expect(nav.getByRole("link", { name: r })).toBeVisible();
  }
  for (const r of absent) {
    await expect(nav.getByRole("link", { name: r })).toHaveCount(0);
  }
}

test.describe("role-based landing", () => {
  test("partner A lands on /home with person tabs only", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /sign in as partner a/i }).click();
    await expect(page).toHaveURL(/\/home(\?|$)/);
    await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
    await expectTabs(
      page,
      [/^Home$/, /^My result$/, /^Partner$/, /^Consent$/, /^Couple result$/, /^Options$/],
      [/^Queue$/, /^Dashboard$/, /^Staff$/, /^Submit result$/],
    );
  });

  test("partner B lands on /home with person tabs only", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /sign in as partner b/i }).click();
    await expect(page).toHaveURL(/\/home(\?|$)/);
    await expectTabs(
      page,
      [/^Home$/, /^My result$/, /^Consent$/],
      [/^Queue$/, /^Dashboard$/, /^Staff$/, /^Submit result$/],
    );
  });

  test("counsellor lands on /counsellor-queue with only the Queue tab", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /sign in as counsellor/i }).click();
    await expect(page).toHaveURL(/\/counsellor-queue(\?|$)/);
    await expect(page.getByRole("heading", { name: /counsellor queue/i })).toBeVisible();
    await expectTabs(
      page,
      [/^Queue$/],
      [
        /^Home$/,
        /^My result$/,
        /^Partner$/,
        /^Consent$/,
        /^Couple result$/,
        /^Relatives$/,
        /^Referrals$/,
        /^Options$/,
        /^Access log$/,
        /^Dashboard$/,
        /^Staff$/,
      ],
    );
  });

  test("counsellor typing /home in the URL is bounced to /counsellor-queue", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /sign in as counsellor/i }).click();
    await expect(page).toHaveURL(/\/counsellor-queue(\?|$)/);
    await page.goto("/home");
    // Client-side layout redirect lands on the counsellor's start page.
    await expect(page).toHaveURL(/\/counsellor-queue(\?|$)/, { timeout: 5000 });
  });
});

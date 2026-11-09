// Volunteer flow, start to finish. Assumes DEMO_MODE on the server is on
// (same site as the judge flow) and no server-side state is required beyond
// a running API.

import { expect, test } from "@playwright/test";

test.describe("volunteer flow", () => {
  test("info → consent → code → quiz before → couple → quiz after → withdraw", async ({ page }) => {
    await page.goto("/volunteer");
    await expect(page.getByRole("heading", { name: /about this study/i })).toBeVisible();

    // Pick a reading band
    await page.getByRole("button", { name: /^somewhat comfortable$/i }).click();

    await page.getByRole("button", { name: /^start the study$/i }).click();

    // Consent screen
    await expect(page.getByRole("heading", { name: /your consent/i })).toBeVisible();
    await page.getByRole("button", { name: /i agree/i }).click();

    // Participant code
    await expect(page.getByRole("heading", { name: /your participant code/i })).toBeVisible();
    const code = (await page.locator("p.font-mono").first().textContent())?.trim() ?? "";
    expect(code).toMatch(/^[BCDFGHJKMNPQRSTVWXZ23456789]{10}$/);

    // Start quiz (before)
    await page.getByRole("button", { name: /start quiz \(before\)/i }).click();
    // Answer each question with the first choice.
    for (let i = 0; i < 8; i++) {
      const firstChoice = page.locator("ul > li > button").first();
      await expect(firstChoice).toBeVisible();
      await firstChoice.click();
    }

    // Couple result view
    await expect(page.getByRole("heading", { name: /your couple result/i })).toBeVisible();
    await page
      .getByRole("button", { name: /continue to the after-quiz/i })
      .click();

    // Quiz after
    for (let i = 0; i < 8; i++) {
      const firstChoice = page.locator("ul > li > button").first();
      await expect(firstChoice).toBeVisible();
      await firstChoice.click();
    }

    // Thank you
    await expect(page.getByRole("heading", { name: /thank you/i })).toBeVisible();

    // Withdraw deletes
    await page.getByRole("button", { name: /withdraw and delete/i }).click();
    await expect(page.getByRole("heading", { name: /about this study/i })).toBeVisible();

    // Resuming with the old code must now 401.
    const probe = await page.evaluate(async (c: string) => {
      const res = await fetch("/api/volunteer/me", {
        headers: { "x-volunteer-code": c },
      });
      return res.status;
    }, code);
    expect(probe).toBe(401);
  });
});

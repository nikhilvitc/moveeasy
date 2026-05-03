import { test, expect } from "@playwright/test";

test.describe("MovEazy smoke", () => {
  test("login route loads and shows MovEasy", async ({ page }) => {
    // baseURL is .../MOVEASY-WEBSITE/ — leading "/" would drop the subpath on GitHub Pages
    await page.goto("./login");
    await expect(page.getByRole("heading", { name: /MovEasy/i })).toBeVisible();
    await expect(page.getByText(/Sign in to your account|Create your account/i)).toBeVisible();
  });
});

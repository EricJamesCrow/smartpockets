import { expect, test } from "@playwright/test";
import { signInAndGoHome } from "./helpers/auth";

/**
 * CROWDEV-415: agent transactions tool-result table paginates hydrated rows.
 * Captures screenshots for manual demo / documentation when run locally.
 */
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";

test.describe("dev harness / agent transactions pagination", () => {
    test.beforeAll(() => {
        if (!CONVEX_URL) {
            test.skip(true, "NEXT_PUBLIC_CONVEX_URL not set");
        }
        if (!process.env.E2E_CLERK_USER_USERNAME) {
            test.skip(true, "E2E_CLERK_USER_USERNAME not set (map TEST_LOGIN_USERNAME in CI)");
        }
        if (!process.env.CLERK_SECRET_KEY && !process.env.E2E_CLERK_USER_PASSWORD) {
            test.skip(true, "Need CLERK_SECRET_KEY or E2E_CLERK_USER_PASSWORD");
        }
    });

    test("outputAvailableManyRows shows pagination and page 2", async ({ page }) => {
        await signInAndGoHome(page);

        await page.goto("/dev/tool-results/list_transactions");
        await expect(page.getByRole("heading", { name: "list_transactions", exact: true })).toBeVisible({
            timeout: 30_000,
        });

        const manyFixture = page.locator("article").filter({
            has: page.getByRole("heading", { name: "outputAvailableManyRows", exact: true }),
        });
        await expect(manyFixture).toBeVisible({ timeout: 15_000 });

        await expect(manyFixture.getByText(/Showing 1 - 50 of 75/)).toBeVisible();

        await page.screenshot({ path: "test-results/demo-pagination-page1.png", fullPage: true });

        await manyFixture.getByRole("button", { name: "Next", exact: true }).click();

        await expect(manyFixture.getByText(/Showing 51 - 75 of 75/)).toBeVisible();

        await page.screenshot({ path: "test-results/demo-pagination-page2.png", fullPage: true });
    });
});

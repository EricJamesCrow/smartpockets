import { expect, test } from "@playwright/test";
import { signInAndGoHome } from "./helpers/auth";

/**
 * CROWDEV-416: agent `list_transactions` table should open `TransactionDetailPanel`
 * (same slideout as /transactions), not only dispatch `get_transaction_detail` in chat.
 *
 * Uses `/dev/tool-results/list_transactions` with fixture overrides so the table
 * renders without depending on real Plaid rows in Convex.
 */
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";

test.describe("agent transactions table opens detail slideout (CROWDEV-416)", () => {
    test.beforeAll(() => {
        if (!CONVEX_URL) {
            test.skip(
                true,
                "[agent tx slideout] NEXT_PUBLIC_CONVEX_URL is not set. Configure apps/app/.env.local per apps/app/tests/README.md.",
            );
        }
        if (!process.env.E2E_CLERK_USER_USERNAME) {
            test.skip(
                true,
                "[agent tx slideout] E2E_CLERK_USER_USERNAME is not set. Add a Clerk dev test user email or export TEST_LOGIN_USERNAME as E2E_CLERK_USER_USERNAME.",
            );
        }
        if (!process.env.CLERK_SECRET_KEY && !process.env.E2E_CLERK_USER_PASSWORD) {
            test.skip(
                true,
                "[agent tx slideout] Neither CLERK_SECRET_KEY nor E2E_CLERK_USER_PASSWORD is set.",
            );
        }
    });

    test("outputAvailable fixture row opens dialog with merchant from mock row", async ({ page }) => {
        await signInAndGoHome(page);

        await page.goto("/dev/tool-results/list_transactions");
        await expect(page.getByRole("heading", { name: "list_transactions", exact: true })).toBeVisible({
            timeout: 30_000,
        });

        const outputAvailable = page.locator("article").filter({ has: page.getByRole("heading", { name: "outputAvailable", exact: true }) });
        await expect(outputAvailable).toBeVisible();

        // First synthesized transaction row is Whole Foods (see FixtureRenderer.synthesizeOverrides).
        // Row `name` in the a11y tree comes from the date column header, not the merchant cell.
        const dataRow = outputAvailable.locator('[role="row"]').filter({ hasText: "Whole Foods" }).first();
        await dataRow.click();

        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible({ timeout: 15_000 });
        await expect(dialog.getByRole("heading", { name: "Whole Foods", exact: true })).toBeVisible();
    });
});

import { api } from "@convex/_generated/api";
import { expect, test } from "@playwright/test";
import { signInAndGoHome } from "./helpers/auth";
import { getAuthedConvexClient } from "./helpers/wallets";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";
const TEST_TRANSACTION_ID = "plaid:plaidTransactions:fx-1";

test.describe("transaction detail slideout notes (CROWDEV-466)", () => {
    test.beforeAll(() => {
        if (!CONVEX_URL) {
            test.skip(true, "[transaction notes] NEXT_PUBLIC_CONVEX_URL is not set. Configure apps/app/.env.local per apps/app/tests/README.md.");
        }
        if (!process.env.E2E_CLERK_USER_USERNAME) {
            test.skip(
                true,
                "[transaction notes] E2E_CLERK_USER_USERNAME is not set. Add a Clerk dev test user email or export TEST_LOGIN_USERNAME as E2E_CLERK_USER_USERNAME.",
            );
        }
        if (!process.env.CLERK_SECRET_KEY && !process.env.E2E_CLERK_USER_PASSWORD) {
            test.skip(true, "[transaction notes] Neither CLERK_SECRET_KEY nor E2E_CLERK_USER_PASSWORD is set.");
        }
    });

    test.beforeEach(async ({ page }) => {
        await signInAndGoHome(page);
        const client = await getAuthedConvexClient({ page, convexUrl: CONVEX_URL });
        await client.mutation(api.transactionOverlays.mutations.upsertField, {
            plaidTransactionId: TEST_TRANSACTION_ID,
            field: "notes",
            value: null,
        });
    });

    test.afterEach(async ({ page }) => {
        try {
            const client = await getAuthedConvexClient({ page, convexUrl: CONVEX_URL });
            await client.mutation(api.transactionOverlays.mutations.upsertField, {
                plaidTransactionId: TEST_TRANSACTION_ID,
                field: "notes",
                value: null,
            });
        } catch {
            // Best-effort cleanup; keep the original test failure visible.
        }
    });

    test("saves multi-word notes and keeps cleared notes empty after reopen", async ({ page }) => {
        const client = await getAuthedConvexClient({ page, convexUrl: CONVEX_URL });
        const note = `multi word note ${Date.now()}`;

        await page.goto("/dev/tool-results/list_transactions");
        await expect(page.getByRole("heading", { name: "list_transactions", exact: true })).toBeVisible({
            timeout: 30_000,
        });

        const outputAvailable = page.locator("article").filter({
            has: page.getByRole("heading", { name: "outputAvailable", exact: true }),
        });
        const dataRow = outputAvailable.locator('[role="row"]').filter({ hasText: "Whole Foods" }).first();

        await dataRow.click();

        let dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible({ timeout: 15_000 });

        let notes = dialog.getByRole("textbox", { name: "Notes" });
        await notes.fill(note);
        await notes.blur();

        await expect
            .poll(
                async () => {
                    const overlay = await client.query(api.transactionOverlays.queries.getByTransactionId, {
                        plaidTransactionId: TEST_TRANSACTION_ID,
                    });
                    return overlay?.notes ?? null;
                },
                { timeout: 10_000 },
            )
            .toBe(note);

        await dialog.getByRole("button", { name: "Close" }).click();
        await expect(dialog).toBeHidden({ timeout: 15_000 });

        await dataRow.click();
        dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible({ timeout: 15_000 });
        notes = dialog.getByRole("textbox", { name: "Notes" });
        await expect(notes).toHaveValue(note);

        await notes.fill("");
        await notes.blur();
        await dialog.getByRole("button", { name: "Close" }).click();
        await expect(dialog).toBeHidden({ timeout: 15_000 });

        await dataRow.click();
        dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible({ timeout: 15_000 });
        notes = dialog.getByRole("textbox", { name: "Notes" });
        await expect(notes).toHaveValue("");

        await expect
            .poll(
                async () => {
                    const overlay = await client.query(api.transactionOverlays.queries.getByTransactionId, {
                        plaidTransactionId: TEST_TRANSACTION_ID,
                    });
                    return overlay?.notes ?? null;
                },
                { timeout: 10_000 },
            )
            .toBe(null);
    });
});

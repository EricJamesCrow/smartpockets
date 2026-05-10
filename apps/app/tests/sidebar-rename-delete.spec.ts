import { expect, test } from "@playwright/test";
import { signInAndGoHome } from "./helpers/auth";
import { cleanupTestThreads, seedTestThreads } from "./helpers/seed-thread";

/**
 * Verifies the sidebar kebab menu fix from CROWDEV-352:
 *
 *   1. Hover a sidebar row → click its kebab → exactly ONE `[role="menu"]`
 *      is visible. Before the fix, both the desktop and the (portaled)
 *      mobile-sidebar menu rendered simultaneously due to lifted state.
 *   2. Rename action updates the sidebar row's title in place.
 *   3. Delete action soft-deletes the row so it disappears from the list.
 *
 * Auth: signs in as the configured Clerk test user (see
 * `tests/helpers/auth.ts`). State seeded by hitting the dev-only Convex
 * mutations `agent.threads.createTestThread` /
 * `agent.threads.deleteAllTestThreads` directly via `ConvexHttpClient`.
 */

const CONVEX_URL =
    process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";

test.describe("sidebar kebab + rename + delete (CROWDEV-352 verification)", () => {
    // Skip the entire suite (with a clear console message) when the required
    // env vars are missing. Lets `bun test:e2e` succeed in environments that
    // haven't yet provisioned the e2e Clerk credentials — useful for the
    // initial CROWDEV-353 PR where the test infra is being introduced
    // independently of the Clerk-test-user provisioning step.
    test.beforeAll(() => {
        if (!CONVEX_URL) {
            test.skip(
                true,
                "[sidebar spec] NEXT_PUBLIC_CONVEX_URL is not set. Configure apps/app/.env.local (local) or repo secrets (CI) per apps/app/tests/README.md.",
            );
        }
        if (!process.env.E2E_CLERK_USER_USERNAME || !process.env.E2E_CLERK_USER_PASSWORD) {
            test.skip(
                true,
                "[sidebar spec] E2E_CLERK_USER_USERNAME / E2E_CLERK_USER_PASSWORD not configured. Provision a Clerk dev test user and add credentials per apps/app/tests/README.md.",
            );
        }
    });

    test.beforeEach(async ({ page }) => {
        await signInAndGoHome(page);
        await seedTestThreads({
            page,
            convexUrl: CONVEX_URL,
            titles: ["Kebab spec one", "Kebab spec two"],
        });
        // Convex sidebar query is reactive; reload to make sure the freshly
        // seeded rows show up before the spec interacts with them. We reload
        // (vs. waiting for the existing query to refetch) so the test stays
        // independent of any background polling cadence.
        await page.reload();
        await expect(page.locator('[data-test="sidebar-thread-row"]')).toHaveCount(
            2,
            { timeout: 15_000 },
        );
    });

    test.afterEach(async ({ page }) => {
        // Best-effort cleanup so a flaky test doesn't leave rows behind for
        // the next run. Swallowed because the seed-side cleanup also fires.
        try {
            await cleanupTestThreads({ page, convexUrl: CONVEX_URL });
        } catch {
            // ignore
        }
    });

    test("hover row → click kebab → exactly one dropdown is visible", async ({ page }) => {
        const firstRow = page.locator('[data-test="sidebar-thread-row"]').first();
        await firstRow.hover();

        const kebab = firstRow.locator('[data-test="sidebar-thread-kebab"]');
        await kebab.click();

        // The core CROWDEV-352 assertion: exactly one menu in the document.
        await expect(page.locator('[role="menu"]')).toHaveCount(1);
        // And it's visible — guards against the menu being mounted but
        // display:none somewhere off-screen.
        await expect(page.locator('[role="menu"]')).toBeVisible();
    });

    test("rename action updates the sidebar row title", async ({ page }) => {
        const row = page.locator('[data-test="sidebar-thread-row"]').first();
        const oldTitle = await row.locator('[data-test="sidebar-thread-title"]').innerText();

        await row.hover();
        await row.locator('[data-test="sidebar-thread-kebab"]').click();
        await page.getByRole("menuitem", { name: /rename/i }).click();

        // The inline rename form replaces the link with a textfield.
        const input = page.getByRole("textbox", { name: /rename conversation/i });
        await input.fill("Renamed by playwright");
        await input.press("Enter");

        // Same row index, new title.
        await expect(
            page.locator('[data-test="sidebar-thread-row"]').first().locator(
                '[data-test="sidebar-thread-title"]',
            ),
        ).toHaveText("Renamed by playwright", { timeout: 10_000 });
        // And no remaining sidebar row carries the old title — guards against
        // a partial render where the rename merged client + server state.
        await expect(
            page.locator(
                `[data-test="sidebar-thread-title"]:has-text("${oldTitle}")`,
            ),
        ).toHaveCount(0);
    });

    test("delete action removes the row from the sidebar", async ({ page }) => {
        // Operate on the second row so the active-thread redirect doesn't
        // fight us (none of these are routed at /threadId because we land at /).
        const rows = page.locator('[data-test="sidebar-thread-row"]');
        await expect(rows).toHaveCount(2);
        const targetRow = rows.nth(1);
        const targetTitle = await targetRow.locator('[data-test="sidebar-thread-title"]').innerText();

        await targetRow.hover();
        await targetRow.locator('[data-test="sidebar-thread-kebab"]').click();
        await page.getByRole("menuitem", { name: /delete/i }).click();

        // Confirmation modal — Modal/Dialog primitives use role=dialog.
        await page.getByRole("button", { name: /^delete$/i }).click();

        await expect(rows).toHaveCount(1, { timeout: 10_000 });
        await expect(
            page.locator(
                `[data-test="sidebar-thread-title"]:has-text("${targetTitle}")`,
            ),
        ).toHaveCount(0);
    });
});

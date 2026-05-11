import { expect, test } from "@playwright/test";
import { signInAndGoHome } from "./helpers/auth";
import { cleanupTestThreads, seedTestThreads } from "./helpers/seed-thread";

/**
 * Verifies the sidebar kebab menu fix from CROWDEV-352:
 *
 *   1. Hover a sidebar row → click its kebab → exactly ONE *visible*
 *      `[role="menu"]` is present. Before the fix, both the desktop and the
 *      (portaled) mobile-sidebar menu rendered simultaneously due to lifted
 *      state.
 *   2. Rename action updates the sidebar row's title in place.
 *   3. Delete action soft-deletes the row so it disappears from the list.
 *
 * Auth: signs in as the configured Clerk test user (see
 * `tests/helpers/auth.ts`). State seeded by hitting the dev-only Convex
 * mutations `agent.threads.createTestThread` /
 * `agent.threads.deleteAllTestThreads` directly via `ConvexHttpClient`.
 *
 * All sidebar locators are scoped to `:visible` — the desktop and mobile
 * sidebars in `dashboard-sidebar.tsx` both render the same DOM (gated only
 * by responsive `hidden`/`lg:hidden`), so unfiltered counts would double.
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
        if (!process.env.E2E_CLERK_USER_USERNAME) {
            test.skip(
                true,
                "[sidebar spec] E2E_CLERK_USER_USERNAME is not set. Provision a Clerk dev test user and add the credential per apps/app/tests/README.md.",
            );
        }
        if (!process.env.CLERK_SECRET_KEY && !process.env.E2E_CLERK_USER_PASSWORD) {
            test.skip(
                true,
                "[sidebar spec] Neither CLERK_SECRET_KEY (preferred ticket flow) nor E2E_CLERK_USER_PASSWORD (fallback password flow) is set. Provide at least one per apps/app/tests/README.md.",
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
        // `dashboard-sidebar.tsx` renders two `ChatHistoryItem` trees per
        // thread (desktop + mobile, gated by responsive `hidden`/`lg:hidden`).
        // At the Playwright Desktop Chrome viewport (1280×720) one of the
        // trees is CSS-hidden but still in the DOM, so an unfiltered
        // `toHaveCount(2)` resolves to 4. Scope to visible rows.
        await expect(page.locator('[data-test="sidebar-thread-row"]:visible')).toHaveCount(
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
        const firstRow = page.locator('[data-test="sidebar-thread-row"]:visible').first();
        await firstRow.hover();

        const kebab = firstRow.locator('[data-test="sidebar-thread-kebab"]');
        await kebab.click();

        // The core CROWDEV-352 assertion: exactly one *visible* menu in the
        // document. React Aria portals the popover to body, so a second
        // (CSS-hidden) menu can still be in the DOM if the duplicate-render
        // bug regresses — filter to visible so the assertion catches a
        // _visually_ duplicated dropdown rather than the DOM duplication
        // (which is the intentional desktop+mobile split — see comments in
        // `dashboard-sidebar.tsx`).
        await expect(page.locator('[role="menu"]:visible')).toHaveCount(1);
        // Redundant but cheap — guards against display:none variations the
        // `:visible` filter doesn't catch (e.g. zero-height containers).
        await expect(page.locator('[role="menu"]:visible')).toBeVisible();
    });

    test("rename action updates the sidebar row title", async ({ page }) => {
        // Scope all selectors to `:visible` — see comment in `beforeEach`
        // about the desktop+mobile dual-render in `dashboard-sidebar.tsx`.
        const row = page.locator('[data-test="sidebar-thread-row"]:visible').first();
        const oldTitle = await row.locator('[data-test="sidebar-thread-title"]').innerText();

        await row.hover();
        await row.locator('[data-test="sidebar-thread-kebab"]').click();
        // Dropdown items have `role="menuitemradio"` (not `menuitem`) because
        // the underlying `react-aria-components` `<Menu>` has
        // `selectionMode="single"` — see `packages/ui/.../dropdown.tsx:99`.
        await page.getByRole("menuitemradio", { name: /rename/i }).click();

        // The inline rename form replaces the link with a textfield.
        const input = page.getByRole("textbox", { name: /rename conversation/i });
        await input.fill("Renamed by playwright");
        await input.press("Enter");

        // Same row index, new title.
        await expect(
            page.locator('[data-test="sidebar-thread-row"]:visible').first().locator(
                '[data-test="sidebar-thread-title"]',
            ),
        ).toHaveText("Renamed by playwright", { timeout: 10_000 });
        // And no remaining sidebar row carries the old title — guards against
        // a partial render where the rename merged client + server state.
        await expect(
            page.locator(
                `[data-test="sidebar-thread-title"]:visible:has-text("${oldTitle}")`,
            ),
        ).toHaveCount(0);
    });

    test("delete action removes the row from the sidebar", async ({ page }) => {
        // Operate on the second row so the active-thread redirect doesn't
        // fight us (none of these are routed at /threadId because we land at /).
        // Scope to `:visible` — see `beforeEach` comment about the
        // desktop+mobile dual-render in `dashboard-sidebar.tsx`.
        const rows = page.locator('[data-test="sidebar-thread-row"]:visible');
        await expect(rows).toHaveCount(2);
        const targetRow = rows.nth(1);
        const targetTitle = await targetRow.locator('[data-test="sidebar-thread-title"]').innerText();

        await targetRow.hover();
        await targetRow.locator('[data-test="sidebar-thread-kebab"]').click();
        // Items use `role="menuitemradio"` due to `selectionMode="single"` —
        // see comment in the rename test.
        await page.getByRole("menuitemradio", { name: /delete/i }).click();

        // Confirmation modal — Modal/Dialog primitives use role=dialog.
        await page.getByRole("button", { name: /^delete$/i }).click();

        await expect(rows).toHaveCount(1, { timeout: 10_000 });
        await expect(
            page.locator(
                `[data-test="sidebar-thread-title"]:visible:has-text("${targetTitle}")`,
            ),
        ).toHaveCount(0);
    });
});

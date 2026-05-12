import { expect, test } from "@playwright/test";
import type { Id } from "@convex/_generated/dataModel";
import { signInAndGoHome } from "./helpers/auth";
import {
  cleanupTestWalletsByPrefix,
  removeTestWallet,
  seedTestWallet,
} from "./helpers/wallets";

/**
 * Baseline regression spec for the /wallets page (CROWDEV-434, parent CROWDEV-420).
 *
 * This test runs against the **pre-refactor** `WalletCard.tsx` to lock in
 * the current behavior before extracting shared hooks. After Task 8 of the
 * Prep PR (hook extraction), this spec must still pass — that's how we
 * verify the refactor is behavior-preserving.
 *
 * Tested behaviors (matches the 6 listed in the plan):
 *   1. Rendering — wallet name, card-count line, pin indicator
 *   2. Drag handle becomes visible on hover (opacity-0 → group-hover:opacity-100)
 *   3. Dropdown menu opens with Rename, Pin/Unpin, Delete items
 *   4. Inline rename saves on Enter
 *   5. Clicking the card navigates to /credit-cards?wallet=<id>
 *   6. Extended-view toggle reveals stats (Total Balance / Credit Limit /
 *      Available / Utilization)
 *
 * Adjustments from the plan's draft (to match the actual DOM/a11y of the
 * current code):
 *   - The dropdown trigger button's accessible name is "Open menu", not
 *     "options" — see `Dropdown.DotsButton` in
 *     `packages/ui/src/components/untitledui/base/dropdown/dropdown.tsx`.
 *   - Menu items use `role="menuitemradio"` (NOT `menuitem`) because the
 *     wrapped `<Menu>` has `selectionMode="single"` — same pattern as
 *     `sidebar-rename-delete.spec.ts`.
 *   - The Details toggle is a `react-aria-components` `<Switch>` with no
 *     aria-label; its visible "Details" label is a sibling `<span>`. We
 *     target it as the lone `role="switch"` on the page rather than by
 *     accessible name.
 *
 * Seeding strategy: each test creates its own wallets named with the
 * `BaselineTestWallet-` prefix, tracks their ids, and removes them in
 * `afterEach`. `beforeEach` also sweeps any leftover prefixed wallets from
 * a prior crashed run (no dev-only bulk-delete mutation exists for wallets
 * today — see `tests/helpers/wallets.ts`).
 */

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";

const WALLET_NAME_PREFIX = "BaselineTestWallet-";

test.describe("Wallets page baseline (CROWDEV-420 prep)", () => {
  let createdWalletIds: Id<"wallets">[] = [];

  // Same env-var skip pattern as sidebar-rename-delete.spec.ts so the
  // suite stays runnable on machines that haven't provisioned the e2e
  // Clerk credentials yet.
  test.beforeAll(() => {
    if (!CONVEX_URL) {
      test.skip(
        true,
        "[wallets baseline] NEXT_PUBLIC_CONVEX_URL is not set. Configure apps/app/.env.local per apps/app/tests/README.md.",
      );
    }
    if (!process.env.E2E_CLERK_USER_USERNAME) {
      test.skip(
        true,
        "[wallets baseline] E2E_CLERK_USER_USERNAME is not set. Provision a Clerk dev test user per apps/app/tests/README.md.",
      );
    }
    if (
      !process.env.CLERK_SECRET_KEY &&
      !process.env.E2E_CLERK_USER_PASSWORD
    ) {
      test.skip(
        true,
        "[wallets baseline] Neither CLERK_SECRET_KEY nor E2E_CLERK_USER_PASSWORD is set.",
      );
    }
  });

  test.beforeEach(async ({ page }) => {
    // Sign in AND navigate to `/` — same flow as sidebar-rename-delete.
    // The post-home navigation matters here for two reasons:
    //   1. `(app)/layout.tsx` runs `ensureCurrentUser` on mount, creating
    //      the Convex `users` row for the signed-in Clerk identity if it
    //      doesn't exist yet. Without this row `viewerX()` throws and the
    //      seed mutations fail with "Authentication required".
    //   2. It seeds the in-memory Convex client cache against the same
    //      auth identity the seed http-client below uses, reducing the
    //      odds of a stale-query race when we navigate to /wallets.
    await signInAndGoHome(page);

    // Sweep any leftover seed rows from a prior crashed run before we
    // create the per-test fixtures. Same Clerk user, so this only touches
    // rows we own.
    await cleanupTestWalletsByPrefix({
      page,
      convexUrl: CONVEX_URL,
      namePrefix: WALLET_NAME_PREFIX,
    });

    // Seed exactly two wallets per test:
    //   - First wallet pinned so we can assert the Pin01 indicator.
    //   - Second wallet unpinned so the dropdown's "Pin to Sidebar" /
    //     "Unpin from Sidebar" toggle still appears.
    // We seed first-pinned-second-unpinned, but `wallets.queries.list`
    // returns by `sortOrder` (insertion order, not pin status). The first
    // card in the grid will therefore be the first-created pinned wallet.
    const pinnedId = await seedTestWallet({
      page,
      convexUrl: CONVEX_URL,
      name: `${WALLET_NAME_PREFIX}Pinned`,
      pinAfterCreate: true,
    });
    const unpinnedId = await seedTestWallet({
      page,
      convexUrl: CONVEX_URL,
      name: `${WALLET_NAME_PREFIX}Plain`,
    });
    createdWalletIds = [pinnedId, unpinnedId];
  });

  test.afterEach(async ({ page }) => {
    // Remove every wallet this test created. We track ids explicitly
    // (rather than re-running cleanup-by-prefix) so a test that renames a
    // seeded wallet to drop the prefix still gets its row cleaned up.
    for (const walletId of createdWalletIds) {
      await removeTestWallet({ page, convexUrl: CONVEX_URL, walletId });
    }
    createdWalletIds = [];
  });

  test("renders wallet cards with name, count, and pin indicator", async ({
    page,
  }) => {
    await page.goto("/wallets");

    await expect(
      page.getByRole("heading", { name: /wallets/i }),
    ).toBeVisible({ timeout: 30_000 });

    // Both seeded wallets should be in the grid. The grid contains the
    // user's pre-existing wallets too, so we filter by the seed prefix
    // rather than asserting a fixed count.
    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    const unpinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Plain` });

    await expect(pinnedCard).toHaveCount(1, { timeout: 15_000 });
    await expect(unpinnedCard).toHaveCount(1);

    // Card-count line: freshly-created wallets have zero cards. Use
    // `getByText` scoped to the card so we get the exact "0 cards" line
    // even if the page already contains the literal "0 cards" elsewhere.
    await expect(pinnedCard.getByText(/0 cards/i)).toBeVisible();
    await expect(unpinnedCard.getByText(/0 cards/i)).toBeVisible();

    // Pin01 indicator: the rendered icon is an SVG with no accessible
    // name (Pin01 from `@untitledui/icons` renders <svg aria-hidden>), so
    // the cleanest distinction between pinned and unpinned cards is the
    // presence of an `<svg>` immediately following the wallet-name `<h3>`
    // inside the name container. Use CSS adjacent-sibling combinator
    // (`h3 + svg`) — same result as the XPath sibling axis but resolves
    // faster and more reliably under Playwright's locator engine.
    await expect(pinnedCard.locator("h3 + svg")).toHaveCount(1, {
      timeout: 15_000,
    });
    await expect(unpinnedCard.locator("h3 + svg")).toHaveCount(0);
  });

  test("drag handle becomes visible on hover", async ({ page }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    await expect(pinnedCard).toHaveCount(1, { timeout: 15_000 });

    // The drag handle lives in `SortableWalletCard` (the wrapper around
    // `WalletCard`), so it's a SIBLING of the `data-testid="wallet-card"`
    // div, not a descendant. Walk up one level (`xpath=..`) to the
    // sortable wrapper, then grab the labelled handle inside it.
    const sortableWrapper = pinnedCard.locator("xpath=..");
    const dragHandle = sortableWrapper.getByLabel("Drag to reorder");

    // Before hover: the handle is `opacity-0` but has non-zero
    // dimensions, so Playwright's `toBeVisible()` treats it as visible
    // (the engine only considers display/visibility/dimensions, not
    // CSS opacity). Lock in the opacity-based fade by asserting the CSS
    // value directly. The hover transition flips it to `1`.
    await expect(dragHandle).toBeAttached();
    await expect(dragHandle).toHaveCSS("opacity", "0");

    await pinnedCard.hover();
    await expect(dragHandle).toHaveCSS("opacity", "1");
    await expect(dragHandle).toBeVisible();
  });

  test("dropdown menu opens with Rename, Pin, Delete", async ({ page }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    await expect(pinnedCard).toHaveCount(1, { timeout: 15_000 });
    await pinnedCard.hover();

    // The DotsButton has `aria-label="Open menu"`. Scope to the hovered
    // card so we don't grab the button on a different wallet that may
    // already exist on this test user's account.
    await pinnedCard.getByRole("button", { name: "Open menu" }).click();

    // Menu items are `role="menuitemradio"` because `Dropdown.Menu` sets
    // `selectionMode="single"`. The Popover is portaled, so query
    // page-wide rather than scoping to the card.
    await expect(
      page.getByRole("menuitemradio", { name: /rename/i }),
    ).toBeVisible();
    // The pinned wallet shows "Unpin from Sidebar"; matching `pin|unpin`
    // works for either state.
    await expect(
      page.getByRole("menuitemradio", { name: /unpin from sidebar/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitemradio", { name: /delete/i }),
    ).toBeVisible();
  });

  test("inline rename saves on Enter", async ({ page }) => {
    await page.goto("/wallets");

    const originalName = `${WALLET_NAME_PREFIX}Plain`;
    const renamedName = `${WALLET_NAME_PREFIX}Renamed`;

    const card = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: originalName });
    await expect(card).toHaveCount(1, { timeout: 15_000 });

    await card.hover();
    await card.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitemradio", { name: /rename/i }).click();

    // After clicking Rename the card's `<h3>` is replaced by an `<input
    // type="text">`. We can't keep filtering the card by
    // `hasText: originalName` — Playwright's `hasText` reads visible text
    // content, not input `value` attributes, so the card filter drops to
    // zero matches the moment the input appears.
    //
    // Instead, locate the single rename input page-wide: only one wallet
    // can be in rename mode at a time, so an input inside any wallet
    // card is the right one. The Convex mutation re-renders the card
    // afterwards.
    const input = page.locator(
      '[data-testid="wallet-card"] input[type="text"]',
    );
    await expect(input).toBeVisible();
    await expect(input).toHaveValue(originalName);
    await input.fill(renamedName);
    await input.press("Enter");

    // The Convex mutation fires and the reactive query re-renders the
    // card with the new name in the `<h3>`. Confirm by name match.
    await expect(
      page
        .locator('[data-testid="wallet-card"]')
        .filter({ hasText: renamedName }),
    ).toHaveCount(1, { timeout: 10_000 });
    await expect(
      page
        .locator('[data-testid="wallet-card"]')
        .filter({ hasText: originalName }),
    ).toHaveCount(0);
  });

  test("clicking card navigates to credit-cards with wallet filter", async ({
    page,
  }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    await expect(pinnedCard).toHaveCount(1, { timeout: 15_000 });

    await pinnedCard.click();
    await expect(page).toHaveURL(/\/credit-cards\?wallet=/);
  });

  test("extended-view toggle reveals stats on each card", async ({ page }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    await expect(pinnedCard).toHaveCount(1, { timeout: 15_000 });

    // Before toggling: the stats grid shouldn't be present. We rely on
    // the labels "Total Balance" / "Credit Limit" being absent.
    await expect(pinnedCard.getByText(/total balance/i)).toHaveCount(0);

    // The Details toggle is the only `role="switch"` on /wallets. It has
    // no accessible name (it's a `<Switch>` from `react-aria-components`
    // with a sibling "Details" `<span>`), so we target it by role
    // directly.
    //
    // The `<input role="switch">` element is wrapped in a styled
    // `<label data-rac>` that intercepts pointer events for visual
    // chrome reasons — Playwright's normal click hit-tests fail. Clicking
    // the wrapping label is the user-equivalent interaction, so target
    // the label directly (the only `react-aria-pressable` label on the
    // page).
    const detailsToggle = page.getByRole("switch");
    await expect(detailsToggle).toHaveCount(1);
    const toggleLabel = page.locator(
      'label[data-react-aria-pressable="true"]',
    );
    await expect(toggleLabel).toHaveCount(1);
    await toggleLabel.click();

    // After enabling extended view, each card's stats grid should
    // render the four labels. Scope to a single card to keep the
    // assertion specific.
    await expect(pinnedCard.getByText(/total balance/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(pinnedCard.getByText(/credit limit/i)).toBeVisible();
    await expect(pinnedCard.getByText(/available/i)).toBeVisible();
    await expect(pinnedCard.getByText(/utilization/i)).toBeVisible();
  });
});

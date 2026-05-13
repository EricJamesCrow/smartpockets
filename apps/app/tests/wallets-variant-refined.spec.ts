import { expect, test } from "@playwright/test";
import type { Id } from "@convex/_generated/dataModel";
import { signInAndGoHome } from "./helpers/auth";
import {
  cleanupTestWalletsByPrefix,
  removeTestWallet,
  seedTestWallet,
} from "./helpers/wallets";

/**
 * Smoke test for Variant B — Refined Materiality (CROWDEV-443, parent
 * CROWDEV-420).
 *
 * Covers all 9 must-keep features from the variant spec when the
 * `/wallets` page is wired to `variants/refined/SortableWalletCard`:
 *
 *   1. Card renders with `data-variant="refined"` attribute
 *   2. Wallet name + card-count line visible
 *   3. Pin indicator (Pin01 svg after the wallet's `<h3>`) for pinned wallets
 *   4. Dropdown menu opens with Rename / Pin / Delete items
 *   5. Drag handle (hairline grip) becomes visible on hover (opacity 0 → 1)
 *   6. Extended-view toggle reveals the four stat labels
 *   7. Clicking the card navigates to `/credit-cards?wallet=<id>`
 *   8. Inline rename saves on Enter
 *   9. Empty wallet (0 cards) shows the dashed champagne slot with "Add a card"
 *
 * Selectors / a11y notes (matches the conventions established in
 * `wallets-baseline.spec.ts`):
 *
 *   - The dropdown trigger's accessible name is "Open menu". The variant's
 *     `<Dropdown.DotsButton aria-label="Options">` is *overridden* by the
 *     hardcoded `aria-label="Open menu"` inside `DropdownDotsButton`
 *     (JSX attribute order — the hardcoded one wins after props spread).
 *   - Menu items have `role="menuitemradio"` (NOT `menuitem`) because
 *     `Dropdown.Menu` sets `selectionMode="single"`.
 *   - The Details toggle is a `react-aria-components` `<Switch>` with no
 *     aria-label; we click the wrapping `<label data-react-aria-pressable>`.
 *   - The drag handle is `opacity-0` by default and transitions to
 *     `opacity-1` on hover. Playwright's `toBeVisible()` ignores CSS
 *     `opacity`, so we lock the opacity transition with `toHaveCSS`.
 *
 * Seeding strategy mirrors `wallets-baseline.spec.ts`:
 *   - Sign in via `signInAndGoHome` so the Convex `users` row exists
 *     (`(app)/layout.tsx`'s `ensureCurrentUser` runs on `/`).
 *   - `cleanupTestWalletsByPrefix` sweeps leftover rows from a prior
 *     crashed run before seeding.
 *   - Two wallets per test: one pinned (`RefinedTest-Pinned`) so the pin
 *     indicator + ribbon can be asserted, one unpinned (`RefinedTest-Plain`)
 *     so the dropdown toggle still has both "Pin / Unpin" labels available.
 */

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";

const WALLET_NAME_PREFIX = "RefinedTest-";

test.describe("Wallets variant B — Refined Materiality (CROWDEV-443)", () => {
  let createdWalletIds: Id<"wallets">[] = [];

  // Same env-var skip pattern as the baseline + sidebar specs so the suite
  // stays runnable on machines that haven't provisioned the e2e Clerk
  // credentials yet.
  test.beforeAll(() => {
    if (!CONVEX_URL) {
      test.skip(
        true,
        "[wallets refined] NEXT_PUBLIC_CONVEX_URL is not set. Configure apps/app/.env.local per apps/app/tests/README.md.",
      );
    }
    if (!process.env.E2E_CLERK_USER_USERNAME) {
      test.skip(
        true,
        "[wallets refined] E2E_CLERK_USER_USERNAME is not set. Provision a Clerk dev test user per apps/app/tests/README.md.",
      );
    }
    if (
      !process.env.CLERK_SECRET_KEY &&
      !process.env.E2E_CLERK_USER_PASSWORD
    ) {
      test.skip(
        true,
        "[wallets refined] Neither CLERK_SECRET_KEY nor E2E_CLERK_USER_PASSWORD is set.",
      );
    }
  });

  test.beforeEach(async ({ page }) => {
    // Sign in AND navigate to `/` first — `(app)/layout.tsx` runs
    // `ensureCurrentUser` on mount, creating the Convex `users` row for
    // the signed-in Clerk identity. Without it `viewerX()` throws and the
    // seed mutations below fail with "Authentication required".
    await signInAndGoHome(page);

    // Sweep any leftover seed rows from a prior crashed run. Scoped to
    // the prefix so we never touch wallets owned by other specs / the
    // developer's manual data.
    await cleanupTestWalletsByPrefix({
      page,
      convexUrl: CONVEX_URL,
      namePrefix: WALLET_NAME_PREFIX,
    });

    // Seed two wallets:
    //   - `Pinned`  — pinned, exercises the pin indicator + ribbon
    //   - `Plain`   — unpinned, gives the dropdown's "Pin to Sidebar"
    //                 label something to match against
    // Both wallets have zero cards so the empty-state ("Add a card")
    // assertion is also exercised by the first test that opens the page.
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
    // Track ids explicitly so even tests that rename the seeded wallet
    // (dropping the prefix) still get the row cleaned up.
    for (const walletId of createdWalletIds) {
      await removeTestWallet({ page, convexUrl: CONVEX_URL, walletId });
    }
    createdWalletIds = [];
  });

  test("card renders with data-variant='refined' attribute", async ({
    page,
  }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    await expect(pinnedCard).toHaveCount(1, { timeout: 30_000 });
    await expect(pinnedCard).toHaveAttribute("data-variant", "refined");
  });

  test("displays wallet name and card count", async ({ page }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    const unpinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Plain` });

    await expect(pinnedCard).toHaveCount(1, { timeout: 15_000 });
    await expect(unpinnedCard).toHaveCount(1);

    // Freshly-seeded wallets have zero cards. Scope the text query to the
    // card so we don't grab a stray "0 cards" elsewhere on the page.
    await expect(pinnedCard.getByText(/0 cards/i)).toBeVisible();
    await expect(unpinnedCard.getByText(/0 cards/i)).toBeVisible();
  });

  test("pin indicator shows for pinned wallets", async ({ page }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    const unpinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Plain` });

    await expect(pinnedCard).toHaveCount(1, { timeout: 15_000 });

    // Pin01 SVG is rendered immediately after the wallet's `<h3>` heading.
    // The icon is aria-hidden, so we identify it via the `h3 + svg` CSS
    // adjacent-sibling combinator — same approach as the baseline spec.
    await expect(pinnedCard.locator("h3 + svg")).toHaveCount(1);
    await expect(unpinnedCard.locator("h3 + svg")).toHaveCount(0);

    // The card-count line on a pinned wallet also gets the " · pinned"
    // suffix — assert it scoped to the pinned card so we don't match a
    // stale piece of UI elsewhere.
    await expect(pinnedCard.getByText(/· pinned/i)).toBeVisible();
  });

  test("dropdown menu opens with Rename / Pin / Delete", async ({ page }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    await expect(pinnedCard).toHaveCount(1, { timeout: 15_000 });
    await pinnedCard.hover();

    // DotsButton's accessible name is "Open menu" — the
    // `aria-label="Options"` passed by the variant is overridden by the
    // hardcoded attribute on `DropdownDotsButton` in `@repo/ui`.
    await pinnedCard.getByRole("button", { name: "Open menu" }).click();

    // Items use `role="menuitemradio"` because `Dropdown.Menu` sets
    // `selectionMode="single"`. Popover is portaled — query page-wide.
    await expect(
      page.getByRole("menuitemradio", { name: /rename/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitemradio", { name: /unpin from sidebar/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitemradio", { name: /delete/i }),
    ).toBeVisible();
  });

  test("drag handle becomes visible on hover", async ({ page }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    await expect(pinnedCard).toHaveCount(1, { timeout: 15_000 });

    // The drag handle lives in `SortableWalletCard`, so it's a sibling of
    // the `[data-testid="wallet-card"]` div — walk up one level to the
    // wrapper, then grab the labelled handle.
    const sortableWrapper = pinnedCard.locator("xpath=..");
    const dragHandle = sortableWrapper.getByLabel("Drag to reorder");

    // Before hover: handle is `opacity-0` but has non-zero dimensions, so
    // Playwright's `toBeVisible()` (display/visibility/dimensions only,
    // ignores opacity) returns true. Lock the opacity-based fade with a
    // direct CSS assertion.
    await expect(dragHandle).toBeAttached();
    await expect(dragHandle).toHaveCSS("opacity", "0");

    await pinnedCard.hover();
    await expect(dragHandle).toHaveCSS("opacity", "1");
    await expect(dragHandle).toBeVisible();
  });

  test("extended-view toggle reveals stats", async ({ page }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    await expect(pinnedCard).toHaveCount(1, { timeout: 15_000 });

    // Stats aren't rendered before the toggle.
    await expect(pinnedCard.getByText(/total balance/i)).toHaveCount(0);

    // The Details toggle is the only `role="switch"` on /wallets. The
    // `<input role="switch">` is wrapped in a styled `<label data-rac>`
    // that intercepts pointer events, so we click the wrapping label
    // (the only `react-aria-pressable` label on the page).
    const detailsToggle = page.getByRole("switch");
    await expect(detailsToggle).toHaveCount(1);
    const toggleLabel = page.locator(
      'label[data-react-aria-pressable="true"]',
    );
    await expect(toggleLabel).toHaveCount(1);
    await toggleLabel.click();

    // After enabling extended view, each card renders the four stat
    // labels inside its `ExtendedStats` panel.
    await expect(pinnedCard.getByText(/total balance/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(pinnedCard.getByText(/credit limit/i)).toBeVisible();
    await expect(pinnedCard.getByText(/available/i)).toBeVisible();
    await expect(pinnedCard.getByText(/utilization/i)).toBeVisible();
  });

  test("clicking card navigates to /credit-cards with wallet filter", async ({
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
    // type="text">`. `hasText` reads visible text, not input `value`, so
    // filtering by `originalName` drops to zero matches once the input
    // appears. Locate the rename input page-wide instead: only one wallet
    // can be in rename mode at a time.
    const input = page.locator(
      '[data-testid="wallet-card"] input[type="text"]',
    );
    await expect(input).toBeVisible();
    await expect(input).toHaveValue(originalName);
    await input.fill(renamedName);
    await input.press("Enter");

    // Convex mutation re-renders the card with the new name in the `<h3>`.
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

  test("empty wallet shows 'Add a card' affordance in the champagne slot", async ({
    page,
  }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    await expect(pinnedCard).toHaveCount(1, { timeout: 15_000 });

    // The freshly-seeded wallet has zero cards, so `MiniCardPreview`
    // renders the empty-state branch with the italic "Add a card" copy
    // inside the dashed champagne slot.
    await expect(pinnedCard.getByText(/add a card/i)).toBeVisible();
  });
});

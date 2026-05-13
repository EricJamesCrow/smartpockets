import { expect, test } from "@playwright/test";
import type { Id } from "@convex/_generated/dataModel";
import { signInAndGoHome } from "./helpers/auth";
import {
  cleanupTestWalletsByPrefix,
  removeTestWallet,
  seedTestWallet,
} from "./helpers/wallets";

/**
 * Smoke test for Variant D — Architectural Glass (CROWDEV-445, parent
 * CROWDEV-420).
 *
 * Covers all 9 must-keep features from the variant spec when the
 * `/wallets` page is wired to `variants/glass/SortableWalletCard`:
 *
 *   1. Card renders with `data-variant="glass"` attribute
 *   2. Wallet name + card-count line visible
 *   3. Pin indicator (Pin01 svg after the wallet's `<h3>`) + moss glow dot
 *      for pinned wallets
 *   4. Dropdown menu opens with Rename / Pin / Delete items
 *   5. Drag handle (semi-transparent gradient grip) becomes visible on
 *      hover (opacity 0 → 1)
 *   6. Extended-view toggle reveals the four stat labels
 *   7. Clicking the card navigates to `/credit-cards?wallet=<id>`
 *   8. Inline rename saves on Enter
 *   9. Empty wallet (0 cards) shows the "Add a card" affordance
 *
 * Selectors / a11y notes (same conventions as the refined variant spec):
 *
 *   - The dropdown trigger's accessible name is "Open menu" (hardcoded
 *     in `DropdownDotsButton`, overrides our passed `aria-label="Options"`).
 *   - Menu items are `role="menuitemradio"` because `Dropdown.Menu` sets
 *     `selectionMode="single"`.
 *   - The Details toggle is the only `role="switch"` on the page; we
 *     click the wrapping `<label data-react-aria-pressable="true">`.
 *   - The drag handle is `opacity-0` by default; we assert the CSS
 *     opacity transition rather than relying on `toBeVisible()` (which
 *     ignores opacity).
 *
 * Cross-browser note: Variant D upgrades the active hovered card to
 * `liquid-glass-react` (true `feDisplacementMap`) ONLY on Chromium.
 * Safari/Firefox fall back to the pure-CSS GlassCard. This smoke test
 * runs against Playwright's default chromium project and exercises the
 * Chromium gate via `useIsChromium`.
 */

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";

const WALLET_NAME_PREFIX = "GlassTest-";

test.describe("Wallets variant D — Architectural Glass (CROWDEV-445)", () => {
  let createdWalletIds: Id<"wallets">[] = [];

  test.beforeAll(() => {
    if (!CONVEX_URL) {
      test.skip(
        true,
        "[wallets glass] NEXT_PUBLIC_CONVEX_URL is not set. Configure apps/app/.env.local per apps/app/tests/README.md.",
      );
    }
    if (!process.env.E2E_CLERK_USER_USERNAME) {
      test.skip(
        true,
        "[wallets glass] E2E_CLERK_USER_USERNAME is not set. Provision a Clerk dev test user per apps/app/tests/README.md.",
      );
    }
    if (
      !process.env.CLERK_SECRET_KEY &&
      !process.env.E2E_CLERK_USER_PASSWORD
    ) {
      test.skip(
        true,
        "[wallets glass] Neither CLERK_SECRET_KEY nor E2E_CLERK_USER_PASSWORD is set.",
      );
    }
  });

  test.beforeEach(async ({ page }) => {
    await signInAndGoHome(page);

    await cleanupTestWalletsByPrefix({
      page,
      convexUrl: CONVEX_URL,
      namePrefix: WALLET_NAME_PREFIX,
    });

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
    for (const walletId of createdWalletIds) {
      await removeTestWallet({ page, convexUrl: CONVEX_URL, walletId });
    }
    createdWalletIds = [];
  });

  test("card renders with data-variant='glass' attribute", async ({
    page,
  }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    await expect(pinnedCard).toHaveCount(1, { timeout: 30_000 });
    await expect(pinnedCard).toHaveAttribute("data-variant", "glass");
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

    // Freshly-seeded wallets have zero cards. Scope to the card to avoid
    // grabbing a stray "0 cards" elsewhere on the page.
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

    // The Pin01 svg sits immediately after the wallet's `<h3>` heading.
    // Use the adjacent-sibling combinator to identify it (same as the
    // refined variant spec).
    await expect(pinnedCard.locator("h3 + svg")).toHaveCount(1);
    await expect(unpinnedCard.locator("h3 + svg")).toHaveCount(0);

    // The card-count line on a pinned wallet has the " · pinned" suffix.
    await expect(pinnedCard.getByText(/· pinned/i)).toBeVisible();
  });

  test("dropdown menu opens with Rename / Pin / Delete", async ({ page }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    await expect(pinnedCard).toHaveCount(1, { timeout: 15_000 });
    await pinnedCard.hover();

    // DotsButton's accessible name is "Open menu" — hardcoded in
    // `DropdownDotsButton`, overrides the passed `aria-label="Options"`.
    await pinnedCard.getByRole("button", { name: "Open menu" }).click();

    // Items are `role="menuitemradio"` because Dropdown.Menu uses
    // selectionMode="single". Popover is portaled — query page-wide.
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

    // The drag handle lives in `SortableWalletCard`, sibling of the
    // `[data-testid="wallet-card"]` div — walk up one level to grab it.
    const sortableWrapper = pinnedCard.locator("xpath=..");
    const dragHandle = sortableWrapper.getByLabel("Drag to reorder");

    // Before hover: opacity-0. Playwright's toBeVisible() ignores opacity,
    // so assert the CSS-driven fade directly.
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

    // The Details toggle is the only `role="switch"` on /wallets. We
    // click the wrapping `<label data-react-aria-pressable>` because
    // the inner `<input role="switch">` is hidden behind the label.
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

    // After Rename the card's `<h3>` is replaced by an `<input
    // type="text">`. `hasText` reads visible text, not input value, so
    // filter by the input directly — only one wallet can be in rename
    // mode at a time.
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

  test("empty wallet shows 'Add a card' affordance", async ({ page }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    await expect(pinnedCard).toHaveCount(1, { timeout: 15_000 });

    // The seeded wallet has zero cards, so MiniCardPreview renders the
    // empty-state branch with the italic "Add a card" copy.
    await expect(pinnedCard.getByText(/add a card/i)).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";
import type { Id } from "@convex/_generated/dataModel";
import { signInAndGoHome } from "./helpers/auth";
import {
  cleanupTestWalletsByPrefix,
  removeTestWallet,
  seedTestWallet,
} from "./helpers/wallets";

/**
 * Smoke test for Variant A — Literal Leather (CROWDEV-446, parent
 * CROWDEV-420).
 *
 * Covers the 9 must-keep features from the variant spec when the
 * `/wallets` page is wired to `variants/leather/SortableWalletCard`,
 * plus a static-asset check for `/wallet-textures/leather.png` so a
 * misplaced texture file or broken build never silently regresses the
 * leather chassis to a bare cognac gradient.
 *
 *   1. Card renders with `data-variant="leather"` attribute
 *   2. Wallet name + card-count line visible
 *   3. Pin indicator (Pin01 svg after the wallet's `<h3>`) for pinned wallets
 *   4. Dropdown menu opens with Rename / Pin / Delete items
 *   5. Drag handle (leather grip strip) becomes visible on hover
 *   6. Extended-view toggle reveals the four stat labels in the receipt panel
 *   7. Clicking the card navigates to `/credit-cards?wallet=<id>`
 *   8. Inline rename saves on Enter
 *   9. Empty wallet (0 cards) shows the dashed leather slot with "Empty wallet"
 *  10. `/wallet-textures/leather.png` is served with a 2xx response and PNG
 *      content-type — guard against the asset moving out from under us
 *
 * Selector / a11y conventions:
 *
 *   - Dropdown trigger's accessible name is "Open menu" (hardcoded in
 *     `DropdownDotsButton` — overrides the variant's `aria-label="Options"`).
 *   - Menu items use `role="menuitemradio"` because `Dropdown.Menu` sets
 *     `selectionMode="single"`.
 *   - Details toggle is a `react-aria` `<Switch>`; click the wrapping
 *     `<label data-react-aria-pressable>` rather than the inner switch.
 *   - Drag handle starts at `opacity-0`; lock the opacity transition with
 *     `toHaveCSS("opacity", "...")` since Playwright's `toBeVisible()`
 *     ignores opacity.
 */

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";

const WALLET_NAME_PREFIX = "LeatherTest-";

test.describe("Wallets variant A — Literal Leather (CROWDEV-446)", () => {
  let createdWalletIds: Id<"wallets">[] = [];

  test.beforeAll(() => {
    if (!CONVEX_URL) {
      test.skip(
        true,
        "[wallets leather] NEXT_PUBLIC_CONVEX_URL is not set. Configure apps/app/.env.local per apps/app/tests/README.md.",
      );
    }
    if (!process.env.E2E_CLERK_USER_USERNAME) {
      test.skip(
        true,
        "[wallets leather] E2E_CLERK_USER_USERNAME is not set. Provision a Clerk dev test user per apps/app/tests/README.md.",
      );
    }
    if (
      !process.env.CLERK_SECRET_KEY &&
      !process.env.E2E_CLERK_USER_PASSWORD
    ) {
      test.skip(
        true,
        "[wallets leather] Neither CLERK_SECRET_KEY nor E2E_CLERK_USER_PASSWORD is set.",
      );
    }
  });

  test.beforeEach(async ({ page }) => {
    // Sign in AND navigate to `/` first — `(app)/layout.tsx` runs
    // `ensureCurrentUser` on mount, creating the Convex `users` row for
    // the signed-in Clerk identity. Without it `viewerX()` throws and the
    // seed mutations below fail with "Authentication required".
    await signInAndGoHome(page);

    // Sweep any leftover seed rows from a prior crashed run.
    await cleanupTestWalletsByPrefix({
      page,
      convexUrl: CONVEX_URL,
      namePrefix: WALLET_NAME_PREFIX,
    });

    // Two wallets:
    //   - Pinned — exercises the pin foil + ribbon-suffix copy
    //   - Plain  — gives the dropdown the "Pin to Sidebar" label to match
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

  test("card renders with data-variant='leather' attribute", async ({
    page,
  }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    await expect(pinnedCard).toHaveCount(1, { timeout: 30_000 });
    await expect(pinnedCard).toHaveAttribute("data-variant", "leather");
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

    // Freshly-seeded wallets have zero cards.
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
    await expect(pinnedCard.locator("h3 + svg")).toHaveCount(1);
    await expect(unpinnedCard.locator("h3 + svg")).toHaveCount(0);

    // The card-count line on a pinned wallet gets the " · pinned" suffix.
    await expect(pinnedCard.getByText(/· pinned/i)).toBeVisible();
  });

  test("dropdown menu opens with Rename / Pin / Delete", async ({ page }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    await expect(pinnedCard).toHaveCount(1, { timeout: 15_000 });
    await pinnedCard.hover();

    // DotsButton accessible name = "Open menu" (hardcoded in @repo/ui
    // overrides the variant's `aria-label="Options"`).
    await pinnedCard.getByRole("button", { name: "Open menu" }).click();

    // Items use `role="menuitemradio"` (Dropdown.Menu selectionMode=single).
    // Popover is portaled — query page-wide.
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

    // Drag handle lives in `SortableWalletCard`, a sibling/parent of the
    // [data-testid="wallet-card"] div — walk up one level.
    const sortableWrapper = pinnedCard.locator("xpath=..");
    const dragHandle = sortableWrapper.getByLabel("Drag to reorder");

    await expect(dragHandle).toBeAttached();
    await expect(dragHandle).toHaveCSS("opacity", "0");

    await pinnedCard.hover();
    await expect(dragHandle).toHaveCSS("opacity", "1");
    await expect(dragHandle).toBeVisible();
  });

  test("extended-view toggle reveals receipt stats", async ({ page }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    await expect(pinnedCard).toHaveCount(1, { timeout: 15_000 });

    // Stats aren't rendered before the toggle.
    await expect(pinnedCard.getByText(/total balance/i)).toHaveCount(0);

    // Details toggle: `react-aria` Switch wrapped in a pressable label.
    const detailsToggle = page.getByRole("switch");
    await expect(detailsToggle).toHaveCount(1);
    const toggleLabel = page.locator(
      'label[data-react-aria-pressable="true"]',
    );
    await expect(toggleLabel).toHaveCount(1);
    await toggleLabel.click();

    // After enabling extended view, the parchment receipt renders the four
    // stat labels.
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

    // The `<h3>` is replaced by an `<input type="text">` in rename mode.
    // hasText reads visible text not input value, so locate the input
    // page-wide.
    const input = page.locator(
      '[data-testid="wallet-card"] input[type="text"]',
    );
    await expect(input).toBeVisible();
    await expect(input).toHaveValue(originalName);
    await input.fill(renamedName);
    await input.press("Enter");

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

  test("empty wallet shows 'Empty wallet' affordance on bare leather", async ({
    page,
  }) => {
    await page.goto("/wallets");

    const pinnedCard = page
      .locator('[data-testid="wallet-card"]')
      .filter({ hasText: `${WALLET_NAME_PREFIX}Pinned` });
    await expect(pinnedCard).toHaveCount(1, { timeout: 15_000 });

    // Seeded wallets have zero cards → MiniCardPreview renders the
    // empty-state branch with debossed Fraunces "Empty wallet" copy.
    await expect(pinnedCard.getByText(/empty wallet/i)).toBeVisible();
  });

  test("leather.png texture asset is reachable", async ({ page }) => {
    // Probe the static asset directly through the running dev server so a
    // misplaced file or a regressed Next public/ pipeline gets caught at
    // CI time instead of in a visual review later.
    const response = await page.request.get("/wallet-textures/leather.png");
    expect(response.status(), "leather.png must return 2xx").toBeLessThan(
      300,
    );
    expect(
      response.headers()["content-type"],
      "leather.png must be served as image/png",
    ).toContain("image/png");
    const body = await response.body();
    expect(
      body.length,
      "leather.png body should be a non-trivial PNG (>2KB)",
    ).toBeGreaterThan(2 * 1024);
  });
});

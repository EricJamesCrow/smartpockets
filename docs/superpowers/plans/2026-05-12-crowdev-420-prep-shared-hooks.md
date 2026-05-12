# CROWDEV-420 — Prep: Extract Shared WalletCard Hooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract non-visual logic from `apps/app/src/components/wallets/WalletCard.tsx` into shared hooks so that 5 upcoming variant branches can each fork the visual layer without forking the data/mutations/drag logic.

**Architecture:** Move Convex query/mutation calls, drag-sortable setup, brand-color map, and shared TypeScript types into `apps/app/src/components/wallets/shared/`. Refactor the existing `WalletCard.tsx` to consume the new hooks (no behavior change). Validated by a Playwright regression test that exercises wallet rendering, drag handle visibility, dropdown actions, and inline rename — written *before* the refactor as a baseline, run after to confirm preservation.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript (strict, `noUncheckedIndexedAccess`), Convex (`useQuery`/`useMutation`), `@dnd-kit/sortable`, Playwright + `@clerk/testing`, Graphite (`gt`) for stacked PRs.

**Parent spec:** [`docs/superpowers/specs/2026-05-12-crowdev-420-wallets-aesthetic-multi-variant-design.md`](../specs/2026-05-12-crowdev-420-wallets-aesthetic-multi-variant-design.md)

---

## File Structure

### New files (all in `apps/app/src/components/wallets/shared/`)

| Path | Responsibility |
|---|---|
| `shared/use-wallet-card.ts` | Wraps `useQuery(api.wallets.queries.getWithCards)` and `useQuery(api.wallets.queries.get)` for stats. Returns `{ previewCards, walletStats }`. |
| `shared/use-wallet-card-actions.ts` | Returns the four mutation callbacks: `handleRename`, `handleTogglePin`, `handleDelete`, `handleNavigate`. Wraps `useRouter`, `useMutation`. |
| `shared/use-sortable-wallet.ts` | Wraps `useSortable({ id })` from `@dnd-kit/sortable`. Returns `{ attributes, listeners, setNodeRef, style, isDragging }` with `transform`/`transition` already converted to a style object. |
| `shared/brand-colors.ts` | The `brandColors` constant currently inline in `WalletCard.tsx`. |
| `shared/types.ts` | `WalletCardProps`, `MiniCardPreviewProps`, `Wallet` (the row shape passed to `WalletCard`), `BrandKey` types. |
| `shared/index.ts` | Barrel re-export for the above. |

### Modified files

| Path | Change |
|---|---|
| `apps/app/src/components/wallets/WalletCard.tsx` | Replace inline Convex queries/mutations/sortable hook with calls to `shared/`. No visual change. |
| `apps/app/tests/wallets-baseline.spec.ts` | **New** Playwright regression test (written *first* — runs on `main` before refactor to establish baseline). |

### Branch & PR

- Branch: `crowdev-420-prep` (created via `gt create`, stacked on `main`)
- PR title: `prep(wallets): extract shared WalletCard hooks (CROWDEV-XXX)`
- Body must include `Refs CROWDEV-420` and the new sub-issue ID
- Submitted via `gt submit`

---

## Tasks

### Task 1: Create the Linear sub-issue and Graphite branch

**Files:**
- None — Linear + Graphite setup only

- [ ] **Step 1: Create the Linear sub-issue from CROWDEV-420**

Use Linear MCP `mcp__de1f0b5b-…__save_issue` to create a new issue:
- Parent: `CROWDEV-420`
- Title: `Prep: extract shared WalletCard hooks`
- Description: copy the Goal section above
- Team: `CrowDevelopment, LLC` (same as parent)

Record the new issue ID (e.g. `CROWDEV-431`) — substitute it wherever this plan says `CROWDEV-XXX`.

- [ ] **Step 2: Sync local main and create the Graphite branch**

```bash
git fetch origin
git checkout main
git pull --ff-only
gt create -m "prep(wallets): extract shared WalletCard hooks (CROWDEV-XXX)" crowdev-420-prep
```

Expected: New branch `crowdev-420-prep` created and checked out, parent set to `main`.

- [ ] **Step 3: Post the starting comment on the Linear sub-issue**

Use Linear MCP `mcp__de1f0b5b-…__save_comment`:
- Issue: `CROWDEV-XXX`
- Body: `Starting prep work on branch \`crowdev-420-prep\`. Will extract \`useWalletCard\`, \`useWalletCardActions\`, \`useSortableWallet\` hooks + brand colors + types so the 5 variant branches share non-visual logic.`

Also move the issue to "In Progress" via `save_issue` with the appropriate `stateId` (use `list_issue_statuses` to find the right status for the team if unknown).

---

### Task 2: Write the regression baseline test FIRST (against current code)

**Files:**
- Create: `apps/app/tests/wallets-baseline.spec.ts`

The test runs against the current `WalletCard.tsx` to capture existing behavior. It must pass before the refactor; the refactor's success is "this test still passes."

- [ ] **Step 1: Inspect existing Playwright test patterns**

Read `apps/app/tests/sidebar-rename-delete.spec.ts` and `apps/app/tests/smoke.spec.ts` for the auth + Convex seeding pattern. Note the Clerk testing-token setup (`setupClerkTestingToken`) and the helpers in `apps/app/tests/helpers`.

- [ ] **Step 2: Read what helpers exist**

```bash
ls /Users/itsjusteric/Developer/smartpockets/.claude/worktrees/gracious-allen-67a1ab/apps/app/tests/helpers/
cat /Users/itsjusteric/Developer/smartpockets/.claude/worktrees/gracious-allen-67a1ab/apps/app/tests/helpers/*.ts | head -100
```

Note any helpers for: seeding wallets, creating cards, dragging elements.

- [ ] **Step 3: Add Convex helpers for wallet seeding if not present**

If `apps/app/tests/helpers/` lacks wallet seeding, add helpers to a new file `apps/app/tests/helpers/wallets.ts`:

```ts
import type { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

export async function seedTestWallet(
  client: ConvexHttpClient,
  args: { name: string; isPinned?: boolean }
) {
  return client.mutation(api.wallets.mutations.create, args);
}

export async function clearTestWallets(client: ConvexHttpClient) {
  // Use the existing list + remove pattern, or add a mutation
  // matching the pattern used by `deleteAllTestThreads` in agent/threads.ts
}
```

If `packages/backend/convex/wallets/mutations.ts` lacks a `deleteAll` test helper, **stop and note** — adding a Convex test mutation is out of scope for the prep PR. Use an alternative: seed wallets with a known test prefix in the name and delete them one-by-one via the existing `remove` mutation.

- [ ] **Step 4: Write the baseline test**

Create `apps/app/tests/wallets-baseline.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) throw new Error("NEXT_PUBLIC_CONVEX_URL not set");

const WALLET_NAME_PREFIX = "BaselineTestWallet-";

test.describe("Wallets page baseline (CROWDEV-420 prep)", () => {
  let convex: ConvexHttpClient;
  let createdWalletIds: string[] = [];

  test.beforeAll(async () => {
    convex = new ConvexHttpClient(CONVEX_URL);
  });

  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
    // Seed two wallets so we can test drag/reorder
    // NOTE: this requires the test user's `userId` — see existing test helpers
    // for how `agent-transactions-slideout.spec.ts` derives the test user.
  });

  test.afterEach(async () => {
    // Remove all wallets we created in this test run
    for (const id of createdWalletIds) {
      try {
        await convex.mutation(api.wallets.mutations.remove, { walletId: id as any });
      } catch {}
    }
    createdWalletIds = [];
  });

  test("renders wallet cards with name, count, and pin indicator", async ({ page }) => {
    await page.goto("/wallets");
    await expect(page.getByRole("heading", { name: /wallets/i })).toBeVisible();
    // After seeding two wallets (one pinned), confirm both render
    // and the pinned one shows the Pin01 icon.
  });

  test("drag handle becomes visible on hover", async ({ page }) => {
    await page.goto("/wallets");
    const firstCard = page.locator("[data-testid='wallet-card']").first();
    await firstCard.hover();
    // The DotsGrid grip is opacity-0 by default, group-hover:opacity-100
    await expect(firstCard.getByLabel("Drag to reorder")).toBeVisible();
  });

  test("dropdown menu opens with Rename, Pin, Delete", async ({ page }) => {
    await page.goto("/wallets");
    await page.locator("[data-testid='wallet-card']").first().hover();
    await page.getByRole("button", { name: /options/i }).first().click();
    await expect(page.getByRole("menuitem", { name: /rename/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /pin|unpin/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /delete/i })).toBeVisible();
  });

  test("inline rename saves on Enter", async ({ page }) => {
    await page.goto("/wallets");
    await page.locator("[data-testid='wallet-card']").first().hover();
    await page.getByRole("button", { name: /options/i }).first().click();
    await page.getByRole("menuitem", { name: /rename/i }).click();
    const input = page.getByRole("textbox").first();
    await input.fill(`${WALLET_NAME_PREFIX}Renamed`);
    await input.press("Enter");
    await expect(page.getByText(`${WALLET_NAME_PREFIX}Renamed`)).toBeVisible();
  });

  test("clicking card navigates to credit-cards with wallet filter", async ({ page }) => {
    await page.goto("/wallets");
    await page.locator("[data-testid='wallet-card']").first().click();
    await expect(page).toHaveURL(/\/credit-cards\?wallet=/);
  });

  test("extended-view toggle reveals stats on each card", async ({ page }) => {
    await page.goto("/wallets");
    await page.getByRole("switch", { name: /details/i }).click();
    await expect(page.getByText(/total balance/i).first()).toBeVisible();
    await expect(page.getByText(/credit limit/i).first()).toBeVisible();
    await expect(page.getByText(/available/i).first()).toBeVisible();
    await expect(page.getByText(/utilization/i).first()).toBeVisible();
  });
});
```

**Note:** This test depends on the `WalletCard.tsx` rendering a `data-testid="wallet-card"` attribute. Today it does not — add this attribute in the next task (since it's a no-behavior change that helps testability and is needed by every variant downstream).

- [ ] **Step 5: Add `data-testid="wallet-card"` to current WalletCard.tsx**

Edit `apps/app/src/components/wallets/WalletCard.tsx` line 142 — change the outer `motion.div` to include `data-testid="wallet-card"`:

```tsx
return (
  <motion.div
    data-testid="wallet-card"
    className="group relative cursor-pointer"
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
    onClick={handleClick}
    whileHover={{ scale: 1.02 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
  >
```

- [ ] **Step 6: Run the baseline test to confirm it PASSES on `main`-state code**

```bash
cd apps/app
bun test:e2e wallets-baseline.spec.ts
```

Expected: All tests PASS. The point of this run is to confirm the test correctly captures current behavior. If any test fails, fix the test first (the current code is the source of truth at this point).

- [ ] **Step 7: Commit the baseline test**

```bash
git add apps/app/tests/wallets-baseline.spec.ts apps/app/tests/helpers/wallets.ts apps/app/src/components/wallets/WalletCard.tsx
git commit -m "$(cat <<'EOF'
test(wallets): add regression baseline before hook extraction

Captures pre-refactor behavior: rendering, drag handle visibility,
dropdown menu, inline rename, click-to-navigate, extended-view toggle.

Also adds data-testid="wallet-card" to the card root for stable selectors
that every variant branch can rely on.

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Extract `brand-colors.ts` and `types.ts`

**Files:**
- Create: `apps/app/src/components/wallets/shared/brand-colors.ts`
- Create: `apps/app/src/components/wallets/shared/types.ts`

- [ ] **Step 1: Create `brand-colors.ts`**

```ts
// apps/app/src/components/wallets/shared/brand-colors.ts

/**
 * Brand-color palette for mini credit-card previews inside a wallet card.
 * Maps a card network slug → gradient + accent chip color.
 */
export const brandColors: Record<
  string,
  { bg: string; accent: string }
> = {
  visa: { bg: "from-blue-600 to-blue-800", accent: "bg-yellow-400" },
  mastercard: { bg: "from-red-500 to-orange-500", accent: "bg-yellow-500" },
  amex: { bg: "from-slate-600 to-slate-800", accent: "bg-blue-400" },
  discover: { bg: "from-orange-500 to-orange-600", accent: "bg-white" },
  other: { bg: "from-gray-600 to-gray-800", accent: "bg-gray-400" },
};

export type BrandKey = keyof typeof brandColors;
```

- [ ] **Step 2: Create `types.ts`**

```ts
// apps/app/src/components/wallets/shared/types.ts
import type { Id } from "@convex/_generated/dataModel";

export interface Wallet {
  _id: Id<"wallets">;
  name: string;
  color?: string;
  icon?: string;
  cardCount: number;
  isPinned: boolean;
}

export interface WalletCardProps {
  wallet: Wallet;
  isExtended: boolean;
}

export interface MiniCardPreviewProps {
  brand: string;
  lastFour?: string;
  displayName: string;
  index: number;
  total: number;
  isHovered: boolean;
}
```

- [ ] **Step 3: Run typecheck**

```bash
cd apps/app
bun typecheck
```

Expected: PASS (these new files compile independently).

- [ ] **Step 4: Commit**

```bash
git add apps/app/src/components/wallets/shared/brand-colors.ts apps/app/src/components/wallets/shared/types.ts
git commit -m "refactor(wallets): extract brand-colors and types to shared/

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Extract `useWalletCard` hook

**Files:**
- Create: `apps/app/src/components/wallets/shared/use-wallet-card.ts`

- [ ] **Step 1: Create the hook**

```ts
// apps/app/src/components/wallets/shared/use-wallet-card.ts
"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Data hook for a single wallet card.
 *
 * Returns the wallet's first 3 cards (for the mini-stack preview) and
 * optionally the wallet's financial stats when extended view is on.
 */
export function useWalletCard(walletId: Id<"wallets">, isExtended: boolean) {
  const walletWithCards = useQuery(api.wallets.queries.getWithCards, {
    walletId,
  });

  const walletStats = useQuery(
    api.wallets.queries.get,
    isExtended ? { walletId } : "skip"
  );

  const previewCards = walletWithCards?.cards.slice(0, 3) ?? [];

  return { previewCards, walletStats };
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd apps/app
bun typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/app/src/components/wallets/shared/use-wallet-card.ts
git commit -m "refactor(wallets): extract useWalletCard data hook

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Extract `useWalletCardActions` hook

**Files:**
- Create: `apps/app/src/components/wallets/shared/use-wallet-card-actions.ts`

- [ ] **Step 1: Create the hook**

```ts
// apps/app/src/components/wallets/shared/use-wallet-card-actions.ts
"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Action hook for a wallet card. Provides rename, togglePin, remove,
 * and navigate-to-cards callbacks. All four are stable across renders
 * because they're returned directly from `useMutation` / `useRouter`.
 */
export function useWalletCardActions(walletId: Id<"wallets">) {
  const router = useRouter();
  const togglePin = useMutation(api.wallets.mutations.togglePin);
  const removeWallet = useMutation(api.wallets.mutations.remove);
  const renameWallet = useMutation(api.wallets.mutations.rename);

  return {
    navigateToCards: () => router.push(`/credit-cards?wallet=${walletId}`),
    rename: (name: string) => renameWallet({ walletId, name }),
    togglePin: () => togglePin({ walletId }),
    remove: () => removeWallet({ walletId }),
  };
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd apps/app && bun typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/app/src/components/wallets/shared/use-wallet-card-actions.ts
git commit -m "refactor(wallets): extract useWalletCardActions hook

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Extract `useSortableWallet` hook

**Files:**
- Create: `apps/app/src/components/wallets/shared/use-sortable-wallet.ts`

- [ ] **Step 1: Create the hook**

```ts
// apps/app/src/components/wallets/shared/use-sortable-wallet.ts
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Sortable hook for a wallet card. Wraps `useSortable` and pre-computes
 * the inline transform/transition style so the variant component can
 * spread it directly onto the draggable root.
 */
export function useSortableWallet(walletId: Id<"wallets">) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: walletId });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return {
    attributes,
    listeners,
    setNodeRef,
    style,
    isDragging,
  };
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd apps/app && bun typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/app/src/components/wallets/shared/use-sortable-wallet.ts
git commit -m "refactor(wallets): extract useSortableWallet hook

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Add the `shared/index.ts` barrel

**Files:**
- Create: `apps/app/src/components/wallets/shared/index.ts`

- [ ] **Step 1: Create the barrel**

```ts
// apps/app/src/components/wallets/shared/index.ts
export { brandColors, type BrandKey } from "./brand-colors";
export type { Wallet, WalletCardProps, MiniCardPreviewProps } from "./types";
export { useWalletCard } from "./use-wallet-card";
export { useWalletCardActions } from "./use-wallet-card-actions";
export { useSortableWallet } from "./use-sortable-wallet";
```

- [ ] **Step 2: Run typecheck**

```bash
cd apps/app && bun typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/app/src/components/wallets/shared/index.ts
git commit -m "refactor(wallets): add shared/ barrel for variant consumption

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Refactor `WalletCard.tsx` to consume shared hooks

**Files:**
- Modify: `apps/app/src/components/wallets/WalletCard.tsx`

The visual rendering does not change. Only the imports + the hook-call sites at the top of `WalletCard()` and inside `SortableWalletCard()` change.

- [ ] **Step 1: Replace inline imports with shared imports**

In `apps/app/src/components/wallets/WalletCard.tsx`, replace the existing imports of `useQuery`, `useMutation`, `useSortable`, `CSS`, `api`, `Id` (where used only for those calls), and the inline `brandColors` constant + `WalletCardProps`/`MiniCreditCardProps` interfaces.

New import block at the top of `WalletCard.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Pin01, Edit03, Trash01, DotsGrid } from "@untitledui/icons";
import { Dropdown } from "@repo/ui/untitledui/base/dropdown/dropdown";
import { cx } from "@repo/ui/utils";
import { formatMoneyFromDollars } from "@/utils/money";
import {
  brandColors,
  useWalletCard,
  useWalletCardActions,
  useSortableWallet,
  type WalletCardProps,
  type MiniCardPreviewProps,
} from "./shared";
```

Delete the local `brandColors` const, `interface WalletCardProps`, and `interface MiniCreditCardProps` definitions — they now come from `./shared`.

- [ ] **Step 2: Replace the inline data + actions inside `WalletCard()`**

Inside the body of `export function WalletCard({ wallet, isExtended }: WalletCardProps)`, replace:

```tsx
// OLD
const walletWithCards = useQuery(api.wallets.queries.getWithCards, {
  walletId: wallet._id,
});
const togglePin = useMutation(api.wallets.mutations.togglePin);
const removeWallet = useMutation(api.wallets.mutations.remove);
const renameWallet = useMutation(api.wallets.mutations.rename);
const previewCards = walletWithCards?.cards.slice(0, 3) ?? [];
const walletStats = useQuery(
  api.wallets.queries.get,
  isExtended ? { walletId: wallet._id } : "skip"
);
```

with:

```tsx
const { previewCards, walletStats } = useWalletCard(wallet._id, isExtended);
const actions = useWalletCardActions(wallet._id);
```

Then update the handlers below:

```tsx
const handleClick = () => {
  if (!isRenaming) {
    actions.navigateToCards();
  }
};

const handleRenameSubmit = async () => {
  const trimmedName = editName.trim();
  if (trimmedName && trimmedName !== wallet.name) {
    await actions.rename(trimmedName);
  }
  setIsRenaming(false);
};

const handleTogglePin = async () => {
  await actions.togglePin();
};

const handleDelete = async () => {
  if (confirm(`Delete "${wallet.name}"? Cards will not be deleted.`)) {
    await actions.remove();
  }
};
```

- [ ] **Step 3: Replace the inline sortable inside `SortableWalletCard()`**

In `SortableWalletCard()`, replace:

```tsx
// OLD
const {
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging,
} = useSortable({ id: props.wallet._id });

const style = {
  transform: CSS.Transform.toString(transform),
  transition,
};
```

with:

```tsx
const { attributes, listeners, setNodeRef, style, isDragging } =
  useSortableWallet(props.wallet._id);
```

- [ ] **Step 4: Rename the local `MiniCreditCard` component's props interface**

The local `interface MiniCreditCardProps` was renamed to `MiniCardPreviewProps` in `shared/types.ts`. Update the local function signature:

```tsx
function MiniCreditCard({
  brand,
  lastFour,
  displayName,
  index,
  total,
  isHovered,
}: MiniCardPreviewProps) {
  // ... unchanged body
}
```

- [ ] **Step 5: Run typecheck**

```bash
cd apps/app && bun typecheck
```

Expected: PASS. If any errors mention `api`, `useQuery`, `useMutation`, `useSortable`, `CSS`, or the old interfaces, you have stale imports — remove them.

- [ ] **Step 6: Run the baseline test**

```bash
cd apps/app
bun test:e2e wallets-baseline.spec.ts
```

Expected: All tests still PASS (this is the success criterion for the refactor — no behavior change).

- [ ] **Step 7: Run lint**

```bash
cd apps/app && bun lint
```

Expected: PASS.

- [ ] **Step 8: Run dev server, smoke-check `/wallets` manually**

```bash
# In a separate terminal
bun dev:app
```

Open `http://localhost:3000/wallets`. Verify:
- Wallet cards render
- Hover shows drag handle + dropdown button
- Dropdown opens with Rename/Pin/Delete
- "Details" toggle reveals stats
- Click card navigates to `/credit-cards?wallet=...`

- [ ] **Step 9: Commit**

```bash
git add apps/app/src/components/wallets/WalletCard.tsx
git commit -m "$(cat <<'EOF'
refactor(wallets): consume shared hooks in WalletCard

No behavior change. WalletCard now imports useWalletCard,
useWalletCardActions, useSortableWallet, brandColors, and the shared
types from ./shared instead of inlining the Convex/dnd-kit wiring.

Validates against the baseline Playwright spec.

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Pre-submit verification

**Files:**
- None

- [ ] **Step 1: Confirm full verification suite passes**

```bash
cd apps/app
bun typecheck && bun lint && bun build
```

Expected: All three PASS.

- [ ] **Step 2: Re-run the baseline test on the final state of the branch**

```bash
cd apps/app
bun test:e2e wallets-baseline.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Inspect git log to confirm atomic commits**

```bash
git log --oneline main..HEAD
```

Expected: 7–8 atomic commits (test baseline, brand-colors+types, use-wallet-card, use-wallet-card-actions, use-sortable-wallet, barrel, refactor WalletCard, and any small fixups). Each commit should be self-contained.

---

### Task 10: Submit via Graphite and post Linear update

**Files:**
- None

- [ ] **Step 1: Submit the stack**

```bash
gt submit
```

Graphite will push the branch and open a PR against `main`. Note the PR number — it will appear in the command output. Convert it to the Graphite URL format from `CLAUDE.md`: `https://app.graphite.com/github/pr/EricJamesCrow/smartpockets/<PR_NUMBER>`.

- [ ] **Step 2: Verify PR checks**

```bash
gh pr checks <PR_NUMBER>
```

Expected: `Vercel – smartpockets-app` succeeds (or shows in-progress if just submitted). If it fails, inspect with:

```bash
npx vercel inspect <DEPLOYMENT_URL> --logs
```

- [ ] **Step 3: Comment on the Linear sub-issue**

Use Linear MCP `mcp__de1f0b5b-…__save_comment`:
- Issue: `CROWDEV-XXX`
- Body:

```
Prep PR submitted.

**PR:** https://app.graphite.com/github/pr/EricJamesCrow/smartpockets/<PR_NUMBER>

**Summary:** Extracted `useWalletCard`, `useWalletCardActions`, `useSortableWallet` hooks + `brandColors` + shared types into `apps/app/src/components/wallets/shared/`. Refactored existing `WalletCard.tsx` to consume them. No behavior change.

**Verification:** Baseline Playwright spec (`wallets-baseline.spec.ts`) passes on both `main`-state code (pre-refactor) and the prep branch (post-refactor). Confirms drag handle visibility, dropdown menu, inline rename, click-to-navigate, and extended-view toggle all work identically.

**Variants unblocked:** Once this merges, branches `crowdev-420-a-leather`, `crowdev-420-b-refined`, `crowdev-420-c-champagne`, `crowdev-420-d-glass`, `crowdev-420-e-refined-glass` can each be created on top of this branch and consume `./shared` for their non-visual logic.
```

- [ ] **Step 4: Move Linear sub-issue to "In Review"**

Use `mcp__de1f0b5b-…__save_issue` with the In-Review status ID.

---

## Self-Review checklist (run before announcing complete)

- [ ] Spec coverage: every requirement from §5 of the spec (hook extraction targets) maps to a task. ✓
- [ ] No placeholders: search for `TBD`, `TODO`, `XXX` (except deliberate `CROWDEV-XXX` substitution prompt). ✓
- [ ] Type consistency: `useWalletCard` returns `{ previewCards, walletStats }`; `WalletCard.tsx` destructures the same names. `useSortableWallet` returns `{ attributes, listeners, setNodeRef, style, isDragging }`; `SortableWalletCard` destructures the same names. ✓
- [ ] Baseline test depends on `data-testid="wallet-card"` — added in Task 2 Step 5 before tests run. ✓
- [ ] Final commit before submit re-runs the baseline test — Task 9 Step 2. ✓

---

## Out of scope (explicitly NOT in this plan)

- Any visual changes to `WalletCard.tsx` — the refactor preserves rendering exactly.
- Adding a `deleteAll` Convex test mutation — if the test needs it and it's missing, use the existing `remove` mutation in a loop.
- Modifying `WalletsContent.tsx` — variant branches will change its import line, not this PR.
- Any sidebar/`PinnedWalletsSidebar` work.
- Creating the variant branches themselves — those are separate plans.

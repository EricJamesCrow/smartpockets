# TransactionDetailPanel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace two read-only transaction detail drawers with a single interactive panel supporting reviewed/hidden toggles, editable fields (notes, category, date), and normalized amount display.

**Architecture:** Transaction metadata persists via a `transactionOverlays` Convex Ents table keyed by Plaid's `transactionId`. Overlays are created on first edit and merged with Plaid data at read time. A single `TransactionDetailPanel` component replaces both existing drawers.

**Tech Stack:** Convex Ents, React 19, TypeScript, UntitledUI components, Tailwind CSS v4, Plaid component for transaction data.

---

## Important Codebase Context

**Read these files before starting any task:**

- `AGENTS.md` — Full project architecture and conventions
- `packages/backend/convex/schema.ts` — Uses `defineEnt` from `convex-ents` (NOT `defineTable`)
- `packages/backend/convex/functions.ts` — Custom `query`/`mutation` with `ctx.viewerX()`, `ctx.table()`, `ctx.viewer`
- `packages/backend/convex/creditCards/mutations.ts` — Reference mutation pattern (ownership check, `.getX()`, `.patch()`)
- `apps/app/src/hooks/useToggleCardLocked.ts` — Reference hook pattern (useMutation, loading/error state)
- `apps/app/src/utils/transaction-helpers.ts` — Current `formatTransactionAmount` and `mapPlaidCategory`
- `apps/app/src/types/credit-cards.ts` — `Transaction`, `PlaidTransactionItem`, `TransactionCategory`, formatting utilities

**Key conventions:**

- Convex Ents: `defineEnt({...}).index(...)` not `defineTable`
- Auth: `ctx.viewerX()` returns authenticated user (throws if not). Never accept userId as mutation arg.
- Ownership: `entity.userId !== viewer._id` check pattern
- Amounts: Stored as milliunits in Plaid (÷ 1000 for dollars). Positive = money out, negative = money in.
- UI: UntitledUI library (`@repo/ui/untitledui/...`). Use `cx()` from `@repo/ui/utils` for class merging.
- React 19: No `import React`. `"use client"` on interactive components.
- File organization: Convex modules in `packages/backend/convex/<feature>/`, React components in `apps/app/src/components/<feature>/`, hooks in `apps/app/src/hooks/`

**Two existing drawers being replaced:**

1. `apps/app/src/components/credit-cards/TransactionDetailDrawer.tsx` — Uses `Transaction` type (already mapped from Plaid). Used by `TransactionsSection.tsx`.
2. `apps/app/src/components/transactions/TransactionDetailDrawer.tsx` — Uses `AggregatedTransaction` type (raw Plaid shape with `sourceInfo`). Used by `TransactionsContent.tsx`.

---

## Task 1: Add `transactionOverlays` Table to Schema

**Files:**
- Modify: `packages/backend/convex/schema.ts`

**Step 1: Add the table definition**

Add after `userPreferences` (line ~240), before the closing `}` of `defineEntSchema`:

```typescript
// === TRANSACTION OVERLAYS ===
transactionOverlays: defineEnt({
  plaidTransactionId: v.string(),
  isReviewed: v.optional(v.boolean()),
  reviewedAt: v.optional(v.number()),
  isHidden: v.optional(v.boolean()),
  notes: v.optional(v.string()),
  userCategory: v.optional(v.string()),
  userDate: v.optional(v.string()),
  userMerchantName: v.optional(v.string()),
})
  .edge("user")
  .index("by_plaidTransactionId", ["plaidTransactionId"])
  .index("by_user", ["userId"]),
```

Note: `.edge("user")` auto-creates a `userId` field referencing the `users` table. This follows the same pattern as `creditCards`, `wallets`, etc. No need for a manual `userId: v.id("users")` field.

**Step 2: Push schema to Convex dev**

Run: `cd packages/backend && npx convex dev`
Expected: Schema pushed successfully, new table appears in dashboard.

**Step 3: Commit**

```bash
git add packages/backend/convex/schema.ts
git commit -m "feat(schema): add transactionOverlays table for editable transaction metadata"
```

---

## Task 2: Create Overlay Queries

**Files:**
- Create: `packages/backend/convex/transactionOverlays/queries.ts`
- Create: `packages/backend/convex/transactionOverlays/index.ts`

**Step 1: Create the queries file**

```typescript
// packages/backend/convex/transactionOverlays/queries.ts
/**
 * Transaction Overlay Queries
 *
 * Read operations for user-editable transaction metadata.
 * Overlays are keyed by Plaid transactionId and merged with Plaid data at read time.
 */

import { v } from "convex/values";
import { query } from "../functions";

/**
 * Get overlay for a single transaction
 *
 * @param plaidTransactionId - Plaid's transactionId
 * @returns Overlay document or null if no edits exist
 */
export const getByTransactionId = query({
  args: { plaidTransactionId: v.string() },
  handler: async (ctx, { plaidTransactionId }) => {
    const viewer = ctx.viewerX();

    const overlays = await ctx
      .table("transactionOverlays", "by_plaidTransactionId", (q) =>
        q.eq("plaidTransactionId", plaidTransactionId)
      )
      .filter((q) => q.eq(q.field("userId"), viewer._id))
      .map((overlay) => overlay.doc());

    return overlays[0] ?? null;
  },
});

/**
 * Batch-fetch overlays for multiple transactions
 *
 * Used by transaction list views to show reviewed/hidden indicators.
 *
 * @param plaidTransactionIds - Array of Plaid transactionIds
 * @returns Map-like array of { plaidTransactionId, overlay } pairs
 */
export const getByTransactionIds = query({
  args: { plaidTransactionIds: v.array(v.string()) },
  handler: async (ctx, { plaidTransactionIds }) => {
    const viewer = ctx.viewerX();

    // Fetch all overlays for this user
    const allOverlays = await ctx
      .table("transactionOverlays", "by_user", (q) =>
        q.eq("userId", viewer._id)
      )
      .map((overlay) => overlay.doc());

    // Build lookup set for requested IDs
    const requestedIds = new Set(plaidTransactionIds);

    // Filter to only requested transaction IDs
    const results: Record<string, {
      isReviewed?: boolean;
      isHidden?: boolean;
      notes?: string;
      userCategory?: string;
      userDate?: string;
      userMerchantName?: string;
    }> = {};

    for (const overlay of allOverlays) {
      if (requestedIds.has(overlay.plaidTransactionId)) {
        results[overlay.plaidTransactionId] = {
          isReviewed: overlay.isReviewed,
          isHidden: overlay.isHidden,
          notes: overlay.notes,
          userCategory: overlay.userCategory,
          userDate: overlay.userDate,
          userMerchantName: overlay.userMerchantName,
        };
      }
    }

    return results;
  },
});
```

**Step 2: Create the index file**

```typescript
// packages/backend/convex/transactionOverlays/index.ts
/**
 * Transaction Overlays Module
 *
 * Exports for user-editable transaction metadata.
 */

export { getByTransactionId, getByTransactionIds } from "./queries";
```

**Step 3: Verify types compile**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/backend/convex/transactionOverlays/
git commit -m "feat(overlays): add transaction overlay queries"
```

---

## Task 3: Create Overlay Mutations

**Files:**
- Create: `packages/backend/convex/transactionOverlays/mutations.ts`
- Modify: `packages/backend/convex/transactionOverlays/index.ts`

**Step 1: Create mutations file**

```typescript
// packages/backend/convex/transactionOverlays/mutations.ts
/**
 * Transaction Overlay Mutations
 *
 * Write operations for user-editable transaction metadata.
 * Uses upsert pattern: creates overlay on first edit, patches on subsequent.
 *
 * SECURITY: All mutations derive userId from auth context.
 */

import { v } from "convex/values";
import { mutation } from "../functions";

/**
 * Upsert a field on a transaction overlay
 *
 * Gets or creates the overlay document, then patches the specified field.
 * This is the generic updater for simple scalar fields.
 *
 * @param plaidTransactionId - Plaid's transactionId
 * @param field - Field name to update
 * @param value - New value (string, boolean, or null to clear)
 */
export const upsertField = mutation({
  args: {
    plaidTransactionId: v.string(),
    field: v.union(
      v.literal("notes"),
      v.literal("userCategory"),
      v.literal("userDate"),
      v.literal("userMerchantName"),
    ),
    value: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { plaidTransactionId, field, value }) => {
    const viewer = ctx.viewerX();

    // Find existing overlay
    const existing = await ctx
      .table("transactionOverlays", "by_plaidTransactionId", (q) =>
        q.eq("plaidTransactionId", plaidTransactionId)
      )
      .filter((q) => q.eq(q.field("userId"), viewer._id))
      .first();

    if (existing) {
      await existing.patch({
        [field]: value ?? undefined,
      });
    } else {
      await ctx.table("transactionOverlays").insert({
        userId: viewer._id,
        plaidTransactionId,
        [field]: value ?? undefined,
      });
    }
  },
});

/**
 * Toggle reviewed status with audit timestamp
 *
 * Sets isReviewed and reviewedAt atomically.
 *
 * @param plaidTransactionId - Plaid's transactionId
 * @param isReviewed - New reviewed state
 */
export const toggleReviewed = mutation({
  args: {
    plaidTransactionId: v.string(),
    isReviewed: v.boolean(),
  },
  handler: async (ctx, { plaidTransactionId, isReviewed }) => {
    const viewer = ctx.viewerX();

    const existing = await ctx
      .table("transactionOverlays", "by_plaidTransactionId", (q) =>
        q.eq("plaidTransactionId", plaidTransactionId)
      )
      .filter((q) => q.eq(q.field("userId"), viewer._id))
      .first();

    const reviewedAt = isReviewed ? Date.now() : undefined;

    if (existing) {
      await existing.patch({ isReviewed, reviewedAt });
    } else {
      await ctx.table("transactionOverlays").insert({
        userId: viewer._id,
        plaidTransactionId,
        isReviewed,
        reviewedAt,
      });
    }
  },
});

/**
 * Toggle hidden status
 *
 * Hidden transactions remain in the list but are dimmed and excluded
 * from budget calculations.
 *
 * @param plaidTransactionId - Plaid's transactionId
 * @param isHidden - New hidden state
 */
export const toggleHidden = mutation({
  args: {
    plaidTransactionId: v.string(),
    isHidden: v.boolean(),
  },
  handler: async (ctx, { plaidTransactionId, isHidden }) => {
    const viewer = ctx.viewerX();

    const existing = await ctx
      .table("transactionOverlays", "by_plaidTransactionId", (q) =>
        q.eq("plaidTransactionId", plaidTransactionId)
      )
      .filter((q) => q.eq(q.field("userId"), viewer._id))
      .first();

    if (existing) {
      await existing.patch({ isHidden });
    } else {
      await ctx.table("transactionOverlays").insert({
        userId: viewer._id,
        plaidTransactionId,
        isHidden,
      });
    }
  },
});
```

**Step 2: Update index to export mutations**

```typescript
// packages/backend/convex/transactionOverlays/index.ts
/**
 * Transaction Overlays Module
 *
 * Exports for user-editable transaction metadata.
 */

export { getByTransactionId, getByTransactionIds } from "./queries";
export { upsertField, toggleReviewed, toggleHidden } from "./mutations";
```

**Step 3: Verify types compile**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/backend/convex/transactionOverlays/
git commit -m "feat(overlays): add upsertField, toggleReviewed, toggleHidden mutations"
```

---

## Task 4: Normalize Amount Display

**Files:**
- Modify: `apps/app/src/utils/transaction-helpers.ts`
- Modify: `apps/app/src/components/credit-cards/TransactionTableRow.tsx`

**Step 1: Update `formatTransactionAmount` in `utils/transaction-helpers.ts`**

Replace the existing function (lines 43-59) with:

```typescript
/**
 * Format transaction amount for display
 *
 * Plaid amounts: positive = money out (charge), negative = money in (refund/credit)
 *
 * Display rules (Monarch Money convention):
 * - Expenses: "$207.94" (no sign, default text color)
 * - Income/refunds: "+$500.00" (green text)
 * - Never show a negative sign to the user
 */
export function formatTransactionAmount(
  amount: number,
  isoCurrencyCode?: string
): { text: string; isRefund: boolean; colorClass: string } {
  const isRefund = amount < 0;
  const displayAmount = Math.abs(amount);

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: isoCurrencyCode ?? "USD",
  }).format(displayAmount / 1000); // Convert from milliunits

  if (isRefund) {
    return {
      text: `+${formatted}`,
      isRefund: true,
      colorClass: "text-utility-success-600",
    };
  }

  return {
    text: formatted,
    isRefund: false,
    colorClass: "text-primary",
  };
}
```

**Step 2: Update callers of `formatTransactionAmount`**

The return type now includes `colorClass` instead of just `isRefund`. Update:

In `apps/app/src/components/transactions/TransactionsTableRow.tsx` (line 81-84):

Change:
```typescript
const { text: amountText, isRefund } = formatTransactionAmount(
  transaction.amount,
  transaction.isoCurrencyCode
);
```
To:
```typescript
const { text: amountText, colorClass: amountColor } = formatTransactionAmount(
  transaction.amount,
  transaction.isoCurrencyCode
);
```

And update the amount cell (lines 139-147):
```typescript
<Table.Cell className="text-right">
  <span className={`text-sm font-medium tabular-nums ${amountColor}`}>
    {amountText}
  </span>
</Table.Cell>
```

In `apps/app/src/components/transactions/TransactionDetailDrawer.tsx` (line 46-49), same pattern:
```typescript
const { text: amountText, colorClass: amountColor } = formatTransactionAmount(
  transaction.amount,
  transaction.isoCurrencyCode
);
```
And update the amount span (lines 94-100):
```typescript
<span className={`text-2xl font-bold tabular-nums ${amountColor}`}>
  {amountText}
</span>
```

**Step 3: Fix amount display in credit-cards `TransactionTableRow.tsx`**

This file uses `formatDisplayCurrency(transaction.amount)` which doesn't handle sign normalization. The `transaction.amount` here has already been converted from milliunits via `toTransaction()` (line 654 of `types/credit-cards.ts`), which does `Math.abs(plaidTx.amount) / 1000` — so signs are already stripped but income isn't marked green.

To fix this properly, the credit-cards table row needs the raw Plaid amount to know if it's income. This is a deeper change that should be handled in Task 7 when we unify the transaction types. For now, leave this file as-is — it already shows amounts without negative signs since `toTransaction` takes `Math.abs`.

**Step 4: Verify no TypeScript errors**

Run: `bun typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add apps/app/src/utils/transaction-helpers.ts apps/app/src/components/transactions/TransactionsTableRow.tsx apps/app/src/components/transactions/TransactionDetailDrawer.tsx
git commit -m "fix(amounts): normalize transaction amount display — no negatives, green for income"
```

---

## Task 5: Create Overlay Hook

**Files:**
- Create: `apps/app/src/hooks/useTransactionOverlay.ts`

**Step 1: Create the hook**

```typescript
// apps/app/src/hooks/useTransactionOverlay.ts
"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

/**
 * Hook for reading and writing transaction overlay data
 *
 * Fetches the overlay for a given Plaid transaction ID and provides
 * mutation functions for updating fields.
 *
 * @param plaidTransactionId - Plaid's transactionId (or null if panel is closed)
 */
export function useTransactionOverlay(plaidTransactionId: string | null) {
  const [savingField, setSavingField] = useState<string | null>(null);

  // Fetch overlay data (reactive — updates automatically on mutation)
  const overlay = useQuery(
    api.transactionOverlays.queries.getByTransactionId,
    plaidTransactionId ? { plaidTransactionId } : "skip"
  );

  // Mutations
  const upsertFieldMutation = useMutation(api.transactionOverlays.mutations.upsertField);
  const toggleReviewedMutation = useMutation(api.transactionOverlays.mutations.toggleReviewed);
  const toggleHiddenMutation = useMutation(api.transactionOverlays.mutations.toggleHidden);

  const upsertField = useCallback(
    async (
      field: "notes" | "userCategory" | "userDate" | "userMerchantName",
      value: string | null
    ) => {
      if (!plaidTransactionId) return;
      setSavingField(field);
      try {
        await upsertFieldMutation({ plaidTransactionId, field, value });
      } finally {
        setSavingField(null);
      }
    },
    [plaidTransactionId, upsertFieldMutation]
  );

  const toggleReviewed = useCallback(
    async (isReviewed: boolean) => {
      if (!plaidTransactionId) return;
      setSavingField("isReviewed");
      try {
        await toggleReviewedMutation({ plaidTransactionId, isReviewed });
      } finally {
        setSavingField(null);
      }
    },
    [plaidTransactionId, toggleReviewedMutation]
  );

  const toggleHidden = useCallback(
    async (isHidden: boolean) => {
      if (!plaidTransactionId) return;
      setSavingField("isHidden");
      try {
        await toggleHiddenMutation({ plaidTransactionId, isHidden });
      } finally {
        setSavingField(null);
      }
    },
    [plaidTransactionId, toggleHiddenMutation]
  );

  return {
    overlay,
    isLoading: plaidTransactionId !== null && overlay === undefined,
    savingField,
    upsertField,
    toggleReviewed,
    toggleHidden,
  };
}
```

**Step 2: Verify types compile**

Run: `bun typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/app/src/hooks/useTransactionOverlay.ts
git commit -m "feat(hooks): add useTransactionOverlay hook for overlay CRUD"
```

---

## Task 6: Build TransactionDetailPanel Component

This is the largest task. Build the unified panel component that replaces both existing drawers.

**Files:**
- Create: `apps/app/src/components/transactions/TransactionDetailPanel.tsx`
- Create: `apps/app/src/components/transactions/TransactionDetailHeader.tsx`
- Create: `apps/app/src/components/transactions/TransactionDetailMerchant.tsx`
- Create: `apps/app/src/components/transactions/TransactionDetailFields.tsx`
- Create: `apps/app/src/components/transactions/TransactionDetailActions.tsx`

**Important context for all sub-components:**

- Each file must start with `"use client";`
- Import UntitledUI from `@repo/ui/untitledui/...`
- Use `cx()` from `@repo/ui/utils` for conditional classes
- The parent `TransactionDetailPanel` wraps everything in `DialogTrigger` + `SlideoutMenu` (same pattern as existing drawers)
- The panel needs to work with BOTH transaction types: `Transaction` (credit-cards page) and `AggregatedTransaction` (transactions page)

### Step 1: Create a unified transaction type

The panel needs a common interface that works with both existing types. Define this at the top of `TransactionDetailPanel.tsx`:

```typescript
/**
 * Unified transaction type for the detail panel
 * Works with both Transaction (credit-cards) and AggregatedTransaction (transactions page)
 */
export interface DetailPanelTransaction {
  transactionId: string;
  date: string;
  datetime?: string;
  name: string;                    // Raw Plaid name
  merchantName: string;            // Display merchant name
  amount: number;                  // Milliunits (raw Plaid amount)
  isoCurrencyCode?: string;
  pending: boolean;
  categoryPrimary?: string;        // Raw Plaid category
  category: string;                // Mapped display category
  merchantEnrichment?: {
    merchantName: string;
    logoUrl?: string;
    confidenceLevel: string;
  } | null;
  // Optional source info (only on transactions page)
  sourceInfo?: {
    cardId: string;
    displayName: string;
    lastFour?: string;
    institutionName?: string;
  };
  // Recurring info (only on credit-cards page)
  isRecurring?: boolean;
  recurringFrequency?: string;
}
```

### Step 2: Build `TransactionDetailHeader.tsx`

This renders the top bar with reviewed toggle, hide toggle, and close button.

```typescript
"use client";

import { CheckCircle, Eye, EyeOff, XClose } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { cx } from "@repo/ui/utils";

interface TransactionDetailHeaderProps {
  isReviewed: boolean;
  isHidden: boolean;
  savingField: string | null;
  onToggleReviewed: () => void;
  onToggleHidden: () => void;
  onClose: () => void;
}

export function TransactionDetailHeader({
  isReviewed,
  isHidden,
  savingField,
  onToggleReviewed,
  onToggleHidden,
  onClose,
}: TransactionDetailHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-secondary">
      <div className="flex items-center gap-2">
        {/* Review toggle */}
        <Button
          color={isReviewed ? "primary" : "secondary"}
          size="sm"
          iconLeading={CheckCircle}
          onPress={onToggleReviewed}
          isDisabled={savingField === "isReviewed"}
        >
          {isReviewed ? "Reviewed" : "Mark as reviewed"}
        </Button>

        {/* Hide toggle */}
        <Button
          color="tertiary"
          size="sm"
          iconLeading={isHidden ? EyeOff : Eye}
          onPress={onToggleHidden}
          isDisabled={savingField === "isHidden"}
        />
      </div>

      {/* Close */}
      <Button
        color="tertiary"
        size="sm"
        iconLeading={XClose}
        onPress={onClose}
      />
    </div>
  );
}
```

**Note:** Check the exact icon names from `@untitledui/icons`. The names above may need adjustment (e.g., `CheckCircle` might be `CheckCircle01` or similar). Search the icon package:

```bash
grep -r "CheckCircle" node_modules/@untitledui/icons/dist --include="*.d.ts" | head -5
```

### Step 3: Build `TransactionDetailMerchant.tsx`

Renders merchant logo, name, normalized amount, and optional account badge.

```typescript
"use client";

import { MerchantLogo } from "@/components/credit-cards/MerchantLogo";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { formatTransactionAmount } from "@/utils/transaction-helpers";
import type { DetailPanelTransaction } from "./TransactionDetailPanel";

interface TransactionDetailMerchantProps {
  transaction: DetailPanelTransaction;
}

export function TransactionDetailMerchant({
  transaction,
}: TransactionDetailMerchantProps) {
  const { text: amountText, colorClass: amountColor } =
    formatTransactionAmount(transaction.amount, transaction.isoCurrencyCode);

  return (
    <div className="px-6 py-4">
      <div className="flex items-start justify-between">
        {/* Left: Logo + merchant name */}
        <div className="flex items-center gap-3">
          <MerchantLogo
            logoUrl={transaction.merchantEnrichment?.logoUrl}
            merchantName={transaction.merchantName}
            size="lg"
          />
          <div>
            <h3 className="text-lg font-semibold text-primary">
              {transaction.merchantName}
            </h3>
            {transaction.sourceInfo && (
              <Badge color="gray" size="sm" className="mt-1">
                {transaction.sourceInfo.displayName}
                {transaction.sourceInfo.lastFour
                  ? ` ...${transaction.sourceInfo.lastFour}`
                  : ""}
              </Badge>
            )}
          </div>
        </div>

        {/* Right: Amount */}
        <span className={`text-2xl font-bold tabular-nums ${amountColor}`}>
          {amountText}
        </span>
      </div>
    </div>
  );
}
```

### Step 4: Build `TransactionDetailFields.tsx`

Renders original statement, date picker, category dropdown, and notes textarea.

```typescript
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Copy01, Calendar, Tag01 } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import {
  TRANSACTION_CATEGORIES,
  getCategoryBadgeColor,
  formatTransactionDateFull,
  type TransactionCategory,
} from "@/types/credit-cards";
import { mapPlaidCategory } from "@/utils/transaction-helpers";
import type { DetailPanelTransaction } from "./TransactionDetailPanel";

interface TransactionDetailFieldsProps {
  transaction: DetailPanelTransaction;
  overlay: {
    notes?: string;
    userCategory?: string;
    userDate?: string;
  } | null;
  savingField: string | null;
  onUpdateField: (
    field: "notes" | "userCategory" | "userDate",
    value: string | null
  ) => void;
}

export function TransactionDetailFields({
  transaction,
  overlay,
  savingField,
  onUpdateField,
}: TransactionDetailFieldsProps) {
  // Notes state with debounced save
  const [notesValue, setNotesValue] = useState(overlay?.notes ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync notes when overlay loads/changes
  useEffect(() => {
    setNotesValue(overlay?.notes ?? "");
  }, [overlay?.notes]);

  const handleNotesChange = useCallback(
    (value: string) => {
      setNotesValue(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdateField("notes", value || null);
      }, 500);
    },
    [onUpdateField]
  );

  const handleNotesBlur = useCallback(() => {
    clearTimeout(debounceRef.current);
    onUpdateField("notes", notesValue || null);
  }, [notesValue, onUpdateField]);

  // Category
  const displayCategory = (overlay?.userCategory ??
    mapPlaidCategory(transaction.categoryPrimary)) as TransactionCategory;

  // Date
  const displayDate = overlay?.userDate ?? transaction.date;

  // Copy original statement
  const handleCopyStatement = useCallback(() => {
    navigator.clipboard.writeText(transaction.name);
  }, [transaction.name]);

  return (
    <div className="px-6 py-4 space-y-6">
      {/* Original Statement */}
      <div>
        <p className="text-xs font-medium text-tertiary uppercase tracking-wider mb-1">
          Original Statement
        </p>
        <div className="flex items-start gap-2">
          <p className="text-sm text-secondary flex-1">{transaction.name}</p>
          <Button
            color="tertiary"
            size="sm"
            iconLeading={Copy01}
            onPress={handleCopyStatement}
          />
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="text-sm font-medium text-primary block mb-1.5">
          Date
        </label>
        <Input
          type="date"
          value={displayDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onUpdateField("userDate", e.target.value || null)
          }
        />
      </div>

      {/* Category */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-primary">Category</label>
          <Button color="link" size="sm" isDisabled>
            Split
          </Button>
        </div>
        <select
          value={displayCategory}
          onChange={(e) =>
            onUpdateField("userCategory", e.target.value || null)
          }
          className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
        >
          {TRANSACTION_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm font-medium text-primary block mb-1.5">
          Notes
        </label>
        <textarea
          value={notesValue}
          onChange={(e) => handleNotesChange(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add notes to this transaction..."
          rows={3}
          className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary resize-none focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
        />
      </div>

      {/* Deferred fields */}
      <div className="space-y-4 opacity-50">
        <div>
          <label className="text-sm font-medium text-primary block mb-1.5">
            Tags
          </label>
          <div className="rounded-lg border border-secondary bg-secondary/50 px-3 py-2 text-sm text-quaternary cursor-not-allowed">
            Coming soon...
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-primary block mb-1.5">
            Attachments
          </label>
          <div className="rounded-lg border border-dashed border-secondary bg-secondary/30 px-3 py-4 text-sm text-quaternary text-center cursor-not-allowed">
            Coming soon...
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Important notes for the implementer:**
- The `Input` component from UntitledUI may have a different API than native `<input>`. Check `@repo/ui/untitledui/base/input/input` for the actual props. You may need to use the native `<input>` with Tailwind styling if UntitledUI's Input doesn't support `type="date"`.
- Same for `<select>` — UntitledUI has a `Select` component but it may use a different pattern. Check the actual component API and adjust accordingly. Using native elements with Tailwind is acceptable if the UntitledUI equivalents don't fit.
- The icon names (`Copy01`, `Calendar`, `Tag01`) need to be verified against `@untitledui/icons`. Search with: `grep -r "export.*Copy" node_modules/@untitledui/icons/dist --include="*.d.ts" | head`

### Step 5: Build `TransactionDetailActions.tsx`

Footer with "Delete transaction" (which actually hides for Plaid transactions).

```typescript
"use client";

import { Button } from "@repo/ui/untitledui/base/buttons/button";

interface TransactionDetailActionsProps {
  isHidden: boolean;
  onHide: () => void;
  savingField: string | null;
}

export function TransactionDetailActions({
  isHidden,
  onHide,
  savingField,
}: TransactionDetailActionsProps) {
  return (
    <div className="px-6 py-4 border-t border-secondary mt-auto">
      <p className="text-xs font-medium text-tertiary uppercase tracking-wider mb-3">
        Other Options
      </p>
      <Button
        color="destructive"
        size="sm"
        variant="link"
        onPress={onHide}
        isDisabled={savingField === "isHidden"}
      >
        {isHidden ? "Unhide transaction" : "Hide transaction"}
      </Button>
      <p className="text-xs text-quaternary mt-1">
        {isHidden
          ? "This transaction is currently hidden from budgets and reports."
          : "Hidden transactions are excluded from budgets and reports but remain in your list."}
      </p>
    </div>
  );
}
```

**Note:** The `Button` API may differ — UntitledUI might use `color="error"` instead of `"destructive"` and might not have a `variant` prop. Check the actual Button component API. The important thing is red text, link style.

### Step 6: Build `TransactionDetailPanel.tsx`

The main panel that composes all sub-components.

```typescript
"use client";

import { DialogTrigger } from "react-aria-components";
import { SlideoutMenu } from "@repo/ui/untitledui/application/slideout-menus/slideout-menu";
import { useTransactionOverlay } from "@/hooks/useTransactionOverlay";
import { TransactionDetailHeader } from "./TransactionDetailHeader";
import { TransactionDetailMerchant } from "./TransactionDetailMerchant";
import { TransactionDetailFields } from "./TransactionDetailFields";
import { TransactionDetailActions } from "./TransactionDetailActions";

/**
 * Unified transaction type for the detail panel
 */
export interface DetailPanelTransaction {
  transactionId: string;
  date: string;
  datetime?: string;
  name: string;
  merchantName: string;
  amount: number;
  isoCurrencyCode?: string;
  pending: boolean;
  categoryPrimary?: string;
  category: string;
  merchantEnrichment?: {
    merchantName: string;
    logoUrl?: string;
    confidenceLevel: string;
  } | null;
  sourceInfo?: {
    cardId: string;
    displayName: string;
    lastFour?: string;
    institutionName?: string;
  };
  isRecurring?: boolean;
  recurringFrequency?: string;
}

interface TransactionDetailPanelProps {
  transaction: DetailPanelTransaction | null;
  onClose: () => void;
}

/**
 * Interactive transaction detail panel
 *
 * Replaces both TransactionDetailDrawer components with a single unified panel.
 * Supports reviewed/hidden toggles, editable fields (notes, category, date),
 * and normalized amount display.
 */
export function TransactionDetailPanel({
  transaction,
  onClose,
}: TransactionDetailPanelProps) {
  const {
    overlay,
    savingField,
    upsertField,
    toggleReviewed,
    toggleHidden,
  } = useTransactionOverlay(transaction?.transactionId ?? null);

  if (!transaction) return null;

  const isReviewed = overlay?.isReviewed ?? false;
  const isHidden = overlay?.isHidden ?? false;

  return (
    <DialogTrigger
      isOpen={transaction !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <SlideoutMenu>
        {({ close }) => (
          <div className="flex flex-col h-full">
            {/* Header: Review + Hide + Close */}
            <TransactionDetailHeader
              isReviewed={isReviewed}
              isHidden={isHidden}
              savingField={savingField}
              onToggleReviewed={() => toggleReviewed(!isReviewed)}
              onToggleHidden={() => toggleHidden(!isHidden)}
              onClose={close}
            />

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Merchant: Logo, name, amount, account badge */}
              <TransactionDetailMerchant transaction={transaction} />

              {/* Editable fields: Statement, date, category, notes */}
              <TransactionDetailFields
                transaction={transaction}
                overlay={overlay}
                savingField={savingField}
                onUpdateField={upsertField}
              />
            </div>

            {/* Footer: Hide/delete action */}
            <TransactionDetailActions
              isHidden={isHidden}
              onHide={() => toggleHidden(!isHidden)}
              savingField={savingField}
            />
          </div>
        )}
      </SlideoutMenu>
    </DialogTrigger>
  );
}
```

### Step 7: Verify everything compiles

Run: `bun typecheck`
Expected: No errors

### Step 8: Commit

```bash
git add apps/app/src/components/transactions/TransactionDetailPanel.tsx apps/app/src/components/transactions/TransactionDetailHeader.tsx apps/app/src/components/transactions/TransactionDetailMerchant.tsx apps/app/src/components/transactions/TransactionDetailFields.tsx apps/app/src/components/transactions/TransactionDetailActions.tsx
git commit -m "feat(panel): add TransactionDetailPanel with editable fields and review/hide toggles"
```

---

## Task 7: Wire Panel into Transactions Page

**Files:**
- Modify: `apps/app/src/components/transactions/TransactionsContent.tsx`

**Step 1: Replace drawer import and adapt selected transaction type**

In `TransactionsContent.tsx`:

1. Replace the import:
```typescript
// Remove:
import { TransactionDetailDrawer } from "./TransactionDetailDrawer";
// Add:
import { TransactionDetailPanel, type DetailPanelTransaction } from "./TransactionDetailPanel";
```

2. Change the state type (line 37-38):
```typescript
const [selectedTransaction, setSelectedTransaction] =
  useState<DetailPanelTransaction | null>(null);
```

3. Update `handleSelectTransaction` to convert `AggregatedTransaction` → `DetailPanelTransaction`:
```typescript
import { mapPlaidCategory } from "@/utils/transaction-helpers";

const handleSelectTransaction = (transaction: AggregatedTransaction) => {
  const merchantName =
    transaction.merchantEnrichment?.merchantName ??
    transaction.merchantName ??
    transaction.name;

  setSelectedTransaction({
    transactionId: transaction.transactionId,
    date: transaction.date,
    datetime: transaction.datetime,
    name: transaction.name,
    merchantName,
    amount: transaction.amount,
    isoCurrencyCode: transaction.isoCurrencyCode,
    pending: transaction.pending,
    categoryPrimary: transaction.categoryPrimary,
    category: mapPlaidCategory(transaction.categoryPrimary),
    merchantEnrichment: transaction.merchantEnrichment,
    sourceInfo: transaction.sourceInfo,
  });
};
```

4. Replace the drawer component at the bottom (line 126-129):
```typescript
<TransactionDetailPanel
  transaction={selectedTransaction}
  onClose={handleCloseDrawer}
/>
```

**Step 2: Verify it compiles and renders**

Run: `bun typecheck`
Run: `bun dev:app` — navigate to `/transactions`, click a transaction row, verify the new panel opens.

**Step 3: Commit**

```bash
git add apps/app/src/components/transactions/TransactionsContent.tsx
git commit -m "feat(transactions): wire TransactionDetailPanel into transactions page"
```

---

## Task 8: Wire Panel into Credit Cards Page

**Files:**
- Modify: `apps/app/src/components/credit-cards/TransactionsSection.tsx`

**Step 1: Replace drawer import and adapt selected transaction type**

In `TransactionsSection.tsx`:

1. Replace imports:
```typescript
// Remove:
import { TransactionDetailDrawer } from "./TransactionDetailDrawer";
// Add:
import { TransactionDetailPanel, type DetailPanelTransaction } from "@/components/transactions/TransactionDetailPanel";
```

2. Change the state type (line 52):
```typescript
const [selectedTransaction, setSelectedTransaction] = useState<DetailPanelTransaction | null>(null);
```

3. Remove `type Transaction` from the imports at line 22 (if no longer needed elsewhere in this file). Keep `PlaidTransactionItem` and other needed types.

4. Update the row `onSelect` handler. Currently `TransactionTableRow` calls `onSelect(transaction)` with a `Transaction` type. We need to convert. Update the handler where `setSelectedTransaction` is called:

In the `AriaTableBody` section (around line 244), instead of passing `setSelectedTransaction` directly to `onSelect`, create a conversion handler:

```typescript
const handleSelectTransaction = useCallback((transaction: Transaction) => {
  setSelectedTransaction({
    transactionId: transaction.id,
    date: transaction.date,
    name: transaction.description ?? transaction.merchant,
    merchantName: transaction.merchant,
    amount: transaction.amount * 1000, // Convert back to milliunits for formatTransactionAmount
    pending: transaction.status === "Pending",
    categoryPrimary: undefined, // Already mapped in Transaction type
    category: transaction.category,
    merchantEnrichment: transaction.merchantEnrichment,
    isRecurring: transaction.isRecurring,
    recurringFrequency: transaction.recurringFrequency,
  });
}, []);
```

**Important:** The `Transaction` type's `amount` field is already in dollars (converted from milliunits in `toTransaction`). But `formatTransactionAmount` expects milliunits. We need to multiply back by 1000. This is a quirk of the current type split that should be cleaned up later. For now, this conversion works.

Also: `Transaction` type already strips the sign via `Math.abs` in `toTransaction`, so we lose income/refund detection. To properly detect refunds, we'd need the raw Plaid amount. For now, amounts from the credit-cards page will always show as expenses (no green income). This is an acceptable limitation for this task — fixing it requires changing the `Transaction` type which has a wider blast radius. Document this as a follow-up.

5. Replace the drawer component at bottom (line 267-270):
```typescript
<TransactionDetailPanel
  transaction={selectedTransaction}
  onClose={() => setSelectedTransaction(null)}
/>
```

6. Update `TransactionTableRow` onSelect to use the new handler:
```typescript
<TransactionTableRow
  key={transaction.id}
  transaction={transaction}
  onSelect={handleSelectTransaction}
/>
```

**Step 2: Verify it compiles and renders**

Run: `bun typecheck`
Run: `bun dev:app` — navigate to `/credit-cards/[cardId]`, click the Transactions tab, click a transaction row.

**Step 3: Commit**

```bash
git add apps/app/src/components/credit-cards/TransactionsSection.tsx
git commit -m "feat(credit-cards): wire TransactionDetailPanel into card detail page"
```

---

## Task 9: Delete Old Drawer Components

**Files:**
- Delete: `apps/app/src/components/transactions/TransactionDetailDrawer.tsx`
- Delete: `apps/app/src/components/credit-cards/TransactionDetailDrawer.tsx`

**Step 1: Verify no remaining imports**

Run: `grep -r "TransactionDetailDrawer" apps/app/src/ --include="*.tsx" --include="*.ts"`
Expected: No results (both consumers have been updated in Tasks 7 and 8)

**Step 2: Delete the files**

```bash
rm apps/app/src/components/transactions/TransactionDetailDrawer.tsx
rm apps/app/src/components/credit-cards/TransactionDetailDrawer.tsx
```

**Step 3: Verify no TypeScript errors**

Run: `bun typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add -u apps/app/src/components/transactions/TransactionDetailDrawer.tsx apps/app/src/components/credit-cards/TransactionDetailDrawer.tsx
git commit -m "refactor: remove old TransactionDetailDrawer components"
```

---

## Task 10: Manual Testing & Polish

**No files to create — this is a verification task.**

**Step 1: Start the dev server**

Run: `bun dev`

**Step 2: Test the transactions page (`/transactions`)**

- [ ] Click a transaction row → panel slides in
- [ ] Amount shows without negative sign (expenses: `$207.94`, income: `+$500.00` in green)
- [ ] "Mark as reviewed" button toggles state
- [ ] Hide toggle works (eye icon)
- [ ] Date field can be changed
- [ ] Category dropdown changes and persists (reload page to verify)
- [ ] Notes auto-save on blur
- [ ] Original statement shows raw Plaid text with copy button
- [ ] "Hide transaction" in footer works
- [ ] Deferred fields (tags, attachments) show as disabled
- [ ] Press Escape → panel closes
- [ ] Click X → panel closes
- [ ] Source card badge displays correctly

**Step 3: Test the credit cards page (`/credit-cards/[cardId]`)**

- [ ] Click a transaction in the Transactions tab → panel slides in
- [ ] Same functionality as above works
- [ ] Recurring transaction info still visible (if applicable)

**Step 4: Cross-page consistency**

- [ ] Open same transaction on both pages → overlay data matches
- [ ] Edit on one page, check on the other → changes persist

**Step 5: Fix any issues found during testing**

Address styling mismatches, prop API mismatches with UntitledUI, or type errors.

**Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix(panel): polish TransactionDetailPanel from manual testing"
```

---

## Known Limitations (Document, Don't Fix)

These are intentional scope limits. Do not fix them in this implementation:

1. **Credit-cards page amounts lose income detection** — The `Transaction` type strips the sign via `Math.abs`. Income transactions on the credit-cards page won't show green. Fixing requires changing the `Transaction` type (wider blast radius, separate task).

2. **No "Show hidden" filter yet** — Hidden transactions need a filter toggle in both filter bars. This is a small follow-up task but not part of the core panel.

3. **No row indicators** — Reviewed/hidden badges on list rows need batch-fetching overlays. This requires calling `getByTransactionIds` in the list components, which changes the query pattern. Separate task.

4. **Deferred features are stub UI only** — Tags, attachments, splits, goals, reviewer assignment all show disabled placeholders.

5. **No keyboard navigation between fields** — Tab behavior depends on native focus management. No custom keyboard handling added.

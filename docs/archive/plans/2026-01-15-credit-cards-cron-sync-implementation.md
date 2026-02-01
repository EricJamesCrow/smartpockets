# Credit Cards Cron Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore daily cron sync, recurring streams handling, and transaction amount conversion.

**Architecture:** Add daily cron that iterates active Plaid items and sequentially syncs transactions → liabilities → recurring streams → credit cards. Expose recurring streams actions in plaidComponent.ts. Handle RECURRING_TRANSACTIONS_UPDATE webhook. Fix transaction amounts (/1000) and add frequency mapping in frontend.

**Tech Stack:** Convex (crons, actions, scheduler), @crowdevelopment/convex-plaid component

---

### Task 1: Add Recurring Streams Actions to plaidComponent.ts

**Files:**
- Modify: `packages/backend/convex/plaidComponent.ts` (after line 360)

**Step 1: Add the public action**

Add after `fetchLiabilitiesInternal` (line 360):

```typescript
// =============================================================================
// RECURRING STREAMS ACTIONS
// =============================================================================

/**
 * Fetch recurring streams (public action for manual refresh).
 */
export const fetchRecurringStreamsAction = action({
  args: {
    plaidItemId: v.string(),
    trigger: v.optional(v.string()),
  },
  returns: v.object({
    inflows: v.number(),
    outflows: v.number(),
  }),
  handler: async (ctx, args) => {
    console.log(`🔄 Fetching recurring streams for ${args.plaidItemId} (${args.trigger ?? "manual"})`);
    const result = await getPlaid().fetchRecurringStreams(ctx, {
      plaidItemId: args.plaidItemId,
    });
    console.log(`✅ Fetched ${result.inflows} inflow, ${result.outflows} outflow streams`);
    return result;
  },
});

/**
 * Internal action for webhook/cron-triggered recurring streams sync.
 */
export const fetchRecurringStreamsInternal = internalAction({
  args: {
    plaidItemId: v.string(),
    trigger: v.optional(v.union(v.literal("webhook"), v.literal("scheduled"), v.literal("manual"))),
  },
  handler: async (ctx, args) => {
    console.log(`🔄 [Internal] Fetching recurring streams for ${args.plaidItemId} (${args.trigger ?? "internal"})`);
    const result = await getPlaid().fetchRecurringStreams(ctx, {
      plaidItemId: args.plaidItemId,
    });
    console.log(`✅ Fetched ${result.inflows} inflow, ${result.outflows} outflow streams`);
    return result;
  },
});
```

**Step 2: Verify it compiles**

Run: Check Convex dev server logs for "Convex functions ready!"
Expected: No compilation errors

**Step 3: Commit**

```bash
git add packages/backend/convex/plaidComponent.ts
git commit -m "feat(plaid): add recurring streams fetch actions"
```

---

### Task 2: Add syncAllActiveItemsInternal Action

**Files:**
- Modify: `packages/backend/convex/plaidComponent.ts` (after the recurring streams actions)

**Step 1: Add the sync orchestrator action**

```typescript
// =============================================================================
// DAILY SYNC ORCHESTRATOR
// =============================================================================

/**
 * Internal action for daily cron - syncs all active Plaid items.
 * Sequentially runs: transactions → liabilities → recurring → credit cards
 * Each step is wrapped in try/catch to continue on failure.
 */
export const syncAllActiveItemsInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all active items
    const items = await ctx.runQuery(components.plaid.public.getAllActiveItems, {});

    console.log(`🔄 Daily sync: ${items.length} active items`);

    for (const item of items) {
      const hasLiabilities = item.products?.includes("liabilities");
      const hasTransactions = item.products?.includes("transactions");
      let liabilitiesSucceeded = false;

      console.log(`\n📍 Syncing item ${item._id} (products: ${item.products?.join(", ") ?? "none"})`);

      // Step 1: Transactions
      if (hasTransactions) {
        try {
          await ctx.runAction(internal.plaidComponent.syncTransactionsInternal, {
            plaidItemId: item._id,
            trigger: "scheduled",
          });
          console.log(`  ✅ Transactions synced`);
        } catch (e) {
          console.error(`  ❌ Transactions failed:`, e);
        }
      }

      // Step 2: Liabilities
      if (hasLiabilities) {
        try {
          await ctx.runAction(internal.plaidComponent.fetchLiabilitiesInternal, {
            plaidItemId: item._id,
            trigger: "scheduled",
          });
          liabilitiesSucceeded = true;
          console.log(`  ✅ Liabilities synced`);
        } catch (e) {
          console.error(`  ❌ Liabilities failed:`, e);
        }
      }

      // Step 3: Recurring Streams
      if (hasTransactions) {
        try {
          await ctx.runAction(internal.plaidComponent.fetchRecurringStreamsInternal, {
            plaidItemId: item._id,
            trigger: "scheduled",
          });
          console.log(`  ✅ Recurring streams synced`);
        } catch (e) {
          console.error(`  ❌ Recurring streams failed:`, e);
        }
      }

      // Step 4: Credit Cards denormalization (only if liabilities succeeded)
      if (liabilitiesSucceeded) {
        try {
          await ctx.runAction(internal.creditCards.actions.syncCreditCardsInternal, {
            userId: item.userId,
            plaidItemId: item._id,
          });
          console.log(`  ✅ Credit cards synced`);
        } catch (e) {
          console.error(`  ❌ Credit cards failed:`, e);
        }
      }
    }

    console.log(`\n✅ Daily sync complete`);
  },
});
```

**Step 2: Verify it compiles**

Run: Check Convex dev server logs
Expected: "Convex functions ready!" with no errors

**Step 3: Commit**

```bash
git add packages/backend/convex/plaidComponent.ts
git commit -m "feat(plaid): add daily sync orchestrator action"
```

---

### Task 3: Create Crons File

**Files:**
- Create: `packages/backend/convex/crons.ts`

**Step 1: Create the crons file**

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Daily Plaid Sync
 * Triggers at 2 AM UTC every day.
 * Syncs all active plaidItems: transactions → liabilities → recurring → credit cards
 */
crons.daily(
  "Daily Plaid Sync",
  { hourUTC: 2, minuteUTC: 0 },
  internal.plaidComponent.syncAllActiveItemsInternal
);

export default crons;
```

**Step 2: Verify cron registration**

Run: Check Convex dashboard → Functions → Crons
Expected: "Daily Plaid Sync" cron job visible

**Step 3: Commit**

```bash
git add packages/backend/convex/crons.ts
git commit -m "feat(crons): add daily Plaid sync cron job"
```

---

### Task 4: Add Webhook Handler for Recurring Transactions

**Files:**
- Modify: `packages/backend/convex/http.ts` (line ~205, inside TRANSACTIONS block)

**Step 1: Add the webhook handler**

Find this block (around line 202-206):
```typescript
        } else if (webhook_code === "INITIAL_UPDATE" || webhook_code === "HISTORICAL_UPDATE") {
          // These are informational - initial sync already handles them
          console.log(`[Webhook] ${webhook_code} - informational only`);
        }
```

Add before the closing `}` of the TRANSACTIONS block:
```typescript
        } else if (webhook_code === "RECURRING_TRANSACTIONS_UPDATE") {
          console.log("[Webhook] Scheduling recurring streams sync...");
          await ctx.scheduler.runAfter(0, internal.plaidComponent.fetchRecurringStreamsInternal, {
            plaidItemId: plaidItem._id,
            trigger: "webhook",
          });
        }
```

The full block should now be:
```typescript
        } else if (webhook_code === "INITIAL_UPDATE" || webhook_code === "HISTORICAL_UPDATE") {
          // These are informational - initial sync already handles them
          console.log(`[Webhook] ${webhook_code} - informational only`);
        } else if (webhook_code === "RECURRING_TRANSACTIONS_UPDATE") {
          console.log("[Webhook] Scheduling recurring streams sync...");
          await ctx.scheduler.runAfter(0, internal.plaidComponent.fetchRecurringStreamsInternal, {
            plaidItemId: plaidItem._id,
            trigger: "webhook",
          });
        }
```

**Step 2: Verify it compiles**

Run: Check Convex dev server logs
Expected: "Convex functions ready!" with no errors

**Step 3: Commit**

```bash
git add packages/backend/convex/http.ts
git commit -m "feat(webhook): handle RECURRING_TRANSACTIONS_UPDATE"
```

---

### Task 5: Add predictedNextDate to Stream Transform

**Files:**
- Modify: `packages/backend/convex/transactions/queries.ts` (line ~97)

**Step 1: Add predictedNextDate to transformed streams**

Find this line (around line 97):
```typescript
      firstDate: stream.firstDate,
```

Add after it:
```typescript
      predictedNextDate: stream.predictedNextDate,
```

**Step 2: Verify it compiles**

Run: Check Convex dev server logs
Expected: No errors

**Step 3: Commit**

```bash
git add packages/backend/convex/transactions/queries.ts
git commit -m "feat(transactions): pass predictedNextDate in stream transform"
```

---

### Task 6: Update PlaidTransactionItem Type

**Files:**
- Modify: `apps/app/src/types/credit-cards.ts` (around line 418)

**Step 1: Add missing fields to PlaidTransactionItem**

Find the `PlaidTransactionItem` interface (line 418) and add these fields after existing ones (before the closing `}`):

```typescript
  // Recurring stream fields
  type?: "transaction" | "recurring";
  frequency?: string;
  predictedNextDate?: string;
  status?: string;
  streamType?: string;
  averageAmount?: number;
  firstDate?: string;
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/app && npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add apps/app/src/types/credit-cards.ts
git commit -m "types(credit-cards): add recurring stream fields to PlaidTransactionItem"
```

---

### Task 7: Expand recurringFrequency Type

**Files:**
- Modify: `apps/app/src/types/credit-cards.ts` (line 499)

**Step 1: Update the type**

Find (line 499):
```typescript
  recurringFrequency?: "Monthly" | "Weekly" | "Annual";
```

Replace with:
```typescript
  recurringFrequency?: "Weekly" | "Biweekly" | "Twice Monthly" | "Monthly" | "Annual" | "Recurring";
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/app && npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add apps/app/src/types/credit-cards.ts
git commit -m "types(credit-cards): expand recurringFrequency to include all Plaid values"
```

---

### Task 8: Update toTransaction Function

**Files:**
- Modify: `apps/app/src/types/credit-cards.ts` (line ~620-645)

**Step 1: Update the toTransaction function**

Find the `toTransaction` function and replace its implementation:

```typescript
export function toTransaction(
  plaidTx: PlaidTransactionItem,
  cardId: string
): Transaction {
  const isRecurring = plaidTx.type === "recurring";

  // Map Plaid frequency to UI label
  const frequency: Transaction["recurringFrequency"] = isRecurring && plaidTx.frequency
    ? plaidTx.frequency === "WEEKLY" ? "Weekly"
      : plaidTx.frequency === "BIWEEKLY" ? "Biweekly"
      : plaidTx.frequency === "SEMI_MONTHLY" ? "Twice Monthly"
      : plaidTx.frequency === "MONTHLY" ? "Monthly"
      : plaidTx.frequency === "ANNUALLY" ? "Annual"
      : "Recurring"
    : undefined;

  return {
    id: plaidTx.transactionId,
    cardId,
    date: plaidTx.date,
    merchant:
      plaidTx.merchantEnrichment?.merchantName ??
      plaidTx.merchantName ??
      plaidTx.name,
    category: mapPlaidCategory(plaidTx.categoryPrimary),
    amount: Math.abs(plaidTx.amount) / 1000, // Convert milliunits to dollars
    status: plaidTx.pending ? "Pending" : "Posted",
    description:
      plaidTx.name !== plaidTx.merchantName ? plaidTx.name : undefined,
    isRecurring,
    recurringFrequency: frequency,
    nextChargeDate: plaidTx.predictedNextDate,
    merchantEnrichment: plaidTx.merchantEnrichment,
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/app && npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add apps/app/src/types/credit-cards.ts
git commit -m "fix(credit-cards): convert amounts /1000 and map all frequencies"
```

---

### Task 9: Verify End-to-End

**Step 1: Check Convex dashboard**

- Navigate to Convex dashboard → Functions → Crons
- Verify "Daily Plaid Sync" is registered

**Step 2: Test manual recurring streams fetch**

- In Convex dashboard → Functions → Actions
- Find `plaidComponent:fetchRecurringStreamsAction`
- Run with a valid `plaidItemId`
- Expected: Returns `{ inflows: N, outflows: M }`

**Step 3: Test UI display**

- Navigate to credit cards detail page
- View transactions
- Expected:
  - Amounts display correctly (e.g., $7.00 not $7000)
  - Recurring transactions show frequency badge
  - Next charge date shows if available

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(credit-cards): complete cron sync and recurring streams implementation"
```

---

## Verification Checklist

- [ ] Convex functions compile without errors
- [ ] "Daily Plaid Sync" cron visible in dashboard
- [ ] `fetchRecurringStreamsAction` runs successfully
- [ ] Webhook handler recognizes RECURRING_TRANSACTIONS_UPDATE
- [ ] Transaction amounts display correctly (/1000)
- [ ] Recurring transactions show frequency badge
- [ ] TypeScript compiles without errors

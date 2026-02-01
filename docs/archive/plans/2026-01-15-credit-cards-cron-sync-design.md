# Credit Cards Cron Sync Design

Restore daily cron sync, recurring streams handling, and transaction amount conversion without modifying @crowdevelopment/convex-plaid.

## Files to Modify

| File | Change |
|------|--------|
| `packages/backend/convex/crons.ts` | Add daily cron job (2 AM UTC) |
| `packages/backend/convex/plaidComponent.ts` | Add `syncAllActiveItemsInternal`, `fetchRecurringStreamsAction`, `fetchRecurringStreamsInternal` |
| `packages/backend/convex/http.ts` | Handle `RECURRING_TRANSACTIONS_UPDATE` webhook |
| `packages/backend/convex/transactions/queries.ts` | Add `predictedNextDate` to stream transform |
| `apps/app/src/types/credit-cards.ts` | Amount /1000 conversion, frequency mapping, type updates |

## Implementation

### 1. Daily Cron Job

**File:** `packages/backend/convex/crons.ts`

```typescript
crons.daily(
  'Daily Plaid Sync',
  { hourUTC: 2, minuteUTC: 0 },
  internal.plaidComponent.syncAllActiveItemsInternal
);
```

### 2. Sync All Active Items Action

**File:** `packages/backend/convex/plaidComponent.ts`

```typescript
export const syncAllActiveItemsInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.runQuery(components.plaid.public.getAllActiveItems, {});

    console.log(`🔄 Daily sync: ${items.length} active items`);

    for (const item of items) {
      const hasLiabilities = item.products?.includes('liabilities');
      const hasTransactions = item.products?.includes('transactions');
      let liabilitiesSucceeded = false;

      // Step 1: Transactions
      if (hasTransactions) {
        try {
          await ctx.runAction(internal.plaidComponent.syncTransactionsInternal, {
            plaidItemId: item._id,
            trigger: 'scheduled',
          });
        } catch (e) {
          console.error(`❌ Transactions failed for ${item._id}:`, e);
        }
      }

      // Step 2: Liabilities
      if (hasLiabilities) {
        try {
          await ctx.runAction(internal.plaidComponent.fetchLiabilitiesInternal, {
            plaidItemId: item._id,
            trigger: 'scheduled',
          });
          liabilitiesSucceeded = true;
        } catch (e) {
          console.error(`❌ Liabilities failed for ${item._id}:`, e);
        }
      }

      // Step 3: Recurring Streams
      if (hasTransactions) {
        try {
          await ctx.runAction(internal.plaidComponent.fetchRecurringStreamsInternal, {
            plaidItemId: item._id,
            trigger: 'scheduled',
          });
        } catch (e) {
          console.error(`❌ Recurring streams failed for ${item._id}:`, e);
        }
      }

      // Step 4: Credit Cards denormalization (only if liabilities succeeded)
      if (liabilitiesSucceeded) {
        try {
          await ctx.runAction(internal.creditCards.actions.syncCreditCardsInternal, {
            userId: item.userId,
            plaidItemId: item._id,
          });
        } catch (e) {
          console.error(`❌ Credit cards sync failed for ${item._id}:`, e);
        }
      }
    }

    console.log(`✅ Daily sync complete`);
  },
});
```

### 3. Recurring Streams Actions

**File:** `packages/backend/convex/plaidComponent.ts`

```typescript
export const fetchRecurringStreamsAction = action({
  args: {
    plaidItemId: v.string(),
    trigger: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`🔄 Fetching recurring streams for ${args.plaidItemId} (${args.trigger ?? 'manual'})`);

    const result = await getPlaid().fetchRecurringStreams(ctx, {
      plaidItemId: args.plaidItemId,
    });

    console.log(`✅ Fetched ${result.inflows} inflow, ${result.outflows} outflow streams`);
    return result;
  },
});

export const fetchRecurringStreamsInternal = internalAction({
  args: {
    plaidItemId: v.string(),
    trigger: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`🔄 [Internal] Fetching recurring streams for ${args.plaidItemId} (${args.trigger ?? 'internal'})`);

    const result = await getPlaid().fetchRecurringStreams(ctx, {
      plaidItemId: args.plaidItemId,
    });

    console.log(`✅ Fetched ${result.inflows} inflow, ${result.outflows} outflow streams`);
    return result;
  },
});
```

### 4. Webhook Handling

**File:** `packages/backend/convex/http.ts`

Inside the `if (webhook_type === "TRANSACTIONS")` block, add:

```typescript
else if (webhook_code === "RECURRING_TRANSACTIONS_UPDATE") {
  console.log("[Webhook] Scheduling recurring streams sync...");
  await ctx.scheduler.runAfter(0, internal.plaidComponent.fetchRecurringStreamsInternal, {
    plaidItemId: plaidItem._id,
    trigger: "webhook",
  });
}
```

### 5. Stream Transform Update

**File:** `packages/backend/convex/transactions/queries.ts` (~line 66)

Add `predictedNextDate` to the stream transform:

```typescript
const transformedStreams = streams.map((stream) => ({
  // ... existing fields
  predictedNextDate: stream.predictedNextDate,
}));
```

### 6. Transaction Amount Conversion & Frequency Mapping

**File:** `apps/app/src/types/credit-cards.ts`

Update `PlaidTransactionItem` interface:

```typescript
export interface PlaidTransactionItem {
  // ... existing fields
  frequency?: string;
  predictedNextDate?: string;
}
```

Expand `Transaction.recurringFrequency` type:

```typescript
recurringFrequency?: "Weekly" | "Biweekly" | "Twice Monthly" | "Monthly" | "Annual" | "Recurring";
```

Update `toTransaction()`:

```typescript
export function toTransaction(plaidTx: PlaidTransactionItem, cardId: string): Transaction {
  const isRecurring = plaidTx.type === "recurring";

  const frequency = isRecurring && "frequency" in plaidTx
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
    merchant: plaidTx.merchantEnrichment?.merchantName ?? plaidTx.merchantName ?? plaidTx.name,
    category: mapPlaidCategory(plaidTx.categoryPrimary),
    amount: Math.abs(plaidTx.amount) / 1000, // Convert milliunits to dollars
    status: plaidTx.pending ? "Pending" : "Posted",
    description: plaidTx.name !== plaidTx.merchantName ? plaidTx.name : undefined,
    isRecurring,
    recurringFrequency: frequency,
    nextChargeDate: "predictedNextDate" in plaidTx ? plaidTx.predictedNextDate : undefined,
    merchantEnrichment: plaidTx.merchantEnrichment,
  };
}
```

## Verification

1. **Cron registration:** Check Convex dashboard shows "Daily Plaid Sync" cron
2. **Manual test:** Call `fetchRecurringStreamsAction` from Convex dashboard
3. **Webhook test:** Trigger a Plaid sandbox webhook for `RECURRING_TRANSACTIONS_UPDATE`
4. **UI check:** View transactions - recurring ones should show frequency badge and next charge date
5. **Amount check:** Transaction amounts display correctly in dollars (not milliunits)

## Future Hardening (Out of Scope)

- Add ownership checks in `transactions/queries.ts`
- Tighten credit card sync mutations to prevent cross-user writes

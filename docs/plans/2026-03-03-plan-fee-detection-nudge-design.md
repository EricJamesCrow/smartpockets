# Plan Fee Auto-Detection Nudge

**Date:** 2026-03-03
**Status:** Approved
**Scope:** Detect installment plan fee transactions and enhance the ISB guard nudge message

## Problem

When `payOverTimeEnabled` is true but no plans are entered, the ISB guard shows a generic "Enter your Pay Over Time plans below" message. For cards where plan fee transactions are visible in the transaction history, we can be more specific — the user clearly has active plans, and we can tell them we noticed.

## Solution

Add plan fee transaction detection to the existing `computeInterestSavingBalance` query and conditionally improve the ISB guard subtitle.

## Detection Logic

- **Issuer gate:** Only scan transactions when `card.company` is `"chase"` (case-insensitive)
- **Name match:** Transaction `name` starts with `"PLAN FEE"` (case-insensitive)
- **Data source:** Same `components.plaid.public.getTransactionsByAccount` used by `computeYtdFeesInterest`
- **Return field:** `hasPlanFeeTransactions: boolean` added to `computeInterestSavingBalance` return value

Future: Add patterns for other issuers (Amex "Pay It Plan It", Citi "Flex Plan") when the user has those cards.

## Backend Change

**File:** `packages/backend/convex/creditCards/queries.ts` — `computeInterestSavingBalance`

Add to return type:
```
hasPlanFeeTransactions: v.boolean()
```

After the existing promo/installment queries, add:
```
let hasPlanFeeTransactions = false;
if (card.company?.toLowerCase() === "chase" && !hasPromos) {
  const transactions = await ctx.runQuery(
    components.plaid.public.getTransactionsByAccount,
    { accountId: card.accountId },
  );
  hasPlanFeeTransactions = transactions.some(
    (tx) => tx.name?.toUpperCase().startsWith("PLAN FEE"),
  );
}
```

Note: We skip the scan entirely when `hasPromos` is true (plans already entered — no nudge needed) or when the issuer isn't Chase.

## Frontend Change

**File:** `apps/app/src/components/credit-cards/details/InterestSavingBalance.tsx`

In the POT guard block (the `payOverTimeEnabled && !data.hasPromos` branch), change the subtitle text:

```tsx
<p className="mt-1 text-xs text-utility-brand-700">
  {data.hasPlanFeeTransactions
    ? "We detected plan fees in your transactions — enter your plans below for an accurate interest saving balance"
    : "Enter your Pay Over Time plans below to see your accurate interest saving balance"}
</p>
```

## No New Components

This is a 2-file change: one query modification, one text conditional.

## Edge Cases

- **No transactions yet:** `hasPlanFeeTransactions` is false — shows generic message (correct)
- **Plans already entered:** Scan is skipped (`!hasPromos` guard) — ISB shows computed balance (correct)
- **Non-Chase card with POT:** Scan is skipped — shows generic message (correct)
- **Chase card without POT:** POT guard doesn't trigger — ISB shows current balance (correct)

# Enhanced Credit Card Details Tab — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the credit card Details tab into a statement-styled layout with 6 sections: balance reconciliation, color-coded APR breakdown, promo rate tracker, interest saving balance, YTD fees/interest, and Pay Over Time — backed by 3 new Convex tables and computed queries.

**Architecture:** The Details tab (`CardDetailsTab.tsx`) is rebuilt as an orchestrator that queries additional Convex tables (`statementSnapshots`, `promoRates`, `installmentPlans`) alongside the existing `creditCards` data. Computed values (Interest Saving Balance, YTD totals) are reactive Convex queries. All user-entered data (promo rates, installment plans, statement config) goes through standard Convex mutations with client-side validation.

**Tech Stack:** Convex (backend/DB), convex-ents (ORM), React 19, TypeScript, Tailwind CSS v4, motion/react (animations), UntitledUI components

**Design doc:** `docs/plans/2026-03-03-enhanced-credit-card-details-tab-design.md`

---

## Task 1: Add new tables to Convex schema

**Files:**
- Modify: `packages/backend/convex/schema.ts:116` (after creditCards table, before wallets)

**Step 1: Add `statementSnapshots`, `promoRates`, and `installmentPlans` tables**

Add these three table definitions after the `creditCards` table (after line 116) and before `// === WALLETS ===`:

```ts
        // === CREDIT CARD DETAILS ===
        statementSnapshots: defineEnt({
            statementDate: v.string(),
            previousBalance: v.number(),
            paymentsAndCredits: v.number(),
            newPurchases: v.number(),
            fees: v.number(),
            interestCharged: v.number(),
            newBalance: v.number(),
            minimumPaymentDue: v.number(),
            dueDate: v.string(),
            source: v.union(v.literal("manual"), v.literal("inferred")),
        })
            .edge("user")
            .edge("creditCard")
            .index("by_card", ["creditCardId"])
            .index("by_card_date", ["creditCardId", "statementDate"]),

        promoRates: defineEnt({
            description: v.string(),
            aprPercentage: v.number(),
            originalBalance: v.number(),
            remainingBalance: v.number(),
            startDate: v.string(),
            expirationDate: v.string(),
            isDeferredInterest: v.boolean(),
            accruedDeferredInterest: v.optional(v.number()),
            monthlyMinimumPayment: v.optional(v.number()),
            isActive: v.boolean(),
        })
            .edge("user")
            .edge("creditCard")
            .index("by_card", ["creditCardId"]),

        installmentPlans: defineEnt({
            description: v.string(),
            startDate: v.string(),
            originalPrincipal: v.number(),
            remainingPrincipal: v.number(),
            totalPayments: v.number(),
            remainingPayments: v.number(),
            monthlyPrincipal: v.number(),
            monthlyFee: v.number(),
            aprPercentage: v.number(),
            isActive: v.boolean(),
        })
            .edge("user")
            .edge("creditCard")
            .index("by_card", ["creditCardId"]),
```

**Step 2: Add new optional fields to `creditCards` table**

Add these fields inside the `creditCards` `defineEnt({...})` block, after `autoPayEnabledAt` (around line 110):

```ts
            // Statement & issuer config
            statementClosingDay: v.optional(v.number()),
            payOverTimeEnabled: v.optional(v.boolean()),
            payOverTimeLimit: v.optional(v.number()),
            payOverTimeApr: v.optional(v.number()),
```

Also add edges to the new tables after the existing `.edges("walletCards", { ref: true })` line:

```ts
            .edges("statementSnapshots", { ref: true })
            .edges("promoRates", { ref: true })
            .edges("installmentPlans", { ref: true })
```

**Step 3: Verify schema deploys**

Run: `cd packages/backend && npx convex dev --once`
Expected: Schema pushes successfully with no errors.

**Step 4: Commit**

```
feat(schema): add statementSnapshots, promoRates, installmentPlans tables

Add 3 new Convex tables for the enhanced credit card details tab:
- statementSnapshots: historical balance state per billing cycle
- promoRates: promotional APR tracking with expiration dates
- installmentPlans: Equal Pay / installment plan breakdowns

Also add statementClosingDay, payOverTimeEnabled, payOverTimeLimit,
payOverTimeApr fields to the creditCards table.
```

---

## Task 2: Create statement snapshots CRUD

**Files:**
- Create: `packages/backend/convex/statementSnapshots/queries.ts`
- Create: `packages/backend/convex/statementSnapshots/mutations.ts`

**Step 1: Create queries file**

Create `packages/backend/convex/statementSnapshots/queries.ts`:

```ts
import { v } from "convex/values";
import { query } from "../functions";

export const listByCard = query({
  args: {
    creditCardId: v.id("creditCards"),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(args.creditCardId);
    if (card.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }
    const snapshots = await ctx
      .table("statementSnapshots")
      .filter((q) => q.eq(q.field("creditCardId"), args.creditCardId))
      .order("desc");
    return snapshots;
  },
});

export const getLatest = query({
  args: {
    creditCardId: v.id("creditCards"),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(args.creditCardId);
    if (card.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }
    const snapshots = await ctx
      .table("statementSnapshots")
      .filter((q) => q.eq(q.field("creditCardId"), args.creditCardId))
      .order("desc")
      .take(2);
    return {
      current: snapshots[0] ?? null,
      previous: snapshots[1] ?? null,
    };
  },
});

export const getByDate = query({
  args: {
    creditCardId: v.id("creditCards"),
    statementDate: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(args.creditCardId);
    if (card.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }
    const snapshots = await ctx
      .table("statementSnapshots")
      .filter((q) =>
        q.and(
          q.eq(q.field("creditCardId"), args.creditCardId),
          q.eq(q.field("statementDate"), args.statementDate),
        ),
      );
    return snapshots[0] ?? null;
  },
});
```

**Step 2: Create mutations file**

Create `packages/backend/convex/statementSnapshots/mutations.ts`:

```ts
import { v } from "convex/values";
import { mutation, internalMutation } from "../functions";

export const create = mutation({
  args: {
    creditCardId: v.id("creditCards"),
    statementDate: v.string(),
    previousBalance: v.number(),
    paymentsAndCredits: v.number(),
    newPurchases: v.number(),
    fees: v.number(),
    interestCharged: v.number(),
    newBalance: v.number(),
    minimumPaymentDue: v.number(),
    dueDate: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(args.creditCardId);
    if (card.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }
    return await ctx.table("statementSnapshots").insert({
      ...args,
      userId: viewer._id,
      source: "manual" as const,
    });
  },
});

export const update = mutation({
  args: {
    snapshotId: v.id("statementSnapshots"),
    previousBalance: v.optional(v.number()),
    paymentsAndCredits: v.optional(v.number()),
    newPurchases: v.optional(v.number()),
    fees: v.optional(v.number()),
    interestCharged: v.optional(v.number()),
    newBalance: v.optional(v.number()),
    minimumPaymentDue: v.optional(v.number()),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const snapshot = await ctx
      .table("statementSnapshots")
      .getX(args.snapshotId);
    if (snapshot.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }
    const { snapshotId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await snapshot.patch(filtered);
  },
});

export const remove = mutation({
  args: {
    snapshotId: v.id("statementSnapshots"),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const snapshot = await ctx
      .table("statementSnapshots")
      .getX(args.snapshotId);
    if (snapshot.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }
    await snapshot.delete();
  },
});

export const createInferredInternal = internalMutation({
  args: {
    userId: v.id("users"),
    creditCardId: v.id("creditCards"),
    statementDate: v.string(),
    newBalance: v.number(),
    minimumPaymentDue: v.number(),
    dueDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for existing snapshot on this date
    const existing = await ctx
      .table("statementSnapshots")
      .filter((q) =>
        q.and(
          q.eq(q.field("creditCardId"), args.creditCardId),
          q.eq(q.field("statementDate"), args.statementDate),
        ),
      );
    if (existing.length > 0) return existing[0]._id;

    return await ctx.table("statementSnapshots").insert({
      ...args,
      previousBalance: 0,
      paymentsAndCredits: 0,
      newPurchases: 0,
      fees: 0,
      interestCharged: 0,
      source: "inferred" as const,
    });
  },
});
```

**Step 3: Verify Convex functions register**

Run: `cd packages/backend && npx convex dev --once`
Expected: Functions register without errors.

**Step 4: Commit**

```
feat(backend): add statementSnapshots queries and mutations

CRUD operations for statement snapshots with auth checks.
Includes createInferredInternal for automated snapshot creation
from Plaid sync data.
```

---

## Task 3: Create promo rates CRUD

**Files:**
- Create: `packages/backend/convex/promoRates/queries.ts`
- Create: `packages/backend/convex/promoRates/mutations.ts`

**Step 1: Create queries file**

Create `packages/backend/convex/promoRates/queries.ts`:

```ts
import { v } from "convex/values";
import { query } from "../functions";

export const listByCard = query({
  args: {
    creditCardId: v.id("creditCards"),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(args.creditCardId);
    if (card.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }
    return await ctx
      .table("promoRates")
      .filter((q) =>
        q.and(
          q.eq(q.field("creditCardId"), args.creditCardId),
          q.eq(q.field("isActive"), true),
        ),
      );
  },
});
```

**Step 2: Create mutations file**

Create `packages/backend/convex/promoRates/mutations.ts`:

```ts
import { v } from "convex/values";
import { mutation } from "../functions";

export const create = mutation({
  args: {
    creditCardId: v.id("creditCards"),
    description: v.string(),
    aprPercentage: v.number(),
    originalBalance: v.number(),
    remainingBalance: v.number(),
    startDate: v.string(),
    expirationDate: v.string(),
    isDeferredInterest: v.boolean(),
    accruedDeferredInterest: v.optional(v.number()),
    monthlyMinimumPayment: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(args.creditCardId);
    if (card.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }
    return await ctx.table("promoRates").insert({
      ...args,
      userId: viewer._id,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    promoRateId: v.id("promoRates"),
    description: v.optional(v.string()),
    aprPercentage: v.optional(v.number()),
    remainingBalance: v.optional(v.number()),
    expirationDate: v.optional(v.string()),
    accruedDeferredInterest: v.optional(v.number()),
    monthlyMinimumPayment: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const promo = await ctx.table("promoRates").getX(args.promoRateId);
    if (promo.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }
    const { promoRateId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await promo.patch(filtered);
  },
});

export const remove = mutation({
  args: {
    promoRateId: v.id("promoRates"),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const promo = await ctx.table("promoRates").getX(args.promoRateId);
    if (promo.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }
    await promo.patch({ isActive: false });
  },
});
```

**Step 3: Verify functions register**

Run: `cd packages/backend && npx convex dev --once`
Expected: Functions register without errors.

**Step 4: Commit**

```
feat(backend): add promoRates queries and mutations

CRUD for promotional APR tracking with auth checks.
Soft delete via isActive flag.
```

---

## Task 4: Create installment plans CRUD

**Files:**
- Create: `packages/backend/convex/installmentPlans/queries.ts`
- Create: `packages/backend/convex/installmentPlans/mutations.ts`

**Step 1: Create queries file**

Create `packages/backend/convex/installmentPlans/queries.ts`:

```ts
import { v } from "convex/values";
import { query } from "../functions";

export const listByCard = query({
  args: {
    creditCardId: v.id("creditCards"),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(args.creditCardId);
    if (card.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }
    return await ctx
      .table("installmentPlans")
      .filter((q) =>
        q.and(
          q.eq(q.field("creditCardId"), args.creditCardId),
          q.eq(q.field("isActive"), true),
        ),
      );
  },
});
```

**Step 2: Create mutations file**

Create `packages/backend/convex/installmentPlans/mutations.ts`:

```ts
import { v } from "convex/values";
import { mutation } from "../functions";

export const create = mutation({
  args: {
    creditCardId: v.id("creditCards"),
    description: v.string(),
    startDate: v.string(),
    originalPrincipal: v.number(),
    remainingPrincipal: v.number(),
    totalPayments: v.number(),
    remainingPayments: v.number(),
    monthlyPrincipal: v.number(),
    monthlyFee: v.number(),
    aprPercentage: v.number(),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(args.creditCardId);
    if (card.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }
    return await ctx.table("installmentPlans").insert({
      ...args,
      userId: viewer._id,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    planId: v.id("installmentPlans"),
    description: v.optional(v.string()),
    remainingPrincipal: v.optional(v.number()),
    remainingPayments: v.optional(v.number()),
    monthlyPrincipal: v.optional(v.number()),
    monthlyFee: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const plan = await ctx.table("installmentPlans").getX(args.planId);
    if (plan.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }
    const { planId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await plan.patch(filtered);
  },
});

export const remove = mutation({
  args: {
    planId: v.id("installmentPlans"),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const plan = await ctx.table("installmentPlans").getX(args.planId);
    if (plan.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }
    await plan.patch({ isActive: false });
  },
});
```

**Step 3: Verify functions register**

Run: `cd packages/backend && npx convex dev --once`
Expected: Functions register without errors.

**Step 4: Commit**

```
feat(backend): add installmentPlans queries and mutations

CRUD for installment plan tracking (Equal Pay, My Chase Plan, etc.)
with auth checks and soft delete.
```

---

## Task 5: Add computed queries (Interest Saving Balance, YTD Fees/Interest)

**Files:**
- Modify: `packages/backend/convex/creditCards/queries.ts` (add two new queries)

**Step 1: Add `computeInterestSavingBalance` query**

Add to `packages/backend/convex/creditCards/queries.ts`:

```ts
export const computeInterestSavingBalance = query({
  args: {
    creditCardId: v.id("creditCards"),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(args.creditCardId);
    if (card.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }

    const currentBalance = card.currentBalance ?? 0;

    // Sum all active promo balances and their minimum payments
    const promos = await ctx
      .table("promoRates")
      .filter((q) =>
        q.and(
          q.eq(q.field("creditCardId"), args.creditCardId),
          q.eq(q.field("isActive"), true),
        ),
      );

    const installments = await ctx
      .table("installmentPlans")
      .filter((q) =>
        q.and(
          q.eq(q.field("creditCardId"), args.creditCardId),
          q.eq(q.field("isActive"), true),
        ),
      );

    const totalPromoBalances = promos.reduce(
      (sum, p) => sum + p.remainingBalance,
      0,
    );
    const totalPromoMinPayments = promos.reduce(
      (sum, p) => sum + (p.monthlyMinimumPayment ?? 0),
      0,
    );
    const totalInstallmentBalances = installments.reduce(
      (sum, p) => sum + p.remainingPrincipal,
      0,
    );
    const totalInstallmentPayments = installments.reduce(
      (sum, p) => sum + p.monthlyPrincipal + p.monthlyFee,
      0,
    );

    const totalProtectedBalances = totalPromoBalances + totalInstallmentBalances;
    const totalProtectedPayments =
      totalPromoMinPayments + totalInstallmentPayments;

    // Interest Saving Balance = current balance - promo/installment balances + their required payments
    const interestSavingBalance =
      currentBalance - totalProtectedBalances + totalProtectedPayments;

    return {
      interestSavingBalance: Math.max(0, interestSavingBalance),
      currentBalance,
      totalProtectedBalances,
      totalProtectedPayments,
      hasPromos: promos.length > 0 || installments.length > 0,
    };
  },
});
```

**Step 2: Add `computeYtdFeesInterest` query**

This query uses the Plaid component's transaction data. Add to the same file:

```ts
export const computeYtdFeesInterest = query({
  args: {
    creditCardId: v.id("creditCards"),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(args.creditCardId);
    if (card.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }

    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;

    // Fetch transactions from the Plaid component
    const allTransactions = await ctx.runQuery(
      ctx.component(api.plaid.public.getTransactionsByAccount),
      { accountId: card.accountId },
    );

    // Filter to current year
    const ytdTransactions = allTransactions.filter(
      (tx: { date: string }) => tx.date >= yearStart,
    );

    // Categorize by Plaid category
    let totalFees = 0;
    let totalInterest = 0;

    for (const tx of ytdTransactions) {
      const category = (tx as { categoryPrimary?: string }).categoryPrimary;
      const amount = Math.abs((tx as { amount: number }).amount) / 1000; // milliunits to dollars

      if (category === "BANK_FEES") {
        totalFees += amount;
      } else if (category === "INTEREST") {
        totalInterest += amount;
      }
    }

    return {
      totalFees: Math.round(totalFees * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      year: currentYear,
    };
  },
});
```

**Important note:** The `computeYtdFeesInterest` query calls into the Plaid component's public API. You'll need to check the exact import path for the Plaid component API — look at how `getTransactionsAndStreamsByAccountId` in `packages/backend/convex/transactions/queries.ts` references `components.plaid.public.getTransactionsByAccount`. Follow that exact pattern. If the component API doesn't support direct query composition, this may need to be restructured as a query that calls the component via `ctx.runQuery`. Check the Convex ents/component docs for the correct pattern.

**Step 3: Verify queries register**

Run: `cd packages/backend && npx convex dev --once`
Expected: Functions register without errors.

**Step 4: Commit**

```
feat(backend): add computed queries for ISB and YTD fees/interest

computeInterestSavingBalance: reactive query that calculates
the minimum payment to avoid interest on next month's purchases.
computeYtdFeesInterest: scans transaction history to compute
year-to-date fee and interest totals.
```

---

## Task 6: Update creditCards mutations for new fields

**Files:**
- Modify: `packages/backend/convex/creditCards/mutations.ts:190-235` (the `update` mutation)

**Step 1: Add new fields to the `update` mutation args**

In the `update` mutation's `args` object, add:

```ts
    statementClosingDay: v.optional(v.number()),
    payOverTimeEnabled: v.optional(v.boolean()),
    payOverTimeLimit: v.optional(v.number()),
    payOverTimeApr: v.optional(v.number()),
```

These follow the same optional-field-patching pattern the mutation already uses — undefined values are filtered out before `card.patch()`.

**Step 2: Verify mutation registers**

Run: `cd packages/backend && npx convex dev --once`
Expected: Functions register without errors.

**Step 3: Commit**

```
feat(backend): add statement config fields to creditCards update mutation

Allow setting statementClosingDay, payOverTimeEnabled,
payOverTimeLimit, payOverTimeApr via the existing update mutation.
```

---

## Task 7: Build the AprBreakdown component

**Files:**
- Create: `apps/app/src/components/credit-cards/details/AprBreakdown.tsx`

This section uses existing Plaid data (no new tables needed) — it's the quickest win.

**Step 1: Create the component**

Create `apps/app/src/components/credit-cards/details/AprBreakdown.tsx`:

```tsx
"use client";

import { cx } from "@/lib/cx";
import type { CreditCard } from "@/types/credit-cards";

type Apr = NonNullable<CreditCard["aprs"]>[number];

function getAprColor(apr: Apr): {
  border: string;
  text: string;
} {
  if (apr.aprPercentage === 0) {
    return { border: "border-l-utility-success-500", text: "text-utility-success-700" };
  }
  if (apr.aprType?.includes("cash")) {
    return { border: "border-l-utility-error-500", text: "text-utility-error-700" };
  }
  return { border: "border-l-utility-warning-500", text: "text-utility-warning-700" };
}

function formatAprType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\bapr\b/i, "")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function computeWeightedAverageApr(aprs: Apr[]): number | null {
  const withBalance = aprs.filter(
    (a) => a.balanceSubjectToApr && a.balanceSubjectToApr > 0,
  );
  if (withBalance.length === 0) return null;
  const totalBalance = withBalance.reduce(
    (sum, a) => sum + (a.balanceSubjectToApr ?? 0),
    0,
  );
  if (totalBalance === 0) return null;
  const weightedSum = withBalance.reduce(
    (sum, a) => sum + a.aprPercentage * (a.balanceSubjectToApr ?? 0),
    0,
  );
  return Math.round((weightedSum / totalBalance) * 100) / 100;
}

interface AprBreakdownProps {
  aprs: Apr[] | undefined;
}

export function AprBreakdown({ aprs }: AprBreakdownProps) {
  if (!aprs || aprs.length === 0) {
    return (
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">
          APR Breakdown
        </h3>
        <div className="rounded-xl border border-dashed border-secondary bg-primary p-6 text-center text-sm text-tertiary">
          No APR information available
        </div>
      </section>
    );
  }

  const weightedAvg = computeWeightedAverageApr(aprs);

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-primary">APR Breakdown</h3>
        {weightedAvg !== null && (
          <p className="text-sm text-tertiary">
            Weighted Avg:{" "}
            <span className="font-semibold tabular-nums text-primary">
              {weightedAvg.toFixed(2)}%
            </span>
          </p>
        )}
      </div>
      <div className="rounded-xl border border-secondary bg-primary">
        {/* Header row */}
        <div className="grid grid-cols-4 gap-4 border-b border-secondary px-4 py-2.5">
          <span className="text-xs font-medium text-tertiary">
            Balance Type
          </span>
          <span className="text-right text-xs font-medium text-tertiary">
            APR
          </span>
          <span className="text-right text-xs font-medium text-tertiary">
            Balance Subject
          </span>
          <span className="text-right text-xs font-medium text-tertiary">
            Interest Charged
          </span>
        </div>
        {/* Data rows */}
        <div className="divide-y divide-secondary">
          {aprs.map((apr, i) => {
            const color = getAprColor(apr);
            return (
              <div
                key={`${apr.aprType}-${i}`}
                className={cx(
                  "grid grid-cols-4 gap-4 border-l-2 px-4 py-3",
                  color.border,
                )}
              >
                <span className="text-sm text-primary">
                  {formatAprType(apr.aprType)}
                </span>
                <span
                  className={cx(
                    "text-right text-sm font-medium tabular-nums",
                    color.text,
                  )}
                >
                  {apr.aprPercentage.toFixed(2)}%
                  {apr.aprPercentage > 0 && (
                    <span
                      className="ml-1 cursor-help text-xs text-tertiary"
                      title="Variable rate — tracks the Prime Rate"
                    >
                      (v)
                    </span>
                  )}
                </span>
                <span className="text-right text-sm tabular-nums text-primary">
                  {apr.balanceSubjectToApr != null
                    ? `$${apr.balanceSubjectToApr.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "—"}
                </span>
                <span className="text-right text-sm tabular-nums text-primary">
                  {apr.interestChargeAmount != null
                    ? `$${apr.interestChargeAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```
feat(credit-cards): add AprBreakdown component

Color-coded APR table with weighted average headline metric.
Green for 0% promos, amber for standard purchase, red for cash advance.
Variable rate indicator with tooltip.
```

---

## Task 8: Build the BalanceReconciliation component

**Files:**
- Create: `apps/app/src/components/credit-cards/details/BalanceReconciliation.tsx`

**Step 1: Create the component**

Create `apps/app/src/components/credit-cards/details/BalanceReconciliation.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import { cx } from "@/lib/cx";

interface BalanceReconciliationProps {
  creditCardId: Id<"creditCards">;
  statementDate?: string; // defaults to latest if omitted
  statementClosingDay?: number | null;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function BalanceReconciliation({
  creditCardId,
  statementDate,
  statementClosingDay,
}: BalanceReconciliationProps) {
  const latestSnapshots = useQuery(
    api.statementSnapshots.queries.getLatest,
    { creditCardId },
  );

  // If a specific date was requested, fetch that instead
  const specificSnapshot = useQuery(
    api.statementSnapshots.queries.getByDate,
    statementDate ? { creditCardId, statementDate } : "skip",
  );

  const snapshot = statementDate ? specificSnapshot : latestSnapshots?.current;

  // Empty state: no closing day set
  if (statementClosingDay == null) {
    return (
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Account Summary
        </h3>
        <div className="rounded-xl border border-dashed border-secondary bg-primary p-6 text-center">
          <p className="text-sm text-tertiary">
            Set your statement closing date to enable balance tracking
          </p>
        </div>
      </section>
    );
  }

  // Empty state: closing day set but no snapshots yet
  if (!snapshot) {
    return (
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Account Summary
        </h3>
        <div className="rounded-xl border border-dashed border-secondary bg-primary p-6 text-center">
          <p className="text-sm text-tertiary">
            Your first statement snapshot will be generated after your next
            closing date (day {statementClosingDay})
          </p>
        </div>
      </section>
    );
  }

  const lines = [
    {
      label: "Previous Statement Balance",
      amount: snapshot.previousBalance,
      type: "neutral" as const,
    },
    {
      label: "Payments & Credits",
      amount: -snapshot.paymentsAndCredits,
      type: "credit" as const,
    },
    {
      label: "New Purchases",
      amount: snapshot.newPurchases,
      type: "debit" as const,
    },
    {
      label: "Fees",
      amount: snapshot.fees,
      type: "debit" as const,
    },
    {
      label: "Interest Charged",
      amount: snapshot.interestCharged,
      type: "debit" as const,
    },
  ];

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-primary">Account Summary</h3>
        <p className="text-xs text-tertiary">
          Statement: {snapshot.statementDate}
        </p>
      </div>
      <div className="rounded-xl border border-secondary bg-primary">
        <div className="divide-y divide-secondary">
          {lines.map((line) => (
            <div
              key={line.label}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm text-tertiary">{line.label}</span>
              <span
                className={cx(
                  "text-sm font-medium tabular-nums",
                  line.type === "credit" && "text-utility-success-700",
                  line.type === "debit" &&
                    line.amount > 0 &&
                    "text-utility-error-700",
                  (line.type === "neutral" || line.amount === 0) &&
                    "text-primary",
                )}
              >
                {line.type === "credit" && line.amount !== 0 && "-"}
                {line.type === "debit" && line.amount > 0 && "+"}$
                {formatCurrency(Math.abs(line.amount))}
              </span>
            </div>
          ))}
        </div>
        {/* Total line */}
        <div className="flex items-center justify-between border-t-2 border-secondary px-4 py-3">
          <span className="text-sm font-semibold text-primary">
            New Statement Balance
          </span>
          <span className="text-sm font-semibold tabular-nums text-primary">
            ${formatCurrency(snapshot.newBalance)}
          </span>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```
feat(credit-cards): add BalanceReconciliation component

Statement-style ledger showing previous balance, payments, purchases,
fees, interest, and new balance. Accepts optional statementDate prop
for future period selector. Graceful empty states for missing closing
day and missing snapshots.
```

---

## Task 9: Build the PromoTracker component

**Files:**
- Create: `apps/app/src/components/credit-cards/details/PromoTracker.tsx`

**Step 1: Create the component**

Create `apps/app/src/components/credit-cards/details/PromoTracker.tsx`:

```tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import { cx } from "@/lib/cx";
import { useState } from "react";

function getMonthsRemaining(expirationDate: string): number {
  const now = new Date();
  const expiry = new Date(expirationDate);
  const months =
    (expiry.getFullYear() - now.getFullYear()) * 12 +
    (expiry.getMonth() - now.getMonth());
  return Math.max(0, months);
}

function getUrgencyColor(monthsRemaining: number): string {
  if (monthsRemaining <= 1) return "bg-utility-error-500";
  if (monthsRemaining <= 3) return "bg-utility-orange-500";
  if (monthsRemaining <= 6) return "bg-utility-warning-500";
  return "bg-utility-success-500";
}

function getProgressPercentage(startDate: string, expirationDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(expirationDate).getTime();
  const now = Date.now();
  if (now >= end) return 100;
  if (now <= start) return 0;
  return Math.round(((now - start) / (end - start)) * 100);
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface PromoTrackerProps {
  creditCardId: Id<"creditCards">;
}

export function PromoTracker({ creditCardId }: PromoTrackerProps) {
  const promos = useQuery(api.promoRates.queries.listByCard, { creditCardId });
  const installments = useQuery(api.installmentPlans.queries.listByCard, {
    creditCardId,
  });

  const hasPromos = promos && promos.length > 0;
  const hasInstallments = installments && installments.length > 0;

  if (!hasPromos && !hasInstallments) {
    return (
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Promotional Financing
        </h3>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-secondary bg-primary p-6 text-sm text-tertiary transition-colors hover:border-utility-brand-500 hover:text-utility-brand-600"
        >
          <span className="text-lg">+</span>
          Add promotional APR or installment plan
        </button>
      </section>
    );
  }

  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold text-primary">
        Promotional Financing
      </h3>
      <div className="space-y-3">
        {/* Promo rates */}
        {promos?.map((promo) => {
          const monthsLeft = getMonthsRemaining(promo.expirationDate);
          const progress = getProgressPercentage(
            promo.startDate,
            promo.expirationDate,
          );
          const urgencyColor = getUrgencyColor(monthsLeft);

          return (
            <div
              key={promo._id}
              className="rounded-xl border border-secondary bg-primary"
            >
              <div className="p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {promo.description}
                    </p>
                    <p className="text-xs text-tertiary">
                      {promo.aprPercentage}% APR &middot; Expires{" "}
                      {promo.expirationDate}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-primary">
                    ${formatCurrency(promo.remainingBalance)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cx("h-full rounded-full transition-all", urgencyColor)}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-tertiary">
                  {monthsLeft > 0
                    ? `${monthsLeft} month${monthsLeft !== 1 ? "s" : ""} remaining`
                    : "Expired"}
                </p>

                {/* Deferred interest warning */}
                {promo.isDeferredInterest &&
                  promo.accruedDeferredInterest != null &&
                  promo.accruedDeferredInterest > 0 && (
                    <div className="mt-3 rounded-lg bg-utility-error-50 px-3 py-2 text-xs text-utility-error-700">
                      Deferred interest accrued: $
                      {formatCurrency(promo.accruedDeferredInterest)}. Pay
                      remaining balance by expiration to avoid this charge.
                    </div>
                  )}

                {promo.monthlyMinimumPayment != null && (
                  <p className="mt-2 text-xs text-tertiary">
                    Monthly minimum: $
                    {formatCurrency(promo.monthlyMinimumPayment)}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Installment plans */}
        {hasInstallments && (
          <div className="rounded-xl border border-secondary bg-primary">
            <div className="border-b border-secondary px-4 py-2.5">
              <span className="text-xs font-medium text-tertiary">
                Installment Plans
              </span>
            </div>
            <div className="divide-y divide-secondary">
              {installments?.map((plan) => (
                <div key={plan._id} className="px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {plan.description}
                      </p>
                      <p className="text-xs text-tertiary">
                        {plan.remainingPayments} of {plan.totalPayments}{" "}
                        payments remaining
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-primary">
                        ${formatCurrency(plan.monthlyPrincipal + plan.monthlyFee)}
                        <span className="text-xs font-normal text-tertiary">
                          /mo
                        </span>
                      </p>
                      <p className="text-xs tabular-nums text-tertiary">
                        ${formatCurrency(plan.remainingPrincipal)} remaining
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add button */}
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-secondary bg-primary p-4 text-sm text-tertiary transition-colors hover:border-utility-brand-500 hover:text-utility-brand-600"
        >
          <span className="text-lg">+</span>
          Add promotional rate or plan
        </button>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```
feat(credit-cards): add PromoTracker component

Promo rate cards with countdown progress bars, deferred interest
warnings, and installment plan table. Color-coded urgency
(green → yellow → orange → red) based on months remaining.
```

---

## Task 10: Build InterestSavingBalance, FeesInterestYtd, PayOverTimeSection components

**Files:**
- Create: `apps/app/src/components/credit-cards/details/InterestSavingBalance.tsx`
- Create: `apps/app/src/components/credit-cards/details/FeesInterestYtd.tsx`
- Create: `apps/app/src/components/credit-cards/details/PayOverTimeSection.tsx`

**Step 1: Create InterestSavingBalance**

Create `apps/app/src/components/credit-cards/details/InterestSavingBalance.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface InterestSavingBalanceProps {
  creditCardId: Id<"creditCards">;
}

export function InterestSavingBalance({
  creditCardId,
}: InterestSavingBalanceProps) {
  const data = useQuery(
    api.creditCards.queries.computeInterestSavingBalance,
    { creditCardId },
  );

  if (!data) return null;

  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold text-primary">
        Interest Saving Balance
      </h3>
      <div className="rounded-xl border border-secondary bg-primary p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-primary">
              ${formatCurrency(data.interestSavingBalance)}
            </p>
            <p className="mt-1 text-xs text-tertiary">
              {data.hasPromos
                ? "Pay this amount to avoid interest on next month's purchases while keeping promotional balances intact"
                : "Pay in full to avoid interest charges"}
            </p>
          </div>
        </div>

        {data.hasPromos && (
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-secondary pt-3 text-xs text-tertiary">
            <div>
              <p className="tabular-nums font-medium text-primary">
                ${formatCurrency(data.currentBalance)}
              </p>
              <p>Current Balance</p>
            </div>
            <div>
              <p className="tabular-nums font-medium text-primary">
                ${formatCurrency(data.totalProtectedBalances)}
              </p>
              <p>Protected Balances</p>
            </div>
            <div>
              <p className="tabular-nums font-medium text-primary">
                ${formatCurrency(data.totalProtectedPayments)}
              </p>
              <p>Required Payments</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
```

**Step 2: Create FeesInterestYtd**

Create `apps/app/src/components/credit-cards/details/FeesInterestYtd.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface FeesInterestYtdProps {
  creditCardId: Id<"creditCards">;
}

export function FeesInterestYtd({ creditCardId }: FeesInterestYtdProps) {
  const data = useQuery(api.creditCards.queries.computeYtdFeesInterest, {
    creditCardId,
  });

  if (!data) return null;

  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold text-primary">
        {data.year} Year-to-Date
      </h3>
      <div className="rounded-xl border border-secondary bg-primary">
        <div className="grid grid-cols-1 divide-y divide-secondary sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="p-4">
            <p className="text-xs text-tertiary">Total Fees</p>
            <p className="text-lg font-semibold tabular-nums text-primary">
              ${formatCurrency(data.totalFees)}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-tertiary">Total Interest</p>
            <p className="text-lg font-semibold tabular-nums text-primary">
              ${formatCurrency(data.totalInterest)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Step 3: Create PayOverTimeSection**

Create `apps/app/src/components/credit-cards/details/PayOverTimeSection.tsx`:

```tsx
"use client";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface PayOverTimeSectionProps {
  payOverTimeEnabled?: boolean;
  payOverTimeLimit?: number;
  payOverTimeApr?: number;
  availableCredit?: number;
}

export function PayOverTimeSection({
  payOverTimeEnabled,
  payOverTimeLimit,
  payOverTimeApr,
  availableCredit,
}: PayOverTimeSectionProps) {
  if (!payOverTimeEnabled) return null;

  const rows = [
    {
      label: "Pay Over Time Limit",
      value: payOverTimeLimit != null ? `$${formatCurrency(payOverTimeLimit)}` : "—",
    },
    {
      label: "Available Pay Over Time",
      value: availableCredit != null ? `$${formatCurrency(availableCredit)}` : "—",
    },
    {
      label: "Pay Over Time APR",
      value: payOverTimeApr != null ? `${payOverTimeApr.toFixed(2)}% (v)` : "—",
    },
    {
      label: "Setting",
      value: "ON",
    },
  ];

  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold text-primary">
        Pay Over Time
      </h3>
      <div className="rounded-xl border border-secondary bg-primary">
        <dl className="divide-y divide-secondary">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between px-4 py-3"
            >
              <dt className="text-sm text-tertiary">{row.label}</dt>
              <dd className="text-sm font-medium text-primary">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
```

**Step 4: Commit**

```
feat(credit-cards): add ISB, YTD fees/interest, Pay Over Time components

InterestSavingBalance: shows the minimum payment to avoid interest
while preserving promo balances. FeesInterestYtd: compact 2-column
year-to-date summary. PayOverTimeSection: conditional Amex-specific
revolving credit display.
```

---

## Task 11: Build the StatementClosingBanner component

**Files:**
- Create: `apps/app/src/components/credit-cards/details/StatementClosingBanner.tsx`

**Step 1: Create the component**

Create `apps/app/src/components/credit-cards/details/StatementClosingBanner.tsx`:

```tsx
"use client";

import { useMutation } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import { useState } from "react";

interface StatementClosingBannerProps {
  creditCardId: Id<"creditCards">;
  statementClosingDay?: number | null;
}

export function StatementClosingBanner({
  creditCardId,
  statementClosingDay,
}: StatementClosingBannerProps) {
  const updateCard = useMutation(api.creditCards.mutations.update);
  const [day, setDay] = useState("");
  const [saving, setSaving] = useState(false);

  if (statementClosingDay != null) return null;

  const handleSave = async () => {
    const parsed = parseInt(day, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 31) return;
    setSaving(true);
    try {
      await updateCard({ cardId: creditCardId, statementClosingDay: parsed });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-utility-brand-200 bg-utility-brand-50 p-4">
      <p className="mb-3 text-sm font-medium text-utility-brand-700">
        Set your statement closing date to unlock balance tracking and smart
        recommendations
      </p>
      <div className="flex items-center gap-3">
        <label className="text-xs text-utility-brand-600">
          Statement closes on day:
        </label>
        <input
          type="number"
          min={1}
          max={31}
          value={day}
          onChange={(e) => setDay(e.target.value)}
          placeholder="e.g. 15"
          className="w-20 rounded-lg border border-utility-brand-200 bg-white px-3 py-1.5 text-sm tabular-nums text-primary placeholder:text-tertiary focus:border-utility-brand-500 focus:outline-none focus:ring-1 focus:ring-utility-brand-500"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !day}
          className="rounded-lg bg-utility-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-utility-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```
feat(credit-cards): add StatementClosingBanner component

Prominent inline banner that appears when statementClosingDay is null.
Includes a number input and save button to set the closing day.
```

---

## Task 12: Rewrite CardDetailsTab as the new orchestrator

**Files:**
- Modify: `apps/app/src/components/credit-cards/CardDetailsTab.tsx` (full rewrite)

**Step 1: Read the current file to confirm current state**

Read: `apps/app/src/components/credit-cards/CardDetailsTab.tsx`

**Step 2: Rewrite the component**

Replace the entire contents of `CardDetailsTab.tsx` with the new orchestrator that composes all sections. The component keeps the same interface (`CardDetailsTabProps` with `cardId` and `cardData`) so the parent `CreditCardDetailContent.tsx` doesn't need changes.

```tsx
"use client";

import { motion } from "motion/react";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import { cx } from "@/lib/cx";
import { formatDisplayCurrency } from "@/types/credit-cards";

// Section components
import { StatementClosingBanner } from "./details/StatementClosingBanner";
import { BalanceReconciliation } from "./details/BalanceReconciliation";
import { AprBreakdown } from "./details/AprBreakdown";
import { PromoTracker } from "./details/PromoTracker";
import { InterestSavingBalance } from "./details/InterestSavingBalance";
import { FeesInterestYtd } from "./details/FeesInterestYtd";
import { PayOverTimeSection } from "./details/PayOverTimeSection";

// Keep the existing CardData interface — this is the raw Convex query result shape
interface CardData {
  _id: Id<"creditCards">;
  _creationTime: number;
  accountName: string;
  officialName?: string | null;
  company?: string | null;
  brand?: string | null;
  lastFour?: string | null;
  accountType?: string | null;
  accountSubtype?: string | null;
  isoCurrencyCode?: string | null;
  aprs?: Array<{
    aprPercentage: number;
    aprType: string;
    balanceSubjectToApr?: number | null;
    interestChargeAmount?: number | null;
  }> | null;
  lastPaymentAmount?: number | null;
  lastPaymentDate?: string | null;
  lastStatementBalance?: number | null;
  lastStatementIssueDate?: string | null;
  syncStatus?: string | null;
  lastSyncedAt?: number | null;
  lastSyncError?: string | null;
  // New fields
  statementClosingDay?: number | null;
  payOverTimeEnabled?: boolean | null;
  payOverTimeLimit?: number | null;
  payOverTimeApr?: number | null;
  availableCredit?: number | null;
}

interface CardDetailsTabProps {
  cardId: Id<"creditCards">;
  cardData: CardData | null | undefined;
}

export default function CardDetailsTab({
  cardId,
  cardData,
}: CardDetailsTabProps) {
  if (!cardData) {
    return (
      <div className="p-6 text-center text-sm text-tertiary">
        Loading card details...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Statement closing date banner — gate for reconciliation features */}
      <StatementClosingBanner
        creditCardId={cardId}
        statementClosingDay={cardData.statementClosingDay}
      />

      {/* Section 1: Balance Reconciliation */}
      <BalanceReconciliation
        creditCardId={cardId}
        statementClosingDay={cardData.statementClosingDay}
      />

      {/* Section 2: APR Breakdown */}
      <AprBreakdown aprs={cardData.aprs ?? undefined} />

      {/* Section 3: Promotional Financing */}
      <PromoTracker creditCardId={cardId} />

      {/* Section 4: Interest Saving Balance */}
      <InterestSavingBalance creditCardId={cardId} />

      {/* Section 5: YTD Fees & Interest */}
      <FeesInterestYtd creditCardId={cardId} />

      {/* Section 6: Pay Over Time (Amex-specific) */}
      <PayOverTimeSection
        payOverTimeEnabled={cardData.payOverTimeEnabled ?? undefined}
        payOverTimeLimit={cardData.payOverTimeLimit ?? undefined}
        payOverTimeApr={cardData.payOverTimeApr ?? undefined}
        availableCredit={cardData.availableCredit ?? undefined}
      />

      {/* Account Details — moved to bottom */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Account Details
        </h3>
        <div className="rounded-xl border border-secondary bg-primary">
          <dl className="divide-y divide-secondary">
            {cardData.officialName && (
              <DetailRow label="Official Name" value={cardData.officialName} />
            )}
            <DetailRow label="Account Name" value={cardData.accountName} />
            {cardData.company && (
              <DetailRow label="Issuer" value={cardData.company} />
            )}
            {cardData.brand && (
              <DetailRow
                label="Network"
                value={cardData.brand.charAt(0).toUpperCase() + cardData.brand.slice(1)}
              />
            )}
            {cardData.lastFour && (
              <DetailRow
                label="Card Number"
                value={`•••• •••• •••• ${cardData.lastFour}`}
              />
            )}
            {cardData.accountType && (
              <DetailRow
                label="Account Type"
                value={`${cardData.accountType}${cardData.accountSubtype ? ` / ${cardData.accountSubtype}` : ""}`}
              />
            )}
            {cardData.isoCurrencyCode && (
              <DetailRow label="Currency" value={cardData.isoCurrencyCode} />
            )}
            <DetailRow
              label="Date Added"
              value={new Date(cardData._creationTime).toLocaleDateString(
                "en-US",
                { year: "numeric", month: "long", day: "numeric" },
              )}
            />
            {cardData.statementClosingDay != null && (
              <DetailRow
                label="Statement Closing Day"
                value={`Day ${cardData.statementClosingDay}`}
              />
            )}
          </dl>
        </div>
      </section>

      {/* Payment History — kept from original */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Payment History
        </h3>
        <div className="rounded-xl border border-secondary bg-primary">
          <div className="grid grid-cols-1 divide-y divide-secondary sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="p-4">
              <p className="text-xs text-tertiary">Last Payment</p>
              <p className="text-lg font-semibold tabular-nums text-primary">
                {cardData.lastPaymentAmount != null
                  ? formatDisplayCurrency(cardData.lastPaymentAmount)
                  : "—"}
              </p>
              {cardData.lastPaymentDate && (
                <p className="text-xs text-tertiary">
                  {cardData.lastPaymentDate}
                </p>
              )}
            </div>
            <div className="p-4">
              <p className="text-xs text-tertiary">Last Statement Balance</p>
              <p className="text-lg font-semibold tabular-nums text-primary">
                {cardData.lastStatementBalance != null
                  ? formatDisplayCurrency(cardData.lastStatementBalance)
                  : "—"}
              </p>
              {cardData.lastStatementIssueDate && (
                <p className="text-xs text-tertiary">
                  Issued {cardData.lastStatementIssueDate}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sync Status — kept from original */}
      {cardData.syncStatus && (
        <section>
          <h3 className="mb-4 text-lg font-semibold text-primary">
            Sync Status
          </h3>
          <div className="rounded-xl border border-secondary bg-primary px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-tertiary">Status</span>
              <span
                className={cx(
                  "text-sm font-medium",
                  cardData.syncStatus === "synced" && "text-utility-success-700",
                  cardData.syncStatus === "syncing" && "text-utility-brand-600",
                  cardData.syncStatus === "error" && "text-utility-error-700",
                  cardData.syncStatus === "stale" && "text-utility-warning-700",
                )}
              >
                {cardData.syncStatus.charAt(0).toUpperCase() +
                  cardData.syncStatus.slice(1)}
              </span>
            </div>
            {cardData.lastSyncedAt && (
              <p className="mt-1 text-xs text-tertiary">
                Last synced:{" "}
                {new Date(cardData.lastSyncedAt).toLocaleString("en-US")}
              </p>
            )}
            {cardData.lastSyncError && (
              <div className="mt-2 rounded-lg bg-utility-error-50 px-3 py-2 text-xs text-utility-error-700">
                {cardData.lastSyncError}
              </div>
            )}
          </div>
        </section>
      )}
    </motion.div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-sm text-tertiary">{label}</dt>
      <dd className="text-sm font-medium text-primary">{value}</dd>
    </div>
  );
}
```

**Step 3: Verify no type errors**

Run: `bun typecheck`
Expected: No errors in `CardDetailsTab.tsx` or any file that imports it.

**Step 4: Verify it renders**

Run: `bun dev:app` and navigate to a credit card's Details tab.
Expected: The new layout renders with APR Breakdown populated from Plaid data, empty states for Balance Reconciliation and Promo Tracker, Statement Closing Banner visible, and Account Details / Payment History / Sync Status at the bottom.

**Step 5: Commit**

```
feat(credit-cards): rewrite CardDetailsTab with statement-styled layout

Redesign the Details tab as a statement-inspired orchestrator composing:
- StatementClosingBanner (gates reconciliation features)
- BalanceReconciliation (ledger view with empty states)
- AprBreakdown (color-coded table with weighted average)
- PromoTracker (promo rates with countdown progress bars)
- InterestSavingBalance (smart payment recommendation)
- FeesInterestYtd (compact year-to-date summary)
- PayOverTimeSection (conditional Amex feature)
- Account Details, Payment History, Sync Status (preserved)
```

---

## Task 13: Add statement snapshot cron job

**Files:**
- Modify: `packages/backend/convex/crons.ts` (add new cron)
- Create: `packages/backend/convex/statementSnapshots/actions.ts` (cron handler)

**Step 1: Create the cron handler action**

Create `packages/backend/convex/statementSnapshots/actions.ts`:

```ts
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

export const generateDailySnapshots = internalAction({
  handler: async (ctx) => {
    const today = new Date();
    const dayOfMonth = today.getDate();

    // Query all active credit cards that have a matching closing day
    // We need to use the raw DB since this is an internal action
    const cards = await ctx.runQuery(
      internal.statementSnapshots.internalQueries.getCardsWithClosingDay,
      { closingDay: dayOfMonth },
    );

    for (const card of cards) {
      const statementDate = today.toISOString().split("T")[0];

      await ctx.runMutation(
        internal.statementSnapshots.mutations.createInferredInternal,
        {
          userId: card.userId,
          creditCardId: card._id,
          statementDate,
          newBalance: card.currentBalance ?? 0,
          minimumPaymentDue: card.minimumPaymentAmount ?? 0,
          dueDate: card.nextPaymentDueDate ?? "",
        },
      );
    }
  },
});
```

**Step 2: Create the internal query for the cron**

Create `packages/backend/convex/statementSnapshots/internalQueries.ts`:

```ts
import { v } from "convex/values";
import { internalQuery } from "../functions";

export const getCardsWithClosingDay = internalQuery({
  args: {
    closingDay: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all active credit cards with the matching closing day
    const allCards = await ctx.table("creditCards").filter((q) =>
      q.and(
        q.eq(q.field("isActive"), true),
        q.eq(q.field("statementClosingDay"), args.closingDay),
      ),
    );
    return allCards.map((card) => ({
      _id: card._id,
      userId: card.userId,
      currentBalance: card.currentBalance,
      minimumPaymentAmount: card.minimumPaymentAmount,
      nextPaymentDueDate: card.nextPaymentDueDate,
    }));
  },
});
```

**Step 3: Register the cron in `crons.ts`**

Add to `packages/backend/convex/crons.ts`, after the existing daily Plaid sync cron:

```ts
import { internal } from "./_generated/api";

// Add after the existing cron:
crons.daily(
  "Generate Statement Snapshots",
  { hourUTC: 6, minuteUTC: 0 },
  internal.statementSnapshots.actions.generateDailySnapshots
);
```

Run at 6 AM UTC (after the 2 AM Plaid sync, so balances are fresh).

**Step 4: Verify cron registers**

Run: `cd packages/backend && npx convex dev --once`
Expected: Both crons register without errors.

**Step 5: Commit**

```
feat(backend): add daily cron for automated statement snapshots

Runs at 6 AM UTC (after Plaid sync). For each card with a
statementClosingDay matching today, creates an inferred snapshot
from current Plaid balance data. Idempotent — won't duplicate
snapshots for the same date.
```

---

## Task 14: Update CreditCardDetailContent to pass new fields

**Files:**
- Modify: `apps/app/src/components/credit-cards/CreditCardDetailContent.tsx`

**Step 1: Read the current file**

Read: `apps/app/src/components/credit-cards/CreditCardDetailContent.tsx`
Focus on: how `cardData` is passed to `CardDetailsTab` (around line 277).

**Step 2: Verify `cardData` already includes new fields**

The `get` query in `packages/backend/convex/creditCards/queries.ts` returns all fields from the `creditCards` table. Since we added `statementClosingDay`, `payOverTimeEnabled`, `payOverTimeLimit`, `payOverTimeApr` to the schema (Task 1), they'll automatically be included in the query result.

Check that `CardDetailsTab` receives `cardData` and can access these new fields. Since the schema has `schemaValidation: false`, these optional fields will flow through without explicit query return type changes.

If `CreditCardDetailContent` passes `cardData` directly (not a filtered subset), no changes are needed here. If it filters fields, add the new ones.

**Step 3: Verify type compatibility**

Run: `bun typecheck`
Expected: No type errors. The `CardData` interface in the rewritten `CardDetailsTab.tsx` (Task 12) includes the new optional fields.

**Step 4: Commit (only if changes were needed)**

```
fix(credit-cards): pass new statement config fields to CardDetailsTab
```

---

## Task 15: Verify the full flow end-to-end

**Step 1: Start the dev server**

Run: `bun dev`
Expected: Both app and Convex backend start without errors.

**Step 2: Navigate to a credit card Details tab**

Open `http://localhost:3000/credit-cards/<any-card-id>` and click the "Details" tab.

Expected:
- Statement Closing Banner appears at top (green/brand colored)
- Balance Reconciliation shows empty state (dashed border, "Set your statement closing date...")
- APR Breakdown shows Plaid data with color-coded rows
- Promo Tracker shows empty state with "Add promotional APR" button
- Interest Saving Balance shows current balance as ISB (no promos)
- YTD Fees & Interest shows computed values
- Pay Over Time section is hidden (no card has it enabled)
- Account Details and Payment History render at bottom
- Sync Status renders if applicable

**Step 3: Set a statement closing day**

Enter a day (e.g., 15) in the Statement Closing Banner and click Save.

Expected:
- Banner disappears
- Balance Reconciliation updates to show "Your first statement snapshot will be generated after your next closing date (day 15)"
- Account Details now shows "Statement Closing Day: Day 15"

**Step 4: Run typecheck one final time**

Run: `bun typecheck`
Expected: Clean — no type errors.

**Step 5: Final commit if any fixes were needed**

```
fix(credit-cards): address review feedback from e2e verification
```

# Dashboard Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the existing static demo dashboard with a data-driven financial command center showing real credit card data, payments, spending, and connected banks.

**Architecture:** New Convex queries aggregate dashboard data server-side. React components consume these queries via `useQuery`. Dashboard is split into isolated components for each section, composed in a responsive grid layout.

**Tech Stack:** Convex (backend queries), React 19, Next.js 16, UntitledUI components, Recharts (pie chart), Tailwind CSS v4.

---

## Task 1: Create Dashboard Queries - Hero Metrics

**Files:**
- Create: `packages/backend/convex/dashboard/queries.ts`
- Create: `packages/backend/convex/dashboard/index.ts`

**Step 1: Create the dashboard queries file with hero metrics**

```typescript
// packages/backend/convex/dashboard/queries.ts
import { v } from "convex/values";
import { query } from "../functions";
import { components } from "../_generated/api";

/**
 * Get hero metrics for dashboard: minimum due, total balance, utilization
 */
export const getHeroMetrics = query({
  args: {},
  returns: v.object({
    minimumDue: v.number(),
    minimumDueCardCount: v.number(),
    totalBalance: v.number(),
    totalCardCount: v.number(),
    utilizationPercent: v.number(),
    totalCreditLimit: v.number(),
    cardsOverThreshold: v.number(),
    utilizationThreshold: v.number(),
  }),
  async handler(ctx) {
    const viewer = ctx.viewerX();

    // Get user's active Plaid items
    const userItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: viewer.externalId,
    });
    const activeItemIds = new Set(
      userItems.filter((item) => item.isActive !== false).map((item) => item._id)
    );

    // Get all active credit cards
    const allCards = await ctx
      .table("creditCards", "by_user_active", (q) =>
        q.eq("userId", viewer._id).eq("isActive", true)
      )
      .map((card) => card.doc());

    // Filter by active Plaid items
    const cards = allCards.filter(
      (card) => !card.plaidItemId || activeItemIds.has(card.plaidItemId)
    );

    // Calculate metrics
    let minimumDue = 0;
    let minimumDueCardCount = 0;
    let totalBalance = 0;
    let totalCreditLimit = 0;
    let cardsOverThreshold = 0;
    const utilizationThreshold = 30;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    for (const card of cards) {
      totalBalance += card.currentBalance ?? 0;
      totalCreditLimit += card.creditLimit ?? 0;

      // Check if card has payment due this month
      if (card.nextPaymentDueDate) {
        const dueDate = new Date(card.nextPaymentDueDate);
        if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
          minimumDue += card.minimumPaymentAmount ?? 0;
          minimumDueCardCount++;
        }
      }

      // Check utilization per card
      if (card.creditLimit && card.creditLimit > 0) {
        const cardUtilization = ((card.currentBalance ?? 0) / card.creditLimit) * 100;
        if (cardUtilization > utilizationThreshold) {
          cardsOverThreshold++;
        }
      }
    }

    const utilizationPercent =
      totalCreditLimit > 0 ? (totalBalance / totalCreditLimit) * 100 : 0;

    return {
      minimumDue: Math.round(minimumDue),
      minimumDueCardCount,
      totalBalance: Math.round(totalBalance),
      totalCardCount: cards.length,
      utilizationPercent: Math.round(utilizationPercent * 100) / 100,
      totalCreditLimit: Math.round(totalCreditLimit),
      cardsOverThreshold,
      utilizationThreshold,
    };
  },
});
```

**Step 2: Create the index file to export queries**

```typescript
// packages/backend/convex/dashboard/index.ts
export * from "./queries";
```

**Step 3: Verify the query compiles**

Run: `cd /home/itsjusteric/Developer/smartpockets/packages/backend && bunx convex dev --once`
Expected: "Convex functions ready!"

**Step 4: Commit**

```bash
git add packages/backend/convex/dashboard/
git commit -m "feat(dashboard): add hero metrics query

Aggregates minimum due, total balance, and utilization across
all active credit cards for the dashboard header.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Dashboard Queries - Upcoming Payments

**Files:**
- Modify: `packages/backend/convex/dashboard/queries.ts`

**Step 1: Add the upcoming payments query**

Add to `packages/backend/convex/dashboard/queries.ts`:

```typescript
/**
 * Get upcoming payments sorted by urgency
 */
export const getUpcomingPayments = query({
  args: {},
  returns: v.array(
    v.object({
      cardId: v.id("creditCards"),
      cardName: v.string(),
      lastFour: v.optional(v.string()),
      brand: v.optional(v.string()),
      minimumPayment: v.number(),
      dueDate: v.string(),
      daysUntilDue: v.number(),
      isOverdue: v.boolean(),
      isPaid: v.boolean(),
      isAutoPay: v.boolean(),
    })
  ),
  async handler(ctx) {
    const viewer = ctx.viewerX();

    // Get user's active Plaid items
    const userItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: viewer.externalId,
    });
    const activeItemIds = new Set(
      userItems.filter((item) => item.isActive !== false).map((item) => item._id)
    );

    // Get all active credit cards
    const allCards = await ctx
      .table("creditCards", "by_user_active", (q) =>
        q.eq("userId", viewer._id).eq("isActive", true)
      )
      .map((card) => card.doc());

    // Filter by active Plaid items
    const cards = allCards.filter(
      (card) => !card.plaidItemId || activeItemIds.has(card.plaidItemId)
    );

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const payments = cards
      .filter((card) => card.nextPaymentDueDate)
      .map((card) => {
        const dueDate = new Date(card.nextPaymentDueDate!);
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Consider paid if last payment was after last statement
        const isPaid = card.lastPaymentDate && card.lastStatementIssueDate
          ? new Date(card.lastPaymentDate) > new Date(card.lastStatementIssueDate)
          : false;

        return {
          cardId: card._id,
          cardName: card.displayName,
          lastFour: card.lastFour,
          brand: card.brand,
          minimumPayment: card.minimumPaymentAmount ?? 0,
          dueDate: card.nextPaymentDueDate!,
          daysUntilDue,
          isOverdue: card.isOverdue || daysUntilDue < 0,
          isPaid,
          isAutoPay: card.isAutoPay,
        };
      })
      // Sort by urgency: overdue first, then by days until due
      .sort((a, b) => {
        if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return a.daysUntilDue - b.daysUntilDue;
      });

    return payments;
  },
});
```

**Step 2: Verify the query compiles**

Run: `cd /home/itsjusteric/Developer/smartpockets/packages/backend && bunx convex dev --once`
Expected: "Convex functions ready!"

**Step 3: Commit**

```bash
git add packages/backend/convex/dashboard/queries.ts
git commit -m "feat(dashboard): add upcoming payments query

Returns cards with due dates sorted by urgency (overdue first,
then by days until due). Includes paid status detection.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create Dashboard Queries - Alerts

**Files:**
- Modify: `packages/backend/convex/dashboard/queries.ts`

**Step 1: Add the alerts query**

Add to `packages/backend/convex/dashboard/queries.ts`:

```typescript
/**
 * Get critical alerts for banner display
 */
export const getAlerts = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      type: v.union(
        v.literal("overdue"),
        v.literal("due_soon"),
        v.literal("sync_error"),
        v.literal("reauth_needed")
      ),
      severity: v.union(v.literal("critical"), v.literal("warning"), v.literal("info")),
      title: v.string(),
      description: v.string(),
      cardId: v.optional(v.id("creditCards")),
      plaidItemId: v.optional(v.string()),
      actionLabel: v.optional(v.string()),
      actionHref: v.optional(v.string()),
    })
  ),
  async handler(ctx) {
    const viewer = ctx.viewerX();
    const alerts: Array<{
      id: string;
      type: "overdue" | "due_soon" | "sync_error" | "reauth_needed";
      severity: "critical" | "warning" | "info";
      title: string;
      description: string;
      cardId?: typeof viewer._id extends never ? never : ReturnType<typeof ctx.table<"creditCards">>["_id"];
      plaidItemId?: string;
      actionLabel?: string;
      actionHref?: string;
    }> = [];

    // Get Plaid items for sync status
    const userItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: viewer.externalId,
    });

    // Check for reauth/sync errors
    for (const item of userItems) {
      if (item.status === "needs_reauth" || item.status === "error") {
        alerts.push({
          id: `item-${item._id}`,
          type: item.status === "needs_reauth" ? "reauth_needed" : "sync_error",
          severity: "warning",
          title: `${item.institutionName || "Bank"} needs attention`,
          description:
            item.status === "needs_reauth"
              ? "Please re-authenticate your connection"
              : "Sync failed. We'll retry automatically.",
          plaidItemId: item._id,
          actionLabel: item.status === "needs_reauth" ? "Reconnect" : undefined,
          actionHref:
            item.status === "needs_reauth"
              ? `/settings/institutions/${item._id}`
              : undefined,
        });
      }
    }

    const activeItemIds = new Set(
      userItems.filter((item) => item.isActive !== false).map((item) => item._id)
    );

    // Get credit cards
    const allCards = await ctx
      .table("creditCards", "by_user_active", (q) =>
        q.eq("userId", viewer._id).eq("isActive", true)
      )
      .map((card) => card.doc());

    const cards = allCards.filter(
      (card) => !card.plaidItemId || activeItemIds.has(card.plaidItemId)
    );

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const card of cards) {
      // Check overdue
      if (card.isOverdue) {
        const daysOverdue = card.nextPaymentDueDate
          ? Math.abs(
              Math.ceil(
                (now.getTime() - new Date(card.nextPaymentDueDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            )
          : 0;
        alerts.push({
          id: `card-overdue-${card._id}`,
          type: "overdue",
          severity: "critical",
          title: `${card.displayName} is overdue`,
          description: `${daysOverdue} days past due. Minimum payment: $${((card.minimumPaymentAmount ?? 0) / 1000).toFixed(2)}`,
          cardId: card._id,
          actionLabel: "View Card",
          actionHref: `/credit-cards/${card._id}`,
        });
        continue;
      }

      // Check due within 48 hours
      if (card.nextPaymentDueDate) {
        const dueDate = new Date(card.nextPaymentDueDate);
        const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntilDue > 0 && hoursUntilDue <= 48) {
          alerts.push({
            id: `card-due-soon-${card._id}`,
            type: "due_soon",
            severity: "warning",
            title: `${card.displayName} due soon`,
            description: `Due in ${Math.ceil(hoursUntilDue / 24)} day${Math.ceil(hoursUntilDue / 24) === 1 ? "" : "s"}. Minimum: $${((card.minimumPaymentAmount ?? 0) / 1000).toFixed(2)}`,
            cardId: card._id,
            actionLabel: "View Card",
            actionHref: `/credit-cards/${card._id}`,
          });
        }
      }
    }

    // Sort: critical first, then warning, then info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return alerts;
  },
});
```

**Step 2: Verify the query compiles**

Run: `cd /home/itsjusteric/Developer/smartpockets/packages/backend && bunx convex dev --once`
Expected: "Convex functions ready!"

**Step 3: Commit**

```bash
git add packages/backend/convex/dashboard/queries.ts
git commit -m "feat(dashboard): add alerts query

Returns critical alerts for overdue payments, upcoming due dates,
and Plaid connection issues. Sorted by severity.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create Dashboard Queries - Connected Banks

**Files:**
- Modify: `packages/backend/convex/dashboard/queries.ts`

**Step 1: Add the connected banks query**

Add to `packages/backend/convex/dashboard/queries.ts`:

```typescript
/**
 * Get connected banks with nested accounts
 */
export const getConnectedBanks = query({
  args: {},
  returns: v.array(
    v.object({
      itemId: v.string(),
      institutionId: v.optional(v.string()),
      institutionName: v.string(),
      status: v.string(),
      lastSyncedAt: v.optional(v.number()),
      accounts: v.array(
        v.object({
          accountId: v.string(),
          name: v.string(),
          type: v.string(),
          subtype: v.optional(v.string()),
          balance: v.optional(v.number()),
          mask: v.optional(v.string()),
        })
      ),
    })
  ),
  async handler(ctx) {
    const viewer = ctx.viewerX();

    // Get all Plaid items
    const userItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: viewer.externalId,
    });

    const banks = await Promise.all(
      userItems.map(async (item) => {
        // Get accounts for this item
        const accounts = await ctx.runQuery(
          components.plaid.public.getAccountsByItem,
          { plaidItemId: item._id }
        );

        return {
          itemId: item._id,
          institutionId: item.institutionId,
          institutionName: item.institutionName || "Unknown Bank",
          status: item.status,
          lastSyncedAt: item.lastSyncedAt,
          accounts: accounts.map((acc) => ({
            accountId: acc.accountId,
            name: acc.name,
            type: acc.type,
            subtype: acc.subtype,
            balance: acc.balances?.current,
            mask: acc.mask,
          })),
        };
      })
    );

    return banks;
  },
});
```

**Step 2: Verify the query compiles**

Run: `cd /home/itsjusteric/Developer/smartpockets/packages/backend && bunx convex dev --once`
Expected: "Convex functions ready!"

**Step 3: Commit**

```bash
git add packages/backend/convex/dashboard/queries.ts
git commit -m "feat(dashboard): add connected banks query

Returns Plaid items with nested accounts for the connected
banks dashboard section.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create Dashboard Queries - Spending Breakdown

**Files:**
- Modify: `packages/backend/convex/dashboard/queries.ts`

**Step 1: Add the spending breakdown query**

Add to `packages/backend/convex/dashboard/queries.ts`:

```typescript
/**
 * Get spending breakdown by category for pie chart
 */
export const getSpendingBreakdown = query({
  args: {
    period: v.optional(v.union(v.literal("this_month"), v.literal("last_month"), v.literal("last_90_days"))),
  },
  returns: v.object({
    totalSpending: v.number(),
    previousPeriodTotal: v.optional(v.number()),
    categories: v.array(
      v.object({
        category: v.string(),
        amount: v.number(),
        percentage: v.number(),
        transactionCount: v.number(),
      })
    ),
  }),
  async handler(ctx, { period = "this_month" }) {
    const viewer = ctx.viewerX();

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let endDate = now;
    let previousStartDate: Date | undefined;
    let previousEndDate: Date | undefined;

    if (period === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (period === "last_month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      // last_90_days
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    // Get user's active Plaid items
    const userItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: viewer.externalId,
    });
    const activeItemIds = new Set(
      userItems.filter((item) => item.isActive !== false).map((item) => item._id)
    );

    if (activeItemIds.size === 0) {
      return { totalSpending: 0, categories: [] };
    }

    // Get transactions for all active items
    const allTransactions: Array<{
      amount: number;
      date: string;
      categoryPrimary?: string;
    }> = [];

    for (const itemId of activeItemIds) {
      const accounts = await ctx.runQuery(
        components.plaid.public.getAccountsByItem,
        { plaidItemId: itemId }
      );

      for (const acc of accounts) {
        const txs = await ctx.runQuery(
          components.plaid.public.getTransactionsByAccount,
          { accountId: acc.accountId }
        );
        allTransactions.push(
          ...txs.map((tx) => ({
            amount: tx.amount,
            date: tx.date,
            categoryPrimary: tx.categoryPrimary,
          }))
        );
      }
    }

    // Filter transactions by date range (spending = positive amounts in Plaid)
    const periodTransactions = allTransactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= startDate && txDate <= endDate && tx.amount > 0;
    });

    // Calculate previous period total if applicable
    let previousPeriodTotal: number | undefined;
    if (previousStartDate && previousEndDate) {
      previousPeriodTotal = allTransactions
        .filter((tx) => {
          const txDate = new Date(tx.date);
          return txDate >= previousStartDate! && txDate <= previousEndDate! && tx.amount > 0;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);
    }

    // Group by category
    const categoryMap = new Map<string, { amount: number; count: number }>();
    let totalSpending = 0;

    for (const tx of periodTransactions) {
      const category = tx.categoryPrimary || "OTHER";
      const existing = categoryMap.get(category) || { amount: 0, count: 0 };
      existing.amount += tx.amount;
      existing.count++;
      categoryMap.set(category, existing);
      totalSpending += tx.amount;
    }

    // Convert to array and calculate percentages
    const categories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: Math.round(data.amount * 100) / 100,
        percentage: totalSpending > 0 ? Math.round((data.amount / totalSpending) * 1000) / 10 : 0,
        transactionCount: data.count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6); // Top 6, rest would be "Other"

    return {
      totalSpending: Math.round(totalSpending * 100) / 100,
      previousPeriodTotal: previousPeriodTotal
        ? Math.round(previousPeriodTotal * 100) / 100
        : undefined,
      categories,
    };
  },
});
```

**Step 2: Verify the query compiles**

Run: `cd /home/itsjusteric/Developer/smartpockets/packages/backend && bunx convex dev --once`
Expected: "Convex functions ready!"

**Step 3: Commit**

```bash
git add packages/backend/convex/dashboard/queries.ts
git commit -m "feat(dashboard): add spending breakdown query

Aggregates transactions by category for pie chart display.
Supports this_month, last_month, and last_90_days periods.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create Dashboard Queries - Recent Transactions

**Files:**
- Modify: `packages/backend/convex/dashboard/queries.ts`

**Step 1: Add the recent transactions query**

Add to `packages/backend/convex/dashboard/queries.ts`:

```typescript
/**
 * Get recent transactions for dashboard
 */
export const getRecentTransactions = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      transactionId: v.string(),
      merchantName: v.string(),
      amount: v.number(),
      date: v.string(),
      pending: v.boolean(),
      categoryPrimary: v.optional(v.string()),
      cardName: v.string(),
      cardLastFour: v.optional(v.string()),
    })
  ),
  async handler(ctx, { limit = 10 }) {
    const viewer = ctx.viewerX();

    // Get user's active Plaid items
    const userItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: viewer.externalId,
    });
    const activeItemIds = new Set(
      userItems.filter((item) => item.isActive !== false).map((item) => item._id)
    );

    if (activeItemIds.size === 0) {
      return [];
    }

    // Get credit cards for account -> card mapping
    const allCards = await ctx
      .table("creditCards", "by_user_active", (q) =>
        q.eq("userId", viewer._id).eq("isActive", true)
      )
      .map((card) => card.doc());

    const accountToCard = new Map(
      allCards.map((card) => [
        card.accountId,
        { name: card.displayName, lastFour: card.lastFour },
      ])
    );

    // Get transactions from all active items
    type Transaction = {
      transactionId: string;
      merchantName: string;
      amount: number;
      date: string;
      pending: boolean;
      categoryPrimary?: string;
      cardName: string;
      cardLastFour?: string;
    };

    const allTransactions: Transaction[] = [];

    for (const itemId of activeItemIds) {
      const accounts = await ctx.runQuery(
        components.plaid.public.getAccountsByItem,
        { plaidItemId: itemId }
      );

      for (const acc of accounts) {
        const cardInfo = accountToCard.get(acc.accountId);
        if (!cardInfo) continue; // Skip non-credit card accounts

        const txs = await ctx.runQuery(
          components.plaid.public.getTransactionsByAccount,
          { accountId: acc.accountId }
        );

        for (const tx of txs) {
          allTransactions.push({
            transactionId: tx.transactionId,
            merchantName: tx.merchantName || tx.name,
            amount: tx.amount,
            date: tx.date,
            pending: tx.pending,
            categoryPrimary: tx.categoryPrimary,
            cardName: cardInfo.name,
            cardLastFour: cardInfo.lastFour,
          });
        }
      }
    }

    // Sort by date descending and limit
    return allTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  },
});
```

**Step 2: Verify the query compiles**

Run: `cd /home/itsjusteric/Developer/smartpockets/packages/backend && bunx convex dev --once`
Expected: "Convex functions ready!"

**Step 3: Commit**

```bash
git add packages/backend/convex/dashboard/queries.ts
git commit -m "feat(dashboard): add recent transactions query

Returns most recent transactions across all cards with
card info attached for display.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Create Alert Banner Component

**Files:**
- Create: `apps/app/src/app/(app)/dashboard/components/AlertBanner.tsx`

**Step 1: Create the AlertBanner component**

```tsx
// apps/app/src/app/(app)/dashboard/components/AlertBanner.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { AlertCircle, XClose } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { cx } from "@repo/ui/utils";
import { useState } from "react";
import Link from "next/link";

export function AlertBanner() {
  const alerts = useQuery(api.dashboard.queries.getAlerts);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  if (!alerts || alerts.length === 0) return null;

  const visibleAlerts = alerts
    .filter((a) => !dismissedIds.has(a.id))
    .slice(0, 3);

  if (visibleAlerts.length === 0) return null;

  const dismissAlert = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const severityStyles = {
    critical: "bg-error-50 border-error-200 text-error-700",
    warning: "bg-warning-50 border-warning-200 text-warning-700",
    info: "bg-primary-50 border-primary-200 text-primary-700",
  };

  const hiddenCount = alerts.length - visibleAlerts.length - dismissedIds.size;

  return (
    <div className="flex flex-col gap-2">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={cx(
            "flex items-center justify-between gap-4 rounded-lg border px-4 py-3",
            severityStyles[alert.severity]
          )}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{alert.title}</p>
              <p className="text-sm">{alert.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alert.actionHref && alert.actionLabel && (
              <Link href={alert.actionHref}>
                <Button size="sm" color="secondary">
                  {alert.actionLabel}
                </Button>
              </Link>
            )}
            <button
              onClick={() => dismissAlert(alert.id)}
              className="rounded p-1 hover:bg-black/5"
              aria-label="Dismiss"
            >
              <XClose className="size-4" />
            </button>
          </div>
        </div>
      ))}
      {hiddenCount > 0 && (
        <p className="text-sm text-tertiary">+{hiddenCount} more alerts</p>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/app/src/app/\(app\)/dashboard/components/AlertBanner.tsx
git commit -m "feat(dashboard): add AlertBanner component

Displays critical alerts for overdue payments and sync issues.
Supports dismiss and shows overflow count.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Create Hero Metrics Component

**Files:**
- Create: `apps/app/src/app/(app)/dashboard/components/HeroMetrics.tsx`

**Step 1: Create the HeroMetrics component**

```tsx
// apps/app/src/app/(app)/dashboard/components/HeroMetrics.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { cx } from "@repo/ui/utils";

function formatCurrency(amount: number): string {
  // Amounts are in milliunits
  return (amount / 1000).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function HeroMetrics() {
  const metrics = useQuery(api.dashboard.queries.getHeroMetrics);

  if (!metrics) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl bg-secondary"
          />
        ))}
      </div>
    );
  }

  const utilizationColor =
    metrics.utilizationPercent < 30
      ? "text-success-600"
      : metrics.utilizationPercent < 50
        ? "text-warning-600"
        : "text-error-600";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Minimum Due */}
      <div className="rounded-xl border border-primary bg-primary p-5">
        <p className="text-display-sm font-semibold text-primary">
          {formatCurrency(metrics.minimumDue)}
        </p>
        <p className="text-sm font-medium text-secondary">Minimum Due</p>
        <p className="mt-1 text-sm text-tertiary">
          {metrics.minimumDueCardCount} card
          {metrics.minimumDueCardCount !== 1 ? "s" : ""} this month
        </p>
      </div>

      {/* Total Balance */}
      <div className="rounded-xl border border-primary bg-primary p-5">
        <p className="text-display-sm font-semibold text-primary">
          {formatCurrency(metrics.totalBalance)}
        </p>
        <p className="text-sm font-medium text-secondary">Total Balance</p>
        <p className="mt-1 text-sm text-tertiary">
          across {metrics.totalCardCount} card
          {metrics.totalCardCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Utilization */}
      <div className="rounded-xl border border-primary bg-primary p-5">
        <p className={cx("text-display-sm font-semibold", utilizationColor)}>
          {metrics.utilizationPercent.toFixed(0)}%
        </p>
        <p className="text-sm font-medium text-secondary">Utilization</p>
        <p className="mt-1 text-sm text-tertiary">
          {metrics.cardsOverThreshold > 0 ? (
            <span className="text-warning-600">
              {metrics.cardsOverThreshold} card
              {metrics.cardsOverThreshold !== 1 ? "s" : ""} over{" "}
              {metrics.utilizationThreshold}%
            </span>
          ) : (
            "All cards healthy"
          )}
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/app/src/app/\(app\)/dashboard/components/HeroMetrics.tsx
git commit -m "feat(dashboard): add HeroMetrics component

Displays three key metrics: minimum due, total balance,
and credit utilization with color-coded thresholds.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Create Upcoming Payments Component

**Files:**
- Create: `apps/app/src/app/(app)/dashboard/components/UpcomingPayments.tsx`

**Step 1: Create the UpcomingPayments component**

```tsx
// apps/app/src/app/(app)/dashboard/components/UpcomingPayments.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Check } from "@untitledui/icons";
import { cx } from "@repo/ui/utils";
import Link from "next/link";

function formatCurrency(amount: number): string {
  return (amount / 1000).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDueDate(dueDate: string, daysUntilDue: number): string {
  if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} days overdue`;
  if (daysUntilDue === 0) return "TODAY";
  if (daysUntilDue === 1) return "Tomorrow";
  if (daysUntilDue <= 7) return `in ${daysUntilDue} days`;
  return new Date(dueDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getDotColor(payment: {
  isOverdue: boolean;
  isPaid: boolean;
  daysUntilDue: number;
}): string {
  if (payment.isPaid) return "bg-success-500";
  if (payment.isOverdue) return "bg-error-500";
  if (payment.daysUntilDue <= 3) return "bg-warning-500";
  if (payment.daysUntilDue <= 7) return "bg-warning-300";
  return "bg-gray-300";
}

export function UpcomingPayments() {
  const payments = useQuery(api.dashboard.queries.getUpcomingPayments);

  if (!payments) {
    return (
      <div className="rounded-xl border border-primary bg-primary p-5">
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Upcoming Payments
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  const unpaid = payments.filter((p) => !p.isPaid);
  const paid = payments.filter((p) => p.isPaid);

  return (
    <div className="rounded-xl border border-primary bg-primary p-5">
      <h3 className="mb-4 text-lg font-semibold text-primary">
        Upcoming Payments
      </h3>

      {unpaid.length === 0 && paid.length === 0 ? (
        <p className="text-sm text-tertiary">No upcoming payments</p>
      ) : (
        <div className="space-y-2">
          {unpaid.map((payment) => (
            <Link
              key={payment.cardId}
              href={`/credit-cards/${payment.cardId}`}
              className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-secondary"
            >
              <div className="flex items-center gap-3">
                <div className={cx("size-2 rounded-full", getDotColor(payment))} />
                <div>
                  <p className="text-sm font-medium text-primary">
                    {payment.cardName}
                    {payment.isAutoPay && (
                      <span className="ml-2 text-xs text-tertiary">Auto</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-primary">
                  {formatCurrency(payment.minimumPayment)}
                </p>
                <p
                  className={cx(
                    "text-xs",
                    payment.isOverdue ? "text-error-600" : "text-tertiary"
                  )}
                >
                  {formatDueDate(payment.dueDate, payment.daysUntilDue)}
                </p>
              </div>
            </Link>
          ))}

          {paid.length > 0 && (
            <>
              <div className="my-3 flex items-center gap-2 text-xs text-tertiary">
                <div className="h-px flex-1 bg-border-secondary" />
                <span>Paid this cycle</span>
                <div className="h-px flex-1 bg-border-secondary" />
              </div>
              {paid.slice(0, 3).map((payment) => (
                <Link
                  key={payment.cardId}
                  href={`/credit-cards/${payment.cardId}`}
                  className="flex items-center justify-between rounded-lg px-2 py-2 opacity-60 hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <Check className="size-4 text-success-500" />
                    <p className="text-sm text-primary">{payment.cardName}</p>
                  </div>
                  <p className="text-sm text-tertiary">
                    {formatCurrency(payment.minimumPayment)}
                  </p>
                </Link>
              ))}
            </>
          )}
        </div>
      )}

      <Link
        href="/credit-cards"
        className="mt-4 block text-center text-sm font-medium text-brand-secondary hover:underline"
      >
        View all payments →
      </Link>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/app/src/app/\(app\)/dashboard/components/UpcomingPayments.tsx
git commit -m "feat(dashboard): add UpcomingPayments component

Lists cards with due dates sorted by urgency. Shows paid
cards in a collapsed section. Color-coded urgency indicators.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Create Your Cards Component

**Files:**
- Create: `apps/app/src/app/(app)/dashboard/components/YourCards.tsx`

**Step 1: Create the YourCards component**

```tsx
// apps/app/src/app/(app)/dashboard/components/YourCards.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Lock01 } from "@untitledui/icons";
import { cx } from "@repo/ui/utils";
import Link from "next/link";
import {
  VisaIcon,
  MastercardIcon,
  AmexIcon,
  DiscoverIcon,
} from "@repo/ui/untitledui/foundations/payment-icons";

function formatCurrency(amount: number): string {
  return (amount / 1000).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function CardLogo({ brand }: { brand?: string }) {
  switch (brand) {
    case "visa":
      return <VisaIcon className="h-6 w-auto" />;
    case "mastercard":
      return <MastercardIcon className="h-6 w-auto" />;
    case "amex":
      return <AmexIcon className="h-6 w-auto" />;
    case "discover":
      return <DiscoverIcon className="h-6 w-auto" />;
    default:
      return <div className="h-6 w-10 rounded bg-gray-200" />;
  }
}

export function YourCards() {
  const cards = useQuery(api.creditCards.queries.list, {});

  if (!cards) {
    return (
      <div className="rounded-xl border border-primary bg-primary p-5">
        <h3 className="mb-4 text-lg font-semibold text-primary">Your Cards</h3>
        <div className="flex gap-4 overflow-x-auto">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 w-44 shrink-0 animate-pulse rounded-xl bg-secondary"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary bg-primary p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">Your Cards</h3>
        <Link
          href="/credit-cards"
          className="text-sm font-medium text-brand-secondary hover:underline"
        >
          View all →
        </Link>
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-tertiary">No cards connected</p>
      ) : (
        <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2">
          {cards.map((card) => {
            const utilization =
              card.creditLimit && card.creditLimit > 0
                ? ((card.currentBalance ?? 0) / card.creditLimit) * 100
                : 0;
            const utilizationColor =
              utilization < 30
                ? "bg-success-500"
                : utilization < 50
                  ? "bg-warning-500"
                  : "bg-error-500";

            return (
              <Link
                key={card._id}
                href={`/credit-cards/${card._id}`}
                className="w-44 shrink-0 rounded-xl border border-primary p-4 hover:border-brand-primary"
              >
                <div className="mb-3 flex items-center justify-between">
                  <CardLogo brand={card.brand} />
                  {card.isLocked && (
                    <Lock01 className="size-4 text-tertiary" />
                  )}
                </div>
                <p className="truncate text-sm font-medium text-primary">
                  {card.displayName}
                </p>
                <p className="mt-2 text-lg font-semibold text-primary">
                  {formatCurrency(card.currentBalance ?? 0)}
                </p>

                {/* Utilization bar */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-tertiary">
                      {utilization.toFixed(0)}%
                    </span>
                    {utilization > 30 && (
                      <span className="text-warning-600">⚠</span>
                    )}
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200">
                    <div
                      className={cx("h-full rounded-full", utilizationColor)}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Payment status */}
                <p className="mt-2 text-xs text-tertiary">
                  {card.nextPaymentDueDate
                    ? `Due ${new Date(card.nextPaymentDueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : card.isAutoPay
                      ? "✓ AutoPay"
                      : "No due date"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/app/src/app/\(app\)/dashboard/components/YourCards.tsx
git commit -m "feat(dashboard): add YourCards component

Horizontal scrolling card grid showing balance, utilization,
and payment status for each card. Links to card detail.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Create Connected Banks Component

**Files:**
- Create: `apps/app/src/app/(app)/dashboard/components/ConnectedBanks.tsx`

**Step 1: Create the ConnectedBanks component**

```tsx
// apps/app/src/app/(app)/dashboard/components/ConnectedBanks.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { AlertTriangle, Building07, Settings01 } from "@untitledui/icons";
import { cx } from "@repo/ui/utils";
import Link from "next/link";
import { useState } from "react";

function formatCurrency(amount: number): string {
  return (amount / 1000).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatSyncTime(timestamp?: number): string {
  if (!timestamp) return "Never synced";
  const now = Date.now();
  const diff = now - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Synced just now";
  if (hours < 24) return `Synced ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Synced ${days}d ago`;
}

export function ConnectedBanks() {
  const banks = useQuery(api.dashboard.queries.getConnectedBanks);
  const [expandedBanks, setExpandedBanks] = useState<Set<string>>(new Set());

  if (!banks) {
    return (
      <div className="rounded-xl border border-primary bg-primary p-5">
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Connected Banks
        </h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  const toggleExpand = (itemId: string) => {
    setExpandedBanks((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const visibleBanks = banks.slice(0, 4);
  const hiddenCount = banks.length - 4;

  return (
    <div className="rounded-xl border border-primary bg-primary p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">Connected Banks</h3>
        <Link
          href="/settings/institutions"
          className="text-tertiary hover:text-secondary"
        >
          <Settings01 className="size-5" />
        </Link>
      </div>

      {banks.length === 0 ? (
        <p className="text-sm text-tertiary">No banks connected</p>
      ) : (
        <div className="space-y-3">
          {visibleBanks.map((bank) => {
            const isExpanded = expandedBanks.has(bank.itemId);
            const needsAttention =
              bank.status === "needs_reauth" || bank.status === "error";

            return (
              <div key={bank.itemId}>
                <button
                  onClick={() => toggleExpand(bank.itemId)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <Building07 className="size-5 text-tertiary" />
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {bank.institutionName}
                      </p>
                      <p
                        className={cx(
                          "text-xs",
                          needsAttention ? "text-warning-600" : "text-tertiary"
                        )}
                      >
                        {needsAttention ? (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="size-3" />
                            Needs re-auth
                          </span>
                        ) : (
                          formatSyncTime(bank.lastSyncedAt)
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-tertiary">
                    {bank.accounts.length} account
                    {bank.accounts.length !== 1 ? "s" : ""}
                  </span>
                </button>

                {isExpanded && (
                  <div className="ml-8 mt-1 space-y-1 border-l border-border-secondary pl-4">
                    {bank.accounts.map((acc) => (
                      <div
                        key={acc.accountId}
                        className="flex items-center justify-between py-1 text-sm"
                      >
                        <span className="text-secondary">
                          {acc.name}
                          {acc.mask && (
                            <span className="ml-1 text-tertiary">
                              ••••{acc.mask}
                            </span>
                          )}
                        </span>
                        <span className="text-tertiary">
                          {acc.balance != null
                            ? formatCurrency(acc.balance)
                            : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {hiddenCount > 0 && (
            <Link
              href="/settings/institutions"
              className="block text-center text-sm text-tertiary hover:text-secondary"
            >
              +{hiddenCount} more institution{hiddenCount !== 1 ? "s" : ""}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/app/src/app/\(app\)/dashboard/components/ConnectedBanks.tsx
git commit -m "feat(dashboard): add ConnectedBanks component

Shows institutions with expandable nested accounts.
Highlights connection issues requiring attention.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Create Spending Breakdown Component

**Files:**
- Create: `apps/app/src/app/(app)/dashboard/components/SpendingBreakdown.tsx`

**Step 1: Create the SpendingBreakdown component**

```tsx
// apps/app/src/app/(app)/dashboard/components/SpendingBreakdown.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowUp, ArrowDown } from "@untitledui/icons";
import { Select } from "@repo/ui/untitledui/base/select/select";
import Link from "next/link";

const COLORS = [
  "#7F56D9", // Purple
  "#12B76A", // Green
  "#F79009", // Orange
  "#0BA5EC", // Blue
  "#F04438", // Red
  "#667085", // Gray (Other)
];

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

type Period = "this_month" | "last_month" | "last_90_days";

export function SpendingBreakdown() {
  const [period, setPeriod] = useState<Period>("this_month");
  const spending = useQuery(api.dashboard.queries.getSpendingBreakdown, {
    period,
  });

  if (!spending) {
    return (
      <div className="rounded-xl border border-primary bg-primary p-5">
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Spending This Month
        </h3>
        <div className="flex h-48 items-center justify-center">
          <div className="size-32 animate-pulse rounded-full bg-secondary" />
        </div>
      </div>
    );
  }

  const periodLabels: Record<Period, string> = {
    this_month: "This Month",
    last_month: "Last Month",
    last_90_days: "Last 90 Days",
  };

  const chartData = spending.categories.map((cat, i) => ({
    name: formatCategory(cat.category),
    value: cat.amount,
    color: COLORS[i % COLORS.length],
  }));

  const diff =
    spending.previousPeriodTotal != null
      ? spending.totalSpending - spending.previousPeriodTotal
      : null;

  return (
    <div className="rounded-xl border border-primary bg-primary p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-primary">
            Spending {periodLabels[period]}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(spending.totalSpending)}
            </span>
            {diff != null && (
              <span
                className={`flex items-center text-sm ${diff > 0 ? "text-error-600" : "text-success-600"}`}
              >
                {diff > 0 ? (
                  <ArrowUp className="size-4" />
                ) : (
                  <ArrowDown className="size-4" />
                )}
                {formatCurrency(Math.abs(diff))}
              </span>
            )}
          </div>
        </div>
        <Select
          size="sm"
          selectedKey={period}
          onSelectionChange={(key) => setPeriod(key as Period)}
          aria-label="Period"
          items={[
            { id: "this_month", label: "This Month" },
            { id: "last_month", label: "Last Month" },
            { id: "last_90_days", label: "Last 90 Days" },
          ]}
        >
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
      </div>

      {spending.categories.length === 0 ? (
        <p className="py-8 text-center text-sm text-tertiary">
          No spending data available
        </p>
      ) : (
        <div className="flex items-center gap-6">
          {/* Pie Chart */}
          <div className="h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {spending.categories.map((cat, i) => (
              <div key={cat.category} className="flex items-center gap-2">
                <div
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="flex-1 truncate text-sm text-secondary">
                  {formatCategory(cat.category)}
                </span>
                <span className="text-sm font-medium text-primary">
                  {formatCurrency(cat.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/transactions"
        className="mt-4 block text-center text-sm font-medium text-brand-secondary hover:underline"
      >
        View details →
      </Link>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/app/src/app/\(app\)/dashboard/components/SpendingBreakdown.tsx
git commit -m "feat(dashboard): add SpendingBreakdown component

Pie chart with category breakdown. Period selector for
this month, last month, or last 90 days.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Create Recent Transactions Component

**Files:**
- Create: `apps/app/src/app/(app)/dashboard/components/RecentTransactions.tsx`

**Step 1: Create the RecentTransactions component**

```tsx
// apps/app/src/app/(app)/dashboard/components/RecentTransactions.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";

function formatCurrency(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
  return amount >= 0 ? `-${formatted}` : `+${formatted}`;
}

function groupByDate(
  transactions: Array<{ date: string; [key: string]: unknown }>
): Map<string, typeof transactions> {
  const groups = new Map<string, typeof transactions>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    txDate.setHours(0, 0, 0, 0);

    let label: string;
    if (txDate.getTime() === today.getTime()) {
      label = "Today";
    } else if (txDate.getTime() === yesterday.getTime()) {
      label = "Yesterday";
    } else {
      label = txDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }

    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(tx);
  }

  return groups;
}

export function RecentTransactions() {
  const transactions = useQuery(api.dashboard.queries.getRecentTransactions, {
    limit: 10,
  });

  if (!transactions) {
    return (
      <div className="rounded-xl border border-primary bg-primary p-5">
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Recent Transactions
        </h3>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  const grouped = groupByDate(transactions);

  return (
    <div className="rounded-xl border border-primary bg-primary p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">
          Recent Transactions
        </h3>
        <Link
          href="/transactions"
          className="text-sm font-medium text-brand-secondary hover:underline"
        >
          View all →
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-tertiary">No recent transactions</p>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([date, txs]) => (
            <div key={date}>
              <p className="mb-2 text-xs font-medium text-tertiary">{date}</p>
              <div className="space-y-1">
                {txs.map((tx) => (
                  <div
                    key={tx.transactionId}
                    className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-secondary"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-primary">
                        {tx.merchantName}
                        {tx.pending && (
                          <span className="ml-2 text-xs text-tertiary">
                            Pending
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-tertiary">
                        {tx.cardName} ••••{tx.cardLastFour}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-medium ${tx.amount >= 0 ? "text-primary" : "text-success-600"}`}
                    >
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/app/src/app/\(app\)/dashboard/components/RecentTransactions.tsx
git commit -m "feat(dashboard): add RecentTransactions component

Groups transactions by date (Today, Yesterday, etc).
Shows merchant, card info, and amount.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Compose Dashboard Page

**Files:**
- Modify: `apps/app/src/app/(app)/dashboard/page.tsx`

**Step 1: Replace the dashboard page with new components**

```tsx
// apps/app/src/app/(app)/dashboard/page.tsx
"use client";

import { AlertBanner } from "./components/AlertBanner";
import { HeroMetrics } from "./components/HeroMetrics";
import { UpcomingPayments } from "./components/UpcomingPayments";
import { YourCards } from "./components/YourCards";
import { ConnectedBanks } from "./components/ConnectedBanks";
import { SpendingBreakdown } from "./components/SpendingBreakdown";
import { RecentTransactions } from "./components/RecentTransactions";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      {/* Critical Alert Banner */}
      <AlertBanner />

      {/* Hero Metrics */}
      <HeroMetrics />

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          <UpcomingPayments />
          <ConnectedBanks />
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <YourCards />
          <SpendingBreakdown />
        </div>
      </div>

      {/* Recent Transactions - Full Width */}
      <RecentTransactions />
    </div>
  );
}
```

**Step 2: Verify the app compiles**

Run: `cd /home/itsjusteric/Developer/smartpockets && bun run build --filter=@repo/app`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add apps/app/src/app/\(app\)/dashboard/page.tsx
git commit -m "feat(dashboard): compose new dashboard page

Replaces demo dashboard with data-driven components:
- AlertBanner, HeroMetrics, UpcomingPayments
- YourCards, ConnectedBanks, SpendingBreakdown
- RecentTransactions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Create Component Index and Cleanup

**Files:**
- Create: `apps/app/src/app/(app)/dashboard/components/index.ts`

**Step 1: Create the components index**

```typescript
// apps/app/src/app/(app)/dashboard/components/index.ts
export { AlertBanner } from "./AlertBanner";
export { HeroMetrics } from "./HeroMetrics";
export { UpcomingPayments } from "./UpcomingPayments";
export { YourCards } from "./YourCards";
export { ConnectedBanks } from "./ConnectedBanks";
export { SpendingBreakdown } from "./SpendingBreakdown";
export { RecentTransactions } from "./RecentTransactions";
```

**Step 2: Verify the dev server works**

Run: `cd /home/itsjusteric/Developer/smartpockets && bun run dev`
Navigate to: http://localhost:3000/dashboard
Expected: Dashboard renders with all components (may show loading states or empty states if no data)

**Step 3: Commit**

```bash
git add apps/app/src/app/\(app\)/dashboard/components/index.ts
git commit -m "chore(dashboard): add component exports index

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

This plan creates 6 new Convex queries and 7 React components to build a fully data-driven dashboard:

**Backend (packages/backend/convex/dashboard/):**
- `getHeroMetrics` - Minimum due, total balance, utilization
- `getUpcomingPayments` - Cards sorted by payment urgency
- `getAlerts` - Critical alerts for banner
- `getConnectedBanks` - Institutions with nested accounts
- `getSpendingBreakdown` - Category aggregation for pie chart
- `getRecentTransactions` - Latest transactions across cards

**Frontend (apps/app/src/app/(app)/dashboard/components/):**
- `AlertBanner` - Critical alerts with dismiss
- `HeroMetrics` - Three stat cards
- `UpcomingPayments` - Urgency-sorted payment list
- `YourCards` - Horizontal scrolling card grid
- `ConnectedBanks` - Expandable institution list
- `SpendingBreakdown` - Pie chart with period selector
- `RecentTransactions` - Grouped transaction list

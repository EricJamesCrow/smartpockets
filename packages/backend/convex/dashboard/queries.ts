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
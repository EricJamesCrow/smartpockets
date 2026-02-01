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

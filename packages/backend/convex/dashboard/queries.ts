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

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

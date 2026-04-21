import { v } from "convex/values";
import { agentQuery } from "../../functions";

export const getCreditCardDetail = agentQuery({
  args: { cardId: v.id("creditCards") },
  returns: v.any(),
  handler: async (ctx, { cardId }) => {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(cardId);
    if (card.userId !== viewer._id) throw new Error("Not authorized");
    const [promos, installments] = await Promise.all([
      card.edge("promoRates"),
      card.edge("installmentPlans"),
    ]);
    return {
      ids: [card._id],
      preview: {
        card,
        promos,
        installments,
        live: true,
        capturedAt: new Date().toISOString(),
      },
      window: undefined,
    };
  },
});

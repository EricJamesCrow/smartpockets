import { v } from "convex/values";
import { agentQuery } from "../../functions";

export const listCreditCards = agentQuery({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, { includeInactive }) => {
    const viewer = ctx.viewerX();
    const cards = await viewer.edge("creditCards");
    const filtered = includeInactive
      ? cards
      : cards.filter((c: { isActive: boolean }) => c.isActive);
    return {
      ids: filtered.map((c: { _id: string }) => c._id),
      preview: {
        cards: filtered,
        live: true,
        capturedAt: new Date().toISOString(),
      },
      window: undefined,
    };
  },
});

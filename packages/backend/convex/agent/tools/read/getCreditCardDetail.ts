import { v } from "convex/values";
import { agentQuery } from "../../functions";
import { creditCardPreviewForModel } from "./moneyPreview";

export const getCreditCardDetail = agentQuery({
    args: { cardId: v.id("creditCards") },
    returns: v.any(),
    handler: async (ctx, { cardId }) => {
        const viewer = ctx.viewerX();
        const card = await ctx.table("creditCards").getX(cardId);
        if (card.userId !== viewer._id) throw new Error("Not authorized");
        return {
            ids: [card._id],
            preview: {
                card: creditCardPreviewForModel(card),
                live: true,
                capturedAt: new Date().toISOString(),
            },
            window: undefined,
        };
    },
});

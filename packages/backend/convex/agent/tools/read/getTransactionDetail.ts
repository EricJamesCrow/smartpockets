import { v } from "convex/values";
import { agentQuery } from "../../functions";

// W2.11 stub; real body to follow.
export const getTransactionDetail = agentQuery({
    args: { plaidTransactionId: v.string() },
    returns: v.any(),
    handler: async (_ctx, args) => ({
        ids: [args.plaidTransactionId],
        preview: {
            transaction: null,
            live: true,
            capturedAt: new Date().toISOString(),
        },
        window: undefined,
    }),
});

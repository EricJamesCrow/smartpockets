import { v } from "convex/values";
import { query } from "../../functions";

export const listForViewer = query({
    args: {
        status: v.optional(v.union(v.literal("pending"), v.literal("all"))),
        limit: v.optional(v.number()),
    },
    returns: v.array(
        v.object({
            anomalyId: v.id("anomalies"),
            plaidTransactionId: v.string(),
            ruleType: v.union(
                v.literal("amount_spike_3x"),
                v.literal("new_merchant_threshold"),
                v.literal("duplicate_charge_24h"),
            ),
            score: v.number(),
            merchantName: v.string(),
            amount: v.number(),
            transactionDate: v.string(),
            detectedAt: v.number(),
            userStatus: v.union(
                v.literal("pending"),
                v.literal("acknowledged"),
                v.literal("dismissed_false_positive"),
            ),
        }),
    ),
    handler: async (ctx, { status = "pending", limit = 50 }) => {
        const viewer = ctx.viewerX();
        const rows = await ctx
            .table("anomalies", "by_user_detectedAt", (q) =>
                q.eq("userId", viewer._id),
            )
            .order("desc");
        const filtered = status === "pending"
            ? rows.filter((r) => r.userStatus === "pending")
            : rows;
        return filtered.slice(0, limit).map((r) => ({
            anomalyId: r._id,
            plaidTransactionId: r.plaidTransactionId,
            ruleType: r.ruleType,
            score: r.score,
            merchantName: r.merchantName,
            amount: r.amount,
            transactionDate: r.transactionDate,
            detectedAt: r.detectedAt,
            userStatus: r.userStatus,
        }));
    },
});

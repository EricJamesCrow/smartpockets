import { v } from "convex/values";
import { query } from "../../functions";

export const listForViewer = query({
    args: {
        status: v.optional(
            v.union(
                v.literal("pending"),
                v.literal("confirmed"),
                v.literal("dismissed"),
                v.literal("all"),
            ),
        ),
    },
    returns: v.array(
        v.object({
            subscriptionId: v.id("detectedSubscriptions"),
            normalizedMerchant: v.string(),
            nickname: v.optional(v.string()),
            averageAmount: v.number(),
            frequency: v.union(
                v.literal("weekly"),
                v.literal("biweekly"),
                v.literal("monthly"),
                v.literal("quarterly"),
                v.literal("annual"),
            ),
            nextPredictedDate: v.optional(v.string()),
            source: v.union(v.literal("plaid"), v.literal("catchup")),
            occurrenceCount: v.number(),
            userStatus: v.union(
                v.literal("pending"),
                v.literal("confirmed"),
                v.literal("dismissed"),
            ),
            isActive: v.boolean(),
        }),
    ),
    handler: async (ctx, { status = "confirmed" }) => {
        const viewer = ctx.viewerX();
        const rows = await ctx
            .table("detectedSubscriptions", "by_user_userStatus", (q) =>
                q.eq("userId", viewer._id),
            );
        const filtered = status === "all"
            ? rows
            : rows.filter((r) => r.userStatus === status);
        return filtered.map((r) => ({
            subscriptionId: r._id,
            normalizedMerchant: r.normalizedMerchant,
            nickname: r.nickname,
            averageAmount: r.averageAmount,
            frequency: r.frequency,
            nextPredictedDate: r.nextPredictedDate,
            source: r.source,
            occurrenceCount: r.occurrenceCount,
            userStatus: r.userStatus,
            isActive: r.isActive,
        }));
    },
});

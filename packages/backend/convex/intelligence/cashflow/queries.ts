import { v } from "convex/values";
import { query } from "../../functions";

const lineItemValidator = v.object({
    date: v.string(),
    type: v.union(
        v.literal("statement_due"),
        v.literal("subscription"),
        v.literal("recurring_income"),
    ),
    amount: v.number(),
    label: v.string(),
    sourceId: v.string(),
    evidence: v.optional(v.any()),
});

export const getForViewer = query({
    args: {},
    returns: v.union(
        v.null(),
        v.object({
            horizonStartDate: v.string(),
            horizonEndDate: v.string(),
            startingBalance: v.number(),
            projectedNetCash: v.number(),
            endingBalance: v.number(),
            generatedAt: v.number(),
            lineItems: v.array(lineItemValidator),
        }),
    ),
    handler: async (ctx) => {
        const viewer = ctx.viewerX();
        const row = await ctx
            .table("cashflowForecasts", "userId", (q) =>
                q.eq("userId", viewer._id),
            )
            .first();
        if (!row) return null;
        let lineItems: Array<{
            date: string;
            type: "statement_due" | "subscription" | "recurring_income";
            amount: number;
            label: string;
            sourceId: string;
            evidence?: unknown;
        }> = [];
        try {
            lineItems = JSON.parse(row.lineItemsJson);
        } catch {
            lineItems = [];
        }
        return {
            horizonStartDate: row.horizonStartDate,
            horizonEndDate: row.horizonEndDate,
            startingBalance: row.startingBalance,
            projectedNetCash: row.projectedNetCash,
            endingBalance: row.endingBalance,
            generatedAt: row.generatedAt,
            lineItems,
        };
    },
});

import { v } from "convex/values";
import { query } from "../../functions";

export const listForViewer = query({
    args: { limit: v.optional(v.number()) },
    returns: v.array(
        v.object({
            promoCountdownId: v.id("promoCountdowns"),
            creditCardId: v.id("creditCards"),
            creditCardName: v.string(),
            promoDescription: v.string(),
            daysToExpiration: v.number(),
            effectiveDate: v.string(),
            sourceField: v.union(
                v.literal("override"),
                v.literal("plaid"),
                v.literal("manual"),
            ),
            originalExpirationDate: v.string(),
            isDeferredInterest: v.boolean(),
            remainingBalance: v.number(),
            accruedDeferredInterest: v.optional(v.number()),
        }),
    ),
    handler: async (ctx, { limit = 20 }) => {
        const viewer = ctx.viewerX();
        const rows = await ctx
            .table(
                "promoCountdowns",
                "by_user_daysToExpiration",
                (q) => q.eq("userId", viewer._id),
            )
            .take(limit);

        const enriched: Array<{
            promoCountdownId: (typeof rows)[number]["_id"];
            creditCardId: (typeof rows)[number]["creditCardId"];
            creditCardName: string;
            promoDescription: string;
            daysToExpiration: number;
            effectiveDate: string;
            sourceField: "override" | "plaid" | "manual";
            originalExpirationDate: string;
            isDeferredInterest: boolean;
            remainingBalance: number;
            accruedDeferredInterest?: number;
        }> = [];

        for (const row of rows) {
            const promo = await ctx.table("promoRates").get(row.promoRateId);
            const card = await ctx.table("creditCards").get(row.creditCardId);
            if (!promo || !card) continue;
            enriched.push({
                promoCountdownId: row._id,
                creditCardId: row.creditCardId,
                creditCardName: card.displayName,
                promoDescription: promo.description,
                daysToExpiration: row.daysToExpiration,
                effectiveDate: row.effectiveDate,
                sourceField: row.sourceField,
                originalExpirationDate: row.originalExpirationDate,
                isDeferredInterest: row.isDeferredInterest,
                remainingBalance: row.remainingBalance,
                accruedDeferredInterest: row.accruedDeferredInterest,
            });
        }
        return enriched;
    },
});

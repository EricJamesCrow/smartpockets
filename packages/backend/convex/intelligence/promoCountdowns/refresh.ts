import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internalMutation, internalQuery } from "../../functions";
import { internal } from "../../_generated/api";
import { computeEffectiveDate, daysBetween, todayUtcYmd } from "./helpers";

/**
 * Fan-out action: finds every user with active promoRates and schedules
 * a per-user refresh. Invoked by the daily intelligence cron.
 */
export const refreshAllInternal = internalAction({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        const userIds = await ctx.runQuery(
            internal.intelligence.promoCountdowns.refresh
                .listUserIdsWithActivePromosInternal,
            {},
        );
        for (const userId of userIds) {
            await ctx.scheduler.runAfter(
                0,
                internal.intelligence.promoCountdowns.refresh
                    .refreshOneUserInternal,
                { userId },
            );
        }
        return null;
    },
});

export const listUserIdsWithActivePromosInternal = internalQuery({
    args: {},
    returns: v.array(v.id("users")),
    handler: async (ctx) => {
        const promos = await ctx
            .table("promoRates")
            .filter((q) => q.eq(q.field("isActive"), true));
        const seen = new Set<string>();
        const result: Array<(typeof promos)[number]["userId"]> = [];
        for (const promo of promos) {
            const key = promo.userId as unknown as string;
            if (seen.has(key)) continue;
            seen.add(key);
            result.push(promo.userId);
        }
        return result;
    },
});

export const refreshOneUserInternal = internalMutation({
    args: { userId: v.id("users") },
    returns: v.null(),
    handler: async (ctx, { userId }) => {
        const promos = await ctx
            .table("promoRates")
            .filter((q) =>
                q.and(
                    q.eq(q.field("userId"), userId),
                    q.eq(q.field("isActive"), true),
                ),
            );

        const activePromoIds = new Set<string>();
        for (const promo of promos) {
            activePromoIds.add(promo._id as unknown as string);
            await upsertCountdown(ctx, promo);
        }

        // Cleanup: delete countdowns for promos that flipped inactive or were deleted.
        const existing = await ctx
            .table("promoCountdowns")
            .filter((q) => q.eq(q.field("userId"), userId));
        for (const row of existing) {
            if (!activePromoIds.has(row.promoRateId as unknown as string)) {
                await row.delete();
            }
        }

        return null;
    },
});

/**
 * Recompute a single countdown row. Invoked by `promoRates` mutations
 * immediately after they write, via ctx.scheduler.runAfter(0, ...).
 */
export const refreshOneInternal = internalMutation({
    args: { promoRateId: v.id("promoRates") },
    returns: v.null(),
    handler: async (ctx, { promoRateId }) => {
        const promo = await ctx.table("promoRates").get(promoRateId);

        if (!promo || !promo.isActive) {
            const existing = await ctx
                .table("promoCountdowns")
                .filter((q) => q.eq(q.field("promoRateId"), promoRateId))
                .first();
            if (existing) {
                await existing.delete();
            }
            return null;
        }

        await upsertCountdown(ctx, promo);
        return null;
    },
});

type PromoLike = {
    _id: unknown;
    userId: unknown;
    creditCardId: unknown;
    expirationDate: string;
    userOverrides?: { expirationDate?: string };
    isManual?: boolean;
    isDeferredInterest: boolean;
    remainingBalance: number;
    accruedDeferredInterest?: number;
};

async function upsertCountdown(
    // biome-ignore lint/suspicious/noExplicitAny: Ents ctx type is too verbose to spell out here
    ctx: any,
    promo: PromoLike,
): Promise<void> {
    const today = todayUtcYmd();
    const { effectiveDate, sourceField, originalExpirationDate } =
        computeEffectiveDate(promo);
    const daysToExpiration = daysBetween(today, effectiveDate);

    const existing = await ctx
        .table("promoCountdowns")
        // biome-ignore lint/suspicious/noExplicitAny: Ents filter builder
        .filter((q: any) => q.eq(q.field("promoRateId"), promo._id))
        .first();

    const fields = {
        promoRateId: promo._id,
        creditCardId: promo.creditCardId,
        userId: promo.userId,
        daysToExpiration,
        effectiveDate,
        sourceField,
        originalExpirationDate,
        isDeferredInterest: promo.isDeferredInterest,
        remainingBalance: promo.remainingBalance,
        accruedDeferredInterest: promo.accruedDeferredInterest,
        lastRefreshedAt: Date.now(),
    };

    if (existing) {
        await existing.patch(fields);
    } else {
        await ctx.table("promoCountdowns").insert(fields);
    }

    // TODO(W6.13): for daysToExpiration in {30, 14, 7, 1}, call
    // internal.email.dispatch.dispatchPromoWarning once the idempotency
    // spike (specs/00-idempotency-semantics.md §4) is complete.
}

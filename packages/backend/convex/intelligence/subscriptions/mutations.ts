import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { mutation } from "../../functions";

async function requireOwnedSubscription(
    // biome-ignore lint/suspicious/noExplicitAny: Ents ctx type is too verbose to spell out here
    ctx: any,
    subscriptionId: string,
) {
    const viewer = ctx.viewerX();
    const row = await ctx.table("detectedSubscriptions").getX(subscriptionId);
    if ((row.userId as unknown as string) !== (viewer._id as unknown as string)) {
        throw new Error("Not authorized to modify this subscription");
    }
    return row;
}

async function scheduleCashflowRefresh(
    // biome-ignore lint/suspicious/noExplicitAny: Ents ctx type is too verbose to spell out here
    ctx: any,
    userId: Id<"users">,
) {
    await ctx.scheduler.runAfter(
        0,
        internal.intelligence.cashflow.refresh.refreshForUserInternal,
        { userId },
    );
}

export const confirm = mutation({
    args: { subscriptionId: v.id("detectedSubscriptions") },
    returns: v.null(),
    handler: async (ctx, { subscriptionId }) => {
        const row = await requireOwnedSubscription(ctx, subscriptionId);
        await row.patch({
            userStatus: "confirmed",
            userStatusUpdatedAt: Date.now(),
        });
        await scheduleCashflowRefresh(ctx, row.userId);
        return null;
    },
});

export const dismiss = mutation({
    args: { subscriptionId: v.id("detectedSubscriptions") },
    returns: v.null(),
    handler: async (ctx, { subscriptionId }) => {
        const row = await requireOwnedSubscription(ctx, subscriptionId);
        await row.patch({
            userStatus: "dismissed",
            userStatusUpdatedAt: Date.now(),
        });
        await scheduleCashflowRefresh(ctx, row.userId);
        return null;
    },
});

export const setNickname = mutation({
    args: {
        subscriptionId: v.id("detectedSubscriptions"),
        nickname: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, { subscriptionId, nickname }) => {
        const row = await requireOwnedSubscription(ctx, subscriptionId);
        await row.patch({ nickname });
        await scheduleCashflowRefresh(ctx, row.userId);
        return null;
    },
});

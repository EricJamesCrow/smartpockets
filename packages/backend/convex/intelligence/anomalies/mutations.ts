import { v } from "convex/values";
import { mutation } from "../../functions";

async function requireOwnedAnomaly(
    // biome-ignore lint/suspicious/noExplicitAny: Ents ctx type is too verbose to spell out here
    ctx: any,
    anomalyId: string,
) {
    const viewer = ctx.viewerX();
    const row = await ctx.table("anomalies").getX(anomalyId);
    if ((row.userId as unknown as string) !== (viewer._id as unknown as string)) {
        throw new Error("Not authorized to modify this anomaly");
    }
    return row;
}

export const acknowledge = mutation({
    args: { anomalyId: v.id("anomalies") },
    returns: v.null(),
    handler: async (ctx, { anomalyId }) => {
        const row = await requireOwnedAnomaly(ctx, anomalyId);
        await row.patch({
            userStatus: "acknowledged",
            userStatusUpdatedAt: Date.now(),
        });
        return null;
    },
});

export const dismiss = mutation({
    args: { anomalyId: v.id("anomalies") },
    returns: v.null(),
    handler: async (ctx, { anomalyId }) => {
        const row = await requireOwnedAnomaly(ctx, anomalyId);
        await row.patch({
            userStatus: "dismissed_false_positive",
            userStatusUpdatedAt: Date.now(),
        });
        return null;
    },
});

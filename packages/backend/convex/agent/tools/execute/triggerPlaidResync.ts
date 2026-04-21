import { v } from "convex/values";
import { agentMutation } from "../../functions";
import { api, internal } from "../../../_generated/api";

/**
 * Schedule `syncPlaidItemInternal` for one or more of the viewer's Plaid items.
 * Preserves each item's `products` array so that transactions/liabilities
 * branches inside `syncPlaidItemInternal` fire correctly. Ownership is enforced
 * by cross-checking the item list under the viewer's Clerk externalId.
 * Post-W4 the tool repoints to W4's canonical Plaid-health query.
 */
export const triggerPlaidResync = agentMutation({
  args: {
    threadId: v.id("agentThreads"),
    plaidItemId: v.optional(v.string()),
    scope: v.optional(
      v.union(
        v.literal("accounts"),
        v.literal("transactions"),
        v.literal("liabilities"),
        v.literal("all"),
      ),
    ),
  },
  returns: v.object({
    scheduledAt: v.number(),
    itemsQueued: v.number(),
  }),
  handler: async (ctx, { plaidItemId }) => {
    const viewer = ctx.viewerX();
    const items = (await ctx.runQuery(api.items.queries.getItemsByUserId, {
      userId: viewer.externalId,
    })) as Array<{
      _id: string;
      isActive?: boolean;
      products: string[];
    }>;

    const activeItems = items.filter((i) => i.isActive !== false);

    let targets: Array<{ _id: string; products: string[] }>;
    if (plaidItemId) {
      const match = activeItems.find((i) => i._id === plaidItemId);
      if (!match) throw new Error("Not authorized");
      targets = [match];
    } else {
      targets = activeItems;
    }

    const scheduledAt = Date.now();
    for (const item of targets) {
      await ctx.scheduler.runAfter(
        0,
        internal.plaidComponent.syncPlaidItemInternal,
        {
          plaidItemId: item._id,
          userId: viewer.externalId,
          products: item.products,
        },
      );
    }

    return { scheduledAt, itemsQueued: targets.length };
  },
});

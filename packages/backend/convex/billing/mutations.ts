import { v } from "convex/values";
import { internalMutation } from "../functions";

/**
 * Write the resolved plan to users.plan, keyed by Clerk externalId. Unknown
 * user ⇒ no-op (their `user.created` webhook may not have landed yet). Called
 * by the billing sync action after it resolves the plan from Clerk's API.
 */
export const writePlan = internalMutation({
  args: {
    externalId: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro")),
    subscriptionStatus: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { externalId, plan, subscriptionStatus }) => {
    const user = await ctx.table("users").get("externalId", externalId);
    if (!user) return null;
    const writable = await ctx.table("users").getX(user._id);
    await writable.patch({
      plan,
      subscriptionStatus,
      planUpdatedAt: Date.now(),
    });
    return null;
  },
});

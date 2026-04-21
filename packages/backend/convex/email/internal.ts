import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { internalMutation, internalQuery } from "../functions";

/**
 * Resolve the cached Clerk primary email for a user (lowercased).
 * Throws if no email is cached; callers that can tolerate missing
 * emails should query the user row directly instead.
 */
export const getUserEmail = internalQuery({
  args: { userId: v.id("users") },
  returns: v.string(),
  handler: async (ctx, { userId }) => {
    const user = await ctx.table("users").getX(userId);
    if (!user.email) {
      throw new Error(
        `User ${userId} has no email cached; run backfillEmailsFromClerk`,
      );
    }
    return user.email.toLowerCase();
  },
});

export const listUsersWithoutEmail = internalQuery({
  args: { limit: v.number() },
  returns: v.array(
    v.object({ _id: v.id("users"), externalId: v.string() }),
  ),
  handler: async (ctx, { limit }) => {
    const users = await ctx
      .table("users")
      .filter((q) => q.eq(q.field("email"), undefined))
      .take(limit);
    return users.map((u) => ({ _id: u._id, externalId: u.externalId }));
  },
});

export const setUserEmail = internalMutation({
  args: { userId: v.id("users"), email: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, email }) => {
    const user = await ctx.table("users").getX(userId);
    await user.patch({ email: email.toLowerCase() });
    return null;
  },
});

/**
 * One-time backfill invoked from the Convex dashboard. Pulls the primary
 * email from Clerk for every user missing a cached `users.email`.
 */
export const backfillEmailsFromClerk = internalAction({
  args: { batchSize: v.optional(v.number()) },
  returns: v.object({ updated: v.number(), missing: v.number() }),
  handler: async (ctx, { batchSize }) => {
    const { createClerkClient } = await import("@clerk/backend");
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    const limit = batchSize ?? 100;

    let updated = 0;
    let missing = 0;

    const usersWithoutEmail = await ctx.runQuery(
      internal.email.internal.listUsersWithoutEmail,
      { limit },
    );

    for (const user of usersWithoutEmail) {
      try {
        const clerkUser = await clerk.users.getUser(user.externalId);
        const primary = clerkUser.emailAddresses.find(
          (e: { id: string }) => e.id === clerkUser.primaryEmailAddressId,
        );
        if (primary?.emailAddress) {
          await ctx.runMutation(internal.email.internal.setUserEmail, {
            userId: user._id,
            email: primary.emailAddress,
          });
          updated++;
        } else {
          missing++;
        }
      } catch {
        missing++;
      }
    }

    return { updated, missing };
  },
});

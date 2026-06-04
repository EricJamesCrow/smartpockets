import { v } from "convex/values";
import { query } from "../functions";
import { resolveEffectivePlan } from "./plan";
import { entitlementsFor } from "./entitlements";
import { countActiveItems } from "./plaidLimit";

function firstOfMonthUtc(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

export const getMyPlanAndUsage = query({
  args: {},
  returns: v.object({
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("unlimited")),
    chat: v.object({ used: v.number(), limit: v.number() }),
    plaid: v.object({ used: v.number(), limit: v.number() }),
  }),
  handler: async (ctx) => {
    const viewer = ctx.viewer;
    if (!viewer) {
      // Unauthenticated: report the most restrictive plan with zero usage.
      const ent = entitlementsFor("free");
      return {
        plan: "free" as const,
        chat: { used: 0, limit: ent.chatMessagesPerMonth },
        plaid: { used: 0, limit: ent.maxPlaidConnections },
      };
    }

    const effective = await resolveEffectivePlan(ctx, viewer._id);
    const ent = entitlementsFor(effective === "unlimited" ? "pro" : effective);
    const periodStart = firstOfMonthUtc(Date.now());

    const counter = await ctx.table("usageCounters", "by_user_period", (q) =>
      q.eq("userId", viewer._id).eq("periodStart", periodStart),
    );
    const chatUsed = counter[0]?.chatMessagesUsed ?? 0;

    const plaidUsed = await countActiveItems(ctx, viewer.externalId);

    // "unlimited" reports the pro numbers as the displayed limit but the gates
    // never block; the UI treats unlimited as no cap.
    return {
      plan: effective,
      chat: { used: chatUsed, limit: ent.chatMessagesPerMonth },
      plaid: { used: plaidUsed, limit: ent.maxPlaidConnections },
    };
  },
});

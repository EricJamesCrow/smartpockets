import { v } from "convex/values";
import { internalQuery } from "../functions";
import { api, internal } from "../_generated/api";

/**
 * Compose the retrieval context string injected into the system prompt.
 * Reads are parallelised via Promise.all to bound cold-start P95 latency
 * (target < 800 tokens total; see spec §9.2).
 */
export const compose = internalQuery({
  args: {
    userId: v.id("users"),
    threadId: v.id("agentThreads"),
  },
  returns: v.string(),
  handler: async (ctx, { userId, threadId }) => {
    const user = await ctx.table("users").getX(userId);
    const [accounts, cards, activePromos, openProposals, thread] =
      await Promise.all([
        ctx.runQuery(api.plaidComponent.getAccountsByUserId, {
          userId: user.externalId,
        }) as Promise<unknown[]>,
        ctx
          .table("creditCards", "by_user_active", (q) =>
            q.eq("userId", userId).eq("isActive", true),
          ),
        ctx
          .table("promoRates")
          .filter((q) => q.eq(q.field("userId"), userId))
          .filter((q) => q.eq(q.field("isActive"), true)),
        ctx.runQuery(
          (internal as any).agent.proposals.countOpenForThreadInternal,
          { threadId },
        ) as Promise<number>,
        ctx.table("agentThreads").getX(threadId),
      ]);

    const lines: string[] = [];
    lines.push(`Today: ${new Date().toISOString().slice(0, 10)}`);
    lines.push(`Accounts: ${accounts.length}`);
    lines.push(`Credit cards: ${cards.length}`);
    lines.push(`Active deferred-interest promos: ${activePromos.length}`);
    lines.push(`Open proposals awaiting confirmation: ${openProposals}`);
    if (thread.summaryText) {
      lines.push(`Prior thread summary: ${thread.summaryText}`);
    }
    return lines.join("\n");
  },
});

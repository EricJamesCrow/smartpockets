import { v } from "convex/values";
import { agentQuery } from "../../functions";
import { api } from "../../../_generated/api";

export const listAccounts = agentQuery({
  args: {
    type: v.optional(
      v.union(
        v.literal("checking"),
        v.literal("savings"),
        v.literal("credit_card"),
        v.literal("loan"),
        v.literal("investment"),
      ),
    ),
  },
  returns: v.any(),
  handler: async (ctx, { type }) => {
    const viewer = ctx.viewerX();
    const accounts = (await ctx.runQuery(
      api.plaidComponent.getAccountsByUserId,
      { userId: viewer.externalId },
    )) as Array<{ accountId: string; type: string }>;
    const filtered = type ? accounts.filter((a) => a.type === type) : accounts;
    return {
      ids: filtered.map((a) => a.accountId),
      preview: {
        accounts: filtered,
        live: true,
        capturedAt: new Date().toISOString(),
      },
      window: undefined,
    };
  },
});

import { v } from "convex/values";
import { agentQuery } from "../../functions";
import { api } from "../../../_generated/api";

export const getAccountDetail = agentQuery({
  args: { accountId: v.string() },
  returns: v.any(),
  handler: async (ctx, { accountId }) => {
    const viewer = ctx.viewerX();
    const accounts = (await ctx.runQuery(
      api.plaidComponent.getAccountsByUserId,
      { userId: viewer.externalId },
    )) as Array<{ accountId: string }>;
    const account = accounts.find((a) => a.accountId === accountId);
    if (!account) {
      return {
        ids: [],
        preview: { account: null, live: true, capturedAt: new Date().toISOString() },
        window: undefined,
      };
    }
    return {
      ids: [account.accountId],
      preview: {
        account,
        live: true,
        capturedAt: new Date().toISOString(),
      },
      window: undefined,
    };
  },
});

import { v } from "convex/values";
import { api } from "../../../_generated/api";
import { agentQuery } from "../../functions";
import { accountPreviewForModel } from "./moneyPreview";

export const listAccounts = agentQuery({
    args: {
        type: v.optional(v.union(v.literal("checking"), v.literal("savings"), v.literal("credit_card"), v.literal("loan"), v.literal("investment"))),
    },
    returns: v.any(),
    handler: async (ctx, { type }) => {
        const viewer = ctx.viewerX();
        const accounts = (await ctx.runQuery(api.plaidComponent.getAccountsByUserId, { userId: viewer.externalId })) as Array<{
            accountId: string;
            type: string;
        }>;
        const filtered = type ? accounts.filter((a) => a.type === type) : accounts;
        const previewAccounts = filtered.map(accountPreviewForModel);
        return {
            ids: filtered.map((a) => a.accountId),
            preview: {
                accounts: previewAccounts,
                live: true,
                capturedAt: new Date().toISOString(),
            },
            window: undefined,
        };
    },
});

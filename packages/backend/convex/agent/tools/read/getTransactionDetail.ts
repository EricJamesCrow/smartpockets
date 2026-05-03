import { v } from "convex/values";
import { components } from "../../../_generated/api";
import { agentQuery } from "../../functions";

type RawTransaction = {
    transactionId: string;
    accountId: string;
};

export const getTransactionDetail = agentQuery({
    args: { plaidTransactionId: v.string() },
    returns: v.any(),
    handler: async (ctx, { plaidTransactionId }) => {
        const viewer = ctx.viewerX();

        const viewerAccounts = (await ctx.runQuery(components.plaid.public.getAccountsByUser, {
            userId: viewer.externalId,
        })) as Array<{ accountId: string }>;
        const viewerAccountIds = new Set(viewerAccounts.map((a) => a.accountId));

        // Pull the user's transactions and locate the requested one. The
        // Plaid component does not expose a single-transaction lookup, so
        // we filter the user-scoped list. The auth boundary is enforced by
        // the userId arg + the accountId membership check below.
        const rawTransactions = (await ctx.runQuery(components.plaid.public.getTransactionsByUser, {
            userId: viewer.externalId,
        })) as RawTransaction[];

        const tx = rawTransactions.find((row) => row.transactionId === plaidTransactionId);
        const isViewerOwned = tx ? viewerAccountIds.has(tx.accountId) : false;

        return {
            ids: tx && isViewerOwned ? [tx.transactionId] : [],
            preview: {
                summary: tx && isViewerOwned ? "Transaction located" : "Transaction not found for this user",
                live: true,
                capturedAt: new Date().toISOString(),
            },
            window: undefined,
        };
    },
});

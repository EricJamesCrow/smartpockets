import { v } from "convex/values";
import { components } from "../../../_generated/api";
import { agentQuery } from "../../functions";
import { transactionToAgentRow, type AgentTransactionRow } from "./listTransactions";

type TransactionOverlayLike = {
    plaidTransactionId: string;
    userDate?: string;
    userMerchantName?: string;
    userCategory?: string;
    userCategoryDetailed?: string;
    isHidden?: boolean;
    notes?: string;
    isReviewed?: boolean;
};

type RawTransaction = {
    transactionId: string;
    accountId: string;
    amount: number; // milliunits
    date: string;
    name: string;
    merchantName?: string;
    categoryPrimary?: string;
    categoryDetailed?: string;
    pending: boolean;
};

type RawAccount = {
    accountId: string;
    mask?: string;
};

export const getTransactionDetail = agentQuery({
    args: { plaidTransactionId: v.string() },
    returns: v.any(),
    handler: async (ctx, { plaidTransactionId }) => {
        const viewer = ctx.viewerX();

        const viewerAccounts = (await ctx.runQuery(components.plaid.public.getAccountsByUser, {
            userId: viewer.externalId,
        })) as RawAccount[];
        const viewerAccountIds = new Set(viewerAccounts.map((a) => a.accountId));
        const accountMaskById = new Map(viewerAccounts.map((a) => [a.accountId, a.mask]));

        // Pull the user's transactions and locate the requested one. The
        // Plaid component does not expose a single-transaction lookup, so
        // we filter the user-scoped list. The auth boundary is enforced by
        // the userId arg + the accountId membership check below.
        const rawTransactions = (await ctx.runQuery(components.plaid.public.getTransactionsByUser, {
            userId: viewer.externalId,
        })) as RawTransaction[];

        const tx = rawTransactions.find((row) => row.transactionId === plaidTransactionId);
        const isViewerOwned = tx ? viewerAccountIds.has(tx.accountId) : false;

        if (!tx || !isViewerOwned) {
            return {
                ids: [],
                row: null,
                preview: {
                    summary: "Transaction not found for this user",
                    live: true,
                    capturedAt: new Date().toISOString(),
                },
                window: undefined,
            };
        }

        // Indexed lookup; convex-ents table queries don't expose .first() so
        // we take element [0]. Compound index (userId, plaidTransactionId)
        // is unique per the schema definition.
        const existing = await ctx.table(
            "transactionOverlays",
            "by_user_and_transaction",
            (q) => q.eq("userId", viewer._id).eq("plaidTransactionId", plaidTransactionId),
        );
        const overlayLike = (existing[0] ?? undefined) as TransactionOverlayLike | undefined;

        // Compact snapshot the model can reason about. Mirrors the shape
        // emitted by list_transactions/search_merchants so the agent has a
        // consistent vocabulary across read tools. Adds notes/isReviewed
        // because per-transaction lookups are usually about the user's own
        // annotations.
        const row: AgentTransactionRow & { notes?: string; isReviewed?: boolean } = {
            ...transactionToAgentRow(tx, overlayLike, accountMaskById),
            notes: overlayLike?.notes,
            isReviewed: overlayLike?.isReviewed,
        };

        return {
            ids: [tx.transactionId],
            row,
            preview: {
                summary: "Transaction located",
                live: true,
                capturedAt: new Date().toISOString(),
            },
            window: undefined,
        };
    },
});

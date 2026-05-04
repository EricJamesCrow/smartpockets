import { v } from "convex/values";
import { components } from "../../../_generated/api";
import { agentQuery } from "../../functions";

// Default cap when the model doesn't pass `limit`. The user's "show me the
// last ten" intent maps to `limit=10`; if the model omits limit entirely we
// still don't want to dump hundreds of rows into the chat card.
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 500;

type TransactionOverlayLike = {
    plaidTransactionId: string;
    userDate?: string;
    userMerchantName?: string;
    userCategory?: string;
    userCategoryDetailed?: string;
    isHidden?: boolean;
};

type RawTransaction = {
    transactionId: string;
    accountId: string;
    amount: number;
    date: string;
    name: string;
    merchantName?: string;
    categoryPrimary?: string;
    categoryDetailed?: string;
    pending: boolean;
};

function buildSummary(count: number, dateFrom: string | undefined, dateTo: string | undefined): string {
    const noun = count === 1 ? "transaction" : "transactions";
    if (dateFrom && dateTo) {
        return `${count} ${noun} from ${dateFrom} to ${dateTo}`;
    }
    if (dateFrom) {
        return `${count} ${noun} since ${dateFrom}`;
    }
    if (dateTo) {
        return `${count} ${noun} through ${dateTo}`;
    }
    return `${count} most-recent ${noun}`;
}

export const listTransactions = agentQuery({
    args: {
        accountId: v.optional(v.string()),
        dateFrom: v.optional(v.string()),
        dateTo: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.any(),
    handler: async (ctx, { accountId, dateFrom, dateTo, limit }) => {
        const viewer = ctx.viewerX();
        const effectiveLimit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit ?? DEFAULT_LIMIT)));

        // Auth boundary: enumerate the viewer's accounts so we can scope
        // anything returned by the Plaid component to accounts they own.
        const viewerAccounts = (await ctx.runQuery(components.plaid.public.getAccountsByUser, {
            userId: viewer.externalId,
        })) as Array<{ accountId: string }>;
        const viewerAccountIds = new Set(viewerAccounts.map((a) => a.accountId));

        if (viewerAccountIds.size === 0) {
            return {
                ids: [],
                preview: {
                    totalCount: 0,
                    summary: "No accounts linked yet",
                    live: true,
                    capturedAt: new Date().toISOString(),
                },
                window: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
            };
        }

        if (accountId && !viewerAccountIds.has(accountId)) {
            return {
                ids: [],
                preview: {
                    totalCount: 0,
                    summary: "Account not found for this user",
                    live: true,
                    capturedAt: new Date().toISOString(),
                },
                window: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
            };
        }

        const allowedAccountIds = accountId ? new Set([accountId]) : viewerAccountIds;

        // Pull transactions for the viewer. The Plaid component accepts
        // optional startDate/endDate (ISO YYYY-MM-DD); when omitted we get
        // the full window the component has retained for this user, which
        // is what the model wants when it asks for "last N transactions".
        const [rawTransactions, overlays] = await Promise.all([
            ctx.runQuery(components.plaid.public.getTransactionsByUser, {
                userId: viewer.externalId,
                startDate: dateFrom,
                endDate: dateTo,
            }) as Promise<RawTransaction[]>,
            ctx.table("transactionOverlays", "by_user_and_transaction", (q) => q.eq("userId", viewer._id)),
        ]);

        const overlayByTxId = new Map(
            (overlays as TransactionOverlayLike[]).map((overlay) => [overlay.plaidTransactionId, overlay]),
        );

        const filtered = rawTransactions.filter((tx) => allowedAccountIds.has(tx.accountId));

        // Hidden transactions are intentionally hidden by the user; don't
        // surface them in agent listings.
        const visible = filtered.filter((tx) => !overlayByTxId.get(tx.transactionId)?.isHidden);

        // Newest first using effective (overlay-respecting) date so user
        // edits to userDate are honored.
        const sorted = visible
            .map((tx) => {
                const overlay = overlayByTxId.get(tx.transactionId);
                return { tx, effectiveDate: overlay?.userDate ?? tx.date };
            })
            .sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : a.effectiveDate > b.effectiveDate ? -1 : 0))
            .map(({ tx }) => tx);

        const totalCount = sorted.length;
        const truncated = sorted.slice(0, effectiveLimit);
        const ids = truncated.map((tx) => tx.transactionId);

        return {
            ids,
            preview: {
                totalCount,
                summary: buildSummary(totalCount, dateFrom, dateTo),
                live: true,
                capturedAt: new Date().toISOString(),
            },
            window: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
        };
    },
});

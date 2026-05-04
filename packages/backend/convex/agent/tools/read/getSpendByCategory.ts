import { v } from "convex/values";
import { components } from "../../../_generated/api";
import { agentQuery } from "../../functions";

// Default window when the model omits dateFrom/dateTo. The "spend last month"
// intent maps to the last 30 days; if either bound is supplied we honor it.
const DEFAULT_WINDOW_DAYS = 30;
// Top-N cap for buckets returned in the preview. Recharts pie can only render
// so many slices before the legend is unreadable. Tail buckets are folded into
// "Other" so the pie always sums to the user's actual total.
const MAX_BUCKETS = 8;

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
    amount: number; // milliunits
    date: string;
    name: string;
    merchantName?: string;
    categoryPrimary?: string;
    categoryDetailed?: string;
    pending: boolean;
};

function formatDateRange(from: string, to: string): string {
    return `${from} to ${to}`;
}

function isoDaysAgo(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
}

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

export const getSpendByCategory = agentQuery({
    args: {
        dateFrom: v.optional(v.string()),
        dateTo: v.optional(v.string()),
        granularity: v.optional(v.union(v.literal("primary"), v.literal("detailed"))),
    },
    returns: v.any(),
    handler: async (ctx, { dateFrom, dateTo, granularity }) => {
        const viewer = ctx.viewerX();
        const useDetailed = granularity === "detailed";

        // Default window: last 30 days. If only one bound is supplied, anchor
        // the other to that bound so the model's partial intent is preserved
        // ("spend since 2026-01-01" → today).
        const effectiveTo = dateTo ?? todayIso();
        const effectiveFrom = dateFrom ?? isoDaysAgo(DEFAULT_WINDOW_DAYS);

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
                    buckets: [],
                    totalAmount: 0,
                    summary: "No accounts linked yet",
                },
                window: { from: effectiveFrom, to: effectiveTo },
            };
        }

        const [rawTransactions, overlays] = await Promise.all([
            ctx.runQuery(components.plaid.public.getTransactionsByUser, {
                userId: viewer.externalId,
                startDate: effectiveFrom,
                endDate: effectiveTo,
            }) as Promise<RawTransaction[]>,
            ctx.table("transactionOverlays", "by_user_and_transaction", (q) => q.eq("userId", viewer._id)),
        ]);

        const overlayByTxId = new Map(
            (overlays as TransactionOverlayLike[]).map((overlay) => [overlay.plaidTransactionId, overlay]),
        );

        // Filter to the viewer's accounts (defense in depth — getTransactionsByUser
        // is already scoped, but we guard against a future change).
        const ownedTxs = rawTransactions.filter((tx) => viewerAccountIds.has(tx.accountId));

        // Hidden transactions are excluded from the agent's category breakdown.
        const visible = ownedTxs.filter((tx) => !overlayByTxId.get(tx.transactionId)?.isHidden);

        // Bucket by category, honoring user-edited categories (overlay).
        // Spend is positive amounts (Plaid's convention: positive = money out).
        // Negative amounts (refunds, income) are excluded from "spend" totals.
        const totals = new Map<string, number>();
        const idsByCategory = new Map<string, string[]>();
        for (const tx of visible) {
            if (tx.amount <= 0) continue;
            const overlay = overlayByTxId.get(tx.transactionId);
            const baseCategory = useDetailed
                ? overlay?.userCategoryDetailed ?? tx.categoryDetailed
                : overlay?.userCategory ?? tx.categoryPrimary;
            const category = baseCategory ?? "Uncategorized";
            totals.set(category, (totals.get(category) ?? 0) + tx.amount);
            const idList = idsByCategory.get(category);
            if (idList) {
                idList.push(tx.transactionId);
            } else {
                idsByCategory.set(category, [tx.transactionId]);
            }
        }

        const sortedBuckets = Array.from(totals, ([category, milliunits]) => ({
            category,
            // Convert milliunits to dollars for the preview contract (the chart
            // component formats with formatMoneyFromDollars).
            amount: milliunits / 1000,
        })).sort((a, b) => b.amount - a.amount);

        // Fold tail buckets beyond MAX_BUCKETS into "Other" so the pie chart
        // always displays the user's full total.
        let buckets: Array<{ category: string; amount: number }>;
        if (sortedBuckets.length <= MAX_BUCKETS) {
            buckets = sortedBuckets;
        } else {
            const head = sortedBuckets.slice(0, MAX_BUCKETS - 1);
            const tail = sortedBuckets.slice(MAX_BUCKETS - 1);
            const otherAmount = tail.reduce((sum, b) => sum + b.amount, 0);
            buckets = [...head, { category: "Other", amount: otherAmount }];
        }

        // ids for live aggregation: surface every visible spend-tx in the
        // window so SpendByCategoryChart can re-aggregate client-side via
        // useLiveTransactions() when the user edits a category.
        const ids = visible.filter((tx) => tx.amount > 0).map((tx) => tx.transactionId);
        const totalAmount = sortedBuckets.reduce((sum, b) => sum + b.amount, 0);
        const summary =
            totalAmount > 0
                ? `Spend by category, ${formatDateRange(effectiveFrom, effectiveTo)}`
                : "No spending in window";

        return {
            ids,
            preview: {
                buckets,
                totalAmount,
                summary,
            },
            window: { from: effectiveFrom, to: effectiveTo },
        };
    },
});

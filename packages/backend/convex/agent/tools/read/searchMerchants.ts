import { v } from "convex/values";
import { components } from "../../../_generated/api";
import { agentQuery } from "../../functions";

// Default window when the model omits dateFrom/dateTo. Searches need a
// reasonable backlog ("recent Amazon charges") but not an unbounded scan.
const DEFAULT_WINDOW_DAYS = 90;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
// Number of transaction IDs to surface per merchant for live drill-down.
// Cap to keep the payload small; the count is the source of truth.
const SAMPLE_TRANSACTIONS_PER_MERCHANT = 5;

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

function isoDaysAgo(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
}

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

export const searchMerchants = agentQuery({
    args: {
        query: v.string(),
        dateFrom: v.optional(v.string()),
        dateTo: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.any(),
    handler: async (ctx, { query, dateFrom, dateTo, limit }) => {
        const viewer = ctx.viewerX();
        const trimmedQuery = query.trim();
        const effectiveLimit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit ?? DEFAULT_LIMIT)));
        const effectiveTo = dateTo ?? todayIso();
        const effectiveFrom = dateFrom ?? isoDaysAgo(DEFAULT_WINDOW_DAYS);
        const window = { from: effectiveFrom, to: effectiveTo };

        // Defensive: empty query is not an error but yields no matches.
        // Returning a clean empty payload is friendlier than throwing.
        if (trimmedQuery.length === 0) {
            return {
                ids: [],
                preview: {
                    merchants: [],
                    summary: "Empty query",
                    live: true,
                    capturedAt: new Date().toISOString(),
                },
                window,
            };
        }

        // Auth boundary: enumerate the viewer's accounts.
        const viewerAccounts = (await ctx.runQuery(components.plaid.public.getAccountsByUser, {
            userId: viewer.externalId,
        })) as Array<{ accountId: string }>;
        const viewerAccountIds = new Set(viewerAccounts.map((a) => a.accountId));

        if (viewerAccountIds.size === 0) {
            return {
                ids: [],
                preview: {
                    merchants: [],
                    summary: "No accounts linked yet",
                    live: true,
                    capturedAt: new Date().toISOString(),
                },
                window,
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

        // Defense in depth.
        const owned = rawTransactions.filter((tx) => viewerAccountIds.has(tx.accountId));

        // Hidden transactions are excluded from search.
        const visible = owned.filter((tx) => !overlayByTxId.get(tx.transactionId)?.isHidden);

        const needle = trimmedQuery.toLowerCase();

        // Group hits by effective merchant name. Effective name honors the
        // user's overlay so a transaction the user renamed to "Amazon"
        // shows up when they search "amazon" even if Plaid called it
        // "AMZN MKTP US*A12B3CD".
        type MerchantBucket = {
            name: string;
            count: number;
            totalAmount: number; // dollars
            lastDate: string;
            sampleTransactionIds: string[];
        };
        const merchants = new Map<string, MerchantBucket>();
        const allMatchedIds: string[] = [];

        for (const tx of visible) {
            const overlay = overlayByTxId.get(tx.transactionId);
            const effectiveName = overlay?.userMerchantName ?? tx.merchantName ?? tx.name;
            if (!effectiveName.toLowerCase().includes(needle)) continue;

            const effectiveDate = overlay?.userDate ?? tx.date;
            const dollars = tx.amount / 1000;
            allMatchedIds.push(tx.transactionId);

            const key = effectiveName;
            const bucket = merchants.get(key);
            if (bucket) {
                bucket.count += 1;
                bucket.totalAmount += dollars;
                if (effectiveDate > bucket.lastDate) bucket.lastDate = effectiveDate;
                if (bucket.sampleTransactionIds.length < SAMPLE_TRANSACTIONS_PER_MERCHANT) {
                    bucket.sampleTransactionIds.push(tx.transactionId);
                }
            } else {
                merchants.set(key, {
                    name: effectiveName,
                    count: 1,
                    totalAmount: dollars,
                    lastDate: effectiveDate,
                    sampleTransactionIds: [tx.transactionId],
                });
            }
        }

        // Rank: highest transaction count first (most-frequent merchants are
        // typically what the user wants when searching), tiebreak by total
        // amount descending.
        const ranked = Array.from(merchants.values()).sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return b.totalAmount - a.totalAmount;
        });

        const truncated = ranked.slice(0, effectiveLimit);
        const totalMerchants = merchants.size;
        const summary =
            totalMerchants === 0
                ? `No merchants matching "${trimmedQuery}"`
                : totalMerchants === 1
                    ? `1 merchant matching "${trimmedQuery}"`
                    : `${totalMerchants} merchants matching "${trimmedQuery}"`;

        return {
            // Surface every matched transaction ID so future drill-down
            // tools (and `deriveSummary`'s `${n} results` count) reflect
            // actual matches rather than just the bucketed merchants.
            ids: allMatchedIds,
            preview: {
                merchants: truncated,
                summary,
                live: true,
                capturedAt: new Date().toISOString(),
            },
            window,
        };
    },
});

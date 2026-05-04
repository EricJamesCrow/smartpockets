import { v } from "convex/values";
import { components } from "../../../_generated/api";
import { agentQuery } from "../../functions";
import { transactionToAgentRow, type AgentTransactionRow } from "./listTransactions";

// Default window when the model omits dateFrom/dateTo. Searches need a
// reasonable backlog ("recent Amazon charges") but not an unbounded scan.
const DEFAULT_WINDOW_DAYS = 90;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
// Number of transaction IDs to surface per merchant for live drill-down.
// Cap to keep the payload small; the count is the source of truth.
const SAMPLE_TRANSACTIONS_PER_MERCHANT = 5;
// Cap on the per-row snapshot embedded for the agent. Sized so the model
// can answer "give me details for the eBay row" without another tool
// round-trip; sized small enough to stay near the runtime's 25-item array
// reduction tier. `ids` and `preview.merchants[].count` still reflect the
// full match set so the agent knows what was elided.
const MAX_AGENT_ROWS = 50;

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

type RawAccount = {
    accountId: string;
    mask?: string;
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
                rows: [],
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
        })) as RawAccount[];
        const viewerAccountIds = new Set(viewerAccounts.map((a) => a.accountId));
        const accountMaskById = new Map(viewerAccounts.map((a) => [a.accountId, a.mask]));

        if (viewerAccountIds.size === 0) {
            return {
                ids: [],
                rows: [],
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
        // CROWDEV-368: each merchant bucket exposes both `totalAmount` (Plaid
        // convention: net signed sum, positive = net outflow) and
        // `displayTotalAmount` (human convention: positive = net money in).
        // Inflow-dominant merchants like "Zelle from family" have negative
        // `totalAmount` in Plaid convention; without `displayTotalAmount`,
        // the model would echo back "totaling -$440" which reads as if the
        // user spent negative money. The model is instructed (system prompt
        // rule #10) to use `displayTotalAmount` when echoing merchant totals.
        type MerchantBucket = {
            name: string;
            count: number;
            /** Plaid convention: positive = net outflow (dollars). */
            totalAmount: number;
            /** Human convention: positive = net money in (dollars). Use this in user-facing text. */
            displayTotalAmount: number;
            lastDate: string;
            sampleTransactionIds: string[];
        };
        const merchants = new Map<string, MerchantBucket>();
        const allMatchedIds: string[] = [];
        // Buffer matched transactions in encounter order so we can later
        // emit per-row snapshots for the agent (newest first, capped).
        const matchedTransactions: RawTransaction[] = [];

        for (const tx of visible) {
            const overlay = overlayByTxId.get(tx.transactionId);
            const effectiveName = overlay?.userMerchantName ?? tx.merchantName ?? tx.name;
            if (!effectiveName.toLowerCase().includes(needle)) continue;

            const effectiveDate = overlay?.userDate ?? tx.date;
            const dollars = tx.amount / 1000;
            allMatchedIds.push(tx.transactionId);
            matchedTransactions.push(tx);

            const key = effectiveName;
            const bucket = merchants.get(key);
            if (bucket) {
                bucket.count += 1;
                bucket.totalAmount += dollars;
                bucket.displayTotalAmount = -bucket.totalAmount;
                if (effectiveDate > bucket.lastDate) bucket.lastDate = effectiveDate;
                if (bucket.sampleTransactionIds.length < SAMPLE_TRANSACTIONS_PER_MERCHANT) {
                    bucket.sampleTransactionIds.push(tx.transactionId);
                }
            } else {
                merchants.set(key, {
                    name: effectiveName,
                    count: 1,
                    totalAmount: dollars,
                    displayTotalAmount: -dollars,
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

        // Embed compact per-row snapshots for matched transactions so the
        // agent can answer follow-up questions without another tool call.
        // Newest-first so the most relevant rows survive the cap. Capped at
        // MAX_AGENT_ROWS for token discipline; `ids` and merchant counts
        // still reflect the full match set so the agent knows what was
        // elided.
        const rows: AgentTransactionRow[] = matchedTransactions
            .slice()
            .sort((a, b) => {
                const aDate = overlayByTxId.get(a.transactionId)?.userDate ?? a.date;
                const bDate = overlayByTxId.get(b.transactionId)?.userDate ?? b.date;
                return aDate < bDate ? 1 : aDate > bDate ? -1 : 0;
            })
            .slice(0, MAX_AGENT_ROWS)
            .map((tx) => transactionToAgentRow(tx, overlayByTxId.get(tx.transactionId), accountMaskById));

        return {
            // Surface every matched transaction ID so future drill-down
            // tools (and `deriveSummary`'s `${n} results` count) reflect
            // actual matches rather than just the bucketed merchants.
            ids: allMatchedIds,
            rows,
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

import { v } from "convex/values";
import { components } from "../../../_generated/api";
import { agentQuery } from "../../functions";

// Default window when the model omits dateFrom/dateTo. The "spend trend over
// the last quarter" intent maps to ~90 days; the model can override.
const DEFAULT_WINDOW_DAYS = 90;

type Granularity = "day" | "week" | "month";

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

/**
 * Compute the bucket boundaries (from/to ISO dates) for a given transaction
 * date and granularity. Mirrors the client-side aggregation in
 * SpendOverTimeChart so server-side fallback aggregation matches the live
 * re-aggregation users see when they edit transactions.
 *
 * Week boundaries are Sunday..Saturday (US convention; matches
 * `Date.getDay() === 0` for Sunday).
 */
function bucketBounds(isoDate: string, granularity: Granularity): { from: string; to: string } {
    const [y, m, d] = isoDate.split("-").map(Number);
    if (!y || !m || !d) return { from: isoDate, to: isoDate };

    if (granularity === "month") {
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
        return {
            from: `${y}-${String(m).padStart(2, "0")}-01`,
            to: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
        };
    }

    if (granularity === "week") {
        // Find Sunday of the week containing this date (UTC).
        const date = new Date(Date.UTC(y, m - 1, d));
        const dow = date.getUTCDay(); // 0=Sun..6=Sat
        const sunday = new Date(date);
        sunday.setUTCDate(date.getUTCDate() - dow);
        const saturday = new Date(sunday);
        saturday.setUTCDate(sunday.getUTCDate() + 6);
        return {
            from: sunday.toISOString().slice(0, 10),
            to: saturday.toISOString().slice(0, 10),
        };
    }

    // day
    return { from: isoDate, to: isoDate };
}

export const getSpendOverTime = agentQuery({
    args: {
        dateFrom: v.optional(v.string()),
        dateTo: v.optional(v.string()),
        bucket: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"))),
    },
    returns: v.any(),
    handler: async (ctx, { dateFrom, dateTo, bucket }) => {
        const viewer = ctx.viewerX();
        const granularity: Granularity = bucket ?? "week";

        const effectiveTo = dateTo ?? todayIso();
        const effectiveFrom = dateFrom ?? isoDaysAgo(DEFAULT_WINDOW_DAYS);

        // Auth boundary: enumerate the viewer's accounts.
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
                window: { from: effectiveFrom, to: effectiveTo, granularity },
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

        // Defense in depth: filter to viewer-owned accounts even though
        // getTransactionsByUser is already user-scoped.
        const owned = rawTransactions.filter((tx) => viewerAccountIds.has(tx.accountId));

        // Hidden transactions are excluded from spend trends.
        const visible = owned.filter((tx) => !overlayByTxId.get(tx.transactionId)?.isHidden);

        // Bucket positive amounts (spend). Negatives are refunds/income and
        // belong to a separate "income over time" view, not this chart.
        const bucketsByKey = new Map<string, { from: string; to: string; amount: number }>();
        const ids: string[] = [];
        for (const tx of visible) {
            if (tx.amount <= 0) continue;
            const overlay = overlayByTxId.get(tx.transactionId);
            // Honor user-edited userDate so a tx the user moved is bucketed
            // where they think it should be.
            const effectiveDate = overlay?.userDate ?? tx.date;
            const bounds = bucketBounds(effectiveDate, granularity);
            const dollars = tx.amount / 1000;
            const existing = bucketsByKey.get(bounds.from);
            if (existing) {
                existing.amount += dollars;
            } else {
                bucketsByKey.set(bounds.from, { from: bounds.from, to: bounds.to, amount: dollars });
            }
            ids.push(tx.transactionId);
        }

        const buckets = Array.from(bucketsByKey.values()).sort((a, b) => a.from.localeCompare(b.from));
        const totalAmount = buckets.reduce((sum, b) => sum + b.amount, 0);
        const granularityLabel =
            granularity === "day" ? "Daily" : granularity === "week" ? "Weekly" : "Monthly";
        const summary =
            totalAmount > 0
                ? `${granularityLabel} spend, ${effectiveFrom} to ${effectiveTo}`
                : "No spending in window";

        return {
            ids,
            preview: {
                buckets,
                totalAmount,
                summary,
            },
            window: { from: effectiveFrom, to: effectiveTo, granularity },
        };
    },
});

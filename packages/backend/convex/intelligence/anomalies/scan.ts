import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internalMutation, internalQuery } from "../../functions";
import { components, internal } from "../../_generated/api";
import {
    evaluateAmountSpike,
    evaluateDuplicateCharge,
    evaluateNewMerchantThreshold,
    NEW_MERCHANT_WINDOW_DAYS,
    SPIKE_WINDOW_DAYS,
    type RuleResult,
    type Transaction,
} from "./rules";

// Milliunits → dollars at the Plaid component boundary.
const MILLIUNITS_PER_DOLLAR = 1000;

function fromMilliunits(m: number): number {
    return m / MILLIUNITS_PER_DOLLAR;
}

function ymdDaysAgo(anchor: string, days: number): string {
    const d = new Date(`${anchor}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
}

function todayUtcYmd(): string {
    return new Date().toISOString().slice(0, 10);
}

function minYmd(a: string, b: string): string {
    return a < b ? a : b;
}

function maxYmd(a: string, b: string): string {
    return a > b ? a : b;
}

type PlaidTxn = {
    _id: string;
    transactionId: string;
    userId: string;
    accountId: string;
    amount: number; // milliunits
    date: string;
    merchantName?: string;
    pending: boolean;
    categoryPrimary?: string;
};

function toRuleTxn(p: PlaidTxn): Transaction {
    return {
        plaidTransactionId: p.transactionId,
        amount: fromMilliunits(p.amount),
        date: p.date,
        merchantName: p.merchantName ?? null,
        pending: p.pending,
        categoryPrimary: p.categoryPrimary ?? null,
    };
}

export const scanAllUsersInternal = internalAction({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        const userIds = await ctx.runQuery(
            internal.intelligence.anomalies.scan.listUserIdsForScanInternal,
            {},
        );
        for (const userId of userIds) {
            await ctx.scheduler.runAfter(
                0,
                internal.intelligence.anomalies.scan.scanForUserInternal,
                { userId },
            );
        }
        return null;
    },
});

export const listUserIdsForScanInternal = internalQuery({
    args: {},
    returns: v.array(v.id("users")),
    handler: async (ctx) => {
        // Distinct userIds across users with any plaidItem (any active
        // connection). We reach into the component and then map the string
        // userId back to a typed Id<"users"> by looking up the host row.
        const items = await ctx.runQuery(
            components.plaid.public.getAllActiveItems,
            {},
        );
        const seen = new Set<string>();
        const result: Array<
            Awaited<ReturnType<typeof ctx.table>>[number]["_id"] extends infer _
                ? import("../../_generated/dataModel").Id<"users">
                : never
        > = [];
        for (const item of items) {
            if (seen.has(item.userId)) continue;
            seen.add(item.userId);
            const user = await ctx
                .table("users")
                .get("externalId", item.userId);
            if (user) result.push(user._id);
        }
        return result;
    },
});

export const scanForUserInternal = internalMutation({
    args: { userId: v.id("users") },
    returns: v.null(),
    handler: async (ctx, { userId }) => {
        const user = await ctx.table("users").get(userId);
        if (!user) return null;
        const externalId = user.externalId;

        const stateRow = await ctx
            .table("anomalyScanState", "by_userId", (q) =>
                q.eq("userId", userId),
            )
            .first();
        const initialSince = ymdDaysAgo(todayUtcYmd(), NEW_MERCHANT_WINDOW_DAYS);
        const since = stateRow?.lastScannedTransactionDate ?? initialSince;
        const historyStart = ymdDaysAgo(since, NEW_MERCHANT_WINDOW_DAYS);

        // Pull one bounded history window per scan. Transactions on the
        // watermark day are re-scanned, but upsertAnomaly dedups by
        // (plaidTransactionId, ruleType), so boundary repeats do not insert
        // duplicates.
        const historyRaw = (await ctx.runQuery(
            components.plaid.public.getTransactionsByUser,
            {
                userId: externalId,
                startDate: historyStart,
                endDate: ymdDaysAgo(todayUtcYmd(), -1),
            },
        )) as PlaidTxn[];
        const newTxns = historyRaw.filter((p) => p.date >= since);

        let skippedNullCount = 0;
        let maxDate = since;
        const newAnomalyIds: Array<string> = [];

        for (const raw of newTxns) {
            if (raw.date > maxDate) maxDate = raw.date;
            if (!raw.merchantName) {
                skippedNullCount++;
                continue;
            }
            const t = toRuleTxn(raw);

            const priorStart90 = ymdDaysAgo(t.date, SPIKE_WINDOW_DAYS);
            const prior90 = historyRaw
                .filter((p) => p.date >= priorStart90 && p.date < t.date)
                .filter((p) => p.transactionId !== t.plaidTransactionId)
                .filter((p) => (p.merchantName ?? null) === t.merchantName)
                .map(toRuleTxn);

            const spike = evaluateAmountSpike(t, prior90);
            if (spike) {
                const id = await upsertAnomaly(ctx, userId, t, spike);
                if (id) newAnomalyIds.push(id);
            }

            const priorStart365 = ymdDaysAgo(t.date, NEW_MERCHANT_WINDOW_DAYS);
            const prior365Count = historyRaw
                .filter((p) => p.date >= priorStart365 && p.date < t.date)
                .filter((p) => p.transactionId !== t.plaidTransactionId)
                .filter((p) => (p.merchantName ?? null) === t.merchantName)
                .length;

            const newMerchant = evaluateNewMerchantThreshold(t, prior365Count);
            if (newMerchant) {
                const id = await upsertAnomaly(ctx, userId, t, newMerchant);
                if (id) newAnomalyIds.push(id);
            }

            // Duplicate: same-day and adjacent-day candidates at same merchant.
            const duplicateStart = ymdDaysAgo(t.date, 1);
            const duplicateEnd = ymdDaysAgo(t.date, -1);
            const candidates24h = historyRaw
                .filter(
                    (p) =>
                        p.date >= minYmd(duplicateStart, duplicateEnd) &&
                        p.date <= maxYmd(duplicateStart, duplicateEnd),
                )
                .filter((p) => p.transactionId !== t.plaidTransactionId)
                .filter((p) => (p.merchantName ?? null) === t.merchantName)
                .map(toRuleTxn);

            const duplicate = evaluateDuplicateCharge(t, candidates24h);
            if (duplicate) {
                const id = await upsertAnomaly(ctx, userId, t, duplicate);
                if (id) newAnomalyIds.push(id);
            }
        }

        if (stateRow) {
            await stateRow.patch({
                lastScannedAt: Date.now(),
                lastScannedTransactionDate: maxDate,
                skippedNullMerchantCount:
                    stateRow.skippedNullMerchantCount + skippedNullCount,
            });
        } else {
            await ctx.table("anomalyScanState").insert({
                userId,
                lastScannedAt: Date.now(),
                lastScannedTransactionDate: maxDate,
                skippedNullMerchantCount: skippedNullCount,
            });
        }

        // Per-event dispatch: one emailEvents row per new anomaly. The W7
        // workflow coalesces via waitForMoreAnomaliesStep.
        for (const anomalyId of newAnomalyIds) {
            await ctx.scheduler.runAfter(
                0,
                internal.email.dispatch.dispatchAnomalyAlert,
                { userId, anomalyId },
            );
        }

        return null;
    },
});

async function upsertAnomaly(
    // biome-ignore lint/suspicious/noExplicitAny: Ents ctx type is too verbose here
    ctx: any,
    userId: unknown,
    t: Transaction,
    result: RuleResult,
): Promise<string | null> {
    const existing = await ctx
        .table("anomalies", "by_plaidTransactionId_ruleType", (q: any) =>
            q.eq("plaidTransactionId", t.plaidTransactionId).eq(
                "ruleType",
                result.ruleType,
            ),
        )
        .first();
    if (existing) return null;

    const insertedId = await ctx.table("anomalies").insert({
        userId,
        plaidTransactionId: t.plaidTransactionId,
        ruleType: result.ruleType,
        score: result.score,
        evidenceJson: result.evidenceJson,
        merchantName: t.merchantName ?? "",
        amount: t.amount,
        transactionDate: t.date,
        detectedAt: Date.now(),
        userStatus: "pending" as const,
    });
    return insertedId as unknown as string;
}

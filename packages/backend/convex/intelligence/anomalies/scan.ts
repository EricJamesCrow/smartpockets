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

type RuleAnomalyInput = {
    plaidTransactionId: string;
    amount: number;
    date: string;
    merchantName: string;
    ruleType: RuleResult["ruleType"];
    score: number;
    evidenceJson: string;
};

const ruleTypeValidator = v.union(
    v.literal("amount_spike_3x"),
    v.literal("new_merchant_threshold"),
    v.literal("duplicate_charge_24h"),
);

const ruleAnomalyInputValidator = v.object({
    plaidTransactionId: v.string(),
    amount: v.number(),
    date: v.string(),
    merchantName: v.string(),
    ruleType: ruleTypeValidator,
    score: v.number(),
    evidenceJson: v.string(),
});

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

function toAnomalyInput(t: Transaction, result: RuleResult): RuleAnomalyInput {
    return {
        plaidTransactionId: t.plaidTransactionId,
        amount: t.amount,
        date: t.date,
        merchantName: t.merchantName ?? "",
        ruleType: result.ruleType,
        score: result.score,
        evidenceJson: result.evidenceJson,
    };
}

function isUniqueConstraintError(err: unknown): boolean {
    return err instanceof Error && /unique|uniqueness/i.test(err.message);
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

export const loadScanInputsInternal = internalQuery({
    args: { userId: v.id("users") },
    returns: v.union(
        v.null(),
        v.object({
            externalId: v.string(),
            since: v.string(),
            historyStart: v.string(),
            today: v.string(),
        }),
    ),
    handler: async (ctx, { userId }) => {
        const user = await ctx.table("users").get(userId);
        if (!user) return null;

        const stateRow = await ctx.table("anomalyScanState").get("userId", userId);
        const today = todayUtcYmd();
        const initialSince = ymdDaysAgo(today, NEW_MERCHANT_WINDOW_DAYS);
        const since = stateRow?.lastScannedTransactionDate ?? initialSince;
        const historyStart = ymdDaysAgo(since, NEW_MERCHANT_WINDOW_DAYS);
        return {
            externalId: user.externalId,
            since,
            historyStart,
            today,
        };
    },
});

export const scanForUserInternal = internalAction({
    args: { userId: v.id("users") },
    returns: v.null(),
    handler: async (ctx, { userId }) => {
        const inputs = await ctx.runQuery(
            internal.intelligence.anomalies.scan.loadScanInputsInternal,
            { userId },
        );
        if (!inputs) return null;

        // Pull one bounded history window per scan. Transactions on the
        // watermark day are re-scanned, but upsertAnomaly dedups by
        // (plaidTransactionId, ruleType), so boundary repeats do not insert
        // duplicates.
        const historyRaw = (await ctx.runQuery(
            components.plaid.public.getTransactionsByUser,
            {
                userId: inputs.externalId,
                startDate: inputs.historyStart,
                endDate: ymdDaysAgo(inputs.today, -1),
            },
        )) as PlaidTxn[];
        const newTxns = historyRaw.filter((p) => p.date >= inputs.since);

        let skippedNullCount = 0;
        let maxDate = inputs.since;
        const anomalies: RuleAnomalyInput[] = [];

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
                anomalies.push(toAnomalyInput(t, spike));
            }

            const priorStart365 = ymdDaysAgo(t.date, NEW_MERCHANT_WINDOW_DAYS);
            const prior365Count = historyRaw
                .filter((p) => p.date >= priorStart365 && p.date < t.date)
                .filter((p) => p.transactionId !== t.plaidTransactionId)
                .filter((p) => (p.merchantName ?? null) === t.merchantName)
                .length;

            const newMerchant = evaluateNewMerchantThreshold(t, prior365Count);
            if (newMerchant) {
                anomalies.push(toAnomalyInput(t, newMerchant));
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
                anomalies.push(toAnomalyInput(t, duplicate));
            }
        }

        const { newAnomalyIds } = await ctx.runMutation(
            internal.intelligence.anomalies.scan.persistScanResultsInternal,
            {
                userId,
                maxDate,
                skippedNullMerchantCount: skippedNullCount,
                anomalies,
            },
        );

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

export const persistScanResultsInternal = internalMutation({
    args: {
        userId: v.id("users"),
        maxDate: v.string(),
        skippedNullMerchantCount: v.number(),
        anomalies: v.array(ruleAnomalyInputValidator),
    },
    returns: v.object({ newAnomalyIds: v.array(v.string()) }),
    handler: async (
        ctx,
        { userId, maxDate, skippedNullMerchantCount, anomalies },
    ) => {
        const newAnomalyIds: Array<string> = [];
        for (const anomaly of anomalies) {
            const id = await upsertAnomaly(ctx, userId, anomaly);
            if (id) newAnomalyIds.push(id);
        }

        const now = Date.now();
        const stateRow = await ctx.table("anomalyScanState").get("userId", userId);
        if (stateRow) {
            await stateRow.patch({
                lastScannedAt: now,
                lastScannedTransactionDate: maxDate,
                skippedNullMerchantCount:
                    stateRow.skippedNullMerchantCount + skippedNullMerchantCount,
            });
        } else {
            try {
                await ctx.table("anomalyScanState").insert({
                    userId,
                    lastScannedAt: now,
                    lastScannedTransactionDate: maxDate,
                    skippedNullMerchantCount,
                });
            } catch (err) {
                if (!isUniqueConstraintError(err)) throw err;
                const existing = await ctx.table("anomalyScanState").get("userId", userId);
                if (!existing) throw err;
                await existing.patch({
                    lastScannedAt: now,
                    lastScannedTransactionDate: maxDate,
                    skippedNullMerchantCount:
                        existing.skippedNullMerchantCount + skippedNullMerchantCount,
                });
            }
        }

        return { newAnomalyIds };
    },
});

async function upsertAnomaly(
    // biome-ignore lint/suspicious/noExplicitAny: Ents ctx type is too verbose here
    ctx: any,
    userId: unknown,
    input: RuleAnomalyInput,
): Promise<string | null> {
    const existing = await ctx
        .table("anomalies", "by_plaidTransactionId_ruleType", (q: any) =>
            q.eq("plaidTransactionId", input.plaidTransactionId).eq(
                "ruleType",
                input.ruleType,
            ),
        )
        .first();
    if (existing) return null;

    const insertedId = await ctx.table("anomalies").insert({
        userId,
        plaidTransactionId: input.plaidTransactionId,
        ruleType: input.ruleType,
        score: input.score,
        evidenceJson: input.evidenceJson,
        merchantName: input.merchantName,
        amount: input.amount,
        transactionDate: input.date,
        detectedAt: Date.now(),
        userStatus: "pending" as const,
    });
    return insertedId as unknown as string;
}

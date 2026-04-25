import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internalMutation, internalQuery } from "../../functions";
import { components, internal } from "../../_generated/api";
import {
    addDays,
    frequencyToIntervalDays,
    intervalToFrequency,
    mapPlaidFrequency,
    medianInterval,
    normalizeMerchantName,
    roundToHalfDollar,
    type Frequency,
} from "./normalize";

const MILLIUNITS_PER_DOLLAR = 1000;
const CATCHUP_WINDOW_DAYS = 180;
const MIN_OCCURRENCES = 3;

function fromMilliunits(m: number): number {
    return m / MILLIUNITS_PER_DOLLAR;
}

function todayUtcYmd(): string {
    return new Date().toISOString().slice(0, 10);
}

export const scanAllUsersInternal = internalAction({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        const userIds = await ctx.runQuery(
            internal.intelligence.subscriptions.scan
                .listUserIdsWithActiveItemsInternal,
            {},
        );
        for (const userId of userIds) {
            await ctx.scheduler.runAfter(
                0,
                internal.intelligence.subscriptions.scan
                    .scanForUserInternal,
                { userId },
            );
        }
        return null;
    },
});

export const listUserIdsWithActiveItemsInternal = internalQuery({
    args: {},
    returns: v.array(v.id("users")),
    handler: async (ctx) => {
        const items = await ctx.runQuery(
            components.plaid.public.getAllActiveItems,
            {},
        );
        const seen = new Set<string>();
        const result: Array<import("../../_generated/dataModel").Id<"users">> =
            [];
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

type PlaidStream = {
    _id: string;
    streamId: string;
    merchantName?: string;
    description: string;
    averageAmount: number;
    frequency: string;
    status: string;
    type: string;
    isActive: boolean;
    firstDate?: string;
    lastDate?: string;
    predictedNextDate?: string;
};

type PlaidTxn = {
    transactionId: string;
    amount: number;
    date: string;
    merchantName?: string;
    name: string;
    pending: boolean;
    enrichmentData?: { counterpartyEntityId?: string; counterpartyName?: string };
};

export const scanForUserInternal = internalMutation({
    args: { userId: v.id("users") },
    returns: v.null(),
    handler: async (ctx, { userId }) => {
        const user = await ctx.table("users").get(userId);
        if (!user) return null;
        const externalId = user.externalId;

        // --- Step 1: Plaid MATURE outflow streams → source "plaid" rows ---
        const streams = (await ctx.runQuery(
            components.plaid.public.getRecurringStreamsByUser,
            { userId: externalId },
        )) as PlaidStream[];

        const coveredRowIds = new Set<string>();
        for (const stream of streams) {
            if (stream.type !== "outflow") continue;
            if (stream.status !== "MATURE") continue;
            if (!stream.isActive) continue;
            const rowId = await upsertFromPlaidStream(ctx, userId, stream);
            if (rowId) coveredRowIds.add(String(rowId));
        }

        // Deactivate Plaid-sourced rows not covered by any current stream tuple.
        const plaidRows = await ctx
            .table("detectedSubscriptions")
            .filter((q) =>
                q.and(
                    q.eq(q.field("userId"), userId),
                    q.eq(q.field("source"), "plaid"),
                ),
            );
        for (const row of plaidRows) {
            if (!coveredRowIds.has(String(row._id)) && row.isActive) {
                await row.patch({ isActive: false });
            }
        }

        // --- Step 2: Catchup detection on last 180 days of transactions ---
        const today = todayUtcYmd();
        const startDate = addDays(today, -CATCHUP_WINDOW_DAYS);
        const txns = (await ctx.runQuery(
            components.plaid.public.getTransactionsByUser,
            { userId: externalId, startDate, endDate: today, limit: 2000 },
        )) as PlaidTxn[];

        type Group = {
            key: string;
            normalizedMerchant: string;
            amountBucket: number;
            amountsDollars: number[];
            dates: string[];
            txnIds: string[];
        };
        const groups = new Map<string, Group>();

        for (const t of txns) {
            if (t.pending) continue;
            const amountDollars = fromMilliunits(t.amount);
            if (amountDollars <= 0) continue; // outflows only
            const merchantRaw = t.merchantName ?? t.name ?? "";
            const normalized = normalizeMerchantName(merchantRaw);
            if (!normalized) continue;
            // Dual key: enrichment counterpartyEntityId wins when present.
            const entityKey =
                t.enrichmentData?.counterpartyEntityId ?? normalized;
            const amountBucket = roundToHalfDollar(amountDollars);
            const key = `${entityKey}|${amountBucket}`;
            const existing = groups.get(key);
            if (existing) {
                existing.amountsDollars.push(amountDollars);
                existing.dates.push(t.date);
                existing.txnIds.push(t.transactionId);
            } else {
                groups.set(key, {
                    key,
                    normalizedMerchant: normalized,
                    amountBucket,
                    amountsDollars: [amountDollars],
                    dates: [t.date],
                    txnIds: [t.transactionId],
                });
            }
        }

        const newCatchupDetections: Array<{
            subscriptionId: string;
            normalizedMerchant: string;
            averageAmountCents: number;
            frequency: Frequency;
        }> = [];

        for (const group of groups.values()) {
            if (group.dates.length < MIN_OCCURRENCES) continue;
            const median = medianInterval(group.dates);
            if (median == null) continue;
            const frequency = intervalToFrequency(median);
            if (!frequency) continue;

            // Precedence: skip if a Plaid-sourced row already covers this
            // (normalizedMerchant, amountBucket) pair.
            const plaidConflict = await ctx
                .table(
                    "detectedSubscriptions",
                    "by_user_normalizedMerchant_amountBucket",
                    (q) =>
                        q
                            .eq("userId", userId)
                            .eq("normalizedMerchant", group.normalizedMerchant)
                            .eq("amountBucket", group.amountBucket),
                )
                .filter((q) => q.eq(q.field("source"), "plaid"))
                .first();
            if (plaidConflict) continue;

            const avgAmount =
                group.amountsDollars.reduce((a, b) => a + b, 0) /
                group.amountsDollars.length;
            const firstSeen = group.dates.reduce((a, b) => (a < b ? a : b));
            const lastSeen = group.dates.reduce((a, b) => (a > b ? a : b));
            const nextPredicted = addDays(
                lastSeen,
                frequencyToIntervalDays(frequency),
            );

            const { insertedId, wasInsert } = await upsertCatchupRow(
                ctx,
                userId,
                {
                    normalizedMerchant: group.normalizedMerchant,
                    amountBucket: group.amountBucket,
                    frequency,
                    averageAmount: avgAmount,
                    nextPredictedDate: nextPredicted,
                    sampleTransactionIds: group.txnIds.slice(0, 5),
                    firstSeenDate: firstSeen,
                    lastSeenDate: lastSeen,
                    occurrenceCount: group.dates.length,
                },
            );

            if (wasInsert) {
                newCatchupDetections.push({
                    subscriptionId: insertedId,
                    normalizedMerchant: group.normalizedMerchant,
                    averageAmountCents: Math.round(avgAmount * 100),
                    frequency,
                });
            }
        }

        if (newCatchupDetections.length > 0) {
            await ctx.scheduler.runAfter(
                0,
                internal.email.dispatch.dispatchSubscriptionDigest,
                {
                    userId,
                    batchDate: today,
                    detected: newCatchupDetections,
                },
            );
        }

        return null;
    },
});

async function upsertFromPlaidStream(
    // biome-ignore lint/suspicious/noExplicitAny: Ents ctx
    ctx: any,
    userId: unknown,
    stream: PlaidStream,
): Promise<string | null> {
    const averageAmount = fromMilliunits(stream.averageAmount);
    const amountBucket = roundToHalfDollar(averageAmount);
    const merchantRaw = stream.merchantName ?? stream.description ?? "";
    const normalizedMerchant = normalizeMerchantName(merchantRaw);
    if (!normalizedMerchant) return null;
    const frequency = mapPlaidFrequency(stream.frequency) ?? "monthly";

    // Canonical primary key: (userId, normalizedMerchant, amountBucket).
    // plaidStreamId is a secondary tracker that updates on the matching
    // row. This preserves userStatus/userStatusUpdatedAt/nickname even
    // when Plaid recycles a stream ID for the same logical subscription.
    const existing = await ctx
        .table(
            "detectedSubscriptions",
            "by_user_normalizedMerchant_amountBucket",
            (q: any) =>
                q
                    .eq("userId", userId)
                    .eq("normalizedMerchant", normalizedMerchant)
                    .eq("amountBucket", amountBucket),
        )
        .first();

    if (existing) {
        await existing.patch({
            frequency,
            averageAmount,
            nextPredictedDate: stream.predictedNextDate,
            source: "plaid",
            plaidStreamId: stream.streamId,
            lastSeenDate: stream.lastDate ?? existing.lastSeenDate,
            isActive: true,
        });
        return existing._id as string;
    }

    const insertedId = (await ctx.table("detectedSubscriptions").insert({
        userId,
        normalizedMerchant,
        amountBucket,
        frequency,
        averageAmount,
        nextPredictedDate: stream.predictedNextDate,
        source: "plaid" as const,
        plaidStreamId: stream.streamId,
        sampleTransactionIds: [] as string[],
        firstSeenDate: stream.firstDate ?? stream.lastDate ?? todayUtcYmd(),
        lastSeenDate: stream.lastDate ?? todayUtcYmd(),
        occurrenceCount: 0,
        userStatus: "pending" as const,
        isActive: true,
    })) as unknown as string;
    return insertedId;
}

async function upsertCatchupRow(
    // biome-ignore lint/suspicious/noExplicitAny: Ents ctx
    ctx: any,
    userId: unknown,
    input: {
        normalizedMerchant: string;
        amountBucket: number;
        frequency: Frequency;
        averageAmount: number;
        nextPredictedDate: string;
        sampleTransactionIds: string[];
        firstSeenDate: string;
        lastSeenDate: string;
        occurrenceCount: number;
    },
): Promise<{ insertedId: string; wasInsert: boolean }> {
    const existing = await ctx
        .table(
            "detectedSubscriptions",
            "by_user_normalizedMerchant_amountBucket",
            (q: any) =>
                q
                    .eq("userId", userId)
                    .eq("normalizedMerchant", input.normalizedMerchant)
                    .eq("amountBucket", input.amountBucket),
        )
        .filter((q: any) => q.eq(q.field("source"), "catchup"))
        .first();

    if (existing) {
        await existing.patch({
            frequency: input.frequency,
            averageAmount: input.averageAmount,
            nextPredictedDate: input.nextPredictedDate,
            sampleTransactionIds: input.sampleTransactionIds,
            firstSeenDate: input.firstSeenDate,
            lastSeenDate: input.lastSeenDate,
            occurrenceCount: input.occurrenceCount,
            isActive: true,
        });
        return { insertedId: existing._id as string, wasInsert: false };
    }

    const insertedId = (await ctx.table("detectedSubscriptions").insert({
        userId,
        normalizedMerchant: input.normalizedMerchant,
        amountBucket: input.amountBucket,
        frequency: input.frequency,
        averageAmount: input.averageAmount,
        nextPredictedDate: input.nextPredictedDate,
        source: "catchup" as const,
        sampleTransactionIds: input.sampleTransactionIds,
        firstSeenDate: input.firstSeenDate,
        lastSeenDate: input.lastSeenDate,
        occurrenceCount: input.occurrenceCount,
        userStatus: "pending" as const,
        isActive: true,
    })) as unknown as string;

    return { insertedId, wasInsert: true };
}

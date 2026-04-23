import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internalMutation, internalQuery } from "../../functions";
import { components, internal } from "../../_generated/api";
import {
    computeCashflowForecast,
    type CreditCardInput,
    type DepositoryAccountInput,
    type Frequency,
    type RecurringIncomeInput,
    type SubscriptionInput,
} from "./compute";

const MILLIUNITS_PER_DOLLAR = 1000;

function fromMilliunits(m: number | undefined | null): number | null {
    if (m == null) return null;
    return m / MILLIUNITS_PER_DOLLAR;
}

function mapPlaidFrequencyToCanonical(plaid: string): Frequency | null {
    switch (plaid) {
        case "WEEKLY":
            return "weekly";
        case "BIWEEKLY":
            return "biweekly";
        case "SEMI_MONTHLY":
        case "MONTHLY":
            return "monthly";
        case "ANNUALLY":
            return "annual";
        default:
            return null;
    }
}

/**
 * Fan-out action: finds every user with any active plaidItem (which implies a
 * starting balance source) and schedules a per-user cashflow refresh. Invoked
 * by the daily 07:15 UTC intelligence cron.
 */
export const refreshAllInternal = internalAction({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        const userIds = await ctx.runQuery(
            internal.intelligence.cashflow.refresh.listUserIdsInternal,
            {},
        );
        for (const userId of userIds) {
            await ctx.scheduler.runAfter(
                0,
                internal.intelligence.cashflow.refresh.refreshForUserInternal,
                { userId },
            );
        }
        return null;
    },
});

export const listUserIdsInternal = internalQuery({
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

type PlaidAccount = {
    accountId: string;
    type: string;
    balances: {
        current?: number | null;
        isoCurrencyCode?: string | null;
    };
};

type PlaidStream = {
    streamId: string;
    description: string;
    merchantName?: string;
    averageAmount: number;
    frequency: string;
    status: string;
    type: string;
    isActive: boolean;
    predictedNextDate?: string;
};

export const refreshForUserInternal = internalMutation({
    args: { userId: v.id("users") },
    returns: v.null(),
    handler: async (ctx, { userId }) => {
        const user = await ctx.table("users").get(userId);
        if (!user) return null;
        const externalId = user.externalId;

        const accounts = (await ctx.runQuery(
            components.plaid.public.getAccountsByUser,
            { userId: externalId },
        )) as PlaidAccount[];

        const depositoryAccounts: DepositoryAccountInput[] = accounts.map(
            (a) => ({
                accountId: a.accountId,
                type: a.type,
                isoCurrencyCode: a.balances?.isoCurrencyCode ?? null,
                currentBalanceDollars: fromMilliunits(a.balances?.current),
            }),
        );

        const cards = await ctx
            .table("creditCards", "by_user_active", (q) =>
                q.eq("userId", userId).eq("isActive", true),
            );
        const creditCards: CreditCardInput[] = cards.map((c) => ({
            cardId: c._id as unknown as string,
            displayName: c.displayName,
            nextPaymentDueDate: c.nextPaymentDueDate,
            minimumPaymentDollars: c.minimumPaymentAmount,
            lastStatementBalanceDollars: c.lastStatementBalance,
        }));

        const subs = await ctx
            .table("detectedSubscriptions")
            .filter((q) =>
                q.and(
                    q.eq(q.field("userId"), userId),
                    q.eq(q.field("userStatus"), "confirmed"),
                    q.eq(q.field("isActive"), true),
                ),
            );
        const subscriptions: SubscriptionInput[] = [];
        for (const s of subs) {
            subscriptions.push({
                subscriptionId: s._id as unknown as string,
                label: s.nickname ?? s.normalizedMerchant,
                averageAmountDollars: s.averageAmount,
                frequency: s.frequency,
                nextPredictedDate: s.nextPredictedDate,
            });
        }

        const streams = (await ctx.runQuery(
            components.plaid.public.getRecurringStreamsByUser,
            { userId: externalId },
        )) as PlaidStream[];
        const recurringIncome: RecurringIncomeInput[] = [];
        for (const stream of streams) {
            if (stream.type !== "inflow") continue;
            if (stream.status !== "MATURE") continue;
            if (!stream.isActive) continue;
            const frequency = mapPlaidFrequencyToCanonical(stream.frequency);
            if (!frequency) continue;
            const amountDollars = fromMilliunits(stream.averageAmount);
            if (amountDollars == null) continue;
            recurringIncome.push({
                streamId: stream.streamId,
                label: stream.merchantName ?? stream.description,
                averageAmountDollars: Math.abs(amountDollars),
                frequency,
                predictedNextDate: stream.predictedNextDate,
            });
        }

        const forecast = computeCashflowForecast({
            depositoryAccounts,
            creditCards,
            subscriptions,
            recurringIncome,
        });

        const existing = await ctx
            .table("cashflowForecasts", "by_userId", (q) =>
                q.eq("userId", userId),
            )
            .first();

        const fields = {
            userId,
            horizonStartDate: forecast.horizonStartDate,
            horizonEndDate: forecast.horizonEndDate,
            startingBalance: forecast.startingBalance,
            projectedNetCash: forecast.projectedNetCash,
            endingBalance: forecast.endingBalance,
            lineItemsJson: JSON.stringify(forecast.lineItems),
            generatedAt: Date.now(),
        };

        if (existing) {
            await existing.patch(fields);
        } else {
            await ctx.table("cashflowForecasts").insert(fields);
        }

        return null;
    },
});

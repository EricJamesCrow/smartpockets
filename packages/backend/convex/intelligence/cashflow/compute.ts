// Pure cashflow forecast math. No Convex context; safe to import anywhere.
// Spec: specs/W6-intelligence.md §4.5 (A approach; 30-day horizon).
//
// All input amounts are dollars expressed as non-negative magnitudes. Forecast
// line items are signed: negative = outflow, positive = inflow.
// Callers convert from Plaid milliunits before calling this function.

import { addDays } from "../subscriptions/normalize";
import { daysBetween, todayUtcYmd } from "../promoCountdowns/helpers";

export type Frequency =
    | "weekly"
    | "biweekly"
    | "monthly"
    | "quarterly"
    | "annual";

export type CashflowLineItem = {
    date: string;
    type: "statement_due" | "subscription" | "recurring_income";
    amount: number;
    label: string;
    sourceId: string;
    evidence?: Record<string, unknown>;
};

export type CashflowForecast = {
    horizonStartDate: string;
    horizonEndDate: string;
    startingBalance: number;
    projectedNetCash: number;
    endingBalance: number;
    lineItems: CashflowLineItem[];
    skippedNonUsdDepositoryCount: number;
};

export type DepositoryAccountInput = {
    accountId: string;
    type: string;
    isoCurrencyCode?: string | null;
    currentBalanceDollars: number | null;
};

export type CreditCardInput = {
    cardId: string;
    displayName: string;
    nextPaymentDueDate?: string;
    minimumPaymentDollars?: number;
    lastStatementBalanceDollars?: number;
};

export type SubscriptionInput = {
    subscriptionId: string;
    label: string;
    averageAmountDollars: number;
    frequency: Frequency;
    nextPredictedDate?: string;
};

export type RecurringIncomeInput = {
    streamId: string;
    label: string;
    averageAmountDollars: number;
    frequency: Frequency;
    predictedNextDate?: string;
};

export const HORIZON_DAYS = 30;

export function frequencyToIntervalDays(f: Frequency): number {
    switch (f) {
        case "weekly":
            return 7;
        case "biweekly":
            return 14;
        case "monthly":
            return 30;
        case "quarterly":
            return 91;
        case "annual":
            return 365;
    }
}

function inHorizon(
    dateYmd: string,
    startYmd: string,
    endYmd: string,
): boolean {
    return (
        daysBetween(startYmd, dateYmd) >= 0 &&
        daysBetween(dateYmd, endYmd) >= 0
    );
}

// Shift a stale nextPredictedDate forward by whole intervals until it lands
// on/after today. Returns null if the date is >3 intervals in the past
// (treated as stale/inactive).
function catchUpToHorizon(
    baseYmd: string,
    intervalDays: number,
    todayYmd: string,
    maxShiftIntervals?: number,
): string | null {
    let cursor = baseYmd;
    let shifts = 0;
    while (daysBetween(cursor, todayYmd) > 0) {
        if (
            maxShiftIntervals !== undefined &&
            shifts >= maxShiftIntervals
        ) {
            return null;
        }
        cursor = addDays(cursor, intervalDays);
        shifts++;
    }
    return cursor;
}

export function computeCashflowForecast(input: {
    now?: number;
    depositoryAccounts: DepositoryAccountInput[];
    creditCards: CreditCardInput[];
    subscriptions: SubscriptionInput[];
    recurringIncome: RecurringIncomeInput[];
}): CashflowForecast {
    const todayYmd = todayUtcYmd(input.now ?? Date.now());
    const horizonEnd = addDays(todayYmd, HORIZON_DAYS);

    // Starting balance: sum current USD depository balances.
    let startingBalance = 0;
    let skippedNonUsdDepositoryCount = 0;
    for (const acct of input.depositoryAccounts) {
        if (acct.type !== "depository") continue;
        const currency = acct.isoCurrencyCode ?? "USD";
        if (currency !== "USD") {
            skippedNonUsdDepositoryCount++;
            continue;
        }
        if (acct.currentBalanceDollars == null) continue;
        startingBalance += acct.currentBalanceDollars;
    }

    const lineItems: CashflowLineItem[] = [];

    for (const card of input.creditCards) {
        if (!card.nextPaymentDueDate) continue;
        if (!inHorizon(card.nextPaymentDueDate, todayYmd, horizonEnd)) continue;

        let amountDollars: number | undefined;
        const evidence: Record<string, unknown> = {};
        if (card.minimumPaymentDollars != null && card.minimumPaymentDollars >= 0) {
            amountDollars = card.minimumPaymentDollars;
            evidence.source = "minimum_payment";
        } else if (
            card.lastStatementBalanceDollars != null &&
            card.lastStatementBalanceDollars > 0
        ) {
            amountDollars = card.lastStatementBalanceDollars;
            evidence.source = "last_statement_balance_fallback";
        }
        if (amountDollars == null) continue;

        lineItems.push({
            date: card.nextPaymentDueDate,
            type: "statement_due",
            amount: amountDollars === 0 ? 0 : -amountDollars,
            label: card.displayName,
            sourceId: card.cardId,
            evidence,
        });
    }

    for (const sub of input.subscriptions) {
        if (!sub.nextPredictedDate) continue;
        if (sub.averageAmountDollars <= 0) continue;
        const intervalDays = frequencyToIntervalDays(sub.frequency);
        const start = catchUpToHorizon(
            sub.nextPredictedDate,
            intervalDays,
            todayYmd,
            3,
        );
        if (!start) continue;
        let cursor = start;
        while (inHorizon(cursor, todayYmd, horizonEnd)) {
            lineItems.push({
                date: cursor,
                type: "subscription",
                amount: -sub.averageAmountDollars,
                label: sub.label,
                sourceId: sub.subscriptionId,
            });
            cursor = addDays(cursor, intervalDays);
        }
    }

    for (const income of input.recurringIncome) {
        if (!income.predictedNextDate) continue;
        if (income.averageAmountDollars <= 0) continue;
        const intervalDays = frequencyToIntervalDays(income.frequency);
        const start = catchUpToHorizon(
            income.predictedNextDate,
            intervalDays,
            todayYmd,
        );
        if (!start) continue;
        let cursor = start;
        while (inHorizon(cursor, todayYmd, horizonEnd)) {
            lineItems.push({
                date: cursor,
                type: "recurring_income",
                amount: income.averageAmountDollars,
                label: income.label,
                sourceId: income.streamId,
            });
            cursor = addDays(cursor, intervalDays);
        }
    }

    lineItems.sort((a, b) => a.date.localeCompare(b.date));

    const projectedNetCash = lineItems.reduce((sum, li) => sum + li.amount, 0);
    const endingBalance = startingBalance + projectedNetCash;

    return {
        horizonStartDate: todayYmd,
        horizonEndDate: horizonEnd,
        startingBalance,
        projectedNetCash,
        endingBalance,
        lineItems,
        skippedNonUsdDepositoryCount,
    };
}

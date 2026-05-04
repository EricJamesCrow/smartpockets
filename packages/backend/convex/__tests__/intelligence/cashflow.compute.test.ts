import { describe, it, expect } from "vitest";
import {
    computeCashflowForecast,
    HORIZON_DAYS,
} from "../../intelligence/cashflow/compute";

const NOW = Date.UTC(2026, 3, 21, 12, 0, 0); // 2026-04-21

function defaults() {
    return {
        now: NOW,
        depositoryAccounts: [] as Parameters<
            typeof computeCashflowForecast
        >[0]["depositoryAccounts"],
        creditCards: [] as Parameters<
            typeof computeCashflowForecast
        >[0]["creditCards"],
        subscriptions: [] as Parameters<
            typeof computeCashflowForecast
        >[0]["subscriptions"],
        recurringIncome: [] as Parameters<
            typeof computeCashflowForecast
        >[0]["recurringIncome"],
    };
}

describe("computeCashflowForecast", () => {
    it("returns horizon window of 30 days starting today UTC", () => {
        const out = computeCashflowForecast(defaults());
        expect(out.horizonStartDate).toBe("2026-04-21");
        expect(out.horizonEndDate).toBe("2026-05-21");
        expect(out.horizonStartDate).toBe("2026-04-21");
        expect(HORIZON_DAYS).toBe(30);
    });

    it("with no depository accounts, startingBalance is 0", () => {
        const out = computeCashflowForecast(defaults());
        expect(out.startingBalance).toBe(0);
        expect(out.endingBalance).toBe(0);
        expect(out.projectedNetCash).toBe(0);
        expect(out.lineItems).toEqual([]);
        expect(out.skippedNonUsdDepositoryCount).toBe(0);
    });

    it("sums USD depository balances, ignoring non-depository types", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            depositoryAccounts: [
                {
                    accountId: "a1",
                    type: "depository",
                    isoCurrencyCode: "USD",
                    currentBalanceDollars: 1500.5,
                },
                {
                    accountId: "a2",
                    type: "depository",
                    isoCurrencyCode: "USD",
                    currentBalanceDollars: 250,
                },
                {
                    accountId: "a3",
                    type: "credit",
                    isoCurrencyCode: "USD",
                    currentBalanceDollars: 999,
                },
                {
                    accountId: "a4",
                    type: "depository",
                    isoCurrencyCode: "USD",
                    currentBalanceDollars: null,
                },
            ],
        });
        expect(out.startingBalance).toBe(1750.5);
    });

    it("skips non-USD depository accounts and increments counter", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            depositoryAccounts: [
                {
                    accountId: "a1",
                    type: "depository",
                    isoCurrencyCode: "USD",
                    currentBalanceDollars: 100,
                },
                {
                    accountId: "a2",
                    type: "depository",
                    isoCurrencyCode: "CAD",
                    currentBalanceDollars: 9999,
                },
                {
                    accountId: "a3",
                    type: "depository",
                    isoCurrencyCode: "EUR",
                    currentBalanceDollars: 8888,
                },
            ],
        });
        expect(out.startingBalance).toBe(100);
        expect(out.skippedNonUsdDepositoryCount).toBe(2);
    });

    it("defaults missing isoCurrencyCode to USD", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            depositoryAccounts: [
                {
                    accountId: "a1",
                    type: "depository",
                    currentBalanceDollars: 500,
                },
            ],
        });
        expect(out.startingBalance).toBe(500);
        expect(out.skippedNonUsdDepositoryCount).toBe(0);
    });

    it("emits statement_due line item using minimumPayment when present", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            creditCards: [
                {
                    cardId: "c1",
                    displayName: "Chase Freedom",
                    nextPaymentDueDate: "2026-05-10",
                    minimumPaymentDollars: 35,
                    lastStatementBalanceDollars: 500,
                },
            ],
        });
        expect(out.lineItems).toHaveLength(1);
        expect(out.lineItems[0]).toMatchObject({
            date: "2026-05-10",
            type: "statement_due",
            amount: -35,
            label: "Chase Freedom",
            sourceId: "c1",
            evidence: { source: "minimum_payment" },
        });
    });

    it("falls back to lastStatementBalance when minimum missing and flags evidence", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            creditCards: [
                {
                    cardId: "c1",
                    displayName: "Amex Gold",
                    nextPaymentDueDate: "2026-05-10",
                    lastStatementBalanceDollars: 1200,
                },
            ],
        });
        expect(out.lineItems[0]!.amount).toBe(-1200);
        expect(out.lineItems[0]!.evidence).toEqual({
            source: "last_statement_balance_fallback",
        });
    });

    it("honors an explicit zero minimum payment instead of falling back", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            creditCards: [
                {
                    cardId: "c1",
                    displayName: "Paid card",
                    nextPaymentDueDate: "2026-05-10",
                    minimumPaymentDollars: 0,
                    lastStatementBalanceDollars: 1200,
                },
            ],
        });
        expect(out.lineItems).toHaveLength(1);
        expect(out.lineItems[0]).toMatchObject({
            type: "statement_due",
            amount: 0,
            evidence: { source: "minimum_payment" },
        });
        expect(Object.is(out.lineItems[0]!.amount, -0)).toBe(false);
        expect(out.projectedNetCash).toBe(0);
    });

    it("skips card with no minimumPayment and no lastStatementBalance", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            creditCards: [
                {
                    cardId: "c1",
                    displayName: "Empty",
                    nextPaymentDueDate: "2026-05-10",
                },
            ],
        });
        expect(out.lineItems).toEqual([]);
    });

    it("skips card without nextPaymentDueDate or outside horizon", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            creditCards: [
                {
                    cardId: "c1",
                    displayName: "No date",
                    minimumPaymentDollars: 100,
                },
                {
                    cardId: "c2",
                    displayName: "Past due",
                    nextPaymentDueDate: "2026-04-01",
                    minimumPaymentDollars: 100,
                },
                {
                    cardId: "c3",
                    displayName: "Too far",
                    nextPaymentDueDate: "2026-06-30",
                    minimumPaymentDollars: 100,
                },
            ],
        });
        expect(out.lineItems).toEqual([]);
    });

    it("projects a weekly subscription across the horizon", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            subscriptions: [
                {
                    subscriptionId: "s1",
                    label: "NYT",
                    averageAmountDollars: 4,
                    frequency: "weekly",
                    nextPredictedDate: "2026-04-22",
                },
            ],
        });
        const dates = out.lineItems.map((li) => li.date);
        expect(dates).toEqual([
            "2026-04-22",
            "2026-04-29",
            "2026-05-06",
            "2026-05-13",
            "2026-05-20",
        ]);
        expect(out.projectedNetCash).toBe(-20);
    });

    it("shifts a stale nextPredictedDate forward by whole intervals", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            subscriptions: [
                {
                    subscriptionId: "s1",
                    label: "Spotify",
                    averageAmountDollars: 10,
                    frequency: "monthly",
                    nextPredictedDate: "2026-04-01",
                },
            ],
        });
        const dates = out.lineItems.map((li) => li.date);
        expect(dates).toEqual(["2026-05-01"]);
    });

    it("marks subscription inactive when nextPredictedDate is >3 intervals past", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            subscriptions: [
                {
                    subscriptionId: "s1",
                    label: "Ghost sub",
                    averageAmountDollars: 10,
                    frequency: "monthly",
                    nextPredictedDate: "2025-10-01",
                },
            ],
        });
        expect(out.lineItems).toEqual([]);
    });

    it("skips subscriptions without nextPredictedDate", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            subscriptions: [
                {
                    subscriptionId: "s1",
                    label: "Unknown",
                    averageAmountDollars: 10,
                    frequency: "monthly",
                },
            ],
        });
        expect(out.lineItems).toEqual([]);
    });

    it("skips subscriptions with nonpositive average amounts", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            subscriptions: [
                {
                    subscriptionId: "s1",
                    label: "Signed outflow",
                    averageAmountDollars: -10,
                    frequency: "monthly",
                    nextPredictedDate: "2026-05-01",
                },
                {
                    subscriptionId: "s2",
                    label: "Zero",
                    averageAmountDollars: 0,
                    frequency: "monthly",
                    nextPredictedDate: "2026-05-01",
                },
            ],
        });
        expect(out.lineItems).toEqual([]);
        expect(out.projectedNetCash).toBe(0);
    });

    it("projects recurring income as positive amounts", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            recurringIncome: [
                {
                    streamId: "i1",
                    label: "Salary",
                    averageAmountDollars: 2500,
                    frequency: "biweekly",
                    predictedNextDate: "2026-04-30",
                },
            ],
        });
        const dates = out.lineItems.map((li) => li.date);
        expect(dates).toEqual(["2026-04-30", "2026-05-14"]);
        for (const li of out.lineItems) {
            expect(li.type).toBe("recurring_income");
            expect(li.amount).toBe(2500);
        }
        expect(out.projectedNetCash).toBe(5000);
    });

    it("skips recurring income with nonpositive average amounts", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            recurringIncome: [
                {
                    streamId: "i1",
                    label: "Reversal",
                    averageAmountDollars: -2500,
                    frequency: "biweekly",
                    predictedNextDate: "2026-04-30",
                },
                {
                    streamId: "i2",
                    label: "Zero",
                    averageAmountDollars: 0,
                    frequency: "biweekly",
                    predictedNextDate: "2026-04-30",
                },
            ],
        });
        expect(out.lineItems).toEqual([]);
        expect(out.projectedNetCash).toBe(0);
    });

    it("catches up stale recurring income beyond the subscription cutoff", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            recurringIncome: [
                {
                    streamId: "i1",
                    label: "Salary",
                    averageAmountDollars: 2500,
                    frequency: "biweekly",
                    predictedNextDate: "2026-01-01",
                },
            ],
        });
        expect(out.lineItems.map((li) => li.date)).toEqual([
            "2026-04-23",
            "2026-05-07",
            "2026-05-21",
        ]);
        expect(out.projectedNetCash).toBe(7500);
    });

    it("composes endingBalance from startingBalance + projectedNetCash", () => {
        const out = computeCashflowForecast({
            ...defaults(),
            depositoryAccounts: [
                {
                    accountId: "a1",
                    type: "depository",
                    isoCurrencyCode: "USD",
                    currentBalanceDollars: 3000,
                },
            ],
            creditCards: [
                {
                    cardId: "c1",
                    displayName: "Card",
                    nextPaymentDueDate: "2026-05-01",
                    minimumPaymentDollars: 200,
                },
            ],
            subscriptions: [
                {
                    subscriptionId: "s1",
                    label: "Sub",
                    averageAmountDollars: 15,
                    frequency: "monthly",
                    nextPredictedDate: "2026-05-05",
                },
            ],
            recurringIncome: [
                {
                    streamId: "i1",
                    label: "Paycheck",
                    averageAmountDollars: 2000,
                    frequency: "biweekly",
                    predictedNextDate: "2026-04-25",
                },
            ],
        });
        expect(out.startingBalance).toBe(3000);
        // -200 - 15 + 2000 + 2000 (two paychecks at 04-25, 05-09)
        expect(out.projectedNetCash).toBe(-200 - 15 + 2000 + 2000);
        expect(out.endingBalance).toBe(
            out.startingBalance + out.projectedNetCash,
        );
        expect(out.lineItems.map((li) => li.date)).toEqual([
            "2026-04-25",
            "2026-05-01",
            "2026-05-05",
            "2026-05-09",
        ]);
    });
});

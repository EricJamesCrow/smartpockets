import { describe, it, expect } from "vitest";
import {
    evaluateAmountSpike,
    evaluateDuplicateCharge,
    evaluateNewMerchantThreshold,
    isEligibleForScan,
    type Transaction,
} from "../../intelligence/anomalies/rules";

const base: Transaction = {
    plaidTransactionId: "txn_1",
    amount: 100,
    date: "2026-04-21",
    merchantName: "Starbucks",
    pending: false,
    categoryPrimary: "FOOD_AND_DRINK",
};

function txn(overrides: Partial<Transaction> = {}): Transaction {
    return { ...base, ...overrides };
}

describe("isEligibleForScan", () => {
    it("rejects refunds (amount <= 0)", () => {
        expect(isEligibleForScan(txn({ amount: -50 }))).toBe(false);
        expect(isEligibleForScan(txn({ amount: 0 }))).toBe(false);
    });

    it("rejects pending transactions", () => {
        expect(isEligibleForScan(txn({ pending: true }))).toBe(false);
    });

    it("rejects null-merchant transactions", () => {
        expect(isEligibleForScan(txn({ merchantName: null }))).toBe(false);
    });

    it("rejects excluded categories (RENT_AND_UTILITIES)", () => {
        expect(
            isEligibleForScan(txn({ categoryPrimary: "RENT_AND_UTILITIES" })),
        ).toBe(false);
    });

    it("rejects LOAN_PAYMENTS / TRANSFER_IN / TRANSFER_OUT", () => {
        expect(isEligibleForScan(txn({ categoryPrimary: "LOAN_PAYMENTS" }))).toBe(
            false,
        );
        expect(isEligibleForScan(txn({ categoryPrimary: "TRANSFER_IN" }))).toBe(
            false,
        );
        expect(isEligibleForScan(txn({ categoryPrimary: "TRANSFER_OUT" }))).toBe(
            false,
        );
    });

    it("accepts a normal outflow txn with a non-excluded category", () => {
        expect(isEligibleForScan(base)).toBe(true);
    });
});

describe("evaluateAmountSpike", () => {
    const priors = [txn({ amount: 10 }), txn({ amount: 10 }), txn({ amount: 10 })];

    it("fires when amount > 3x mean with at least 3 priors", () => {
        const result = evaluateAmountSpike(txn({ amount: 100 }), priors);
        expect(result?.ruleType).toBe("amount_spike_3x");
        expect(result?.score).toBe(10);
    });

    it("does not fire at exactly 3x mean (strict >)", () => {
        expect(evaluateAmountSpike(txn({ amount: 30 }), priors)).toBeNull();
    });

    it("does not fire with fewer than 3 prior transactions", () => {
        expect(
            evaluateAmountSpike(
                txn({ amount: 1000 }),
                [txn({ amount: 10 }), txn({ amount: 10 })],
            ),
        ).toBeNull();
    });

    it("does not fire when prior mean is 0 (defensive)", () => {
        const zeros = [txn({ amount: 0 }), txn({ amount: 0 }), txn({ amount: 0 })];
        expect(evaluateAmountSpike(txn({ amount: 100 }), zeros)).toBeNull();
    });

    it("does not fire for pending txn even if amount is extreme", () => {
        expect(
            evaluateAmountSpike(
                txn({ amount: 10000, pending: true }),
                priors,
            ),
        ).toBeNull();
    });

    it("does not fire for excluded category", () => {
        expect(
            evaluateAmountSpike(
                txn({ amount: 10000, categoryPrimary: "LOAN_PAYMENTS" }),
                priors,
            ),
        ).toBeNull();
    });

    it("encodes evidence with priorCount and mean", () => {
        const result = evaluateAmountSpike(txn({ amount: 100 }), priors);
        const ev = JSON.parse(result!.evidenceJson);
        expect(ev.priorCount).toBe(3);
        expect(ev.mean).toBe(10);
        expect(ev.windowDays).toBe(90);
    });
});

describe("evaluateNewMerchantThreshold", () => {
    it("fires when prior count is 0 and amount > $200", () => {
        const result = evaluateNewMerchantThreshold(txn({ amount: 250 }), 0);
        expect(result?.ruleType).toBe("new_merchant_threshold");
        expect(result?.score).toBe(250);
    });

    it("does not fire at exactly $200 (strict >)", () => {
        expect(evaluateNewMerchantThreshold(txn({ amount: 200 }), 0)).toBeNull();
    });

    it("does not fire when prior count is >= 1", () => {
        expect(evaluateNewMerchantThreshold(txn({ amount: 500 }), 1)).toBeNull();
    });

    it("does not fire for refunds", () => {
        expect(
            evaluateNewMerchantThreshold(txn({ amount: -250 }), 0),
        ).toBeNull();
    });

    it("does not fire for null-merchant", () => {
        expect(
            evaluateNewMerchantThreshold(
                txn({ amount: 250, merchantName: null }),
                0,
            ),
        ).toBeNull();
    });

    it("does not fire for excluded category", () => {
        expect(
            evaluateNewMerchantThreshold(
                txn({ amount: 250, categoryPrimary: "TRANSFER_OUT" }),
                0,
            ),
        ).toBeNull();
    });
});

describe("evaluateDuplicateCharge", () => {
    it("fires when a same-amount candidate exists", () => {
        const dup = txn({ plaidTransactionId: "txn_2", amount: 100 });
        const result = evaluateDuplicateCharge(txn({ amount: 100 }), [dup]);
        expect(result?.ruleType).toBe("duplicate_charge_24h");
        expect(result?.score).toBe(1);
        const ev = JSON.parse(result!.evidenceJson);
        expect(ev.pairTransactionIds).toEqual(["txn_2"]);
    });

    it("does not fire when amounts differ by $0.01", () => {
        const close = txn({ plaidTransactionId: "txn_2", amount: 100.01 });
        expect(evaluateDuplicateCharge(txn({ amount: 100 }), [close])).toBeNull();
    });

    it("does not fire when no candidates provided (outside 24h window)", () => {
        expect(evaluateDuplicateCharge(txn({ amount: 100 }), [])).toBeNull();
    });

    it("does not fire for pending txn", () => {
        const dup = txn({ plaidTransactionId: "txn_2", amount: 100 });
        expect(
            evaluateDuplicateCharge(txn({ amount: 100, pending: true }), [dup]),
        ).toBeNull();
    });

    it("does not fire for excluded category", () => {
        const dup = txn({ plaidTransactionId: "txn_2", amount: 100 });
        expect(
            evaluateDuplicateCharge(
                txn({ amount: 100, categoryPrimary: "LOAN_PAYMENTS" }),
                [dup],
            ),
        ).toBeNull();
    });

    it("fires with multiple matches, listing all pair ids", () => {
        const dups = [
            txn({ plaidTransactionId: "txn_2", amount: 100 }),
            txn({ plaidTransactionId: "txn_3", amount: 100 }),
            txn({ plaidTransactionId: "txn_4", amount: 99 }),
        ];
        const result = evaluateDuplicateCharge(txn({ amount: 100 }), dups);
        const ev = JSON.parse(result!.evidenceJson);
        expect(ev.pairTransactionIds).toEqual(["txn_2", "txn_3"]);
    });
});

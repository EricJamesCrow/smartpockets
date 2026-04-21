// Pure anomaly detection rules. No Convex context; safe to unit-test.
// Thresholds per specs/W6-intelligence.research.md §2.2.

export const EXCLUSION_CATEGORIES = new Set([
    "LOAN_PAYMENTS",
    "RENT_AND_UTILITIES",
    "TRANSFER_IN",
    "TRANSFER_OUT",
]);

export const NEW_MERCHANT_THRESHOLD_DOLLARS = 200;
export const SPIKE_MULTIPLIER = 3;
export const SPIKE_MIN_PRIOR_COUNT = 3;
export const SPIKE_WINDOW_DAYS = 90;
export const NEW_MERCHANT_WINDOW_DAYS = 365;
export const DUPLICATE_WINDOW_HOURS = 24;

export type Transaction = {
    plaidTransactionId: string;
    amount: number; // dollars, positive = outflow
    date: string; // YYYY-MM-DD
    merchantName: string | null;
    pending: boolean;
    categoryPrimary: string | null;
};

export type RuleType =
    | "amount_spike_3x"
    | "new_merchant_threshold"
    | "duplicate_charge_24h";

export type RuleResult = {
    ruleType: RuleType;
    score: number;
    evidenceJson: string;
};

export function isEligibleForScan(t: Transaction): boolean {
    if (t.pending) return false;
    if (t.amount <= 0) return false;
    if (!t.merchantName) return false;
    if (
        t.categoryPrimary &&
        EXCLUSION_CATEGORIES.has(t.categoryPrimary)
    ) {
        return false;
    }
    return true;
}

export function evaluateAmountSpike(
    t: Transaction,
    priorAtMerchant: Transaction[],
): RuleResult | null {
    if (!isEligibleForScan(t)) return null;
    if (priorAtMerchant.length < SPIKE_MIN_PRIOR_COUNT) return null;
    const sum = priorAtMerchant.reduce((acc, p) => acc + p.amount, 0);
    const mean = sum / priorAtMerchant.length;
    if (mean <= 0) return null;
    if (t.amount <= SPIKE_MULTIPLIER * mean) return null;
    return {
        ruleType: "amount_spike_3x",
        score: t.amount / mean,
        evidenceJson: JSON.stringify({
            priorCount: priorAtMerchant.length,
            mean,
            windowDays: SPIKE_WINDOW_DAYS,
        }),
    };
}

export function evaluateNewMerchantThreshold(
    t: Transaction,
    priorCountAtMerchant365d: number,
): RuleResult | null {
    if (!isEligibleForScan(t)) return null;
    if (priorCountAtMerchant365d > 0) return null;
    if (t.amount <= NEW_MERCHANT_THRESHOLD_DOLLARS) return null;
    return {
        ruleType: "new_merchant_threshold",
        score: t.amount,
        evidenceJson: JSON.stringify({
            windowDays: NEW_MERCHANT_WINDOW_DAYS,
        }),
    };
}

export function evaluateDuplicateCharge(
    t: Transaction,
    candidatesWithin24h: Transaction[],
): RuleResult | null {
    if (!isEligibleForScan(t)) return null;
    const matches = candidatesWithin24h.filter((c) => c.amount === t.amount);
    if (matches.length === 0) return null;
    return {
        ruleType: "duplicate_charge_24h",
        score: 1,
        evidenceJson: JSON.stringify({
            pairTransactionIds: matches.map((m) => m.plaidTransactionId),
        }),
    };
}

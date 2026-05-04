/**
 * Shared transaction utilities
 */
import type { TransactionCategory } from "@/types/credit-cards";
import { displayAmount, formatMoneyFromDollars, formatMoneyFromMilliunits } from "@/utils/money";

/**
 * Map Plaid category to our TransactionCategory type
 */
export function mapPlaidCategory(category?: string): TransactionCategory {
    if (!category) return "Other";

    const categoryUpper = category.toUpperCase();

    const mapping: Record<string, TransactionCategory> = {
        FOOD_AND_DRINK: "Food & Drink",
        TRAVEL: "Travel",
        TRANSPORTATION: "Transportation",
        ENTERTAINMENT: "Entertainment",
        GENERAL_MERCHANDISE: "General Merchandise",
        GENERAL_SERVICES: "General Services",
        GOVERNMENT_AND_NON_PROFIT: "Government & Nonprofit",
        HOME_IMPROVEMENT: "Home Improvement",
        MEDICAL: "Healthcare",
        PERSONAL_CARE: "Personal Care",
        RENT_AND_UTILITIES: "Rent & Utilities",
        TRANSFER_IN: "Transfer In",
        TRANSFER_OUT: "Transfer Out",
        LOAN_PAYMENTS: "Loan Payments",
        BANK_FEES: "Bank Fees",
        INCOME: "Income",
        RECREATION: "Recreation",
    };

    return mapping[categoryUpper] ?? "Other";
}

/**
 * Format a Plaid transaction amount for human display.
 *
 * Plaid `transactions.amount` convention:
 *   positive = money OUT (charge / spend)
 *   negative = money IN (refund / credit / income)
 *
 * Human banking-app convention (Monarch, Copilot, etc.):
 *   positive = money IN (shown with `+` prefix and success color)
 *   negative = money OUT (shown with `-` prefix and primary text color)
 *
 * The flip happens here at the display boundary via `displayAmount()`.
 * Stored amounts elsewhere keep the Plaid sign convention so aggregations,
 * sync, and "spend" charts continue to read correctly.
 */
export function formatTransactionAmount(amount: number, isoCurrencyCode?: string): { text: string; isMoneyIn: boolean; colorClass: string } {
    // Flip Plaid sign → human sign before formatting.
    const humanAmount = displayAmount(amount);
    const isMoneyIn = humanAmount > 0;

    const formattedAbs = formatMoneyFromMilliunits(Math.abs(humanAmount), {
        currency: isoCurrencyCode ?? "USD",
    });

    if (humanAmount === 0) {
        return {
            text: formattedAbs,
            isMoneyIn: false,
            colorClass: "text-primary",
        };
    }

    if (isMoneyIn) {
        return {
            text: `+${formattedAbs}`,
            isMoneyIn: true,
            colorClass: "text-utility-success-600",
        };
    }

    return {
        text: `-${formattedAbs}`,
        isMoneyIn: false,
        colorClass: "text-primary",
    };
}

/**
 * Format a Plaid transaction amount expressed in **dollars** for human display.
 *
 * Same semantics as `formatTransactionAmount` (which takes milliunits) — flips
 * the Plaid sign so positive aggregations of "spend" render as negative
 * (money out), and negative aggregations (net incoming) render as positive
 * (money in, green).
 */
export function formatTransactionAmountDollars(
    dollars: number,
    isoCurrencyCode?: string,
): { text: string; isMoneyIn: boolean; colorClass: string } {
    const humanAmount = displayAmount(dollars);
    const isMoneyIn = humanAmount > 0;

    const formattedAbs = formatMoneyFromDollars(Math.abs(humanAmount), {
        currency: isoCurrencyCode ?? "USD",
    });

    if (humanAmount === 0) {
        return {
            text: formattedAbs,
            isMoneyIn: false,
            colorClass: "text-primary",
        };
    }

    if (isMoneyIn) {
        return {
            text: `+${formattedAbs}`,
            isMoneyIn: true,
            colorClass: "text-utility-success-600",
        };
    }

    return {
        text: `-${formattedAbs}`,
        isMoneyIn: false,
        colorClass: "text-primary",
    };
}

/**
 * Shared transaction utilities
 */

import type { TransactionCategory } from "@/types/credit-cards";

/**
 * Map Plaid category to our TransactionCategory type
 */
export function mapPlaidCategory(category?: string): TransactionCategory {
  if (!category) return "Other";

  const categoryUpper = category.toUpperCase();

  const mapping: Record<string, TransactionCategory> = {
    FOOD_AND_DRINK: "Dining",
    TRAVEL: "Travel",
    TRANSPORTATION: "Transportation",
    ENTERTAINMENT: "Entertainment",
    GENERAL_MERCHANDISE: "Shopping",
    GENERAL_SERVICES: "Other",
    GOVERNMENT_AND_NON_PROFIT: "Other",
    HOME_IMPROVEMENT: "Shopping",
    MEDICAL: "Healthcare",
    PERSONAL_CARE: "Healthcare",
    RENT_AND_UTILITIES: "Utilities",
    TRANSFER_IN: "Transfers",
    TRANSFER_OUT: "Transfers",
    LOAN_PAYMENTS: "Payments",
    BANK_FEES: "Fees",
    INCOME: "Income",
    RECREATION: "Entertainment",
  };

  return mapping[categoryUpper] ?? "Other";
}

/**
 * Format transaction amount for display
 * Plaid amounts: positive = money out (charge), negative = money in (refund/credit)
 * We display charges as negative and refunds/credits as positive
 */
export function formatTransactionAmount(
  amount: number,
  isoCurrencyCode?: string
): { text: string; isRefund: boolean; colorClass: string } {
  const isRefund = amount < 0;
  const displayAmount = Math.abs(amount);

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: isoCurrencyCode ?? "USD",
  }).format(displayAmount / 1000);

  if (isRefund) {
    return {
      text: `+${formatted}`,
      isRefund: true,
      colorClass: "text-utility-success-600",
    };
  }

  return {
    text: formatted,
    isRefund: false,
    colorClass: "text-primary",
  };
}

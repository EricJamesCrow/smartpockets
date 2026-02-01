/**
 * Type definitions and utilities for the credit cards feature
 */

import type { Id } from "@convex/_generated/dataModel";

// =============================================================================
// FILTER TYPES
// =============================================================================

/**
 * Available brand filter options
 */
export type BrandFilter = "all" | "visa" | "mastercard" | "amex" | "discover";

/**
 * Card status filter options
 */
export type CardStatusFilter = "all" | "active" | "locked" | "inactive";

/**
 * Payment due date filter options
 */
export type PaymentDueFilter = "all" | "due_7_days" | "due_14_days" | "overdue";

/**
 * Credit utilization filter options
 */
export type UtilizationFilter = "all" | "low" | "medium" | "high";

/**
 * Available sort options
 */
export type SortOption =
  | "cardName"
  | "company"
  | "apr_asc"
  | "apr_desc"
  | "utilization_asc"
  | "utilization_desc"
  | "payment_due"
  | "available_credit"
  | "current_balance";

/**
 * Combined filter state object
 */
export interface CardFilters {
  brand: BrandFilter;
  status: CardStatusFilter;
  paymentDue: PaymentDueFilter;
  utilization: UtilizationFilter;
  sortBy: SortOption;
}

/**
 * Default filter values
 */
export const DEFAULT_CARD_FILTERS: CardFilters = {
  brand: "all",
  status: "all",
  paymentDue: "all",
  utilization: "all",
  sortBy: "cardName",
};

// =============================================================================
// CARD DATA TYPES
// =============================================================================

/**
 * Card brand types
 */
export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "other";

/**
 * Credit card data from the API
 */
export interface CreditCard {
  _id: Id<"creditCards">;
  _creationTime: number;
  userId: Id<"users">;
  accountId: string;
  accountName: string;
  officialName?: string;
  mask?: string;
  currentBalance?: number;
  availableCredit?: number;
  creditLimit?: number;
  isoCurrencyCode?: string;
  aprs?: Array<{
    aprPercentage: number;
    aprType: string;
    balanceSubjectToApr?: number;
    interestChargeAmount?: number;
  }>;
  isOverdue: boolean;
  lastPaymentAmount?: number;
  lastPaymentDate?: string;
  lastStatementBalance?: number;
  minimumPaymentAmount?: number;
  nextPaymentDueDate?: string;
  displayName: string;
  company?: string;
  brand?: CardBrand;
  lastFour?: string;
  syncStatus?: "synced" | "syncing" | "error" | "stale";
  isLocked: boolean;
  lockedAt?: number;
  isActive: boolean;
}

/**
 * Extended credit card data with computed fields for UI display
 */
export interface ExtendedCreditCardData {
  // Core identity
  id: Id<"creditCards">;
  accountId: string;
  cardName: string;
  company: string;
  brand: CardBrand;
  lastFour: string;
  cardholderName: string;

  // Financial data (display-ready values, NOT milliunits)
  currentBalance: number | null;
  availableCredit: number | null;
  creditLimit: number | null;
  utilization: number | null; // 0-100 percentage

  // APR info
  apr: number | null; // Purchase APR

  // Payment info
  nextPaymentDueDate: string | null;
  minimumPaymentAmount: number | null;
  lastStatementBalance: number | null;
  isOverdue: boolean;
  daysUntilDue: number | null;

  // Status
  isLocked: boolean;
  isActive: boolean;
}

/**
 * Payment urgency levels for styling
 */
export type PaymentUrgency =
  | "safe" // 14+ days
  | "warning" // 7-13 days
  | "urgent" // 3-6 days
  | "critical" // 0-2 days
  | "overdue"; // past due

/**
 * Utilization level for filtering and styling
 */
export type UtilizationLevel = "low" | "medium" | "high";

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate credit utilization percentage
 */
export function calculateUtilization(
  currentBalance: number | null | undefined,
  creditLimit: number | null | undefined
): number | null {
  if (currentBalance == null || creditLimit == null || creditLimit === 0) {
    return null;
  }
  return Math.round((currentBalance / creditLimit) * 100);
}

/**
 * Get utilization level for filtering and styling
 */
export function getUtilizationLevel(
  utilization: number | null
): UtilizationLevel | null {
  if (utilization === null) return null;
  if (utilization < 30) return "low";
  if (utilization < 70) return "medium";
  return "high";
}

/**
 * Get Tailwind color class for utilization display
 */
export function getUtilizationColor(utilization: number | null): string {
  if (utilization === null || utilization < 30)
    return "text-utility-success-600";
  if (utilization < 70) return "text-utility-warning-600";
  return "text-utility-error-600";
}

/**
 * Get Tailwind background color class for utilization progress bar
 */
export function getUtilizationBgColor(utilization: number | null): string {
  if (utilization === null || utilization < 30) return "bg-utility-success-500";
  if (utilization < 70) return "bg-utility-warning-500";
  return "bg-utility-error-500";
}

/**
 * Get utilization colors for progress component styling
 */
export function getUtilizationColors(utilization: number | null): {
  text: string;
  progress: string;
  progressBg: string;
} {
  if (utilization === null || utilization < 30) {
    return {
      text: "text-utility-success-600",
      progress: "bg-utility-success-500",
      progressBg: "bg-utility-success-100",
    };
  }
  if (utilization < 70) {
    return {
      text: "text-utility-warning-600",
      progress: "bg-utility-warning-500",
      progressBg: "bg-utility-warning-100",
    };
  }
  return {
    text: "text-utility-error-600",
    progress: "bg-utility-error-500",
    progressBg: "bg-utility-error-100",
  };
}

/**
 * Get the purchase APR from an array of APR data
 */
export function getPurchaseApr(
  aprs: Array<{ aprPercentage: number; aprType: string }> | undefined
): number | null {
  if (!aprs || aprs.length === 0) return null;

  const purchaseApr = aprs.find(
    (apr) =>
      apr.aprType.toLowerCase().includes("purchase") ||
      apr.aprType.toLowerCase() === "purchase_apr"
  );

  return purchaseApr?.aprPercentage ?? aprs[0]?.aprPercentage ?? null;
}

/**
 * Calculate days until payment is due
 */
export function getDaysUntilDue(paymentDueDate: string | null): number | null {
  if (!paymentDueDate) return null;

  const due = new Date(paymentDueDate);
  const today = new Date();

  // Reset time components to compare dates only
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get payment urgency level for styling
 */
export function getPaymentUrgency(
  daysUntilDue: number | null
): PaymentUrgency | null {
  if (daysUntilDue === null) return null;
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 2) return "critical";
  if (daysUntilDue <= 6) return "urgent";
  if (daysUntilDue <= 13) return "warning";
  return "safe";
}

/**
 * Get badge color for payment urgency (Untitled UI badge colors)
 */
export function getPaymentUrgencyBadgeColor(
  urgency: PaymentUrgency | null
): "success" | "warning" | "orange" | "error" | "gray" {
  switch (urgency) {
    case "safe":
      return "success";
    case "warning":
      return "warning";
    case "urgent":
      return "orange";
    case "critical":
    case "overdue":
      return "error";
    default:
      return "gray";
  }
}

/**
 * Format milliunits to currency string
 */
export function formatCurrency(milliunits: number | null | undefined): string {
  if (milliunits == null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(milliunits / 1000);
}

/**
 * Format a number as currency (display-ready value, NOT milliunits)
 */
export function formatDisplayCurrency(amount: number | null): string {
  if (amount === null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Format percentage with optional decimal places
 */
export function formatPercentage(
  value: number | null,
  decimals: number = 1
): string {
  if (value === null) return "--";
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format APR percentage
 */
export function formatApr(apr: number | null): string {
  if (apr === null) return "--";
  return `${apr.toFixed(2)}%`;
}

/**
 * Format payment due date for display
 */
export function formatDueDate(dateString: string | null): string {
  if (!dateString) return "--";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Format days until due as a human-readable string
 */
export function formatDaysUntilDue(days: number | null): string {
  if (days === null) return "--";
  if (days < 0)
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

/**
 * Convert API credit card to extended data format
 */
export function toExtendedCreditCard(
  card: CreditCard,
  cardholderName: string
): ExtendedCreditCardData {
  const currentBalance = card.currentBalance ?? null;
  const creditLimit = card.creditLimit ?? null;
  const utilization = calculateUtilization(currentBalance, creditLimit);
  const daysUntilDue = getDaysUntilDue(card.nextPaymentDueDate ?? null);

  return {
    id: card._id,
    accountId: card.accountId,
    cardName: card.displayName,
    company: card.company ?? "Unknown",
    brand: card.brand ?? "other",
    lastFour: card.lastFour ?? card.mask ?? "****",
    cardholderName,
    currentBalance,
    availableCredit: card.availableCredit ?? null,
    creditLimit,
    utilization,
    apr: getPurchaseApr(card.aprs),
    nextPaymentDueDate: card.nextPaymentDueDate ?? null,
    minimumPaymentAmount: card.minimumPaymentAmount ?? null,
    lastStatementBalance: card.lastStatementBalance ?? null,
    isOverdue: card.isOverdue,
    daysUntilDue,
    isLocked: card.isLocked,
    isActive: card.isActive,
  };
}

// =============================================================================
// TRANSACTION TYPES
// =============================================================================

/**
 * Transaction status types
 */
export type TransactionStatus = "Posted" | "Pending";

/**
 * Plaid transaction from the API (from transactions/queries.ts)
 */
export interface PlaidTransactionItem {
  _id?: string;
  transactionId: string;
  accountId: string;
  amount: number;
  date: string;
  datetime?: string;
  name: string;
  merchantName?: string;
  pending: boolean;
  categoryPrimary?: string;
  categoryDetailed?: string;
  merchantEnrichment?: MerchantEnrichment | null;
  // Recurring stream fields
  type?: "transaction" | "recurring";
  frequency?: string;
  predictedNextDate?: string;
  status?: string;
  streamType?: string;
  averageAmount?: number;
  firstDate?: string;
  isRecurring?: boolean;
}

/**
 * Transaction category types
 */
export type TransactionCategory =
  | "Dining"
  | "Gas"
  | "Groceries"
  | "Shopping"
  | "Entertainment"
  | "Travel"
  | "Utilities"
  | "Healthcare"
  | "Transportation"
  | "Subscription"
  | "Fees"
  | "Transfers"
  | "Payments"
  | "Income"
  | "Other";

/**
 * All available transaction categories
 */
export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  "Dining",
  "Gas",
  "Groceries",
  "Shopping",
  "Entertainment",
  "Travel",
  "Utilities",
  "Healthcare",
  "Transportation",
  "Subscription",
  "Other",
];

/**
 * Merchant enrichment data from Plaid
 */
export interface MerchantEnrichment {
  merchantName: string;
  logoUrl?: string;
  categoryPrimary?: string;
  categoryIconUrl?: string;
  confidenceLevel: string;
}

/**
 * Transaction data structure
 */
export interface Transaction {
  id: string;
  cardId: string;
  date: string; // ISO date string
  merchant: string;
  category: TransactionCategory;
  amount: number;
  status: TransactionStatus;
  description?: string;
  isRecurring?: boolean;
  recurringFrequency?: "Weekly" | "Biweekly" | "Twice Monthly" | "Monthly" | "Annual" | "Recurring";
  nextChargeDate?: string; // ISO date string
  merchantEnrichment?: MerchantEnrichment | null;
}

// =============================================================================
// TRANSACTION UTILITIES
// =============================================================================

/**
 * Get Tailwind classes for a transaction category badge
 */
export function getCategoryColor(category: TransactionCategory): string {
  const colors: Record<TransactionCategory, string> = {
    Dining: "bg-utility-orange-50 text-utility-orange-700 ring-utility-orange-200",
    Gas: "bg-utility-blue-50 text-utility-blue-700 ring-utility-blue-200",
    Groceries: "bg-utility-success-50 text-utility-success-700 ring-utility-success-200",
    Shopping: "bg-utility-purple-50 text-utility-purple-700 ring-utility-purple-200",
    Entertainment: "bg-utility-pink-50 text-utility-pink-700 ring-utility-pink-200",
    Travel: "bg-utility-blue-light-50 text-utility-blue-light-700 ring-utility-blue-light-200",
    Utilities: "bg-utility-warning-50 text-utility-warning-700 ring-utility-warning-200",
    Healthcare: "bg-utility-error-50 text-utility-error-700 ring-utility-error-200",
    Transportation: "bg-utility-indigo-50 text-utility-indigo-700 ring-utility-indigo-200",
    Subscription: "bg-utility-purple-50 text-utility-purple-700 ring-utility-purple-200",
    Fees: "bg-utility-error-50 text-utility-error-700 ring-utility-error-200",
    Transfers: "bg-utility-gray-50 text-utility-gray-700 ring-utility-gray-200",
    Payments: "bg-utility-success-50 text-utility-success-700 ring-utility-success-200",
    Income: "bg-utility-success-50 text-utility-success-700 ring-utility-success-200",
    Other: "bg-utility-gray-50 text-utility-gray-700 ring-utility-gray-200",
  };
  return colors[category] || colors.Other;
}

/**
 * Get badge color name for a transaction category (for UntitledUI Badge component)
 */
export function getCategoryBadgeColor(
  category: TransactionCategory
): "gray" | "brand" | "error" | "warning" | "success" | "blue" | "indigo" | "purple" | "pink" | "orange" {
  const colorMap: Record<TransactionCategory, "gray" | "brand" | "error" | "warning" | "success" | "blue" | "indigo" | "purple" | "pink" | "orange"> = {
    Dining: "orange",
    Gas: "blue",
    Groceries: "success",
    Shopping: "purple",
    Entertainment: "pink",
    Travel: "blue",
    Utilities: "warning",
    Healthcare: "error",
    Transportation: "indigo",
    Subscription: "purple",
    Fees: "error",
    Transfers: "gray",
    Payments: "success",
    Income: "success",
    Other: "gray",
  };
  return colorMap[category] || "gray";
}

/**
 * Format a date for transaction display (e.g., "Jan 14")
 */
export function formatTransactionDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date for transaction detail (e.g., "January 14, 2026")
 */
export function formatTransactionDateFull(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// =============================================================================
// PLAID TRANSACTION MAPPING
// =============================================================================

/**
 * Map Plaid category to our TransactionCategory
 */
function mapPlaidCategory(category?: string): TransactionCategory {
  if (!category) return "Other";

  const categoryUpper = category.toUpperCase();

  // Map Plaid primary categories to our categories
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
 * Convert a Plaid transaction item to our Transaction format
 */
export function toTransaction(
  plaidTx: PlaidTransactionItem,
  cardId: string
): Transaction {
  const isRecurring = plaidTx.type === "recurring";

  // Map Plaid frequency to UI label
  const frequency: Transaction["recurringFrequency"] = isRecurring && plaidTx.frequency
    ? plaidTx.frequency === "WEEKLY" ? "Weekly"
      : plaidTx.frequency === "BIWEEKLY" ? "Biweekly"
      : plaidTx.frequency === "SEMI_MONTHLY" ? "Twice Monthly"
      : plaidTx.frequency === "MONTHLY" ? "Monthly"
      : plaidTx.frequency === "ANNUALLY" ? "Annual"
      : "Recurring"
    : undefined;

  return {
    id: plaidTx.transactionId,
    cardId,
    date: plaidTx.date,
    merchant:
      plaidTx.merchantEnrichment?.merchantName ??
      plaidTx.merchantName ??
      plaidTx.name,
    category: mapPlaidCategory(plaidTx.categoryPrimary),
    amount: Math.abs(plaidTx.amount) / 1000, // Convert milliunits to dollars
    status: plaidTx.pending ? "Pending" : "Posted",
    description:
      plaidTx.name !== plaidTx.merchantName ? plaidTx.name : undefined,
    isRecurring,
    recurringFrequency: frequency,
    nextChargeDate: plaidTx.predictedNextDate,
    merchantEnrichment: plaidTx.merchantEnrichment,
  };
}

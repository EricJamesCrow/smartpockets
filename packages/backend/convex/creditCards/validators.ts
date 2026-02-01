/**
 * Credit Cards Domain Validators
 *
 * Validators specific to denormalized credit card data.
 */

import { v } from "convex/values";

/**
 * Credit card brand validator
 */
export const cardBrandValidator = v.union(
  v.literal("visa"),
  v.literal("mastercard"),
  v.literal("amex"),
  v.literal("discover"),
  v.literal("other")
);

/**
 * Credit card sync status validator
 */
export const syncStatusValidator = v.union(
  v.literal("synced"),
  v.literal("syncing"),
  v.literal("error"),
  v.literal("stale")
);

/**
 * Full credit card data validator
 * Used for bulk upsert and individual upsert operations
 */
export const creditCardValidator = v.object({
  userId: v.string(),
  plaidItemId: v.string(), // Component returns string IDs
  accountId: v.string(),

  // FROM plaidAccounts - Account Metadata
  accountName: v.string(),
  officialName: v.optional(v.string()),
  mask: v.string(),
  accountType: v.string(),
  accountSubtype: v.optional(v.string()),

  // FROM plaidAccounts - Balances
  currentBalance: v.optional(v.number()),
  availableCredit: v.optional(v.number()),
  creditLimit: v.optional(v.number()),
  isoCurrencyCode: v.string(),

  // FROM plaidCreditCardLiabilities - APR Data
  aprs: v.array(
    v.object({
      aprPercentage: v.number(),
      aprType: v.string(),
      balanceSubjectToApr: v.optional(v.number()),
      interestChargeAmount: v.optional(v.number()),
    })
  ),

  // FROM plaidCreditCardLiabilities - Payment Info
  isOverdue: v.boolean(),
  lastPaymentAmount: v.optional(v.number()),
  lastPaymentDate: v.optional(v.string()),
  lastStatementBalance: v.optional(v.number()),
  lastStatementIssueDate: v.optional(v.string()),
  minimumPaymentAmount: v.optional(v.number()),
  nextPaymentDueDate: v.optional(v.string()),

  // COMPUTED - Display Fields
  displayName: v.string(),
  company: v.optional(v.string()),
  brand: cardBrandValidator,
  lastFour: v.string(),

  // SYNC TRACKING
  syncStatus: syncStatusValidator,
  lastSyncError: v.optional(v.string()),
  syncAttempts: v.number(),
  lastSeenAt: v.number(),

  // USER PREFERENCES
  isLocked: v.optional(v.boolean()),
  lockedAt: v.optional(v.number()),

  // METADATA
  isActive: v.boolean(),
});

/**
 * Transaction Helper Functions
 *
 * Shared utilities for transaction queries and mutations.
 * Uses @crowdevelopment/convex-plaid component for merchant enrichment.
 */

import { components } from "../_generated/api";

/**
 * Generic context type that supports runQuery
 * Works with both base QueryCtx and custom Ents query context
 * Using eslint-disable since Convex types are complex with components
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryContextWithRunQuery = any;

/**
 * Merchant enrichment result type
 */
export type MerchantEnrichmentResult = {
  merchantName: string;
  logoUrl?: string | undefined;
  categoryPrimary?: string | undefined;
  categoryIconUrl?: string | undefined;
  confidenceLevel: "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
} | null;

/**
 * Transaction type from component (minimal fields needed for enrichment)
 */
type TransactionForEnrichment = {
  merchantId?: string;
  merchantName?: string;
  name: string;
  [key: string]: unknown; // Allow other fields to pass through
};

/**
 * Enrich transaction with merchant data from component
 *
 * @param ctx - Query context
 * @param transaction - Transaction object (from component or local)
 * @param merchantCache - Optional cache to deduplicate merchant queries
 * @returns Transaction with merchantEnrichment field added
 */
export async function enrichTransactionWithMerchant<
  T extends TransactionForEnrichment,
>(
  ctx: QueryContextWithRunQuery,
  transaction: T,
  merchantCache?: Map<string, MerchantEnrichmentResult>
): Promise<T & { merchantEnrichment: MerchantEnrichmentResult }> {
  if (!transaction.merchantId) {
    return { ...transaction, merchantEnrichment: null };
  }

  // Check cache first
  let merchantEnrichment: MerchantEnrichmentResult | undefined;
  if (merchantCache) {
    merchantEnrichment = merchantCache.get(transaction.merchantId);
  }

  // Query component if not cached
  if (merchantEnrichment === undefined) {
    const result = await ctx.runQuery(
      components.plaid.public.getMerchantEnrichment,
      { merchantId: transaction.merchantId }
    );

    if (result) {
      merchantEnrichment = {
        merchantName: result.merchantName,
        logoUrl: result.logoUrl,
        categoryPrimary: result.categoryPrimary,
        categoryIconUrl: result.categoryIconUrl,
        confidenceLevel: result.confidenceLevel as NonNullable<
          MerchantEnrichmentResult
        >["confidenceLevel"],
      };
    } else {
      merchantEnrichment = null;
    }

    // Store in cache
    if (merchantCache) {
      merchantCache.set(transaction.merchantId, merchantEnrichment);
    }
  }

  if (merchantEnrichment) {
    return { ...transaction, merchantEnrichment };
  }

  // Fallback: Use merchantName from transaction
  if (transaction.merchantName) {
    return {
      ...transaction,
      merchantEnrichment: {
        merchantName: transaction.merchantName,
        logoUrl: undefined,
        categoryPrimary: undefined,
        categoryIconUrl: undefined,
        confidenceLevel: "UNKNOWN",
      },
    };
  }

  return { ...transaction, merchantEnrichment: null };
}

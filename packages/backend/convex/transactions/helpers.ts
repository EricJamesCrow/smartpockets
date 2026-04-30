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

type ConfidenceLevel = NonNullable<MerchantEnrichmentResult>["confidenceLevel"];

const VALID_CONFIDENCE_LEVELS: ReadonlySet<string> = new Set([
  "VERY_HIGH",
  "HIGH",
  "MEDIUM",
  "LOW",
  "UNKNOWN",
]);

function normalizeConfidence(value: string | undefined | null): ConfidenceLevel {
  return value && VALID_CONFIDENCE_LEVELS.has(value)
    ? (value as ConfidenceLevel)
    : "UNKNOWN";
}

/**
 * Inline counterparty enrichment that Plaid /transactions/sync returns alongside
 * each transaction. Mirrors the shape persisted in plaidTransactions.enrichmentData.
 */
type EnrichmentData = {
  counterpartyName?: string;
  counterpartyType?: string;
  counterpartyEntityId?: string;
  counterpartyConfidence?: string;
  counterpartyLogoUrl?: string;
  counterpartyWebsite?: string;
  counterpartyPhoneNumber?: string;
  enrichedAt?: number;
};

/**
 * Transaction type from component (minimal fields needed for enrichment)
 */
type TransactionForEnrichment = {
  merchantId?: string;
  merchantName?: string;
  name: string;
  categoryPrimary?: string;
  enrichmentData?: EnrichmentData;
  [key: string]: unknown; // Allow other fields to pass through
};

function synthesizeMerchantEnrichment(
  transaction: TransactionForEnrichment
): MerchantEnrichmentResult {
  const inline = transaction.enrichmentData;

  // Plaid sync wrote inline counterparty info — surface it as a merchantEnrichment
  // so the UI can render the logo even when the merchantEnrichments table lookup
  // miss (no merchantId, or backfill not yet run).
  if (inline?.counterpartyLogoUrl || inline?.counterpartyName) {
    return {
      merchantName:
        inline.counterpartyName ?? transaction.merchantName ?? transaction.name,
      logoUrl: inline.counterpartyLogoUrl,
      categoryPrimary: transaction.categoryPrimary,
      categoryIconUrl: undefined,
      confidenceLevel: normalizeConfidence(inline.counterpartyConfidence),
    };
  }

  if (transaction.merchantName) {
    return {
      merchantName: transaction.merchantName,
      logoUrl: undefined,
      categoryPrimary: transaction.categoryPrimary,
      categoryIconUrl: undefined,
      confidenceLevel: "UNKNOWN",
    };
  }

  return null;
}

/**
 * Enrich transaction with merchant data from component
 *
 * Resolution order:
 *   1. If `merchantId` is set, look up the `merchantEnrichments` table. If a record
 *      exists, return it (defensively falling back to `enrichmentData.counterpartyLogoUrl`
 *      when the record's `logoUrl` is missing).
 *   2. Otherwise, synthesize a merchantEnrichment from the inline
 *      `enrichmentData` that Plaid sync wrote on the transaction (logo + counterparty).
 *   3. Otherwise, fall back to a merchantName-only enrichment (no logo).
 *   4. Otherwise, return `merchantEnrichment: null`.
 *
 * @param ctx - Query context
 * @param transaction - Transaction object (from component or local)
 * @param merchantCache - Optional cache to deduplicate merchant queries by merchantId
 * @returns Transaction with merchantEnrichment field added
 */
export async function enrichTransactionWithMerchant<
  T extends TransactionForEnrichment,
>(
  ctx: QueryContextWithRunQuery,
  transaction: T,
  merchantCache?: Map<string, MerchantEnrichmentResult>
): Promise<T & { merchantEnrichment: MerchantEnrichmentResult }> {
  if (transaction.merchantId) {
    let merchantEnrichment: MerchantEnrichmentResult | undefined;
    if (merchantCache) {
      merchantEnrichment = merchantCache.get(transaction.merchantId);
    }

    if (merchantEnrichment === undefined) {
      const result = await ctx.runQuery(
        components.plaid.public.getMerchantEnrichment,
        { merchantId: transaction.merchantId }
      );

      merchantEnrichment = result
        ? {
            merchantName: result.merchantName,
            logoUrl: result.logoUrl,
            categoryPrimary: result.categoryPrimary,
            categoryIconUrl: result.categoryIconUrl,
            confidenceLevel: normalizeConfidence(result.confidenceLevel),
          }
        : null;

      if (merchantCache) {
        merchantCache.set(transaction.merchantId, merchantEnrichment);
      }
    }

    if (merchantEnrichment) {
      // The merchantEnrichments record exists but its logoUrl may be undefined
      // (e.g. partial backfill, older data). Prefer the record but fall back to
      // the inline counterpartyLogoUrl Plaid sync wrote on the transaction.
      if (!merchantEnrichment.logoUrl && transaction.enrichmentData?.counterpartyLogoUrl) {
        return {
          ...transaction,
          merchantEnrichment: {
            ...merchantEnrichment,
            logoUrl: transaction.enrichmentData.counterpartyLogoUrl,
          },
        };
      }
      return { ...transaction, merchantEnrichment };
    }
    // Lookup miss — fall through to synthesis from inline enrichmentData below.
  }

  return {
    ...transaction,
    merchantEnrichment: synthesizeMerchantEnrichment(transaction),
  };
}

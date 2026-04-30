import { describe, expect, it, vi } from "vitest";
import {
  enrichTransactionWithMerchant,
  type MerchantEnrichmentResult,
} from "../transactions/helpers";

type MerchantRecord = {
  merchantName: string;
  logoUrl?: string;
  categoryPrimary?: string;
  categoryIconUrl?: string;
  confidenceLevel: NonNullable<MerchantEnrichmentResult>["confidenceLevel"];
};

function makeCtx(opts: { merchantsByEntity?: Record<string, MerchantRecord | null> } = {}) {
  const merchants = opts.merchantsByEntity ?? {};
  const runQuery = vi.fn(async (_ref: unknown, args: { merchantId: string }) => {
    const record = merchants[args.merchantId];
    return record ?? null;
  });
  return { runQuery };
}

const baseTransaction = {
  transactionId: "txn_1",
  accountId: "acc_1",
  name: "Generic merchant",
  amount: 0,
  date: "2026-04-01",
  pending: false,
};

describe("enrichTransactionWithMerchant", () => {
  it("returns the merchantEnrichments record when one exists for the merchantId", async () => {
    const ctx = makeCtx({
      merchantsByEntity: {
        "merch_uber": {
          merchantName: "Uber",
          logoUrl: "https://plaid-merchant-logos.plaid.com/uber.png",
          categoryPrimary: "TRANSPORTATION",
          categoryIconUrl: "https://plaid-category-icons.plaid.com/transportation.png",
          confidenceLevel: "VERY_HIGH",
        },
      },
    });

    const result = await enrichTransactionWithMerchant(ctx, {
      ...baseTransaction,
      merchantId: "merch_uber",
      merchantName: "UBER",
    });

    expect(result.merchantEnrichment).toEqual({
      merchantName: "Uber",
      logoUrl: "https://plaid-merchant-logos.plaid.com/uber.png",
      categoryPrimary: "TRANSPORTATION",
      categoryIconUrl: "https://plaid-category-icons.plaid.com/transportation.png",
      confidenceLevel: "VERY_HIGH",
    });
  });

  it("falls back to enrichmentData.counterpartyLogoUrl when the merchant record exists but has no logoUrl", async () => {
    const ctx = makeCtx({
      merchantsByEntity: {
        "merch_starbucks": {
          merchantName: "Starbucks",
          logoUrl: undefined,
          categoryPrimary: "FOOD_AND_DRINK",
          confidenceLevel: "HIGH",
        },
      },
    });

    const result = await enrichTransactionWithMerchant(ctx, {
      ...baseTransaction,
      merchantId: "merch_starbucks",
      merchantName: "STARBUCKS",
      enrichmentData: {
        counterpartyName: "Starbucks",
        counterpartyLogoUrl: "https://plaid-merchant-logos.plaid.com/starbucks.png",
        counterpartyConfidence: "HIGH",
      },
    });

    expect(result.merchantEnrichment?.logoUrl).toBe(
      "https://plaid-merchant-logos.plaid.com/starbucks.png",
    );
    expect(result.merchantEnrichment?.merchantName).toBe("Starbucks");
  });

  it("synthesizes merchantEnrichment from enrichmentData when merchantId is set but no merchant record exists yet", async () => {
    const ctx = makeCtx({ merchantsByEntity: {} });

    const result = await enrichTransactionWithMerchant(ctx, {
      ...baseTransaction,
      merchantId: "merch_pending_backfill",
      merchantName: "TARGET",
      categoryPrimary: "GENERAL_MERCHANDISE",
      enrichmentData: {
        counterpartyName: "Target",
        counterpartyLogoUrl: "https://plaid-merchant-logos.plaid.com/target.png",
        counterpartyConfidence: "VERY_HIGH",
      },
    });

    expect(result.merchantEnrichment).toEqual({
      merchantName: "Target",
      logoUrl: "https://plaid-merchant-logos.plaid.com/target.png",
      categoryPrimary: "GENERAL_MERCHANDISE",
      categoryIconUrl: undefined,
      confidenceLevel: "VERY_HIGH",
    });
  });

  it("synthesizes merchantEnrichment from enrichmentData even when merchantId is missing", async () => {
    const ctx = makeCtx();

    const result = await enrichTransactionWithMerchant(ctx, {
      ...baseTransaction,
      merchantName: "WHOLE FOODS MARKET",
      categoryPrimary: "FOOD_AND_DRINK",
      enrichmentData: {
        counterpartyName: "Whole Foods Market",
        counterpartyLogoUrl: "https://plaid-merchant-logos.plaid.com/wholefoods.png",
        counterpartyConfidence: "HIGH",
      },
    });

    expect(result.merchantEnrichment).toEqual({
      merchantName: "Whole Foods Market",
      logoUrl: "https://plaid-merchant-logos.plaid.com/wholefoods.png",
      categoryPrimary: "FOOD_AND_DRINK",
      categoryIconUrl: undefined,
      confidenceLevel: "HIGH",
    });
    expect(ctx.runQuery).not.toHaveBeenCalled();
  });

  it("normalizes unrecognized counterpartyConfidence values to UNKNOWN", async () => {
    const ctx = makeCtx();

    const result = await enrichTransactionWithMerchant(ctx, {
      ...baseTransaction,
      enrichmentData: {
        counterpartyName: "Boutique Cafe",
        counterpartyLogoUrl: "https://plaid-merchant-logos.plaid.com/cafe.png",
        counterpartyConfidence: "GARBAGE_VALUE",
      },
    });

    expect(result.merchantEnrichment?.confidenceLevel).toBe("UNKNOWN");
  });

  it("falls back to merchantName-only when no enrichmentData is present", async () => {
    const ctx = makeCtx();

    const result = await enrichTransactionWithMerchant(ctx, {
      ...baseTransaction,
      merchantName: "LOCAL CAFE",
    });

    expect(result.merchantEnrichment).toEqual({
      merchantName: "LOCAL CAFE",
      logoUrl: undefined,
      categoryPrimary: undefined,
      categoryIconUrl: undefined,
      confidenceLevel: "UNKNOWN",
    });
  });

  it("returns null when there is no merchantId, no enrichmentData, and no merchantName", async () => {
    const ctx = makeCtx();

    const result = await enrichTransactionWithMerchant(ctx, {
      ...baseTransaction,
    });

    expect(result.merchantEnrichment).toBeNull();
  });

  it("uses the cache for repeated merchantId lookups instead of re-querying", async () => {
    const ctx = makeCtx({
      merchantsByEntity: {
        "merch_uber": {
          merchantName: "Uber",
          logoUrl: "https://plaid-merchant-logos.plaid.com/uber.png",
          confidenceLevel: "VERY_HIGH",
        },
      },
    });

    const cache = new Map<string, MerchantEnrichmentResult>();

    await enrichTransactionWithMerchant(
      ctx,
      { ...baseTransaction, transactionId: "txn_a", merchantId: "merch_uber" },
      cache,
    );
    await enrichTransactionWithMerchant(
      ctx,
      { ...baseTransaction, transactionId: "txn_b", merchantId: "merch_uber" },
      cache,
    );

    expect(ctx.runQuery).toHaveBeenCalledTimes(1);
  });

  it("does not cache synthesized fallbacks (different transactions sharing missing merchantId must not collide)", async () => {
    const ctx = makeCtx();
    const cache = new Map<string, MerchantEnrichmentResult>();

    const first = await enrichTransactionWithMerchant(
      ctx,
      {
        ...baseTransaction,
        transactionId: "txn_a",
        merchantName: "FIRST MERCHANT",
        enrichmentData: {
          counterpartyName: "First Merchant",
          counterpartyLogoUrl: "https://plaid-merchant-logos.plaid.com/first.png",
        },
      },
      cache,
    );
    const second = await enrichTransactionWithMerchant(
      ctx,
      {
        ...baseTransaction,
        transactionId: "txn_b",
        merchantName: "SECOND MERCHANT",
        enrichmentData: {
          counterpartyName: "Second Merchant",
          counterpartyLogoUrl: "https://plaid-merchant-logos.plaid.com/second.png",
        },
      },
      cache,
    );

    expect(first.merchantEnrichment?.merchantName).toBe("First Merchant");
    expect(second.merchantEnrichment?.merchantName).toBe("Second Merchant");
    expect(first.merchantEnrichment?.logoUrl).not.toBe(second.merchantEnrichment?.logoUrl);
  });
});

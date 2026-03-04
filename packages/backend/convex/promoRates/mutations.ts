/**
 * Promo Rate Mutations
 *
 * All write operations for promotional rate data.
 * Uses Convex Ents for type-safe mutations with user ownership verification.
 * Soft delete via isActive flag.
 */

import { v } from "convex/values";
import { mutation } from "../functions";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function assertValidDate(value: string, field: string): void {
  if (!DATE_RE.test(value)) {
    throw new Error(`${field} must be in YYYY-MM-DD format`);
  }
  const parts = value.split("-").map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    throw new Error(`${field} is not a valid calendar date`);
  }
}

/**
 * Create a new promo rate
 *
 * Records a promotional APR for a credit card (e.g. 0% intro APR,
 * balance transfer offer, deferred interest promotion).
 *
 * @param creditCardId - Credit card document ID
 * @param description - Human-readable promo description
 * @param aprPercentage - Promotional APR (e.g. 0 for 0% intro)
 * @param originalBalance - Starting balance under this promo
 * @param remainingBalance - Current remaining balance
 * @param startDate - Promo start date
 * @param expirationDate - Promo expiration date
 * @param isDeferredInterest - Whether interest accrues and is charged if not paid off
 * @param accruedDeferredInterest - Running total of deferred interest (optional)
 * @param monthlyMinimumPayment - Required monthly minimum for this promo (optional)
 * @returns The new promo rate's document ID
 */
export const create = mutation({
  args: {
    creditCardId: v.id("creditCards"),
    description: v.string(),
    aprPercentage: v.number(),
    originalBalance: v.number(),
    remainingBalance: v.number(),
    startDate: v.string(),
    expirationDate: v.string(),
    isDeferredInterest: v.boolean(),
    accruedDeferredInterest: v.optional(v.number()),
    monthlyMinimumPayment: v.optional(v.number()),
    isManual: v.optional(v.boolean()),
  },
  returns: v.id("promoRates"),
  async handler(ctx, args) {
    assertValidDate(args.startDate, "startDate");
    assertValidDate(args.expirationDate, "expirationDate");

    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(args.creditCardId);

    // Verify ownership
    if (card.userId !== viewer._id) {
      throw new Error("Not authorized to add promo rates to this card");
    }

    return await ctx.table("promoRates").insert({
      ...args,
      isManual: args.isManual ?? false,
      userId: viewer._id,
      isActive: true,
    });
  },
});

/**
 * Update an existing promo rate
 *
 * Allows users to update promo rate fields. Only provided fields are updated.
 *
 * @param promoRateId - Promo rate document ID
 * @param data - Fields to update
 */
export const update = mutation({
  args: {
    promoRateId: v.id("promoRates"),
    description: v.optional(v.string()),
    aprPercentage: v.optional(v.number()),
    remainingBalance: v.optional(v.number()),
    expirationDate: v.optional(v.string()),
    accruedDeferredInterest: v.optional(v.number()),
    monthlyMinimumPayment: v.optional(v.number()),
  },
  returns: v.null(),
  async handler(ctx, { promoRateId, ...data }) {
    if (data.expirationDate !== undefined) {
      assertValidDate(data.expirationDate, "expirationDate");
    }

    const viewer = ctx.viewerX();
    const promo = await ctx.table("promoRates").getX(promoRateId);

    // Verify ownership
    if (promo.userId !== viewer._id) {
      throw new Error("Not authorized to modify this promo rate");
    }

    // Filter out undefined values
    const updates = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(updates).length > 0) {
      await promo.patch(updates);
    }

    return null;
  },
});

/**
 * Remove a promo rate (soft delete)
 *
 * Sets isActive to false rather than permanently deleting.
 *
 * @param promoRateId - Promo rate document ID
 */
export const remove = mutation({
  args: {
    promoRateId: v.id("promoRates"),
  },
  returns: v.null(),
  async handler(ctx, { promoRateId }) {
    const viewer = ctx.viewerX();
    const promo = await ctx.table("promoRates").getX(promoRateId);

    // Verify ownership
    if (promo.userId !== viewer._id) {
      throw new Error("Not authorized to remove this promo rate");
    }

    await promo.patch({ isActive: false });
    return null;
  },
});

/**
 * Set a user override on a promo rate's expiration date.
 */
export const setExpirationOverride = mutation({
  args: {
    promoRateId: v.id("promoRates"),
    expirationDate: v.string(),
  },
  returns: v.null(),
  async handler(ctx, { promoRateId, expirationDate }) {
    assertValidDate(expirationDate, "expirationDate");

    const viewer = ctx.viewerX();
    const promo = await ctx.table("promoRates").getX(promoRateId);
    if (promo.userId !== viewer._id) {
      throw new Error("Not authorized to modify this promo rate");
    }
    await promo.patch({
      userOverrides: { expirationDate },
    });
    return null;
  },
});

/**
 * Clear the user override on a promo rate's expiration date.
 */
export const clearExpirationOverride = mutation({
  args: {
    promoRateId: v.id("promoRates"),
  },
  returns: v.null(),
  async handler(ctx, { promoRateId }) {
    const viewer = ctx.viewerX();
    const promo = await ctx.table("promoRates").getX(promoRateId);
    if (promo.userId !== viewer._id) {
      throw new Error("Not authorized to modify this promo rate");
    }
    await promo.patch({ userOverrides: undefined });
    return null;
  },
});

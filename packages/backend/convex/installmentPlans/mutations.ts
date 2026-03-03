/**
 * Installment Plan Mutations
 *
 * All write operations for installment plan data.
 * Uses Convex Ents for type-safe mutations with user ownership verification.
 * Soft delete via isActive flag.
 */

import { v } from "convex/values";
import { mutation } from "../functions";

/**
 * Create a new installment plan
 *
 * Records an installment plan for a credit card (e.g. Equal Pay,
 * My Chase Plan, Citi Flex Pay).
 *
 * @param creditCardId - Credit card document ID
 * @param description - Human-readable plan description
 * @param startDate - Plan start date
 * @param originalPrincipal - Original purchase/plan amount
 * @param remainingPrincipal - Current remaining principal
 * @param totalPayments - Total number of monthly payments
 * @param remainingPayments - Remaining number of monthly payments
 * @param monthlyPrincipal - Monthly principal payment amount
 * @param monthlyFee - Monthly fee charged for the plan
 * @param aprPercentage - APR for the installment plan
 * @returns The new installment plan's document ID
 */
export const create = mutation({
  args: {
    creditCardId: v.id("creditCards"),
    description: v.string(),
    startDate: v.string(),
    originalPrincipal: v.number(),
    remainingPrincipal: v.number(),
    totalPayments: v.number(),
    remainingPayments: v.number(),
    monthlyPrincipal: v.number(),
    monthlyFee: v.number(),
    aprPercentage: v.number(),
  },
  returns: v.id("installmentPlans"),
  async handler(ctx, args) {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(args.creditCardId);

    // Verify ownership
    if (card.userId !== viewer._id) {
      throw new Error("Not authorized to add installment plans to this card");
    }

    return await ctx.table("installmentPlans").insert({
      ...args,
      userId: viewer._id,
      isActive: true,
    });
  },
});

/**
 * Update an existing installment plan
 *
 * Allows users to update installment plan fields. Only provided fields are updated.
 *
 * @param planId - Installment plan document ID
 * @param data - Fields to update
 */
export const update = mutation({
  args: {
    planId: v.id("installmentPlans"),
    description: v.optional(v.string()),
    remainingPrincipal: v.optional(v.number()),
    remainingPayments: v.optional(v.number()),
    monthlyPrincipal: v.optional(v.number()),
    monthlyFee: v.optional(v.number()),
  },
  returns: v.null(),
  async handler(ctx, { planId, ...data }) {
    const viewer = ctx.viewerX();
    const plan = await ctx.table("installmentPlans").getX(planId);

    // Verify ownership
    if (plan.userId !== viewer._id) {
      throw new Error("Not authorized to modify this installment plan");
    }

    // Filter out undefined values
    const updates = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(updates).length > 0) {
      await plan.patch(updates);
    }

    return null;
  },
});

/**
 * Remove an installment plan (soft delete)
 *
 * Sets isActive to false rather than permanently deleting.
 *
 * @param planId - Installment plan document ID
 */
export const remove = mutation({
  args: {
    planId: v.id("installmentPlans"),
  },
  returns: v.null(),
  async handler(ctx, { planId }) {
    const viewer = ctx.viewerX();
    const plan = await ctx.table("installmentPlans").getX(planId);

    // Verify ownership
    if (plan.userId !== viewer._id) {
      throw new Error("Not authorized to remove this installment plan");
    }

    await plan.patch({ isActive: false });
    return null;
  },
});

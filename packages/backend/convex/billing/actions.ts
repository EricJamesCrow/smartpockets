"use node";

import { v } from "convex/values";
import { createClerkClient } from "@clerk/backend";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { planFromSubscription } from "./subscription";

function proSlug(): string {
  return process.env.CLERK_PRO_PLAN_SLUG ?? "pro";
}

function externalIdFromEvent(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const d = data as Record<string, any>;
  return d.payer?.user_id ?? d.user_id ?? d.payer?.id;
}

/**
 * CROWDEV-646: robust plan sync. Triggered by any Clerk Billing
 * `subscription.*` / `subscriptionItem.*` webhook event, this re-reads the
 * user's CURRENT subscription from Clerk's Backend API
 * (`billing.getUserBillingSubscription`) rather than parsing the event payload.
 * That makes it correct for every lifecycle transition — including cancellation
 * and downgrade, which arrive via `subscriptionItem.*` and don't carry the full
 * picture in a single payload.
 *
 * Fail-safe: a missing CLERK_SECRET_KEY or any API error leaves the existing
 * plan unchanged (the enforcement layer already defaults absent plans to free);
 * a successful read with no active Pro item writes `free`.
 */
export const syncPlanFromClerk = internalAction({
  args: { data: v.any() },
  returns: v.null(),
  handler: async (ctx, { data }) => {
    const externalId = externalIdFromEvent(data);
    if (!externalId) return null;

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      console.warn(
        "[billing] CLERK_SECRET_KEY not set in Convex env; skipping plan sync",
      );
      return null; // fail-safe: leave plan unchanged
    }

    try {
      const clerk = createClerkClient({ secretKey });
      // `billing` is an experimental namespace; cast to keep the call resilient
      // to type drift across @clerk/backend minor versions.
      const sub = await (clerk as any).billing.getUserBillingSubscription(
        externalId,
      );
      const plan = planFromSubscription(sub, proSlug());
      const subscriptionStatus =
        sub && typeof sub.status === "string" ? sub.status : undefined;
      await ctx.runMutation(internal.billing.mutations.writePlan, {
        externalId,
        plan,
        subscriptionStatus,
      });
    } catch (err) {
      // Transient API/network error ⇒ leave the existing plan unchanged; a
      // later event or retry reconciles. Never throw from the webhook path.
      console.error("[billing] plan sync failed for", externalId, err);
    }
    return null;
  },
});

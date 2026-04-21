/**
 * Email dispatch action stubs per contracts §14 and §15.
 *
 * W7 owns these actions; W4 creates stubs so the W4 stack can land
 * independently. W7 replaces each stub's handler body with Resend send +
 * template render + preference/suppression/idempotency checks in a later PR.
 *
 * Signatures below match contracts §15 verbatim. Any drift breaks the
 * cross-workstream contract; update 00-contracts.md in the same PR.
 */

import { v } from "convex/values";
import { internalAction } from "../_generated/server";

/**
 * Welcome onboarding email (contracts §14 row 1, essential tier).
 *
 * Triggered by W4's exchangePublicTokenAction on first Plaid link
 * (variant "plaid-linked") and by W7's 48h signup-only cron
 * (variant "signup-only").
 */
export const dispatchWelcomeOnboarding = internalAction({
  args: {
    userId: v.string(),
    variant: v.union(
      v.literal("signup-only"),
      v.literal("plaid-linked"),
    ),
    firstLinkedInstitutionName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    console.log("[email/dispatch:W7-stub] dispatchWelcomeOnboarding:", args);
    return null;
  },
});

/**
 * Reconsent-required email (contracts §14 row 6, essential tier).
 *
 * Triggered by W4's ITEM:ERROR[ITEM_LOGIN_REQUIRED] and ITEM:PENDING_EXPIRATION
 * webhook branches.
 */
export const dispatchReconsentRequired = internalAction({
  args: {
    userId: v.string(),
    plaidItemId: v.string(),
    institutionName: v.string(),
    reason: v.union(
      v.literal("ITEM_LOGIN_REQUIRED"),
      v.literal("PENDING_EXPIRATION"),
    ),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    console.log("[email/dispatch:W7-stub] dispatchReconsentRequired:", args);
    return null;
  },
});

/**
 * Item-error-persistent email (contracts §14 row 7, essential tier).
 *
 * Triggered by W4's 6-hour persistent-error cron. W4 field-level dedup via
 * plaidItems.lastDispatchedAt caps delivery at once per 72h per item; W7's
 * workflow adds an additional idempotency layer on top.
 */
export const dispatchItemErrorPersistent = internalAction({
  args: {
    userId: v.string(),
    plaidItemId: v.string(),
    institutionName: v.string(),
    firstErrorAt: v.number(),
    lastSeenErrorAt: v.number(),
    errorCode: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    console.log("[email/dispatch:W7-stub] dispatchItemErrorPersistent:", args);
    return null;
  },
});

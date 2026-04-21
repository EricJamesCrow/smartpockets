/**
 * W4: 6-hour persistent-error cron per contracts §14 row 7.
 *
 * Scans for plaidItems with:
 *   status === "error"
 *   lastSyncedAt < now - 24h (stale sync)
 *   (lastDispatchedAt == null OR lastDispatchedAt < now - 72h)
 *
 * For each match, schedules dispatchItemErrorPersistent (contracts §15
 * payload) then stamps lastDispatchedAt so subsequent cron runs within
 * the 72h window skip this item.
 */

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { components, internal } from "../_generated/api";

const STALE_SYNC_MS = 24 * 3600 * 1000;
const DISPATCH_COOLDOWN_MS = 72 * 3600 * 1000;

export const runPersistentErrorCheckInternal = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const items = await ctx.runQuery(
      components.plaid.private.listErrorItemsInternal,
      {
        olderThanLastSyncedAt: now - STALE_SYNC_MS,
        dispatchedBefore: now - DISPATCH_COOLDOWN_MS,
      },
    );

    for (const item of items) {
      // Skip items missing required tracking fields. These would never have
      // gone through the W4 error-tracking code paths (e.g., legacy rows
      // that entered error before firstErrorAt was added).
      if (
        item.firstErrorAt == null ||
        item.errorAt == null ||
        item.errorCode == null
      ) {
        console.warn(
          `[plaid/persistentError] skipping ${item.plaidItemId}: missing tracking fields`,
        );
        continue;
      }

      await ctx.scheduler.runAfter(
        0,
        internal.email.dispatch.dispatchItemErrorPersistent,
        {
          userId: item.userId,
          plaidItemId: item.plaidItemId,
          institutionName: item.institutionName ?? "your bank",
          firstErrorAt: item.firstErrorAt,
          lastSeenErrorAt: item.errorAt,
          errorCode: item.errorCode,
        },
      );

      await ctx.runMutation(
        components.plaid.private.markItemErrorDispatchedInternal,
        { plaidItemId: item.plaidItemId },
      );
    }

    return null;
  },
});

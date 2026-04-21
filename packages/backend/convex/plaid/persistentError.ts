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
      // Legacy items (rows that entered error before W4's error-tracking was
      // wired) may lack `firstErrorAt`. Stamp it on first observation and
      // defer dispatch to the next cron run; gives ~6h buffer before the
      // first email fires, which matches how fresh errors would behave.
      if (item.firstErrorAt == null) {
        await ctx.runMutation(
          components.plaid.private.markFirstErrorAtInternal,
          { plaidItemId: item.plaidItemId },
        );
        console.warn(
          `[plaid/persistentError] stamping firstErrorAt for legacy item ${item.plaidItemId}; deferring dispatch to next cron run`,
        );
        continue;
      }

      // For errorAt / errorCode fall back to sentinels rather than skip, so
      // the cron still dispatches a best-effort alert. errorAt defaults to
      // firstErrorAt; errorCode defaults to "SYNC_ERROR".
      const lastSeenErrorAt = item.errorAt ?? item.firstErrorAt;
      const errorCode = item.errorCode ?? "SYNC_ERROR";

      await ctx.scheduler.runAfter(
        0,
        internal.email.dispatch.dispatchItemErrorPersistent,
        {
          userId: item.userId,
          plaidItemId: item.plaidItemId,
          institutionName: item.institutionName ?? "your bank",
          firstErrorAt: item.firstErrorAt,
          lastSeenErrorAt,
          errorCode,
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

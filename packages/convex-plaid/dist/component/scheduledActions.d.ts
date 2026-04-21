/**
 * Plaid Component Cron Jobs
 *
 * Internal actions for scheduled sync operations.
 * Host apps can call these from their own cron jobs.
 *
 * COMPONENT NOTE: These are internalActions, not directly schedulable.
 * The host app must set up its own crons.ts that calls these.
 *
 * @example Host app crons.ts:
 * ```typescript
 * import { cronJobs } from "convex/server";
 * import { internal } from "./_generated/api";
 *
 * const crons = cronJobs();
 *
 * // Daily sync at 2 AM UTC
 * crons.daily(
 *   "daily-plaid-sync",
 *   { hourUTC: 2, minuteUTC: 0 },
 *   internal.plaid.syncAllActiveItems,
 *   { plaidConfig: {...} }
 * );
 *
 * export default crons;
 * ```
 */
/**
 * Sync all active Plaid items using fan-out pattern.
 *
 * Called by host app cron jobs to keep data fresh.
 * Schedules individual sync actions for each item in parallel,
 * providing isolation (one failure doesn't block others) and
 * better performance (parallel execution vs sequential).
 *
 * @param plaidConfig - Plaid API credentials
 * @returns Number of items scheduled for sync
 */
export declare const syncAllActiveItems: import("convex/server").RegisteredAction<"internal", {
    syncType?: "transactions" | "liabilities" | "recurring" | "all" | undefined;
    plaidConfig: {
        plaidClientId: string;
        plaidSecret: string;
        plaidEnv: string;
        encryptionKey: string;
    };
}, Promise<{
    scheduled: number;
}>>;
/**
 * Sync a single Plaid item.
 *
 * This is the worker action scheduled by syncAllActiveItems.
 * Each item runs in isolation - errors here don't affect other items.
 */
export declare const syncSingleItem: import("convex/server").RegisteredAction<"internal", {
    plaidItemId: string;
    syncType: "transactions" | "liabilities" | "recurring" | "all";
    plaidConfig: {
        plaidClientId: string;
        plaidSecret: string;
        plaidEnv: string;
        encryptionKey: string;
    };
}, Promise<{
    success: boolean;
    error?: string;
}>>;
/**
 * Sync items that need refresh (haven't synced in X hours).
 *
 * More targeted than syncAllActiveItems - only syncs stale items.
 * Uses fan-out pattern for parallel, isolated execution.
 */
export declare const syncStaleItems: import("convex/server").RegisteredAction<"internal", {
    maxAgeHours?: number | undefined;
    plaidConfig: {
        plaidClientId: string;
        plaidSecret: string;
        plaidEnv: string;
        encryptionKey: string;
    };
}, Promise<{
    scheduled: number;
}>>;
//# sourceMappingURL=scheduledActions.d.ts.map
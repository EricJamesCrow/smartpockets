import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Daily Plaid Sync
 * Triggers at 2 AM UTC every day.
 * Syncs all active plaidItems: transactions → liabilities → recurring → credit cards
 */
crons.daily(
  "Daily Plaid Sync",
  { hourUTC: 2, minuteUTC: 0 },
  internal.plaidComponent.syncAllActiveItemsInternal
);

/**
 * Daily Statement Snapshots
 * Triggers at 6 AM UTC every day (after Plaid sync so balances are fresh).
 * For each card whose statementClosingDay matches today, creates an
 * inferred snapshot from current balance data. Idempotent.
 */
crons.daily(
  "Generate Statement Snapshots",
  { hourUTC: 6, minuteUTC: 0 },
  internal.statementSnapshots.actions.generateDailySnapshots
);

/**
 * Agent Proposal TTL (W2)
 * Every 5 minutes, expire any `agentProposals` row whose
 * `awaitingExpiresAt` is in the past and whose state is still
 * `awaiting_confirmation`. Transitions to `timed_out` and inserts a
 * system message into the thread for user visibility.
 */
crons.cron(
  "Expire stale proposals",
  "*/5 * * * *",
  (internal as any).agent.proposals.expireStaleInternal
);

/**
 * W4: Plaid Persistent Error Check (6-hour interval per contracts §14).
 *
 * Scans for plaidItems in error status with stale sync (>24h) that have
 * not been dispatched in the last 72h, then schedules
 * dispatchItemErrorPersistent and stamps lastDispatchedAt.
 */
crons.interval(
  "Plaid Persistent Error Check",
  { hours: 6 },
  internal.plaid.persistentError.runPersistentErrorCheckInternal
);

export default crons;

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

export default crons;

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

export default crons;

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Daily Plaid Sync
 * Triggers at 2 AM UTC every day.
 * Syncs all active plaidItems: transactions → liabilities → recurring → credit cards
 */
crons.daily("Daily Plaid Sync", { hourUTC: 2, minuteUTC: 0 }, internal.plaidComponent.syncAllActiveItemsInternal);

// =============================================================================
// W2 agent crons
// =============================================================================

/**
 * Agent Proposal TTL (W2)
 * Every 5 minutes, expire any `agentProposals` row whose
 * `awaitingExpiresAt` is in the past and whose state is still
 * `awaiting_confirmation`. Transitions to `timed_out` and inserts a
 * system message into the thread for user visibility.
 */
crons.cron("Expire stale proposals", "*/5 * * * *", (internal as any).agent.proposals.expireStaleInternal);

/**
 * Agent Active Run Reaper (CROWDEV-436)
 * Clears stale single-flight locks if a scheduled runtime action never reaches
 * its `finally` block. Admission also lazily reaps the same thread before
 * rejecting, but the cron prevents abandoned locks from sitting forever.
 */
crons.cron("Reap stale agent runs", "*/5 * * * *", (internal as any).agent.threads.reapExpiredActiveRunsInternal);

// =============================================================================
// W4 Plaid crons
// =============================================================================

/**
 * W4: Plaid Persistent Error Check (6-hour interval per contracts §14).
 *
 * Scans for plaidItems in error status with stale sync (>24h) that have
 * not been dispatched in the last 72h, then schedules
 * dispatchItemErrorPersistent and stamps lastDispatchedAt.
 */
crons.interval("Plaid Persistent Error Check", { hours: 6 }, internal.plaid.persistentError.runPersistentErrorCheckInternal);

// =============================================================================
// W7 email crons
// =============================================================================

/**
 * Welcome signup-only fallback: hourly. Dispatches
 * welcome-onboarding variant "signup-only" for users created >= 48h
 * ago who never received a welcome (either variant).
 */
crons.hourly("Welcome signup fallback", { minuteUTC: 15 }, internal.email.crons.dispatchWelcomeSignupFallback);

/**
 * Cleanup old email events: daily at 03:30 UTC. Enforces per-source
 * retention windows from spike §4.4.
 */
crons.daily("Cleanup old email events", { hourUTC: 3, minuteUTC: 30 }, internal.email.crons.cleanupOldEmailEvents);

/**
 * Reconcile stuck workflows: hourly. Transitions rows stuck in
 * `running` for over an hour to `failed` so they stop appearing
 * in-flight forever.
 */
crons.hourly("Reconcile stuck email workflows", { minuteUTC: 45 }, internal.email.crons.reconcileStuckWorkflows);

export default crons;

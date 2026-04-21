import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";

// Retention windows per spike §4.4.
const DEV_CAPTURE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const WEBHOOK_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const SEND_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const WELCOME_SEND_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const STUCK_WORKFLOW_MS = 60 * 60 * 1000;

// ============================================================================
// Weekly digest dispatch (Sunday 09:00 UTC)
// ============================================================================

/**
 * Dispatch the weekly digest to every eligible user.
 *
 * Payload assembly from W6 tables is a TODO until W6 lands; until
 * then this action is a no-op skeleton that walks users and skips
 * (so the cron registers without failing).
 */
export const dispatchWeeklyDigestForAllUsers = internalAction({
    args: {},
    returns: v.object({ dispatched: v.number(), skipped: v.number() }),
    handler: async (ctx) => {
        const users = await ctx.runQuery(internal.email.crons.listActiveUsers, {});
        let dispatched = 0;
        let skipped = 0;
        for (const u of users) {
            try {
                // TODO(W6): assemble topSpendByCategory / upcomingStatements /
                // activeAnomalies / expiringPromos / expiringTrials from the
                // intelligence tables. The workflow's zero-signal skip keeps
                // this safe when the arrays are empty.
                const result = await ctx.runAction(
                    internal.email.dispatch.dispatchWeeklyDigest,
                    {
                        userId: u._id,
                        weekStart: Date.now(),
                        topSpendByCategory: [],
                        upcomingStatements: [],
                        activeAnomalies: [],
                        expiringPromos: [],
                        expiringTrials: [],
                    },
                );
                if (result.status === "queued") dispatched++;
                else skipped++;
            } catch (err) {
                console.error("[WeeklyDigest] user", u._id, err);
                skipped++;
            }
        }
        return { dispatched, skipped };
    },
});

// ============================================================================
// Welcome signup-only fallback (hourly)
// ============================================================================

export const dispatchWelcomeSignupFallback = internalAction({
    args: {},
    returns: v.object({ dispatched: v.number() }),
    handler: async (ctx) => {
        const candidates = await ctx.runQuery(
            internal.email.crons.listSignupOnlyFallbackCandidates,
            { olderThanMs: 48 * 60 * 60 * 1000 },
        );
        let dispatched = 0;
        for (const u of candidates) {
            try {
                await ctx.runAction(
                    internal.email.dispatch.dispatchWelcomeOnboarding,
                    { userId: u._id, variant: "signup-only" },
                );
                dispatched++;
            } catch (err) {
                console.error("[WelcomeSignupFallback] user", u._id, err);
            }
        }
        return { dispatched };
    },
});

// ============================================================================
// Cleanup old email events (daily 03:30 UTC)
// ============================================================================

export const cleanupOldEmailEvents = internalMutation({
    args: {},
    returns: v.object({ deleted: v.number() }),
    handler: async (ctx) => {
        const now = Date.now();
        let deleted = 0;

        // dev-capture rows after 7 days
        const oldCaptures = await ctx.db
            .query("emailEvents")
            .withIndex("by_status_created", (q) => q.eq("status", "sent"))
            .collect();
        for (const row of oldCaptures) {
            if (row.source === "dev-capture" && now - row.createdAt > DEV_CAPTURE_TTL_MS) {
                await ctx.db.delete(row._id);
                deleted++;
            } else if (
                row.source.startsWith("webhook-") &&
                now - row.createdAt > WEBHOOK_TTL_MS
            ) {
                await ctx.db.delete(row._id);
                deleted++;
            } else if (row.source === "send") {
                const ttl =
                    row.templateKey === "welcome-onboarding"
                        ? WELCOME_SEND_TTL_MS
                        : SEND_TTL_MS;
                if (now - row.createdAt > ttl) {
                    await ctx.db.delete(row._id);
                    deleted++;
                }
            }
        }

        return { deleted };
    },
});

// ============================================================================
// Reconcile stuck workflows (hourly)
// ============================================================================

export const reconcileStuckWorkflows = internalMutation({
    args: {},
    returns: v.object({ checked: v.number(), patched: v.number() }),
    handler: async (ctx) => {
        const now = Date.now();
        const stuck = await ctx.db
            .query("emailEvents")
            .withIndex("by_status_created", (q) => q.eq("status", "running"))
            .collect();

        let checked = 0;
        let patched = 0;
        for (const row of stuck) {
            checked++;
            if (!row.processedAt || now - row.processedAt < STUCK_WORKFLOW_MS) continue;
            // Without a live workflow manager we conservatively mark as
            // failed so the row stops appearing "running" forever. Once
            // @convex-dev/workflow ships we query workflow.status and
            // promote to sent if the workflow succeeded.
            await ctx.db.patch(row._id, {
                status: "failed",
                errorMessage: row.errorMessage ?? "stuck-workflow-timeout",
                processedAt: now,
            });
            patched++;
        }
        return { checked, patched };
    },
});

// ============================================================================
// Helpers consumed by the actions above
// ============================================================================

export const listActiveUsers = internalQuery({
    args: {},
    returns: v.array(v.object({ _id: v.id("users") })),
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        return users.map((u) => ({ _id: u._id }));
    },
});

export const listSignupOnlyFallbackCandidates = internalQuery({
    args: { olderThanMs: v.number() },
    returns: v.array(v.object({ _id: v.id("users") })),
    handler: async (ctx, { olderThanMs }) => {
        const cutoff = Date.now() - olderThanMs;
        const users = await ctx.db.query("users").collect();
        const candidates: Array<{ _id: import("../_generated/dataModel").Id<"users"> }> = [];

        for (const u of users) {
            if (!u.email) continue;
            if (u._creationTime > cutoff) continue;

            // Skip if the user already received a welcome.
            const prior = await ctx.db
                .query("emailEvents")
                .withIndex("by_user_template_status", (q) =>
                    q.eq("userId", u._id).eq("templateKey", "welcome-onboarding"),
                )
                .first();
            if (prior) continue;

            candidates.push({ _id: u._id });
        }
        return candidates;
    },
});

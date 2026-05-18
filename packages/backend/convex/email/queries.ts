import { v } from "convex/values";
import { internalQuery, query } from "../functions";

/**
 * Internal: find an emailEvents row by its unique idempotencyKey. Used
 * by dispatch actions to short-circuit duplicate sends before the DB
 * insert (fast path; the unique constraint is the correctness
 * boundary).
 */
export const getByIdempotencyKey = internalQuery({
    args: { idempotencyKey: v.string() },
    returns: v.union(v.null(), v.id("emailEvents")),
    handler: async (ctx, { idempotencyKey }) => {
        const existing = await ctx.table("emailEvents").get("idempotencyKey", idempotencyKey);
        return existing?._id ?? null;
    },
});

/**
 * Internal: read the full row for workflow middleware.
 */
export const getEventInternal = internalQuery({
    args: { emailEventId: v.id("emailEvents") },
    returns: v.union(
        v.null(),
        v.object({
            _id: v.id("emailEvents"),
            email: v.string(),
            templateKey: v.string(),
            status: v.string(),
            userId: v.union(v.id("users"), v.null()),
            payloadJson: v.any(),
            cadence: v.optional(v.number()),
        }),
    ),
    handler: async (ctx, { emailEventId }) => {
        const row = await ctx.table("emailEvents").get(emailEventId);
        if (!row) return null;
        return {
            _id: row._id,
            email: row.email,
            templateKey: row.templateKey,
            status: row.status,
            userId: row.userId ?? null,
            payloadJson: row.payloadJson,
            cadence: row.cadence,
        };
    },
});

/**
 * Public: preferences for the current viewer (lazy defaults if missing).
 */
export const getNotificationPreferences = query({
    args: {},
    returns: v.object({
        welcomeOnboardingEnabled: v.boolean(),
        masterUnsubscribed: v.boolean(),
    }),
    handler: async (ctx) => {
        const viewer = ctx.viewerX();
        const existing = await ctx.table("notificationPreferences").get("userId", viewer._id);
        if (existing) {
            return {
                welcomeOnboardingEnabled: existing.welcomeOnboardingEnabled,
                masterUnsubscribed: existing.masterUnsubscribed,
            };
        }
        return {
            welcomeOnboardingEnabled: true,
            masterUnsubscribed: false,
        };
    },
});

/**
 * Public: bounce status for the current viewer, driving the in-app
 * banner in the preferences page and the agent's email-available flag.
 * Contract per specs/W7-email.md §13.
 */
export const getBounceStatus = query({
    args: {},
    returns: v.object({
        status: v.union(v.literal("active"), v.literal("suppressed_bounce"), v.literal("suppressed_complaint")),
        lastEventAt: v.union(v.number(), v.null()),
        reason: v.union(v.string(), v.null()),
    }),
    handler: async (ctx) => {
        const viewer = ctx.viewerX();
        if (!viewer.email) {
            return { status: "active" as const, lastEventAt: null, reason: null };
        }
        const suppression = await ctx.table("emailSuppressions").get("email", viewer.email.toLowerCase());
        if (!suppression) {
            return { status: "active" as const, lastEventAt: null, reason: null };
        }
        return {
            status: suppression.reason === "hard_bounce" ? ("suppressed_bounce" as const) : ("suppressed_complaint" as const),
            lastEventAt: suppression.lastEventAt,
            reason: suppression.reason,
        };
    },
});

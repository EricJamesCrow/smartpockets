import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, mutation } from "../functions";

const TEMPLATE_TO_FIELD: Record<string, string> = {
  "weekly-digest": "weeklyDigestEnabled",
  "promo-warning": "promoWarningEnabled",
  "statement-closing": "statementReminderEnabled",
  "anomaly-alert": "anomalyAlertEnabled",
  "subscription-detected": "subscriptionDetectedEnabled",
  "welcome-onboarding": "welcomeOnboardingEnabled",
  master: "masterUnsubscribed",
};

const DEFAULT_PREFS = {
  weeklyDigestEnabled: true,
  promoWarningEnabled: true,
  statementReminderEnabled: true,
  anomalyAlertEnabled: true,
  subscriptionDetectedEnabled: true,
  welcomeOnboardingEnabled: true,
  masterUnsubscribed: false,
};

/**
 * Lazy-create the notificationPreferences row for a user with all
 * defaults set (opt-out model). Returns the row id.
 */
export const ensurePreferences = internalMutation({
  args: { userId: v.id("users") },
  returns: v.id("notificationPreferences"),
  handler: async (ctx, { userId }) => {
    const existing = await ctx
      .table("notificationPreferences")
      .get("userId", userId);
    if (existing) return existing._id;
    return await ctx.table("notificationPreferences").insert({
      userId,
      ...DEFAULT_PREFS,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Insert a pending emailEvents row with a precomputed idempotencyKey.
 * The unique constraint on the field enforces DB-level dedup
 * (Strategy C-prime). Returns the inserted id; throws on collision.
 */
export const insertPending = internalMutation({
  args: {
    idempotencyKey: v.string(),
    userId: v.id("users"),
    email: v.string(),
    templateKey: v.string(),
    cadence: v.optional(v.number()),
    payloadJson: v.any(),
  },
  returns: v.id("emailEvents"),
  handler: async (ctx, args) => {
    return await ctx.table("emailEvents").insert({
      idempotencyKey: args.idempotencyKey,
      userId: args.userId,
      email: args.email.toLowerCase(),
      templateKey: args.templateKey,
      cadence: args.cadence,
      source: "send",
      status: "pending",
      attemptCount: 0,
      payloadJson: args.payloadJson,
      createdAt: Date.now(),
    });
  },
});

export const patchWorkflowId = internalMutation({
  args: {
    emailEventId: v.id("emailEvents"),
    workflowId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { emailEventId, workflowId }) => {
    const row = await ctx.table("emailEvents").getX(emailEventId);
    await row.patch({ workflowId });
    return null;
  },
});

export const patchRunning = internalMutation({
  args: {
    emailEventId: v.id("emailEvents"),
    attemptCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { emailEventId, attemptCount }) => {
    const row = await ctx.table("emailEvents").getX(emailEventId);
    await row.patch({
      status: "running",
      attemptCount,
      processedAt: Date.now(),
    });
    return null;
  },
});

export const patchSent = internalMutation({
  args: {
    emailEventId: v.id("emailEvents"),
    resendEmailId: v.string(),
    mode: v.optional(v.union(v.literal("live"), v.literal("dev-capture"))),
  },
  returns: v.null(),
  handler: async (ctx, { emailEventId, resendEmailId, mode }) => {
    const row = await ctx.table("emailEvents").getX(emailEventId);
    await row.patch({
      status: "sent",
      resendEmailId,
      source: mode === "dev-capture" ? "dev-capture" : "send",
      processedAt: Date.now(),
    });
    return null;
  },
});

export const patchFailed = internalMutation({
  args: {
    emailEventId: v.id("emailEvents"),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { emailEventId, errorMessage }) => {
    const row = await ctx.table("emailEvents").getX(emailEventId);
    await row.patch({
      status: "failed",
      errorMessage,
      processedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Called by the /email/unsubscribe POST route after the token is
 * verified. Idempotent flip: unknown templates are silently ignored.
 */
export const flipPreferenceFromToken = internalMutation({
  args: {
    userId: v.id("users"),
    templateKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { userId, templateKey }) => {
    const field = TEMPLATE_TO_FIELD[templateKey];
    if (!field) return null;
    const prefsId = await ctx.runMutation(
      internal.email.mutations.ensurePreferences,
      { userId },
    );
    const prefs = await ctx.table("notificationPreferences").getX(prefsId);
    // masterUnsubscribed is a "disable" flag (true = opt-out); every
    // other field is an "enabled" flag. The token encodes the user's
    // intent to opt out of a given category, so templateKey "master"
    // sets masterUnsubscribed=true while others set their field=false.
    const value = templateKey === "master" ? true : false;
    await prefs.patch({
      [field]: value,
      updatedAt: Date.now(),
    } as Record<string, unknown>);
    return null;
  },
});

/**
 * Public mutation for the preferences page. Derives userId from the
 * authenticated viewer and patches the requested field.
 */
export const updateNotificationPreference = mutation({
  args: { templateKey: v.string(), enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { templateKey, enabled }) => {
    const viewer = ctx.viewerX();
    const field = TEMPLATE_TO_FIELD[templateKey];
    if (!field) throw new Error(`Unknown template key: ${templateKey}`);
    const prefsId = await ctx.runMutation(
      internal.email.mutations.ensurePreferences,
      { userId: viewer._id },
    );
    const prefs = await ctx.table("notificationPreferences").getX(prefsId);
    // masterUnsubscribed inverts: "enabled=true" in UI means
    // "opt back in", i.e. masterUnsubscribed=false.
    const value = templateKey === "master" ? !enabled : enabled;
    await prefs.patch({
      [field]: value,
      updatedAt: Date.now(),
    } as Record<string, unknown>);
    return null;
  },
});

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../functions";
import { signUnsubscribeToken } from "./unsubscribeToken";

const ESSENTIAL_TEMPLATES = new Set([
  "welcome-onboarding",
  "reconsent-required",
  "item-error-persistent",
]);

const NON_ESSENTIAL_PREF_FIELD: Record<string, string> = {
  "weekly-digest": "weeklyDigestEnabled",
  "promo-warning": "promoWarningEnabled",
  "statement-closing": "statementReminderEnabled",
  "anomaly-alert": "anomalyAlertEnabled",
  "subscription-detected": "subscriptionDetectedEnabled",
};

type PreCheckResult = {
  skipped: boolean;
  reason?: "hard_bounce" | "complaint" | "preference";
};

/**
 * Suppression + preference gate applied before render.
 *
 * Essential tier honors only hard-bounce suppression. Non-essential
 * tier additionally honors complaint suppression and the per-template
 * preference flag (plus masterUnsubscribed).
 */
export const preCheck = internalMutation({
  args: { emailEventId: v.id("emailEvents") },
  returns: v.object({
    skipped: v.boolean(),
    reason: v.optional(
      v.union(
        v.literal("hard_bounce"),
        v.literal("complaint"),
        v.literal("preference"),
      ),
    ),
  }),
  handler: async (ctx, { emailEventId }): Promise<PreCheckResult> => {
    const row = await ctx.table("emailEvents").getX(emailEventId);
    const tier = ESSENTIAL_TEMPLATES.has(row.templateKey)
      ? "essential"
      : "non-essential";

    const suppression = await ctx
      .table("emailSuppressions")
      .get("email", row.email);

    if (suppression && suppression.reason === "hard_bounce") {
      await row.patch({
        status: "skipped_suppression",
        processedAt: Date.now(),
      });
      return { skipped: true, reason: "hard_bounce" };
    }

    if (
      tier === "non-essential" &&
      suppression &&
      suppression.reason === "complaint"
    ) {
      await row.patch({
        status: "skipped_suppression",
        processedAt: Date.now(),
      });
      return { skipped: true, reason: "complaint" };
    }

    if (tier === "non-essential" && row.userId) {
      const prefsId = await ctx.runMutation(
        internal.email.mutations.ensurePreferences,
        { userId: row.userId },
      );
      const prefs = await ctx.table("notificationPreferences").getX(prefsId);
      const field = NON_ESSENTIAL_PREF_FIELD[row.templateKey];
      if (
        prefs.masterUnsubscribed ||
        (field && !(prefs as unknown as Record<string, boolean>)[field])
      ) {
        await row.patch({
          status: "skipped_pref",
          processedAt: Date.now(),
        });
        return { skipped: true, reason: "preference" };
      }
    }

    return { skipped: false };
  },
});

type UnsubscribeHeaders = Array<{ name: string; value: string }>;

/**
 * Build RFC 8058 List-Unsubscribe headers. Essential-tier templates
 * get a mailto-only header; non-essential templates get the full
 * one-click POST flow.
 */
export const buildUnsubscribeHeaders = internalMutation({
  args: {
    userId: v.id("users"),
    templateKey: v.string(),
  },
  returns: v.array(v.object({ name: v.string(), value: v.string() })),
  handler: async (
    _ctx,
    { userId, templateKey },
  ): Promise<UnsubscribeHeaders> => {
    const signingKey = process.env.EMAIL_UNSUBSCRIBE_SIGNING_KEY ?? "";
    const appOrigin = process.env.CONVEX_SITE_URL ?? "https://app.smartpockets.com";
    const emailDomain = process.env.EMAIL_DOMAIN ?? "mail.smartpockets.com";
    const mailto = `mailto:unsubscribe@${emailDomain}?subject=unsubscribe`;

    if (ESSENTIAL_TEMPLATES.has(templateKey) || !signingKey) {
      return [{ name: "List-Unsubscribe", value: `<${mailto}>` }];
    }

    const token = await signUnsubscribeToken(
      { userId, templateKey },
      signingKey,
    );
    const unsubUrl = `${appOrigin}/email/unsubscribe?token=${encodeURIComponent(token)}`;
    return [
      {
        name: "List-Unsubscribe",
        value: `<${unsubUrl}>, <${mailto}>`,
      },
      {
        name: "List-Unsubscribe-Post",
        value: "List-Unsubscribe=One-Click",
      },
    ];
  },
});

/**
 * Only the oldest pending anomaly-alert row for a user becomes the
 * "leader" that runs the coalesce body. All others exit early; their
 * status is patched when the leader sends (patchCoalescedSent).
 */
export const anomalyLeadershipCheck = internalMutation({
  args: { emailEventId: v.id("emailEvents") },
  returns: v.object({ isLeader: v.boolean() }),
  handler: async (ctx, { emailEventId }) => {
    const row = await ctx.table("emailEvents").getX(emailEventId);
    if (!row.userId || row.templateKey !== "anomaly-alert") {
      return { isLeader: false };
    }
    const siblings = await ctx
      .table("emailEvents", "by_user_template_status", (q) =>
        q
          .eq("userId", row.userId!)
          .eq("templateKey", "anomaly-alert")
          .eq("status", "pending"),
      );
    if (siblings.length === 0) return { isLeader: false };
    const oldest = siblings.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
    return { isLeader: oldest._id === emailEventId };
  },
});

type CoalescedResult = {
  userId: Id<"users">;
  anomalies: Array<Record<string, unknown>>;
  siblingIds: Array<Id<"emailEvents">>;
};

export const anomalyCoalesce = internalMutation({
  args: { leaderId: v.id("emailEvents"), windowMs: v.number() },
  returns: v.object({
    userId: v.id("users"),
    anomalies: v.array(v.any()),
    siblingIds: v.array(v.id("emailEvents")),
  }),
  handler: async (ctx, { leaderId, windowMs }): Promise<CoalescedResult> => {
    const leader = await ctx.table("emailEvents").getX(leaderId);
    if (!leader.userId) {
      throw new Error(`Anomaly leader ${leaderId} has no userId`);
    }
    const siblings = await ctx
      .table("emailEvents", "by_user_template_status", (q) =>
        q
          .eq("userId", leader.userId!)
          .eq("templateKey", "anomaly-alert")
          .eq("status", "pending"),
      )
      .filter((q) => q.gte(q.field("createdAt"), leader.createdAt - windowMs));

    const siblingIds = siblings.map((s) => s._id);
    const anomalies = siblings.map(
      (s) => s.payloadJson as Record<string, unknown>,
    );
    return { userId: leader.userId, anomalies, siblingIds };
  },
});

export const patchCoalescedRunning = internalMutation({
  args: {
    leaderId: v.id("emailEvents"),
    siblingIds: v.array(v.id("emailEvents")),
  },
  returns: v.null(),
  handler: async (ctx, { leaderId, siblingIds }) => {
    const now = Date.now();
    for (const id of siblingIds) {
      if (id === leaderId) continue;
      const sib = await ctx.table("emailEvents").getX(id);
      await sib.patch({ status: "running", processedAt: now });
    }
    const leader = await ctx.table("emailEvents").getX(leaderId);
    await leader.patch({ status: "running", processedAt: now, attemptCount: 1 });
    return null;
  },
});

export const patchCoalescedSent = internalMutation({
  args: {
    leaderId: v.id("emailEvents"),
    siblingIds: v.array(v.id("emailEvents")),
    resendEmailId: v.string(),
    mode: v.union(v.literal("live"), v.literal("dev-capture")),
  },
  returns: v.null(),
  handler: async (ctx, { leaderId, siblingIds, resendEmailId, mode }) => {
    const source = mode === "dev-capture" ? ("dev-capture" as const) : ("send" as const);
    const now = Date.now();
    for (const id of siblingIds) {
      const row = await ctx.table("emailEvents").getX(id);
      await row.patch({
        status: "sent",
        resendEmailId,
        source,
        processedAt: now,
      });
    }
    if (!siblingIds.includes(leaderId)) {
      const leader = await ctx.table("emailEvents").getX(leaderId);
      await leader.patch({
        status: "sent",
        resendEmailId,
        source,
        processedAt: now,
      });
    }
    return null;
  },
});

export const patchSiblingsSkipped = internalMutation({
  args: {
    siblingIds: v.array(v.id("emailEvents")),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { siblingIds, reason }) => {
    const now = Date.now();
    const nextStatus =
      reason === "preference" ? ("skipped_pref" as const) : ("skipped_suppression" as const);
    for (const id of siblingIds) {
      const row = await ctx.table("emailEvents").getX(id);
      await row.patch({
        status: nextStatus,
        processedAt: now,
        errorMessage: reason,
      });
    }
    return null;
  },
});

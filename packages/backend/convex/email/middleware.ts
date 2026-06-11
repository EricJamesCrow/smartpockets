import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../functions";
import { signUnsubscribeToken } from "./unsubscribeToken";

const ESSENTIAL_TEMPLATES = new Set(["welcome-onboarding", "reconsent-required", "item-error-persistent"]);

const NON_ESSENTIAL_PREF_FIELD: Record<string, string> = {};

type PreCheckResult = {
    skipped: boolean;
    reason?: "hard_bounce" | "complaint" | "preference";
};

/**
 * Suppression + preference gate applied before render.
 *
 * Essential tier honors only hard-bounce suppression. Non-essential
 * tier additionally honors complaint suppression, masterUnsubscribed,
 * and any configured per-template preference flag.
 */
export const preCheck = internalMutation({
    args: { emailEventId: v.id("emailEvents") },
    returns: v.object({
        skipped: v.boolean(),
        reason: v.optional(v.union(v.literal("hard_bounce"), v.literal("complaint"), v.literal("preference"))),
    }),
    handler: async (ctx, { emailEventId }): Promise<PreCheckResult> => {
        const row = await ctx.table("emailEvents").getX(emailEventId);
        const tier = ESSENTIAL_TEMPLATES.has(row.templateKey) ? "essential" : "non-essential";

        const suppression = await ctx.table("emailSuppressions").get("email", row.email);

        if (suppression && suppression.reason === "hard_bounce") {
            await row.patch({
                status: "skipped_suppression",
                processedAt: Date.now(),
            });
            return { skipped: true, reason: "hard_bounce" };
        }

        if (tier === "non-essential" && suppression && suppression.reason === "complaint") {
            await row.patch({
                status: "skipped_suppression",
                processedAt: Date.now(),
            });
            return { skipped: true, reason: "complaint" };
        }

        if (tier === "non-essential" && row.userId) {
            const prefsId = await ctx.runMutation(internal.email.mutations.ensurePreferences, { userId: row.userId });
            const prefs = await ctx.table("notificationPreferences").getX(prefsId);
            const field = NON_ESSENTIAL_PREF_FIELD[row.templateKey];
            if (prefs.masterUnsubscribed || (field && !(prefs as unknown as Record<string, boolean>)[field])) {
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
    handler: async (_ctx, { userId, templateKey }): Promise<UnsubscribeHeaders> => {
        const signingKey = process.env.EMAIL_UNSUBSCRIBE_SIGNING_KEY ?? "";
        const appOrigin = process.env.CONVEX_SITE_URL ?? "https://app.smartpockets.com";
        const emailDomain = process.env.EMAIL_DOMAIN ?? "mail.smartpockets.com";
        const mailto = `mailto:unsubscribe@${emailDomain}?subject=unsubscribe`;

        if (ESSENTIAL_TEMPLATES.has(templateKey) || !signingKey) {
            return [{ name: "List-Unsubscribe", value: `<${mailto}>` }];
        }

        const token = await signUnsubscribeToken({ userId, templateKey }, signingKey);
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

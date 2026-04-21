import { v } from "convex/values";
import { vEmailId, vEmailEvent } from "@convex-dev/resend";
import { internalMutation } from "../functions";

/**
 * Map the Resend webhook event `type` string to the `source`
 * discriminator stored on the emailEvents row.
 */
function webhookEventToSource(
  type: string,
):
  | "webhook-sent"
  | "webhook-delivered"
  | "webhook-bounced"
  | "webhook-complained"
  | "webhook-opened"
  | "webhook-clicked"
  | "webhook-delayed"
  | "webhook-failed" {
  switch (type) {
    case "email.sent":
      return "webhook-sent";
    case "email.delivered":
      return "webhook-delivered";
    case "email.bounced":
      return "webhook-bounced";
    case "email.complained":
      return "webhook-complained";
    case "email.opened":
      return "webhook-opened";
    case "email.clicked":
      return "webhook-clicked";
    case "email.delivery_delayed":
      return "webhook-delayed";
    default:
      return "webhook-failed";
  }
}

function extractRecipient(event: unknown): string {
  const data = (event as { data?: { to?: string | string[] } }).data;
  const to = data?.to;
  if (!to) return "";
  return (Array.isArray(to) ? to[0] : to).toLowerCase();
}

/**
 * Handle Resend webhook events for delivery tracking and suppression.
 *
 * Writes:
 *  - One emailEvents row per webhook receipt (synthetic idempotencyKey
 *    `webhook:<resendEmailId>:<source>` so duplicates are rejected by
 *    the unique constraint).
 *  - Upserts emailSuppressions on hard bounce or complaint.
 *
 * Suppression tiers are applied on the SEND path (via preCheck); this
 * handler is the source-of-truth writer only.
 */
export const handleEmailEvent = internalMutation({
  args: {
    id: vEmailId,
    event: vEmailEvent,
  },
  returns: v.null(),
  handler: async (ctx, { id, event }) => {
    const resendEmailId = id as string;
    const source = webhookEventToSource(event.type);
    const recipient = extractRecipient(event);

    // Insert webhook row with a synthetic idempotency key. The unique
    // field constraint guards against replay; collisions are silently
    // swallowed so the Resend workpool can safely retry delivery.
    try {
      await ctx.table("emailEvents").insert({
        idempotencyKey: `webhook:${resendEmailId}:${source}`,
        email: recipient,
        templateKey: "",
        source,
        resendEmailId,
        status: "sent",
        attemptCount: 0,
        payloadJson: event as unknown as Record<string, unknown>,
        createdAt: Date.now(),
      });
    } catch (err) {
      // Unique-constraint collision is expected on webhook replays; any
      // other error propagates so we surface genuine bugs.
      const message = err instanceof Error ? err.message : String(err);
      if (!/unique/i.test(message)) {
        throw err;
      }
    }

    // Suppression branches.
    if (!recipient) return null;

    if (event.type === "email.bounced") {
      // `vEmailEvent` exposes the bounce classification on the event's
      // `data.bounce` field; hard bounces are permanent, soft bounces
      // retry within the component's workpool and are not suppressed.
      const bounceType = (
        event as unknown as { data?: { bounce?: { type?: string } } }
      ).data?.bounce?.type;
      if (bounceType === "hard" || bounceType === "Permanent") {
        await upsertSuppression(ctx, recipient, "hard_bounce");
      }
    } else if (event.type === "email.complained") {
      await upsertSuppression(ctx, recipient, "complaint");
    }

    return null;
  },
});

async function upsertSuppression(
  ctx: { table: any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  email: string,
  reason: "hard_bounce" | "complaint",
): Promise<void> {
  const existing = await ctx.table("emailSuppressions").get("email", email);
  const now = Date.now();
  if (existing) {
    await existing.patch({
      reason,
      lastEventAt: now,
      eventCount: existing.eventCount + 1,
    });
  } else {
    await ctx.table("emailSuppressions").insert({
      email,
      reason,
      firstEventAt: now,
      lastEventAt: now,
      eventCount: 1,
    });
  }
}

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { vEmailId, vEmailEvent } from "@convex-dev/resend";

/**
 * Handle Resend webhook events for email status tracking.
 *
 * Events received:
 * - email.sent: Email was successfully sent to Resend
 * - email.delivered: Email was delivered to recipient's inbox
 * - email.delivery_delayed: Email delivery is delayed
 * - email.bounced: Email bounced (hard or soft bounce)
 * - email.complained: Recipient marked email as spam
 * - email.opened: Recipient opened the email (if tracking enabled)
 * - email.clicked: Recipient clicked a link (if tracking enabled)
 *
 * This handler logs events and can optionally persist them for analytics.
 */
export const handleEmailEvent = internalMutation({
  args: {
    id: vEmailId,
    event: vEmailEvent,
  },
  returns: v.null(),
  handler: async (ctx, { id, event }) => {
    const timestamp = new Date().toISOString();

    // Log all events for debugging
    console.log(`[Email Event] ${timestamp} - ${event.type} for email ${id}`);

    // Handle specific events
    switch (event.type) {
      case "email.sent":
        console.log(`[Email] Sent: ${id}`);
        break;

      case "email.delivered":
        console.log(`[Email] Delivered: ${id}`);
        break;

      case "email.delivery_delayed":
        console.log(`[Email] Delivery delayed: ${id}`);
        break;

      case "email.bounced":
        console.warn(`[Email] Bounced: ${id}`);
        // In production, you might want to:
        // - Update user record to mark email as invalid
        // - Add to suppression list
        // - Notify support team
        break;

      case "email.complained":
        console.warn(`[Email] Spam complaint: ${id}`);
        // In production, you might want to:
        // - Add to suppression list
        // - Unsubscribe user from marketing emails
        // - Log for compliance
        break;

      case "email.opened":
        console.log(`[Email] Opened: ${id}`);
        break;

      case "email.clicked":
        console.log(`[Email] Link clicked: ${id}`);
        break;

      default:
        console.log(`[Email] Unknown event type for ${id}:`, event);
    }

    // Optional: Persist events for analytics
    // To enable this, add an emailEvents table to your schema:
    //
    // emailEvents: defineEnt({
    //   emailId: v.string(),
    //   eventType: v.string(),
    //   timestamp: v.number(),
    //   metadata: v.optional(v.any()),
    // }).index("by_emailId", ["emailId"])
    //
    // Then uncomment this:
    // await ctx.db.insert("emailEvents", {
    //   emailId: id,
    //   eventType: event.type,
    //   timestamp: Date.now(),
    //   metadata: event,
    // });

    return null;
  },
});

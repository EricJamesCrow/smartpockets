import { components, internal } from "../_generated/api";
import { Resend } from "@convex-dev/resend";

/**
 * Resend client with built-in queueing, batching, and idempotency.
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Rate limit handling via Convex workpools
 * - Exactly-once delivery via idempotency keys
 * - Optional delivery status webhooks
 *
 * Configuration is read from environment variables:
 * - RESEND_API_KEY: Your Resend API key
 * - RESEND_WEBHOOK_SECRET: (Optional) For delivery status tracking
 *
 * testMode is set to false to allow all email addresses.
 * In development, you can set it to true to only allow test addresses.
 */
export const resend: Resend = new Resend(components.resend, {
  // Set to false to allow all email addresses in production
  // Set to true to only allow @resend.dev test addresses
  testMode: false,

  // Handle email status events (delivered, bounced, complained, etc.)
  onEmailEvent: internal.email.events.handleEmailEvent,
});

/**
 * Email configuration constants
 */
export const EMAIL_CONFIG = {
  from: {
    default: `${process.env.APP_NAME || "App"} <noreply@${process.env.EMAIL_DOMAIN || "example.com"}>`,
    support: `Support <support@${process.env.EMAIL_DOMAIN || "example.com"}>`,
    billing: `Billing <billing@${process.env.EMAIL_DOMAIN || "example.com"}>`,
  },
  domain: process.env.EMAIL_DOMAIN || "example.com",
  appName: process.env.APP_NAME || "App",
} as const;

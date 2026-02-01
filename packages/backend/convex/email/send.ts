"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { resend, EMAIL_CONFIG } from "./resend";

// Explicit return type to break circular type inference
type EmailResult = { success: boolean; emailId?: string; error?: string };

/**
 * Send an email using a React Email template.
 * Renders the template to HTML and sends via the Convex Resend component.
 *
 * Features:
 * - Automatic template rendering
 * - Queued with retries via Resend component
 * - Rate limit handling
 * - Idempotent delivery
 *
 * @example
 * await ctx.runAction(internal.email.send.sendTemplatedEmail, {
 *   to: "user@example.com",
 *   subject: "Welcome!",
 *   template: "welcome",
 *   templateProps: { recipientName: "John" },
 * });
 */
export const sendTemplatedEmail = internalAction({
  args: {
    to: v.union(v.string(), v.array(v.string())),
    subject: v.string(),
    template: v.string(),
    templateProps: v.any(),
    from: v.optional(v.string()),
    replyTo: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    emailId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { to, subject, template, templateProps, from, replyTo }): Promise<EmailResult> => {
    try {
      // Render the React Email template to HTML
      const html = await ctx.runAction(internal.email.templates.renderTemplate, {
        template,
        props: templateProps,
      });

      // Send via Resend component (automatically queued with retries)
      const emailId = await resend.sendEmail(ctx, {
        from: from || EMAIL_CONFIG.from.default,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        replyTo: replyTo ? (Array.isArray(replyTo) ? replyTo : [replyTo]) : undefined,
      });

      console.log(`[Email] Sent ${template} to ${Array.isArray(to) ? to.join(", ") : to}: ${emailId}`);
      return { success: true, emailId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Email] Failed to send ${template} to ${to}:`, message);
      return { success: false, error: message };
    }
  },
});

/**
 * Send a simple HTML email (no template rendering).
 * Use this when you have pre-rendered HTML or simple text emails.
 *
 * @example
 * await ctx.runAction(internal.email.send.sendHtmlEmail, {
 *   to: "user@example.com",
 *   subject: "Quick update",
 *   html: "<p>Hello!</p>",
 * });
 */
export const sendHtmlEmail = internalAction({
  args: {
    to: v.union(v.string(), v.array(v.string())),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
    from: v.optional(v.string()),
    replyTo: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    emailId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { to, subject, html, text, from, replyTo }): Promise<EmailResult> => {
    try {
      const emailId = await resend.sendEmail(ctx, {
        from: from || EMAIL_CONFIG.from.default,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        replyTo: replyTo ? (Array.isArray(replyTo) ? replyTo : [replyTo]) : undefined,
      });

      console.log(`[Email] Sent HTML email to ${Array.isArray(to) ? to.join(", ") : to}: ${emailId}`);
      return { success: true, emailId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Email] Failed to send HTML email to ${to}:`, message);
      return { success: false, error: message };
    }
  },
});

/**
 * Send a plain text email.
 * Use for simple notifications that don't need HTML formatting.
 *
 * @example
 * await ctx.runAction(internal.email.send.sendTextEmail, {
 *   to: "user@example.com",
 *   subject: "Notification",
 *   text: "Your export is ready.",
 * });
 */
export const sendTextEmail = internalAction({
  args: {
    to: v.union(v.string(), v.array(v.string())),
    subject: v.string(),
    text: v.string(),
    from: v.optional(v.string()),
    replyTo: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    emailId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { to, subject, text, from, replyTo }): Promise<EmailResult> => {
    try {
      const emailId = await resend.sendEmail(ctx, {
        from: from || EMAIL_CONFIG.from.default,
        to: Array.isArray(to) ? to : [to],
        subject,
        text,
        replyTo: replyTo ? (Array.isArray(replyTo) ? replyTo : [replyTo]) : undefined,
      });

      console.log(`[Email] Sent text email to ${Array.isArray(to) ? to.join(", ") : to}: ${emailId}`);
      return { success: true, emailId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Email] Failed to send text email to ${to}:`, message);
      return { success: false, error: message };
    }
  },
});

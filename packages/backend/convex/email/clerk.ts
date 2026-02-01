"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Clerk email webhook data structure
 */
interface ClerkEmailData {
  otp?: string;
  magic_link?: string;
  reset_password_link?: string;
  user_first_name?: string;
  organization_name?: string;
  invitation_link?: string;
  [key: string]: unknown;
}

/**
 * Email configuration for each Clerk email slug
 */
interface EmailConfig {
  template: string;
  subject: string;
  props: Record<string, unknown>;
}

/**
 * Handle Clerk email webhook events.
 * Routes incoming Clerk emails to the appropriate template and sends via Resend.
 *
 * Supported Clerk email slugs:
 * - verification_code: OTP verification emails
 * - reset_password_link: Password reset emails
 * - magic_link: Passwordless login emails
 * - organization_invitation: Team/org invitation emails
 *
 * @example
 * // Called from http.ts webhook handler
 * await ctx.runAction(internal.email.clerk.handleClerkEmail, {
 *   toEmailAddress: "user@example.com",
 *   slug: "verification_code",
 *   data: { otp: "123456", user_first_name: "John" },
 * });
 */
export const handleClerkEmail = internalAction({
  args: {
    toEmailAddress: v.string(),
    slug: v.string(),
    data: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, { toEmailAddress, slug, data }): Promise<null> => {
    const emailData = data as ClerkEmailData;
    const firstName = emailData.user_first_name || "there";

    // Map Clerk email slug to template configuration
    const emailConfig = getEmailConfig(slug, emailData, firstName);

    if (!emailConfig) {
      console.warn(`[Clerk Email] Unknown or unsupported email slug: ${slug}`);
      return null;
    }

    // Send the email using our templated email action
    const result = await ctx.runAction(internal.email.send.sendTemplatedEmail, {
      to: toEmailAddress,
      subject: emailConfig.subject,
      template: emailConfig.template,
      templateProps: emailConfig.props,
    });

    if (!result.success) {
      console.error(`[Clerk Email] Failed to send ${slug} to ${toEmailAddress}:`, result.error);
      throw new Error(`Failed to send Clerk email: ${result.error}`);
    }

    console.log(`[Clerk Email] Sent ${slug} to ${toEmailAddress} (${result.emailId})`);
    return null;
  },
});

/**
 * Get email configuration for a Clerk email slug
 */
function getEmailConfig(
  slug: string,
  data: ClerkEmailData,
  firstName: string
): EmailConfig | null {
  switch (slug) {
    case "verification_code":
      return {
        template: "verification",
        subject: `Your verification code is ${data.otp}`,
        props: {
          recipientName: firstName,
          verificationCode: data.otp || "000000",
          codeExpiryMinutes: 10,
        },
      };

    case "reset_password_link":
      return {
        template: "password-reset",
        subject: "Reset your password",
        props: {
          recipientName: firstName,
          resetUrl: data.reset_password_link || "",
          expiryMinutes: 60,
        },
      };

    case "magic_link":
      return {
        template: "magic-link",
        subject: "Sign in to your account",
        props: {
          recipientName: firstName,
          magicLinkUrl: data.magic_link || "",
          expiryMinutes: 10,
        },
      };

    case "organization_invitation":
      return {
        template: "invite",
        subject: `You've been invited to join ${data.organization_name || "a team"}`,
        props: {
          recipientName: "there",
          inviterName: "A team member",
          organizationName: data.organization_name || "the team",
          acceptInviteUrl: data.invitation_link || "",
        },
      };

    // Add more Clerk email types as needed
    // case "passkey_registration":
    // case "email_link":
    // case "session_revoked":

    default:
      return null;
  }
}

/**
 * List of supported Clerk email slugs
 */
export const SUPPORTED_CLERK_SLUGS = [
  "verification_code",
  "reset_password_link",
  "magic_link",
  "organization_invitation",
] as const;

export type SupportedClerkSlug = (typeof SUPPORTED_CLERK_SLUGS)[number];

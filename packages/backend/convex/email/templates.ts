"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { render } from "@react-email/render";
import React from "react";

// Import all email templates from @repo/email
import { SimpleVerification } from "@repo/email/templates/simple-verification";
import { SimpleInvite } from "@repo/email/templates/simple-invite";
import { PasswordReset } from "@repo/email/templates/password-reset";
import { MagicLink } from "@repo/email/templates/magic-link";
import { SimpleWelcome01 } from "@repo/email/templates/simple-welcome-01";
import { SimpleWelcome02 } from "@repo/email/templates/simple-welcome-02";
import { ImageWelcome } from "@repo/email/templates/image-welcome";
import { VideoWelcome01 } from "@repo/email/templates/video-welcome-01";
import { VideoWelcome02 } from "@repo/email/templates/video-welcome-02";
import { VideoWelcome03 } from "@repo/email/templates/video-welcome-03";
import { Mockup01 } from "@repo/email/templates/mockup-01";
import { Mockup02 } from "@repo/email/templates/mockup-02";
import { Receipt } from "@repo/email/templates/receipt";
import { PaymentFailed } from "@repo/email/templates/payment-failed";
import { PaymentExpiring } from "@repo/email/templates/payment-expiring";
import { SubscriptionCreated } from "@repo/email/templates/subscription-created";
import { SubscriptionUpgraded } from "@repo/email/templates/subscription-upgraded";
import { SubscriptionDowngraded } from "@repo/email/templates/subscription-downgraded";
import { SubscriptionCancelled } from "@repo/email/templates/subscription-cancelled";
import { TrialStarting } from "@repo/email/templates/trial-starting";
import { TrialEnding } from "@repo/email/templates/trial-ending";
import { TrialEnded } from "@repo/email/templates/trial-ended";

/**
 * Template type union for type-safe template selection
 */
export type TemplateType =
  | "verification"
  | "invite"
  | "password-reset"
  | "magic-link"
  | "welcome"
  | "welcome-features"
  | "image-welcome"
  | "video-welcome-01"
  | "video-welcome-02"
  | "video-welcome-03"
  | "mockup-01"
  | "mockup-02"
  | "receipt"
  | "payment-failed"
  | "payment-expiring"
  | "subscription-created"
  | "subscription-upgraded"
  | "subscription-downgraded"
  | "subscription-cancelled"
  | "trial-starting"
  | "trial-ending"
  | "trial-ended";

/**
 * Template component factory
 * Maps template keys to their React component constructors
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const templateFactory: Record<TemplateType, (props: any) => React.ReactElement> = {
  verification: (props) => React.createElement(SimpleVerification, props),
  invite: (props) => React.createElement(SimpleInvite, props),
  "password-reset": (props) => React.createElement(PasswordReset, props),
  "magic-link": (props) => React.createElement(MagicLink, props),
  welcome: (props) => React.createElement(SimpleWelcome01, props),
  "welcome-features": (props) => React.createElement(SimpleWelcome02, props),
  "image-welcome": (props) => React.createElement(ImageWelcome, props),
  "video-welcome-01": (props) => React.createElement(VideoWelcome01, props),
  "video-welcome-02": (props) => React.createElement(VideoWelcome02, props),
  "video-welcome-03": (props) => React.createElement(VideoWelcome03, props),
  "mockup-01": (props) => React.createElement(Mockup01, props),
  "mockup-02": (props) => React.createElement(Mockup02, props),
  receipt: (props) => React.createElement(Receipt, props),
  "payment-failed": (props) => React.createElement(PaymentFailed, props),
  "payment-expiring": (props) => React.createElement(PaymentExpiring, props),
  "subscription-created": (props) => React.createElement(SubscriptionCreated, props),
  "subscription-upgraded": (props) => React.createElement(SubscriptionUpgraded, props),
  "subscription-downgraded": (props) => React.createElement(SubscriptionDowngraded, props),
  "subscription-cancelled": (props) => React.createElement(SubscriptionCancelled, props),
  "trial-starting": (props) => React.createElement(TrialStarting, props),
  "trial-ending": (props) => React.createElement(TrialEnding, props),
  "trial-ended": (props) => React.createElement(TrialEnded, props),
};

/**
 * Render a React Email template to HTML string.
 * This runs in a Node.js environment within Convex.
 *
 * @param template - The template key (e.g., "verification", "welcome")
 * @param props - Props to pass to the template component
 * @returns HTML string ready to be sent via Resend
 */
export const renderTemplate = internalAction({
  args: {
    template: v.string(),
    props: v.any(),
  },
  returns: v.string(),
  handler: async (ctx, { template, props }): Promise<string> => {
    const templateKey = template as TemplateType;

    // Default theme to light if not specified
    const templateProps = { theme: "light" as const, ...props };

    const createTemplate = templateFactory[templateKey];
    if (!createTemplate) {
      throw new Error(`Unknown email template: ${template}. Valid templates: ${Object.keys(templateFactory).join(", ")}`);
    }

    // Create React element and render to HTML
    const element = createTemplate(templateProps);
    const html = await render(element);

    return html;
  },
});

/**
 * Get list of available template keys
 */
export const getAvailableTemplates = internalAction({
  args: {},
  returns: v.array(v.string()),
  handler: async (): Promise<string[]> => {
    return Object.keys(templateFactory);
  },
});

# Convex Resend Component Migration Roadmap

This roadmap migrates the email infrastructure from the current **Inngest + Resend SDK** architecture to the unified **Convex Resend Component**. This eliminates a third-party dependency while gaining built-in queueing, idempotency, and rate limiting.

## Architecture Comparison

### Current Architecture (Inngest-based)

```
┌─────────────────┐    ┌───────────────┐    ┌────────────────┐    ┌──────────┐
│  Clerk Webhook  │───▶│ Convex HTTP   │───▶│ Inngest Cloud  │───▶│  Resend  │
│  (email.created)│    │ (forward)     │    │ (queue/retry)  │    │  API     │
└─────────────────┘    └───────────────┘    └────────────────┘    └──────────┘
                                                    │
                                           ┌────────▼────────┐
                                           │  Next.js App    │
                                           │  (send logic)   │
                                           └─────────────────┘
```

**Pain points:**
- Extra service (Inngest) to manage and pay for
- Email logic split between Convex and Next.js
- Manual idempotency handling
- Additional latency from Inngest hop

### New Architecture (Convex Resend Component)

```
┌─────────────────┐    ┌─────────────────────────────────────────┐    ┌──────────┐
│  Clerk Webhook  │───▶│              Convex Backend              │───▶│  Resend  │
│  (email.created)│    │  ┌────────────────────────────────────┐  │    │  API     │
└─────────────────┘    │  │     @convex-dev/resend component   │  │    └──────────┘
                       │  │  • Built-in queueing & batching    │  │
                       │  │  • Automatic retries               │  │
                       │  │  • Idempotency management          │  │
                       │  │  • Rate limit handling             │  │
                       │  └────────────────────────────────────┘  │
                       └─────────────────────────────────────────┘
                                           │
                                  ┌────────▼────────┐
                                  │ Resend Webhook  │ (optional)
                                  │ (status events) │
                                  └─────────────────┘
```

**Benefits:**
- Single ecosystem (Convex only)
- Built-in queueing via Convex workpools
- Automatic idempotency (exactly-once delivery)
- Respects Resend rate limits automatically
- Optional webhook integration for delivery tracking

---

## Migration Phases

| Phase | Description | Effort |
|-------|-------------|--------|
| 1 | Component Setup & Configuration | ~1 hour |
| 2 | Email Service Layer in Convex | ~2-3 hours |
| 3 | Clerk Webhook Migration | ~1-2 hours |
| 4 | Application Email Functions | ~2-3 hours |
| 5 | Resend Webhook Integration (Optional) | ~1 hour |
| 6 | Cleanup & Testing | ~2 hours |

**Total estimated effort: ~10-12 hours**

---

## Phase 1: Component Setup & Configuration

### 1.1 Install the Convex Resend Component

```bash
npm install @convex-dev/resend --workspace=packages/backend
```

### 1.2 Register Component in Convex Config

Update `packages/backend/convex/convex.config.ts`:

```typescript
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import resend from "@convex-dev/resend/convex.config";

const app = defineApp();
app.use(agent);
app.use(resend);

export default app;
```

### 1.3 Configure Environment Variables

Add to Convex dashboard (Settings > Environment Variables):

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Your Resend API key |
| `RESEND_WEBHOOK_SECRET` | (Optional) For delivery status webhooks |

### 1.4 Deploy Configuration

```bash
cd packages/backend
npx convex deploy
```

**Deliverables:**
- [ ] `@convex-dev/resend` installed
- [ ] Component registered in `convex.config.ts`
- [ ] Environment variables configured
- [ ] Successful deployment

---

## Phase 2: Email Service Layer in Convex

### 2.1 Create Resend Client Module

Create `packages/backend/convex/resend.ts`:

```typescript
import { components, internal } from "./_generated/api";
import { Resend } from "@convex-dev/resend";

/**
 * Resend client with built-in queueing, batching, and idempotency.
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Rate limit handling
 * - Exactly-once delivery via idempotency keys
 * - Optional delivery status webhooks
 */
export const resend = new Resend(components.resend, {
  // Set to false in production to allow all email addresses
  testMode: process.env.NODE_ENV !== "production",
  // Optional: Handle email status events (delivered, bounced, etc.)
  onEmailEvent: internal.resend.handleEmailEvent,
});
```

### 2.2 Create Email Event Handler

Add to `packages/backend/convex/resend.ts`:

```typescript
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { vEmailId, vEmailEvent } from "@convex-dev/resend";

/**
 * Handle Resend webhook events for email status tracking.
 * Events: delivered, bounced, complained, opened, clicked
 */
export const handleEmailEvent = internalMutation({
  args: {
    id: vEmailId,
    event: vEmailEvent,
  },
  returns: v.null(),
  handler: async (ctx, { id, event }) => {
    console.log(`[Resend] Email ${id}: ${event.type}`);

    // Optional: Store email events for analytics
    // await ctx.db.insert("emailEvents", { emailId: id, ...event });

    // Optional: Handle specific events
    switch (event.type) {
      case "email.bounced":
        console.warn(`[Resend] Email bounced: ${id}`);
        // Could update user record, trigger notification, etc.
        break;
      case "email.complained":
        console.warn(`[Resend] Spam complaint: ${id}`);
        // Could add to suppression list
        break;
    }

    return null;
  },
});
```

### 2.3 Create Email Template Renderer

Since Convex actions can use Node.js, we can render React Email templates:

Create `packages/backend/convex/emailTemplates.ts`:

```typescript
"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { render } from "@react-email/render";

// Import templates from the email package
import { SimpleVerification } from "@repo/email/templates/simple-verification";
import { SimpleInvite } from "@repo/email/templates/simple-invite";
import { PasswordReset } from "@repo/email/templates/password-reset";
import { MagicLink } from "@repo/email/templates/magic-link";
import { SimpleWelcome01 } from "@repo/email/templates/simple-welcome-01";
import { SimpleWelcome02 } from "@repo/email/templates/simple-welcome-02";
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
 * Template types for type-safe email rendering
 */
export type TemplateType =
  | "verification"
  | "invite"
  | "password-reset"
  | "magic-link"
  | "welcome"
  | "welcome-features"
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
 * Render a React Email template to HTML string.
 * This runs in a Node.js environment within Convex.
 */
export const renderTemplate = internalAction({
  args: {
    template: v.string(),
    props: v.any(),
  },
  returns: v.string(),
  handler: async (ctx, { template, props }) => {
    const templateName = template as TemplateType;
    const templateProps = { theme: "light" as const, ...props };

    const templates: Record<TemplateType, () => React.ReactElement> = {
      verification: () => SimpleVerification(templateProps),
      invite: () => SimpleInvite(templateProps),
      "password-reset": () => PasswordReset(templateProps),
      "magic-link": () => MagicLink(templateProps),
      welcome: () => SimpleWelcome01(templateProps),
      "welcome-features": () => SimpleWelcome02(templateProps),
      receipt: () => Receipt(templateProps),
      "payment-failed": () => PaymentFailed(templateProps),
      "payment-expiring": () => PaymentExpiring(templateProps),
      "subscription-created": () => SubscriptionCreated(templateProps),
      "subscription-upgraded": () => SubscriptionUpgraded(templateProps),
      "subscription-downgraded": () => SubscriptionDowngraded(templateProps),
      "subscription-cancelled": () => SubscriptionCancelled(templateProps),
      "trial-starting": () => TrialStarting(templateProps),
      "trial-ending": () => TrialEnding(templateProps),
      "trial-ended": () => TrialEnded(templateProps),
    };

    const getTemplate = templates[templateName];
    if (!getTemplate) {
      throw new Error(`Unknown email template: ${template}`);
    }

    return await render(getTemplate());
  },
});
```

### 2.4 Create Email Sending Actions

Create `packages/backend/convex/sendEmail.ts`:

```typescript
"use node";

import { v } from "convex/values";
import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { resend } from "./resend";

// Email configuration
const EMAIL_CONFIG = {
  from: {
    default: `${process.env.APP_NAME || "App"} <noreply@${process.env.EMAIL_DOMAIN || "example.com"}>`,
    support: `Support <support@${process.env.EMAIL_DOMAIN || "example.com"}>`,
    billing: `Billing <billing@${process.env.EMAIL_DOMAIN || "example.com"}>`,
  },
};

/**
 * Send an email using a React Email template.
 * Queued and sent via the Convex Resend component.
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
  handler: async (ctx, { to, subject, template, templateProps, from, replyTo }) => {
    try {
      // Render the React Email template to HTML
      const html = await ctx.runAction(internal.emailTemplates.renderTemplate, {
        template,
        props: templateProps,
      });

      // Send via Resend component (automatically queued with retries)
      const emailId = await resend.sendEmail(ctx, {
        from: from || EMAIL_CONFIG.from.default,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        replyTo,
      });

      console.log(`[Email] Sent ${template} to ${to}: ${emailId}`);
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
 */
export const sendHtmlEmail = internalAction({
  args: {
    to: v.union(v.string(), v.array(v.string())),
    subject: v.string(),
    html: v.string(),
    from: v.optional(v.string()),
    replyTo: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    emailId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { to, subject, html, from, replyTo }) => {
    try {
      const emailId = await resend.sendEmail(ctx, {
        from: from || EMAIL_CONFIG.from.default,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        replyTo,
      });

      return { success: true, emailId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Email] Failed to send to ${to}:`, message);
      return { success: false, error: message };
    }
  },
});
```

**Deliverables:**
- [ ] `convex/resend.ts` - Resend client and event handler
- [ ] `convex/emailTemplates.ts` - Template renderer action
- [ ] `convex/sendEmail.ts` - Email sending actions
- [ ] All templates render correctly

---

## Phase 3: Clerk Webhook Migration

### 3.1 Update HTTP Webhook Handler

Update `packages/backend/convex/http.ts` to send emails directly:

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";
import { transformWebhookData } from "./paymentAttemptTypes";
import { resend } from "./resend";

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (!event) {
      return new Response("Error occurred", { status: 400 });
    }

    switch ((event as any).type) {
      case "user.created":
      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data as any,
        });
        break;

      case "user.deleted": {
        const clerkUserId = (event.data as any).id!;
        await ctx.runMutation(internal.users.deleteFromClerk, { clerkUserId });
        break;
      }

      case "paymentAttempt.updated": {
        const paymentAttemptData = transformWebhookData((event as any).data);
        await ctx.runMutation(internal.paymentAttempts.savePaymentAttempt, {
          paymentAttemptData,
        });
        break;
      }

      case "email.created": {
        // Send Clerk emails via Convex Resend component (no Inngest)
        const emailData = (event as any).data;
        await ctx.runAction(internal.clerkEmails.handleClerkEmail, {
          toEmailAddress: emailData.to_email_address,
          slug: emailData.slug,
          data: emailData.data || {},
        });
        break;
      }

      default:
        console.log("Ignored webhook event", (event as any).type);
    }

    return new Response(null, { status: 200 });
  }),
});

// Optional: Add Resend webhook endpoint for delivery status
http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  try {
    return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook event", error);
    return null;
  }
}

export default http;
```

### 3.2 Create Clerk Email Handler

Create `packages/backend/convex/clerkEmails.ts`:

```typescript
"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

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
 * Handle Clerk email webhook events.
 * Routes incoming Clerk emails to the appropriate template and sends via Resend component.
 *
 * Supported Clerk email slugs:
 * - verification_code: OTP verification emails
 * - reset_password_link: Password reset emails
 * - magic_link: Passwordless login emails
 * - organization_invitation: Team/org invitation emails
 */
export const handleClerkEmail = internalAction({
  args: {
    toEmailAddress: v.string(),
    slug: v.string(),
    data: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, { toEmailAddress, slug, data }) => {
    const emailData = data as ClerkEmailData;

    // Map Clerk email slug to template and subject
    const emailConfig = getEmailConfig(slug, emailData);

    if (!emailConfig) {
      console.warn(`[Clerk Email] Unknown email slug: ${slug}`);
      return null;
    }

    const result = await ctx.runAction(internal.sendEmail.sendTemplatedEmail, {
      to: toEmailAddress,
      subject: emailConfig.subject,
      template: emailConfig.template,
      templateProps: emailConfig.props,
    });

    if (!result.success) {
      throw new Error(`Failed to send Clerk email: ${result.error}`);
    }

    console.log(`[Clerk Email] Sent ${slug} to ${toEmailAddress}`);
    return null;
  },
});

function getEmailConfig(
  slug: string,
  data: ClerkEmailData
): { template: string; subject: string; props: Record<string, unknown> } | null {
  const firstName = data.user_first_name || "there";

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

    default:
      return null;
  }
}
```

**Deliverables:**
- [ ] `convex/http.ts` updated to call Clerk email handler directly
- [ ] `convex/clerkEmails.ts` - Clerk email routing logic
- [ ] Resend webhook endpoint added (optional)
- [ ] Clerk emails work without Inngest

---

## Phase 4: Application Email Functions

### 4.1 Create Public Email Actions

Create `packages/backend/convex/emailActions.ts`:

```typescript
"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Send a welcome email to a new user.
 * Call this from user.created webhook or after signup.
 */
export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
    loginUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { email, firstName, loginUrl }) => {
    await ctx.runAction(internal.sendEmail.sendTemplatedEmail, {
      to: email,
      subject: "Welcome to the platform!",
      template: "welcome",
      templateProps: {
        recipientName: firstName,
        loginUrl: loginUrl || process.env.NEXT_PUBLIC_APP_URL || "",
      },
    });
    return null;
  },
});

/**
 * Send a team invitation email.
 */
export const sendTeamInvite = internalAction({
  args: {
    email: v.string(),
    recipientName: v.optional(v.string()),
    inviterName: v.string(),
    teamName: v.string(),
    inviteUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { email, recipientName, inviterName, teamName, inviteUrl }) => {
    await ctx.runAction(internal.sendEmail.sendTemplatedEmail, {
      to: email,
      subject: `${inviterName} invited you to join ${teamName}`,
      template: "invite",
      templateProps: {
        recipientName: recipientName || "there",
        inviterName,
        organizationName: teamName,
        acceptInviteUrl: inviteUrl,
      },
    });
    return null;
  },
});

/**
 * Send a billing receipt email.
 */
export const sendReceipt = internalAction({
  args: {
    email: v.string(),
    recipientName: v.string(),
    amount: v.string(),
    currency: v.string(),
    invoiceNumber: v.string(),
    invoiceDate: v.string(),
    lineItems: v.array(
      v.object({
        description: v.string(),
        quantity: v.number(),
        unitPrice: v.string(),
        total: v.string(),
      })
    ),
    receiptUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runAction(internal.sendEmail.sendTemplatedEmail, {
      to: args.email,
      subject: `Receipt for your payment - ${args.invoiceNumber}`,
      template: "receipt",
      templateProps: {
        recipientName: args.recipientName,
        amount: args.amount,
        currency: args.currency,
        invoiceNumber: args.invoiceNumber,
        invoiceDate: args.invoiceDate,
        lineItems: args.lineItems,
        receiptUrl: args.receiptUrl,
      },
      from: `Billing <billing@${process.env.EMAIL_DOMAIN || "example.com"}>`,
    });
    return null;
  },
});

/**
 * Send a payment failed notification.
 */
export const sendPaymentFailed = internalAction({
  args: {
    email: v.string(),
    recipientName: v.string(),
    amount: v.string(),
    currency: v.string(),
    failureReason: v.optional(v.string()),
    updatePaymentUrl: v.string(),
    retryDate: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runAction(internal.sendEmail.sendTemplatedEmail, {
      to: args.email,
      subject: "Action required: Payment failed",
      template: "payment-failed",
      templateProps: {
        recipientName: args.recipientName,
        amount: args.amount,
        currency: args.currency,
        failureReason: args.failureReason,
        updatePaymentUrl: args.updatePaymentUrl,
        retryDate: args.retryDate,
      },
      from: `Billing <billing@${process.env.EMAIL_DOMAIN || "example.com"}>`,
    });
    return null;
  },
});

/**
 * Send trial ending notification.
 */
export const sendTrialEnding = internalAction({
  args: {
    email: v.string(),
    recipientName: v.string(),
    trialEndDate: v.string(),
    daysRemaining: v.number(),
    upgradeUrl: v.string(),
    planName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runAction(internal.sendEmail.sendTemplatedEmail, {
      to: args.email,
      subject: `Your trial ends in ${args.daysRemaining} days`,
      template: "trial-ending",
      templateProps: {
        recipientName: args.recipientName,
        trialEndDate: args.trialEndDate,
        daysRemaining: args.daysRemaining,
        upgradeUrl: args.upgradeUrl,
        planName: args.planName,
      },
    });
    return null;
  },
});

/**
 * Send subscription change notification.
 */
export const sendSubscriptionChange = internalAction({
  args: {
    email: v.string(),
    recipientName: v.string(),
    changeType: v.union(
      v.literal("created"),
      v.literal("upgraded"),
      v.literal("downgraded"),
      v.literal("cancelled")
    ),
    planName: v.string(),
    effectiveDate: v.optional(v.string()),
    manageUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const subjects = {
      created: `Welcome to ${args.planName}!`,
      upgraded: `You've upgraded to ${args.planName}`,
      downgraded: `Your plan has been changed to ${args.planName}`,
      cancelled: "Your subscription has been cancelled",
    };

    const templates = {
      created: "subscription-created",
      upgraded: "subscription-upgraded",
      downgraded: "subscription-downgraded",
      cancelled: "subscription-cancelled",
    };

    await ctx.runAction(internal.sendEmail.sendTemplatedEmail, {
      to: args.email,
      subject: subjects[args.changeType],
      template: templates[args.changeType],
      templateProps: {
        recipientName: args.recipientName,
        planName: args.planName,
        effectiveDate: args.effectiveDate,
        manageUrl: args.manageUrl,
      },
    });
    return null;
  },
});
```

**Deliverables:**
- [ ] `convex/emailActions.ts` - Public email functions
- [ ] All email types have corresponding actions
- [ ] Actions are callable from other Convex functions

---

## Phase 5: Resend Webhook Integration (Optional)

### 5.1 Configure Resend Webhooks

1. Go to Resend Dashboard > Webhooks
2. Add endpoint: `https://your-convex-deployment.convex.site/resend-webhook`
3. Select events: `email.delivered`, `email.bounced`, `email.complained`
4. Copy webhook signing secret

### 5.2 Add Environment Variable

```bash
npx convex env set RESEND_WEBHOOK_SECRET "whsec_..."
```

### 5.3 Expand Event Handler (Optional)

Update `convex/resend.ts` to track email status:

```typescript
// Add schema for email events (optional)
// In convex/schema.ts:
// emailEvents: defineEnt({
//   emailId: v.string(),
//   eventType: v.string(),
//   timestamp: v.number(),
//   recipient: v.optional(v.string()),
//   reason: v.optional(v.string()),
// }).index("by_emailId", ["emailId"])

export const handleEmailEvent = internalMutation({
  args: {
    id: vEmailId,
    event: vEmailEvent,
  },
  returns: v.null(),
  handler: async (ctx, { id, event }) => {
    // Log all events
    console.log(`[Resend] Email ${id}: ${event.type}`);

    // Optional: Persist events for analytics
    // await ctx.db.insert("emailEvents", {
    //   emailId: id,
    //   eventType: event.type,
    //   timestamp: Date.now(),
    //   recipient: event.email,
    //   reason: event.bounce?.message || event.complaint?.reason,
    // });

    // Handle bounces - could add to suppression list
    if (event.type === "email.bounced") {
      console.warn(`[Resend] Bounce: ${event.email} - ${event.bounce?.message}`);
    }

    // Handle spam complaints - remove from mailing lists
    if (event.type === "email.complained") {
      console.warn(`[Resend] Complaint: ${event.email}`);
    }

    return null;
  },
});
```

**Deliverables:**
- [ ] Resend webhook configured in dashboard
- [ ] `RESEND_WEBHOOK_SECRET` environment variable set
- [ ] Event handler processes status updates
- [ ] (Optional) Email events persisted for analytics

---

## Phase 6: Cleanup & Testing

### 6.1 Remove Inngest Dependencies

Delete or archive these files:

```bash
# Files to remove from apps/app/src/lib/inngest/
rm -rf apps/app/src/lib/inngest/

# Files to remove from apps/app/
rm apps/app/src/app/api/inngest/route.ts

# Update packages - remove inngest
cd apps/app && npm uninstall inngest
```

### 6.2 Remove Old Email Service

Archive or delete:

```bash
rm apps/app/src/lib/email/service.ts
rm apps/app/src/lib/email/types.ts
rm apps/app/src/lib/email/index.ts
rm apps/app/src/lib/resend.ts
rm apps/app/src/config/email.ts
```

### 6.3 Update Package Exports

Update `packages/backend/convex/_generated/api.ts` imports as needed (auto-generated).

### 6.4 Remove Environment Variables

Remove from Next.js app `.env`:
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `RESEND_API_KEY` (now only in Convex)

### 6.5 Test All Email Flows

| Email Type | Test Method |
|------------|-------------|
| Verification code | Sign up new user in dev |
| Magic link | Request magic link login |
| Password reset | Request password reset |
| Team invitation | Invite user to org |
| Welcome email | Create new user |
| Billing emails | Trigger from Stripe test mode |

### 6.6 Update CLAUDE.md

Update the Email Infrastructure Status section in `CLAUDE.md`:

```markdown
## Email Infrastructure Status

**Architecture:** Convex Resend Component (unified backend)

### Email Files

**Backend (`packages/backend/convex/`):**
- `resend.ts` - Resend client with event handler
- `sendEmail.ts` - Core email sending actions
- `emailTemplates.ts` - React Email template renderer
- `clerkEmails.ts` - Clerk webhook email handler
- `emailActions.ts` - Application email functions

**Templates (`packages/email/emails/`):**
- 22 React Email templates (auth, billing, notifications)

### Template Count: 22 templates
```

**Deliverables:**
- [ ] Inngest removed from codebase
- [ ] Old email service files removed
- [ ] Environment variables cleaned up
- [ ] All email flows tested
- [ ] Documentation updated

---

## File Changes Summary

### New Files (Convex Backend)

| File | Purpose |
|------|---------|
| `convex/resend.ts` | Resend client initialization and event handler |
| `convex/sendEmail.ts` | Core email sending actions |
| `convex/emailTemplates.ts` | React Email template renderer |
| `convex/clerkEmails.ts` | Clerk webhook email handler |
| `convex/emailActions.ts` | Application email functions |

### Modified Files

| File | Changes |
|------|---------|
| `convex/convex.config.ts` | Add resend component |
| `convex/http.ts` | Update Clerk handler, add Resend webhook |

### Deleted Files

| File | Reason |
|------|--------|
| `apps/app/src/lib/inngest/*` | Replaced by Convex component |
| `apps/app/src/lib/email/*` | Moved to Convex backend |
| `apps/app/src/lib/resend.ts` | Moved to Convex backend |
| `apps/app/src/config/email.ts` | Moved to Convex backend |
| `apps/app/src/app/api/inngest/route.ts` | No longer needed |

---

## Environment Variables

### Convex Dashboard

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes | Resend API key |
| `RESEND_WEBHOOK_SECRET` | Optional | For delivery status tracking |
| `EMAIL_DOMAIN` | Recommended | Your verified sending domain |
| `APP_NAME` | Recommended | App name for email "from" field |

### Next.js App (Removed)

These can be removed from `.env.local`:
- `RESEND_API_KEY` (now in Convex)
- `INNGEST_EVENT_KEY` (no longer used)
- `INNGEST_SIGNING_KEY` (no longer used)

---

## Benefits After Migration

| Aspect | Before (Inngest) | After (Convex Component) |
|--------|------------------|-------------------------|
| Services | 3 (Convex, Inngest, Resend) | 2 (Convex, Resend) |
| Monthly cost | Inngest free tier + overages | $0 additional |
| Code location | Split (Next.js + Convex) | Unified (Convex only) |
| Queueing | Inngest managed | Convex workpools (built-in) |
| Idempotency | Manual | Automatic |
| Rate limiting | Manual | Automatic |
| Debugging | Two dashboards | One dashboard |
| Type safety | Partial | Full (Convex types) |

---

## Rollback Plan

If issues arise, revert to Inngest-based approach:

1. Restore deleted files from git
2. Re-add Inngest dependencies
3. Update `convex/http.ts` to forward to Inngest again
4. Remove `@convex-dev/resend` from `convex.config.ts`

```bash
git checkout HEAD~1 -- apps/app/src/lib/inngest
git checkout HEAD~1 -- apps/app/src/lib/email
git checkout HEAD~1 -- packages/backend/convex/email.ts
```

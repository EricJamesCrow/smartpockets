# Complete email infrastructure roadmap for Next.js SaaS with Resend and UntitledUI

Modern SaaS applications require a sophisticated email infrastructure that handles authentication flows, transactional notifications, and marketing communications. This roadmap provides a complete implementation strategy for integrating **Resend** (transactional), **UntitledUI Pro** (design system), **Clerk** (authentication emails), and **Loops** (marketing) into a Next.js starter kit, with phased delivery over approximately **8-10 weeks**.

## Architecture overview and service separation

The recommended architecture cleanly separates concerns across three email providers, each optimized for specific use cases:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SaaS Email Infrastructure                           │
├────────────────────┬────────────────────────┬───────────────────────────────┤
│       CLERK        │        RESEND          │           LOOPS               │
│  (Auth Webhooks)   │   (Transactional)      │    (Marketing/Product)        │
├────────────────────┼────────────────────────┼───────────────────────────────┤
│ • Verification OTP │ • Welcome emails       │ • Newsletter campaigns        │
│ • Magic links      │ • Team invitations     │ • Onboarding drip sequences   │
│ • Password reset   │ • Billing receipts     │ • Product announcements       │
│ • Security alerts  │ • Activity alerts      │ • Re-engagement flows         │
│ • 2FA codes        │ • Export ready         │ • Waitlist nurturing          │
└────────────────────┴────────────────────────┴───────────────────────────────┘
           │                     │                          │
           └─────────────────────┴──────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Email Service Layer   │
                    │   (Abstraction Layer)   │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      Inngest Queue      │
                    │  (Reliability Layer)    │
                    └─────────────────────────┘
```

**Resend** handles time-critical transactional emails requiring immediate delivery and developer control via React Email templates. **Loops** manages marketing automation, drip campaigns, and subscriber-based communications through its visual builder. **Clerk** generates authentication tokens (OTPs, magic links) that you intercept via webhooks and deliver through custom Resend templates.

## Recommended folder structure and code organization

```
src/
├── email/
│   ├── templates/
│   │   ├── auth/
│   │   │   ├── welcome.tsx
│   │   │   ├── email-verification.tsx
│   │   │   ├── password-reset.tsx
│   │   │   ├── magic-link.tsx
│   │   │   └── login-notification.tsx
│   │   ├── team/
│   │   │   ├── team-invitation.tsx
│   │   │   ├── invitation-accepted.tsx
│   │   │   ├── role-changed.tsx
│   │   │   └── member-removed.tsx
│   │   ├── billing/
│   │   │   ├── receipt.tsx
│   │   │   ├── payment-failed.tsx
│   │   │   ├── subscription-change.tsx
│   │   │   ├── trial-starting.tsx
│   │   │   └── trial-ending.tsx
│   │   └── notifications/
│   │       ├── activity-alert.tsx
│   │       └── weekly-digest.tsx
│   ├── components/                    # Shared UntitledUI-styled components
│   │   ├── EmailLayout.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Button.tsx
│   │   └── Logo.tsx
│   ├── styles/
│   │   └── theme.ts                   # UntitledUI design tokens
│   ├── service.ts                     # Email service abstraction
│   └── index.ts
├── app/
│   ├── api/
│   │   ├── webhooks/
│   │   │   └── clerk-email/
│   │   │       └── route.ts           # Clerk email.created handler
│   │   └── inngest/
│   │       └── route.ts               # Inngest webhook endpoint
│   └── actions/
│       └── email.ts                   # Server actions for emails
├── lib/
│   ├── resend.ts                      # Resend client initialization
│   ├── loops.ts                       # Loops client initialization
│   └── inngest/
│       ├── client.ts
│       └── functions/
│           ├── send-welcome-email.ts
│           ├── send-team-invite.ts
│           └── billing-notifications.ts
└── config/
    └── email.ts                       # Email configuration
```

## Phase 1: Foundation setup (Week 1-2)

### Environment configuration

Create environment-specific configurations for development, staging, and production:

```typescript
// config/email.ts
export const emailConfig = {
  provider: process.env.EMAIL_PROVIDER || 'resend',
  from: {
    default: `${process.env.APP_NAME} <noreply@${process.env.EMAIL_DOMAIN}>`,
    support: `Support <support@${process.env.EMAIL_DOMAIN}>`,
    billing: `Billing <billing@${process.env.EMAIL_DOMAIN}>`,
  },
  domains: {
    transactional: `mail.${process.env.EMAIL_DOMAIN}`,
    marketing: `updates.${process.env.EMAIL_DOMAIN}`,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY!,
  },
  loops: {
    apiKey: process.env.LOOPS_API_KEY!,
  },
  inngest: {
    eventKey: process.env.INNGEST_EVENT_KEY!,
  },
};
```

### Resend SDK initialization

```typescript
// lib/resend.ts
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is required');
}

export const resend = new Resend(process.env.RESEND_API_KEY);
```

### Email service abstraction layer

This abstraction enables provider switching and simplifies testing:

```typescript
// email/service.ts
import { resend } from '@/lib/resend';
import { render } from '@react-email/render';
import { emailConfig } from '@/config/email';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  template: React.ReactElement;
  from?: string;
  replyTo?: string;
}

interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: options.from || emailConfig.from.default,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      react: options.template,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Email service error:', err);
    return { success: false, error: 'Failed to send email' };
  }
}
```

### Domain verification and DNS setup

Resend requires **three DNS records** for domain verification. Using a subdomain (e.g., `mail.yourdomain.com`) protects your root domain reputation:

| Record Type | Host | Value |
|------------|------|-------|
| TXT | `send._domainkey.mail.yourdomain.com` | DKIM public key (provided by Resend) |
| TXT | `mail.yourdomain.com` | `v=spf1 include:resend.com ~all` |
| MX | `send.mail.yourdomain.com` | `feedback-smtp.us-east-1.amazonses.com` |

Add DMARC for enhanced deliverability:
```
v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

**Timeline estimate**: DNS propagation takes 24-72 hours. Initiate verification on day one.

## Phase 2: UntitledUI email template adaptation (Week 2-3)

### UntitledUI compatibility with React Email

UntitledUI provides **React components styled with Tailwind CSS v4.1**, making them highly compatible with React Email's `<Tailwind>` wrapper. The key adaptation strategy involves wrapping UntitledUI design patterns in React Email's layout primitives while maintaining the design system's visual language.

### Base email layout component

```tsx
// email/components/EmailLayout.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Preview,
  Section,
  Tailwind,
} from '@react-email/components';
import { Header } from './Header';
import { Footer } from './Footer';

// UntitledUI-inspired Tailwind configuration for emails
const emailTailwindConfig = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};

interface EmailLayoutProps {
  previewText: string;
  children: React.ReactNode;
}

export function EmailLayout({ previewText, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind config={emailTailwindConfig}>
        <Body className="bg-gray-50 my-0 mx-auto font-sans">
          <Container className="bg-white mx-auto my-10 p-8 rounded-lg max-w-[600px]">
            <Header />
            <Section className="py-6">{children}</Section>
            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

### Reusable UntitledUI-styled button component

```tsx
// email/components/Button.tsx
import { Button as ReactEmailButton } from '@react-email/components';

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
}

const variants = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  outline: 'bg-transparent text-brand-600 border border-brand-600',
};

export function Button({ href, children, variant = 'primary' }: ButtonProps) {
  return (
    <ReactEmailButton
      href={href}
      className={`
        px-6 py-3 rounded-lg font-semibold text-center
        no-underline inline-block
        ${variants[variant]}
      `}
    >
      {children}
    </ReactEmailButton>
  );
}
```

### Email template example with UntitledUI styling

```tsx
// email/templates/auth/welcome.tsx
import { Heading, Text, Section, Hr } from '@react-email/components';
import { EmailLayout } from '../../components/EmailLayout';
import { Button } from '../../components/Button';

interface WelcomeEmailProps {
  firstName: string;
  appName: string;
  dashboardUrl: string;
}

export function WelcomeEmail({ firstName, appName, dashboardUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout previewText={`Welcome to ${appName}, ${firstName}!`}>
      <Heading className="text-2xl font-bold text-gray-900 mt-0">
        Welcome to {appName} 🎉
      </Heading>
      
      <Text className="text-gray-600 text-base leading-relaxed">
        Hi {firstName}, we're thrilled to have you on board. Your account is ready
        and you can start exploring all the features we've built for you.
      </Text>
      
      <Section className="text-center my-8">
        <Button href={dashboardUrl}>Go to Dashboard</Button>
      </Section>
      
      <Hr className="border-gray-200 my-6" />
      
      <Text className="text-gray-500 text-sm">
        Need help getting started? Check out our{' '}
        <a href="#" className="text-brand-600 underline">documentation</a>
        {' '}or reply to this email.
      </Text>
    </EmailLayout>
  );
}

export default WelcomeEmail;
```

### Critical email styling constraints

React Email handles inline style conversion automatically, but certain CSS features don't work in email clients:

| ❌ Not Supported | ✅ Well Supported |
|-----------------|-------------------|
| Flexbox | Table-based layouts (`<Row>`, `<Column>`) |
| CSS Grid | Inline styles (auto-converted) |
| `rem` units | Pixel-based values |
| Box shadows | Basic padding/margin |
| External stylesheets | Background colors, borders |
| Hover states | Font styling |

Use React Email's `pixelBasedPreset` for Tailwind to ensure compatibility across email clients.

## Phase 3: Clerk email customization (Week 3-4)

### How Clerk email replacement works

Clerk generates authentication tokens (OTPs, magic links) internally. You **cannot create your own tokens**—you must use Clerk's generated values. The integration pattern involves:

1. Disabling "Delivered by Clerk" for specific templates in Dashboard
2. Subscribing to the `email.created` webhook
3. Receiving the token in the webhook payload
4. Sending via Resend with your custom React Email template

### Clerk webhook handler implementation

```typescript
// app/api/webhooks/clerk-email/route.ts
import { verifyWebhook } from '@clerk/nextjs/server';
import { resend } from '@/lib/resend';
import { EmailVerification } from '@/email/templates/auth/email-verification';
import { MagicLinkEmail } from '@/email/templates/auth/magic-link';
import { PasswordResetEmail } from '@/email/templates/auth/password-reset';

export async function POST(request: Request) {
  try {
    const evt = await verifyWebhook(request, {
      signingSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET!,
    });

    switch (evt.type) {
      case 'email.created':
        await handleClerkEmail(evt.data);
        break;
      case 'user.created':
        await handleNewUser(evt.data);
        break;
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return new Response('Webhook verification failed', { status: 400 });
  }
}

async function handleClerkEmail(data: ClerkEmailData) {
  const { to_email_address, slug, data: emailData } = data;
  
  // Route to appropriate template based on email type
  const templateMap: Record<string, () => React.ReactElement> = {
    'verification_code': () => EmailVerification({
      otp: emailData.otp,
      userName: emailData.user_first_name || 'there',
    }),
    'magic_link': () => MagicLinkEmail({
      magicLink: emailData.magic_link,
      userName: emailData.user_first_name || 'there',
    }),
    'reset_password': () => PasswordResetEmail({
      resetLink: emailData.reset_password_link,
      userName: emailData.user_first_name || 'there',
    }),
  };

  const getTemplate = templateMap[slug];
  if (!getTemplate) {
    console.warn(`Unknown email type: ${slug}`);
    return;
  }

  await resend.emails.send({
    from: 'Your App <noreply@mail.yourdomain.com>',
    to: to_email_address,
    subject: getSubjectForSlug(slug),
    react: getTemplate(),
  });
}

function getSubjectForSlug(slug: string): string {
  const subjects: Record<string, string> = {
    'verification_code': 'Verify your email address',
    'magic_link': 'Sign in to your account',
    'reset_password': 'Reset your password',
  };
  return subjects[slug] || 'Notification from Your App';
}
```

### Verification code email template

```tsx
// email/templates/auth/email-verification.tsx
import { Heading, Text, Section } from '@react-email/components';
import { EmailLayout } from '../../components/EmailLayout';

interface EmailVerificationProps {
  otp: string;
  userName: string;
}

export function EmailVerification({ otp, userName }: EmailVerificationProps) {
  return (
    <EmailLayout previewText={`Your verification code is ${otp}`}>
      <Heading className="text-2xl font-bold text-gray-900 mt-0">
        Verify your email
      </Heading>
      
      <Text className="text-gray-600 text-base">
        Hi {userName}, enter this code to verify your email address:
      </Text>
      
      <Section className="bg-gray-50 rounded-lg p-6 my-6 text-center">
        <Text className="text-4xl font-bold text-gray-900 tracking-widest m-0">
          {otp}
        </Text>
      </Section>
      
      <Text className="text-gray-500 text-sm">
        This code expires in 10 minutes. If you didn't request this,
        you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}
```

### Clerk email types: what can be customized

| Email Type | Can Disable Clerk Delivery | Notes |
|------------|---------------------------|-------|
| Verification code | ✅ Yes | OTP in webhook payload |
| Magic link | ✅ Yes | Link URL in payload |
| Password reset | ✅ Yes | Reset link in payload |
| Team invitations | ✅ Yes | Token in payload |
| Organization invitations | ✅ Yes | — |
| Waitlist notifications | ✅ Yes | — |
| SMS OTP | ⚠️ Requires approval | Contact Clerk support |

**Key limitations**: Magic links expire in **10 minutes** (not configurable), and you cannot generate your own authentication tokens.

### Clerk Dashboard configuration steps

1. Navigate to **Customization → Emails**
2. Select each template you want to customize
3. Toggle **OFF** "Delivered by Clerk"
4. Go to **Webhooks** section
5. Add endpoint: `https://yourdomain.com/api/webhooks/clerk-email`
6. Subscribe to `email.created` event
7. Copy signing secret to `CLERK_WEBHOOK_SIGNING_SECRET`

## Phase 4: Inngest queue integration (Week 4-5)

For production reliability, wrap email sending in background jobs with automatic retries:

```typescript
// lib/inngest/client.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({ id: 'email-service' });
```

```typescript
// lib/inngest/functions/send-welcome-email.ts
import { inngest } from '../client';
import { sendEmail } from '@/email/service';
import { WelcomeEmail } from '@/email/templates/auth/welcome';

export const sendWelcomeEmail = inngest.createFunction(
  { 
    id: 'send-welcome-email',
    retries: 3,
  },
  { event: 'user/created' },
  async ({ event, step }) => {
    const { email, firstName } = event.data;
    
    await step.run('send-email', async () => {
      const result = await sendEmail({
        to: email,
        subject: 'Welcome to Your App!',
        template: WelcomeEmail({
          firstName,
          appName: 'Your App',
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        }),
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result;
    });
    
    // Send onboarding sequence after 2 days
    await step.sleep('wait-for-onboarding', '2d');
    
    await step.run('send-onboarding-tips', async () => {
      // Send onboarding tips email
    });
  }
);
```

## Phase 5: Loops marketing integration (Week 5-6)

### Loops SDK setup

```typescript
// lib/loops.ts
import { LoopsClient } from 'loops';

export const loops = new LoopsClient(process.env.LOOPS_API_KEY!);
```

### Syncing Clerk users to Loops

Loops has **native Clerk integration** via webhooks. Configure in Loops Dashboard:

1. Settings → Integrations → Clerk
2. Copy the provided endpoint URL
3. In Clerk Dashboard, add webhook with Loops URL
4. Subscribe to: `user.created`, `user.updated`, `user.deleted`

### Manual contact sync (alternative approach)

```typescript
// lib/loops/sync-user.ts
import { loops } from '@/lib/loops';

export async function syncUserToLoops(user: {
  email: string;
  firstName?: string;
  lastName?: string;
  userId: string;
  plan?: string;
}) {
  const response = await loops.updateContact(user.email, {
    firstName: user.firstName,
    lastName: user.lastName,
    userId: user.userId,
    userGroup: user.plan || 'free',
  });
  
  return response.success;
}

// Trigger onboarding sequence
export async function triggerOnboardingLoop(email: string) {
  await loops.sendEvent({
    email,
    eventName: 'userSignedUp',
  });
}
```

### When to use Loops vs Resend

| Use Loops | Use Resend |
|-----------|------------|
| Newsletter campaigns | Password resets |
| Onboarding drip sequences | Magic links |
| Product announcements | Receipts and invoices |
| Re-engagement campaigns | Real-time notifications |
| Waitlist nurturing | Team invitations |
| Marketing broadcasts | Security alerts |

## Phase 6: Development workflow setup (Week 6-7)

### Package.json scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "email:dev": "email dev --dir src/email/templates --port 3001",
    "email:export": "email export --outDir dist/emails",
    "email:test": "vitest run src/email"
  }
}
```

### Local development workflow

Run both servers simultaneously:
```bash
# Terminal 1: Next.js app
pnpm dev           # http://localhost:3000

# Terminal 2: Email preview
pnpm email:dev     # http://localhost:3001
```

The React Email preview server provides **hot reloading**, mobile previews, HTML source inspection, and the ability to send test emails directly from the interface.

### Testing emails without sending

During development, Resend provides `onboarding@resend.dev` which only sends to your registered email address—no domain verification required.

### Preview component pattern

```tsx
// email/templates/previews/welcome-preview.tsx
import { WelcomeEmail } from '../auth/welcome';

export default function WelcomePreview() {
  return (
    <>
      <h2>Default</h2>
      <WelcomeEmail 
        firstName="John"
        appName="Your App"
        dashboardUrl="https://example.com/dashboard"
      />
      
      <h2>Long Name Edge Case</h2>
      <WelcomeEmail 
        firstName="Alexandrina Victoria"
        appName="Your App"
        dashboardUrl="https://example.com/dashboard"
      />
    </>
  );
}
```

## Complete SaaS email template checklist

### Authentication emails (8 templates)
- [ ] Welcome email
- [ ] Email verification (OTP code)
- [ ] Magic link sign-in
- [ ] Password reset
- [ ] Password changed confirmation
- [ ] Login from new device notification
- [ ] Account locked notification
- [ ] 2FA backup codes

### Team/organization emails (6 templates)
- [ ] Team invitation
- [ ] Invitation accepted
- [ ] Role changed
- [ ] Member removed
- [ ] Ownership transferred
- [ ] Team created

### Billing emails (10 templates)
- [ ] Receipt/invoice
- [ ] Payment failed (dunning email)
- [ ] Payment method expiring
- [ ] Subscription created
- [ ] Subscription upgraded
- [ ] Subscription downgraded
- [ ] Subscription cancelled
- [ ] Trial starting
- [ ] Trial ending (3 days warning)
- [ ] Trial ended

### Notification emails (4 templates)
- [ ] Activity alert
- [ ] Weekly/daily digest
- [ ] Usage limit warning
- [ ] Export ready

**Total: 28 email templates** for comprehensive SaaS coverage.

## Deliverability best practices

### DNS configuration checklist
- [ ] SPF record: `v=spf1 include:resend.com ~all`
- [ ] DKIM record: Public key from Resend dashboard
- [ ] DMARC record: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`
- [ ] Use subdomain: `mail.yourdomain.com` for transactional emails

### Sender reputation maintenance
- Keep **bounce rate under 4%**
- Keep **spam complaint rate under 0.08%**
- Include clear unsubscribe links in marketing emails
- Warm up new sending domains gradually
- Monitor delivery metrics weekly

### Resend rate limits and quotas

| Plan | Daily Limit | Monthly Limit | Custom Domains | Price |
|------|-------------|---------------|----------------|-------|
| Free | 100 | 3,000 | 1 | $0 |
| Pro | Unlimited | 50,000 | 10 | $20/mo |
| Scale | Unlimited | 100,000 | 1,000 | $90/mo |

API rate limit: **2 requests/second** (contact support for higher limits).

## Implementation timeline summary

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **1. Foundation** | Week 1-2 | Resend setup, DNS verification, service abstraction |
| **2. Templates** | Week 2-3 | UntitledUI adaptation, base layout, 10 core templates |
| **3. Clerk Integration** | Week 3-4 | Webhook handler, auth email templates |
| **4. Queue System** | Week 4-5 | Inngest integration, retry logic |
| **5. Loops Setup** | Week 5-6 | Marketing integration, contact sync |
| **6. Dev Workflow** | Week 6-7 | Preview server, testing setup |
| **7. Remaining Templates** | Week 7-8 | Complete 28-template library |
| **8. Testing & Polish** | Week 8-10 | Cross-client testing, deliverability tuning |

**Total estimated timeline: 8-10 weeks** for a production-ready email infrastructure.

## Key technical decisions

**Server Actions vs API Routes**: Use Server Actions for form submissions (simpler, type-safe). Use API Routes for webhooks and external integrations (Clerk webhooks, Stripe events).

**Queue system selection**: Inngest provides the best developer experience for Next.js serverless environments—no infrastructure to manage, automatic retries, and function resumption across deployments.

**Template styling approach**: Use Tailwind via React Email's `<Tailwind>` wrapper with pixel-based values. This maintains consistency with UntitledUI's design system while ensuring email client compatibility.

**Hybrid email strategy**: Consolidating transactional and marketing in a single provider (Loops) simplifies operations but reduces flexibility. The recommended architecture uses specialized tools for each concern: Resend for critical transactional, Loops for marketing automation.
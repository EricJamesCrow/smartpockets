# welcome-onboarding

**Tier:** essential
**Trigger:**
- W4 `exchangePublicTokenAction` on successful first Plaid link fires `dispatchWelcomeOnboarding({ userId, variant: "plaid-linked", firstLinkedInstitutionName })`.
- W7 hourly cron fires `variant: "signup-only"` for users >= 48h post-signup with no Plaid item and no prior welcome send.
**Cadence:** one-time per user; 24h class-level dedup via `idempotencyKey = hash({userId, scope: "welcome-class"})`.
**Payload shape:** per [specs/W7-email.md §6](../../../../specs/W7-email.md) `dispatchWelcomeOnboarding`.
**Preference toggle:** `welcomeOnboardingEnabled` (cosmetic; essential tier bypasses).

---

## Subject

- Variant `plaid-linked`: "You're set up, {{firstName}}. Here is what SmartPockets can do."
- Variant `signup-only`: "Welcome to SmartPockets, {{firstName}}. Connect a bank to get started."

## Preview text (under 90 chars)

- Variant `plaid-linked`: "Your cards from {{firstLinkedInstitutionName}} are syncing. Here is a quick tour."
- Variant `signup-only`: "Link a bank in a few minutes and we will do the rest."

## Body

### Variant `plaid-linked`

Greeting: "Hi {{firstName}},"

Paragraph 1: "Your {{firstLinkedInstitutionName}} account is connected and your cards are syncing. This usually completes in under a minute, then you will see balances, APRs, and statements in your dashboard."

Paragraph 2: "A few things the SmartPockets agent can do for you starting right now:"

Bulleted list (plain markers, no emojis):
- "Show me every Doordash charge this month."
- "Which of my cards has the earliest deferred interest expiration?"
- "What did I spend on groceries last month, by card?"
- "Remind me 30 days before my Citi promo expires."

Paragraph 3: "Just type a question on the home page. The agent will answer with live tables, charts, and cards backed by your actual data."

Paragraph 4: "If you manage more than one bank, connect the rest from Settings > Institutions. SmartPockets is built for people who carry ten or more cards, so the more you link, the more useful the picture."

### Variant `signup-only`

Greeting: "Hi {{firstName}},"

Paragraph 1: "Welcome to SmartPockets. To start using the app, you need to connect at least one bank or credit card account so we have something to track."

Paragraph 2: "Connecting takes about a minute:"

Ordered list:
1. "Click the button below."
2. "Pick your bank in the Plaid dialog."
3. "Sign in with your existing bank credentials."
4. "Come back to SmartPockets and your balances are already loading."

Paragraph 3: "Your credentials never touch our servers. We use Plaid, which brokers the read-only connection, and we store only the access tokens (encrypted at rest)."

Paragraph 4: "When you are set up, the home page becomes an agentic chat surface: ask questions in plain English and get answers as tables, charts, and cards."

## Primary CTA

- Variant `plaid-linked`: "Open SmartPockets" → `https://app.smartpockets.com/`
- Variant `signup-only`: "Connect a bank" → `https://app.smartpockets.com/settings/institutions`

## Secondary CTA (optional)

- Variant `plaid-linked`: "See my cards" → `https://app.smartpockets.com/credit-cards`

## Footer notes

Standard `EmailBrandConfig` footer. No List-Unsubscribe-Post header (essential tier). Include a `mailto:` List-Unsubscribe pointed at `unsubscribe@mail.smartpockets.com` so mail clients that expect the header still see it.

## Props contract

```ts
type WelcomeOnboardingProps = {
  firstName: string;
  variant: "signup-only" | "plaid-linked";
  firstLinkedInstitutionName?: string; // only present when variant === "plaid-linked"
  logoUrl: string;
  appUrl: string;
  theme?: "light" | "dark";
};
```

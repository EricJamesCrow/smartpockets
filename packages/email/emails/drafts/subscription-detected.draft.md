# subscription-detected

**Tier:** non-essential
**Trigger:** W6 subscription detection catch-up scan runs daily. When it identifies newly-confirmed subscriptions for a user, it fires `dispatchSubscriptionDigest` with the array of newly-detected items. One email per user per day maximum.
**Cadence:** per-user-per-day (`dateBucket = YYYY-MM-DD` in idempotency key).
**Payload shape:** per [specs/W7-email.md §6](../../../../specs/W7-email.md) `dispatchSubscriptionDigest`.
**Preference toggle:** `subscriptionDetectedEnabled`.

---

## Subject

- 1 item: "We found a possible subscription: {{merchant}}"
- N items: "{{N}} possible subscriptions detected"

## Preview text (under 90 chars)

- 1 item: "{{merchant}} looks like a recurring charge. Confirm or dismiss in one click."
- N items: "Recurring charges detected across your accounts. Review below."

## Body

Greeting: "Hi {{firstName}},"

Intro paragraph: "Based on recent transactions, the following look like recurring subscriptions. Confirm the ones you want to track so the agent can alert you before renewal, or dismiss the ones you have already cancelled."

### Table: Detected subscriptions

Header row: "Merchant", "Amount", "Frequency"
Body rows: one per detected subscription. Amount is the average of the last three occurrences. Frequency is one of: weekly, biweekly, monthly, quarterly, annual.

Each row includes two action buttons (or text links for email clients that strip buttons):
- "Confirm" → `https://app.smartpockets.com/subscriptions/{{subscriptionId}}?action=confirm`
- "Not a subscription" → `https://app.smartpockets.com/subscriptions/{{subscriptionId}}?action=dismiss`

### Why you are seeing this

Paragraph: "SmartPockets looks for repeating charges from the same merchant, at similar amounts, on a recognizable cadence. When the pattern holds for three or more occurrences, it gets flagged as a possible subscription. We do not mark anything as confirmed until you say so."

### What confirming does

Bulleted list:
- "Groups the recurring charges under one view so you can see total annual cost."
- "Lets the agent remind you before the next charge."
- "Surfaces free-trial end dates when detectable from the merchant pattern."

## Primary CTA

"Review all detections" → `https://app.smartpockets.com/subscriptions?filter=unreviewed`

## Secondary CTA

"Change email preferences" → `{{preferencesUrl}}`

## Footer notes

Standard footer. Include both `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers.

## Props contract

```ts
type SubscriptionDetectedProps = {
  firstName: string;
  detected: Array<{
    subscriptionId: string;
    normalizedMerchant: string;
    averageAmountCents: number;
    frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "annual";
    confirmUrl: string;
    dismissUrl: string;
  }>;
  unsubscribeUrl: string;
  preferencesUrl: string;
  logoUrl: string;
  appUrl: string;
  theme?: "light" | "dark";
};
```

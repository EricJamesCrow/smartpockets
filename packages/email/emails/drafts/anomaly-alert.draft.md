# anomaly-alert

**Tier:** non-essential
**Trigger:** W6 inserts one `emailEvents` row per anomaly (per [specs/00-contracts.md](../../../../specs/00-contracts.md) §9.2). W6 calls `dispatchAnomalyAlert({ userId, anomalyId })` per anomaly. W7's `sendAnomalyAlert` workflow coalesces sibling `pending` rows within a 15-minute window; the first-inserted row becomes the leader and dispatches the email with the full batch.
**Cadence:** per 15-minute batch window.
**Payload shape:** per [specs/W7-email.md §6](../../../../specs/W7-email.md) `dispatchAnomalyAlert` (single anomaly per call; workflow assembles batch internally).
**Preference toggle:** `anomalyAlertEnabled`.

---

## Subject

- 1 anomaly: "Unusual transaction: {{merchantName}} for {{amount}}"
- N anomalies (N > 1): "{{N}} unusual transactions detected"

## Preview text (under 90 chars)

- 1 anomaly: "{{amount}} at {{merchantName}} stands out against recent spending patterns."
- N anomalies: "SmartPockets flagged {{N}} charges that look different from your usual spend."

## Body

Greeting: "Hi {{firstName}},"

Intro paragraph: "We flagged the following transactions because they do not match your usual patterns. These are not necessarily fraud; they are worth a second look."

### Table: Flagged transactions

Header row: "Date", "Merchant", "Amount", "Card"
Body rows: one per anomaly, with a drill-in link to the transaction detail page for each.

### What triggered the flag

Paragraph: "Each flag means the transaction amount is at least three times the average for that merchant or card over the last 90 days, or the merchant is new to your spending history above a threshold."

### What to do next

Bulleted list:
- "If the charge is expected, mark it as reviewed so it does not appear in a future digest."
- "If it is not your charge, contact your card issuer's fraud line directly. SmartPockets does not have the ability to dispute charges on your behalf."
- "If you want to silence similar flags from the same merchant, the agent can set a personal threshold."

## Primary CTA

"Review flagged transactions" → `https://app.smartpockets.com/transactions?filter=anomalies`

## Secondary CTA

"Change email preferences" → `{{preferencesUrl}}`

## Footer notes

Standard footer. Include both `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers.

## Props contract

```ts
type AnomalyAlertProps = {
  firstName: string;
  anomalies: Array<{
    anomalyId: string;
    transactionDate: string;           // "Apr 20"
    merchantName: string;
    amountCents: number;
    cardName: string;
    transactionUrl: string;
  }>;
  unsubscribeUrl: string;
  preferencesUrl: string;
  logoUrl: string;
  appUrl: string;
  theme?: "light" | "dark";
};
```

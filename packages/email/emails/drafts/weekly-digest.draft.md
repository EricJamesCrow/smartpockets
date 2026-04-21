# weekly-digest

**Tier:** non-essential
**Trigger:** W7-owned Sunday 09:00 UTC cron (`internal.email.crons.dispatchWeeklyDigestForAllUsers`) iterates users, assembles payload from W6 tables, fires `dispatchWeeklyDigest`.
**Cadence:** weekly; `dateBucket = YYYY-MM-DD` of the Sunday send.
**Payload shape:** per [specs/W7-email.md §6](../../../../specs/W7-email.md) `dispatchWeeklyDigest`.
**Preference toggle:** `weeklyDigestEnabled`.
**Skip rule:** if all five arrays in the payload are empty (zero signal), do NOT send.

---

## Subject

"Your SmartPockets week, {{weekEndingLabel}}"

(Example: "Your SmartPockets week, ending Sunday April 20")

## Preview text (under 90 chars)

"{{topSpendCategory}} led your spend; {{expiringPromosCount}} promos expire soon."

(Fallback if no spend: "{{upcomingStatementsCount}} statements close this week.")

## Body

Greeting: "Hi {{firstName}},"

Intro line: "Here is what happened across your accounts this past week."

### Section: Top spend by category

Render as a table. Up to five rows. Each row: category name, amount, change vs prior week percentage (green for down, gray for up if context is discretionary).

If `topSpendByCategory.length === 0`, omit the entire section.

### Section: Upcoming statements

Subhead: "Closing this week"

Table of upcoming statements. Each row: card name, closing date, projected balance.

If `upcomingStatements.length === 0`, omit the section.

### Section: Active anomalies

Subhead: "Transactions worth a second look"

Bullet list of anomalies. Each item: merchant name, amount, with a link to the transaction detail page.

Line after: "If any of these are expected, mark them so your digest does not flag them again."

If `activeAnomalies.length === 0`, omit the section.

### Section: Expiring promos

Subhead: "Deferred interest and introductory rates expiring soon"

Table of promos. Each row: card name, balance, expiration date. Sort by earliest expiration.

Line after: "Pay these balances before the expiration date to avoid retroactive interest."

If `expiringPromos.length === 0`, omit the section.

### Section: Expiring trials

Subhead: "Free trials renewing soon"

List of detected subscriptions with an upcoming `renewsOn` date within the next 14 days.

If `expiringTrials.length === 0`, omit the section.

### Closing

Paragraph: "Ask the agent follow-up questions anytime. For example: '{{topSpendCategory}} spend by card last week' or 'which cards have promos expiring in April'."

## Primary CTA

"Open the agent" → `https://app.smartpockets.com/`

## Secondary CTA

"See all my cards" → `https://app.smartpockets.com/credit-cards`

## Footer notes

Standard footer plus preference links (preferences page + unsubscribe). Include both RFC 8058 `List-Unsubscribe` headers.

## Props contract

```ts
type WeeklyDigestProps = {
  firstName: string;
  weekEndingLabel: string;                 // "April 20"
  topSpendByCategory: Array<{ category: string; amountCents: number; changeVsPriorWeekPct: number }>;
  upcomingStatements: Array<{ cardName: string; closingDate: string; projectedBalanceCents: number }>;
  activeAnomalies: Array<{ anomalyId: string; merchantName: string; amountCents: number; transactionUrl: string }>;
  expiringPromos: Array<{ promoId: string; cardName: string; expirationDate: string; balanceCents: number }>;
  expiringTrials: Array<{ merchantName: string; renewsOn: string }>;
  unsubscribeUrl: string;
  preferencesUrl: string;
  logoUrl: string;
  appUrl: string;
  theme?: "light" | "dark";
};
```

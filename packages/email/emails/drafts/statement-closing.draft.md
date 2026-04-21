# statement-closing

**Tier:** non-essential
**Trigger:** W6 daily statement reminder cron identifies cards closing in the next 3 or 1 days. For each `(userId, cadence)` pair, fires `dispatchStatementReminder` once with the array of cards hitting that cadence.
**Cadence:** 3 or 1 days before statement close.
**Payload shape:** per [specs/W7-email.md §6](../../../../specs/W7-email.md) `dispatchStatementReminder`.
**Preference toggle:** `statementReminderEnabled`.
**Consolidation:** one email per user per cadence per day; multiple cards on the same cadence consolidate.

---

## Subject

- cadence 3, 1 card: "{{cardName}} statement closes in 3 days"
- cadence 3, N cards: "{{N}} statements close in the next 3 days"
- cadence 1, 1 card: "{{cardName}} statement closes tomorrow"
- cadence 1, N cards: "{{N}} statements close tomorrow"

## Preview text (under 90 chars)

- cadence 3: "A few days to pay down before closing balances set the statement."
- cadence 1: "Your statement closes in a day. Here is what is on it."

## Body

Greeting: "Hi {{firstName}},"

### Opening paragraph (cadence-specific)

- cadence 3: "Heads up. These statements close in the next three days. Any payment you make before the closing date reduces the statement balance, which lowers reported utilization."
- cadence 1: "These statements close tomorrow. Payments made after the closing date will apply to the next cycle."

### Table: Statements

Header row: "Card", "Closing", "Projected balance", "Minimum due", "Due date"
Body rows: one per card. Projected balance is what the statement will say if no more activity happens.

### Utilization note (always include)

Paragraph: "For credit-reporting purposes, card issuers typically send the statement balance to the credit bureaus. If you want to report a lower utilization, pay down the balance before the closing date."

### Pay-in-full reminder (cadence 1 only)

Paragraph: "If you pay the full statement balance on time each cycle, purchase transactions do not accrue interest. Cash advances and some promotional balances are excluded; see your card agreement for specifics."

## Primary CTA

"See my statements" → `https://app.smartpockets.com/credit-cards`

## Secondary CTA

"Change email preferences" → `{{preferencesUrl}}`

## Footer notes

Standard footer. Include both `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers.

## Props contract

```ts
type StatementClosingProps = {
  firstName: string;
  cadence: 3 | 1;
  cadenceLabel: string;                    // "in 3 days" | "tomorrow"
  statements: Array<{
    cardId: string;
    cardName: string;
    closingDate: string;
    projectedBalanceCents: number;
    minimumDueCents: number;
    dueDate: string;
    cardDetailUrl: string;
  }>;
  unsubscribeUrl: string;
  preferencesUrl: string;
  logoUrl: string;
  appUrl: string;
  theme?: "light" | "dark";
};
```

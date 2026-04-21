# promo-warning

**Tier:** non-essential
**Trigger:** W6 daily promo countdown cron identifies promos crossing the 30 / 14 / 7 / 1 day threshold. For each `(userId, cadence)` pair, W6 calls `dispatchPromoWarning` once with the array of promos hitting that cadence.
**Cadence:** 30 / 14 / 7 / 1 days before expiration, passed as a `cadence` prop.
**Payload shape:** per [specs/W7-email.md §6](../../../../specs/W7-email.md) `dispatchPromoWarning`.
**Preference toggle:** `promoWarningEnabled`.
**Consolidation:** one email per user per cadence per day; if the user has three promos hitting 30-day today, they get one email with all three, not three emails.

---

## Subject

Dynamic based on cadence and count.

- cadence 30, 1 promo: "Your {{cardName}} deferred interest promo expires in 30 days"
- cadence 30, N promos: "{{N}} of your deferred interest promos expire within 30 days"
- cadence 14: "14 days left: {{summaryLine}}"
- cadence 7: "Final week: {{summaryLine}}"
- cadence 1, 1 promo: "Tomorrow: pay {{cardName}} to avoid retroactive interest"
- cadence 1, N promos: "Tomorrow: {{N}} deferred interest promos expire"

Where `summaryLine` = `"{{cardName}} (plus {{N-1}} more)"` for N > 1 else just `"{{cardName}}"`.

## Preview text (under 90 chars)

- cadence 30: "Pay the balance before expiration to avoid a retroactive interest charge."
- cadence 14: "Two weeks left to pay off the deferred interest balance."
- cadence 7: "One week left. Interest will be charged from the original purchase date if unpaid."
- cadence 1: "Pay in full today to avoid interest charges back to the purchase date."

## Body

Greeting: "Hi {{firstName}},"

### Opening paragraph (cadence-specific)

- cadence 30: "You have deferred interest promo balances expiring in the next 30 days. Paying them off before the expiration date avoids the retroactive interest that accrues back to the original purchase dates."
- cadence 14: "Two weeks remain on your deferred interest promo balances. At expiration, any unpaid balance triggers interest back to the purchase date."
- cadence 7: "One week remains. This is a good time to confirm payment is scheduled for the full balance before each expiration."
- cadence 1: "Your deferred interest promos expire tomorrow. Paying the full balance today avoids a retroactive interest charge that accrues back to each purchase date."

### Table: Promos expiring {{cadenceLabel}}

Header row: "Card", "Balance", "Expires"
Body rows: one per promo. Each row includes a drill-in link to the card detail page.

### Action line (cadence-specific)

- cadence 30 / 14: "Open a card to see the exact promo terms and adjust your payment plan."
- cadence 7: "If you cannot pay in full, you may be able to restructure via an installment plan through your card issuer."
- cadence 1: "Pay now via your card issuer's site, or pay in full when your statement closes."

### Context block (always include)

Tip line: "Deferred interest is different from 0 percent APR. If any balance remains after the expiration date, interest is charged as if the promo never happened, from the original purchase date."

Tip line: "SmartPockets tracks expiration dates but does not make payments on your behalf. Payment scheduling happens on your card issuer's site."

## Primary CTA

"See my promos" → `https://app.smartpockets.com/credit-cards?filter=active-promos`

## Secondary CTA

"Change email preferences" → `{{preferencesUrl}}`

## Footer notes

Standard footer. Include both `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers.

## Props contract

```ts
type PromoWarningProps = {
  firstName: string;
  cadence: 30 | 14 | 7 | 1;
  cadenceLabel: string;                  // "in 30 days" | "in 14 days" | "in 7 days" | "tomorrow"
  promos: Array<{
    promoId: string;
    cardName: string;
    expirationDate: string;
    balanceCents: number;
    daysRemaining: number;
    cardDetailUrl: string;
  }>;
  unsubscribeUrl: string;
  preferencesUrl: string;
  logoUrl: string;
  appUrl: string;
  theme?: "light" | "dark";
};
```

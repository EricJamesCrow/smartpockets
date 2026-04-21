# item-error-persistent

**Tier:** essential
**Trigger:** W4 owns a 6-hour cron that scans `plaidItems` where `firstErrorAt` is non-null and `(now - firstErrorAt) >= 24h` and `lastDispatchedAt` is null. Fires `dispatchItemErrorPersistent`.
**Cadence:** max once per item per 24h (enforced by `dateBucket = YYYY-MM-DD` in the idempotency key plus W4's `lastDispatchedAt` field).
**Payload shape:** per [specs/W7-email.md §6](../../../../specs/W7-email.md) `dispatchItemErrorPersistent`.
**Preference toggle:** none (essential tier bypasses).

---

## Subject

"We cannot reach your {{institutionName}} account"

## Preview text (under 90 chars)

"{{institutionName}} has been unreachable for 24 hours. Here is what might be happening."

## Body

Greeting: "Hi {{firstName}},"

Opening paragraph: "We have been unable to sync your {{institutionName}} connection since {{firstErrorAtLabel}}. That is longer than the usual transient hiccup, so this message goes to you rather than sitting silent in the logs."

### What this usually means

Bulleted list:
- "{{institutionName}} might be doing scheduled maintenance."
- "Your bank might have rotated its credentials internally."
- "Plaid's connection to {{institutionName}} could be temporarily degraded."
- "There could be a rate limit or throttling."

### What to try

Ordered list:
1. "Open Settings > Institutions."
2. "Find {{institutionName}} in the list."
3. "Click Refresh. If you see a reconnect prompt, complete it."
4. "If the refresh fails with the same error, wait a few hours and try again."
5. "If the error persists after 48 hours, you may want to remove and re-add the connection."

### Context

Paragraph: "The last successful sync we have on file for {{institutionName}} was {{lastSeenErrorAtLabel}}. Recent transactions from {{institutionName}} may be missing from SmartPockets until this resolves."

Paragraph: "Error code from Plaid: {{errorCode}}. If you contact support and want to share a reference, include that code."

## Primary CTA

"Open Settings > Institutions" → `https://app.smartpockets.com/settings/institutions`

## Secondary CTA

"Email support" → `mailto:support@mail.smartpockets.com?subject=Item%20error%20{{plaidItemId}}`

## Footer notes

Essential-tier footer. No one-click unsubscribe; `mailto:` List-Unsubscribe only.

## Props contract

```ts
type ItemErrorPersistentProps = {
  firstName: string;
  institutionName: string;
  plaidItemId: string;
  firstErrorAtLabel: string;          // "Saturday, April 19"
  lastSeenErrorAtLabel: string;       // "2 hours ago"
  errorCode: string;                  // e.g. "ITEM_LOCKED"
  settingsUrl: string;
  supportMailto: string;
  logoUrl: string;
  appUrl: string;
  theme?: "light" | "dark";
};
```

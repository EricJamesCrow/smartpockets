# reconsent-required

**Tier:** essential
**Trigger:** W4 Plaid webhook handler. On `ITEM:LOGIN_REQUIRED` or `ITEM:PENDING_EXPIRATION`, fires `dispatchReconsentRequired({ userId, plaidItemId, institutionName, reason })`.
**Cadence:** immediate on webhook receipt. `dateBucket = YYYY-MM-DD` prevents more than one send per item per day.
**Payload shape:** per [specs/W7-email.md §6](../../../../specs/W7-email.md) `dispatchReconsentRequired`.
**Preference toggle:** none (essential tier bypasses).

---

## Subject

- reason `ITEM_LOGIN_REQUIRED`: "Action needed: reconnect your {{institutionName}} account"
- reason `PENDING_EXPIRATION`: "{{institutionName}} will disconnect soon"

## Preview text (under 90 chars)

- reason `ITEM_LOGIN_REQUIRED`: "Your bank requires a fresh sign-in before we can sync transactions."
- reason `PENDING_EXPIRATION`: "Reconfirm access so your balances and transactions keep syncing."

## Body

Greeting: "Hi {{firstName}},"

### Opening paragraph (reason-specific)

- reason `ITEM_LOGIN_REQUIRED`: "Your {{institutionName}} connection needs a fresh sign-in. This happens when a bank rotates credentials, changes their security policy, or sees an unusual pattern. Until you reconnect, SmartPockets cannot sync new balances, statements, or transactions from {{institutionName}}."
- reason `PENDING_EXPIRATION`: "Your {{institutionName}} connection will expire soon. Banks periodically require you to reauthorize third-party access. If you do not reauthorize, SmartPockets will stop syncing {{institutionName}} data after the expiration date."

### What happens next

Bulleted list:
- "Click the button below to open Settings > Institutions."
- "Find {{institutionName}} in the list."
- "Click Reconnect and sign in with your {{institutionName}} credentials."
- "Balances resume syncing immediately after the reconnect completes."

### Security note

Paragraph: "Your credentials do not pass through SmartPockets. Plaid brokers the read-only connection. SmartPockets only stores the encrypted access token."

## Primary CTA

"Reconnect {{institutionName}}" → `https://app.smartpockets.com/settings/institutions?reconnect={{plaidItemId}}`

## Secondary CTA

"Open Settings" → `https://app.smartpockets.com/settings/institutions`

## Footer notes

Essential-tier footer: standard brand footer but no one-click unsubscribe. Include only the `mailto:` `List-Unsubscribe` header; omit `List-Unsubscribe-Post`. Users can silence non-essential email via preferences; reconnect prompts are required for the app to function.

## Props contract

```ts
type ReconsentRequiredProps = {
  firstName: string;
  institutionName: string;
  plaidItemId: string;
  reason: "ITEM_LOGIN_REQUIRED" | "PENDING_EXPIRATION";
  reconnectUrl: string;
  settingsUrl: string;
  logoUrl: string;
  appUrl: string;
  theme?: "light" | "dark";
};
```

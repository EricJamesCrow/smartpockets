# Plaid webhook fixtures

Each `.json` file in this directory represents a recorded or constructed Plaid webhook.

## File format

```json
{
  "body": { "webhook_type": "...", "webhook_code": "...", "item_id": "...", "error": null },
  "jwt": "eyJ...",
  "bypassSignature": false
}
```

- `body`: the Plaid webhook body as sent to `/webhooks-plaid`.
- `jwt`: a pre-computed ES256 JWT string or `null` if `bypassSignature` is true.
- `bypassSignature`: when true, the test invokes the handler with `shouldSkipVerification()` engaged (matches sandbox-mode behavior at http.ts).

## Naming convention

`{webhook_type}_{webhook_code}.json` in lowercase, for example:
`transactions_default_update.json`, `item_login_repaired.json`.

# Money Unit Contract

This contract is the current compatibility boundary for CROWDEV-251 and
CROWDEV-267. It intentionally does not migrate existing native rows.

## Current Units

Plaid component persisted money is stored as integer milliunits:

- `plaidAccounts.balances.current`, `available`, and `limit`
- `plaidTransactions.amount`
- `plaidCreditCardLiabilities` top-level money such as `lastPaymentAmount`,
  `lastStatementBalance`, and `minimumPaymentAmount`
- `plaidCreditCardLiabilities.aprs[].balanceSubjectToApr` and
  `interestChargeAmount`

`aprPercentage` fields are percentages, not money.

Native `creditCards` top-level balance and payment fields remain display
dollars until an audited migration changes them:

- `currentBalance`, `availableCredit`, `creditLimit`
- `lastPaymentAmount`, `lastStatementBalance`, `minimumPaymentAmount`

Native `creditCards.aprs[]` and `userOverrides.aprs[]` money fields currently
mirror the Plaid component and remain milliunits. Existing native statement,
promo, installment, anomaly, subscription, and cashflow tables use their
documented display-dollar fields until separately migrated.

Email payloads must use explicit unit suffixes. Statement reminder templates
accept `projectedBalanceCents` and `minimumDueCents`, so the statement scan
converts native display dollars to cents before dispatch.

## Forward Rule

New persisted financial amount fields should be milliunits by default. If a new
field cannot use milliunits, its name must include an explicit unit suffix such
as `Dollars`, `Cents`, or `Microcents`, and the caller boundary must document the
conversion.

Formatting must match the source unit:

- Use `formatMoneyFromMilliunits` for Plaid component account, transaction, and
  nested liability/APR money.
- Use `formatMoneyFromDollars` for native `creditCards` top-level display-dollar
  fields.
- Use `formatMoneyFromCents` for explicit cents payloads, including React Email
  statement reminder props.

The regression value for this layer is `$8,005.64`. It must not render as
`$8,005,640.00`.

## Deterministic Smoke Fixture

The local-only fixture lives at
`packages/backend/convex/__tests__/fixtures/money-unit-contract/demo-smoke.json`.
It uses synthetic IDs and fixed dates around April and May 2026. The fixture is
safe for unit tests and local demo seeds only.

Guardrails for any seeded/demo smoke that consumes this fixture:

- Use `convex-test`, an unset `CONVEX_DEPLOYMENT`, or a `dev:*` Convex
  deployment. Never seed a `prod:*` deployment.
- Use synthetic Clerk IDs or Clerk development keys only. Do not create or
  mutate production Clerk users.
- Use constructed Plaid sandbox-shaped rows only. Do not store real Plaid access
  tokens or connect real bank credentials.
- Do not trigger Clerk Billing, payment attempts, or production email sends.
- Keep the expected rendered balance as `$8,005.64` in screenshots or smoke
  assertions.

Targeted verification:

```bash
cd packages/backend
bun run test -- convex/__tests__/money.test.ts convex/__tests__/moneyUnitContract.test.ts
```

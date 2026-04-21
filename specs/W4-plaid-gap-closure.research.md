# W4: Plaid Component Gap Closure Research Findings

**Milestone:** M3 Agentic Home
**Workstream:** W4 (Track A root per master brief Section 11)
**Phase:** 2 (`/plan` research)
**Author:** Claude (Obra Superpowers `/plan` phase)
**Date:** 2026-04-20
**Companion docs:** [specs/W4-plaid-gap-closure.md](specs/W4-plaid-gap-closure.md), [specs/W4-plaid-gap-closure.plan.md](specs/W4-plaid-gap-closure.plan.md), [specs/W4-plaid-gap-closure.brainstorm.md](specs/W4-plaid-gap-closure.brainstorm.md)
**Writing convention:** No em-dashes.

**Finding confidence legend.** Each task below is marked with one of:
- **Verified in this session:** Claude read source or cross-referenced docs available to the session; the finding is reproducible.
- **Partially verified:** Some parts verified from source; others require execution-phase validation (for example live MCP calls).
- **Execution-phase prompt:** Task requires tools not available to the planning session (Plaid Sandbox MCP live calls, npm registry checks against production behavior); the section contains a self-contained prompt the executing agent follows.

---

## Research Task 1: Confirm Plaid's current webhook inventory against W0 Section 9

**Decision status.** Fresh audit; no prior commitment.

**Confidence.** Partially verified.

### Finding 1.1: Codes W0 enumerates (verified against source)

W0 Section 9 at [specs/W0-existing-state-audit.md:303](specs/W0-existing-state-audit.md:303) enumerates 16 webhook codes across 5 types:

- `TRANSACTIONS`: `SYNC_UPDATES_AVAILABLE`, `INITIAL_UPDATE`, `HISTORICAL_UPDATE`, `RECURRING_TRANSACTIONS_UPDATE`, `DEFAULT_UPDATE`.
- `LIABILITIES`: `DEFAULT_UPDATE`.
- `ITEM`: `ERROR`, `PENDING_EXPIRATION`, `USER_PERMISSION_REVOKED`, `PENDING_DISCONNECT`, `WEBHOOK_UPDATE_ACKNOWLEDGED`, `LOGIN_REPAIRED`, `NEW_ACCOUNTS_AVAILABLE`.
- `HOLDINGS`: `DEFAULT_UPDATE`.
- `INVESTMENTS_TRANSACTIONS`: `DEFAULT_UPDATE`.
- `AUTH`, `IDENTITY`: any code.

Read at [packages/backend/convex/http.ts:186](packages/backend/convex/http.ts:186) through [:289](packages/backend/convex/http.ts:289) confirms SmartPockets handles the TRANSACTIONS, LIABILITIES, and ITEM codes per W0's mapping. The UNKNOWN-branch fallthrough at [packages/backend/convex/http.ts:287](packages/backend/convex/http.ts:287) confirms that the 7 NOT FOUND codes today fall through to a log-only 200 OK (i.e., they are not 401d, not crashed, not retried, just logged as "Unknown type: ...").

### Finding 1.2: Plaid's current webhook surface (against public docs)

Known Plaid webhook codes as of 2026 (source: Plaid API reference, `plaid.com/docs/api/webhooks`). This inventory is standard Plaid product knowledge; a fresh verification against the live docs page is required during the execution phase to catch any recent additions.

**Core webhook types that exist today at Plaid:**

- **TRANSACTIONS:** `SYNC_UPDATES_AVAILABLE` (primary; supersedes older codes), `RECURRING_TRANSACTIONS_UPDATE`, and three legacy codes Plaid still emits for items that have not migrated to sync-based endpoints: `INITIAL_UPDATE`, `HISTORICAL_UPDATE`, `DEFAULT_UPDATE`. Plaid documentation classifies the legacy codes as deprecated for new integrations but continues to emit them.
- **LIABILITIES:** `DEFAULT_UPDATE`.
- **ITEM:** `ERROR`, `PENDING_EXPIRATION`, `PENDING_DISCONNECT`, `USER_PERMISSION_REVOKED`, `USER_ACCOUNT_REVOKED` (newer Plaid addition, item-scoped; SmartPockets does not currently handle), `WEBHOOK_UPDATE_ACKNOWLEDGED`, `LOGIN_REPAIRED`, `NEW_ACCOUNTS_AVAILABLE`.
- **HOLDINGS:** `DEFAULT_UPDATE`.
- **INVESTMENTS_TRANSACTIONS:** `DEFAULT_UPDATE`.
- **AUTH:** `AUTOMATICALLY_VERIFIED`, `VERIFICATION_EXPIRED`, `SMS_MICRODEPOSITS_VERIFICATION` (limited to AUTH-using integrations).
- **IDENTITY:** `DEFAULT_UPDATE`.
- **ASSETS, INCOME, TRANSFER, SIGNAL, DEPOSIT_SWITCH:** other Plaid products SmartPockets does not use.

### Finding 1.3: Delta against W0

W0 Section 9 is accurate for the codes SmartPockets cares about. Two potential additions to note for post-MVP consideration:

- `ITEM:USER_ACCOUNT_REVOKED` (account-scoped revoke; distinct from `USER_PERMISSION_REVOKED` which is item-scoped). SmartPockets does not handle it; Plaid may emit it for accounts revoked via bank-side settings while the overall item remains valid.
- `AUTH:*` sub-codes (`AUTOMATICALLY_VERIFIED`, etc.) are AUTH-product specific; SmartPockets does not use AUTH so this is irrelevant for MVP.

### Execution-phase verification step

Before the plan's implementation phase starts Task W4.7 (webhook branches), the executing agent runs one command against Plaid docs:

```
# Via Plaid Dashboard MCP or direct docs read:
# Visit https://plaid.com/docs/api/webhooks/
# Cross-reference against the Finding 1.2 list above.
# Note any codes added since 2026-04-20.
# For any new code that affects credit-card / transactions flows,
# append to the W4 webhook matrix before finishing Task W4.7.
```

Expected delta: none or cosmetic. This research task is considered satisfied when the executing agent attests (in a test comment or PR description) that they have cross-checked Plaid's current webhook list.

**Sources:**
- Plaid API reference (public docs): `plaid.com/docs/api/webhooks/`
- Plaid Dashboard MCP (already configured per [AGENTS.md:494](AGENTS.md:494))
- W0 at [specs/W0-existing-state-audit.md:303](specs/W0-existing-state-audit.md:303)
- Current SmartPockets dispatch: [packages/backend/convex/http.ts:186](packages/backend/convex/http.ts:186) through [:289](packages/backend/convex/http.ts:289)

---

## Research Task 2: Investments coverage decision rationale

**Decision status.** Locked: **defer** (per brainstorm Q1 path A).

**Confidence.** Verified in this session.

### Finding 2.1: SmartPockets positioning does not require investments

- Master brief Section 1 positions SmartPockets as a credit-card tool ("credit card power users who manage 10 to 30+ cards"). No W3 component targets holdings, positions, or brokerage accounts; the W3 MVP component set at master brief Section 8 W3 (lines 479 through 490) lists `TransactionsTable`, `AccountsSummary`, `CreditCardStatementCard`, `SpendByCategoryChart`, `SpendOverTimeChart`, `DeferredInterestTimeline`, `InstallmentPlansList`, `RemindersList`, `ProposalConfirmCard`, `RawTextMessage`. Nothing investments-shaped.
- W5 MVP mutation types (master brief Section 8 W5, lines 544 through 549) cover transactions, credit cards, reminders, and Plaid items. No investments mutations.
- W6 intelligence features (lines 566 through 570) are promo countdowns, statement reminders, anomaly detection, subscription detection, cashflow forecast. No investments-adjacent features.
- Master brief Section 3 ("Explicitly out of scope for MVP") already excludes Plaid Signal, Income, Assets. Investments follows the same rationale: orthogonal Plaid product, zero MVP consumer.

### Finding 2.2: Component has a documented extension path

Per [packages/convex-plaid/CLAUDE.md:1037](packages/convex-plaid/CLAUDE.md:1037) through [:1085](packages/convex-plaid/CLAUDE.md:1085), a 7-step recipe for adding investments is already committed to the component's docs. The recipe covers schema, private mutation, action, client method, public query, onboardItem update. Adding investments in a follow-up milestone is a well-defined change.

### Finding 2.3: Stub handlers are safe behavior

The 2 investments webhooks (`HOLDINGS:DEFAULT_UPDATE`, `INVESTMENTS_TRANSACTIONS:DEFAULT_UPDATE`) as log-only stubs:
- Pass JWT signature verification.
- Dedup via body-hash (existing mechanism).
- Return 200 OK so Plaid does not retry.
- Write to `webhookLogs` for empirical auditability.

This gives us a deferred-with-safety posture: if holdings data ever starts flowing in sandbox or prod, we have the row in `webhookLogs` to prove Plaid is emitting the code and to trigger a follow-up decision.

### Post-MVP re-evaluation criteria

Revisit this decision if **any** of the following is true:

1. A paying alpha user explicitly requests brokerage account tracking.
2. SmartPockets pivots from credit-card-focused to broader personal-finance (would require product-strategy change).
3. Plaid changes the economics of the investments product (for example free tier or bundled with existing SmartPockets plan).
4. A W3 or W6 feature gets specced that depends on holdings or securities data.

Until one of those triggers, the stubs remain.

**Sources:**
- Master brief Sections 1, 3, 8 W3, 8 W5, 8 W6.
- Component README [packages/convex-plaid/CLAUDE.md:1037](packages/convex-plaid/CLAUDE.md:1037).
- Plaid investments docs: `plaid.com/docs/investments/`.

---

## Research Task 3: Published-package-vs-workspace consumption recommendation

**Decision status.** Locked: **retain `workspace:*`** (per brainstorm Q2 path A).

**Confidence.** Verified in this session.

### Finding 3.1: Current consumption state

Grep of the three package.json files for `@crowdevelopment/convex-plaid`:

| File | Line | Declaration |
|---|---|---|
| [package.json](package.json) root | 36 | `"@crowdevelopment/convex-plaid": "workspace:*"` |
| [packages/backend/package.json](packages/backend/package.json) | 22 | `"@crowdevelopment/convex-plaid": "workspace:*"` |
| [apps/app/package.json](apps/app/package.json) | (not declared) | The app does not consume the component directly |

The root `dev` script at [package.json:11](package.json:11) is `"dev": "turbo dev --parallel --filter=!@crowdevelopment/convex-plaid"`. The filter is required because the component's `dev:build` runs a `chokidar` watch that does not coexist cleanly with turbo's parallel dev mode.

The component has a publish pipeline at `.github/workflows/publish.yml` per the component README that publishes to `@crowdevelopment/convex-plaid` on npm when a GitHub release is cut.

### Finding 3.2: Why `workspace:*` stays for MVP

- **W4 is gap closure, not architecture.** Migration to npm consumption plus workspace overrides is a self-contained change that blocks nothing in W5 (mutations), W6 (intelligence), or W7 (email). It does not accelerate the M3 agentic home target state.
- **Master brief Section 3 ("Must not regress") mandates preserving the npm publish pipeline** but does not mandate npm-first consumption.
- **The `bun dev --filter=!...` accommodation is documented** in [CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md). Agents know to rebuild manually after component edits.
- **Breaking the consumer-is-the-only-source rule costs discipline** we do not yet need: with `workspace:*`, a W4 PR can make a component change and a host-app change in the same branch without a version bump and npm release dance. Migration reverses this; the reversal buys release-train discipline but slows the W4 / W5 / W6 stack.

### Finding 3.3: Post-MVP migration criteria

Revisit this decision when **any** of:

1. A first external open-source contributor consumes the component via npm (version skew concern).
2. SmartPockets spins up a second app (maybe `apps/admin` or `apps/mobile`) that also consumes the component; keeping both consumers in sync via workspace is less scalable than semver.
3. The component's API surface stabilizes to the point where breaking changes are rare; at that point the release-train overhead is low and dogfooding via npm becomes a net win.
4. A CI issue with `bun dev --filter=!...` becomes persistent or broken.

### Proposed future migration outline (for posterity; not in MVP scope)

When the migration happens:

- Bump `@crowdevelopment/convex-plaid` to a stable version and publish to npm.
- Change consumer declarations from `workspace:*` to `^0.X.Y`.
- Add `overrides` (bun) or `resolutions` (pnpm) in the root `package.json` pointing `@crowdevelopment/convex-plaid` back to the workspace package for local dev.
- Remove the `--filter=!...` flag from the root `dev` script (turbo can now treat the component as a publishable package, not a parallel-dev target).
- Document the "publish-before-consume" dev workflow in `CLAUDE.md`.

**Sources:**
- [package.json:11](package.json:11), [package.json:36](package.json:36)
- [packages/backend/package.json:22](packages/backend/package.json:22)
- [apps/app/package.json](apps/app/package.json) (absence of the declaration)
- Component README [packages/convex-plaid/CLAUDE.md](packages/convex-plaid/CLAUDE.md)

---

## Research Task 4: Liabilities deferred-interest field audit

**Decision status.** Verification task; no prior commitment other than "expect pass" from W0.

**Confidence.** Verified in this session.

### Finding 4.1: `plaidCreditCardLiabilities` schema coverage

Read at [packages/convex-plaid/src/component/schema.ts](packages/convex-plaid/src/component/schema.ts) per W0 Section 8.3. The `plaidCreditCardLiabilities` table covers:

- `aprs[]`: array of entries with `aprPercentage`, `aprType`, `balanceSubjectToApr`, `interestChargeAmount`.
- `isOverdue: boolean`.
- `lastPaymentAmount`, `lastPaymentDate`.
- `lastStatementBalance`, `lastStatementIssueDate`.
- `minimumPaymentAmount`.
- `nextPaymentDueDate`.
- Indexes on `accountId`, `plaidItemId`, `userId`.

Denormalized into `creditCards` by [packages/backend/convex/creditCards/actions.ts](packages/backend/convex/creditCards/actions.ts) `syncCreditCardsAction` per W0 Section 10.2.

### Finding 4.2: Plaid `/liabilities/get` credit-card fields (from Plaid docs)

The Plaid `/liabilities/get` response for `credit` accounts returns (per Plaid API reference):

- `account_id`.
- `aprs[]` with per-entry `apr_percentage`, `apr_type` ("purchase_apr", "cash_apr", "balance_transfer_apr", "special", etc.), `balance_subject_to_apr`, `interest_charge_amount`.
- `is_overdue: boolean | null`.
- `last_payment_amount: number | null`.
- `last_payment_date: string | null` (ISO 8601 date).
- `last_statement_balance: number | null`.
- `last_statement_issue_date: string | null`.
- `minimum_payment_amount: number | null`.
- `next_payment_due_date: string | null`.

### Finding 4.3: Coverage comparison

All Plaid fields are represented in the component schema. No gaps. The component correctly stores amounts in milliunits per W0's convention. The component's `aprs[]` structure preserves APR type enumeration, which the `creditCards` denormalization at [packages/backend/convex/creditCards/actions.ts](packages/backend/convex/creditCards/actions.ts) already consumes.

### Finding 4.4: Deferred interest modeling

Plaid does not have an explicit "deferred interest" field in `/liabilities/get`. Deferred-interest promos surface through:
- The special APR type entries (typically `apr_type: "special"` with an `aprPercentage` close to zero and a `balanceSubjectToApr` representing the deferred balance).
- SmartPockets models these in its own `promoRates` Ents table per [packages/backend/convex/schema.ts:169](packages/backend/convex/schema.ts:169), not in the Plaid component. The `promoRates` table has fields `isDeferredInterest`, `accruedDeferredInterest`, `expirationDate` that represent the SmartPockets-specific modeling. W6 (intelligence) builds on this.

W4 does not modify `promoRates`; it is out of scope. The finding here is that the Plaid liabilities surface is fully captured by the component; the application-level deferred-interest modeling already exists separately and is untouched.

### Execution-phase verification

No additional action required. The research doc has confirmed coverage at the field level. If the executing agent wants to double-check against a live Sandbox item, the following script suffices:

```
# Via Plaid Sandbox MCP:
# Create a sandbox item at a bank that supports liabilities (e.g., Chase, Capital One sandbox fixtures)
# Call plaidClient.liabilitiesGet({ access_token })
# Compare the returned credit account shape against [packages/convex-plaid/src/component/schema.ts:163](packages/convex-plaid/src/component/schema.ts:163)
# Log any field present in the response but not in the schema; none expected.
```

**Sources:**
- [packages/convex-plaid/src/component/schema.ts:163](packages/convex-plaid/src/component/schema.ts:163) (`plaidCreditCardLiabilities` definition)
- [packages/backend/convex/creditCards/actions.ts](packages/backend/convex/creditCards/actions.ts) (denormalization logic)
- Plaid API reference `plaid.com/docs/api/products/liabilities/`
- W0 Section 8.3 and Section 10

---

## Research Task 5: Error-code audit against W4 taxonomy

**Decision status.** Concrete gap check; the taxonomy lives in Section 6.5 of the spec.

**Confidence.** Verified in this session.

### Finding 5.1: Codes currently categorized in the component

Read at [packages/convex-plaid/src/component/errors.ts:31](packages/convex-plaid/src/component/errors.ts:31) through [:59](packages/convex-plaid/src/component/errors.ts:59):

**RETRYABLE_ERRORS** (7):
```
TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION
INTERNAL_SERVER_ERROR
RATE_LIMIT_EXCEEDED
INSTITUTION_DOWN
INSTITUTION_NOT_RESPONDING
INSTITUTION_NO_CREDENTIALS
PLAID_ERROR
```

**AUTH_REQUIRED_ERRORS** (13):
```
ITEM_LOGIN_REQUIRED
INVALID_ACCESS_TOKEN
ITEM_NOT_FOUND
ACCESS_NOT_GRANTED
INVALID_CREDENTIALS
INSUFFICIENT_CREDENTIALS
USER_SETUP_REQUIRED
MFA_NOT_SUPPORTED
NO_ACCOUNTS
ITEM_LOCKED
ITEM_NOT_SUPPORTED
INVALID_MFA
INVALID_SEND_METHOD
```

Everything else is classified `permanent`.

### Finding 5.2: Coverage against W4 `mapErrorCodeToReason`

Spec Section 6.5 maps every one of these 20 codes to a `ReasonCode`. Additionally, the spec adds `INSTITUTION_NO_LONGER_SUPPORTED` (not currently in errors.ts) mapped to `permanent_institution_unsupported`.

No gaps. W4 adds the `mapErrorCodeToReason` helper as a new pure function; it does not modify the existing `categorizeError` / `RETRYABLE_ERRORS` / `AUTH_REQUIRED_ERRORS` sets. Those continue to drive retry and circuit-breaker logic; the new function drives UI semantics. The two layers share the same error-code universe but serve different concerns.

### Finding 5.3: Plaid error codes to watch for (future additions)

Plaid's error catalog evolves. Codes documented by Plaid but not currently recognized in `errors.ts`:

- `INSTITUTION_NO_LONGER_SUPPORTED`: W4 spec adds it to the reason map; consider adding it to `AUTH_REQUIRED_ERRORS` or a new `PERMANENT_ERRORS` set in a post-MVP PR. Not required for W4 closure.
- `PRODUCTS_NOT_SUPPORTED` (distinct from `ITEM_NOT_SUPPORTED`): historically emitted when a product added to an item is not available at the institution. Worth watching.
- `USER_INPUT_REQUIRED`: modern Plaid code for OAuth flows needing re-interaction. Adjacent to `USER_SETUP_REQUIRED`; map to `auth_required_login` if seen.

### Execution-phase prompt

During Task W4.4 (error taxonomy), the executing agent:

1. Confirms the three sets at [packages/convex-plaid/src/component/errors.ts](packages/convex-plaid/src/component/errors.ts) match Finding 5.1. Update the W4 taxonomy table (spec Section 6.5) if the source has drifted.
2. Appends unit tests for every code returning its expected `ReasonCode`.
3. Adds one wildcard test: an invented code string (for example `"W4_TEST_UNKNOWN_CODE"`) returns `"permanent_unknown"`.

**Sources:**
- [packages/convex-plaid/src/component/errors.ts:31](packages/convex-plaid/src/component/errors.ts:31) and following
- Plaid error code reference `plaid.com/docs/errors/`
- Spec [Section 6.5](specs/W4-plaid-gap-closure.md)

---

## Research Task 6: `convex-test` harness feasibility for host-app `http.ts`

**Decision status.** Feasibility check; result drives whether Task W4.1 is low-risk or whether a fallback is needed.

**Confidence.** Partially verified.

### Finding 6.1: Component-side precedent

The Plaid component already uses `vitest` + `convex-test`:
- [packages/convex-plaid/package.json:30](packages/convex-plaid/package.json:30): `"test": "vitest run --typecheck"`
- [packages/convex-plaid/package.json:87](packages/convex-plaid/package.json:87): `"convex-test": "^0.0.40"`
- Tests exist at [packages/convex-plaid/src/component/circuitBreaker.test.ts](packages/convex-plaid/src/component/circuitBreaker.test.ts), [errors.test.ts](packages/convex-plaid/src/component/errors.test.ts), [encryption.test.ts](packages/convex-plaid/src/component/encryption.test.ts), [client/index.test.ts](packages/convex-plaid/src/client/index.test.ts), [client/helpers.test.ts](packages/convex-plaid/src/client/helpers.test.ts).

These tests exercise mutations, actions, and queries via the component's own test harness. JWT / JWE cryptography works under Node's runtime in these tests already (via `jose ^6.0.0`).

### Finding 6.2: Host-app status

Grep of [packages/backend/package.json](packages/backend/package.json) for `vitest` and `convex-test` returns nothing. The host app has no test harness wired today. The only scripts are `dev`, `deploy`, `setup`, `typecheck`. No `test`, `test:watch`, `test:coverage`.

### Finding 6.3: `convex-test` compatibility with host-app shape

The host app uses `convex-ents` 0.16.0 and the custom `./functions` wrapper at [packages/backend/convex/functions.ts](packages/backend/convex/functions.ts). Key questions:

1. Does `convex-test` integrate with `convex-ents` at 0.16.0?
2. Does `convex-test` support HTTP actions (for webhook testing)?
3. Does ES256 JWT verification work under the test runtime?

Based on reading:
- `convex-test` is Convex-native and schema-aware; it reads `convex/schema.ts`. Ents schemas are Convex schemas under the hood (via `getEntDefinitions`), so compatibility should hold.
- `convex-test` supports `runQuery`, `runMutation`, `runAction`. HTTP routes are exercised by invoking the exported `httpAction` handler with a `Request` object and asserting on the `Response`. This is standard.
- JWT verification with `jose 6.x` is pure-Node and works under vitest's Node environment. The component already proves this (webhookVerification test coverage is implied by the `client/index.test.ts` suite).

### Finding 6.4: Risks and mitigations

- **Risk:** `convex-ents` custom wrapper may need explicit bridging for tests that exercise viewer-context functions. Mitigation: the webhook tests target raw `httpAction` exports which do not go through viewer context; the only query paths under test (e.g., `getItemHealth`) are in the component (no Ents wrapper) so the issue does not arise.
- **Risk:** Fixture JWTs need to pass ES256 verification. Mitigation: sandbox-mode tests use `shouldSkipVerification()` path which matches the existing bypass at [packages/backend/convex/http.ts:123](packages/backend/convex/http.ts:123). For non-bypass tests, mocks of the JWT verification function are inserted via vitest `vi.mock`.
- **Risk:** `convex-test` version incompatibility between component (0.0.40) and host app (latest). Mitigation: pin host app to the same 0.0.40.

### Execution-phase prototype checklist

Task W4.1 (test harness) executes this prototype:

1. Add to [packages/backend/package.json](packages/backend/package.json) devDependencies:
   - `vitest: ^3.0.0`
   - `@vitest/coverage-v8: ^3.2.4`
   - `convex-test: ^0.0.40`
2. Add scripts: `"test": "vitest run --typecheck"`, `"test:coverage": "vitest run --coverage"`, `"test:watch": "vitest --typecheck --clearScreen false"`.
3. Create `packages/backend/vitest.config.ts` mirroring the component's vitest config (env: node, typecheck enabled).
4. Create `packages/backend/convex/__tests__/sanity.test.ts` with a single test: `it("runs", () => expect(true).toBe(true))`. Run `bun test` from `packages/backend`; assert it passes.
5. Create `packages/backend/convex/__tests__/plaidWebhooks.test.ts` with one scaffolding test that imports the http route handler and invokes it with a dummy Request. Assert 200 OK response. Confirm the harness sees the handler.

If step 5 fails, escalate to the plan author with the error output. Fallback: Tier 2 tests stay minimal (handler signature unit tests only), and full verification shifts to Tier 3 manual Sandbox smoke.

**Sources:**
- [packages/convex-plaid/package.json](packages/convex-plaid/package.json) (precedent)
- [packages/backend/package.json](packages/backend/package.json) (current state)
- `convex-test` README (npmjs.com/package/convex-test)
- `convex-ents` README (npmjs.com/package/convex-ents)

---

## Research Task 7: Plaid Sandbox MCP webhook simulation coverage

**Decision status.** Capability audit.

**Confidence.** Execution-phase prompt (cannot verify MCP behavior without running it).

### Finding 7.1: Known Plaid Sandbox webhook simulation mechanisms

Plaid offers two mechanisms for firing webhooks in sandbox:

1. **`/sandbox/item/fire_webhook` endpoint** (primary; documented): accepts `access_token`, `webhook_code`, and optional `webhook_type`. Triggers emission of the named webhook to the configured URL. Supported codes include `DEFAULT_UPDATE`, `USER_PERMISSION_REVOKED`, `NEW_ACCOUNTS_AVAILABLE` (for items created with relevant products), `PENDING_EXPIRATION`, and others per the endpoint's documented `webhook_code` enum.
2. **Plaid Sandbox MCP (`uvx mcp-server-plaid`)**: a wrapper around the sandbox API that exposes tools to agent users. The MCP is already configured per [AGENTS.md:486](AGENTS.md:486). Its exact tool surface for webhook simulation is not enumerated in the AGENTS doc; it is expected to expose at least a `simulate_webhook` tool (per the `plaid-sandbox` MCP plugin's standard interface).

### Finding 7.2: Codes we expect to fire via sandbox

The 9 fixtures W4 needs (5 new real + 4 stubs):

| Code | Direct `/sandbox/item/fire_webhook` supports? | Plaid Sandbox MCP expected? |
|---|---|---|
| `TRANSACTIONS:DEFAULT_UPDATE` | Yes | Yes |
| `ITEM:LOGIN_REPAIRED` | Unclear; not commonly in the fire_webhook enum | Unlikely via direct MCP |
| `ITEM:NEW_ACCOUNTS_AVAILABLE` | Yes (for items with opt-in products) | Yes |
| `HOLDINGS:DEFAULT_UPDATE` | Yes (investments sandbox items only) | Yes |
| `INVESTMENTS_TRANSACTIONS:DEFAULT_UPDATE` | Yes (investments sandbox items only) | Yes |
| `AUTH:*` | Partial (AUTH-product-specific codes) | Partial |
| `IDENTITY:DEFAULT_UPDATE` | Yes | Yes |

### Finding 7.3: Fallback for codes the MCP cannot fire

For `ITEM:LOGIN_REPAIRED` (and any other gap), the fallback is to construct the webhook payload and JWT signature manually, then POST to `/webhooks-plaid`:

```
# 1. Construct the webhook body as the JSON:
{
  "webhook_type": "ITEM",
  "webhook_code": "LOGIN_REPAIRED",
  "item_id": "<real sandbox item id>",
  "error": null
}

# 2. Compute the SHA-256 body hash.
# 3. Construct a JWT signed with Plaid's sandbox test key OR sign with our own ES256 key
#    and configure the component's JWT verifier with the matching pub key during Tier 2 tests.
# 4. POST to CONVEX_SITE_URL + "/webhooks-plaid" with Plaid-Verification header set.
```

This is the Tier 2 recorded-fixture pattern: fixtures are JSON bodies plus pre-computed JWT strings. The JWT is generated once per fixture using a test key; the test harness sets the `shouldSkipVerification()` path to true, or mocks `verifyPlaidWebhook` to return resolved. Either approach avoids needing real Plaid-signed JWTs for Tier 2.

### Execution-phase prompt

During Task W4.8 (fixture capture), the executing agent:

1. Confirms that the Plaid Sandbox MCP is connected (via `/mcp` status or equivalent).
2. For each of the 9 codes, attempts `simulate_webhook` via the MCP. Logs which codes succeed.
3. For codes that the MCP cannot fire, writes a manual fixture JSON at `packages/backend/convex/__tests__/fixtures/plaid-webhooks/{code}.json` with `{ body: {...}, bypassSignature: true }`. Add a comment in the fixture noting why signature bypass is used.
4. For codes the MCP fires successfully, captures the emitted webhook via a local reverse-proxy tunnel (e.g., `ngrok` to `/webhooks-plaid`) or via Convex dashboard log inspection, then records body and JWT for fixture replay.
5. Reports completion in the PR description with a table: code, capture method (MCP or manual), fixture path.

**Sources:**
- Plaid `/sandbox/item/fire_webhook` documentation: `plaid.com/docs/api/sandbox/`
- Plaid Sandbox MCP plugin (installed via [AGENTS.md:486](AGENTS.md:486))
- Existing SmartPockets webhook signature bypass: [packages/backend/convex/http.ts:123](packages/backend/convex/http.ts:123)

---

## Appendix A: Research tasks summary table

| # | Task | Status | Confidence | Execution-phase action |
|---|---|---|---|---|
| 1 | Plaid webhook inventory against W0 Section 9 | Fresh audit | Partially verified | Cross-check against docs before Task W4.7 |
| 2 | Investments MVP-or-defer rationale | Locked: defer | Verified | None; rationale documented |
| 3 | Published-package-vs-workspace recommendation | Locked: `workspace:*` | Verified | None; migration criteria documented |
| 4 | Liabilities coverage audit | Verification | Verified | Optional Sandbox spot-check |
| 5 | Error code audit against W4 taxonomy | Gap check | Verified | Execute unit tests during Task W4.4 |
| 6 | `convex-test` harness feasibility for host-app `http.ts` | Feasibility | Partially verified | Run prototype during Task W4.1 |
| 7 | Plaid Sandbox MCP webhook simulation coverage for 9 codes | Capability audit | Execution-phase prompt | Attempt each during Task W4.8 |

---

**End of W4 research findings.**

# W4: Plaid Component Gap Closure

**Milestone:** M3 Agentic Home
**Workstream:** W4 (Track A root per master brief Section 11)
**Phase:** 2 (`/plan` authoritative spec)
**Author:** Claude (Obra Superpowers `/plan` phase)
**Date:** 2026-04-20
**Brainstorm input:** [specs/W4-plaid-gap-closure.brainstorm.md](specs/W4-plaid-gap-closure.brainstorm.md)
**Research input:** [specs/W4-plaid-gap-closure.research.md](specs/W4-plaid-gap-closure.research.md)
**Cross-workstream contract reference:** [specs/00-contracts.md](specs/00-contracts.md) (authoritative; if this W4 spec disagrees, contracts wins). W4 owns two contract rows per the §0 ownership table: `plaidItems.newAccountsAvailableAt` (consumers W1, W7) and the Plaid sync-state health query `getPlaidItemHealth`/`listPlaidItemHealth` (consumers W1, W2, W7). W4 also calls three W7-owned dispatch actions per contracts §13, §14, §15: `dispatchWelcomeOnboarding`, `dispatchReconsentRequired`, `dispatchItemErrorPersistent`.
**Writing convention:** No em-dashes (repo rule).

---

## 1. Goal

Close every gap the W0 audit identified in the Plaid surface area so that the M3 agentic home has a complete, auditable, consumable Plaid integration by the time W5 (mutations) and W6 (intelligence) pick it up. Specifically: close every NOT FOUND webhook row from [specs/W0-existing-state-audit.md:303](specs/W0-existing-state-audit.md:303); expose a rich per-item sync-state query that retires the downstream `plaidItems.status` duplication; add the minimum component-API surface required for account-selection update-mode Link; publish integration contracts for W1 (UI) and W7 (email); ship a Plaid-error-code-to-user-action taxonomy in the host app; commit to a three-tier test plan.

W4 does not add investments coverage (deferred; see Section 3.1). W4 does not migrate package consumption (workspace:* retained; see Section 3.2). W4 introduces one additive schema field and no new tables.

---

## 2. Non-goals (preserved, must not regress)

- JWE A256GCM encryption at rest for `plaidItems.accessToken`.
- ES256 JWT verification, SHA-256 body hash, 5-minute window, 24-hour webhook deduplication.
- Circuit breaker state machine (`closed`, `open`, `half_open`) on `plaidItems`.
- Optimistic locking on transaction sync via `syncVersion` plus `syncStartedAt`.
- 8 currently-HANDLED webhook branches (`TRANSACTIONS:SYNC_UPDATES_AVAILABLE`, `TRANSACTIONS:RECURRING_TRANSACTIONS_UPDATE`, `LIABILITIES:DEFAULT_UPDATE`, `ITEM:ERROR`, `ITEM:PENDING_EXPIRATION`, `ITEM:USER_PERMISSION_REVOKED`, `ITEM:PENDING_DISCONNECT`, and the `ITEM_LOGIN_REQUIRED` sub-case of `ITEM:ERROR`). Regression-guard tests in Tier 2 keep them frozen.
- npm publish pipeline via `.github/workflows/publish.yml`.
- Existing `creditCards` denormalization logic and milliunits convention.
- Existing credit-card, wallet, and transaction routes.
- `bun typecheck` passes across all workspaces.

---

## 3. Decisions (locked during brainstorm)

### 3.1 Investments deferred

`HOLDINGS:DEFAULT_UPDATE` and `INVESTMENTS_TRANSACTIONS:DEFAULT_UPDATE` become log-only stub handlers. No new schema tables, no `fetchInvestmentsAction`, no new wrappers or queries. Rationale: SmartPockets is positioned around credit-card tracking; no W3 component, W5 mutation, or W6 feature consumes holdings data. Master brief Section 3 already classes related Plaid products (Signal, Income, Assets) as out-of-MVP; investments follows the same logic. The extension recipe at [packages/convex-plaid/CLAUDE.md:1037](packages/convex-plaid/CLAUDE.md:1037) remains the path if a post-MVP milestone revisits.

### 3.2 Package consumption remains `workspace:*`

Both consumers (`package.json` root and [packages/backend/package.json:22](packages/backend/package.json:22)) retain `@crowdevelopment/convex-plaid: workspace:*`. Apps/app does not consume the component directly (it uses raw `react-plaid-link`). Migration to npm consumption with workspace overrides is documented as a post-MVP candidate with criteria in the research doc.

### 3.3 Sync-state query returns a rich health object; derivation lives in the component

Per brainstorm Q3 path B. The component exposes two new public queries (`getItemHealth` and `getItemHealthByUser`) returning a structured object that includes `state` and `recommendedAction` plus `reasonCode` (a structured enum). The host app translates `reasonCode` to user-facing copy via a separate host-app-side taxonomy module. This separation keeps user-visible strings out of the reusable component while still centralizing derivation so downstream callers cannot invent their own mappings.

### 3.4 `ITEM:LOGIN_REPAIRED` is log-only (revised from initial brainstorm)

Per brainstorm Section 4.1. The webhook fires rarely in practice; the dominant repair path is update-mode Link via `completeReauthAction` which already resets status. Log-only preserves empirical data in `webhookLogs` so a post-MVP milestone can revisit if traffic warrants.

### 3.5 `clearNewAccountsAvailableInternal` fires at exactly one site

Per brainstorm Section 4.2. The field clears when update-mode `exchangePublicTokenAction` succeeds for an existing `plaidItemId`. No opportunistic account-set comparison.

### 3.6 Derivation algorithm is ordered priority (circuit-breaker-open supersedes `status === "error"`)

Per brainstorm Section 4.3 and spec Section 6.3. A transient institution outage should auto-retry (`wait`), not prompt the user for manual action (`contact_support`). Derivation order respects this: `needs_reauth` is top (user action always needed), then circuit-breaker `open` (auto-retry), then `status === "error"` (taxonomy-driven), then remaining status values.

### 3.7 Re-consent UX ownership: W4 owns data plus integration contract; W1 and W7 build UI and copy

Per brainstorm Q5 path A. W4 publishes the `recommendedAction` firing rules, call signatures, and event-contract payloads. W1 owns modal layout and button copy; W7 owns email template copy.

### 3.8 Test fixture strategy: three-tier

Per brainstorm Q6 path A. Tier 1 component unit tests; Tier 2 host-app integration tests against recorded JWT-signed fixtures (requires wiring `vitest` plus `convex-test` in `packages/backend`); Tier 3 manual Plaid Sandbox MCP smoke during implementation-phase acceptance.

---

## 4. Webhook coverage matrix (authoritative)

W4's goal is to take W0 Section 9's matrix from 7 NOT FOUND to 0 NOT FOUND, without regressing any of the 11 existing branches (8 HANDLED + 2 INFORMATIONAL + 1 LOGGED).

| Webhook type | Code | W0 state | W4 action | Handler location |
|---|---|---|---|---|
| `TRANSACTIONS` | `SYNC_UPDATES_AVAILABLE` | HANDLED | unchanged | [packages/backend/convex/http.ts:188](packages/backend/convex/http.ts:188) |
| `TRANSACTIONS` | `INITIAL_UPDATE` | INFORMATIONAL | unchanged (log-only) | [http.ts:203](packages/backend/convex/http.ts:203) |
| `TRANSACTIONS` | `HISTORICAL_UPDATE` | INFORMATIONAL | unchanged (log-only) | [http.ts:203](packages/backend/convex/http.ts:203) |
| `TRANSACTIONS` | `RECURRING_TRANSACTIONS_UPDATE` | HANDLED | unchanged | [http.ts:206](packages/backend/convex/http.ts:206) |
| `TRANSACTIONS` | `DEFAULT_UPDATE` | **NOT FOUND** | **NEW handler:** schedule `syncTransactionsInternal` + `refreshAccountsAndSyncCreditCardsInternal` (500 ms offset), mirroring `SYNC_UPDATES_AVAILABLE` branch | new branch in [http.ts](packages/backend/convex/http.ts) |
| `LIABILITIES` | `DEFAULT_UPDATE` | HANDLED | unchanged | [http.ts:216](packages/backend/convex/http.ts:216) |
| `ITEM` | `ERROR` | HANDLED | unchanged | [http.ts:233](packages/backend/convex/http.ts:233) |
| `ITEM` | `PENDING_EXPIRATION` | HANDLED | unchanged | [http.ts:253](packages/backend/convex/http.ts:253) |
| `ITEM` | `USER_PERMISSION_REVOKED` | HANDLED | unchanged | [http.ts:262](packages/backend/convex/http.ts:262) |
| `ITEM` | `PENDING_DISCONNECT` | HANDLED | unchanged | [http.ts:270](packages/backend/convex/http.ts:270) |
| `ITEM` | `WEBHOOK_UPDATE_ACKNOWLEDGED` | LOGGED | unchanged | [http.ts:278](packages/backend/convex/http.ts:278) |
| `ITEM` | `LOGIN_REPAIRED` | **NOT FOUND** | **NEW log-only handler:** write to `webhookLogs` via existing path, 200 OK, no status mutation, no scheduler | new branch in [http.ts](packages/backend/convex/http.ts) |
| `ITEM` | `NEW_ACCOUNTS_AVAILABLE` | **NOT FOUND** | **NEW handler:** call `setNewAccountsAvailableInternal`, 200 OK | new branch in [http.ts](packages/backend/convex/http.ts) |
| `HOLDINGS` | `DEFAULT_UPDATE` | **NOT FOUND** | **NEW stub:** log-only (investments deferred) | new branch |
| `INVESTMENTS_TRANSACTIONS` | `DEFAULT_UPDATE` | **NOT FOUND** | **NEW stub:** log-only (investments deferred) | new branch |
| `AUTH` | any | **NOT FOUND** | **NEW stub:** log-only (ACH/bill-pay out of MVP) | new branch |
| `IDENTITY` | any | **NOT FOUND** | **NEW stub:** log-only (identity merge post-MVP) | new branch |

Outcome: 7 to 0 NOT FOUND. 5 close with real handlers (`TRANSACTIONS:DEFAULT_UPDATE`, `ITEM:LOGIN_REPAIRED`, `ITEM:NEW_ACCOUNTS_AVAILABLE`, plus the 2 ERROR-path refinements where `ITEM:ERROR` clears `newAccountsAvailableAt` on transition back to `active`). 4 close with documented log-only stubs.

Note on "5 real handlers": `ITEM:LOGIN_REPAIRED` is categorized as a real handler even though it is log-only, because it is a new branch reflecting an explicit decision about Plaid's behavior. The 4 true stubs are `HOLDINGS`, `INVESTMENTS_TRANSACTIONS`, `AUTH`, `IDENTITY`: these are decisions to not act on the webhook.

---

## 5. Schema changes (three additive fields)

### 5.1 Fields added to component `plaidItems` table

[packages/convex-plaid/src/component/schema.ts:22](packages/convex-plaid/src/component/schema.ts:22)

| Field | Type | Default | Purpose |
|---|---|---|---|
| `newAccountsAvailableAt` | `v.optional(v.number())` | `undefined` | Unix timestamp. Stamped by `ITEM:NEW_ACCOUNTS_AVAILABLE` webhook handler via `setNewAccountsAvailableInternal`. Cleared on successful update-mode `exchangePublicTokenAction` return for the same `plaidItemId` via `clearNewAccountsAvailableInternal`. |
| `firstErrorAt` | `v.optional(v.number())` | `undefined` | Unix timestamp. Stamped by `setItemErrorInternal` and `markNeedsReauthInternal` on the transition from any non-error status into `error` or `needs_reauth`. Preserved across subsequent error observations for the same item. Cleared on transition back to `active` via `completeReauthAction` or a successful sync. Provides the `firstErrorAt` payload field required by contracts §15 `dispatchItemErrorPersistent`. |
| `lastDispatchedAt` | `v.optional(v.number())` | `undefined` | Unix timestamp. Stamped by the 6-hour persistent-error cron (Section 8.2) when it schedules `dispatchItemErrorPersistent` for this item. Used as the cron's dedup filter: the cron only dispatches if `lastDispatchedAt == null OR lastDispatchedAt < now - 72h`. Cleared on transition back to `active`. |

No new indexes required. All three fields are nullable so no backfill is required; legacy items read `undefined` and derive healthy health objects.

### 5.2 No other schema changes

No new tables. No other field additions to component tables. No changes to host-app Ents schema at [packages/backend/convex/schema.ts](packages/backend/convex/schema.ts). No index changes. No edge changes.

### 5.3 Host-app internal query addition (not a schema change)

Host app adds one new internal query `internal.users.countActivePlaidItems({ userId })` required by contracts §13 for the welcome-onboarding trigger. Lives at `packages/backend/convex/users/index.ts` (or analogous file in the existing users module). Returns `number`: count of `plaidItems` with `userId === {userId}` AND `status` not in (`"deleting"`). Uses the component's existing `getItemsByUser` public query. No new host-app schema fields.

---

## 6. Component-API additions

### 6.1 Action signature change: `createUpdateLinkTokenAction`

Location: [packages/convex-plaid/src/component/actions.ts](packages/convex-plaid/src/component/actions.ts) (component action) and [packages/backend/convex/plaidComponent.ts:162](packages/backend/convex/plaidComponent.ts:162) (host-app wrapper).

New optional argument: `mode?: v.union(v.literal("reauth"), v.literal("account_select"))`. Defaults to `"reauth"`. When `"account_select"`, the Plaid `/link/token/create` call passes `update.account_selection_enabled: true`. No other behavior change.

### 6.2 Internal mutations added

Component-side, in `packages/convex-plaid/src/component/private.ts` (or an analogous internal file; plan phase picks the file):

1. **`setNewAccountsAvailableInternal`**: `(plaidItemId: string) => Promise<null>`. Sets `newAccountsAvailableAt = Date.now()`. Idempotent: writing the same timestamp twice has no effect.
2. **`clearNewAccountsAvailableInternal`**: `(plaidItemId: string) => Promise<null>`. Clears the field. Called exactly once per flow: at the end of a successful update-mode `exchangePublicTokenAction` for an existing item.
3. **`markFirstErrorAtInternal`**: `(plaidItemId: string) => Promise<null>`. Idempotent: if `firstErrorAt` is already set, leaves it; otherwise stamps `Date.now()`. Called by `setItemErrorInternal` and `markNeedsReauthInternal` before those mutations patch status. Keeps the error-transition clock monotonic.
4. **`clearErrorTrackingInternal`**: `(plaidItemId: string) => Promise<null>`. Clears both `firstErrorAt` and `lastDispatchedAt`. Called on transition from error-class status back to `active`: inside `completeReauthAction` and at the end of a successful `syncPlaidItemInternal`.
5. **`markItemErrorDispatchedInternal`**: `(plaidItemId: string) => Promise<null>`. Stamps `lastDispatchedAt = Date.now()`. Called by the 6-hour persistent-error cron immediately after scheduling `dispatchItemErrorPersistent`.

These are internal mutations only. They are called from host-app code (webhook handlers, exchangePublicTokenAction, the cron action, completeReauth). Neither is exposed via a public mutation.

### 6.3 New public queries: `getItemHealth` and `getItemHealthByUser`

Component-side, in [packages/convex-plaid/src/component/public.ts](packages/convex-plaid/src/component/public.ts).

```typescript
getItemHealth({ plaidItemId: v.string() }) => Promise<ItemHealth>;
getItemHealthByUser({ userId: v.string() }) => Promise<Array<ItemHealth>>;
```

Where `ItemHealth` is:

```typescript
type ItemHealth = {
  plaidItemId: string;
  itemId: string;                                             // Plaid's item_id
  state: "syncing" | "ready" | "error" | "re-consent-required";
  recommendedAction:
    | "reconnect"
    | "reconnect_for_new_accounts"
    | "wait"
    | "contact_support"
    | null;
  reasonCode: ReasonCode;                                     // structured enum, see below
  isActive: boolean;
  institutionId: string | null;
  institutionName: string | null;
  institutionLogoBase64: string | null;
  institutionPrimaryColor: string | null;
  lastSyncedAt: number | null;
  lastWebhookAt: number | null;                               // most recent webhookLogs entry for this item
  errorCode: string | null;                                   // plaidItems.errorCode
  errorMessage: string | null;                                // plaidItems.errorMessage
  circuitState: "closed" | "open" | "half_open";
  consecutiveFailures: number;
  nextRetryAt: number | null;
  newAccountsAvailableAt: number | null;
};
```

`ReasonCode` is a structured enum with stable string values the host app maps to user copy:

```typescript
type ReasonCode =
  | "healthy"
  | "syncing_initial"
  | "syncing_incremental"
  | "auth_required_login"
  | "auth_required_expiration"
  | "transient_circuit_open"
  | "transient_institution_down"
  | "transient_rate_limited"
  | "permanent_invalid_token"
  | "permanent_item_not_found"
  | "permanent_no_accounts"
  | "permanent_access_not_granted"
  | "permanent_products_not_supported"
  | "permanent_institution_unsupported"
  | "permanent_revoked"
  | "permanent_unknown"
  | "new_accounts_available";
```

Derivation rules for `reasonCode` are a pure function of `status`, `errorCode`, `circuitState`, and `newAccountsAvailableAt`. Full rules in Section 6.4.

#### 6.3.1 Handling `status === "deleting"`

Items with `status === "deleting"` are filtered out by `getItemHealthByUser` (they are mid-cascade-delete and should not appear in UI). `getItemHealth({ plaidItemId })` for a deleting item returns a minimal `ItemHealth` with `state: "error"`, `recommendedAction: null`, `reasonCode: "permanent_unknown"` so callers that drill in do not crash.

### 6.4 Derivation algorithm (ordered priority, pure)

Lives in the component, exported as a pure helper for unit testing. Pseudocode:

```
function derive(item, institution, lastWebhookAt): ItemHealth {
  if (item.status === "deleting") {
    return { state: "error", recommendedAction: null, reasonCode: "permanent_unknown", ... };
  }

  if (item.status === "needs_reauth") {
    const reason = item.reauthReason ?? "";
    const reasonCode = reason.toLowerCase().includes("expir")
      ? "auth_required_expiration"
      : "auth_required_login";
    return { state: "re-consent-required", recommendedAction: "reconnect", reasonCode, ... };
  }

  if (item.circuitState === "open") {
    return { state: "error", recommendedAction: "wait", reasonCode: "transient_circuit_open", ... };
  }

  if (item.status === "error") {
    const reasonCode = mapErrorCodeToReason(item.errorCode);  // see 6.5
    const recommendedAction = reasonCode.startsWith("transient_")
      ? "wait"
      : "contact_support";
    return { state: "error", recommendedAction, reasonCode, ... };
  }

  if (item.circuitState === "half_open") {
    return { state: "syncing", recommendedAction: null, reasonCode: "syncing_incremental", ... };
  }

  if (item.status === "pending") {
    return { state: "syncing", recommendedAction: null, reasonCode: "syncing_initial", ... };
  }

  if (item.status === "syncing") {
    return { state: "syncing", recommendedAction: null, reasonCode: "syncing_incremental", ... };
  }

  if (item.status === "active" && item.newAccountsAvailableAt != null) {
    return { state: "ready", recommendedAction: "reconnect_for_new_accounts", reasonCode: "new_accounts_available", ... };
  }

  if (item.status === "active") {
    return { state: "ready", recommendedAction: null, reasonCode: "healthy", ... };
  }

  // Unreachable in well-formed data
  return { state: "error", recommendedAction: null, reasonCode: "permanent_unknown", ... };
}
```

### 6.5 `mapErrorCodeToReason(errorCode: string | null): ReasonCode`

Pure helper inside the component. Mapping respects the existing classification at [packages/convex-plaid/src/component/errors.ts](packages/convex-plaid/src/component/errors.ts):

| Plaid error code | Current error-category (errors.ts) | W4 reasonCode |
|---|---|---|
| `ITEM_LOGIN_REQUIRED` | auth_required | `auth_required_login` |
| `INVALID_ACCESS_TOKEN` | auth_required | `permanent_invalid_token` |
| `ITEM_NOT_FOUND` | auth_required | `permanent_item_not_found` |
| `ACCESS_NOT_GRANTED` | auth_required | `permanent_access_not_granted` |
| `INVALID_CREDENTIALS` | auth_required | `auth_required_login` |
| `INSUFFICIENT_CREDENTIALS` | auth_required | `auth_required_login` |
| `USER_SETUP_REQUIRED` | auth_required | `auth_required_login` |
| `MFA_NOT_SUPPORTED` | auth_required | `permanent_unknown` |
| `NO_ACCOUNTS` | auth_required | `permanent_no_accounts` |
| `ITEM_LOCKED` | auth_required | `auth_required_login` |
| `ITEM_NOT_SUPPORTED` | auth_required | `permanent_products_not_supported` |
| `INVALID_MFA` | auth_required | `auth_required_login` |
| `INVALID_SEND_METHOD` | auth_required | `auth_required_login` |
| `TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION` | retryable | `transient_rate_limited` |
| `INTERNAL_SERVER_ERROR` | retryable | `transient_institution_down` |
| `RATE_LIMIT_EXCEEDED` | retryable | `transient_rate_limited` |
| `INSTITUTION_DOWN` | retryable | `transient_institution_down` |
| `INSTITUTION_NOT_RESPONDING` | retryable | `transient_institution_down` |
| `INSTITUTION_NO_CREDENTIALS` | retryable | `auth_required_login` |
| `PLAID_ERROR` | retryable | `transient_institution_down` |
| `INSTITUTION_NO_LONGER_SUPPORTED` | (not currently in errors.ts) | `permanent_institution_unsupported` |
| `USER_PERMISSION_REVOKED` (as errorCode, not webhook) | permanent | `permanent_revoked` |
| Any other / unknown | permanent | `permanent_unknown` |

The research doc verifies this mapping against the actual source; the plan updates the table with any codes discovered during the audit.

### 6.6 Host-app wrappers

Host-app `packages/backend/convex/plaidComponent.ts` adds two query wrappers. These simply call the component public queries with auth enforcement per the existing pattern at [packages/backend/convex/plaidComponent.ts:667](packages/backend/convex/plaidComponent.ts:667):

- `getPlaidItemHealth({ plaidItemId })` → verifies viewer owns the item, calls component `getItemHealth`.
- `getPlaidItemHealthByUser()` → calls component `getItemHealthByUser({ userId: viewer.externalId })`.
- The existing `createUpdateLinkTokenAction` wrapper (already at [packages/backend/convex/plaidComponent.ts:162](packages/backend/convex/plaidComponent.ts:162)) adds pass-through of the `mode` argument.

### 6.7 Changes to existing host-app actions

**`exchangePublicTokenAction`** (existing at [packages/backend/convex/plaidComponent.ts:80](packages/backend/convex/plaidComponent.ts:80)):

1. After a successful exchange, check whether the returned `plaidItemId` already exists via `components.plaid.public.getItem`. If yes AND the prior item had `newAccountsAvailableAt != null`, call `clearNewAccountsAvailableInternal` (update-mode clearance).
2. Call `internal.users.countActivePlaidItems({ userId: args.userId })` to read prior link count.
3. If `priorLinkCount === 0`, call `internal.email.dispatch.dispatchWelcomeOnboarding({ userId, variant: "plaid-linked", firstLinkedInstitutionName: institutionName })` per contracts §13. The institution name is resolved from the newly-created plaidItem's `institutionName` field (or from Plaid's immediate `/item/get` + `/institutions/get_by_id` calls that already happen during `onboardNewConnectionAction`).
4. The welcome dispatch is scheduled, not awaited: `ctx.scheduler.runAfter(0, internal.email.dispatch.dispatchWelcomeOnboarding, {...})`.

**`setItemErrorInternal`** (existing internal mutation in component): extended by the host-app webhook handler to also call `markFirstErrorAtInternal` *before* the error-status patch, so `firstErrorAt` reflects the transition moment. If the caller opts for a single-mutation pattern, `setItemErrorInternal` itself is extended to stamp `firstErrorAt` internally (first-write-wins). Plan phase picks the tactic.

**`markNeedsReauthInternal`** (existing internal mutation in component): same treatment as `setItemErrorInternal`. Stamps `firstErrorAt` on first entry.

**`completeReauthAction`** (existing at [packages/backend/convex/plaidComponent.ts:177](packages/backend/convex/plaidComponent.ts:177)): after the status patch back to `active`, call `clearErrorTrackingInternal({ plaidItemId })` to wipe `firstErrorAt` and `lastDispatchedAt`.

**`syncPlaidItemInternal`** (existing at [packages/backend/convex/plaidComponent.ts:475](packages/backend/convex/plaidComponent.ts:475)): after a successful end-to-end sync that leaves the item in `status === "active"` with no errors, call `clearErrorTrackingInternal` if either tracking field is set.

---

## 7. Host-app error-taxonomy module

### 7.1 Location

`packages/backend/convex/plaid/errorTaxonomy.ts` (new file; directory `packages/backend/convex/plaid/` is new).

### 7.2 Exports

```typescript
export type ReasonCode = /* same as component's ReasonCode; source of truth is re-exported from @crowdevelopment/convex-plaid */;

export interface UserCopy {
  title: string;                                // short banner/label
  description: string;                          // one-sentence explanation
  ctaLabel: string | null;                      // button text; null if no CTA
}

export function reasonCodeToUserCopy(
  reasonCode: ReasonCode,
  institutionName: string | null,
): UserCopy;
```

### 7.3 Copy table

`institutionName` defaults to "your bank" when null.

| ReasonCode | title | description | ctaLabel |
|---|---|---|---|
| `healthy` | "Connected" | "Sync is up to date." | null |
| `syncing_initial` | "Setting up" | "We are pulling your accounts and history from {institution}." | null |
| `syncing_incremental` | "Syncing" | "Checking {institution} for updates." | null |
| `auth_required_login` | "Reconnect needed" | "{institution} needs you to re-enter your credentials." | "Reconnect" |
| `auth_required_expiration` | "Credentials expiring" | "Your connection to {institution} will expire soon. Reconnect to stay in sync." | "Reconnect" |
| `transient_circuit_open` | "Temporarily paused" | "{institution} returned too many errors in a row. We will retry automatically." | null |
| `transient_institution_down` | "Bank unavailable" | "{institution} is not responding right now. We will retry automatically." | null |
| `transient_rate_limited` | "Retrying shortly" | "We are being rate-limited. We will retry shortly." | null |
| `permanent_invalid_token` | "Connection broken" | "Your connection to {institution} is broken. Remove and reconnect it." | "Contact support" |
| `permanent_item_not_found` | "Connection lost" | "This connection to {institution} can no longer be found. Remove and reconnect it." | "Contact support" |
| `permanent_no_accounts` | "No accounts found" | "No eligible accounts were found at {institution}." | "Contact support" |
| `permanent_access_not_granted` | "Access denied" | "Access was denied during connection. Reconnect and grant access to all needed data." | "Reconnect" |
| `permanent_products_not_supported` | "Not supported" | "{institution} does not support the features SmartPockets uses." | "Contact support" |
| `permanent_institution_unsupported` | "No longer supported" | "{institution} is no longer supported by SmartPockets." | "Contact support" |
| `permanent_revoked` | "Access revoked" | "You revoked access from {institution}. Reconnect if this was a mistake." | "Reconnect" |
| `permanent_unknown` | "Sync error" | "Something went wrong syncing {institution}. Contact support if it continues." | "Contact support" |
| `new_accounts_available` | "New accounts available" | "{institution} has new accounts you can add to SmartPockets." | "Update accounts" |

No em-dashes. The `ctaLabel` value `"Reconnect"` pairs with `recommendedAction: "reconnect"`; `"Update accounts"` pairs with `"reconnect_for_new_accounts"`; `"Contact support"` pairs with `"contact_support"`; `null` pairs with `"wait"` or `null`.

---

## 8. Re-consent integration contract

### 8.1 Contract for W1 (UI layer)

W1 owns modal layout, banner layout, and copy beyond what [`packages/backend/convex/plaid/errorTaxonomy.ts`](packages/backend/convex/plaid/errorTaxonomy.ts) exposes. W4 guarantees:

- **Agent read-tool for W2 registry:** `get_plaid_health({ plaidItemId? })` wraps `api.plaidComponent.getPlaidItemHealth` or `getPlaidItemHealthByUser`. W4 publishes the contract; W2 registers the tool.
- **Dashboard banner (`ConnectedBanks.tsx`) consumption pattern:**

  ```tsx
  const banks = useQuery(api.dashboard.queries.getConnectedBanks);
  // getConnectedBanks is updated in W4 to call getPlaidItemHealthByUser under the hood
  // and include { state, recommendedAction, reasonCode, ...} in each returned bank object
  ```

  Consumer CTAs keyed on `recommendedAction`:
  - `reconnect`: open update-mode Link with `mode: "reauth"`.
  - `reconnect_for_new_accounts`: open update-mode Link with `mode: "account_select"`.
  - `wait`: disabled state; optionally surface `nextRetryAt` via formatting helper (not in W4's scope).
  - `contact_support`: link to a help route; carries `errorMessage` as context.
  - `null`: no banner for this bank.

- **Chat UI re-consent modal contract:** W1 subscribes via `useQuery(api.plaidComponent.getPlaidItemHealthByUser)` and renders a modal when any item transitions into `state === "re-consent-required"` during a chat session. Modal layout and copy are W1-owned; the query + derivation + user copy helper are W4-owned.

### 8.2 Contract for W7 (email layer)

W4 dispatches three W7-owned internal actions per contracts §14 and §15. The dispatch actions live at `internal.email.dispatch.*` and are owned by W7; W4 creates minimal stub implementations at that path so the W4 stack lands independently, and W7 replaces the stub bodies with real template render plus Resend send in a later PR.

| Dispatch | W4 trigger | Payload (matches contracts §15 verbatim) | Cadence | Schema fields read |
|---|---|---|---|---|
| `internal.email.dispatch.dispatchWelcomeOnboarding` | `exchangePublicTokenAction` after successful exchange, when `countActivePlaidItems === 0` (first link) | `{ userId: Id<"users">, variant: "plaid-linked", firstLinkedInstitutionName: string }` | Immediate; one-shot (per contracts §13, essential tier) | None |
| `internal.email.dispatch.dispatchReconsentRequired` | Host-app webhook dispatch on transition `active -> needs_reauth` (via `markNeedsReauthInternal` call sites in `ITEM:ERROR` with `error_code: "ITEM_LOGIN_REQUIRED"` branch AND `ITEM:PENDING_EXPIRATION` branch) | `{ userId: Id<"users">, plaidItemId: string, institutionName: string, reason: "ITEM_LOGIN_REQUIRED" \| "PENDING_EXPIRATION" }` | Immediate; deduplication is W7's responsibility via `emailEvents.idempotencyKey` (content hash `{ plaidItemId, eventName, transitionBucket }`) per contracts §10 and idempotency spike at [specs/00-idempotency-semantics.md](specs/00-idempotency-semantics.md) | `plaidItems.institutionName` |
| `internal.email.dispatch.dispatchItemErrorPersistent` | New 6-hour persistent-error cron in [packages/backend/convex/crons.ts](packages/backend/convex/crons.ts); scans for items with `status === "error"` AND `lastSyncedAt < now() - 24h` AND `(lastDispatchedAt == null OR lastDispatchedAt < now() - 72h)` | `{ userId: Id<"users">, plaidItemId: string, institutionName: string, firstErrorAt: number, lastSeenErrorAt: number, errorCode: string }` | Every 6 hours at minute 0 (contracts §14 row 7: `item-error-persistent` is essential-tier; 6-hour cadence per contract). W4 field-level dedup via `lastDispatchedAt` caps delivery at once per 72 h per item. W7's workflow adds an additional idempotency layer on top | `plaidItems.institutionName`, `plaidItems.firstErrorAt` (new), `plaidItems.errorAt` (existing; maps to `lastSeenErrorAt`), `plaidItems.errorCode` (existing), `plaidItems.lastDispatchedAt` (new) |

**Field mapping for `dispatchItemErrorPersistent` payload:**

| Payload field | Source |
|---|---|
| `userId` | The user who owns the plaidItem |
| `plaidItemId` | The item's Convex `Id<"plaidItems">` |
| `institutionName` | `plaidItems.institutionName` (fallback to `"your bank"` if null) |
| `firstErrorAt` | `plaidItems.firstErrorAt` (new field per Section 5.1) |
| `lastSeenErrorAt` | `plaidItems.errorAt` (existing field; stamped on every error observation by `setItemErrorInternal`) |
| `errorCode` | `plaidItems.errorCode` (existing) |

**Expected dispatch cadence for an item in persistent error:** 6-hour cron fires at hour 0, 6, 12, 18, 24 past a reference. First fire with all preconditions met dispatches and stamps `lastDispatchedAt`. Next fires within the 72 h window find `lastDispatchedAt` recent and skip. At 72 h past the last dispatch, the next eligible cron run dispatches again and re-stamps. W7 template QA exercises this pattern via clock advance: dispatch at hour 0, no dispatch for hours 6 through 66, dispatch at hour 72.

**`NEW_ACCOUNTS_AVAILABLE` does not produce an email event in MVP.** The UI banner covers the flow. Master brief Section 8 W7 lists only seven MVP templates; contracts §14 confirms the final set at eight (after `subscription-detected` was added by M18). "New accounts available" is not in either list. Post-MVP addition is a one-event contract row.

---

## 9. Test plan (three tiers)

### 9.1 Tier 1: component unit tests

Location: `packages/convex-plaid/src/`, `vitest` plus `convex-test` (already configured; see [packages/convex-plaid/package.json:30](packages/convex-plaid/package.json:30)). Extends the existing pattern at [packages/convex-plaid/src/component/circuitBreaker.test.ts](packages/convex-plaid/src/component/circuitBreaker.test.ts), [packages/convex-plaid/src/component/errors.test.ts](packages/convex-plaid/src/component/errors.test.ts), [packages/convex-plaid/src/component/encryption.test.ts](packages/convex-plaid/src/component/encryption.test.ts).

**Cases (by file):**

- New `packages/convex-plaid/src/component/health.test.ts`:
  - `derive` returns `state: "re-consent-required"`, `reasonCode: "auth_required_login"`, `recommendedAction: "reconnect"` for `{ status: "needs_reauth", reauthReason: "ITEM_LOGIN_REQUIRED ..." }`.
  - `derive` returns `reasonCode: "auth_required_expiration"` for reauthReason containing the substring `"expir"`.
  - `derive` returns `state: "error"`, `recommendedAction: "wait"`, `reasonCode: "transient_circuit_open"` for `{ circuitState: "open" }` regardless of other status values (except `needs_reauth`).
  - `derive` returns `state: "error"`, `recommendedAction: "wait"`, `reasonCode: "transient_institution_down"` for `{ status: "error", errorCode: "INSTITUTION_DOWN", circuitState: "closed" }`.
  - `derive` returns `state: "error"`, `recommendedAction: "contact_support"`, `reasonCode: "permanent_invalid_token"` for `{ status: "error", errorCode: "INVALID_ACCESS_TOKEN" }`.
  - `derive` returns `state: "syncing"` for `status: "pending"` and for `circuitState: "half_open"`.
  - `derive` returns `state: "ready"`, `recommendedAction: "reconnect_for_new_accounts"`, `reasonCode: "new_accounts_available"` for `{ status: "active", newAccountsAvailableAt: <number> }`.
  - `derive` returns healthy object for `{ status: "active" }` with `newAccountsAvailableAt: undefined`.
  - `derive` returns filtered-out sentinel for `status: "deleting"`.
- Extend `packages/convex-plaid/src/component/errors.test.ts`:
  - `mapErrorCodeToReason("ITEM_LOGIN_REQUIRED")` returns `"auth_required_login"`.
  - `mapErrorCodeToReason("INVALID_ACCESS_TOKEN")` returns `"permanent_invalid_token"`.
  - `mapErrorCodeToReason("SOMETHING_UNRECOGNIZED")` returns `"permanent_unknown"`.
  - One test per remaining row of the table in Section 6.5.
- New `packages/convex-plaid/src/component/newAccountsAvailable.test.ts`:
  - `setNewAccountsAvailableInternal` stamps `newAccountsAvailableAt` on the target item.
  - `clearNewAccountsAvailableInternal` clears it.
  - Stamping twice is idempotent (same or newer timestamp overwrites).
- New `packages/convex-plaid/src/component/updateLinkTokenMode.test.ts`:
  - `createUpdateLinkTokenAction({ ..., mode: "account_select" })` invokes the Plaid SDK mock with `update.account_selection_enabled: true`.
  - Default mode (`undefined`) does not set the flag.
  - `mode: "reauth"` does not set the flag.

### 9.2 Tier 2: host-app integration tests

Location: `packages/backend/convex/__tests__/plaidWebhooks.test.ts` (new file). Requires one-time setup of `vitest` plus `convex-test` in [packages/backend/package.json](packages/backend/package.json).

**One-time setup** (Task W4.1; see plan):
- Add `vitest` and `@vitest/coverage-v8` and `convex-test` to `packages/backend/package.json` devDependencies.
- Add `test`, `test:coverage`, `test:watch` scripts matching the component's pattern.
- Wire `convex-test` against host-app Convex schema and `http.ts` routes.

**Fixture strategy:**
- `packages/backend/convex/__tests__/fixtures/plaid-webhooks/` directory with one JSON per webhook code: `{ body: {...}, jwt: "..." }`.
- Fixtures captured via Plaid Sandbox MCP (`uvx mcp-server-plaid`) or via Plaid `/sandbox/item/fire_webhook` direct call. Research task 7 confirms the capture path.
- For sandbox mode tests (signature bypass engaged), fixtures with `jwt: null` are accepted.

**Cases (new handlers):**
- `TRANSACTIONS:DEFAULT_UPDATE` fixture triggers `syncTransactionsInternal` and `refreshAccountsAndSyncCreditCardsInternal` with the 500 ms offset.
- `ITEM:LOGIN_REPAIRED` fixture: no scheduler call, no mutation; a `webhookLogs` row exists.
- `ITEM:NEW_ACCOUNTS_AVAILABLE` fixture: `setNewAccountsAvailableInternal` invoked; `getItemHealth` returns `recommendedAction: "reconnect_for_new_accounts"`.
- `HOLDINGS:DEFAULT_UPDATE` and `INVESTMENTS_TRANSACTIONS:DEFAULT_UPDATE` fixtures: log-only.
- `AUTH:*` and `IDENTITY:*` fixtures: log-only.

**Cases (regression guards for existing HANDLED branches):**
- `TRANSACTIONS:SYNC_UPDATES_AVAILABLE`: scheduler dispatch unchanged.
- `TRANSACTIONS:RECURRING_TRANSACTIONS_UPDATE`: `fetchRecurringStreamsInternal` dispatched.
- `LIABILITIES:DEFAULT_UPDATE`: `fetchLiabilitiesInternal` plus `refreshAccountsAndSyncCreditCardsInternal` dispatched with 500 ms offset.
- `ITEM:ERROR` with `error_code: ITEM_LOGIN_REQUIRED`: `markNeedsReauthInternal` invoked and `plaid.item.needs_reauth` email scheduled.
- `ITEM:ERROR` with generic error: `setItemErrorInternal` invoked; no email scheduled (the persistent-error cron handles that).
- `ITEM:PENDING_EXPIRATION`: `markNeedsReauthInternal` plus `plaid.item.needs_reauth` email scheduled.
- `ITEM:USER_PERMISSION_REVOKED`: `deactivateItemInternal`.
- `ITEM:PENDING_DISCONNECT`: `deactivateItemInternal`.

**Cron and event-contract tests:**
- `dispatchItemErrorPersistent` cron: clock-manipulation test confirms dispatch at hour 0, no dispatch at hours 6 / 12 / 18 / 24 / ... / 66, dispatch at hour 72. `lastDispatchedAt` stamp visible after first dispatch; verified by reading the item.
- `dispatchReconsentRequired` emission: two transitions in `ITEM:ERROR[ITEM_LOGIN_REQUIRED]` fixture replay schedule two dispatch calls (W7 workflow owns content-hash dedup; W4 verifies the producer side fires correctly each time).
- `dispatchWelcomeOnboarding` emission: integration test replays `exchangePublicTokenAction` for a user with zero prior items; asserts exactly one welcome dispatch scheduled. Second exchange for the same user (now at count = 1) schedules zero welcome dispatches.

### 9.3 Tier 3: manual Plaid Sandbox smoke (implementation-phase)

Documented in the plan's acceptance checklist. For each of 5 real handlers plus 4 stub handlers:
1. Trigger the webhook via Plaid Sandbox MCP (or `/sandbox/item/fire_webhook` if MCP lacks a code per research task 7).
2. Convex dashboard logs confirm full chain: `/webhooks-plaid` received, JWT verified, handler invoked, scheduler dispatched or log-only, downstream side effects recorded.
3. `api.plaidComponent.getPlaidItemHealth` returns the expected shape for the affected item.
4. Email fires in dev mode for the two new event contracts (`needs_reauth`, `error_persistent`).

---

## 10. Backward compatibility and rollback

### 10.1 Change categorization

All changes are additive or internally-consistent. No data migration required.

| Change | Category | Rollback safety |
|---|---|---|
| Add `newAccountsAvailableAt`, `firstErrorAt`, `lastDispatchedAt` fields to component `plaidItems` | Additive (all nullable) | Remove fields; legacy rows unaffected |
| Add `mode` param to `createUpdateLinkTokenAction` | Additive (optional) | Remove param; callers without it default to `"reauth"` |
| Add 5 real webhook branches + 4 stubs | Additive | Revert file; webhooks return to "UNKNOWN" fallthrough with 200 OK |
| Add 5 internal mutations (`setNewAccountsAvailable`, `clearNewAccountsAvailable`, `markFirstErrorAt`, `clearErrorTracking`, `markItemErrorDispatched`) | Additive | Revert file |
| Add 2 public queries (`getItemHealth`, `getItemHealthByUser`) | Additive | Revert file; callers that never shipped have no prod impact |
| Add 1 host-app internal query (`countActivePlaidItems`) | Additive | Revert file |
| Add 6-hour `dispatchItemErrorPersistent` cron | Additive | Remove cron entry |
| Add error-taxonomy module (host app user copy) | Additive | Revert file |
| Add dispatch-action stubs at `internal.email.dispatch.*` (W4 scaffolds, W7 replaces bodies) | Additive | Revert stubs; schedules log and no-op |
| Extend `exchangePublicTokenAction` to emit welcome dispatch | Additive (scheduled; non-blocking) | Revert call site; core exchange flow unchanged |
| Extend error-path mutations (`setItemErrorInternal`, `markNeedsReauthInternal`, `completeReauthAction`, `syncPlaidItemInternal`) to stamp/clear error-tracking fields | Additive field writes only | Revert patches; fields go unset and cron filter handles null as "never dispatched" |
| Convert `getConnectedBanks` and Settings > Institutions to consume `getItemHealth` | Refactor (compatible; shape extends prior shape) | Revert query return shape |

### 10.2 Rollback plan

Graphite restack to drop any PR in the stack. No database migration to reverse. No env var flip. No feature flag required: all new queries have no callers until the final UI-caller migration PR lands (Task W4.10).

### 10.3 Sequencing constraints for safe rollback

- Task W4.2 (schema fields + host-app `countActivePlaidItems` + dispatch stubs) must land before Task W4.7 (handler that writes fields and dispatches welcome / reconsent) and Task W4.5 (query that reads fields).
- Task W4.4 (errorTaxonomy module in component with `mapErrorCodeToReason`) must land before Task W4.5 (query uses it).
- Task W4.5 (queries) must land before Task W4.10 (UI callers consume them).
- Task W4.1 (test harness) must land before Task W4.9 (integration tests).
- Task W4.7 (webhook branches + exchangePublicTokenAction extensions + error-tracking stamp) and Task W4.11 (cron + lastDispatchedAt stamp + completeReauth clearance) are independent but both depend on Task W4.2's schema additions.

Plan Section codifies the Graphite stack order.

---

## 11. Deliverables

| File | Purpose | Status |
|---|---|---|
| [specs/W4-plaid-gap-closure.brainstorm.md](specs/W4-plaid-gap-closure.brainstorm.md) | Brainstorm output (6 decisions, 4 revisions, design sections) | Written, committed on `main` |
| [specs/W4-plaid-gap-closure.md](specs/W4-plaid-gap-closure.md) | This spec | Written in this session |
| [specs/W4-plaid-gap-closure.plan.md](specs/W4-plaid-gap-closure.plan.md) | Plan Handoff Header + 11 tasks + TDD-disciplined steps | Written in this session |
| [specs/W4-plaid-gap-closure.research.md](specs/W4-plaid-gap-closure.research.md) | 7 research tasks with verified findings and execution-phase prompts | Written in this session |

---

## 12. Questions This Spec Answered

Mapped one-to-one to master brief Section 8 W4's "Questions the spec must answer" list.

1. **Full coverage matrix.** Section 4. 7 NOT FOUND to 0 NOT FOUND; 5 real handlers plus 4 stubs; 11 pre-existing branches unchanged (regression-guarded).
2. **Full webhook handler matrix.** Section 4 (same table) plus per-handler behavior in Sections 6 and 8.2.
3. **Sync state machine states and transitions.** Section 6.4 derivation algorithm; Section 6.3 `ItemHealth` shape; Section 6.5 error-code-to-reason mapping; Section 6.3.1 handling of `deleting`.
4. **Re-consent UX.** Section 8 (contract) plus Section 7 (host-app user-copy taxonomy). W4 publishes the contract; W1 builds the modal and banner; W7 renders the email.
5. **Backward compatibility plan.** Section 10 (all additive or shape-compatible refactors; Graphite restack for rollback; sequencing constraints enumerated).
6. **Test plan.** Section 9 (three tiers with file paths, case counts, and fixture strategy).

Additional questions answered beyond the master brief's enumeration:

7. **Investments MVP or follow-up.** Section 3.1 (deferred; stubs; research doc documents post-MVP criteria).
8. **Published-package recommendation.** Section 3.2 (retain `workspace:*`; research doc documents migration criteria).
9. **Error taxonomy.** Section 6.5 (component `reasonCode` mapping) plus Section 7 (host-app user-copy table).

---

**End of W4 spec.**

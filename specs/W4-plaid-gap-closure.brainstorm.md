# W4 Plaid Component Gap Closure: Brainstorm

**Milestone:** M3 Agentic Home
**Workstream:** W4 (Track A root per master brief Section 11)
**Phase:** 1 (`/brainstorm`) per master brief Section 0
**Author:** Claude (Obra Superpowers brainstorm session)
**Date:** 2026-04-20
**Inputs read:** [specs/00-master-prompt.md](specs/00-master-prompt.md) (full; Sections 1 through 8 focus for W4, Section 11 parallelization, Section 7 Plan Handoff Header format), [specs/W0-existing-state-audit.md](specs/W0-existing-state-audit.md) (full; Sections 1, 8, 9, 20 load-bearing for W4), [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), [packages/convex-plaid/CLAUDE.md](packages/convex-plaid/CLAUDE.md).
**Writing convention:** No em-dashes (repo rule). Colons, parentheses, semicolons, or fresh sentences instead.

---

## 1. Executive summary

W4 is a narrow, spec-only gap-closure workstream on the `@crowdevelopment/convex-plaid` 0.7.3 component and its host-app consumers. It closes every NOT FOUND webhook from W0 Section 9 (five with real handlers, four with documented log-only stubs), delivers a single rich sync-state query that retires the `plaidItems.status` duplication downstream callers currently work around, adds the minimum component-API surface required to support account-selection update-mode Link flow, publishes integration contracts for W1 (UI) and W7 (email), ships a Plaid-error-code-to-user-action taxonomy, and commits to a three-tier test plan (component unit plus host-app integration plus manual Sandbox smoke).

No source code is touched in W4. The deliverables are the spec, plan, and research docs plus this brainstorm. Implementation-phase execution follows the plan later in a dedicated worktree. All existing security properties (JWE at rest, ES256 JWT plus SHA-256 body-hash plus 5-minute window plus 24-hour dedup, circuit breaker) are preserved; schema changes are additive; no data migration required.

---

## 2. Master-prompt anchoring and W0 reconciliation

### 2.1 Master brief citations driving W4

- Section 8 W4 target state (lines 497 through 521 of [specs/00-master-prompt.md](specs/00-master-prompt.md)): full webhook coverage, investments decision, sync state machine as a Convex query (four states: `syncing | ready | error | re-consent-required`), item lifecycle resilience, error taxonomy, published-package recommendation, test fixture strategy.
- Section 7 (lines 278 through 318): Plan Handoff Header format the plan phase must populate.
- Section 6 (lines 218 through 274): Claude Code versus Codex delegation framework per task.
- Section 11 Track A (line 675): W4 is a Track A root, depends only on W0.

### 2.2 Reconciliation note on W0 Section 9 counts

The kickoff prompt summarized W0 Section 9 as "5 HANDLED, 1 NO-OP, 7 NOT FOUND." The committed Section 9 matrix at [specs/W0-existing-state-audit.md:303](specs/W0-existing-state-audit.md:303) actually shows 8 HANDLED, 2 INFORMATIONAL no-op (`INITIAL_UPDATE`, `HISTORICAL_UPDATE`), 1 LOGGED (`WEBHOOK_UPDATE_ACKNOWLEDGED`), and 7 NOT FOUND. The 7 NOT FOUND count is the invariant W4 closes (the handler-gap metric). The brainstorm proceeds against Section 9 text as authoritative; the count gloss in the kickoff prompt is noted here so the plan phase does not rediscover the delta.

### 2.3 Anchors in W0 that W4 must honor

- [specs/W0-existing-state-audit.md:34](specs/W0-existing-state-audit.md:34) gap-matrix row for W4: baseline, partial, and new-build enumeration.
- [specs/W0-existing-state-audit.md:303](specs/W0-existing-state-audit.md:303) webhook coverage matrix (authoritative for the seven NOT FOUND codes).
- [specs/W0-existing-state-audit.md:253](specs/W0-existing-state-audit.md:253) component-owned tables (11; no new tables in W4).
- [specs/W0-existing-state-audit.md:271](specs/W0-existing-state-audit.md:271) security surfaces (preserved, not changed).
- [specs/W0-existing-state-audit.md:788](specs/W0-existing-state-audit.md:788) mismatches 1 through 16 (W4-relevant: 4, 6, 11, 12, 15, 16).

---

## 3. Decisions made in this brainstorm (all locked)

### Q1. Investments coverage: defer to post-MVP

Accepted path A. Rationale: SmartPockets positioning is credit-card-focused per master brief Section 1 ("credit card power users who manage 10 to 30+ cards"). No W3 component, W5 mutation, or W6 intelligence feature depends on holdings or brokerage data. Master brief Section 3 already lists Plaid Signal, Income, Assets as out-of-MVP; investments follows the same logic. Deferring keeps W4 tight and leaves a clean extension path via the component README recipe at [packages/convex-plaid/CLAUDE.md:1037](packages/convex-plaid/CLAUDE.md:1037).

**Consequence.** `HOLDINGS:DEFAULT_UPDATE` and `INVESTMENTS_TRANSACTIONS:DEFAULT_UPDATE` become log-only stubs (verify signature, dedup, 200 OK, write `webhookLogs`, no scheduler call). No new schema tables, no new component actions, no new public queries. Research task 2 documents the decision rationale and lists post-MVP re-evaluation criteria.

### Q2. Package consumption model: keep `workspace:*`

Accepted path A. Rationale: W4 is gap closure, not architecture. Master brief Section 3 requires preserving the npm publish pipeline but does not mandate npm-first consumption. The `bun dev --filter=!@crowdevelopment/convex-plaid` accommodation and manual `cd packages/convex-plaid && bun run build` footgun are documented in [AGENTS.md:83](AGENTS.md:83) and [CLAUDE.md](CLAUDE.md). Migration buys dogfooding plus release discipline at the cost of a self-contained task that blocks nothing in W5 or W6.

**Consequence.** No package-model changes in W4. Research task 3 documents migration criteria for a post-MVP workstream.

### Q3. Sync-state query shape: rich health object

Accepted path B. Rationale: the user's kickoff flagged this as the deliverable downstream callers work around ([apps/app/src/app/(app)/dashboard/components/ConnectedBanks.tsx:88](apps/app/src/app/(app)/dashboard/components/ConnectedBanks.tsx:88) hits `bank.status === "needs_reauth"` directly; Settings > Institutions page does similar). Once a public query is defined for this surface, make it complete enough to retire every downstream duplication and feed W2's agent as a read-tool. `institutionName`, `institutionLogoBase64`, `institutionPrimaryColor` already live in the cached `plaidInstitutions` table with a 24-hour TTL per [specs/W0-existing-state-audit.md:269](specs/W0-existing-state-audit.md:269), so the join is cheap. Circuit-breaker state is load-bearing for the "retry automatic" UX and is a security property we are preserving.

**Consequence.** New public query `getPlaidItemHealth({ plaidItemId })` and batch `listPlaidItemHealth()`; exact field list in Section 5.3 below. Derivation table drives the `recommendedAction` enum used by W1 and W7.

### Q4. Handler semantics for the five remaining NOT FOUND webhooks

Accepted path A (adopt all five as proposed). Incremental cost per handler is low; the component-side `mode` parameter on `createUpdateLinkTokenAction` is a roughly 5-line addition and is the enabling hook for a complete "new accounts available" UX.

**Consequences** (per handler):
- `TRANSACTIONS:DEFAULT_UPDATE`: mirror the existing `SYNC_UPDATES_AVAILABLE` branch at [packages/backend/convex/http.ts:188](packages/backend/convex/http.ts:188); schedule `syncTransactionsInternal` plus `refreshAccountsAndSyncCreditCardsInternal` with the same 500 ms offset.
- `ITEM:LOGIN_REPAIRED`: **revised from the original proposal (see Section 4.1)**. Log-only; do not mutate status or schedule a resync. Rationale: the webhook fires rarely in practice; the dominant repair path is update-mode Link via `completeReauthAction`, which already resets status. `webhookLogs` captures occurrences for later empirical audit.
- `ITEM:NEW_ACCOUNTS_AVAILABLE`: stamp a new `plaidItems.newAccountsAvailableAt` timestamp; the sync-state query surfaces it as `recommendedAction: "reconnect_for_new_accounts"`; the component-side `createUpdateLinkTokenAction` gains `mode?: "reauth" | "account_select"`. The `account_select` mode passes `update.account_selection_enabled: true` to `/link/token/create`.
- `AUTH:*`: log-only. SmartPockets does not consume `/auth/get` in MVP.
- `IDENTITY:*`: log-only. The master brief's "identity coverage for display-name consistency" ask is deferred to post-MVP.

### Q5. Re-consent UX ownership: W4 owns data plus integration contract, W1 and W7 build

Accepted path A. Rationale: the whole point of the rich health object (Q3) is centralizing derivation. `recommendedAction` IS the integration contract; enumerating its firing rules and documenting call signatures for callers belongs with W4. Copy and layout belong to W1 and W7. Contract details in Section 5.4.

### Q6. Test fixture strategy: three-tier (component unit plus host-app integration plus manual Sandbox smoke)

Accepted path A. Rationale: webhook handlers are exactly the kind of code that silently rots (external events, slow-feedback failure modes). Recorded JWT-signed fixtures are deterministic and fast. Wiring `convex-test` for SmartPockets' `http.ts` is a one-time cost that also pays for W5 and W6 mutation tests. Manual Sandbox tier covers real JWT signature flow against Plaid's live keys. Details in Section 6.

---

## 4. Revisions to initial design captured during feedback

Four flags from Section 2 feedback have been applied.

### 4.1 `markItemRepairedInternal` dropped; `ITEM:LOGIN_REPAIRED` is log-only

The original proposal had `LOGIN_REPAIRED` trigger `markItemRepairedInternal` plus a full `syncPlaidItemInternal` fan-out. Flag: the webhook fires only when Plaid detects self-recovery without update-mode Link; most repairs happen via `exchangePublicToken` which already handles status reset. Applied: drop `markItemRepairedInternal` from the schema of new mutations; handler becomes log-only and writes to `webhookLogs`. If empirical data later shows meaningful fire rates, the mutation can be added as a post-MVP enhancement.

### 4.2 `clearNewAccountsAvailableInternal` has exactly one clearance site

The original proposal had an opportunistic "clear if next account sync returns a matching set" path. Flag: that races concurrent syncs and is fragile. Applied: clearance happens only after a successful update-mode `exchangePublicToken` for an existing `plaidItemId`. The banner persists until the user explicitly reconnects, which matches user expectation.

### 4.3 Derivation is ordered priority, not a grid

The original proposal showed a 2D grid and had `status === "error"` plus `circuit_breaker === "open"` mapping to `state: "error"` with per-taxonomy action (often `contact_support`). Flag: a transient condition under circuit-breaker-open should auto-retry (`wait`), not prompt the user for manual action (`contact_support`). Applied: the derivation is an ordered-priority algorithm where circuit-breaker-open wins over `status === "error"`. Algorithm in Section 5.3.2.

### 4.4 Document the 72-hour debounce versus daily cron cadence for `plaid.item.error_persistent`

A daily cron at `{ hourUTC: 3 }` plus a 72-hour per-item debounce produces an email on day 1, silence on days 2 and 3, email on day 4. Flag: correct behavior, but worth stating explicitly in W7's contract so QA does not flag the gap as a bug. Applied: the event contract row carries a QA note (Section 5.4.2).

---

## 5. Design (consolidated)

### 5.1 Scope and full webhook matrix

| Webhook | Current state | W4 action |
|---|---|---|
| `TRANSACTIONS:SYNC_UPDATES_AVAILABLE` | HANDLED | No change; confirm regression coverage in Tier 2 tests |
| `TRANSACTIONS:INITIAL_UPDATE` | INFORMATIONAL no-op | No change; document intent in spec |
| `TRANSACTIONS:HISTORICAL_UPDATE` | INFORMATIONAL no-op | No change; document intent in spec |
| `TRANSACTIONS:RECURRING_TRANSACTIONS_UPDATE` | HANDLED | No change; confirm regression coverage |
| `TRANSACTIONS:DEFAULT_UPDATE` | NOT FOUND | NEW: mirror `SYNC_UPDATES_AVAILABLE` (schedule `syncTransactionsInternal` plus `refreshAccountsAndSyncCreditCardsInternal`, 500 ms offset) |
| `LIABILITIES:DEFAULT_UPDATE` | HANDLED | No change; confirm regression coverage |
| `ITEM:ERROR` | HANDLED | No change; extend handler to clear `newAccountsAvailableAt` on transition back to `active` |
| `ITEM:PENDING_EXPIRATION` | HANDLED | No change |
| `ITEM:USER_PERMISSION_REVOKED` | HANDLED | No change |
| `ITEM:PENDING_DISCONNECT` | HANDLED | No change; confirm regression coverage |
| `ITEM:WEBHOOK_UPDATE_ACKNOWLEDGED` | LOGGED | No change |
| `ITEM:LOGIN_REPAIRED` | NOT FOUND | NEW: log-only (see 4.1) |
| `ITEM:NEW_ACCOUNTS_AVAILABLE` | NOT FOUND | NEW: stamp `plaidItems.newAccountsAvailableAt`; sync-state query surfaces `recommendedAction: "reconnect_for_new_accounts"` |
| `HOLDINGS:DEFAULT_UPDATE` | NOT FOUND | STUB: log-only (investments deferred per Q1) |
| `INVESTMENTS_TRANSACTIONS:DEFAULT_UPDATE` | NOT FOUND | STUB: log-only (investments deferred per Q1) |
| `AUTH:*` | NOT FOUND | STUB: log-only (ACH or bill-pay not in MVP) |
| `IDENTITY:*` | NOT FOUND | STUB: log-only (identity-driven display-name merge deferred to post-MVP) |

**Outcome.** 7 to 0 NOT FOUND. 5 close with real handlers. 4 close with documented log-only stubs. 8 HANDLED branches get regression-guard tests. The 2 INFORMATIONAL no-ops and 1 LOGGED branch are documented but not changed.

### 5.2 Schema additions

One field added to the component-owned `plaidItems` table. Additive and nullable, so no backfill is required.

| Field | Type | Purpose |
|---|---|---|
| `newAccountsAvailableAt` | `v.optional(v.number())` | Unix timestamp. Stamped by `ITEM:NEW_ACCOUNTS_AVAILABLE` handler. Cleared on subsequent update-mode `exchangePublicToken` for the same `plaidItemId`. |

No new tables. No new indexes required (the sync-state query filters by `userId` using the existing `by_user` index; see [packages/convex-plaid/src/component/schema.ts:22](packages/convex-plaid/src/component/schema.ts:22)).

### 5.3 Component-API additions and sync-state query

#### 5.3.1 Action and mutation additions

1. `createUpdateLinkTokenAction` gains `mode?: "reauth" | "account_select"`. Defaults to `"reauth"` (current behavior). When `"account_select"`, the Plaid `/link/token/create` call passes `update.account_selection_enabled: true`. No other change.
2. `setNewAccountsAvailableInternal` internal mutation. Takes `plaidItemId`, stamps `newAccountsAvailableAt = Date.now()`. Called by the `ITEM:NEW_ACCOUNTS_AVAILABLE` handler.
3. `clearNewAccountsAvailableInternal` internal mutation. Called exactly once: at the successful return of update-mode `exchangePublicToken` for an existing `plaidItemId`.
4. New public query `getPlaidItemHealth({ plaidItemId })` and batch `listPlaidItemHealth()`. Return shape in 5.3.2.

Names are placeholders; the plan phase finalizes them. No new action wrappers in the host app beyond what [packages/backend/convex/plaidComponent.ts](packages/backend/convex/plaidComponent.ts) already exposes for analogous surfaces.

#### 5.3.2 Sync-state query return shape

```
{
  plaidItemId: string,
  state: "syncing" | "ready" | "error" | "re-consent-required",
  isActive: boolean,
  institutionName: string | null,
  institutionLogoBase64: string | null,
  institutionPrimaryColor: string | null,
  lastSyncedAt: number | null,
  lastWebhookAt: number | null,
  errorMessage: string | null,
  circuitBreakerState: "closed" | "open" | "half_open",
  consecutiveErrors: number,
  nextRetryAt: number | null,
  newAccountsAvailableAt: number | null,
  recommendedAction:
    | "reconnect"
    | "reconnect_for_new_accounts"
    | "wait"
    | "contact_support"
    | null,
}
```

#### 5.3.3 Derivation algorithm (ordered priority)

```
getHealth(item):
  if item.status === "deleting":
    return filtered (hidden from list)
  if item.status === "needs_reauth":
    return { state: "re-consent-required", action: "reconnect" }
  if item.circuitBreakerState === "open":
    return { state: "error", action: "wait" }
  if item.status === "error":
    return { state: "error", action: errorTaxonomy(item.syncErrorReason) }
  if item.circuitBreakerState === "half_open":
    return { state: "syncing", action: null }
  if item.status === "pending" || item.status === "syncing":
    return { state: "syncing", action: null }
  if item.status === "active" && item.newAccountsAvailableAt != null:
    return { state: "ready", action: "reconnect_for_new_accounts" }
  if item.status === "active":
    return { state: "ready", action: null }
```

Circuit-breaker-open takes priority over `status === "error"`, so a transiently broken institution shows `wait` (auto-retry) rather than `contact_support` (manual user action). `needs_reauth` wins above breaker state because update-mode Link is a user action that does not benefit from automatic retry.

### 5.4 Re-consent integration contract

#### 5.4.1 Contract for W1 (UI layer)

- Chat agent read-tool `get_plaid_health({ plaidItemId? })` wraps `getPlaidItemHealth` and `listPlaidItemHealth`. W2 adds to its tool registry; W4 spec publishes the contract only.
- Dashboard `ConnectedBanks.tsx` banner and Settings > Institutions page consume `listPlaidItemHealth()` and render CTAs keyed on `recommendedAction`:
  - `reconnect`: "Reconnect to {institutionName}" button; opens `useUpdatePlaidLink({ mode: "reauth" })`.
  - `reconnect_for_new_accounts`: "Update accounts at {institutionName}" button; opens `useUpdatePlaidLink({ mode: "account_select" })`.
  - `wait`: disabled state; surfaces `nextRetryAt` as "Retrying in ...".
  - `contact_support`: deep link to a help route; carries `errorMessage` as context.
- Chat UI re-consent modal: subscribes via `useQuery` to `listPlaidItemHealth`. When any item transitions to `state === "re-consent-required"` during a chat session, render the Plaid Re-Consent Modal with `plaidItemId` preselected. W1 owns modal layout and copy; W4 spec publishes only the subscription semantics.

#### 5.4.2 Contract for W7 (email layer)

| Event | Trigger | Payload | Cadence | QA note |
|---|---|---|---|---|
| `plaid.item.needs_reauth` | Webhook transition `active -> needs_reauth` (any reason including `ITEM_LOGIN_REQUIRED` and `PENDING_EXPIRATION`) | `{ userId, plaidItemId, institutionName, reason, reconnectUrl }` | Immediate; deduped 24 h per `plaidItemId` | Second `needs_reauth` within 24 h must not re-send; W7 QA should set a fixture that triggers twice in a single day and confirm the second send is suppressed |
| `plaid.item.error_persistent` | Daily cron at `{ hourUTC: 3, minuteUTC: 0 }` scans items with `status === "error"` AND `lastSyncedAt < now() minus 24h` | `{ userId, plaidItemId, institutionName, errorCode, errorMessage }` | Max once per item per 72 h | Expected cadence for an item in persistent error: email day 1, silent days 2 and 3, email day 4; W7 template QA should exercise this pattern so the gap is not flagged as a bug |

`ITEM:NEW_ACCOUNTS_AVAILABLE` gets UI banner only. The master brief's seven MVP email templates (Section 8 W7, lines 588 through 596) do not list "new accounts available." W4 records the decision; W7 or a later milestone can wire the event if ever required. The integration hook is already present via `getPlaidItemHealth`.

### 5.5 Error taxonomy (summary)

Full taxonomy lives in the spec. The summary mapping:

| Error code | Transient? | `state` | `recommendedAction` | User message |
|---|---|---|---|---|
| `ITEM_LOGIN_REQUIRED` | No | re-consent-required | reconnect | "{institution} needs you to re-enter your credentials." |
| `USER_SETUP_REQUIRED` | No | re-consent-required | reconnect | "{institution} needs additional setup at your bank. Please reconnect." |
| `INVALID_ACCESS_TOKEN` | No | error | contact_support | "Your connection to {institution} is broken. Remove and re-add it." |
| `ITEM_NOT_FOUND` | No | error | contact_support | "This connection to {institution} can no longer be found. Remove and re-add it." |
| `NO_ACCOUNTS` | No | error | contact_support | "No eligible accounts were found at {institution}." |
| `PRODUCTS_NOT_SUPPORTED` | No | error | contact_support | "{institution} does not support the features SmartPockets uses." |
| `ACCESS_NOT_GRANTED` | No | error | contact_support | "Access was denied during connection. Reconnect and grant access to all needed data." |
| `INSTITUTION_DOWN` | Yes | error (breaker-open supersedes to `wait`) | contact_support fallback if breaker closed | "{institution} is temporarily unreachable. We will retry automatically." |
| `INSTITUTION_NOT_RESPONDING` | Yes | same pattern | same | Same copy as `INSTITUTION_DOWN`. |
| `INSTITUTION_NO_LONGER_SUPPORTED` | No | error | contact_support | "{institution} is no longer supported by SmartPockets." |
| `RATE_LIMIT_EXCEEDED` | Yes | error; breaker-open supersedes to `wait` | wait via breaker | "Too many requests. We will retry shortly." |
| Any other / unknown | unknown | error | contact_support | "Something went wrong syncing {institution}. Contact support if it persists." |

Research task 5 audits every code recognized at [packages/convex-plaid/src/component/errors.ts](packages/convex-plaid/src/component/errors.ts) against this taxonomy and flags any unmapped codes with recommended classification.

---

## 6. Test plan (three tiers)

### 6.1 Tier 1: component unit tests

Location: `packages/convex-plaid/src/`, vitest plus convex-test. Extends the existing pattern in [packages/convex-plaid/src/component/circuitBreaker.test.ts](packages/convex-plaid/src/component/circuitBreaker.test.ts), [packages/convex-plaid/src/component/errors.test.ts](packages/convex-plaid/src/component/errors.test.ts), [packages/convex-plaid/src/component/encryption.test.ts](packages/convex-plaid/src/component/encryption.test.ts).

Cases:
- `createUpdateLinkTokenAction({ mode: "account_select" })` passes `update.account_selection_enabled: true` to the Plaid SDK mock.
- `setNewAccountsAvailableInternal` stamps `newAccountsAvailableAt`; `clearNewAccountsAvailableInternal` clears it.
- `getPlaidItemHealth` derivation: one test per branch of the ordered-priority algorithm (8 branches plus the `deleting` filter; 9 cases total).
- Error taxonomy: one test per row; unknown codes default to `contact_support`.

### 6.2 Tier 2: host-app integration tests

Location: new file `packages/backend/convex/__tests__/plaidWebhooks.test.ts`, vitest plus convex-test. One-time setup: wire `convex-test` for SmartPockets' `http.ts`; this investment also pays for W5 and W6 mutation tests.

Fixtures: recorded JWT-signed webhook payloads at `packages/backend/convex/__tests__/fixtures/plaid-webhooks/{code}.json`, captured once via Plaid Sandbox MCP (research task 7 validates coverage).

Cases (new handlers):
- `TRANSACTIONS:DEFAULT_UPDATE` fixture; verify `syncTransactionsInternal` plus `refreshAccountsAndSyncCreditCardsInternal` scheduled with the 500 ms offset.
- `ITEM:LOGIN_REPAIRED` fixture; verify log-only behavior (no status change, no scheduler call); `webhookLogs` row exists.
- `ITEM:NEW_ACCOUNTS_AVAILABLE` fixture; verify `setNewAccountsAvailableInternal` called; `plaidItems.newAccountsAvailableAt` stamped; `getPlaidItemHealth` returns `recommendedAction: "reconnect_for_new_accounts"`.
- `HOLDINGS:DEFAULT_UPDATE`, `INVESTMENTS_TRANSACTIONS:DEFAULT_UPDATE`, `AUTH:*`, `IDENTITY:*` fixtures; verify log-only and no scheduler calls.

Cases (regression guards for existing HANDLED branches):
- `TRANSACTIONS:SYNC_UPDATES_AVAILABLE`, `RECURRING_TRANSACTIONS_UPDATE`, `LIABILITIES:DEFAULT_UPDATE`, `ITEM:ERROR` (including the `ITEM_LOGIN_REQUIRED` sub-branch), `PENDING_EXPIRATION`, `USER_PERMISSION_REVOKED`, `PENDING_DISCONNECT`. Confirm current scheduler dispatch shape is unchanged.

Cases (cron and event contracts):
- Daily `plaid.item.error_persistent` cron: clock-manipulation test verifies day-1 email, days 2 and 3 silent, day 4 email.
- `plaid.item.needs_reauth` event: 24-hour dedup holds; second fire within the window is suppressed.

### 6.3 Tier 3: manual Sandbox smoke (implementation-phase acceptance checklist)

Executed during the plan's implementation phase, not during W4 itself. For each of 5 real handlers plus 4 stub handlers:
1. Plaid Sandbox MCP (`uvx mcp-server-plaid`) triggers the webhook against a sandbox item.
2. Convex dashboard logs confirm the full chain: `/webhooks-plaid` received, JWT verified, handler invoked, scheduler dispatched (or log-only), downstream sync complete.
3. `getPlaidItemHealth` reflects the expected state post-webhook.
4. Email fires confirmed in dev mode (Resend dashboard or the dev-mode log table) for the two new event contracts.

---

## 7. Research tasks (seven; full tasks land in `specs/W4-plaid-gap-closure.research.md`)

| # | Task | Locked? | Primary source |
|---|---|---|---|
| 1 | Confirm Plaid's current webhook inventory against W0 Section 9 matrix; flag any additions since 2026-04-20 | Fresh audit | Plaid API reference, Plaid Dashboard MCP |
| 2 | Investments MVP-or-defer rationale; document post-MVP re-evaluation criteria | Yes (Q1 A: defer) | Plaid investments docs, [packages/convex-plaid/CLAUDE.md:1037](packages/convex-plaid/CLAUDE.md:1037) |
| 3 | Published-package-vs-workspace consumption recommendation; document migration criteria | Yes (Q2 A: keep `workspace:*`) | Root `package.json`, `packages/convex-plaid/package.json`, bun docs |
| 4 | Liabilities deferred-interest field audit; verify `/liabilities/get` schema fully covered by existing tables | Verification only | Plaid liabilities API reference, Plaid Sandbox MCP |
| 5 | Error-code audit; map every code in [packages/convex-plaid/src/component/errors.ts](packages/convex-plaid/src/component/errors.ts) to the W4 taxonomy | Concrete gap check | Component source, Plaid error reference |
| 6 | `convex-test` harness feasibility for host-app `http.ts`; prototype fixture replay; verify jose 6.0 JWT validation works under the test runtime | Feasibility | `convex-test` README, existing `packages/convex-plaid/src/` tests |
| 7 | Plaid Sandbox MCP webhook simulation coverage for the 5 new codes; document manual curl-plus-JWT-sign fallback for any gaps | Capability audit | Plaid Sandbox MCP docs, Plaid `/sandbox/item/fire_webhook` |

---

## 8. Plan Handoff Header preview

Populated values for `specs/W4-plaid-gap-closure.plan.md` per master brief Section 7 format.

| Field | Value |
|---|---|
| Linear milestone | M3 Agentic Home |
| Linear sub-project | W4 plaid-gap-closure |
| Linear issues | Created at plan-phase start, one per task |
| Recommended primary agent | Claude Code (gap analysis, schema plus API plus derivation plus contracts); Codex (webhook handler boilerplate, fixture capture, test writing) |
| Required MCP servers | Convex, Plaid Sandbox, Plaid Dashboard, Graphite |
| Required read access | Repo only (no external template paths required for W4) |
| Prerequisite plans (must be merged) | W0 (complete on `main`) |
| Branch | `feat/agentic-home/W4-plaid-gap-closure` |
| Graphite stack parent | `main` (W4 is Track A root per master brief Section 11) |
| Worktree directory | `~/Developer/smartpockets-W4-plaid` |
| Estimated PRs in stack | 6 (schema plus field; component-API `mode` param; 5 webhook handlers in 1 or 2 PRs; sync-state query plus derivation; error taxonomy plus tests; cron plus email event contracts) |
| Review bot | CodeRabbit (mandatory) |
| Rollback plan | All changes additive (new nullable field, new query, new handlers on previously unhandled codes, log-only stubs). Graphite restack to drop any PR. No data migration required |
| Acceptance checklist | Tier 3 items in Section 6.3 inline at bottom of plan |

### 8.1 Agent delegation breakdown (per-task tag preview; the plan finalizes)

| Proposed task | Agent | Rationale |
|---|---|---|
| Add `newAccountsAvailableAt` field; run `cd packages/convex-plaid && bun run build` | Codex | Additive schema change plus the documented manual build step; zero ambiguity |
| Add `mode` param to `createUpdateLinkTokenAction` | Codex | 5-line signature addition plus Plaid SDK arg passthrough |
| Implement 5 new plus 4 stub webhook branches in [packages/backend/convex/http.ts](packages/backend/convex/http.ts) | Codex | Uniform pattern; existing precedent at [http.ts:188](packages/backend/convex/http.ts:188) |
| Implement `setNewAccountsAvailableInternal` plus `clearNewAccountsAvailableInternal` | Codex | CRUD-shape mutations |
| Implement `getPlaidItemHealth` plus `listPlaidItemHealth` plus the ordered-priority derivation | Claude Code | Architectural across joins, breaker state, taxonomy integration |
| Write the `errorTaxonomy` module | Claude Code | Design-heavy; cross-cutting with derivation and W1 user copy |
| Wire `convex-test` for host-app `http.ts` | Claude Code | One-time framework bring-up; unblocks W5 and W6 tests too |
| Capture JWT-signed webhook fixtures for 9 codes | Codex | Deterministic and repetitive |
| Write Tier 1 and Tier 2 tests per 6.1 and 6.2 | Codex | Well-specified per the test plan |
| Add daily `plaid.item.error_persistent` cron plus event contracts for W7 | Codex | Scheduled-function boilerplate |
| Update `ConnectedBanks.tsx` plus Settings > Institutions callers to consume `getPlaidItemHealth` | Codex | Mechanical; type-guarded by the new query shape |
| Cross-review per master brief Section 11 | Both | Codex PRs reviewed by Claude Code; Claude Code PRs reviewed by Codex; mandatory |

### 8.2 Build-and-ship constraints (surfaced from AGENTS.md plus CLAUDE.md)

- `bun dev --filter=!@crowdevelopment/convex-plaid` excludes the component; after any edit to `packages/convex-plaid/`, run `cd packages/convex-plaid && bun run build` manually. Every relevant task in the plan must call this out explicitly.
- Graphite stacked PRs only; no `git push` to feature branches; no `git add -A`.
- Atomic conventional commits; no `--no-verify`; no force pushes to shared branches.
- CodeRabbit must pass; cross-agent review required before merge.

---

## 9. Deliverables

Per master brief Section 10.

- `specs/W4-plaid-gap-closure.md` (authoritative spec; answers every "Questions the spec must answer" bullet from master brief Section 8 W4).
- `specs/W4-plaid-gap-closure.plan.md` (Plan Handoff Header plus per-task schemas, tests, commit sequences, agent tags).
- `specs/W4-plaid-gap-closure.research.md` (seven tasks with citations; no em-dashes).
- `specs/W4-plaid-gap-closure.brainstorm.md` (this document; retained per master brief Section 10).

---

## 10. Open questions for the `/plan` phase (non-blocking)

These do not block the brainstorm but must resolve during `/plan`.

1. Final names for `getPlaidItemHealth` versus `listPlaidItemHealth` versus a collection-API shape (for example `listPlaidItemHealth({ userId? })`). Align with existing component query naming in [packages/convex-plaid/src/component/public.ts](packages/convex-plaid/src/component/public.ts).
2. Final location and module name for the error taxonomy (`packages/convex-plaid/src/component/errorTaxonomy.ts` is a placeholder).
3. Whether `listPlaidItemHealth` returns cascaded data for items in `status === "deleting"` or filters them out at query time (leaning filter-out; confirm in plan).
4. Whether the new daily cron `plaid.item.error_persistent` sits in `packages/backend/convex/crons.ts` alongside existing crons or in its own module under `packages/backend/convex/notifications/`. Research task 1 touches `@convex-dev/workflow`; decide there.
5. Exact fixture recording script (research task 7 outcome drives this).

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| `convex-test` does not support host-app `http.ts` shape | Research task 6 prototypes early; fallback is Tier 3 manual Sandbox smoke as the only integration signal; the component unit tests still cover the mutations |
| Plaid Sandbox MCP cannot fire a required webhook code | Research task 7 identifies gaps; fallback is a signed-curl script checked into `packages/backend/convex/__tests__/fixtures/scripts/` |
| `createUpdateLinkTokenAction` `mode` param collides with future `account_selection_enabled` surface | Keep the enum narrow (`reauth` and `account_select` only); the component can extend when needed |
| Circuit breaker state desync with query (state cached at read time) | Query reads live `plaidItems` record; no cache layer; circuit breaker updates are mutation-observed; mitigated by design |
| Email-dedup logic interacts with Convex scheduler at-least-once semantics | W7 owns the idempotency layer via content hash; W4 event contract specifies the hash input to be `{ plaidItemId, eventName, dayBucket }` for `error_persistent` and `{ plaidItemId, eventName }` for `needs_reauth` within the 24-hour window |

---

---

## 12. Reconciliation appendix (2026-04-20)

Cross-spec reconciliation pass added the following W4 items. Canonical source: [specs/00-contracts.md](00-contracts.md).

### 12.1 Welcome-onboarding dispatch on first Plaid link (reconciliation M16)

W4 adds a dispatch call inside the host-app consumer action that completes `exchangePublicToken` successfully. Call target: `internal.email.dispatch.dispatchWelcomeOnboarding` (owned by W7 §3.3; canonical signature in contracts §15).

Pattern:

```ts
// Inside the host-app action (e.g., packages/backend/convex/plaidComponent.ts) after
// components.plaid.actions.exchangePublicToken returns successfully and the new
// plaidItems row lands. Wrap in ctx.scheduler.runAfter(0, ...) so the dispatch does
// not block the action's return to the UI.

const priorActiveCount = await ctx.runQuery(
  internal.users.countActivePlaidItems,
  { userId },
);
if (priorActiveCount === 1) {  // this item just landed, so == 1 means first-ever
  await ctx.scheduler.runAfter(0, internal.email.dispatch.dispatchWelcomeOnboarding, {
    userId,
    variant: "plaid-linked",
    firstLinkedInstitutionName: institutionName,
  });
}
```

Notes:
- `internal.users.countActivePlaidItems` is added as a W4 task (new internal query; counts `plaidItems` where `userId === userId && status !== "deleting"`).
- W7 owns the signup-only fallback cron (W7 §10.3) for users who never link a Plaid item.
- The welcome template is essential-tier; preference check bypassed but `idempotencyKey` on `{userId, "welcome-class"}` prevents double-send across both triggers.

Added to §8.1 task list: "Add `countActivePlaidItems` internal query + welcome dispatch call in `exchangePublicToken` success path. Agent: Codex. Rationale: straight addition to an existing action."

### 12.2 `AgentEmbeddingContract` deferred at MVP (reconciliation M3)

W2's `AgentEmbeddingContract` (W2 §2.3 + §3.5) is infra-only at MVP. W4 does **not** call `embedTransactionForRag` or `deleteTransactionFromRag` inside `syncTransactionsInternal` during M3.

Consequence for W4's plan:
- No new task to wire embedding calls into the sync path.
- Plan remains narrow gap-closure work.
- Post-M3, when `search_transactions` returns to the MVP surface, W4 opens a follow-up issue to wire the contract in a single PR touching only the two call-sites (one for insert, one for delete).

### 12.3 Idempotency layering gated on shared spike

W4's own idempotency surfaces (webhook dedup 24h via existing component logic, `emailEvents` inserts for reconsent and item-error) consume the shared idempotency policy documented in [specs/00-idempotency-semantics.md](00-idempotency-semantics.md). W4 plan does **not** block on the spike (W4 uses the existing webhook dedup from §4.4 and writes `emailEvents` rows whose dedup is handled by the unique `by_idempotencyKey` index regardless of strategy). Informational citation only.

### 12.4 Reconciliation table

| ID | Issue | Resolution |
|---|---|---|
| M3 | `AgentEmbeddingContract` consumer (W4) unaware | §12.2; defer embedding call-sites to post-M3. |
| M16 | Welcome trigger owner unclear | §12.1; W4 dispatches on first-ever successful `exchangePublicToken`. |
| M18 | `emailEvents` dispatch signatures for reconsent / item-error | W4's §5.4.2 event payloads match W7's `dispatchReconsentRequired` / `dispatchItemErrorPersistent` signatures in contracts §15. No W4 change; W7 already absorbed. |

Plan tasks added (for the `/plan` phase to formalize):
- New internal query `countActivePlaidItems`. Codex.
- Welcome dispatch call in `exchangePublicToken` success path. Codex.
- Cross-reference `dispatchReconsentRequired` / `dispatchItemErrorPersistent` signatures from contracts §15 during webhook-handler test setup. Codex.

---

**End of brainstorm. Ready for user review before `/plan` phase.**

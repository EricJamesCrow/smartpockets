# W6: SmartPockets Intelligence Features (Spec)

**Milestone:** M3 Agentic Home (to be created)
**Workstream:** W6 Intelligence Features
**Phase:** /plan output, spec component
**Author:** Claude Opus 4.7
**Date:** 2026-04-20
**Source documents:** [specs/W6-intelligence.brainstorm.md](W6-intelligence.brainstorm.md) (decisions log + algorithms), [specs/00-contracts.md](00-contracts.md) (single source of truth where it disagrees with any brainstorm), [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) (spike that gates dispatch wiring), [specs/W0-existing-state-audit.md](W0-existing-state-audit.md) (current codebase baseline).
**Writing convention:** No em-dashes.

---

## 1. Goal

Ship five proactive and analytical capabilities for SmartPockets, plus the producer half of the W6 to W7 notification pipeline:

1. **Promo countdown tracker.** Daily refresh; agent-readable; emails at 30, 14, 7, 1 days before expiration.
2. **Statement closing reminder.** Daily refresh; agent-readable for the next seven days; emails at 3 and 1 days.
3. **Anomaly detection.** Hourly watermarked scan over `plaidTransactions`; three rules; one event per detection.
4. **Subscription detection.** Daily Plaid sync plus catch-up over `plaidTransactions`; user confirmation surface.
5. **Cashflow forecast.** Daily 30-day projection from depository balances, statement-due outflows, confirmed subscriptions, and recurring income.

Plus W6 owns the producer-side of the notification handoff: it inserts trigger context and starts named workflows. W7 owns the workflow definitions, shared steps, template renderers, and Resend dispatch (per [contracts §9](00-contracts.md), §15).

---

## 2. In scope and out of scope

### 2.1 In scope (this spec)

- Six new Convex Ents tables: `promoCountdowns`, `statementReminders`, `anomalies`, `anomalyScanState`, `detectedSubscriptions`, `cashflowForecasts`.
- Six new scheduled functions: hourly anomaly scan; daily 07:00, 07:05, 07:10, 07:15, 07:20 UTC; weekly Sunday digest assemble.
- One event-driven recompute hook on `promoRates` mutations.
- Five direct UI mutations for user-status toggles on subscriptions and anomalies (per [contracts §16](00-contracts.md)).
- Five agent-readable Convex queries (one per output table; bind to W2's tool registry).
- One W4 schema snapshot test pinning the field shapes W6 reads.
- One file patch to `agent/tools/read/getUpcomingStatements.ts` switching its data source to `statementReminders` (per [contracts §17](00-contracts.md)).
- Producer-side dispatch call sites (one per cron handler) that invoke W7's `internal.email.dispatch.dispatch*` actions. (BLOCKED on idempotency spike per §10 below.)

### 2.2 Out of scope (deferred to W6.1 or later)

- Per-user-tuned anomaly thresholds.
- Category-aware anomaly baselines.
- Quiet-hour suppression of anomaly emails.
- Variable-spend rolling-mean inclusion in cashflow forecast.
- Day-of-week or day-of-month seasonality in cashflow.
- Income anomaly detection on inflow streams.
- Free-trial-deadline detection.
- User-facing timezone configuration.
- Cross-card balance-transfer optimization hints.
- Plaid Investments inclusion in cashflow.

### 2.3 Must not regress

- Existing crons (02:00 UTC Daily Plaid Sync, 06:00 UTC Generate Statement Snapshots) continue to run unchanged. W6 cron entries append to [packages/backend/convex/crons.ts](../packages/backend/convex/crons.ts), they do not modify existing entries.
- `plaidRecurringStreams` public queries (`getActiveSubscriptions`, `getRecurringIncome`, `getSubscriptionsSummary`) at [packages/convex-plaid/src/component/public.ts:1209](../packages/convex-plaid/src/component/public.ts:1209) remain intact; W6 wraps and extends, does not deprecate.
- `creditCards.computeInterestSavingBalance` and `computeYtdFeesInterest` queries remain intact; W6 does not relocate ISB or YTD logic.

---

## 3. Architecture position

W6 sits in the orchestration layer (Convex actions, internal mutations, scheduled functions). It does not own UI, does not own templates, does not own the agent. W6 reads from W4-owned tables (`plaidRecurringStreams`, `plaidTransactions`, `plaidAccounts`, `plaidCreditCardLiabilities`) and SmartPockets-owned tables (`creditCards`, `promoRates`); it writes to its own six denormalized tables; it produces typed dispatch calls to W7 actions. W6 does not read `installmentPlans` directly (the card minimum payment already encompasses installment portions per [research §3.8](W6-intelligence.research.md#38-open-questions-not-blocking-w6-plan)).

```
[02:00 UTC Daily Plaid Sync]      [06:00 UTC Statement Snapshots]
       |                                  |
       v                                  v
   ┌──────────────────────────────────────────────────────────┐
   │                W6 Intelligence Jobs                      │
   │                                                          │
   │  07:00 daily   Promo Countdown Refresh                   │
   │  07:05 daily   Subscription Catch-up Scan (per item)     │
   │  07:10 daily   Statement Reminder Scan                   │
   │  07:15 daily   Cashflow Forecast Refresh                 │
   │  07:20 weekly  Weekly Digest Assemble (Sundays)          │
   │  xx:00 hourly  Anomaly Scan (watermarked)                │
   └──────────────────────────────────────────────────────────┘
            |                                       |
            v                                       v
   ┌────────────────────────┐         ┌────────────────────────┐
   │  emailEvents           │         │  W6 denormalized read  │
   │  (W7-owned table;      │         │  surface               │
   │   W6 inserts via       │         │  - promoCountdowns     │
   │   W7 dispatch actions) │         │  - statementReminders  │
   │                        │         │  - anomalies           │
   │   internal.email.      │         │  - detectedSubscriptions│
   │   dispatch.*           │         │  - cashflowForecasts   │
   └────────────────────────┘         └────────────────────────┘
            |                                  |
            v                                  v
   W7 Convex Workflows               W2 agent read tools
   (notifications/workflows/         (one query per table;
    send*)                            no expensive joins)
            |
            v
   Resend (production) or test bucket (dev gate inside W7)
```

---

## 4. Data model

Six new Ents tables in [packages/backend/convex/schema.ts](../packages/backend/convex/schema.ts). Conventions: amounts in dollars (matches `creditCards`); milliunit-to-dollar conversion happens at the read boundary (`plaidTransactions`, `plaidRecurringStreams`). Each table has `.edge("user")` so default queries naturally filter by viewer.

**`emailEvents` is NOT in this list.** It is W7-owned (per [contracts §9.1](00-contracts.md)). W6 references it only at the dispatch boundary.

### 4.1 `promoCountdowns`

One row per active promo. Refreshed daily plus on every `promoRates` mutation.

```ts
promoCountdowns: defineEnt({
  promoRateId: v.id("promoRates"),
  creditCardId: v.id("creditCards"),
  daysToExpiration: v.number(),                 // negative when past due
  effectiveDate: v.string(),                    // YYYY-MM-DD; userOverride wins
  sourceField: v.union(
    v.literal("override"),
    v.literal("plaid"),
    v.literal("manual"),
  ),
  originalExpirationDate: v.string(),
  isDeferredInterest: v.boolean(),
  remainingBalance: v.number(),
  accruedDeferredInterest: v.optional(v.number()),
  lastRefreshedAt: v.number(),
})
  .edge("user")
  .edge("creditCard")
  .index("by_user_daysToExpiration", ["userId", "daysToExpiration"])
  .index("by_promoRateId", ["promoRateId"]),
```

### 4.2 `statementReminders`

One row per active card with a `statementClosingDay` set, for the next seven days. Replaced daily.

```ts
statementReminders: defineEnt({
  creditCardId: v.id("creditCards"),
  statementClosingDate: v.string(),
  daysToClose: v.number(),                      // 0 to 7
  nextPaymentDueDate: v.optional(v.string()),
  minimumPaymentAmount: v.optional(v.number()),
  lastStatementBalance: v.optional(v.number()),
  lastRefreshedAt: v.number(),
})
  .edge("user")
  .edge("creditCard")
  .index("by_user_daysToClose", ["userId", "daysToClose"])
  .index("by_creditCardId", ["creditCardId"]),
```

### 4.3 `anomalies`

One row per (transaction, ruleType) pair. A transaction can be flagged by multiple rules.

```ts
anomalies: defineEnt({
  plaidTransactionId: v.string(),
  ruleType: v.union(
    v.literal("amount_spike_3x"),
    v.literal("new_merchant_threshold"),
    v.literal("duplicate_charge_24h"),
  ),
  score: v.number(),
  evidenceJson: v.string(),
  merchantName: v.string(),
  amount: v.number(),
  transactionDate: v.string(),
  detectedAt: v.number(),
  userStatus: v.union(
    v.literal("pending"),
    v.literal("acknowledged"),
    v.literal("dismissed_false_positive"),
  ),
  userStatusUpdatedAt: v.optional(v.number()),
})
  .edge("user")
  .index("by_user_detectedAt", ["userId", "detectedAt"])
  .index("by_plaidTransactionId_ruleType", ["plaidTransactionId", "ruleType"]),
```

### 4.4 `anomalyScanState`

Bookkeeping for hourly watermarked scan. One row per user.

```ts
anomalyScanState: defineEnt({
  lastScannedAt: v.number(),
  lastScannedTransactionDate: v.string(),
  skippedNullMerchantCount: v.number(),
})
  .edge("user")
  .index("by_userId", ["userId"]),
```

### 4.5 `detectedSubscriptions`

Hybrid source (Plaid plus catch-up). User confirmation state lives here.

```ts
detectedSubscriptions: defineEnt({
  normalizedMerchant: v.string(),
  amountBucket: v.number(),                     // dollars rounded to nearest $0.50
  frequency: v.union(
    v.literal("weekly"),
    v.literal("biweekly"),
    v.literal("monthly"),
    v.literal("quarterly"),
    v.literal("annual"),
  ),
  averageAmount: v.number(),
  nextPredictedDate: v.optional(v.string()),
  source: v.union(v.literal("plaid"), v.literal("catchup")),
  plaidStreamId: v.optional(v.string()),
  sampleTransactionIds: v.array(v.string()),
  firstSeenDate: v.string(),
  lastSeenDate: v.string(),
  occurrenceCount: v.number(),
  userStatus: v.union(
    v.literal("pending"),
    v.literal("confirmed"),
    v.literal("dismissed"),
  ),
  userStatusUpdatedAt: v.optional(v.number()),
  nickname: v.optional(v.string()),
  isActive: v.boolean(),
})
  .edge("user")
  .index("by_user_userStatus", ["userId", "userStatus"])
  .index("by_user_normalizedMerchant_amountBucket",
    ["userId", "normalizedMerchant", "amountBucket"]),
```

### 4.6 `cashflowForecasts`

One row per user, replaced daily.

```ts
cashflowForecasts: defineEnt({
  horizonStartDate: v.string(),
  horizonEndDate: v.string(),
  startingBalance: v.number(),
  projectedNetCash: v.number(),
  endingBalance: v.number(),
  lineItemsJson: v.string(),
  generatedAt: v.number(),
})
  .edge("user")
  .index("by_userId", ["userId"]),
```

`lineItemsJson` element shape (must match W7's payload type for `dispatchWeeklyDigest`):

```ts
type CashflowLineItem = {
  date: string;
  type: "statement_due" | "subscription" | "recurring_income";
  amount: number;       // signed; negative = outflow
  label: string;
  sourceId: string;
};
```

---

## 5. Algorithms

Authoritative algorithm specs live in [the brainstorm §4](W6-intelligence.brainstorm.md#4-algorithms). Summarized here for spec discoverability; the plan tasks reference the brainstorm for full pseudocode.

### 5.1 Promo countdown

For each `promoRates` where `isActive = true`:

- `effectiveDate = userOverrides.expirationDate ?? expirationDate`
- `sourceField = userOverrides.expirationDate ? "override" : (isManual ? "manual" : "plaid")`
- `daysToExpiration = daysBetween(today, effectiveDate)`
- Upsert by `promoRateId`. Delete row when `promoRates.isActive` flips false.

Emails fire at `daysToExpiration ∈ {30, 14, 7, 1}`.

### 5.2 Statement reminder

For each `creditCards` where `isActive && statementClosingDay != null`:

- For each `n ∈ [0..7]`, compute `nextOccurrenceOfDayInMonth(statementClosingDay, today + n days)`.
- Upsert one row per `creditCardId` with the smallest non-negative `daysToClose` and matching `statementClosingDate`.

Emails fire at `daysToClose ∈ {3, 1}`.

### 5.3 Anomaly detection (three rules)

Hourly watermarked scan. For each user, query `plaidTransactions` where `date >= anomalyScanState.lastScannedTransactionDate`. Skip refunds (`amount < 0`), pending (`pending: true`), null-merchant transactions, and exclusion categories (`LOAN_PAYMENTS`, `RENT_AND_UTILITIES`, `TRANSFER_IN`, `TRANSFER_OUT`). The brainstorm originally listed `RENT`; the [research §2.2](W6-intelligence.research.md#22-exclusion-category-enum-confirmation) correction confirms Plaid PFC v2 uses the longer string.

- **`amount_spike_3x`:** ≥ 3 prior transactions at same merchant in last 90 days; `amount > 3 * mean`.
- **`new_merchant_threshold`:** 0 prior transactions at merchant in last 365 days; `amount > 200`.
- **`duplicate_charge_24h`:** another transaction at same merchant, exact dollar amount, within ±24 hours.

Update watermark; insert one event per anomaly via W7 dispatch.

### 5.4 Subscription detection (Plaid plus catch-up)

Daily; per-`plaidItem` fan-out.

**Plaid step:** read `plaidRecurringStreams` where `status === "MATURE" && type === "outflow"`. Upsert each into `detectedSubscriptions` keyed by `(userId, normalizedMerchant, amountBucket)`. Preserve `userStatus`, `nickname`. Set `isActive: false` on rows whose Plaid stream is gone or moved to TOMBSTONED.

**Catch-up step:** group `plaidTransactions` (last 180 days, posted, non-null merchant) by `(normalizedMerchant, amountBucket)`. Filter to ≥ 3 occurrences. Compute median interval; bucket into `weekly | biweekly | monthly | quarterly | annual` if within tolerance. Skip if a Plaid-source row exists for the same key. Upsert with `source: "catchup"`.

After both steps: fire one per-user-per-day event listing newly added catchup-source rows (subscription_detected dispatch).

Merchant normalize spec: see [brainstorm §4.4.4](W6-intelligence.brainstorm.md#444-normalizemerchantname-specification).

### 5.5 Cashflow forecast (A approach, per [brainstorm §4.5](W6-intelligence.brainstorm.md#45-cashflow-forecast-a-approach-defined-verbatim))

Inputs: `plaidAccounts.balances.current` for `type === "depository"` (USD only), `creditCards.nextPaymentDueDate` plus `minimumPaymentAmount`, confirmed `detectedSubscriptions` outflows, MATURE inflow `plaidRecurringStreams`.

Compute `lineItems` over today through today + 30 days. `projectedNetCash = sum(amounts)`. `endingBalance = startingBalance + projectedNetCash`. Upsert one row per user. UI disclaimer: "Excludes variable spend."

---

## 6. Cron schedule

Six new entries in [packages/backend/convex/crons.ts](../packages/backend/convex/crons.ts). Each handler fans out per user (or per `plaidItem` for subscription catch-up) via `ctx.scheduler.runAfter(0, ...)`, mirroring the existing `syncAllActiveItemsInternal` pattern at [packages/backend/convex/plaidComponent.ts:562](../packages/backend/convex/plaidComponent.ts:562).

| Cron name | Cadence | Handler |
|---|---|---|
| Anomaly Scan | hourly at minute 0 | `internal.intelligence.anomalies.scan.scanAllUsersInternal` |
| Promo Countdown Refresh | daily 07:00 UTC | `internal.intelligence.promoCountdowns.refresh.refreshAllInternal` |
| Subscription Catch-up Scan | daily 07:05 UTC | `internal.intelligence.subscriptions.scan.scanAllUsersInternal` |
| Statement Reminder Scan | daily 07:10 UTC | `internal.intelligence.statementReminders.scan.scanAllInternal` |
| Cashflow Forecast Refresh | daily 07:15 UTC | `internal.intelligence.cashflow.refresh.refreshAllInternal` |
| Weekly Digest Assemble | weekly Sundays 07:20 UTC | `internal.intelligence.weeklyDigest.assemble.assembleAllUsersInternal` |

Verify `crons.weekly` signature against installed Convex version during plan execution; fall back to `crons.cron("Weekly Digest Assemble", "20 7 * * 0", ...)` if signature differs.

**Event-driven recompute (non-cron):** [packages/backend/convex/promoRates/mutations.ts](../packages/backend/convex/promoRates/mutations.ts) gains a trailing `ctx.scheduler.runAfter(0, internal.intelligence.promoCountdowns.refresh.refreshOneInternal, { promoRateId })` after every mutation that changes `expirationDate`, `userOverrides.expirationDate`, `isActive`, or hard-deletes.

---

## 7. Workflow contract with W7 (cite [contracts §15](00-contracts.md))

W6 cron handlers, after their upsert work, call W7's typed dispatch actions. Each action is Zod-validated at the W7 internal-action boundary. W7 internally inserts `emailEvents` rows and starts the matching workflow.

| W6 trigger | W7 dispatch action | Template |
|---|---|---|
| Promo countdown threshold (30/14/7/1 days) | `internal.email.dispatch.dispatchPromoWarning` | `promo-warning` |
| Statement reminder threshold (3/1 days) | `internal.email.dispatch.dispatchStatementReminder` | `statement-closing` |
| Anomaly detected | `internal.email.dispatch.dispatchAnomalyAlert` (per anomaly; W7 workflow coalesces 15 min) | `anomaly-alert` |
| Subscription catch-up scan completes | `internal.email.dispatch.dispatchSubscriptionDigest` | `subscription-detected` |
| Weekly digest assemble | `internal.email.dispatch.dispatchWeeklyDigest` | `weekly-digest` |

Per-call shape consolidation (W6 side):

- Promo and statement: W6 consolidates multiple promos / cards per user per cadence into one dispatch call with array payload.
- Anomaly: W6 sends one dispatch call per `anomalies` row; W7 workflow coalesces.
- Subscription digest: W6 sends one dispatch call per user per day with array of newly catch-up-detected subscriptions.
- Weekly digest: W6 sends one dispatch call per user per Sunday with assembled payload.

**Dispatch call sites are BLOCKED on the idempotency spike.** See §10.

---

## 8. Agent tool integration surface (W6 to W2)

W6 provides Convex queries; W2 registers them as agent tools (see [contracts §2](00-contracts.md) for the 25-tool registry). All queries use `ctx.viewerX()` per AGENTS.md.

| W2 tool name | W6 query | Reads from | Notes |
|---|---|---|---|
| `list_deferred_interest_promos` | `intelligence.promoCountdowns.queries.listForViewer` | `promoCountdowns` joined with `promoRates.description` | Sorted by `daysToExpiration` asc; default limit 20 |
| `list_upcoming_statements` (W2 owns; W6 patches data source) | `intelligence.statementReminders.queries.listForViewer` | `statementReminders` | Filter `daysToClose <= 7`; per [contracts §17](00-contracts.md), W6 ships the patch to `agent/tools/read/getUpcomingStatements.ts` in this stack |
| `list_anomalies` | `intelligence.anomalies.queries.listForViewer` | `anomalies` | Args: `{ status?: "pending" \| "all", limit? }`; default `pending`, sorted desc |
| `list_subscriptions` | `intelligence.subscriptions.queries.listForViewer` | `detectedSubscriptions` | Args: `{ status?: "pending" \| "confirmed" \| "dismissed" \| "all" }`; default `confirmed` |
| `get_cashflow_forecast` | `intelligence.cashflow.queries.getForViewer` | `cashflowForecasts` | Returns full row plus parsed `lineItems` array |

Each query has a return validator (per AGENTS.md Required Validators). W3 generative components consume returned shapes directly.

### 8.1 Direct UI mutations (per [contracts §16](00-contracts.md))

These are NOT propose/confirm/execute; they are direct mutations on single user-status fields. The agent surfaces them via tool-hint turns; W3 calls them directly from chat UI, not through `agentProposals`.

| Mutation | Patches |
|---|---|
| `api.intelligence.subscriptions.confirm({ subscriptionId })` | `userStatus: "confirmed"`, `userStatusUpdatedAt: now()` |
| `api.intelligence.subscriptions.dismiss({ subscriptionId })` | `userStatus: "dismissed"`, `userStatusUpdatedAt: now()` |
| `api.intelligence.subscriptions.setNickname({ subscriptionId, nickname })` | `nickname` |
| `api.intelligence.anomalies.acknowledge({ anomalyId })` | `userStatus: "acknowledged"`, `userStatusUpdatedAt: now()` |
| `api.intelligence.anomalies.dismiss({ anomalyId })` | `userStatus: "dismissed_false_positive"`, `userStatusUpdatedAt: now()` |

Each mutation derives `userId` from `ctx.viewerX()`, asserts ownership of the target row, returns `v.null()`.

---

## 9. W4 contract (read-only) and schema snapshot test

W6 reads from W4-owned tables. Fields enumerated in [brainstorm §8.1](W6-intelligence.brainstorm.md#81-fields-w6-reads-from-w4-owned-tables).

`packages/backend/convex/__tests__/snapshots/w4-schema.snap.ts` pins the exact field shapes for `plaidRecurringStreams`, `plaidTransactions`, `plaidAccounts`, `plaidCreditCardLiabilities`. CI fails on rename, removal, or type change to a field W6 reads, until the snapshot is explicitly updated. Forces W4 to acknowledge cross-workstream break.

Status enum pin (validated in same snapshot or a sibling test):

- `plaidRecurringStreams.status` includes `"MATURE"`, `"EARLY_DETECTION"`, `"TOMBSTONED"`.
- `plaidRecurringStreams.type` includes `"inflow"`, `"outflow"`.
- `plaidTransactions.categoryPrimary` includes `"LOAN_PAYMENTS"`, `"RENT_AND_UTILITIES"`, `"TRANSFER_IN"`, `"TRANSFER_OUT"` (per Plaid PFC v2; see [research §2.2](W6-intelligence.research.md#22-exclusion-category-enum-confirmation)).
- `plaidAccounts.type` includes `"depository"`.

---

## 10. Idempotency spike dependency

[specs/00-idempotency-semantics.md](00-idempotency-semantics.md) Section 4 must be populated before W6's dispatch call sites are wired. Specifically:

- `idempotencyKey` shape and whether SmartPockets per-trigger strings (e.g., `promo:{promoRateId}:warning:7d:{effectiveDate}`) pass through verbatim, are hashed via a shared utility, or are replaced by `@convex-dev/resend` component-managed keys.
- Whether `agentProposals.contentHash` (W5) and `emailEvents.idempotencyKey` (W7) share a hash function in `packages/backend/convex/agent/hashing.ts` (or `notifications/hashing.ts`).
- Strategy A, B, or C from spike §3 picks the shape of W6's dispatch call sites (whether W6 supplies the key or W7 derives it).

W6 ships everything except dispatch wiring while the spike runs. The unblocked work (schema, algorithms, queries, mutations, cron registrations with placeholder dispatch comments) lands as PRs W6.1 through W6.11. The dispatch wiring lands as W6.12 once the spike completes.

---

## 11. Acceptance criteria

W6 is acceptance-complete when:

1. All six new tables exist in [packages/backend/convex/schema.ts](../packages/backend/convex/schema.ts) with declared edges and indexes.
2. W4 schema snapshot test runs in CI and fails on field renames; passing the snapshot requires W6 explicitly updating it.
3. Promo countdown daily refresh produces correct `promoCountdowns` rows for every active `promoRates` row in the dev deployment; `effectiveDate`, `sourceField`, `originalExpirationDate` correctly populated for synthetic test fixtures (Plaid-only, manual, override).
4. `promoRates` mutation hook fires `refreshOneInternal` and the row is updated within the same transaction-scheduler boundary.
5. Statement reminder daily scan produces correct `statementReminders` rows for every active card with `statementClosingDay` set; `daysToClose ∈ [0..7]`.
6. Anomaly hourly scan produces `anomalies` rows for every triggered rule; watermark advances correctly; refunds, pending, null-merchant, and excluded-category transactions are skipped.
7. Subscription daily scan: Plaid step ingests every MATURE outflow stream, catch-up step finds ≥ 3-occurrence groups, both upsert keyed by `(userId, normalizedMerchant, amountBucket)`, source field correct.
8. Cashflow daily refresh produces one row per user with `lineItems` containing statement-due, subscription, and recurring-income items in horizon.
9. Five direct UI mutations work end-to-end: a Convex test simulates each call from `viewerX()` and asserts the row patch.
10. Five agent-tool queries return shapes that pass W2's `ToolEnvelope` and W3's `ToolOutput` validators (per [contracts §4](00-contracts.md)). Use placeholder validation in W6 plan; W2 / W3 align in their plans.
11. `get_upcoming_statements.ts` patch in `agent/tools/read/` switches data source to `statementReminders`. (Depends on W2's plan having shipped the file.)
12. Six new cron entries appended to [packages/backend/convex/crons.ts](../packages/backend/convex/crons.ts); each handler runs successfully on the dev Convex deployment.
13. Once the idempotency spike lands and W6.12 ships, every cron handler successfully calls the matching W7 dispatch action and W7's `emailEvents` row appears with `status: "pending"` then `"sent"`.
14. `bun typecheck` passes; CodeRabbit clean on every PR; cross-agent review (Codex reviews Claude Code's PRs and vice versa) clean.

---

## 12. Questions this spec answered

Per master brief Section 8 W6 ("Questions the spec must answer"):

| Master brief question | Answered in section |
|---|---|
| Promo expiration field of record (Plaid liabilities fallback logic) | 5.1 (effectiveDate precedence: userOverride > Plaid; sourceField captures both) |
| Anomaly thresholds and false-positive mitigation | 5.3 (3x mean, $200 new-merchant, duplicate within 24h, hardcoded category exclusion); research findings in [research §2](W6-intelligence.research.md) |
| Subscription algorithm (fuzzy merchant normalization, interval tolerance) | 5.4 plus brainstorm §4.4.4 normalize spec; research findings in [research §1](W6-intelligence.research.md) |
| Forecast horizon and method | 5.5 (A approach: 30 days, depository starting balance, fixed obligations only); research in [research §3](W6-intelligence.research.md) |
| Which features are agent-surfaced vs email-only vs both | Section 4 (data tables) plus Section 7 (W7 contract) plus Section 8 (agent tools); every feature is both unless noted |
| Scheduled function cadences and batching for cost | Section 6 (cron table; per-user fan-out; hourly watermark for anomaly) |

Plus the contract-induced questions from the reconciliation pass:

| Reconciliation question | Answered in section |
|---|---|
| W6/W7 event log unification | Section 4 ("emailEvents is W7-owned") plus Section 7 |
| Subscription/anomaly mutation surface | Section 8.1 (direct mutations, not propose) |
| Anomaly coalesce ownership | Section 7 (W6 per-event; W7 workflow coalesces) |
| Workflow component install | Section 10 plus contracts §11 (W2 owns) |
| `get_upcoming_statements` data source | Section 8 plus contracts §17 (W6 patches in this stack) |

---

**End of W6 spec. Implementation tasks live in [specs/W6-intelligence.plan.md](W6-intelligence.plan.md). Research findings live in [specs/W6-intelligence.research.md](W6-intelligence.research.md).**

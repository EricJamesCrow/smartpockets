# W6: SmartPockets Intelligence Features (Brainstorm)

**Milestone:** M3 Agentic Home (to be created)
**Workstream:** W6 Intelligence Features
**Phase:** /brainstorm output (Obra Phase 1)
**Author:** Claude (Opus 4.7)
**Date:** 2026-04-20
**Inputs reviewed:** specs/00-master-prompt.md (Sections 1-7, 11, W6 in Section 8); specs/W0-existing-state-audit.md (Sections 1, 5, 8, 10, 20); AGENTS.md; CLAUDE.md; packages/backend/convex/crons.ts; packages/backend/convex/schema.ts (promoRates, installmentPlans); packages/convex-plaid/src/component/public.ts (recurring stream queries); /Users/itsjusteric/Developer/mantraseeds (Medusa workflows + Resend pattern, used as a model for the W6 to W7 contract).
**Status:** Pending Eric's review before transition to /plan.
**Writing convention:** No em-dashes. Use colons, semicolons, parentheses, fresh sentences.

---

## 0. Executive summary

W6 ships five proactive and analytical capabilities (promo countdowns, statement reminders, anomaly detection, subscription detection, cashflow forecast), seven new Convex Ents tables (five intelligence outputs, one bookkeeping table for anomaly watermarks, one shared event log for the W6/W7 notification handoff), six new scheduled-function entries (one hourly, four daily at 07:00 UTC staggered by five minutes, one weekly Sunday), one event-driven recompute hook on `promoRates` mutations, and the producer half of a Convex Workflow based notification pipeline that mirrors the mantraseeds Medusa-Workflows-plus-Resend pattern.

W6 reads from W4-owned tables (`plaidRecurringStreams`, `plaidTransactions`, `plaidAccounts`, `plaidCreditCardLiabilities`) and from the SmartPockets-owned tables `creditCards` (denormalized), `promoRates`, and `installmentPlans`. W6 does not touch the Plaid component source. W6 produces typed payloads for W7 and starts named workflows; W7 owns the workflow definitions, shared steps, template renderers, and Resend dispatch.

Three big design decisions, settled in dialogue:

1. **Subscription detection is hybrid:** Plaid's `plaidRecurringStreams` (status MATURE outflow) is the primary source; a daily catch-up scan over `plaidTransactions` fills the long tail Plaid misses or hasn't matured yet.
2. **Anomaly detection runs hourly on a watermark**, scanning only transactions inserted since the last successful run. Three rules at MVP: amount spike (3x rolling 90-day mean), new merchant above $200, duplicate charge within 24 hours. Hardcoded category exclusion suppresses routine debits.
3. **W6 to W7 hand-off uses Convex Workflow + a thin `notificationEvents` event log.** W6 inserts an event row with a deterministic `dedupKey`, then starts a workflow named for the event type. W7 owns the workflow, the steps, the template, and the Resend call. The event log gives idempotency without polling, and the workflow gives durability and observability.

---

## 1. Scope and goals

### 1.1 In scope (W6 MVP)

1. **Promo countdown tracker.** Daily refresh; agent-readable; emails at 30, 14, 7, 1 days before expiration. Field-of-record precedence: `promoRates.userOverrides.expirationDate` wins; otherwise `promoRates.expirationDate`. Each `promoCountdowns` row records `effectiveDate`, `sourceField`, and `originalExpirationDate` for auditability.
2. **Statement closing reminder tracker.** Daily refresh; one row per active card per upcoming closing date in the next seven days; emails at 3 and 1 days. Reads `creditCards.statementClosingDay`, `nextPaymentDueDate`, `minimumPaymentAmount`, `lastStatementBalance`.
3. **Anomaly detection.** Hourly watermarked scan over `plaidTransactions`. Three rules: `amount_spike_3x`, `new_merchant_threshold` (`> $200`), `duplicate_charge_24h`. Category exclusion list (`LOAN_PAYMENTS`, `RENT`, `TRANSFER_IN`, `TRANSFER_OUT`). Negative amounts (refunds), `pending: true`, and null `merchantName` skipped. Emails fire as one `notificationEvents` row per anomaly; W7 workflow coalesces.
4. **Subscription detection.** Daily scan: Plaid step plus catch-up step. Plaid step ingests MATURE outflow streams. Catch-up step groups `plaidTransactions` by normalized merchant and amount bucket; flags groups with three or more occurrences within tolerance. Source distinguishes `"plaid"` and `"catchup"`. User can confirm or dismiss via the agent (write-side mutation lives in W5).
5. **Cashflow forecast (A approach, defined verbatim in 4.5).** Daily 30-day projection from depository starting balance, statement-due outflows, confirmed-subscription outflows, recurring-income inflows. No variable spend.
6. **Notification event log and workflow producer half.** One new table (`notificationEvents`) plus the W6 call sites that insert rows and start named Convex Workflows.
7. **Schema snapshot test pinning W4 contract.** Vitest snapshot covering the exact field shapes for every W4-owned table W6 reads.

### 1.2 Out of scope (deferred to W6.1 or later)

- Per-user-tuned anomaly thresholds.
- Category-aware anomaly baselines (gas vs dining mean differ; MVP uses a single multiplier).
- Per-day historical cashflow projection (weekday-of-month seasonality, B and C cashflow approaches).
- Income anomaly detection on inflow streams.
- Cross-card balance-transfer optimization hints.
- Plaid Investments inclusion in cashflow (investments are not in W4 MVP per W0 Section 1).
- Voice or push notifications. Email only.
- User-facing timezone configuration. MVP runs all date math in UTC.
- Free-trial-deadline detection (mentioned in master brief Section 11; reuses subscription infra but not a separate W6 algorithm in MVP).

### 1.3 Must not regress

- Existing crons (02:00 UTC Daily Plaid Sync, 06:00 UTC Generate Statement Snapshots) must continue to run unchanged. W6 cron entries append to the existing `crons.ts` module.
- `plaidRecurringStreams` already has public queries (`getActiveSubscriptions`, `getRecurringIncome`, `getSubscriptionsSummary`) at [packages/convex-plaid/src/component/public.ts:1209+](packages/convex-plaid/src/component/public.ts:1209). W6 does not deprecate them; W6 builds atop them.
- `creditCards.computeInterestSavingBalance` and `creditCards.computeYtdFeesInterest` queries remain intact; W6 does not move ISB or YTD logic into intelligence.

---

## 2. Architecture overview

### 2.1 Layered position

W6 sits in the orchestration layer (Convex actions, internal mutations, scheduled functions). It does not own UI, does not own templates, does not own the agent. Inputs come from W4 (Plaid component plus `creditCards` denormalization). Outputs flow to W2 agent tools (read-side queries) and to W7 email workflows (event-log inserts plus workflow starts).

### 2.2 Data flow diagram

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
   │  notificationEvents    │         │  W6 denormalized read  │
   │  (insert + dedup)      │         │  surface for agent     │
   │       |                │         │  - promoCountdowns     │
   │       v                │         │  - statementReminders  │
   │   workflow.start(...)  │         │  - anomalies           │
   │                        │         │  - detectedSubscriptions│
   └────────────────────────┘         │  - cashflowForecasts   │
            |                         └────────────────────────┘
            v                                  |
   ┌────────────────────────┐                  v
   │  W7 Convex Workflow    │         W2 agent read tools
   │  (notifications/...)   │         (no joins; one query
   │  - sendPromoWarning    │          per denormalized table)
   │  - sendStatementRem    │
   │  - sendAnomalyAlert    │
   │    (waitFor 15m)       │
   │  - sendSubscriptionDigest│
   │  - sendWeeklyDigest    │
   └────────────────────────┘
            |
            v
   Resend (production) or test bucket (dev)
```

### 2.3 Feature catalog

| Feature | Input sources | Output table | Email triggers | Agent reads |
|---|---|---|---|---|
| Promo countdown | `promoRates`, `promoRates.userOverrides.expirationDate`, `creditCards.displayName` | `promoCountdowns` | 30, 14, 7, 1 days before `effectiveDate` | `list_deferred_interest_promos` |
| Statement reminder | `creditCards.statementClosingDay`, `nextPaymentDueDate`, `minimumPaymentAmount`, `lastStatementBalance` | `statementReminders` | 3, 1 days before `statementClosingDate` | `list_upcoming_statements` |
| Anomaly detection | `plaidTransactions` plus per-merchant rolling-90-day stats | `anomalies` (and `anomalyScanState` bookkeeping) | One event per `anomalies` row; W7 coalesces in 15-min window | `list_anomalies` |
| Subscription detection | `plaidRecurringStreams` (Plaid step) plus `plaidTransactions` (catch-up step) | `detectedSubscriptions` | One per-user batched event per day with array of new catch-up detections | `list_subscriptions` |
| Cashflow forecast | `plaidAccounts.balances.current` (depository), `creditCards.nextPaymentDueDate` plus `minimumPaymentAmount`, confirmed `detectedSubscriptions`, `plaidRecurringStreams` (income) | `cashflowForecasts` (one row per user) | None directly; included in weekly digest | `get_cashflow_forecast` |

---

## 3. Data model: seven new tables

All tables defined in `packages/backend/convex/schema.ts` using `defineEnt`. Amounts in dollars (matches `creditCards`, not `plaidTransactions` milliunits); conversions happen at the read boundary in subscription scan and cashflow refresh. All tables scoped via `.edge("user")` so default queries naturally filter by viewer.

### 3.1 `promoCountdowns`

Purpose: agent-readable countdown row per active promo. One row per `promoRates` row that has `isActive: true`. Refreshed by daily cron and on every `promoRates` mutation.

```ts
promoCountdowns: defineEnt({
  promoRateId: v.id("promoRates"),
  creditCardId: v.id("creditCards"),
  daysToExpiration: v.number(),                 // negative when past due
  effectiveDate: v.string(),                    // YYYY-MM-DD; userOverride wins
  sourceField: v.union(
    v.literal("override"),                      // userOverrides.expirationDate
    v.literal("plaid"),                         // promoRates.expirationDate (Plaid)
    v.literal("manual"),                        // promoRates.isManual
  ),
  originalExpirationDate: v.string(),           // pre-override Plaid date
  isDeferredInterest: v.boolean(),
  remainingBalance: v.number(),                 // dollars
  accruedDeferredInterest: v.optional(v.number()),
  lastRefreshedAt: v.number(),
})
  .edge("user")
  .edge("creditCard")
  .index("by_user_daysToExpiration", ["userId", "daysToExpiration"])
  .index("by_promoRateId", ["promoRateId"]),    // unique upsert key
```

Lifecycle: insert when `promoRates.isActive` flips true; update on every mutation; delete when `promoRates.isActive` flips false or the underlying promo is hard-deleted (cascade in `promoRates/mutations.ts`).

### 3.2 `statementReminders`

Purpose: agent-readable upcoming-statement row per active card, for the next seven calendar days. One row per `creditCardId`; row replaced daily.

```ts
statementReminders: defineEnt({
  creditCardId: v.id("creditCards"),
  statementClosingDate: v.string(),             // YYYY-MM-DD next occurrence
  daysToClose: v.number(),                      // 0..7; rows beyond 7 not stored
  nextPaymentDueDate: v.optional(v.string()),
  minimumPaymentAmount: v.optional(v.number()), // dollars
  lastStatementBalance: v.optional(v.number()), // dollars
  lastRefreshedAt: v.number(),
})
  .edge("user")
  .edge("creditCard")
  .index("by_user_daysToClose", ["userId", "daysToClose"])
  .index("by_creditCardId", ["creditCardId"]),  // unique upsert key
```

Lifecycle: daily cron upserts the smallest non-negative `daysToClose` for each active card. Cards with no `statementClosingDay` set are skipped. Rows are deleted when their card flips `isActive: false`.

### 3.3 `anomalies`

Purpose: agent-readable anomaly row per flagged transaction-rule pair. A transaction can be flagged by multiple rules and produce multiple rows.

```ts
anomalies: defineEnt({
  plaidTransactionId: v.string(),               // FK across component boundary
  ruleType: v.union(
    v.literal("amount_spike_3x"),
    v.literal("new_merchant_threshold"),
    v.literal("duplicate_charge_24h"),
  ),
  score: v.number(),                            // amount/mean for spike, $ for new, 1 for duplicate
  evidenceJson: v.string(),                     // JSON: rolling mean, prior count, pair ids
  merchantName: v.string(),
  amount: v.number(),                           // dollars
  transactionDate: v.string(),                  // YYYY-MM-DD
  detectedAt: v.number(),                       // epoch ms
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

Lifecycle: insert on detection; update only on user mutation via W5 propose tool. Prune job (weekly) hard-deletes rows with `userStatus !== "pending"` older than 90 days.

### 3.4 `anomalyScanState`

Purpose: bookkeeping for the hourly watermarked scan. One row per user.

```ts
anomalyScanState: defineEnt({
  lastScannedAt: v.number(),                    // epoch ms of last successful scan
  lastScannedTransactionDate: v.string(),       // YYYY-MM-DD high-water mark
  skippedNullMerchantCount: v.number(),         // ops counter, not user-visible
})
  .edge("user")
  .index("by_userId", ["userId"]),              // one row per user; index for upsert
```

### 3.5 `detectedSubscriptions`

Purpose: agent-readable subscription row per (normalized merchant, amount bucket). Hybrid source (Plaid plus catch-up). User confirmation state lives here.

```ts
detectedSubscriptions: defineEnt({
  normalizedMerchant: v.string(),               // see normalize spec in 4.4
  amountBucket: v.number(),                     // dollars rounded to nearest $0.50
  frequency: v.union(
    v.literal("weekly"),
    v.literal("biweekly"),
    v.literal("monthly"),
    v.literal("quarterly"),
    v.literal("annual"),
  ),
  averageAmount: v.number(),                    // dollars
  nextPredictedDate: v.optional(v.string()),    // YYYY-MM-DD
  source: v.union(v.literal("plaid"), v.literal("catchup")),
  plaidStreamId: v.optional(v.string()),        // null when source = catchup
  sampleTransactionIds: v.array(v.string()),    // first five evidence
  firstSeenDate: v.string(),
  lastSeenDate: v.string(),
  occurrenceCount: v.number(),
  userStatus: v.union(
    v.literal("pending"),
    v.literal("confirmed"),
    v.literal("dismissed"),
  ),
  userStatusUpdatedAt: v.optional(v.number()),
  nickname: v.optional(v.string()),             // user-set label
  isActive: v.boolean(),                        // false when Plaid moves to TOMBSTONED
})
  .edge("user")
  .index("by_user_userStatus", ["userId", "userStatus"])
  .index("by_user_normalizedMerchant_amountBucket",
    ["userId", "normalizedMerchant", "amountBucket"]),  // unique upsert
```

Lifecycle: Plaid step upserts with `source: "plaid"` (preserves prior `userStatus`); catch-up step upserts with `source: "catchup"` only if no Plaid row exists for the same key. Plaid step sets `isActive: false` on rows whose stream is no longer present in Plaid or moved to TOMBSTONED. Rows are never hard-deleted (preserves user history).

### 3.6 `cashflowForecasts`

Purpose: agent-readable 30-day projection. One row per user, replaced daily.

```ts
cashflowForecasts: defineEnt({
  horizonStartDate: v.string(),                 // YYYY-MM-DD; today
  horizonEndDate: v.string(),                   // start + 30 days
  startingBalance: v.number(),                  // sum of depository balances at refresh
  projectedNetCash: v.number(),                 // sum of line items
  endingBalance: v.number(),                    // starting + net
  lineItemsJson: v.string(),                    // JSON array, sorted by date asc
  generatedAt: v.number(),
})
  .edge("user")
  .index("by_userId", ["userId"]),              // one row per user
```

`lineItemsJson` element shape (also documented in `notifications/payloads.ts` so W7 can render the digest from the same shape):

```ts
type CashflowLineItem = {
  date: string;                                 // YYYY-MM-DD
  type: "statement_due" | "subscription" | "recurring_income";
  amount: number;                               // signed; negative = outflow
  label: string;                                // human-readable
  sourceId: string;                             // creditCardId | detectedSubscriptionId | plaidStreamId
};
```

### 3.7 `notificationEvents`

Purpose: event log and idempotency surface. W6 owns inserts; W7 owns updates (status, processedAt, attemptCount) from workflow steps.

```ts
notificationEvents: defineEnt({
  eventType: v.union(
    v.literal("promo_warning_30d"),
    v.literal("promo_warning_14d"),
    v.literal("promo_warning_7d"),
    v.literal("promo_warning_1d"),
    v.literal("statement_reminder_3d"),
    v.literal("statement_reminder_1d"),
    v.literal("anomaly_alert"),
    v.literal("subscription_detected"),
    v.literal("weekly_digest"),
    // W7 may add: "plaid_reconsent", "item_error_persistent"
  ),
  payload: v.any(),                             // typed via notifications/payloads.ts
  dedupKey: v.string(),                         // unique; idempotency surface
  workflowId: v.optional(v.string()),           // filled after workflow.start
  createdAt: v.number(),
  processedAt: v.optional(v.number()),          // W7 sets in final workflow step
  status: v.union(
    v.literal("pending"),
    v.literal("running"),
    v.literal("sent"),
    v.literal("skipped_pref"),
    v.literal("skipped_dedup"),
    v.literal("failed"),
  ),
  errorMessage: v.optional(v.string()),
  attemptCount: v.number(),                     // W7 increments on retry
})
  .edge("user")
  .index("by_dedupKey", ["dedupKey"])           // unique
  .index("by_status_createdAt", ["status", "createdAt"])
  .index("by_user_eventType_createdAt", ["userId", "eventType", "createdAt"]),
```

Lifecycle: W6 inserts with `status: "pending"`, `attemptCount: 0`. W7 workflow steps mutate the rest. Prune job retains 180 days.

---

## 4. Algorithms

### 4.1 Promo countdown

Inputs: every `promoRates` row where `isActive = true`.

Computation:

1. `effectiveDate = userOverrides.expirationDate ?? expirationDate`
2. `sourceField = userOverrides.expirationDate ? "override" : (isManual ? "manual" : "plaid")`
3. `originalExpirationDate = expirationDate`
4. `daysToExpiration = daysBetween(today, effectiveDate)` where today is UTC. Negative when past.
5. Upsert `promoCountdowns` keyed by `promoRateId`.

Email triggers: when `daysToExpiration ∈ {30, 14, 7, 1}`. Dedup key:

```
promo:{promoRateId}:warning:{n}d:{effectiveDate}
```

The `effectiveDate` segment ensures that a user override pushing the date back does not re-fire warnings the user already received for the prior date.

Edge cases:

- Card soft-deleted: `promoRates` cascade to `isActive: false`; daily refresh removes the countdown row.
- Override removed (cleared back to null): re-evaluate using Plaid date; new dedup key segment (`effectiveDate` changes); a fresh warning fires only if the new effectiveDate puts the promo into a new bucket.
- Promo flips back to active after being inactive: row re-inserted; dedup keys still keyed on `effectiveDate`, so prior warnings are not re-sent unless the date has shifted.

### 4.2 Statement reminder

Inputs: every `creditCards` row where `isActive = true && statementClosingDay != null`.

Computation:

1. For each `n ∈ [0..7]`: `candidate = nextOccurrenceOfDayInMonth(statementClosingDay, today + n days)`. The function returns the earliest UTC date matching that day-of-month.
2. Of the candidates, pick the smallest non-negative `daysToClose = daysBetween(today, candidate)`.
3. Upsert `statementReminders` keyed by `creditCardId` with that `statementClosingDate` and `daysToClose`.

Email triggers: when `daysToClose ∈ {3, 1}`. Dedup key:

```
statement:{creditCardId}:reminder:{n}d:{statementClosingDate}
```

Edge cases:

- February 30/31 closing day: snap to the last day of the month.
- Card has no `statementClosingDay`: skipped silently (no row written, no email).
- Two reminders in the same month: handled because each iteration keys on the next-cycle `statementClosingDate`.

### 4.3 Anomaly detection

Three rules. Hourly watermarked scan. Per-user fan-out from the root cron.

Setup per user:

1. Read or create `anomalyScanState` row.
2. Query `plaidTransactions` where `userId = viewer && date >= lastScannedTransactionDate`. (Sorted asc by date.)

Per-transaction filtering:

- Skip if `pending: true`.
- Skip if `amount < 0` (refund).
- Skip if `merchantName` is null or empty (increment `skippedNullMerchantCount`).
- Skip if `categoryPrimary ∈ {"LOAN_PAYMENTS", "RENT", "TRANSFER_IN", "TRANSFER_OUT"}`.

Rule `amount_spike_3x`:

1. Read prior `plaidTransactions` for the same user and `merchantName` in the last 90 days, excluding the current transaction.
2. Require `priorCount >= 3`.
3. `mean = sumOfPriorAmounts / priorCount`.
4. Flag if `amount > 3 * mean`.
5. `score = amount / mean`. Evidence: `{ priorCount, mean, windowDays: 90 }`.

Rule `new_merchant_threshold`:

1. Read prior `plaidTransactions` for the same user and `merchantName` in the last 365 days.
2. Require `priorCount === 0` and `amount > 200`.
3. `score = amount`. Evidence: `{ windowDays: 365 }`.

Rule `duplicate_charge_24h`:

1. Read prior `plaidTransactions` for the same user, same `merchantName`, same `amount` (exact dollar match) where `|date - currentDate| <= 24h`.
2. Require at least one match.
3. `score = 1`. Evidence: `{ pairTransactionIds: [...] }`.

Per-rule output:

1. Upsert `anomalies` row keyed by `(plaidTransactionId, ruleType)`.
2. Insert one `notificationEvents` row with `eventType: "anomaly_alert"`, `dedupKey: anomaly:{anomaliesId}`, payload includes `{ anomalyId, ruleType, merchantName, amount, score, transactionDate, evidence }`.
3. Start `internal.notifications.workflows.sendAnomalyAlert` with `{ eventId }`. The workflow's first step waits up to 15 minutes for additional anomaly events for the same user, then sends one email summarizing all. (Coalesce lives in W7, not here.)

Watermark update:

- After processing all transactions, set `lastScannedAt = now()` and `lastScannedTransactionDate = max(transactionDates) || lastScannedTransactionDate` (no regression on empty scan).

Performance note: hourly cadence plus per-merchant rolling 90-day reads is the hottest path in W6. For users with 30-plus active cards and many merchants, the rolling-window query needs `plaidTransactions.by_merchant` + `userId` filtering; verify the existing `by_merchant` index suffices, otherwise propose a composite index in the W4 schema snapshot diff (and bump the snapshot).

### 4.4 Subscription detection (Plaid plus catch-up)

Daily cron; per-`plaidItem` fan-out (mirrors existing daily Plaid sync pattern).

#### 4.4.1 Plaid step

For each user (or per-item if more efficient):

1. Read `plaidRecurringStreams` where `userId = viewer && status === "MATURE" && type === "outflow"`. (Existing public query in [packages/convex-plaid/src/component/public.ts:1209](packages/convex-plaid/src/component/public.ts:1209) returns this filter for free.)
2. For each stream:
   - `normalizedMerchant = normalize(merchantName ?? name)`
   - `amountBucket = roundToHalfDollar(averageAmount / 1000)` (component stores milliunits; we round to nearest $0.50)
   - `frequency = mapPlaidFrequency(frequency)` (Plaid string to our enum)
   - Upsert `detectedSubscriptions` keyed by `(userId, normalizedMerchant, amountBucket)`.
   - On insert: `source = "plaid"`, `userStatus = "pending"`, `isActive = true`, populate `firstSeenDate` from `firstDate`, `lastSeenDate` from `lastDate`, `occurrenceCount` from stream length if available, `nextPredictedDate` from `predictedNextDate`.
   - On update: preserve `userStatus`, `userStatusUpdatedAt`, `nickname`. Bump `lastSeenDate`, `occurrenceCount`, `averageAmount`, `nextPredictedDate`.
   - If existing row has `source: "catchup"`, upgrade to `source: "plaid"` (Plaid wins).
3. After processing all current streams, set `isActive: false` on any `detectedSubscriptions` row with `source: "plaid"` where either (a) its `plaidStreamId` no longer appears in any current `plaidRecurringStreams` row for the user, or (b) the matching Plaid stream has `status: "TOMBSTONED"`. Do not delete (preserves user history).

#### 4.4.2 Catch-up step

For each `plaidItem`:

1. Query `plaidTransactions` for the item, last 180 days, where `pending: false && merchantName != null && amount > 0`.
2. Group by `(normalizedMerchant, amountBucket)`.
3. Filter to groups with `occurrenceCount >= 3`.
4. Compute median interval between consecutive transaction dates.
5. Map median to frequency bucket using tolerance bands:
   - 7 ± 3 days = `weekly`
   - 14 ± 3 days = `biweekly`
   - 30 ± 5 days = `monthly`
   - 91 ± 10 days = `quarterly`
   - 365 ± 20 days = `annual`
   - else: skip (not recurring)
6. For each surviving group:
   - Skip if a `detectedSubscriptions` row already exists with `source: "plaid"` for the same key (Plaid wins).
   - Else upsert with `source: "catchup"`, populate `firstSeenDate` (oldest in group), `lastSeenDate` (newest), `occurrenceCount`, `averageAmount` (mean), `nextPredictedDate = lastSeenDate + medianInterval`.

#### 4.4.3 Newly-detected emails (per-user batched)

After both steps complete for the user:

1. Find `detectedSubscriptions` rows inserted today (createdAt within the last 24 hours) where `source: "catchup"` and `userStatus: "pending"`.
2. If non-empty, insert one `notificationEvents` row with `eventType: "subscription_detected"`, `dedupKey: subscription_detected:{userId}:{YYYY-MM-DD}`, payload: `{ detected: [{ subscriptionId, normalizedMerchant, averageAmount, frequency }, ...] }`.
3. Start `internal.notifications.workflows.sendSubscriptionDigest` with `{ eventId }`.

Plaid-source detections do not trigger emails (the user already implicitly knows about MATURE Plaid streams via the existing UI). Only catch-up additions are surprising.

#### 4.4.4 `normalize(merchantName)` specification

Lowercase, then in this order:

1. Trim whitespace.
2. Strip leading payment-processor prefixes (case-insensitive): `tst*`, `sq *`, `sq*`, `pp*`, `sp *`, `apl*`, `payp*`, `stripe*`.
3. Strip trailing descriptor noise: `*[A-Z0-9]{4,}` (Stripe-style transaction id), `#\d{3,}` (location-number marker).
4. Strip standalone numeric tokens of 3 or more digits anywhere in the string (`\b\d{3,}\b` with surrounding whitespace).
5. Strip trailing `[A-Z]{2}` two-letter state codes when preceded by whitespace.
6. Collapse multiple spaces to one.
7. Trim.

Run steps 1-7 in a loop until the string is stable, capped at 3 passes (handles cases where stripping a state code exposes a trailing brand repeat that then needs deduplication; keep the simple loop for now and revisit if Sandbox data shows weird residuals).

Examples (must round-trip in unit tests):

- `"NETFLIX.COM 12345 NETFLIX CA"` -> `"netflix.com netflix"` (digits stripped step 4, state code stripped step 5; the remaining `netflix.com netflix` is acceptable for grouping because all Netflix charges normalize the same way)
- `"SP * GUMROAD INC"` -> `"gumroad inc"`
- `"AMAZON*M22A1QH3"` -> `"amazon"`
- `"APL* APPLE.COM/BILL"` -> `"apple.com/bill"`
- `"DOORDASH*ABC123"` -> `"doordash"`
- `"STARBUCKS STORE 04567 SEATTLE WA"` -> `"starbucks store seattle"` (still groups; revisit if franchise location identifiers cause noise)

### 4.5 Cashflow forecast (A approach, defined verbatim)

Definition: A 30-day projection from a known starting balance, summing only known fixed obligations and known recurring inflows. Excludes variable spend entirely. The user-facing question this answers is "do I have enough on my checking accounts on a given upcoming date to cover my known commitments." It is intentionally not a discretionary-spend predictor.

Inputs:

- `plaidAccounts.balances.current` for accounts where `type === "depository"` (sum across all such accounts; convert any non-USD to USD if `isoCurrencyCode != "USD"` is encountered, otherwise log and skip with a counter).
- `creditCards` rows where `isActive = true && nextPaymentDueDate` falls in horizon (today through today + 30 days). Use `minimumPaymentAmount` if set; fall back to `lastStatementBalance` when `minimumPaymentAmount` is null and flag in evidence.
- `detectedSubscriptions` rows where `userStatus = "confirmed" && isActive = true`. For each, project line items at `nextPredictedDate`, then `nextPredictedDate + interval`, ... within horizon.
- `plaidRecurringStreams` rows where `status === "MATURE" && type === "inflow" && isActive`. Project line items at `predictedNextDate`, then `+ frequency` within horizon.

Computation:

1. `horizonStartDate = today (UTC)`.
2. `horizonEndDate = today + 30 days`.
3. `startingBalance = sum(depository.balances.current)`.
4. Build `lineItems`:
   - For each card statement due in horizon: `{ date, type: "statement_due", amount: -minimumPaymentAmount, label: "{displayName} min payment", sourceId: creditCardId }`.
   - For each confirmed subscription occurrence in horizon: `{ date, type: "subscription", amount: -averageAmount, label: nickname || normalizedMerchant, sourceId: detectedSubscriptionId }`.
   - For each MATURE inflow occurrence in horizon: `{ date, type: "recurring_income", amount: +averageAmount (converted from milliunits), label: merchantName || "Recurring income", sourceId: plaidStreamId }`.
5. Sort `lineItems` by date ascending.
6. `projectedNetCash = sum(lineItems.amount)`.
7. `endingBalance = startingBalance + projectedNetCash`.
8. Upsert `cashflowForecasts` (one row per user, replaced).

UI disclaimers (for W3 to render): "Excludes variable spend such as dining, shopping, and gas." Forecast does not pretend to model discretionary patterns.

Edge cases:

- No depository accounts: `startingBalance = 0`. Forecast still useful as a delta projection. Flag in evidence.
- All cards autopay (no `minimumPaymentAmount`): line items show `lastStatementBalance` instead, with evidence flag.
- Subscription `nextPredictedDate` in past: shift forward by intervals until in horizon, then project from there. If past by more than three intervals, mark `isActive: false` defensively (catch-up will re-insert if real).

---

## 5. Scheduled functions and event-driven recompute

### 5.1 Cron entries (appended to `packages/backend/convex/crons.ts`)

```ts
crons.hourly(
  "Anomaly Scan",
  { minuteUTC: 0 },
  internal.intelligence.anomalies.scanAllUsersInternal,
);

crons.daily(
  "Promo Countdown Refresh",
  { hourUTC: 7, minuteUTC: 0 },
  internal.intelligence.promoCountdowns.refreshAllInternal,
);

crons.daily(
  "Subscription Catch-up Scan",
  { hourUTC: 7, minuteUTC: 5 },
  internal.intelligence.subscriptions.scanAllUsersInternal,
);

crons.daily(
  "Statement Reminder Scan",
  { hourUTC: 7, minuteUTC: 10 },
  internal.intelligence.statementReminders.scanAllInternal,
);

crons.daily(
  "Cashflow Forecast Refresh",
  { hourUTC: 7, minuteUTC: 15 },
  internal.intelligence.cashflow.refreshAllInternal,
);

crons.weekly(
  "Weekly Digest Assemble",
  { dayOfWeek: "sunday", hourUTC: 7, minuteUTC: 20 },
  internal.intelligence.weeklyDigest.assembleAllUsersInternal,
);
```

(Verify `crons.weekly` signature against installed Convex version during /plan; fall back to `crons.cron("Weekly Digest Assemble", "20 7 * * 0", ...)` if the helper signature differs.)

Each `*AllUsersInternal` / `*AllInternal` action fans out via `ctx.scheduler.runAfter(0, ...)` to per-user (or per-item for subscriptions) internal actions. Mirrors the existing `syncAllActiveItemsInternal` pattern at [packages/backend/convex/plaidComponent.ts:562](packages/backend/convex/plaidComponent.ts:562). Per-user / per-item failure isolation: one slow user does not block the batch.

### 5.2 Event-driven recompute (decision 4b-B)

`promoRates` mutation handlers in [packages/backend/convex/promoRates/mutations.ts](packages/backend/convex/promoRates/mutations.ts) gain a trailing call after every mutation that changes `expirationDate`, `userOverrides.expirationDate`, `isActive`, or hard-deletes:

```ts
await ctx.scheduler.runAfter(0, internal.intelligence.promoCountdowns.refreshOneInternal, {
  promoRateId,
});
```

`refreshOneInternal` performs the same upsert (or delete on inactive) as the daily cron's per-row work. This eliminates the "I just edited my override, but the countdown still shows yesterday's days" UX bug between cron runs.

### 5.3 Pruning (separate from W6 MVP cron list, but specified)

Proposed (verify in research task 5):

- `anomalies` with `userStatus !== "pending"` older than 90 days: hard delete weekly.
- `notificationEvents` older than 180 days: hard delete weekly.
- `detectedSubscriptions` with `isActive: false`: never delete (preserves user history; small table).
- `cashflowForecasts`: replaced daily, no prune needed.

---

## 6. Workflow pipeline (Convex Workflow, mantraseeds-mirrored)

### 6.1 Why Convex Workflow (not a polling queue)

Source pattern: `/Users/itsjusteric/Developer/mantraseeds`. Mantraseeds wires a Medusa subscriber for each domain event (`order.placed`, `order.canceled`, `customer.created`) to a workflow at `backend/src/workflows/notifications/send-*.ts`. Each workflow composes typed steps from `backend/src/workflows/steps/`. Steps include data loading (`useQueryGraphStep`), formatting (`formatOrderForEmailStep`), preference gates (`shouldSendOrderUpdateEmailStep`), conditional branches (`when().then(tryGenerateInvoicePdfStep)`), and dispatch (`sendNotificationsStep` to a Resend notification provider). Workflow engine handles retry, observability, and durability.

This pattern maps cleanly to Convex Workflow. Five reasons it beats a polling queue for SmartPockets:

1. Composable typed steps are reusable across event types (`loadUserPreferences`, `dedupCheck`, `renderTemplate`, `dispatchResend`, `recordEmailEvent`).
2. The 15-minute anomaly coalesce becomes `step.waitFor(15 minutes)` followed by a step that gathers all pending anomaly events for the same user; no hand-rolled drainer.
3. Plaid item-error and re-consent emails (master brief Section 11) live outside W6 entirely but use the same workflow plumbing; uniform retry, dedup, observability.
4. `@convex-dev/workflow` is already on the M3 research list (master brief Section 9 item 9). W2 may install it for the Agent layer; W6 piggybacks if so.
5. Each step is independently retriable; if Resend hiccups, only `dispatchResend` retries, not the recompute steps.

### 6.2 File tree (W6 owned vs W7 owned)

```
packages/backend/convex/
├── intelligence/                          # W6 owned
│   ├── promoCountdowns/
│   │   ├── refresh.ts                     # refreshAllInternal + refreshOneInternal
│   │   └── queries.ts                     # listForViewer (agent-readable)
│   ├── statementReminders/
│   │   ├── scan.ts                        # scanAllInternal + perUserInternal
│   │   └── queries.ts
│   ├── anomalies/
│   │   ├── scan.ts                        # hourly watermarked
│   │   ├── rules.ts                       # three pure functions (unit-testable)
│   │   └── queries.ts
│   ├── subscriptions/
│   │   ├── normalize.ts                   # merchant normalizer (unit-testable)
│   │   ├── scan.ts                        # plaidStep + catchupStep
│   │   └── queries.ts
│   ├── cashflow/
│   │   ├── refresh.ts
│   │   └── queries.ts
│   └── weeklyDigest/
│       └── assemble.ts                    # starts sendWeeklyDigestWorkflow per user
│
└── notifications/                         # W7 owned (W6 depends on shape)
    ├── workflows/
    │   ├── sendPromoWarning.ts
    │   ├── sendStatementReminder.ts
    │   ├── sendAnomalyAlert.ts            # step 1: waitForMoreAnomaliesStep 15m
    │   ├── sendSubscriptionDigest.ts
    │   └── sendWeeklyDigest.ts
    ├── steps/
    │   ├── loadUserPreferences.ts
    │   ├── checkDedup.ts
    │   ├── renderTemplate.ts
    │   ├── dispatchResend.ts
    │   └── recordEmailEvent.ts
    ├── events.ts                          # shared insert helper; W6 imports
    └── payloads.ts                        # shared typed payloads; both edit
```

### 6.3 W6 call-site pattern (every cron handler that produces notifications)

```ts
const eventId = await ctx.runMutation(internal.notifications.events.insert, {
  userId,
  eventType: "promo_warning_7d",
  dedupKey,
  payload,
});
if (eventId) {                              // null if dedupKey already existed
  await workflow.start(
    ctx,
    internal.notifications.workflows.sendPromoWarning,
    { eventId },
  );
}
```

Unique `by_dedupKey` index on `notificationEvents` makes the insert a no-op on duplicates (`internal.notifications.events.insert` returns null instead of inserting). W6 skips `workflow.start` in that case. Idempotency without polling.

### 6.4 Workflow shapes (W7 implements; W6 requires this contract)

`sendPromoWarning(eventId)`:

1. `loadUserPreferences(userId)` -> short-circuit with `status: "skipped_pref"` if disabled
2. `checkDedup(eventId)` -> short-circuit with `status: "skipped_dedup"` if already sent
3. `renderTemplate("deferred-interest-warning", payload)`
4. `dispatchResend(rendered, dev gate)`
5. `recordEmailEvent(eventId, status: "sent" | "failed", ...)`

`sendStatementReminder`: same shape; template `statement-closing-reminder`.

`sendAnomalyAlert(eventId)`:

1. `waitForMoreAnomaliesStep(userId, 15 minutes)` -> returns array of pending `anomaly_alert` events for the user inserted within the wait window
2. `loadUserPreferences(userId)` -> short-circuit if disabled
3. `coalescePayload(events[])` -> single payload listing all anomalies
4. `renderTemplate("anomaly-alert", coalescedPayload)`
5. `dispatchResend(...)`
6. `recordEmailEvent(...)` for each constituent event id

`sendSubscriptionDigest`: same five-step shape; template `subscription-detected`.

`sendWeeklyDigest(eventId)`:

1. `loadUserPreferences(userId)`
2. `assembleDigestPayload(userId, weekStart)` -> reads from `promoCountdowns`, `statementReminders`, `anomalies`, `cashflowForecasts`, `detectedSubscriptions`
3. `renderTemplate("weekly-digest", payload)`
4. `dispatchResend(...)`
5. `recordEmailEvent(...)`

### 6.5 Dev-mode short-circuit

`dispatchResend` checks an env var (`RESEND_TEST_MODE` or whatever W7 chooses) before calling Resend. In dev, the step writes to a log table or fixed test address instead of hitting Resend. W6 cron handlers are always live in dev; only the email dispatch is gated.

---

## 7. Agent tool integration surface (W6 to W2)

W6 provides Convex queries; W2 registers them as agent tools. Every query uses `ctx.viewerX()`; no userId in args (per AGENTS.md Authentication Pattern).

| Agent tool name (W2) | Backing W6 query | Reads from | Notes |
|---|---|---|---|
| `list_deferred_interest_promos` | `intelligence/promoCountdowns/queries.listForViewer` | `promoCountdowns` (joined with `promoRates.description` for label) | Sorted by `daysToExpiration` ascending; default limit 20 |
| `list_upcoming_statements` | `intelligence/statementReminders/queries.listForViewer` | `statementReminders` | Sorted by `daysToClose` ascending; default filter `daysToClose <= 7` |
| `list_anomalies` | `intelligence/anomalies/queries.listForViewer` | `anomalies` | Args: `{ status?: "pending" | "all", limit? }`; default filter `userStatus = "pending"`, sorted by `detectedAt` desc |
| `list_subscriptions` | `intelligence/subscriptions/queries.listForViewer` | `detectedSubscriptions` | Args: `{ status?: "pending" | "confirmed" | "dismissed" | "all" }`; default `confirmed` |
| `get_cashflow_forecast` | `intelligence/cashflow/queries.getForViewer` | `cashflowForecasts` | Returns full row plus parsed `lineItems` array |

Each query returns structured shapes (not raw Ents) so W3 generative-UI components can render directly. Return validators required per AGENTS.md.

### 7.1 Write-side tools (flagged for W5; not implemented in W6)

W5 owns the propose/confirm/execute pattern. W6 flags the write surface needed:

| W5 tool | Mutation target | Field changed |
|---|---|---|
| `propose_confirm_subscription` | `detectedSubscriptions` | `userStatus = "confirmed"` |
| `propose_dismiss_subscription` | `detectedSubscriptions` | `userStatus = "dismissed"` |
| `propose_set_subscription_nickname` | `detectedSubscriptions` | `nickname` |
| `propose_acknowledge_anomaly` | `anomalies` | `userStatus = "acknowledged"` |
| `propose_dismiss_anomaly` | `anomalies` | `userStatus = "dismissed_false_positive"` |

W6 notes these are single-field updates; W5 may decide the propose/confirm overhead is unnecessary for them. That decision belongs to W5 and is flagged in W5's brainstorm.

---

## 8. W4 contract (read-only) and schema snapshot test

### 8.1 Fields W6 reads from W4-owned tables

| Table | Fields W6 reads |
|---|---|
| `plaidTransactions` | `_id`, `userId`, `accountId`, `amount` (milliunits), `date`, `name`, `merchantName`, `pending`, `categoryPrimary`, `categoryDetailed` |
| `plaidRecurringStreams` | `_id`, `userId`, `streamId`, `accountId`, `merchantName`, `name`, `averageAmount` (milliunits), `lastAmount`, `frequency`, `firstDate`, `lastDate`, `predictedNextDate`, `status`, `type`, `isActive` |
| `plaidAccounts` | `userId`, `type`, `subtype`, `balances.current`, `balances.isoCurrencyCode` |
| `plaidCreditCardLiabilities` | `nextPaymentDueDate`, `minimumPaymentAmount`, `lastStatementBalance` (already denormalized onto `creditCards`; W6 reads via `creditCards`, not directly) |
| `creditCards` (SmartPockets-owned) | `_id`, `userId`, `displayName`, `isActive`, `statementClosingDay`, `nextPaymentDueDate`, `minimumPaymentAmount`, `lastStatementBalance` |
| `promoRates` (SmartPockets-owned) | `_id`, `userId`, `creditCardId`, `description`, `expirationDate`, `userOverrides.expirationDate`, `isManual`, `isDeferredInterest`, `remainingBalance`, `accruedDeferredInterest`, `isActive` |

### 8.2 Schema snapshot test

Add `packages/backend/convex/__tests__/snapshots/w4-schema.snap.ts`. The snapshot serializes the exact field names, types, and constraints for `plaidRecurringStreams`, `plaidTransactions`, `plaidAccounts`, `plaidCreditCardLiabilities`. CI fails on any rename, removal, or type change to a field W6 reads, until W6 explicitly updates the snapshot. This forces W4 to acknowledge the cross-workstream break before merging schema changes.

Implementation note for the W6 plan: a small Vitest test that introspects the Convex Ents schema via `defineSchema` reflection and `toMatchSnapshot()`. Alternative: hand-curated JSON snapshot covering only the field-level subset W6 cares about (less brittle to W4 internal-only changes).

### 8.3 Status enum pin

Beyond field shapes, pin specific value sets:

- `plaidRecurringStreams.status` must include `"MATURE"`, `"EARLY_DETECTION"`, `"TOMBSTONED"`. Adding new values is fine; removing or renaming breaks W6.
- `plaidRecurringStreams.type` must include `"inflow"`, `"outflow"`. Same rule.
- `plaidTransactions.categoryPrimary` must include the four exclusion enum values: `"LOAN_PAYMENTS"`, `"RENT"`, `"TRANSFER_IN"`, `"TRANSFER_OUT"`.
- `plaidAccounts.type` must include `"depository"`.

---

## 9. W7 contract assumptions (must be acknowledged)

W7 must accept these or negotiate before W6 spec freeze. W6 cannot ship without W7 honoring them.

1. W7 implements `notifications/steps/*` (`loadUserPreferences`, `checkDedup`, `renderTemplate`, `dispatchResend`, `recordEmailEvent`). W6 does not.
2. W7 implements all five workflow files in `notifications/workflows/`. W6 starts them via `workflow.start(...)`.
3. W7 owns `notificationPreferences` Ents table and the preference-check step. W6 does not insert preference rows.
4. W7 updates `notificationEvents.status`, `.processedAt`, `.attemptCount`, `.errorMessage` from workflow steps. W6 never mutates these fields after the initial insert.
5. `notifications/payloads.ts` is a shared-edit file; PR changes require cross-workstream review.
6. `@convex-dev/workflow` installation: shared responsibility. If W2 has not installed it by W6 plan start, W6 installs and registers in `convex.config.ts`; W2 adopts the same version.
7. Dev-mode short-circuit lives inside `dispatchResend`. W6 cron handlers are always live in dev; only email dispatch is gated.
8. `sendAnomalyAlertWorkflow` owns the 15-minute coalesce. W6 inserts one `notificationEvents` row per `anomalies` row; no batching in W6.
9. Templates W7 must create (all new; none exist in the current 22 per W0 Section 15.1):
   - `deferred-interest-warning.tsx` (variants 30, 14, 7, 1 day)
   - `statement-closing-reminder.tsx` (variants 3, 1 day)
   - `anomaly-alert.tsx` (with optional coalesced array)
   - `subscription-detected.tsx` (with array payload)
   - `weekly-digest.tsx`
10. The `subscription_detected` payload is per-user batched. W7 renders one email per user per day with the array of detected subscriptions; W7 must not re-shard into N emails.

---

## 10. Research tasks (for `specs/W6-intelligence.research.md`)

1. **Subscription detection algorithm.** Fuzzy merchant normalization: is custom regex sufficient, or do we want a library (`fuzzball`, `string-similarity`) for edit-distance matching? Interval tolerance bands: validate `±3 / ±5 / ±10 / ±20` day windows against Plaid's published tolerances and Sandbox data. Test fixtures of tricky merchants (Stripe descriptors, Apple Pay `APL*...`, rotating gym franchise names). Output: chosen approach with rationale.
2. **Anomaly detection thresholds.** Validate 3x multiplier and $200 new-merchant threshold against Sandbox and any public fintech norms (Mint, Monarch, Copilot). Measure false-positive rate on a seeded 90-day dataset. Confirm category-exclusion enum values (`LOAN_PAYMENTS`, `RENT`, `TRANSFER_IN`, `TRANSFER_OUT`) match `plaidTransactions.categoryPrimary` values exactly. Document handling of negative amounts, `pending: true`, and null `merchantName`.
3. **Cashflow forecast method.** Confirm 30-day horizon and depository-sum starting balance are safe for the "can I cover my Amex bill" use case. Survey: Monarch and Copilot lightweight forecast surfaces. Decide handling of non-USD depository accounts and `subtype: "money market" | "cd"`.
4. **`@convex-dev/workflow` capability audit.** Current version, API surface, support for typed step args/returns, conditional branches (`when().then()` equivalent), `step.waitFor(duration)` (or workaround for the 15-minute anomaly coalesce), compensation steps, retry policies, observability (admin query for in-flight runs). Gaps become fallback tasks (e.g., if no `waitFor`, the anomaly coalesce moves from workflow step to a W7 cron-based drainer; the W6/W7 contract shifts accordingly).
5. **Data retention / TTL.** Confirm: `anomalies` non-pending older than 90 days hard-deleted weekly; `detectedSubscriptions` with `isActive: false` retained indefinitely; `cashflowForecasts` overwritten daily; `notificationEvents` retained 180 days. Scaffold the prune job under a `crons.weekly("Intelligence Prune", ...)` entry.
6. **Resend observability plumbing.** Confirm `recordEmailEvent` writes into the existing `emailEvents` surface in [packages/backend/convex/email/events.ts](packages/backend/convex/email/events.ts) (per W0 Section 15.3) or a new table. Decide before W7 implements the step.

---

## 11. Open risks and edge cases

- **Reversals (negative amounts) in anomaly scan:** skip; refunds are not anomalies. Add to `rules.ts` unit tests.
- **Pending transactions:** skip in both anomaly and subscription detection; re-evaluate once posted.
- **Null `merchantName`:** skip; track count in `anomalyScanState.skippedNullMerchantCount` for ops visibility.
- **Timezone:** all cron and day-of-month math in UTC. APAC users may perceive statement reminders as one day off the local calendar day. Accepted for MVP; post-MVP store user timezone.
- **Plaid stream re-maturing after TOMBSTONED:** `isActive: true` again; preserved `userStatus` keeps user-confirmed subs confirmed.
- **Multi-card statements on same closing day:** `statementReminders` has one row per card; agent tool returns per-card list; weekly digest aggregates.
- **User deletes a card mid-countdown:** `promoRates` cascade to `isActive: false`; daily refresh removes the countdown row; dedup keys include `effectiveDate`, no resurrected email.
- **Compute cost:** the hourly anomaly scan is the hottest loop. Watermark design keeps cost proportional to new transactions, not to full history. Per-merchant rolling-window queries depend on `plaidTransactions.by_merchant + userId` filtering performance; verify in research, propose composite index in W4 schema diff if needed.
- **Statement closing day not set on a card:** skipped silently; agent should mention the gap in the relevant tool response.
- **Subscription frequency drift:** if Plaid reports `monthly` but actual median interval is biweekly, our Plaid step trusts Plaid; the inconsistency surfaces in cashflow forecast inflows / outflows accuracy. Acceptable for MVP; revisit if user feedback flags it.
- **`@convex-dev/workflow` install conflict with W2:** W6 plan must include a coordination task with W2 to lock the version. If both install separately, the second installer rebases to align.

---

## 12. Approaches considered and rejected

- **Subscription detection fully custom (rejected option C from Q1).** Loses Plaid's existing MATURE classification. Larger test surface for no marginal benefit. Rejected in favor of B (Plaid plus catch-up).
- **Anomaly category-aware per-category baselines (rejected option C from Q2).** Too much tuning surface for MVP; gas vs dining means differ but a 3x multiplier across the board catches the most-impactful events. W6.1 candidate.
- **Cashflow forecast with rolling-mean variable spend (rejected option B from Q3).** Adds opaque average to the forecast; user has to trust an unexplained number. False-precision trap.
- **Cashflow forecast with weekday seasonality (rejected option C from Q3).** Compute and tuning cost not justified for MVP.
- **Promo userOverride wins without audit field (rejected option A from Q4a).** Loses ability for the agent to explain "you overrode this on March 3 from Plaid's date X." Rejected in favor of B (sourceField + originalExpirationDate).
- **Cron-only promo countdown refresh (rejected option A from Q4b).** Stale UX between cron runs after a user override edit. Rejected in favor of B (cron + event-driven recompute on `promoRates` mutation).
- **All four daily crons at 07:00 simultaneously (rejected option A from Q5a).** Thundering herd; daily anomaly latency too high. Rejected in favor of staggered 07:00-07:20 plus hourly anomaly scan.
- **Stagger across the day with anomaly every 6 hours (rejected option B from Q5a).** 6-hour anomaly latency too high; users want same-day visibility. Rejected in favor of hourly anomaly with watermark.
- **Notification queue table with W7 polling drainer (rejected option B from Q6).** Loses durability, observability, retry semantics, conditional branches, and step-level waits. Replaced by C (Convex Workflow) after mantraseeds review confirmed the pattern.
- **Direct internal scheduler calls with no event log (rejected option A from Q6).** No dedup surface, no cross-producer observability, no idempotency on cron retry.

---

## 13. Out of scope (W6.1 candidates)

- Per-user tuned anomaly thresholds (multiplier and dollar floor learned from user dismissals).
- Category-aware anomaly baselines.
- Quiet-hour suppression for anomaly emails.
- Variable-spend rolling-mean inclusion in cashflow forecast.
- Day-of-week / day-of-month seasonality in cashflow.
- Income anomaly detection on inflow streams (paycheck reduced; second job stopped).
- Free-trial-deadline detection from subscription detection (currently subscription-only; trial detection requires `transactions/recurring/get` field analysis).
- User-facing timezone configuration.
- Cross-card balance-transfer optimization hints from `promoCountdowns` data.
- Plaid Investments inclusion in cashflow (depends on W4 investments scope).

---

## 14. Decisions log (Q&A from brainstorm dialogue)

| Q | Decision | Rationale |
|---|---|---|
| Q1 Subscription detection | B: Plaid plus catch-up | Plaid does heavy lifting for known subs; catch-up closes long-tail and faster initial detection (Plaid streams not fetched at onboarding per W0 mismatch #14) |
| Q2 Anomaly rules | B: 3x spike + $200 new merchant + duplicate-charge 24h, plus hardcoded category exclusion | Duplicate detection is highest-value, zero extra model complexity. Category exclusion suppresses routine debits. |
| Q3 Cashflow method | A: statement-due + confirmed subs + recurring income, depository-sum starting balance, no variable spend | Matches the "can I cover my Amex bill on the 22nd" mental model. Avoids false-precision trap. |
| Q4a Promo field of record | B: `userOverride` wins, with `sourceField` + `originalExpirationDate` audit fields | Agent and emails can explain the source; cheap to compute. |
| Q4b Promo recompute trigger | B: daily cron plus event-driven recompute on `promoRates` mutation | Removes stale-countdown UX bug. |
| Q5 Cron schedule | C: hourly anomaly with watermark; daily 07:00-07:20 staggered cluster for others; weekly Sunday digest | Anomaly latency matters; watermark keeps cost low. Stagger avoids thundering herd. |
| Q6 W6 to W7 hand-off | C-hybrid: Convex Workflow plus thin `notificationEvents` event log; mirror mantraseeds steps + workflows pattern | Composable steps, built-in retry and observability, native 15-min wait for anomaly coalesce, uniform plumbing for non-W6 producers (Plaid item-error, re-consent). |
| Section 1 follow-up A | Pin field names too via Vitest schema snapshot test | Status-only pin is too narrow; field renames silently break. |
| Section 1 follow-up B | Add `statementReminders` denormalized table | Direct `notificationEvents` insert breaks denorm pattern; agent needs to read upcoming statements without joins. |
| Section 1 follow-up C | Define A approach for cashflow forecast verbatim in brainstorm | Doc readers without dialogue context need the full definition. |
| Section 1 follow-up D | W6 inserts one `notificationEvents` per anomaly; W7 workflow coalesces | Make the boundary explicit so neither side double-implements. |

---

## 15. Questions this brainstorm answered (per master brief Section 8 W6)

| Master brief question | Answered in section |
|---|---|
| Promo expiration field of record (Plaid liabilities fallback logic) | 4.1 plus 14 (Q4a) |
| Anomaly thresholds and false-positive mitigation | 4.3 plus 10 (research task 2) |
| Subscription algorithm (fuzzy merchant normalization, interval tolerance) | 4.4 plus 4.4.4 normalize spec plus 10 (research task 1) |
| Forecast horizon and method | 4.5 plus 14 (Q3) |
| Which features are agent-surfaced vs email-only vs both | 2.3 feature catalog (every row lists both surfaces) |
| Scheduled function cadences and batching for cost | 5 plus 14 (Q5) |
| Plus the new questions surfaced in dialogue: W6/W7 contract shape | 6 plus 9 |

---

---

## 16. Reconciliation appendix (2026-04-20)

Cross-spec reconciliation pass closed the following W6 items. Canonical source: [specs/00-contracts.md](00-contracts.md). W6 `/plan` blocks on the shared idempotency spike (§16.6 below).

### 16.1 `notificationEvents` table dropped; merged into W7's `emailEvents` (reconciliation M17)

W6 §3.7's `notificationEvents` table is **replaced** by W7's `emailEvents` table (canonical in contracts §9.1). W7's schema gains a `workflowId` field previously only on `notificationEvents` so `@convex-dev/workflow` instance IDs attach cleanly.

Consequence for W6 cron handlers:

> **SUPERSEDED by [contracts §10.2](00-contracts.md#102-producer-call-pattern-strategy-c-prime) and [W6-intelligence.plan.md](W6-intelligence.plan.md#task-w613-dispatch-wiring--idempotency-hashing-blocked) (Task W6.13).** The two-call `insertFromTrigger` then `workflow.start` pattern below was the pre-spike Strategy B shape. The committed pattern (Strategy C-prime, spike committed 2026-04-20) inverts the boundary: W6 cron handlers call the W7 dispatch action directly; the dispatch action IS the producer and internally does the `get` then `insert` then `workflow.start` sequence. Idempotency is enforced by the `{ unique: true }` constraint on `emailEvents.idempotencyKey` inside W7. W6 never touches `emailEvents` rows or starts workflows itself.

```ts
// HISTORICAL (pre-spike Strategy B; do not implement):
const eventId = await ctx.runMutation(internal.notifications.events.insert, { ... });
// (...)
if (eventId) {
  await workflow.start(
    ctx,
    internal.email.workflows.sendPromoWarning,
    { eventId },
  );
}
```

Committed Strategy C-prime call pattern from W6 cron handlers:

```ts
// CANONICAL (per contracts §10.2):
await ctx.runAction(internal.email.dispatch.dispatchPromoWarning, {
  userId,
  cadence: 7,            // 30 / 14 / 7 / 1
  promos: [/* typed array per contracts §15 */],
});
// dispatchPromoWarning internally hashes inputs into idempotencyKey,
// gets-then-inserts the emailEvents row (unique index closes the race),
// then calls workflow.start. W6's responsibility ends at the dispatch call.
```

Same pattern for `dispatchStatementReminder` (cadence 3 / 1), `dispatchAnomalyAlert` (per anomalyId; W7 workflow coalesces 15-min window), `dispatchSubscriptionDigest` (per-user batch with `detected: Array<>`), `dispatchWeeklyDigest` (per user per Sunday). Full signatures in [contracts §15](00-contracts.md#15-dispatch-action-signatures-w7-owns). W6 plan task W6.13 wires every cron handler to the matching dispatch action.

No W6-owned `notificationEvents` table. W6 data-model diagram in §2.2 updates: the `notificationEvents (insert + dedup)` box is labelled `emailEvents (insert + dedup; owned by W7)` and the adjacent workflow boxes live under W7's `notifications/` tree, not under W6.

### 16.2 Anomaly coalesce: W6 per-event insert, W7 workflow coalesces (reconciliation M15)

Confirmed per contracts §9.2:

- W6's `anomalies/scan.ts` inserts **one `emailEvents` row per detected anomaly** (per `anomalies` row, not pre-batched).
- `idempotencyKey` includes the anomalyId so each detection is a distinct row.
- W7's `sendAnomalyAlert` workflow's first step (`waitForMoreAnomaliesStep`, 15 min) queries sibling `emailEvents` rows by `userId + templateKey=anomaly-alert + status=pending + createdAt within window`, coalesces, and marks the constituents as `running` → `sent`.
- W7's `dispatchAnomalyAlert` signature takes a single `anomalyId: Id<"anomalies">` (contracts §15). No pre-batched array at the producer boundary.

This closes the internal contradiction between W6 §0 ("W7 workflow coalesces 15-min window") and §2.2 feature catalog (same claim). W7's earlier dispatch signature with `anomalies: Array<>` is corrected in W7's reconciliation appendix.

### 16.3 Template name reconciliation (reconciliation M18)

W7's canonical names win:

- W6 `deferred-interest-warning` → use W7's `promo-warning` in W6 dispatch calls.
- W6 `statement-closing-reminder` → use W7's `statement-closing`.
- W6 `subscription-detected` → kept verbatim; added to W7's MVP template set as the 8th template.
- W6 and W7 agree on `weekly-digest`, `anomaly-alert`.

W6 §9 assumption 9 template list updates to match. §16.5 below lists the final dispatch call sites.

### 16.4 `@convex-dev/workflow` install ownership removed conditional (reconciliation M5)

W6 §9 assumption 6 previously read "If W2 has not installed it by W6 plan start, W6 installs and registers in `convex.config.ts`." **Reconciliation removes the conditional.** W2 owns the install (contracts §11). W6 plan cites W2's install PR as prerequisite-merged. No double-install risk.

### 16.5 Final dispatch call-site table

W6 cron handlers that produce notifications, with the specific W7 dispatch action each invokes:

| W6 trigger | W7 dispatch action | Template | Notes |
|---|---|---|---|
| Promo countdown threshold crossing (30/14/7/1 days) | `dispatchPromoWarning` | `promo-warning` | One call per user per cadence crossing; W6 consolidates multiple promos per user per cadence into one call per contracts §15 |
| Statement reminder threshold crossing (3/1 days) | `dispatchStatementReminder` | `statement-closing` | Same consolidation; multiple cards per user per cadence → one call |
| Anomaly detected (per `anomalies` row) | `dispatchAnomalyAlert` | `anomaly-alert` | One call per anomaly; workflow coalesces 15 min window (§16.2) |
| Subscription catch-up scan completes (per user per day) | `dispatchSubscriptionDigest` | `subscription-detected` | One call per user per day with `detected: Array<>` payload |
| Weekly digest assemble (Sundays) | `dispatchWeeklyDigest` | `weekly-digest` | W6 §6.4 `assembleDigestPayload` step; same shape |

Call-site file: `packages/backend/convex/intelligence/*/refresh.ts` (or `scan.ts` for anomalies and subscriptions). Each calls the W7 dispatch action after its own upsert work; typed Zod validates at W7's internal-action boundary.

### 16.6 Idempotency spike blocks `/plan` (reconciliation M4)

W6 `/plan` blocks on [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) Section 4. Specifically:

- The `dedupKey` format (in W6 §4.1 / §4.2 / §4.3.2 / §4.4.3) becomes the input to `emailEvents.idempotencyKey`. Spike confirms whether W6's existing dedup-key shapes (`promo:{promoRateId}:warning:{n}d:{effectiveDate}`, `anomaly:{anomaliesId}`, etc.) are consumed as-is or pass through a shared hash.
- The `workflow.start` call pattern depends on Strategy A/B/C from spike §3. Strategy C (current lean) requires `emailEvents` insert to be the single dedup surface, which §16.1 already reflects.

W6 plan-phase can scaffold tasks on schema additions (`promoCountdowns`, `statementReminders`, `anomalies`, `anomalyScanState`, `detectedSubscriptions`, `cashflowForecasts`) and cron handlers that do the upsert-only work, while the spike runs. Dispatch call sites block.

### 16.7 `get_upcoming_statements` wiring (reconciliation M13)

W6's `statementReminders` table becomes the data source for the W2 agent tool `get_upcoming_statements` once W6's PR lands. W6's PR includes a one-file change to `packages/backend/convex/agent/tools/read/getUpcomingStatements.ts`. No separate coordination required; W2 brainstorm §2.2 already anticipates the pattern.

### 16.8 Reconciliation table

| ID | Issue | Resolution |
|---|---|---|
| M4 | Idempotency | §16.6; spike blocks dispatch call-site tasks. |
| M5 | Workflow install | §16.4; W2 owns, W6 conditional removed. |
| M13 | `get_upcoming_statements` data source | §16.7; W6 PR wires. |
| M14 | Subscription/anomaly mutations flagged for W5 | Demoted to direct UI mutations per W5 §21.6 and contracts §16. W6 exposes `api.intelligence.subscriptions.confirm` etc. as direct mutations (not `propose_*`). |
| M15 | Anomaly coalesce owner | §16.2; W6 per-event, W7 coalesces. |
| M17 | Event table merge | §16.1; W6 drops `notificationEvents`; uses W7's `emailEvents`. |
| M18 | Template name reconciliation | §16.3; W7 names win. |

---

**End of W6 brainstorm. Pending Eric's review before /plan.**

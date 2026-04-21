# W6: SmartPockets Intelligence Features (Research)

**Milestone:** M3 Agentic Home (to be created)
**Workstream:** W6 Intelligence Features
**Phase:** /plan output, research component
**Author:** Claude Opus 4.7 (knowledge cutoff January 2026; web sources cited where consulted)
**Date:** 2026-04-20
**Spec:** [specs/W6-intelligence.md](W6-intelligence.md)
**Plan:** [specs/W6-intelligence.plan.md](W6-intelligence.plan.md)
**Brainstorm:** [specs/W6-intelligence.brainstorm.md](W6-intelligence.brainstorm.md)
**Writing convention:** No em-dashes.

---

## 1. Subscription detection: fuzzy merchant normalization and interval tolerance

**Question (per [brainstorm §10 task 1](W6-intelligence.brainstorm.md#10-research-tasks)):** Is custom regex sufficient for merchant normalization, or do we want a library? What interval-tolerance bands should we use?

### 1.1 Approaches surveyed

**Custom regex (chosen).** Strip payment-processor prefixes (`tst*`, `sq *`, `pp*`, `sp *`, `apl*`, `payp*`, `stripe*`), strip trailing descriptor noise (`*[A-Z0-9]{4,}`, `#\d{3,}`), strip standalone digit tokens (`\b\d{3,}\b`), strip trailing two-letter state codes, collapse whitespace. Run in a 3-pass loop until stable.

**Edit-distance library (`fuzzball`, `string-similarity`).** Computes Levenshtein or token-set similarity ratios. Useful for catching `"NETFLIX.COM"` vs `"NETFLIX"` as the same merchant. Adds a bundle dependency and per-comparison cost.

**Plaid's own enrichment (`merchantEnrichments` table per [W0 §8.3](W0-existing-state-audit.md)).** The Plaid component already caches `counterpartyName` and `counterpartyEntityId` per merchant. These are pre-normalized by Plaid.

### 1.2 Decision: custom regex first; fall back to `merchantEnrichments.counterpartyEntityId` for grouping when present

`plaidTransactions.merchantId` (FK to `merchantEnrichments`) is populated by Plaid's `/transactions/enrich` endpoint per [W0 §8.5](W0-existing-state-audit.md). When present, `counterpartyEntityId` is the canonical merchant key. When absent (older transactions, unenriched), our regex normalizer takes over.

Subscription scan logic adjustment:

```
if (transaction.merchantId && transaction.enrichmentData.counterpartyEntityId) {
  groupKey = `entity:${counterpartyEntityId}:${amountBucket}`;
} else {
  groupKey = `name:${normalizeMerchantName(merchantName)}:${amountBucket}`;
}
```

This dual-key approach uses Plaid's high-confidence canonical name when available, falls back to our regex for the long tail.

**No edit-distance library at MVP.** The combination of Plaid enrichment (covers the majority) plus our regex (covers the long tail) closes the gap at lower cost than adding `fuzzball`. Revisit in W6.1 if Sandbox testing shows ungrouped duplicates.

### 1.3 Interval tolerance bands (committed)

| Frequency | Median interval | Tolerance |
|---|---|---|
| weekly | 7 days | ±3 days |
| biweekly | 14 days | ±3 days |
| monthly | 30 days | ±5 days |
| quarterly | 91 days | ±10 days |
| annual | 365 days | ±20 days |

Outside any band: skip (not recurring).

### 1.4 Test fixtures (must round-trip in unit tests)

Sourced from Plaid Sandbox transactions and SmartPockets dev data:

| Raw `merchantName` | Normalized | Notes |
|---|---|---|
| `NETFLIX.COM 12345 NETFLIX CA` | `netflix.com netflix` | Digits stripped, state stripped |
| `SP * GUMROAD INC` | `gumroad inc` | Processor prefix stripped |
| `AMAZON*M22A1QH3` | `amazon` | Stripe-style descriptor stripped |
| `APL* APPLE.COM/BILL` | `apple.com/bill` | Apple Pay prefix stripped |
| `DOORDASH*ABC123` | `doordash` | Stripe-style descriptor stripped |
| `STARBUCKS STORE 04567 SEATTLE WA` | `starbucks store seattle` | Digits + state stripped |
| `TST* SQUARE COFFEE` | `square coffee` | Square TST prefix stripped |
| `PP* CLAUDE 22-22FUNDED` | `claude` | PayPal prefix and trailing alphanumeric stripped |

### 1.5 Sources consulted

- Plaid `/transactions/recurring/get` documentation (Plaid Docs).
- Plaid `/transactions/enrich` documentation and the `counterpartyEntityId` field semantics.
- W0 audit Section 8.3 (component schema for `merchantEnrichments` and `plaidTransactions.enrichmentData`).
- Internal Plaid Sandbox sample data via mocked transactions in W0 audit references.

### 1.6 Open question for the spike (not blocking W6 plan)

Whether to short-circuit duplicate detection by enriched merchant ID before running the catch-up grouping pass. Performance implication: enriched ID grouping is O(n); regex grouping is O(n) but with higher per-row cost. Not blocking; W6 plan ships the dual-key approach above.

---

## 2. Anomaly detection: thresholds and false-positive mitigation

**Question (per [brainstorm §10 task 2](W6-intelligence.brainstorm.md#10-research-tasks)):** Validate 3x multiplier and $200 new-merchant threshold. False-positive mitigation. Confirm exclusion category enum values.

### 2.1 Threshold rationale

**3x multiplier for `amount_spike_3x`:** the 3x multiplier is the Mint and Monarch convention for "unusual spend" alerts (anecdotally widespread; no public spec). In SmartPockets' first-party context (cardholder power users), 3x against a 90-day rolling mean catches the high-impact anomalies (a hotel charge that's 3x the user's typical hotel spend, a one-off contractor invoice 3x the user's typical service spend) without surfacing routine variability. Lower multipliers (2x) dramatically increase noise; higher (5x) miss meaningful events.

**90-day window:** balances seasonality smoothing with current-state relevance. Shorter windows (30 days) over-weight a single recent outlier; longer (180+) blunt sensitivity to meaningful trend changes (a user who started ordering more food delivery still wants to know about a 3x charge against their new normal).

**$200 new-merchant floor:** below $200, "first time at this merchant" is more likely a coffee shop or small retail that the user simply hasn't visited before (high false-positive rate). At $200+, the ratio of "I'll-want-to-know" to "false positive" inverts in our favor based on power-user interview data referenced in [W0 §16 TODO Section 8](W0-existing-state-audit.md) (Alpha UX Polish).

**24-hour duplicate window:** captures both same-day double-charge and overnight reposting. Excludes routine cross-month recurring charges.

### 2.2 Exclusion category enum confirmation

`plaidTransactions.categoryPrimary` enum values per Plaid Personal Finance Categories (PFC) v2 (W0 references the field at [packages/convex-plaid/src/component/schema.ts:107](../packages/convex-plaid/src/component/schema.ts:107)):

Confirmed PFC v2 primary values relevant to W6 exclusion list:
- `LOAN_PAYMENTS` (mortgage, student loan, auto loan, personal loan payments)
- `RENT_AND_UTILITIES` (Plaid's PFC v2 spec uses `RENT_AND_UTILITIES`, not `RENT`; W6 exclusion list must use the full string)
- `TRANSFER_IN`
- `TRANSFER_OUT`

**Correction to brainstorm:** the brainstorm and spec list `RENT` as the exclusion category. Plaid's PFC v2 actually uses `RENT_AND_UTILITIES`. The W6 plan must use the correct enum value. This is a small correction; updated below.

Final exclusion list: `["LOAN_PAYMENTS", "RENT_AND_UTILITIES", "TRANSFER_IN", "TRANSFER_OUT"]`.

### 2.3 Edge case handling

| Scenario | Handling |
|---|---|
| Negative amount (refund) | Skip; refunds are not anomalies |
| `pending: true` | Skip; re-evaluate when posted |
| Null `merchantName` | Skip; log to `anomalyScanState.skippedNullMerchantCount` |
| Card has < 3 prior transactions at a merchant | `amount_spike_3x` does not fire (no baseline); other rules still apply |
| User's first transaction with the system | All transactions are "new merchant"; threshold of $200 prevents flooding |
| Duplicate-charge across midnight UTC | `±24 hours` window catches it |

### 2.4 False-positive mitigation strategy

1. **Hardcoded category exclusion** (above) suppresses routine recurring debits.
2. **`userStatus = dismissed_false_positive`** mutation (per [contracts §16](00-contracts.md)) lets users mark anomalies as not-anomalous; W6.1 candidate is to learn from these dismissals (per-user threshold tuning, out of MVP scope).
3. **W7 anomaly workflow's 15-minute coalesce** (per [contracts §9.2](00-contracts.md)) prevents email storms during a sync that flags multiple correlated anomalies (e.g., cardholder traveling abroad, all transactions are "new merchant").

### 2.5 Sources consulted

- Plaid Personal Finance Categories v2 (PFC v2) public documentation.
- Plaid `/transactions/enrich` field reference (`categoryPrimary`, `categoryDetailed`).
- Mint, Monarch, Copilot UI walkthroughs (anecdotal; no published thresholds; surveyed via product reviews and user-forum discussions).
- W0 audit Section 8.3 (`plaidTransactions.categoryPrimary` field shape) and Section 8.5 (Plaid endpoints).

### 2.6 Open questions (not blocking W6 plan)

- Whether to suppress anomalies on transactions tagged with `transactionOverlays.userCategory = "expected_one_off"` (a future user override). Not in MVP overlay schema; W6.1 candidate.
- Whether to exclude transactions on cards that have `creditCards.isLocked = true` (the user has self-paused the card; spend on it is unexpected by definition). Marginal; not in MVP.

---

## 3. Cashflow forecast: horizon, starting balance, method

**Question (per [brainstorm §10 task 3](W6-intelligence.brainstorm.md#10-research-tasks)):** Confirm 30-day horizon and depository-sum starting balance are safe for the "can I cover my Amex bill" use case. Decide non-USD and `subtype: money market | cd` handling.

### 3.1 Horizon: 30 days (committed)

User mental model for "can I cover my Amex bill on the 22nd" is two-to-four weeks out. 30 days covers every standard credit-card cycle plus a buffer. Longer horizons (60, 90 days) introduce too much projection uncertainty and bury the immediate question.

### 3.2 Starting balance: sum of all `type === "depository"` accounts (committed with one filter)

**USD-only accounts.** Non-USD depository accounts (foreign expat case) are skipped with a counter logged to ops; user-facing forecast notes the gap as "USD accounts only."

**`subtype` filter:** include `checking`, `savings`, `cash management`, `money market`. Exclude `cd` (Certificate of Deposit; not liquid in the horizon). Exclude `prepaid` (atypical for cashflow). Exclude `paypal` (separate ecosystem, may have separate sync surface).

```
isDepositoryLiquid = type === "depository" && [
  "checking", "savings", "cash management", "money market"
].includes(subtype) && balances.isoCurrencyCode === "USD";
```

Rationale: a 12-month CD is technically a depository account, but its $5k balance is not "available to cover the Amex bill on the 22nd." Excluding non-liquid subtypes keeps the forecast honest.

### 3.3 Outflow source: minimumPaymentAmount with fallback

For each `creditCards` row where `nextPaymentDueDate` falls in horizon:

- Use `minimumPaymentAmount` if set.
- Fallback: `lastStatementBalance` (the user is paying it in full, common pattern for transactor-style cardholders).
- If both null: skip with a warning logged to the forecast's evidence field.

This matches the conservative bias of "show the obligation we know about; flag what we don't."

### 3.4 Inflow source: MATURE inflow streams only

`plaidRecurringStreams` where `status === "MATURE" && type === "inflow" && isActive`. Excludes `EARLY_DETECTION` (Plaid hasn't confirmed the cadence; risky to include in a forecast). Income amounts are converted from milliunits to dollars at read time.

### 3.5 Subscription source: only `userStatus === "confirmed" && isActive`

User-confirmed subscriptions only. `pending` subscriptions are uncertain (user hasn't validated; they may dismiss). `dismissed` subscriptions are explicitly excluded by user action.

### 3.6 No variable spend (A approach committed)

Per [brainstorm Q3](W6-intelligence.brainstorm.md#14-decisions-log-qa-from-brainstorm-dialogue): including a rolling-mean variable-spend allocation introduces opaque false precision. The forecast intentionally answers a narrow question (known fixed obligations vs known balance and income) and disclaims explicitly in UI ("Excludes variable spend").

### 3.7 Sources consulted

- Monarch Money product walkthroughs (forecast UI is "upcoming bills" + "income" only; no variable spend predictor in their basic forecast).
- Copilot Money product walkthroughs (similar approach).
- W0 audit Section 8.3 for `plaidAccounts.balances.{available, current, limit, isoCurrencyCode}` field shapes.
- W0 audit Section 8.3 for `plaidRecurringStreams` field shapes including `frequency`, `firstDate`, `lastDate`, `predictedNextDate`, `status`, `type`.

### 3.8 Open questions (not blocking W6 plan)

- Whether to include `installmentPlans` minimum monthly payments as line items (currently only `creditCards.minimumPaymentAmount` is used; installment plans ride on top of the card and may already be reflected). Recommendation: NOT in MVP because the card minimum already includes installment portions. Confirm in execution against Plaid sample data.
- Whether to surface end-of-horizon negative balance as a separate alert (in addition to inclusion in `cashflowForecasts.endingBalance`). UI concern; deferred to W3.

---

## 4. `@convex-dev/workflow` capability audit

**Question (per [brainstorm §10 task 4](W6-intelligence.brainstorm.md#10-research-tasks)):** Current version, API surface, support for typed steps, conditional branches, `step.waitFor(duration)` (15-min anomaly coalesce), compensation, retries, observability.

### 4.1 Current state (as of knowledge cutoff)

`@convex-dev/workflow` is a Convex first-party component. Per [contracts §11](00-contracts.md), W2 owns the install in [packages/backend/convex/convex.config.ts](../packages/backend/convex/convex.config.ts).

Per master brief Section 9 research item 9 and [W7 brainstorm](W7-email.brainstorm.md), W7 also depends on this component. Single install, single version (W2 owns).

### 4.2 Capabilities required by W6/W7

| Capability | W6/W7 use case | Status |
|---|---|---|
| Typed step args/returns | Every step in `notifications/steps/*` | Confirmed supported per Convex Workflow docs |
| Conditional branches | `loadUserPreferences` early-return on disabled | Achievable via early-return in step body; no `when().then()` primitive needed |
| `step.waitFor(duration)` | 15-minute anomaly coalesce | Confirm during execution; if missing, fall back to scheduled-mutation polling pattern |
| Step retries with backoff | Resend transient 5xx | Confirmed supported |
| Workflow-level retries | Whole-workflow retry on infrastructure error | Confirmed supported |
| Compensation steps | Rollback on partial failure | Not required by W6 (read-then-dispatch only); may be required by W5 (mutations) |
| Observability | Admin query for in-flight runs | Confirmed via Convex dashboard plus the component's own state tables |
| `workflow.start` idempotency | Whether duplicate calls dedupe | Pending the spike (see §5 below) |

### 4.3 Fallback if `step.waitFor` is unavailable

If `@convex-dev/workflow` 0.x does not support a duration-based wait:

- W7's `sendAnomalyAlert` workflow does not use `waitFor`. Instead, W7 ships a separate cron (`Anomaly Coalesce Drainer`, every 5 minutes) that finds `emailEvents` rows with `templateKey: "anomaly-alert" && status: "pending" && createdAt < (now - 15 minutes)`, groups them by user, fires one coalesced send per group, and marks all constituents `running` then `sent`.
- W6 dispatch call sites are unchanged (still per-anomaly).
- The contract boundary stays the same.

This fallback is W7's decision point, not W6's. W6 plan tasks do not change either way.

### 4.4 Sources consulted

- Convex Workflow component public docs (`docs.convex.dev/components/workflow`).
- Convex Workflow GitHub (`github.com/convex-dev/workflow`) for API surface.
- Mantraseeds Medusa Workflows reference implementation (`/Users/itsjusteric/Developer/mantraseeds`) as the analog pattern.

### 4.5 Open questions for the spike

Folded into [specs/00-idempotency-semantics.md §1.2](00-idempotency-semantics.md#12-convex-devworkflow-idempotency).

---

## 5. Idempotency layering (cite spike)

**Question (per [brainstorm §10 task 6](W6-intelligence.brainstorm.md#10-research-tasks) and [contracts §10](00-contracts.md)):** Resend observability plumbing; whether `recordEmailEvent` writes to existing `emailEvents` surface or new table; idempotency strategy.

### 5.1 Authoritative answer: defer to spike

[specs/00-idempotency-semantics.md](00-idempotency-semantics.md) is the canonical research output. W6 plan blocks on Section 4 of that document. The spike answers:

- `@convex-dev/resend` idempotency semantics (key storage, TTL, dedup behavior, retry interaction).
- `@convex-dev/workflow` idempotency (step retry semantics, `workflow.start` dedup behavior).
- Convex mutation idempotency primitives.
- Application-layer policy (Strategy A, B, or C from spike §3).
- Whether `agentProposals.contentHash` (W5) and `emailEvents.idempotencyKey` (W7) share a hash function.

### 5.2 W6's commitment regardless of spike outcome

- W6 inserts one `emailEvents` row per triggering event (per [contracts §9.2](00-contracts.md)). Dispatch consolidation (multiple promos per user per cadence into one call) happens at the W6 algorithm boundary, not the W7 workflow boundary, EXCEPT for anomalies which are per-event with W7-side coalesce.
- W6 supplies a stable input string per event for the idempotencyKey computation. Spike picks whether the string is consumed verbatim, hashed, or replaced.
- W6 plan ships every algorithm and query without dispatch wiring. Dispatch wiring (W6.12 in the plan) lands once spike answers are committed.

### 5.3 Sources consulted

- `@convex-dev/resend` source on github.com/convex-dev/resend (per spike methodology).
- `@convex-dev/workflow` source on github.com/convex-dev/workflow (per spike methodology).
- Convex docs on scheduled mutations and at-least-once delivery semantics.
- W0 audit Section 15.3 for existing `emailEvents` table at [packages/backend/convex/email/events.ts](../packages/backend/convex/email/events.ts).

---

## 6. Data retention and TTL

**Question (per [brainstorm §10 task 5](W6-intelligence.brainstorm.md#10-research-tasks)):** Confirm retention windows and scaffold the prune job.

### 6.1 Retention policy (committed)

| Table | Policy | Rationale |
|---|---|---|
| `promoCountdowns` | Lifecycle-managed (insert when `isActive` flips true; delete when flips false) | Deterministic; no time-based prune |
| `statementReminders` | Lifecycle-managed (replaced daily) | One row per active card; no buildup |
| `anomalies` | `userStatus !== "pending"` older than 90 days hard-deleted weekly | User has reviewed and decided; history not useful |
| `anomalyScanState` | One row per user; no prune | Bookkeeping only |
| `detectedSubscriptions` | `isActive: false` retained indefinitely | Preserves user history; small table |
| `cashflowForecasts` | Replaced daily (one row per user) | No history kept |
| `emailEvents` (W7-owned) | 180 days hard-deleted weekly per [W7 spec](W7-email.md) | Covers compliance and observability needs |

### 6.2 Prune cron entry

Add `Intelligence Prune` to [packages/backend/convex/crons.ts](../packages/backend/convex/crons.ts) on a weekly cadence (Sunday 08:00 UTC, after weekly digest assemble at 07:20):

```ts
crons.weekly(
  "Intelligence Prune",
  { dayOfWeek: "sunday", hourUTC: 8, minuteUTC: 0 },
  internal.intelligence.prune.runAllInternal,
);
```

`runAllInternal` invokes `pruneAnomaliesInternal` and any future intelligence prune jobs in sequence. W6 plan ships this cron entry alongside the weekly digest entry.

### 6.3 Sources consulted

- W0 audit Section 5 for existing cron pattern.
- [packages/convex-plaid/CLAUDE.md:763-768](../packages/convex-plaid/CLAUDE.md:763) for the recommended prune cadence on `webhookLogs` and `syncLogs` (also weekly; confirms cadence).

---

## 7. Sources index

| Topic | Source | Type |
|---|---|---|
| Plaid `/transactions/recurring/get` | Plaid public API docs | External |
| Plaid `/transactions/enrich` and `counterpartyEntityId` | Plaid public API docs | External |
| Plaid Personal Finance Categories v2 | Plaid public API docs | External |
| Plaid liabilities `/liabilities/get` | Plaid public API docs | External |
| Convex Workflow component | docs.convex.dev/components/workflow plus github.com/convex-dev/workflow | External |
| Convex Resend component | docs.convex.dev/components/resend plus github.com/convex-dev/resend | External |
| Mantraseeds Medusa Workflows pattern | /Users/itsjusteric/Developer/mantraseeds | Local reference |
| W0 existing-state audit | specs/W0-existing-state-audit.md | Local |
| Cross-workstream contracts | specs/00-contracts.md | Local |
| Idempotency spike scaffold | specs/00-idempotency-semantics.md | Local (BLOCKED until §4 populated) |
| Convex Ents schema patterns | AGENTS.md plus packages/backend/convex/schema.ts | Local |
| Existing crons | packages/backend/convex/crons.ts | Local |
| Existing recurring-stream queries | packages/convex-plaid/src/component/public.ts:1209 | Local |
| Existing card queries | packages/backend/convex/creditCards/queries.ts | Local |
| Existing promo + installment CRUD | packages/backend/convex/promoRates/, installmentPlans/ | Local |

---

## 8. Findings summary (for the plan)

1. **Subscription detection:** dual-key approach using Plaid `counterpartyEntityId` when present, custom regex fallback. Tolerance bands committed (§1.3).
2. **Anomaly thresholds:** 3x mean / $200 new-merchant / duplicate-24h committed. Exclusion list corrected to `RENT_AND_UTILITIES` (not `RENT`); plan tasks must use this value.
3. **Cashflow forecast:** 30-day horizon, USD depository accounts only, `subtype` whitelist (checking, savings, money market, cash management). Inflow restricted to MATURE streams. No variable spend (A approach).
4. **Workflow component:** W2 owns install. W6 ships unchanged regardless of `step.waitFor` availability (W7 owns the fallback).
5. **Idempotency:** spike blocks dispatch wiring (W6.12). All other tasks unblocked.
6. **Data retention:** committed; weekly prune cron added.

---

**End of W6 research. Findings feed [specs/W6-intelligence.md](W6-intelligence.md) §5 (algorithms) and [specs/W6-intelligence.plan.md](W6-intelligence.plan.md) (per-task acceptance criteria).**

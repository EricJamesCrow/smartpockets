# W6: SmartPockets Intelligence Features (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship five intelligence features (promo countdowns, statement reminders, anomaly detection, subscription detection, cashflow forecast) plus the producer half of the W6 to W7 notification pipeline.

**Architecture:** Six new Convex Ents tables, six new scheduled functions, one event-driven recompute hook, five direct UI mutations, five agent-readable queries, plus a dispatch boundary into W7's typed actions. W6 reads from W4-owned tables and produces denormalized rows for fast agent reads. The dispatch boundary is BLOCKED on the idempotency spike at [specs/00-idempotency-semantics.md](00-idempotency-semantics.md); all other work proceeds.

**Tech Stack:** Convex Ents 0.16.x, Convex 1.31.x, TypeScript strict, Vitest plus convex-test, bun 1.1.42, Turborepo.

---

## Plan Handoff Header

| Field | Value |
|---|---|
| Linear milestone | M3 Agentic Home (to be created) |
| Linear sub-project | W6 Intelligence Features |
| Linear issues | LIN-W6-01 through LIN-W6-13 (create up-front, one per task) |
| Recommended primary agent | Mixed: Claude Code for algorithm design (W6.3, W6.5, W6.8, W6.10), Codex for boilerplate (W6.1, W6.2, W6.4, W6.6, W6.7, W6.9, W6.11, W6.12). Final task W6.13 is post-spike Claude Code. |
| Required MCP servers | Convex (`npx convex mcp start`), Graphite (`gt mcp`); Plaid Sandbox (`uvx mcp-server-plaid ...`) recommended for fixture generation |
| Required read access | None outside the monorepo |
| Prerequisite plans (must be merged) | W2 ship of `agent/tools/read/getUpcomingStatements.ts` (for W6.12 only); W7 ship of `internal.email.dispatch.dispatch*` actions and the `emailEvents` schema (for W6.13 only); idempotency spike completion ([specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4) (for W6.13 only). W6.1 through W6.11 have no inter-workstream prerequisites because W6 invokes W7 dispatch actions through their public `internal.email.dispatch.*` boundary; the `@convex-dev/workflow` component (W2 owns per [contracts §11](00-contracts.md)) is hidden inside W7 and not directly used by any W6 file. |
| Branch | `feat/agentic-home/W6-intelligence` |
| Graphite stack parent | `main` (W6 root branch) |
| Worktree directory | `~/Developer/smartpockets-W6-intel` |
| Estimated PRs in stack | 13 |
| Review bot | CodeRabbit (mandatory pass per CLAUDE.md) |
| Rollback plan | Each PR is independently revertable. Revert in reverse order if needed (W6.13 → W6.12 → ... → W6.1). Schema migration in W6.1 is additive only (no destructive changes); revert deletes new tables. Cron entries in W6.11 are append-only; revert removes them. |
| Acceptance checklist | See bottom of this file (per master brief Section 7) |

## Context bootstrap (for fresh agent sessions)

Before starting, the agent must:

1. Read [AGENTS.md](../AGENTS.md) and [CLAUDE.md](../CLAUDE.md) in the repo root (already in context for Claude Code; Codex needs explicit read).
2. Read [specs/W0-existing-state-audit.md](W0-existing-state-audit.md) for current codebase state, especially Section 5 (existing crons), Section 8 (Plaid component), Section 10 (creditCards denormalization).
3. Read [specs/00-contracts.md](00-contracts.md) as the cross-workstream single source of truth. Where this plan disagrees with that document, that document wins; open an amendment PR.
4. Read [specs/W6-intelligence.md](W6-intelligence.md) for the authoritative spec.
5. Read this file (`specs/W6-intelligence.plan.md`) top to bottom before starting any task.
6. Read [specs/W6-intelligence.research.md](W6-intelligence.research.md) for findings (notably the `RENT_AND_UTILITIES` correction in §2.2).
7. Read [specs/W6-intelligence.brainstorm.md](W6-intelligence.brainstorm.md) for full algorithm pseudocode (referenced from this plan).
8. Run `git fetch origin` and confirm the worktree is on `feat/agentic-home/W6-intelligence`.
9. Verify required MCP servers respond:
   - `npx convex mcp start` for schema introspection
   - `gt mcp` for Graphite stack management
10. Confirm `@convex-dev/workflow` is installed (W2 prereq); for W6.13, additionally confirm idempotency spike §4 is populated.

---

## File tree

What this plan creates or modifies. Group by responsibility, not by technical layer.

```
packages/backend/convex/
├── schema.ts                                                # +6 tables (W6.1)
├── crons.ts                                                 # +6 cron entries; +1 prune entry (W6.11)
├── promoRates/
│   └── mutations.ts                                         # +scheduler hook for refreshOneInternal (W6.3)
├── agent/tools/read/
│   └── getUpcomingStatements.ts                             # data source patch (W6.12; depends on W2)
├── intelligence/                                            # all NEW
│   ├── promoCountdowns/
│   │   ├── refresh.ts                                       # refreshAllInternal + refreshOneInternal + perUserInternal (W6.3)
│   │   ├── queries.ts                                       # listForViewer (W6.3)
│   │   └── helpers.ts                                       # daysBetween, effectiveDate computation (W6.3)
│   ├── statementReminders/
│   │   ├── scan.ts                                          # scanAllInternal + perUserInternal (W6.4)
│   │   ├── queries.ts                                       # listForViewer (W6.4)
│   │   └── helpers.ts                                       # nextOccurrenceOfDayInMonth (W6.4)
│   ├── anomalies/
│   │   ├── rules.ts                                         # 3 pure rule functions (W6.5)
│   │   ├── scan.ts                                          # scanAllUsersInternal + perUserInternal (W6.6)
│   │   ├── queries.ts                                       # listForViewer (W6.6)
│   │   └── mutations.ts                                     # acknowledge, dismiss (W6.6)
│   ├── subscriptions/
│   │   ├── normalize.ts                                     # merchant normalizer (W6.7)
│   │   ├── scan.ts                                          # plaidStep + catchupStep (W6.8)
│   │   ├── queries.ts                                       # listForViewer (W6.8)
│   │   └── mutations.ts                                     # confirm, dismiss, setNickname (W6.8)
│   ├── cashflow/
│   │   ├── refresh.ts                                       # refreshAllInternal + perUserInternal (W6.9)
│   │   └── queries.ts                                       # getForViewer (W6.9)
│   ├── weeklyDigest/
│   │   └── assemble.ts                                      # assembleAllUsersInternal (W6.10)
│   └── prune.ts                                             # runAllInternal + pruneAnomaliesInternal (W6.11)
└── __tests__/
    ├── snapshots/
    │   └── w4-schema.snap.ts                                # W4 schema pin (W6.2)
    └── intelligence/
        ├── anomalies.rules.test.ts                          # unit (W6.5)
        ├── subscriptions.normalize.test.ts                  # unit (W6.7)
        ├── promoCountdowns.refresh.test.ts                  # convex-test (W6.3)
        ├── statementReminders.scan.test.ts                  # convex-test (W6.4)
        ├── anomalies.scan.test.ts                           # convex-test (W6.6)
        ├── subscriptions.scan.test.ts                       # convex-test (W6.8)
        ├── cashflow.refresh.test.ts                         # convex-test (W6.9)
        ├── weeklyDigest.assemble.test.ts                    # convex-test (W6.10)
        └── prune.test.ts                                    # convex-test (W6.11)
```

---

## Task W6.1: Schema additions for six new tables

**Recommended agent:** Codex
**Rationale:** Well-specified Ents boilerplate following established patterns in [packages/backend/convex/schema.ts](../packages/backend/convex/schema.ts). No algorithmic decisions; pure additive schema work.
**Linear issue:** LIN-W6-01

**Scope:**
- Files modified: `packages/backend/convex/schema.ts`
- Acceptance: All six tables defined with edges and indexes per [spec §4](W6-intelligence.md#4-data-model). `bun typecheck` passes. `cd packages/backend && npx convex dev` boots without error.

**Steps:**

- [ ] **Step 1: Read current schema.** Open [packages/backend/convex/schema.ts](../packages/backend/convex/schema.ts) and locate the `// === USER PREFERENCES ===` section. New W6 tables sit after `transactionOverlays` and before `getEntDefinitions`.

- [ ] **Step 2: Append `promoCountdowns` table.**

```ts
// === INTELLIGENCE (W6) ===
promoCountdowns: defineEnt({
  promoRateId: v.id("promoRates"),
  creditCardId: v.id("creditCards"),
  daysToExpiration: v.number(),
  effectiveDate: v.string(),
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

- [ ] **Step 3: Append `statementReminders` table.**

```ts
statementReminders: defineEnt({
  creditCardId: v.id("creditCards"),
  statementClosingDate: v.string(),
  daysToClose: v.number(),
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

- [ ] **Step 4: Append `anomalies` table.**

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

- [ ] **Step 5: Append `anomalyScanState` table.**

```ts
anomalyScanState: defineEnt({
  lastScannedAt: v.number(),
  lastScannedTransactionDate: v.string(),
  skippedNullMerchantCount: v.number(),
})
  .edge("user")
  .index("by_userId", ["userId"]),
```

- [ ] **Step 6: Append `detectedSubscriptions` table.**

```ts
detectedSubscriptions: defineEnt({
  normalizedMerchant: v.string(),
  amountBucket: v.number(),
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

- [ ] **Step 7: Append `cashflowForecasts` table.**

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

- [ ] **Step 8: Add reverse edges to `users` table.** Locate the `users: defineEnt({...})` block (around [schema.ts:8](../packages/backend/convex/schema.ts:8)) and add to the existing `.edges()` chain:

```ts
.edges("promoCountdowns", { ref: true })
.edges("statementReminders", { ref: true })
.edges("anomalies", { ref: true })
.edges("anomalyScanState", { ref: true })
.edges("detectedSubscriptions", { ref: true })
.edges("cashflowForecasts", { ref: true })
```

- [ ] **Step 9: Add reverse edges to `creditCards` table.** Locate the `creditCards: defineEnt({...})` block and add:

```ts
.edges("promoCountdowns", { ref: true })
.edges("statementReminders", { ref: true })
```

- [ ] **Step 10: Run typecheck.** Run `bun typecheck` from repo root. Expected: PASS. Errors typically come from typo in `v.literal(...)` strings or missing `.edge("user")` chains.

- [ ] **Step 11: Boot Convex dev to validate schema.** Run `cd packages/backend && npx convex dev` (or `bun dev:backend` from repo root). Expected: schema validates and dev server starts without error. Stop the server (`Ctrl+C`) before continuing.

- [ ] **Step 12: Commit.**

```bash
gt create feat/agentic-home/W6-01-schema -m "feat(intelligence): add 6 W6 tables (countdowns, reminders, anomalies, subs, cashflow)"
```

**Test:**
- `bun typecheck` passes.
- `npx convex dev` boots without schema error.
- No new test files in this PR (snapshot test lands in W6.2).

**Acceptance checklist:**
- [ ] Typecheck passes
- [ ] Convex dev boots clean
- [ ] CodeRabbit clean
- [ ] Reviewed by Claude Code (Codex implements; Claude Code reviews)

---

## Task W6.2: W4 schema snapshot test

**Recommended agent:** Codex
**Rationale:** Well-specified test infrastructure. Standalone PR; no business logic.
**Linear issue:** LIN-W6-02

**Scope:**
- Files created: `packages/backend/convex/__tests__/snapshots/w4-schema.snap.ts`, plus a sibling `packages/backend/convex/__tests__/w4-schema.test.ts` if Vitest setup requires it.
- Acceptance: Test runs in CI; passes against current W4 schema; would fail if any W6-read field is renamed or removed.

**Steps:**

- [ ] **Step 1: Verify Vitest setup.** Check [packages/backend/package.json](../packages/backend/package.json) for `vitest` dependency and a `test` script. If missing, this task expands to add Vitest setup before the snapshot test (use [packages/convex-plaid](../packages/convex-plaid) test config as reference).

- [ ] **Step 2: Decide snapshot strategy.** Two approaches:
  - **Reflection-based:** introspect `defineSchema` via `convex-ents` reflection API and snapshot the resulting JSON.
  - **Hand-curated JSON:** maintain a JSON literal of the W4-field subset W6 cares about; less brittle to W4-internal-only changes.

  Plan recommends **hand-curated JSON** for clarity and to avoid coupling to Convex Ents internals. Easier to read in PRs.

- [ ] **Step 3: Create the snapshot file.** Path: `packages/backend/convex/__tests__/snapshots/w4-schema.snap.ts`. Contents: a typed object literal capturing exactly the field shapes W6 reads, per [spec §9](W6-intelligence.md#9-w4-contract-read-only-and-schema-snapshot-test).

```ts
// W6 schema-pin snapshot. CI fails if a W4-owned field W6 reads is renamed
// or removed. Update this snapshot only when W6 has explicitly accepted the
// W4 schema change in a coordinated PR.

export const W4_FIELDS_W6_READS = {
  plaidTransactions: {
    fields: [
      "_id", "userId", "accountId", "amount", "date", "name",
      "merchantName", "pending", "categoryPrimary", "categoryDetailed",
      "merchantId",
    ],
    enumPin: {
      categoryPrimary: [
        "LOAN_PAYMENTS", "RENT_AND_UTILITIES", "TRANSFER_IN", "TRANSFER_OUT",
      ],
    },
  },
  plaidRecurringStreams: {
    fields: [
      "_id", "userId", "streamId", "accountId", "merchantName", "name",
      "averageAmount", "lastAmount", "frequency", "firstDate", "lastDate",
      "predictedNextDate", "status", "type", "isActive",
    ],
    enumPin: {
      status: ["MATURE", "EARLY_DETECTION", "TOMBSTONED"],
      type: ["inflow", "outflow"],
    },
  },
  plaidAccounts: {
    fields: ["userId", "type", "subtype", "balances"],
    enumPin: {
      type: ["depository"],
    },
    nested: {
      balances: ["current", "isoCurrencyCode"],
    },
  },
  plaidCreditCardLiabilities: {
    fields: [
      "nextPaymentDueDate", "minimumPaymentAmount", "lastStatementBalance",
    ],
  },
} as const;
```

- [ ] **Step 4: Create the test file.** Path: `packages/backend/convex/__tests__/w4-schema.test.ts`. The test introspects the live schema and asserts each pinned field exists with the expected shape. For hand-curated approach, the assertion compares against the literal above and Plaid component schema imports.

```ts
import { describe, it, expect } from "vitest";
import { W4_FIELDS_W6_READS } from "./snapshots/w4-schema.snap";
import { Schema as PlaidSchema } from "../../../convex-plaid/src/component/_generated/dataModel";
// (exact import path depends on convex-plaid build output; verify during execution)

describe("W4 schema pin (W6 contract)", () => {
  for (const [tableName, expectations] of Object.entries(W4_FIELDS_W6_READS)) {
    it(`${tableName} retains expected fields`, () => {
      // Pseudocode; actual assertion uses Plaid component table schema introspection
      for (const fieldName of expectations.fields) {
        expect(/* schema lookup */).toBeDefined();
      }
    });
    if ("enumPin" in expectations) {
      it(`${tableName} retains expected enum values`, () => {
        for (const [enumField, expectedValues] of Object.entries(expectations.enumPin)) {
          for (const value of expectedValues) {
            expect(/* enum lookup */).toContain(value);
          }
        }
      });
    }
  }
});
```

**Implementation note:** the exact introspection API depends on `convex-ents` reflection support. If reflection is unavailable, the test reads the schema files as text and asserts substring presence (fragile but works). Confirm during execution.

- [ ] **Step 5: Run the test.** Run `cd packages/backend && bun run test -- w4-schema`. Expected: PASS.

- [ ] **Step 6: Verify failure mode.** Manually rename a W4 field in the snapshot (e.g., change `merchantName` to `merchantNameZZZ`) and re-run. Expected: FAIL with a clear "missing field" message. Revert the change.

- [ ] **Step 7: Commit.**

```bash
gt create feat/agentic-home/W6-02-w4-snapshot -m "test(intelligence): pin W4 schema fields W6 reads (snapshot test)"
```

**Test:**
- New test at `packages/backend/convex/__tests__/w4-schema.test.ts` passes.
- Manual mutation of snapshot causes failure (verifies the test actually checks).

**Acceptance checklist:**
- [ ] Test passes
- [ ] Failure mode verified manually
- [ ] CodeRabbit clean
- [ ] Reviewed by Claude Code

---

## Task W6.3: Promo countdown (refresh, queries, helpers, recompute hook)

**Recommended agent:** Claude Code
**Rationale:** Multi-file: new `intelligence/promoCountdowns/` directory plus a cross-cutting hook into the existing `promoRates/mutations.ts`. The recompute-hook design must respect existing mutation patterns and not regress promo CRUD.
**Linear issue:** LIN-W6-03

**Scope:**
- Files created: `packages/backend/convex/intelligence/promoCountdowns/refresh.ts`, `queries.ts`, `helpers.ts`; `packages/backend/convex/__tests__/intelligence/promoCountdowns.refresh.test.ts`.
- Files modified: `packages/backend/convex/promoRates/mutations.ts` (append scheduler hook to relevant mutations).
- Acceptance: `refreshAllInternal` produces correct rows for every active `promoRates`; `refreshOneInternal` updates one row per call; mutation hook fires within transaction; `listForViewer` returns sorted rows.

**Steps:**

- [ ] **Step 1: Write `helpers.ts`.** Pure functions, easy to unit-test if we add tests later. Path: `packages/backend/convex/intelligence/promoCountdowns/helpers.ts`.

```ts
// Pure date math; no Convex context required.

export function daysBetween(fromYmd: string, toYmd: string): number {
  // YYYY-MM-DD strings parsed as UTC midnight
  const from = new Date(`${fromYmd}T00:00:00Z`);
  const to = new Date(`${toYmd}T00:00:00Z`);
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function todayUtcYmd(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export type EffectiveDateResult = {
  effectiveDate: string;
  sourceField: "override" | "plaid" | "manual";
  originalExpirationDate: string;
};

export function computeEffectiveDate(promo: {
  expirationDate: string;
  userOverrides?: { expirationDate?: string };
  isManual?: boolean;
}): EffectiveDateResult {
  const original = promo.expirationDate;
  const override = promo.userOverrides?.expirationDate;
  if (override) {
    return { effectiveDate: override, sourceField: "override", originalExpirationDate: original };
  }
  if (promo.isManual) {
    return { effectiveDate: original, sourceField: "manual", originalExpirationDate: original };
  }
  return { effectiveDate: original, sourceField: "plaid", originalExpirationDate: original };
}
```

- [ ] **Step 2: Write `refresh.ts` with three internal actions.** Path: `packages/backend/convex/intelligence/promoCountdowns/refresh.ts`.

```ts
import { internalAction, internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";
import { computeEffectiveDate, daysBetween, todayUtcYmd } from "./helpers";

export const refreshAllInternal = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Fan out per user. Mirrors syncAllActiveItemsInternal pattern.
    const userIds = await ctx.runQuery(internal.intelligence.promoCountdowns.refresh.listUserIdsWithActivePromosInternal, {});
    for (const userId of userIds) {
      await ctx.scheduler.runAfter(0, internal.intelligence.promoCountdowns.refresh.refreshOneUserInternal, { userId });
    }
    return null;
  },
});

export const listUserIdsWithActivePromosInternal = internalQuery({
  args: {},
  returns: v.array(v.id("users")),
  handler: async (ctx) => {
    // Pseudocode: distinct userIds across promoRates where isActive
    // Implementation uses ctx.table("promoRates").filter(...) and dedupe
    return [];
  },
});

export const refreshOneUserInternal = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    // For each active promoRates of this user, upsert promoCountdowns
    const promos = await ctx.table("promoRates")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("isActive"), true));

    for (const promo of promos) {
      await upsertCountdown(ctx, promo);
    }

    // Cleanup: delete any promoCountdowns rows whose underlying promo flipped inactive
    const orphans = await ctx.table("promoCountdowns")
      .filter((q) => q.eq(q.field("userId"), userId));
    for (const row of orphans) {
      const promo = await ctx.table("promoRates").get(row.promoRateId);
      if (!promo || !promo.isActive) {
        const writable = await ctx.table("promoCountdowns").getX(row._id);
        await writable.delete();
      }
    }
    return null;
  },
});

export const refreshOneInternal = internalMutation({
  args: { promoRateId: v.id("promoRates") },
  returns: v.null(),
  handler: async (ctx, { promoRateId }) => {
    const promo = await ctx.table("promoRates").get(promoRateId);
    if (!promo) {
      // Promo deleted; remove any matching countdown
      const existing = await ctx.table("promoCountdowns")
        .filter((q) => q.eq(q.field("promoRateId"), promoRateId))
        .first();
      if (existing) {
        const writable = await ctx.table("promoCountdowns").getX(existing._id);
        await writable.delete();
      }
      return null;
    }
    if (!promo.isActive) {
      // Promo deactivated; remove countdown
      const existing = await ctx.table("promoCountdowns")
        .filter((q) => q.eq(q.field("promoRateId"), promoRateId))
        .first();
      if (existing) {
        const writable = await ctx.table("promoCountdowns").getX(existing._id);
        await writable.delete();
      }
      return null;
    }
    await upsertCountdown(ctx, promo);
    return null;
  },
});

async function upsertCountdown(ctx: any, promo: any): Promise<void> {
  const today = todayUtcYmd();
  const { effectiveDate, sourceField, originalExpirationDate } = computeEffectiveDate(promo);
  const daysToExpiration = daysBetween(today, effectiveDate);

  const existing = await ctx.table("promoCountdowns")
    .filter((q: any) => q.eq(q.field("promoRateId"), promo._id))
    .first();

  const fields = {
    promoRateId: promo._id,
    creditCardId: promo.creditCardId,
    userId: promo.userId,
    daysToExpiration,
    effectiveDate,
    sourceField,
    originalExpirationDate,
    isDeferredInterest: promo.isDeferredInterest,
    remainingBalance: promo.remainingBalance,
    accruedDeferredInterest: promo.accruedDeferredInterest,
    lastRefreshedAt: Date.now(),
  };

  if (existing) {
    const writable = await ctx.table("promoCountdowns").getX(existing._id);
    await writable.patch(fields);
  } else {
    await ctx.table("promoCountdowns").insert(fields);
  }

  // BLOCKED on idempotency spike: dispatch call site for promo-warning emails
  // is added in W6.13 once specs/00-idempotency-semantics.md §4 is populated.
  // Placeholder marker:
  // TODO(W6.13): for daysToExpiration in {30, 14, 7, 1}, call internal.email.dispatch.dispatchPromoWarning
}
```

- [ ] **Step 3: Write `queries.ts`.** Path: `packages/backend/convex/intelligence/promoCountdowns/queries.ts`.

```ts
import { query } from "../../functions";
import { v } from "convex/values";

export const listForViewer = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    promoCountdownId: v.id("promoCountdowns"),
    creditCardId: v.id("creditCards"),
    creditCardName: v.string(),
    promoDescription: v.string(),
    daysToExpiration: v.number(),
    effectiveDate: v.string(),
    sourceField: v.union(v.literal("override"), v.literal("plaid"), v.literal("manual")),
    originalExpirationDate: v.string(),
    isDeferredInterest: v.boolean(),
    remainingBalance: v.number(),
    accruedDeferredInterest: v.optional(v.number()),
  })),
  handler: async (ctx, { limit = 20 }) => {
    const viewer = await ctx.viewerX();
    const rows = await ctx.table("promoCountdowns", "by_user_daysToExpiration",
      (q) => q.eq("userId", viewer._id))
      .order("asc")
      .take(limit);

    const enriched = [];
    for (const row of rows) {
      const promo = await ctx.table("promoRates").get(row.promoRateId);
      const card = await ctx.table("creditCards").get(row.creditCardId);
      if (!promo || !card) continue;
      enriched.push({
        promoCountdownId: row._id,
        creditCardId: row.creditCardId,
        creditCardName: card.displayName,
        promoDescription: promo.description,
        daysToExpiration: row.daysToExpiration,
        effectiveDate: row.effectiveDate,
        sourceField: row.sourceField,
        originalExpirationDate: row.originalExpirationDate,
        isDeferredInterest: row.isDeferredInterest,
        remainingBalance: row.remainingBalance,
        accruedDeferredInterest: row.accruedDeferredInterest,
      });
    }
    return enriched;
  },
});
```

- [ ] **Step 4: Add scheduler hook to `promoRates/mutations.ts`.** For each public mutation that changes `expirationDate`, `userOverrides.expirationDate`, `isActive`, or hard-deletes (audit the file to enumerate; current mutations include create, update, setOverride, clearOverride, remove per [W0 §10.5](W0-existing-state-audit.md#105-promorates-and-installmentplans-smartpockets-owned)), append after the patch/insert:

```ts
await ctx.scheduler.runAfter(0, internal.intelligence.promoCountdowns.refresh.refreshOneInternal, {
  promoRateId,
});
```

For deletes, pass the same `promoRateId` (the refresh handler detects deletion).

- [ ] **Step 5: Write convex-test integration test.** Path: `packages/backend/convex/__tests__/intelligence/promoCountdowns.refresh.test.ts`. Cover:

  - Plaid promo (no override) → countdown row with `sourceField: "plaid"`.
  - Manual promo → `sourceField: "manual"`.
  - Promo with override → `sourceField: "override"`, `effectiveDate` matches override.
  - Promo flips `isActive: false` → row deleted on next refresh.
  - `refreshOneInternal` after `update` mutation → row reflects new expiration date in same transaction-scheduler boundary.
  - `daysToExpiration` correctly computed for past, today, and future dates.

- [ ] **Step 6: Run typecheck and tests.** `bun typecheck && cd packages/backend && bun run test -- promoCountdowns`. Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
gt create feat/agentic-home/W6-03-promo-countdown -m "feat(intelligence): promo countdown refresh + recompute hook on promoRates mutations"
```

**Test:**
- 6 unit/integration tests pass.
- Typecheck passes.
- Manual smoke test: in dev Convex, mutate a `promoRates` row's `userOverrides.expirationDate` and observe `promoCountdowns.effectiveDate` update within the same scheduler tick (use Convex MCP to read both rows).

**Acceptance checklist:**
- [ ] Typecheck passes
- [ ] Tests pass
- [ ] Manual smoke test confirmed
- [ ] CodeRabbit clean
- [ ] Reviewed by Codex (Claude Code implements; Codex reviews)

---

## Task W6.4: Statement reminder (scan, queries, helpers)

**Recommended agent:** Codex
**Rationale:** Algorithm is well-specified once `nextOccurrenceOfDayInMonth` is correct. Single-file scan with helpers; no cross-cutting hooks.
**Linear issue:** LIN-W6-04

**Scope:**
- Files created: `intelligence/statementReminders/scan.ts`, `queries.ts`, `helpers.ts`; tests at `__tests__/intelligence/statementReminders.scan.test.ts`.
- Acceptance: `scanAllInternal` writes one row per active card with `statementClosingDay` set, `daysToClose ∈ [0..7]`. February-end snap correct.

**Steps:**

- [ ] **Step 1: Write `helpers.ts`.** Date math for next-occurrence-of-day-in-month with end-of-month snap.

```ts
export function nextOccurrenceOfDayInMonth(
  closingDay: number,
  fromYmd: string,
): string {
  const from = new Date(`${fromYmd}T00:00:00Z`);
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const day = from.getUTCDate();

  // Try this month first
  const lastDayThisMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const candidateThisMonth = Math.min(closingDay, lastDayThisMonth);
  if (candidateThisMonth >= day) {
    return formatYmd(year, month, candidateThisMonth);
  }

  // Roll to next month
  const nextMonth = month + 1;
  const lastDayNextMonth = new Date(Date.UTC(year, nextMonth + 1, 0)).getUTCDate();
  const candidateNextMonth = Math.min(closingDay, lastDayNextMonth);
  return formatYmd(year, nextMonth, candidateNextMonth);
}

function formatYmd(year: number, monthZeroBased: number, day: number): string {
  const date = new Date(Date.UTC(year, monthZeroBased, day));
  return date.toISOString().slice(0, 10);
}
```

- [ ] **Step 2: Write `scan.ts`.** Daily cron handler with per-user fan-out.

```ts
import { internalAction, internalMutation, internalQuery } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";
import { nextOccurrenceOfDayInMonth } from "./helpers";
import { daysBetween, todayUtcYmd } from "../promoCountdowns/helpers";

export const scanAllInternal = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userIds = await ctx.runQuery(internal.intelligence.statementReminders.scan.listUserIdsWithActiveCardsInternal, {});
    for (const userId of userIds) {
      await ctx.scheduler.runAfter(0, internal.intelligence.statementReminders.scan.scanForUserInternal, { userId });
    }
    return null;
  },
});

export const listUserIdsWithActiveCardsInternal = internalQuery({
  args: {},
  returns: v.array(v.id("users")),
  handler: async (ctx) => {
    // distinct userIds across creditCards where isActive
    return [];
  },
});

export const scanForUserInternal = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const cards = await ctx.table("creditCards")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("isActive"), true));

    const today = todayUtcYmd();

    for (const card of cards) {
      if (card.statementClosingDay == null) continue;
      const statementClosingDate = nextOccurrenceOfDayInMonth(card.statementClosingDay, today);
      const daysToClose = daysBetween(today, statementClosingDate);
      if (daysToClose < 0 || daysToClose > 7) continue;

      const existing = await ctx.table("statementReminders")
        .filter((q) => q.eq(q.field("creditCardId"), card._id))
        .first();

      const fields = {
        creditCardId: card._id,
        userId: card.userId,
        statementClosingDate,
        daysToClose,
        nextPaymentDueDate: card.nextPaymentDueDate,
        minimumPaymentAmount: card.minimumPaymentAmount,
        lastStatementBalance: card.lastStatementBalance,
        lastRefreshedAt: Date.now(),
      };

      if (existing) {
        const writable = await ctx.table("statementReminders").getX(existing._id);
        await writable.patch(fields);
      } else {
        await ctx.table("statementReminders").insert(fields);
      }
    }

    // Cleanup: delete reminder rows for cards that flipped inactive or have no closingDay
    const reminders = await ctx.table("statementReminders")
      .filter((q) => q.eq(q.field("userId"), userId));
    for (const reminder of reminders) {
      const card = await ctx.table("creditCards").get(reminder.creditCardId);
      if (!card || !card.isActive || card.statementClosingDay == null) {
        const writable = await ctx.table("statementReminders").getX(reminder._id);
        await writable.delete();
      }
    }

    // BLOCKED on spike (W6.13): dispatch call site for statement-closing emails
    // TODO(W6.13): consolidate cards with daysToClose ∈ {3, 1} per user, call internal.email.dispatch.dispatchStatementReminder
    return null;
  },
});
```

- [ ] **Step 3: Write `queries.ts`.** `listForViewer` returns active reminders sorted by `daysToClose` asc.

```ts
import { query } from "../../functions";
import { v } from "convex/values";

export const listForViewer = query({
  args: { maxDaysToClose: v.optional(v.number()) },
  returns: v.array(v.object({
    statementReminderId: v.id("statementReminders"),
    creditCardId: v.id("creditCards"),
    creditCardName: v.string(),
    statementClosingDate: v.string(),
    daysToClose: v.number(),
    nextPaymentDueDate: v.optional(v.string()),
    minimumPaymentAmount: v.optional(v.number()),
    lastStatementBalance: v.optional(v.number()),
  })),
  handler: async (ctx, { maxDaysToClose = 7 }) => {
    const viewer = await ctx.viewerX();
    const rows = await ctx.table("statementReminders", "by_user_daysToClose",
      (q) => q.eq("userId", viewer._id))
      .order("asc");
    const filtered = [];
    for (const row of rows) {
      if (row.daysToClose > maxDaysToClose) continue;
      const card = await ctx.table("creditCards").get(row.creditCardId);
      if (!card) continue;
      filtered.push({
        statementReminderId: row._id,
        creditCardId: row.creditCardId,
        creditCardName: card.displayName,
        statementClosingDate: row.statementClosingDate,
        daysToClose: row.daysToClose,
        nextPaymentDueDate: row.nextPaymentDueDate,
        minimumPaymentAmount: row.minimumPaymentAmount,
        lastStatementBalance: row.lastStatementBalance,
      });
    }
    return filtered;
  },
});
```

- [ ] **Step 4: Write convex-test integration tests.** Cover: end-of-month snap (closingDay 31 in February → snap to 28/29), card with no closingDay (skipped), card flips inactive (cleanup), midnight UTC date math.

- [ ] **Step 5: Run typecheck and tests.** Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
gt create feat/agentic-home/W6-04-statement-reminder -m "feat(intelligence): statement reminder daily scan + queries"
```

**Test:**
- Integration tests cover end-of-month snap, missing closingDay, card lifecycle.
- Typecheck passes.

**Acceptance checklist:**
- [ ] Typecheck passes
- [ ] Tests pass
- [ ] CodeRabbit clean
- [ ] Reviewed by Claude Code

---

## Task W6.5: Anomaly rules (3 pure functions) and unit tests

**Recommended agent:** Claude Code
**Rationale:** Algorithm design with subtle edge cases (refunds, pending, null merchant, exclusion categories, the corrected `RENT_AND_UTILITIES` from research). Pure functions invite thorough unit testing. Multi-rule design needs holistic reasoning.
**Linear issue:** LIN-W6-05

**Scope:**
- Files created: `intelligence/anomalies/rules.ts`; `__tests__/intelligence/anomalies.rules.test.ts`.
- Acceptance: Three pure rule functions, no Convex context required, full edge-case coverage in unit tests.

**Steps:**

- [ ] **Step 1: Define types and constants in `rules.ts`.**

```ts
export const EXCLUSION_CATEGORIES = new Set([
  "LOAN_PAYMENTS",
  "RENT_AND_UTILITIES",  // per research §2.2 correction (was "RENT")
  "TRANSFER_IN",
  "TRANSFER_OUT",
]);

export const NEW_MERCHANT_THRESHOLD_DOLLARS = 200;
export const SPIKE_MULTIPLIER = 3;
export const SPIKE_MIN_PRIOR_COUNT = 3;
export const SPIKE_WINDOW_DAYS = 90;
export const NEW_MERCHANT_WINDOW_DAYS = 365;
export const DUPLICATE_WINDOW_HOURS = 24;

export type Transaction = {
  plaidTransactionId: string;
  amount: number;          // dollars (positive = outflow)
  date: string;            // YYYY-MM-DD
  merchantName: string | null;
  pending: boolean;
  categoryPrimary: string | null;
};

export type RuleResult = {
  ruleType: "amount_spike_3x" | "new_merchant_threshold" | "duplicate_charge_24h";
  score: number;
  evidenceJson: string;
};

export function isEligibleForScan(t: Transaction): boolean {
  if (t.pending) return false;
  if (t.amount < 0) return false;
  if (!t.merchantName) return false;
  if (t.categoryPrimary && EXCLUSION_CATEGORIES.has(t.categoryPrimary)) return false;
  return true;
}
```

- [ ] **Step 2: Implement `evaluateAmountSpike`.**

```ts
export function evaluateAmountSpike(
  t: Transaction,
  priorAtMerchant: Transaction[],  // last 90 days, same merchant, excluding t
): RuleResult | null {
  if (!isEligibleForScan(t)) return null;
  if (priorAtMerchant.length < SPIKE_MIN_PRIOR_COUNT) return null;
  const sum = priorAtMerchant.reduce((acc, p) => acc + p.amount, 0);
  const mean = sum / priorAtMerchant.length;
  if (mean <= 0) return null;  // defensive
  if (t.amount <= SPIKE_MULTIPLIER * mean) return null;
  return {
    ruleType: "amount_spike_3x",
    score: t.amount / mean,
    evidenceJson: JSON.stringify({
      priorCount: priorAtMerchant.length,
      mean,
      windowDays: SPIKE_WINDOW_DAYS,
    }),
  };
}
```

- [ ] **Step 3: Implement `evaluateNewMerchantThreshold`.**

```ts
export function evaluateNewMerchantThreshold(
  t: Transaction,
  priorCountAtMerchant365d: number,
): RuleResult | null {
  if (!isEligibleForScan(t)) return null;
  if (priorCountAtMerchant365d > 0) return null;
  if (t.amount <= NEW_MERCHANT_THRESHOLD_DOLLARS) return null;
  return {
    ruleType: "new_merchant_threshold",
    score: t.amount,
    evidenceJson: JSON.stringify({
      windowDays: NEW_MERCHANT_WINDOW_DAYS,
    }),
  };
}
```

- [ ] **Step 4: Implement `evaluateDuplicateCharge`.**

```ts
export function evaluateDuplicateCharge(
  t: Transaction,
  candidatesWithin24h: Transaction[],  // same user, same merchant, ±24h, excluding t
): RuleResult | null {
  if (!isEligibleForScan(t)) return null;
  const matches = candidatesWithin24h.filter((c) => c.amount === t.amount);
  if (matches.length === 0) return null;
  return {
    ruleType: "duplicate_charge_24h",
    score: 1,
    evidenceJson: JSON.stringify({
      pairTransactionIds: matches.map((m) => m.plaidTransactionId),
    }),
  };
}
```

- [ ] **Step 5: Write unit tests.** Path: `packages/backend/convex/__tests__/intelligence/anomalies.rules.test.ts`. Cover for each rule:
  - Eligible txn that triggers → rule fires with correct score.
  - Eligible txn that does not trigger (boundary case: exactly $200, exactly 3x mean) → no fire.
  - Skip cases: refund (`amount < 0`), pending (`pending: true`), null merchant, excluded category (use `RENT_AND_UTILITIES`).
  - Spike: < 3 prior at merchant → no fire even if amount large.
  - Spike: prior mean is 0 → no fire (defensive).
  - New merchant: 1 prior → no fire.
  - Duplicate: amount differs by $0.01 → no fire.
  - Duplicate: outside 24h window → no fire.

Aim for 25+ test cases across the three rules.

- [ ] **Step 6: Run tests.** `cd packages/backend && bun run test -- anomalies.rules`. Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
gt create feat/agentic-home/W6-05-anomaly-rules -m "feat(intelligence): anomaly detection rules (3 pure functions, RENT_AND_UTILITIES exclusion)"
```

**Test:**
- 25+ unit tests pass.
- Typecheck passes.

**Acceptance checklist:**
- [ ] Tests pass
- [ ] Typecheck passes
- [ ] CodeRabbit clean
- [ ] Reviewed by Codex (Claude Code implements; Codex reviews)

---

## Task W6.6: Anomaly scan (watermarked) + queries + mutations

**Recommended agent:** Codex
**Rationale:** Once W6.5 ships pure rules, the scan loop is well-specified. Mutations are single-field patches.
**Linear issue:** LIN-W6-06

**Scope:**
- Files created: `intelligence/anomalies/scan.ts`, `queries.ts`, `mutations.ts`; tests at `__tests__/intelligence/anomalies.scan.test.ts`.
- Acceptance: Hourly cron processes new transactions since watermark; rules fire correctly; mutations patch userStatus.

**Steps:**

- [ ] **Step 1: Write `scan.ts`.** Hourly entry point with per-user fan-out and watermark advancement.

```ts
import { internalAction, internalMutation, internalQuery } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";
import {
  evaluateAmountSpike,
  evaluateNewMerchantThreshold,
  evaluateDuplicateCharge,
  type Transaction,
  SPIKE_WINDOW_DAYS,
  NEW_MERCHANT_WINDOW_DAYS,
} from "./rules";

export const scanAllUsersInternal = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userIds = await ctx.runQuery(internal.intelligence.anomalies.scan.listUserIdsForScanInternal, {});
    for (const userId of userIds) {
      await ctx.scheduler.runAfter(0, internal.intelligence.anomalies.scan.scanForUserInternal, { userId });
    }
    return null;
  },
});

export const listUserIdsForScanInternal = internalQuery({
  args: {},
  returns: v.array(v.id("users")),
  handler: async (ctx) => {
    // distinct userIds across plaidItems where isActive (any user with at least one connected item)
    return [];
  },
});

export const scanForUserInternal = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    // Load or create watermark
    const stateRow = await ctx.table("anomalyScanState")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    const since = stateRow?.lastScannedTransactionDate ?? "1970-01-01";

    // Pull new transactions since watermark via Plaid component query
    // (Pseudocode; use the appropriate component query for date-filtered txns)
    const newTxns: Transaction[] = await fetchTransactionsSince(ctx, userId, since);

    let skippedNullCount = 0;
    let maxDate = since;

    for (const t of newTxns) {
      if (t.date > maxDate) maxDate = t.date;
      if (!t.merchantName) {
        skippedNullCount++;
        continue;
      }

      // Spike rule needs prior 90 days at same merchant
      const prior90 = await fetchPriorAtMerchant(ctx, userId, t.merchantName, t.date, SPIKE_WINDOW_DAYS, t.plaidTransactionId);
      const spike = evaluateAmountSpike(t, prior90);
      if (spike) await upsertAnomaly(ctx, userId, t, spike);

      // New-merchant rule needs prior count in 365 days
      const prior365Count = await countPriorAtMerchant(ctx, userId, t.merchantName, t.date, NEW_MERCHANT_WINDOW_DAYS, t.plaidTransactionId);
      const newMerchant = evaluateNewMerchantThreshold(t, prior365Count);
      if (newMerchant) await upsertAnomaly(ctx, userId, t, newMerchant);

      // Duplicate rule needs same-amount candidates within 24h
      const candidates24h = await fetchSameMerchant24h(ctx, userId, t.merchantName, t.date, t.plaidTransactionId);
      const duplicate = evaluateDuplicateCharge(t, candidates24h);
      if (duplicate) await upsertAnomaly(ctx, userId, t, duplicate);
    }

    // Update watermark
    if (stateRow) {
      const writable = await ctx.table("anomalyScanState").getX(stateRow._id);
      await writable.patch({
        lastScannedAt: Date.now(),
        lastScannedTransactionDate: maxDate,
        skippedNullMerchantCount: stateRow.skippedNullMerchantCount + skippedNullCount,
      });
    } else {
      await ctx.table("anomalyScanState").insert({
        userId,
        lastScannedAt: Date.now(),
        lastScannedTransactionDate: maxDate,
        skippedNullMerchantCount: skippedNullCount,
      });
    }
    return null;
  },
});

async function upsertAnomaly(ctx: any, userId: string, t: Transaction, result: any): Promise<void> {
  const existing = await ctx.table("anomalies")
    .filter((q: any) => q.eq(q.field("plaidTransactionId"), t.plaidTransactionId))
    .filter((q: any) => q.eq(q.field("ruleType"), result.ruleType))
    .first();

  if (existing) return;  // already flagged; do not re-fire dispatch

  const insertedId = await ctx.table("anomalies").insert({
    userId,
    plaidTransactionId: t.plaidTransactionId,
    ruleType: result.ruleType,
    score: result.score,
    evidenceJson: result.evidenceJson,
    merchantName: t.merchantName!,
    amount: t.amount,
    transactionDate: t.date,
    detectedAt: Date.now(),
    userStatus: "pending",
  });

  // BLOCKED on spike (W6.13): dispatch call site
  // TODO(W6.13): call internal.email.dispatch.dispatchAnomalyAlert({ userId, anomalyId: insertedId })
}

// Helpers below are pseudocode; the W6 plan-execution agent fills them in
// against the actual Plaid component query API. See W0 §8.2 for the available
// component queries and packages/convex-plaid/src/component/public.ts for shapes.
async function fetchTransactionsSince(ctx: any, userId: string, sinceYmd: string): Promise<Transaction[]> {
  // Query plaidTransactions by_date index where userId = userId && date >= sinceYmd
  return [];
}

async function fetchPriorAtMerchant(ctx: any, userId: string, merchantName: string, currentDate: string, windowDays: number, excludeTxnId: string): Promise<Transaction[]> {
  // Query plaidTransactions by_merchant index, filter to last `windowDays` days, exclude current txn
  return [];
}

async function countPriorAtMerchant(ctx: any, userId: string, merchantName: string, currentDate: string, windowDays: number, excludeTxnId: string): Promise<number> {
  // Count-only variant
  return 0;
}

async function fetchSameMerchant24h(ctx: any, userId: string, merchantName: string, currentDate: string, excludeTxnId: string): Promise<Transaction[]> {
  // Query plaidTransactions by_merchant, filter to ±24h of currentDate, exclude current
  return [];
}
```

- [ ] **Step 2: Write `queries.ts`.** `listForViewer` returns anomalies for the viewer.

```ts
import { query } from "../../functions";
import { v } from "convex/values";

export const listForViewer = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("all"))),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    anomalyId: v.id("anomalies"),
    plaidTransactionId: v.string(),
    ruleType: v.union(
      v.literal("amount_spike_3x"),
      v.literal("new_merchant_threshold"),
      v.literal("duplicate_charge_24h"),
    ),
    score: v.number(),
    merchantName: v.string(),
    amount: v.number(),
    transactionDate: v.string(),
    detectedAt: v.number(),
    userStatus: v.union(
      v.literal("pending"),
      v.literal("acknowledged"),
      v.literal("dismissed_false_positive"),
    ),
  })),
  handler: async (ctx, { status = "pending", limit = 50 }) => {
    const viewer = await ctx.viewerX();
    let rows = await ctx.table("anomalies", "by_user_detectedAt",
      (q) => q.eq("userId", viewer._id))
      .order("desc");
    if (status === "pending") {
      rows = rows.filter((r: any) => r.userStatus === "pending");
    }
    return rows.slice(0, limit).map((r: any) => ({
      anomalyId: r._id,
      plaidTransactionId: r.plaidTransactionId,
      ruleType: r.ruleType,
      score: r.score,
      merchantName: r.merchantName,
      amount: r.amount,
      transactionDate: r.transactionDate,
      detectedAt: r.detectedAt,
      userStatus: r.userStatus,
    }));
  },
});
```

- [ ] **Step 3: Write `mutations.ts`.** Direct mutations per [contracts §16](00-contracts.md).

```ts
import { mutation } from "../../functions";
import { v } from "convex/values";

export const acknowledge = mutation({
  args: { anomalyId: v.id("anomalies") },
  returns: v.null(),
  handler: async (ctx, { anomalyId }) => {
    const viewer = await ctx.viewerX();
    const row = await ctx.table("anomalies").getX(anomalyId);
    if (row.userId !== viewer._id) throw new Error("Not authorized");
    await row.patch({
      userStatus: "acknowledged",
      userStatusUpdatedAt: Date.now(),
    });
    return null;
  },
});

export const dismiss = mutation({
  args: { anomalyId: v.id("anomalies") },
  returns: v.null(),
  handler: async (ctx, { anomalyId }) => {
    const viewer = await ctx.viewerX();
    const row = await ctx.table("anomalies").getX(anomalyId);
    if (row.userId !== viewer._id) throw new Error("Not authorized");
    await row.patch({
      userStatus: "dismissed_false_positive",
      userStatusUpdatedAt: Date.now(),
    });
    return null;
  },
});
```

- [ ] **Step 4: Write convex-test integration tests.** Cover: single-rule fire creates one row; multi-rule fire creates two rows; existing anomaly does not re-fire dispatch (idempotency at the row level); watermark advances; null-merchant counter increments; mutations patch correctly; mutations reject other-user anomalyId.

- [ ] **Step 5: Run typecheck and tests.** Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
gt create feat/agentic-home/W6-06-anomaly-scan -m "feat(intelligence): anomaly scan (hourly watermarked) + queries + mutations"
```

**Test:**
- Integration tests: rule firing, watermark, mutations.
- Typecheck.

**Acceptance checklist:**
- [ ] Tests pass
- [ ] Typecheck passes
- [ ] Watermark advances correctly across runs (manual smoke test)
- [ ] CodeRabbit clean
- [ ] Reviewed by Claude Code

---

## Task W6.7: Subscription merchant normalize (pure function)

**Recommended agent:** Codex
**Rationale:** Pure function with comprehensive test fixtures already enumerated in research. Boilerplate-leaning.
**Linear issue:** LIN-W6-07

**Scope:**
- Files created: `intelligence/subscriptions/normalize.ts`; `__tests__/intelligence/subscriptions.normalize.test.ts`.
- Acceptance: Normalize matches the spec (research §1.4 fixtures); test cases all round-trip correctly.

**Steps:**

- [ ] **Step 1: Implement `normalize.ts`.** Per [brainstorm §4.4.4](W6-intelligence.brainstorm.md#444-normalizemerchantname-specification) (with the digit-stripping step 4 added in self-review).

```ts
const PROCESSOR_PREFIXES = [
  /^tst\*/i,
  /^sq\s*\*/i,
  /^pp\*/i,
  /^sp\s*\*/i,
  /^apl\*/i,
  /^payp\*/i,
  /^stripe\*/i,
];

const TRAILING_DESCRIPTOR_NOISE = [
  /\*[A-Z0-9]{4,}\b/gi,    // *ABC123 trailing transaction id
  /#\d{3,}\b/g,             // #1234 location number
];

const STANDALONE_DIGITS = /\b\d{3,}\b/g;

const TRAILING_STATE_CODE = /\s+[A-Z]{2}\s*$/;

export function normalizeMerchantName(input: string): string {
  let s = input.toLowerCase().trim();
  let prev = "";
  let pass = 0;
  while (s !== prev && pass < 3) {
    prev = s;
    pass++;
    for (const re of PROCESSOR_PREFIXES) s = s.replace(re, "");
    for (const re of TRAILING_DESCRIPTOR_NOISE) s = s.replace(re, "");
    s = s.replace(STANDALONE_DIGITS, "");
    s = s.replace(TRAILING_STATE_CODE.source.replace(/[A-Z]/g, "[a-z]"), "");
    s = s.replace(/\s+/g, " ").trim();
  }
  return s;
}
```

(Note: state-code regex applied case-insensitively after lowercase; convert pattern accordingly. Fixtures verify.)

- [ ] **Step 2: Write unit tests.** Use the eight fixtures from research §1.4 plus boundary cases:
  - empty string → empty
  - already-normalized → no-op
  - very long input → handled within 3 passes
  - input with multiple processor prefixes → first one stripped (test ordering)

- [ ] **Step 3: Run tests.** Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
gt create feat/agentic-home/W6-07-sub-normalize -m "feat(intelligence): merchant name normalizer (pure function with fixtures)"
```

**Test:**
- 12+ unit tests (8 research fixtures + 4 boundaries) pass.

**Acceptance checklist:**
- [ ] Tests pass
- [ ] CodeRabbit clean
- [ ] Reviewed by Claude Code

---

## Task W6.8: Subscription scan (Plaid + catchup) + queries + mutations

**Recommended agent:** Claude Code
**Rationale:** Two-step algorithm with dual-key logic (Plaid `counterpartyEntityId` first, normalize fallback per research §1.2), per-item fan-out, source-precedence rules. Multi-file with cross-cutting tests.
**Linear issue:** LIN-W6-08

**Scope:**
- Files created: `intelligence/subscriptions/scan.ts`, `queries.ts`, `mutations.ts`; tests at `__tests__/intelligence/subscriptions.scan.test.ts`.
- Acceptance: Plaid step ingests MATURE outflow streams; catchup step finds ≥3-occurrence groups within tolerance; both upsert keyed correctly; source precedence respected.

**Steps:**

- [ ] **Step 1: Write `scan.ts` skeleton.** Three internal entry points: `scanAllUsersInternal`, `scanForItemInternal`, `runCatchupForUserInternal`.

```ts
import { internalAction, internalMutation, internalQuery } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";
import { normalizeMerchantName } from "./normalize";

export const scanAllUsersInternal = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Fan out per plaidItem (mirrors syncAllActiveItemsInternal)
    const itemIds = await ctx.runQuery(internal.intelligence.subscriptions.scan.listActivePlaidItemsInternal, {});
    for (const { itemId, userId } of itemIds) {
      await ctx.scheduler.runAfter(0, internal.intelligence.subscriptions.scan.scanForItemInternal, { itemId, userId });
    }
    // Then a per-user catchup pass after item scans complete (small offset)
    const userIds = Array.from(new Set(itemIds.map(i => i.userId)));
    for (const userId of userIds) {
      await ctx.scheduler.runAfter(30000, internal.intelligence.subscriptions.scan.runCatchupForUserInternal, { userId });
    }
    return null;
  },
});
```

- [ ] **Step 2: Implement `scanForItemInternal` (Plaid step).** Reads `plaidRecurringStreams` for the item's user; upserts `detectedSubscriptions` with `source: "plaid"`. Sets `isActive: false` on rows whose Plaid stream is gone or moved to TOMBSTONED.

Reference [W0 §8.3](W0-existing-state-audit.md#83-component-owned-tables-11) for `plaidRecurringStreams` field shapes. Convert milliunits to dollars at the boundary.

- [ ] **Step 3: Implement `runCatchupForUserInternal` (catchup step).** Reads `plaidTransactions` last 180 days. Group-by `(normalizedMerchant OR counterpartyEntityId, amountBucket)` per research §1.2 dual-key. Filter to ≥3 occurrences. Compute median interval; bucket into frequency. Upsert with `source: "catchup"` only if no `source: "plaid"` row exists for the same key.

For `amountBucket = roundToHalfDollar(amount / 1000)`: convert milliunits to dollars, then `Math.round(dollars * 2) / 2`.

For median interval and frequency bucketing: helper functions in `normalize.ts` (extend) or inline.

- [ ] **Step 4: Implement `queries.ts`.** `listForViewer` returns subscriptions filtered by status.

```ts
import { query } from "../../functions";
import { v } from "convex/values";

export const listForViewer = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("dismissed"),
      v.literal("all"),
    )),
  },
  returns: v.array(v.object({
    subscriptionId: v.id("detectedSubscriptions"),
    normalizedMerchant: v.string(),
    nickname: v.optional(v.string()),
    averageAmount: v.number(),
    frequency: v.union(
      v.literal("weekly"), v.literal("biweekly"), v.literal("monthly"),
      v.literal("quarterly"), v.literal("annual"),
    ),
    nextPredictedDate: v.optional(v.string()),
    source: v.union(v.literal("plaid"), v.literal("catchup")),
    occurrenceCount: v.number(),
    userStatus: v.union(
      v.literal("pending"), v.literal("confirmed"), v.literal("dismissed"),
    ),
    isActive: v.boolean(),
  })),
  handler: async (ctx, { status = "confirmed" }) => {
    const viewer = await ctx.viewerX();
    let rows = await ctx.table("detectedSubscriptions", "by_user_userStatus",
      (q) => q.eq("userId", viewer._id));
    if (status !== "all") {
      rows = rows.filter((r: any) => r.userStatus === status);
    }
    return rows.map((r: any) => ({
      subscriptionId: r._id,
      normalizedMerchant: r.normalizedMerchant,
      nickname: r.nickname,
      averageAmount: r.averageAmount,
      frequency: r.frequency,
      nextPredictedDate: r.nextPredictedDate,
      source: r.source,
      occurrenceCount: r.occurrenceCount,
      userStatus: r.userStatus,
      isActive: r.isActive,
    }));
  },
});
```

- [ ] **Step 5: Implement `mutations.ts`.** Three direct mutations per [contracts §16](00-contracts.md): `confirm`, `dismiss`, `setNickname`.

```ts
import { mutation } from "../../functions";
import { v } from "convex/values";

export const confirm = mutation({
  args: { subscriptionId: v.id("detectedSubscriptions") },
  returns: v.null(),
  handler: async (ctx, { subscriptionId }) => {
    const viewer = await ctx.viewerX();
    const row = await ctx.table("detectedSubscriptions").getX(subscriptionId);
    if (row.userId !== viewer._id) throw new Error("Not authorized");
    await row.patch({ userStatus: "confirmed", userStatusUpdatedAt: Date.now() });
    return null;
  },
});

export const dismiss = mutation({
  args: { subscriptionId: v.id("detectedSubscriptions") },
  returns: v.null(),
  handler: async (ctx, { subscriptionId }) => {
    const viewer = await ctx.viewerX();
    const row = await ctx.table("detectedSubscriptions").getX(subscriptionId);
    if (row.userId !== viewer._id) throw new Error("Not authorized");
    await row.patch({ userStatus: "dismissed", userStatusUpdatedAt: Date.now() });
    return null;
  },
});

export const setNickname = mutation({
  args: {
    subscriptionId: v.id("detectedSubscriptions"),
    nickname: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { subscriptionId, nickname }) => {
    const viewer = await ctx.viewerX();
    const row = await ctx.table("detectedSubscriptions").getX(subscriptionId);
    if (row.userId !== viewer._id) throw new Error("Not authorized");
    await row.patch({ nickname });
    return null;
  },
});
```

- [ ] **Step 6: Write integration tests.** Cover: Plaid step ingests MATURE outflow stream → row upserted with `source: "plaid"`; Plaid stream moves to TOMBSTONED → row `isActive: false`; catchup detects 3-occurrence weekly merchant → row with `source: "catchup"`, `frequency: "weekly"`; Plaid wins on conflict (catchup row exists, then Plaid stream matures, row `source` upgrades to "plaid"); mutations patch correctly; mutations reject other-user.

- [ ] **Step 7: Commit.**

```bash
gt create feat/agentic-home/W6-08-subscription-scan -m "feat(intelligence): subscription scan (Plaid + catchup) + queries + mutations"
```

**Test:**
- Integration tests: dual sources, precedence, mutations.
- Typecheck.

**Acceptance checklist:**
- [ ] Tests pass
- [ ] Typecheck passes
- [ ] CodeRabbit clean
- [ ] Reviewed by Codex

---

## Task W6.9: Cashflow forecast refresh + queries

**Recommended agent:** Codex
**Rationale:** Algorithm specified verbatim in [brainstorm §4.5](W6-intelligence.brainstorm.md#45-cashflow-forecast-a-approach-defined-verbatim) and [research §3](W6-intelligence.research.md#3-cashflow-forecast-horizon-starting-balance-method). Single-purpose builder.
**Linear issue:** LIN-W6-09

**Scope:**
- Files created: `intelligence/cashflow/refresh.ts`, `queries.ts`; tests.
- Acceptance: Daily refresh produces one row per user with line items in horizon.

**Steps:**

- [ ] **Step 1: Implement `refresh.ts`.**

```ts
import { internalAction, internalMutation, internalQuery } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";
import { todayUtcYmd, daysBetween } from "../promoCountdowns/helpers";

const HORIZON_DAYS = 30;

const LIQUID_DEPOSITORY_SUBTYPES = new Set([
  "checking", "savings", "cash management", "money market",
]);

export const refreshAllInternal = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userIds = await ctx.runQuery(internal.intelligence.cashflow.refresh.listUserIdsInternal, {});
    for (const userId of userIds) {
      await ctx.scheduler.runAfter(0, internal.intelligence.cashflow.refresh.refreshForUserInternal, { userId });
    }
    return null;
  },
});

export const refreshForUserInternal = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const today = todayUtcYmd();
    const horizonEnd = addDaysYmd(today, HORIZON_DAYS);

    // 1. Starting balance: liquid USD depository accounts
    const accounts = await fetchPlaidAccountsForUser(ctx, userId);
    let startingBalance = 0;
    for (const a of accounts) {
      if (a.type !== "depository") continue;
      if (!LIQUID_DEPOSITORY_SUBTYPES.has(a.subtype ?? "")) continue;
      if ((a.balances?.isoCurrencyCode ?? "USD") !== "USD") continue;
      startingBalance += a.balances?.current ?? 0;
    }

    // 2. Outflows from credit cards
    const cards = await ctx.table("creditCards")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("isActive"), true));
    const lineItems: any[] = [];
    for (const card of cards) {
      const dueDate = card.nextPaymentDueDate;
      if (!dueDate || dueDate < today || dueDate > horizonEnd) continue;
      const amount = card.minimumPaymentAmount ?? card.lastStatementBalance ?? null;
      if (amount == null) continue;
      lineItems.push({
        date: dueDate,
        type: "statement_due",
        amount: -amount,
        label: `${card.displayName} min payment`,
        sourceId: card._id,
      });
    }

    // 3. Confirmed subscriptions
    const subs = await ctx.table("detectedSubscriptions", "by_user_userStatus",
      (q) => q.eq("userId", userId).eq("userStatus", "confirmed"));
    for (const sub of subs) {
      if (!sub.isActive) continue;
      // Project occurrences in horizon
      let next = sub.nextPredictedDate;
      const intervalDays = frequencyToDays(sub.frequency);
      while (next && next >= today && next <= horizonEnd) {
        lineItems.push({
          date: next,
          type: "subscription",
          amount: -sub.averageAmount,
          label: sub.nickname ?? sub.normalizedMerchant,
          sourceId: sub._id,
        });
        next = addDaysYmd(next, intervalDays);
      }
    }

    // 4. Recurring income (MATURE inflow streams)
    const inflows = await fetchMatureInflowStreams(ctx, userId);
    for (const stream of inflows) {
      const intervalDays = frequencyToDays(mapPlaidFrequency(stream.frequency));
      let next = stream.predictedNextDate;
      while (next && next >= today && next <= horizonEnd) {
        lineItems.push({
          date: next,
          type: "recurring_income",
          amount: +(stream.averageAmount / 1000),  // milliunits → dollars
          label: stream.merchantName ?? "Recurring income",
          sourceId: stream.streamId,
        });
        next = addDaysYmd(next, intervalDays);
      }
    }

    // 5. Sort and aggregate
    lineItems.sort((a, b) => a.date.localeCompare(b.date));
    const projectedNetCash = lineItems.reduce((acc, li) => acc + li.amount, 0);
    const endingBalance = startingBalance + projectedNetCash;

    // 6. Upsert
    const existing = await ctx.table("cashflowForecasts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    const fields = {
      userId,
      horizonStartDate: today,
      horizonEndDate: horizonEnd,
      startingBalance,
      projectedNetCash,
      endingBalance,
      lineItemsJson: JSON.stringify(lineItems),
      generatedAt: Date.now(),
    };
    if (existing) {
      const writable = await ctx.table("cashflowForecasts").getX(existing._id);
      await writable.patch(fields);
    } else {
      await ctx.table("cashflowForecasts").insert(fields);
    }
    return null;
  },
});

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function frequencyToDays(freq: string): number {
  switch (freq) {
    case "weekly": return 7;
    case "biweekly": return 14;
    case "monthly": return 30;
    case "quarterly": return 91;
    case "annual": return 365;
    default: return 30;
  }
}

function mapPlaidFrequency(plaidFreq: string): "weekly" | "biweekly" | "monthly" | "quarterly" | "annual" {
  // Map Plaid frequency strings to our enum; verify Plaid's exact strings during execution.
  const map: Record<string, any> = {
    "WEEKLY": "weekly",
    "BIWEEKLY": "biweekly",
    "MONTHLY": "monthly",
    "QUARTERLY": "quarterly",
    "ANNUALLY": "annual",
    "ANNUAL": "annual",
  };
  return map[plaidFreq.toUpperCase()] ?? "monthly";
}

// Pseudocode helpers; execution agent fills against actual Plaid component query API
async function fetchPlaidAccountsForUser(ctx: any, userId: string): Promise<any[]> { return []; }
async function fetchMatureInflowStreams(ctx: any, userId: string): Promise<any[]> { return []; }
```

- [ ] **Step 2: Implement `queries.ts`.**

```ts
import { query } from "../../functions";
import { v } from "convex/values";

export const getForViewer = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      horizonStartDate: v.string(),
      horizonEndDate: v.string(),
      startingBalance: v.number(),
      projectedNetCash: v.number(),
      endingBalance: v.number(),
      lineItems: v.array(v.object({
        date: v.string(),
        type: v.union(
          v.literal("statement_due"),
          v.literal("subscription"),
          v.literal("recurring_income"),
        ),
        amount: v.number(),
        label: v.string(),
        sourceId: v.string(),
      })),
      generatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const viewer = await ctx.viewerX();
    const row = await ctx.table("cashflowForecasts")
      .filter((q) => q.eq(q.field("userId"), viewer._id))
      .first();
    if (!row) return null;
    return {
      horizonStartDate: row.horizonStartDate,
      horizonEndDate: row.horizonEndDate,
      startingBalance: row.startingBalance,
      projectedNetCash: row.projectedNetCash,
      endingBalance: row.endingBalance,
      lineItems: JSON.parse(row.lineItemsJson),
      generatedAt: row.generatedAt,
    };
  },
});
```

- [ ] **Step 3: Write integration tests.** Cover: starting balance sums liquid USD only; CD subtype excluded; non-USD excluded; confirmed sub projects multiple occurrences in horizon; MATURE inflow projects; pending sub excluded; row upserted on second run.

- [ ] **Step 4: Commit.**

```bash
gt create feat/agentic-home/W6-09-cashflow -m "feat(intelligence): cashflow forecast daily refresh + viewer query"
```

**Test:**
- Integration tests cover liquid-balance filter, sub projection, inflow projection, idempotent upsert.

**Acceptance checklist:**
- [ ] Tests pass
- [ ] Typecheck passes
- [ ] CodeRabbit clean
- [ ] Reviewed by Claude Code

---

## Task W6.10: Weekly digest assemble (pre-dispatch)

**Recommended agent:** Claude Code
**Rationale:** Cross-cutting reads from five W6 tables; payload shape defined collaboratively with W7. Architectural reasoning across the W6 surface.
**Linear issue:** LIN-W6-10

**Scope:**
- Files created: `intelligence/weeklyDigest/assemble.ts`; tests.
- Acceptance: Sunday cron handler reads from 5 W6 tables and starts dispatch (BLOCKED on spike for the actual call).

**Steps:**

- [ ] **Step 1: Implement `assemble.ts`.** Sunday entry point with per-user fan-out.

```ts
import { internalAction, internalQuery } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";
import { todayUtcYmd } from "../promoCountdowns/helpers";

export const assembleAllUsersInternal = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userIds = await ctx.runQuery(internal.intelligence.weeklyDigest.assemble.listUserIdsInternal, {});
    for (const userId of userIds) {
      await ctx.scheduler.runAfter(0, internal.intelligence.weeklyDigest.assemble.assembleForUserInternal, { userId });
    }
    return null;
  },
});

export const assembleForUserInternal = internalAction({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const weekStart = computeWeekStart(todayUtcYmd());

    // Read snapshots from W6 tables for the digest payload
    const promoCountdowns = await ctx.runQuery(internal.intelligence.weeklyDigest.assemble.readPromoCountdownsInternal, { userId });
    const statements = await ctx.runQuery(internal.intelligence.weeklyDigest.assemble.readStatementRemindersInternal, { userId });
    const anomalies = await ctx.runQuery(internal.intelligence.weeklyDigest.assemble.readAnomaliesInternal, { userId, weekStart });
    const cashflow = await ctx.runQuery(internal.intelligence.weeklyDigest.assemble.readCashflowInternal, { userId });
    const subs = await ctx.runQuery(internal.intelligence.weeklyDigest.assemble.readConfirmedSubsInternal, { userId });

    const payload = {
      userId,
      weekStart: new Date(`${weekStart}T00:00:00Z`).getTime(),
      topSpendByCategory: [], // computed from plaidTransactions in a later iteration
      upcomingStatements: statements,
      activeAnomalies: anomalies,
      expiringPromos: promoCountdowns.filter((p: any) => p.daysToExpiration <= 30),
      expiringTrials: [], // out of MVP scope
    };

    // BLOCKED on spike (W6.13): dispatch call
    // TODO(W6.13): await ctx.runAction(internal.email.dispatch.dispatchWeeklyDigest, payload);
    return null;
  },
});

// Internal query helpers; bodies omitted for brevity. Each reads from one W6 table
// scoped to the userId passed in.

function computeWeekStart(ymd: string): string {
  // ISO week: Sunday is the start; we compute the Sunday of the current week
  const d = new Date(`${ymd}T00:00:00Z`);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}
```

- [ ] **Step 2: Write integration tests.** Cover: all 5 reads return correct shape; payload assembled correctly for a user with non-empty data; user with empty data → empty arrays; weekStart correct.

- [ ] **Step 3: Commit.**

```bash
gt create feat/agentic-home/W6-10-weekly-digest -m "feat(intelligence): weekly digest assemble (pre-dispatch)"
```

**Acceptance checklist:**
- [ ] Tests pass
- [ ] Typecheck passes
- [ ] CodeRabbit clean
- [ ] Reviewed by Codex

---

## Task W6.11: Cron entries + intelligence prune

**Recommended agent:** Codex
**Rationale:** Append-only cron registration plus a simple weekly prune handler. Pure boilerplate.
**Linear issue:** LIN-W6-11

**Scope:**
- Files modified: `packages/backend/convex/crons.ts`.
- Files created: `intelligence/prune.ts`; tests at `__tests__/intelligence/prune.test.ts`.
- Acceptance: Six new cron entries registered; one prune cron registered; prune deletes anomalies older than 90 days.

**Steps:**

- [ ] **Step 1: Implement `prune.ts`.**

```ts
import { internalAction, internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";

const ANOMALY_RETENTION_DAYS = 90;

export const runAllInternal = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runMutation(internal.intelligence.prune.pruneAnomaliesInternal, {});
    return null;
  },
});

export const pruneAnomaliesInternal = internalMutation({
  args: {},
  returns: v.object({ deletedCount: v.number() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - ANOMALY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    let deleted = 0;
    const candidates = await ctx.table("anomalies")
      .filter((q) => q.lt(q.field("detectedAt"), cutoff))
      .filter((q) => q.neq(q.field("userStatus"), "pending"));
    for (const row of candidates) {
      const writable = await ctx.table("anomalies").getX(row._id);
      await writable.delete();
      deleted++;
    }
    return { deletedCount: deleted };
  },
});
```

- [ ] **Step 2: Append cron entries to `crons.ts`.** After the existing two entries:

```ts
// === W6 Intelligence ===

crons.hourly(
  "Anomaly Scan",
  { minuteUTC: 0 },
  internal.intelligence.anomalies.scan.scanAllUsersInternal,
);

crons.daily(
  "Promo Countdown Refresh",
  { hourUTC: 7, minuteUTC: 0 },
  internal.intelligence.promoCountdowns.refresh.refreshAllInternal,
);

crons.daily(
  "Subscription Catch-up Scan",
  { hourUTC: 7, minuteUTC: 5 },
  internal.intelligence.subscriptions.scan.scanAllUsersInternal,
);

crons.daily(
  "Statement Reminder Scan",
  { hourUTC: 7, minuteUTC: 10 },
  internal.intelligence.statementReminders.scan.scanAllInternal,
);

crons.daily(
  "Cashflow Forecast Refresh",
  { hourUTC: 7, minuteUTC: 15 },
  internal.intelligence.cashflow.refresh.refreshAllInternal,
);

crons.weekly(
  "Weekly Digest Assemble",
  { dayOfWeek: "sunday", hourUTC: 7, minuteUTC: 20 },
  internal.intelligence.weeklyDigest.assemble.assembleAllUsersInternal,
);

crons.weekly(
  "Intelligence Prune",
  { dayOfWeek: "sunday", hourUTC: 8, minuteUTC: 0 },
  internal.intelligence.prune.runAllInternal,
);
```

If `crons.weekly` signature differs from the assumed `{ dayOfWeek, hourUTC, minuteUTC }`, fall back to:

```ts
crons.cron("Weekly Digest Assemble", "20 7 * * 0", internal.intelligence.weeklyDigest.assemble.assembleAllUsersInternal);
crons.cron("Intelligence Prune", "0 8 * * 0", internal.intelligence.prune.runAllInternal);
```

- [ ] **Step 3: Write prune integration test.** Insert anomalies with various `detectedAt` and `userStatus`; run `pruneAnomaliesInternal`; assert deletion only for non-pending older than 90 days.

- [ ] **Step 4: Boot Convex dev to validate cron registration.** Run `npx convex dev` and observe the dashboard or logs for the new cron entries. Stop the server.

- [ ] **Step 5: Commit.**

```bash
gt create feat/agentic-home/W6-11-crons-prune -m "feat(intelligence): register 7 W6 cron entries + intelligence prune"
```

**Acceptance checklist:**
- [ ] Tests pass
- [ ] Typecheck passes
- [ ] Convex dev shows new crons in dashboard
- [ ] CodeRabbit clean
- [ ] Reviewed by Claude Code

---

## Task W6.12: `get_upcoming_statements` data source patch

**Recommended agent:** Codex
**Rationale:** One-file patch in W2-owned territory. Straightforward swap from on-demand computation to W6's `statementReminders` read.
**Linear issue:** LIN-W6-12

**Prerequisite:** W2 has shipped `packages/backend/convex/agent/tools/read/getUpcomingStatements.ts`. If not yet shipped, this task is HELD until W2 lands the file.

**Scope:**
- Files modified: `packages/backend/convex/agent/tools/read/getUpcomingStatements.ts`.
- Acceptance: Tool body reads from `statementReminders` via the W6 query; falls back gracefully when W6 has not yet populated the table.

**Steps:**

- [ ] **Step 1: Read the current tool body.** Identify the existing data-fetch logic (likely scans `creditCards` and computes `nextOccurrenceOfDayInMonth` inline).

- [ ] **Step 2: Replace with a call to `intelligence/statementReminders/queries.listForViewer`.** Or, if the tool runs as an action and the query is invoked from outside, refactor so the query is reachable.

- [ ] **Step 3: Preserve the tool's return shape.** The W2 tool registry has a documented output shape per [contracts §2](00-contracts.md). The new data source must produce the same envelope.

- [ ] **Step 4: Add a fallback for empty `statementReminders` table** (deployment race during W6 rollout): if the query returns zero rows AND the user has cards with `statementClosingDay` set, log and return the on-demand computation as a safety net. This branch can be removed in a follow-up once W6's daily cron has run at least once in production.

- [ ] **Step 5: Run typecheck and any existing W2 tests.** Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
gt create feat/agentic-home/W6-12-get-upcoming-statements -m "refactor(agent): get_upcoming_statements reads from statementReminders (W6)"
```

**Acceptance checklist:**
- [ ] Typecheck passes
- [ ] Existing W2 tool tests pass
- [ ] Manual smoke: agent query returns same shape as before
- [ ] CodeRabbit clean
- [ ] Reviewed by Claude Code

---

## Task W6.13: Dispatch wiring + idempotency hashing (BLOCKED)

**Status:** BLOCKED on [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4 being committed.

**Recommended agent:** Claude Code
**Rationale:** Cross-cutting change across all six W6 cron handlers. Strategy A/B/C choice from spike directly shapes the call signature. Auth-sensitive (W7 dispatch boundary). Multi-file, contract-aware reasoning.
**Linear issue:** LIN-W6-13

**Scope:**
- Files modified: every `intelligence/*/{refresh,scan,assemble}.ts` that has a `TODO(W6.13)` marker.
- Files created: potentially `packages/backend/convex/notifications/hashing.ts` (or `agent/hashing.ts`) per spike §3.4.
- Acceptance: Every cron handler successfully calls the matching W7 dispatch action; W7's `emailEvents` row appears with correct `idempotencyKey`; duplicate cron runs (manually triggered) do not produce duplicate sends.

**Prerequisites (verify before starting):**

- [ ] [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4 has committed answers (not TBD).
- [ ] W7 has shipped `internal.email.dispatch.dispatchPromoWarning`, `dispatchStatementReminder`, `dispatchAnomalyAlert`, `dispatchSubscriptionDigest`, `dispatchWeeklyDigest` (per [contracts §15](00-contracts.md)).
- [ ] W7's `emailEvents` table is in [packages/backend/convex/schema.ts](../packages/backend/convex/schema.ts) with the unique index on `by_idempotencyKey`.
- [ ] If spike chose shared hashing utility: confirm path agreed with W5 (likely `packages/backend/convex/notifications/hashing.ts`).

**Steps:**

- [ ] **Step 1: Implement or import the hashing utility per spike §4.4 decision.** If shared, import from the agreed path. If per-workstream, create `intelligence/hashing.ts` with the spike-recommended hash function.

- [ ] **Step 2: Wire promo countdown dispatch.** In `intelligence/promoCountdowns/refresh.ts`, after the `upsertCountdown` write inside `refreshOneUserInternal`, replace the `TODO(W6.13)` marker with a per-user consolidation pass that, for each cadence in `[30, 14, 7, 1]`, gathers all promos of that user crossing that threshold and calls `internal.email.dispatch.dispatchPromoWarning` once per `(user, cadence)`.

- [ ] **Step 3: Wire statement reminder dispatch.** In `intelligence/statementReminders/scan.ts`, after the per-user upsert pass, consolidate cards by cadence (`{3, 1}`) and call `internal.email.dispatch.dispatchStatementReminder` once per `(user, cadence)`.

- [ ] **Step 4: Wire anomaly dispatch.** In `intelligence/anomalies/scan.ts` `upsertAnomaly`, after the row insert, call `internal.email.dispatch.dispatchAnomalyAlert({ userId, anomalyId: insertedId })`. One call per anomaly. W7 workflow coalesces.

- [ ] **Step 5: Wire subscription digest dispatch.** In `intelligence/subscriptions/scan.ts` after `runCatchupForUserInternal` completes, gather today's newly-inserted catchup-source rows for the user and call `internal.email.dispatch.dispatchSubscriptionDigest({ userId, batchDate, detected: [...] })`.

- [ ] **Step 6: Wire weekly digest dispatch.** In `intelligence/weeklyDigest/assemble.ts` `assembleForUserInternal`, after building the payload, call `internal.email.dispatch.dispatchWeeklyDigest(payload)`.

- [ ] **Step 7: Add dedup tests.** For each dispatch site, write a test that runs the cron twice in succession and asserts that exactly one `emailEvents` row was created with `status: "pending"` (or whatever the spike-chosen Strategy implies for the second call).

- [ ] **Step 8: Manual smoke test on dev.** Run each cron manually via Convex MCP; verify W7 emits dev-mode logs (per W7's dev gate); verify a duplicate run dedupes.

- [ ] **Step 9: Commit.**

```bash
gt create feat/agentic-home/W6-13-dispatch-wiring -m "feat(intelligence): wire W7 dispatch calls + idempotencyKey per spike"
```

**Acceptance checklist:**
- [ ] All TODO(W6.13) markers removed
- [ ] Dedup tests pass
- [ ] Typecheck passes
- [ ] Manual smoke test on dev confirms each dispatch action is called and W7 logs the send
- [ ] CodeRabbit clean
- [ ] Reviewed by Codex (Claude Code implements; Codex reviews)
- [ ] Linear issue cross-references the spike answers

---

## Plan-level acceptance checklist

Per [spec §11](W6-intelligence.md#11-acceptance-criteria), W6 is acceptance-complete when:

- [ ] All six W6 tables exist in schema with declared edges and indexes (W6.1)
- [ ] W4 schema snapshot test runs in CI (W6.2)
- [ ] Promo countdown daily refresh produces correct rows; mutation hook fires (W6.3)
- [ ] Statement reminder daily scan produces correct rows for active cards (W6.4)
- [ ] Three anomaly rules are pure, fully unit-tested (W6.5)
- [ ] Anomaly hourly scan correctly advances watermark; mutations work (W6.6)
- [ ] Subscription normalize matches all 12 fixtures (W6.7)
- [ ] Subscription scan ingests Plaid + catchup; precedence correct; mutations work (W6.8)
- [ ] Cashflow refresh produces correct row per user with line items in horizon (W6.9)
- [ ] Weekly digest assemble reads from 5 W6 tables, builds correct payload (W6.10)
- [ ] Six new cron entries registered; prune cron registered (W6.11)
- [ ] `get_upcoming_statements` reads from `statementReminders` (W6.12)
- [ ] All W7 dispatch actions called from W6 cron handlers; idempotency holds (W6.13; post-spike)
- [ ] `bun typecheck` clean across all PRs
- [ ] CodeRabbit clean on every PR
- [ ] Cross-agent review (Codex reviews Claude Code; Claude Code reviews Codex) clean on every PR
- [ ] All Linear issues LIN-W6-01 through LIN-W6-13 closed
- [ ] M3 Agentic Home → W6 Intelligence sub-project closed in Linear

---

## Execution handoff

Plan complete and saved to [specs/W6-intelligence.plan.md](W6-intelligence.plan.md). Two execution options per the writing-plans skill:

**1. Subagent-Driven (recommended):** Eric dispatches a fresh Claude Code or Codex session per task per the per-task `Recommended agent` field. Cross-agent review queued automatically after each task lands. Fast iteration; clean context between tasks.

**2. Inline Execution:** single agent (Claude Code, given its 1M context window) executes tasks W6.1 through W6.12 in one session with checkpoint commits, then re-engages post-spike for W6.13. Suits the parallel-worktree pattern from master brief Section 11.

Which approach? Eric's call. Either way, W6.13 is held until [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4 is committed.

---

**End of W6 plan. Spec at [specs/W6-intelligence.md](W6-intelligence.md). Research at [specs/W6-intelligence.research.md](W6-intelligence.research.md). Brainstorm at [specs/W6-intelligence.brainstorm.md](W6-intelligence.brainstorm.md). Cross-workstream contracts at [specs/00-contracts.md](00-contracts.md). Idempotency spike at [specs/00-idempotency-semantics.md](00-idempotency-semantics.md).**

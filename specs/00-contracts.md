# M3 Agentic Home: Cross-Workstream Contracts

**Role:** Single source of truth for every contract that more than one workstream cites. If a workstream's brainstorm disagrees with this document, this document wins until amended here first.

**Milestone:** M3 Agentic Home
**Scope:** W1 through W7
**Author:** Claude Opus 4.7 (reconciliation pass, Obra Superpowers)
**Date:** 2026-04-20
**Writing convention:** No em-dashes. Colons, parentheses, semicolons, or fresh sentences.

> This file was produced by the cross-spec reconciliation review dated 2026-04-20 to resolve M1 through M19 mismatches found during the first `/brainstorm` pass. Each amendment PR against a `W{N}-*.brainstorm.md` that touches a shared contract must also update this file in the same PR. Version bump rule (mirrors W2 §7.3): non-breaking additions are minor; renames or removed fields are major and require Linear comments to dependent workstream owners.

---

## 0. Ownership table

| Contract | Owner (writes schema / publishes API) | Consumers | Version |
|---|---|---|---|
| `agentThreads` schema (incl. `readCallCount`) | W2 | W1, W3, W5 | 2026.04.20-1 |
| `agentMessages` schema | W2 | W1, W3 | 2026.04.20-1 |
| `agentProposals` schema (incl. `scope`) | W2 | W3, W5 | 2026.04.20-1 |
| `agentProposalRows` schema | W2 | W5 | 2026.04.20-1 |
| `agentUsage` schema | W2 | W6 (admin only at MVP) | 2026.04.20-1 |
| `promptVersions` schema | W2 | — | 2026.04.20-1 |
| `reminders` schema | W2 | W5 (CRUD bodies) | 2026.04.20-1 |
| `auditLog` schema | W5 | W2 (reads executed summary), W6 (future forensics) | 2026.04.20-1 |
| `notificationPreferences` schema | W7 | W6 (checkDedup step reads), W1 (preferences UI) | 2026.04.20-1 |
| `emailEvents` schema (merged, was `notificationEvents` in W6) | W7 | W6 (insert on trigger), W4 (insert on reconsent, item-error) | 2026.04.20-1 |
| `emailSuppressions` schema | W7 | — | 2026.04.20-1 |
| `plaidItems.newAccountsAvailableAt` | W4 | W1, W7 | 2026.04.20-1 |
| Plaid sync-state health query (`getPlaidItemHealth`, `listPlaidItemHealth`) | W4 | W1, W2 (read tool), W7 (reconsent banner status) | 2026.04.20-1 |
| Agent tool registry (25 tools) | W2 | W1, W3, W5, W6, W7 | 2026.04.20-1 |
| Agent proposal state machine | W2 | W1, W3, W5 | 2026.04.20-1 |
| Tool envelope + tool output shape | W2 | W3 | 2026.04.20-1 |
| HTTP action `POST /api/agent/send` | W2 | W1 | 2026.04.20-1 |
| Dispatch action signatures (`dispatch*`) | W7 | W4, W6 | 2026.04.20-1 |
| `@convex-dev/workflow` installation | W2 | W5, W6, W7 | 2026.04.20-1 |
| `@convex-dev/rate-limiter` bucket policy | W2 | W5, W7 | 2026.04.20-1 |
| Idempotency layering policy | W7 spike (blocks) | W5, W6, W7 | 2026.04.20-1 |

---

## 1. Agent tables (W2 owns)

Source of authoritative field shapes: W2 brainstorm §3.3, with two surgical additions from this reconciliation pass (see §1.2 and §1.3).

### 1.1 `agentThreads`

```ts
agentThreads: defineEnt({
  title: v.optional(v.string()),
  isArchived: v.boolean(),
  lastTurnAt: v.number(),
  promptVersion: v.string(),
  summaryText: v.optional(v.string()),
  summaryUpToMessageId: v.optional(v.id("agentMessages")),
  componentThreadId: v.string(),
  readCallCount: v.number(),            // added by reconciliation M10; see §1.2
})
  .edge("user")
  .edges("agentMessages", { ref: true })
  .edges("agentProposals", { ref: true })
  .index("by_user_lastTurnAt", ["userId", "lastTurnAt"])
  .index("by_componentThreadId", ["componentThreadId"]),
```

### 1.2 `agentThreads.readCallCount` (reconciliation M10)

- W2 increments this inside the read-tool wrapper on every read-tool invocation.
- W5's write-tool wrapper enforces `readCallCount >= 1` before any `propose_*` body runs; otherwise throws `first_turn_guard` (non-retryable).
- Survives thread resume: per W5 §9.2, every thread must have at least one read before any write, regardless of session.

### 1.3 Route ID shape for `/[threadId]` (reconciliation M8)

W1's reserved-slug guard in `[threadId]/page.tsx` matches on the **Convex Ents ID** for `agentThreads`, not on the `componentThreadId` string.

- Route param value is `Id<"agentThreads">`, which is Convex's base-32-with-prefix format and cannot collide with reserved slugs (W1 §9).
- The `componentThreadId` (opaque string from `@convex-dev/agent`) is internal; never routed.
- W2's `api.agent.threads.listForUser` returns entries keyed by the Ents ID; W1 renders `<Link href={`/${threadId}`}>` against that ID.

### 1.4 Reserved slugs (reconciliation M1)

Final enumerated list in `[threadId]/page.tsx`:

```ts
const RESERVED_SLUGS = new Set([
  "credit-cards",
  "transactions",
  "wallets",
  "settings",
  "sign-in",
  "sign-up",
  "dev",           // added by reconciliation M1; W3 preview harness at /dev/tool-results
]);
```

Any future top-level route must be added here atomically with its route file. W1 plan carries a lint task that scans `(app)/*/page.tsx` and diffs against `RESERVED_SLUGS`.

### 1.5 `agentMessages`

Verbatim from W2 §3.3. No reconciliation changes.

### 1.6 `agentProposals` (with `scope` field, reconciliation M6)

```ts
agentProposals: defineEnt({
  toolName: v.string(),
  argsJson: v.string(),
  summaryText: v.string(),
  affectedCount: v.number(),
  sampleJson: v.string(),
  scope: v.union(v.literal("single"), v.literal("bulk")),   // added M6
  state: v.union(
    v.literal("proposed"),
    v.literal("awaiting_confirmation"),
    v.literal("confirmed"),
    v.literal("executing"),
    v.literal("executed"),
    v.literal("cancelled"),
    v.literal("timed_out"),
    v.literal("reverted"),
    v.literal("failed"),
  ),
  awaitingExpiresAt: v.number(),
  executedAt: v.optional(v.number()),
  undoExpiresAt: v.optional(v.number()),
  revertedAt: v.optional(v.number()),
  workflowId: v.optional(v.string()),
  errorJson: v.optional(v.string()),
})
  .field("contentHash", v.string(), { unique: true })        // Strategy C-prime: DB-level dedup at insert
  .edge("user")
  .edge("agentThread")
  .edges("agentProposalRows", { ref: true })
  .index("by_thread_state", ["agentThreadId", "state"])
  .index("by_user_awaiting", ["userId", "state", "awaitingExpiresAt"])
  .index("by_undo_window", ["userId", "state", "undoExpiresAt"]),
  // `by_thread_contentHash` removed: the unique field above creates its own index,
  // and the hash input includes threadId so uniqueness is effectively per-thread.
```

**Strategy C-prime (idempotency-semantics.md §4.4) requires `contentHash` to enforce uniqueness at insert time.** Ents field-level `{ unique: true }` is the canonical syntax. The W5 propose wrapper computes the hash via the shared `idempotencyKey(...)` utility (see §10), passing `threadId` so collisions across threads are impossible. On duplicate-insert throw, the wrapper catches and returns the existing `proposalId` (get-then-insert or insert-and-catch; W5 picks).

`scope` is written by W5's propose wrapper at creation time:
- `"single"` for single-row proposals (`propose_transaction_update`, `propose_credit_card_metadata_update`, `propose_reminder_create`, etc.).
- `"bulk"` for multi-row proposals (`propose_bulk_transaction_update`).

W3's `ProposalConfirmCard` dispatches on `scope` to pick variant (single inline diff vs. bulk headline + sample + expandable full list). W3 does not derive `scope` from `affectedCount`; it reads the field directly.

### 1.7 `agentProposalRows`, `agentUsage`, `promptVersions`

Verbatim from W2 §3.3. No reconciliation changes.

### 1.8 `reminders` (reconciliation M2)

W2 owns the schema and the `list_reminders` read-tool body. W5 owns CRUD bodies (propose / execute / undo), built on W2's wrapper pattern. The schema below combines W2's Section 3.3 fields with W5's additional fields (§12.3). W2's plan lands this table; W5 cites it.

```ts
reminders: defineEnt({
  title: v.string(),
  dueAt: v.number(),                                 // epoch ms
  notes: v.optional(v.string()),
  isDone: v.boolean(),
  doneAt: v.optional(v.number()),
  dismissedAt: v.optional(v.number()),               // from W5 §12.3
  relatedResourceType: v.union(                      // from W5 §12.3
    v.literal("creditCard"),
    v.literal("promoRate"),
    v.literal("installmentPlan"),
    v.literal("transaction"),
    v.literal("none"),
  ),
  relatedResourceId: v.optional(v.string()),         // unified FK across tables
  triggerLeadDays: v.optional(v.number()),           // from W5 §12.3; for promo-based reminders
  channels: v.array(v.union(                          // from W5 §12.3
    v.literal("chat"),
    v.literal("email"),
  )),
  createdByAgent: v.boolean(),                       // from W5 §12.3
})
  .edge("user")
  .index("by_user_due", ["userId", "isDone", "dueAt"])
  .index("by_user_dismissed", ["userId", "dismissedAt"]),
```

Notes:
- W2's original fields `relatedCardId: v.id("creditCards")` and `relatedTransactionId: v.string()` are replaced by `relatedResourceType` + `relatedResourceId` to match W5's generalization. W5's propose bodies set the discriminator.
- Channels default to `["chat"]` at MVP. Email dispatch gated by W6/W7.
- `isDone`, `doneAt`, `dismissedAt` coexist: `isDone = true` for user-marked-complete, `dismissedAt` for user-dismissed, `doneAt` for programmatic completion (scheduled evaluation).

---

## 2. Agent tool registry (W2 owns)

Final count: **25 tools**. Reconciliation M3 (defer `search_transactions`) and M11 (add `get_proposal`) net to +1.

### 2.1 Read tools (13)

1. `list_accounts`
2. `get_account_detail`
3. `list_transactions`
4. `get_transaction_detail`
5. `list_credit_cards`
6. `get_credit_card_detail`
7. `list_deferred_interest_promos`
8. `list_installment_plans`
9. `get_spend_by_category`
10. `get_spend_over_time`
11. `get_upcoming_statements` (reads W6's `statementReminders` when W6 lands; reads `creditCards` directly in the interim per M13)
12. `list_reminders`
13. `search_merchants`
14. `get_plaid_health` (from W4 §5.4.1; wraps `getPlaidItemHealth` / `listPlaidItemHealth`)

### 2.2 Propose tools (6; W5 bodies)

15. `propose_transaction_update`
16. `propose_bulk_transaction_update`
17. `propose_credit_card_metadata_update`
18. `propose_manual_promo`
19. `propose_reminder_create`
20. `propose_reminder_delete`

### 2.3 Execute / cancel / undo / introspect (5)

21. `execute_confirmed_proposal`
22. `cancel_proposal`
23. `undo_mutation` (takes `reversalToken`, see §7)
24. `trigger_plaid_resync`
25. `get_proposal` (reconciliation M11; W3 subscribes for `ProposalConfirmCard` state)

### 2.4 Deferred from MVP (reconciliation M3)

- **`search_transactions`** (semantic RAG): deferred to post-M3. `@convex-dev/rag` and the `AgentEmbeddingContract` remain in W2's stack for infra-only scaffolding, but no tool is exposed to the agent at MVP. W4 therefore does not implement `embedTransactionForRag` call-sites during `syncTransactionsInternal`. The hybrid literal-plus-semantic-fallback pattern in W2 §5.1 tool #14 is removed at MVP.
- `propose_transaction_delete`, `propose_promo_update`, `propose_installment_plan_*`, `propose_card_*` variants (nickname, primary, APR override, provider URL), `propose_subscription_*`, `propose_anomaly_*`, `propose_card_hard_delete`: deferred until W5's `/plan` finalizes the catalog. See M14 for subscription/anomaly mutation open question; the 6-tool propose set above is MVP.

### 2.5 `get_proposal` tool signature

```ts
get_proposal: {
  input: z.object({ proposalId: z.string() }),
  output: v.object({
    proposalId: v.id("agentProposals"),
    scope: v.union(v.literal("single"), v.literal("bulk")),
    state: /* see §3 state enum */,
    summary: v.string(),
    affectedCount: v.number(),
    sample: v.any(),                                  // same shape as propose_* output preview
    executedAt: v.optional(v.number()),
    undoExpiresAt: v.optional(v.number()),
    reversalToken: v.optional(v.string()),
    errorSummary: v.optional(v.string()),
  }),
  bucket: "read_cheap",
}
```

W3's `ProposalConfirmCard` subscribes via `useQuery(api.agent.proposals.get, { proposalId })` and re-renders on state transitions.

---

## 3. Proposal state machine (W2 owns)

Nine states. Authoritative enum for W1, W3, W5.

```
proposed
  → awaiting_confirmation            (W5 propose wrapper, atomic with row inserts)
awaiting_confirmation
  → confirmed                         (W2 mutation on ProposalConfirmCard Confirm)
  → cancelled                         (W2 mutation on Cancel; also cancel_proposal tool)
  → timed_out                         (W2 TTL cron every 5 min past awaitingExpiresAt)
confirmed
  → executing                         (W5 execute_confirmed_proposal)
executing
  → executed                          (W5 workflow completion)
  → failed                            (W5 workflow rollback of partial apply)
executed
  → reverted                          (W5 undo_mutation within undoExpiresAt)
```

Transition owners mirror W2 §6.2. `cancel_proposal` ownership: W2 (W5 wraps for registry visibility but the state-transition mutation lives in W2's `agent/proposals.ts`).

---

## 4. Tool output envelope shape (reconciliation M9)

W2 owns `ToolEnvelope`. W3's `ToolOutput` is the payload inside `data`. The two nest cleanly:

```ts
// W2 §5.6 (owner)
type ToolEnvelope<T> =
  | {
      ok: true;
      data: T;
      meta: { rowsRead: number; durationMs: number };
    }
  | {
      ok: false;
      error: { code: ErrorCode; message: string; retryable: boolean };
    };

// W3 §4.1 (shape of `T` for every read tool)
type ToolOutput<TPreview = unknown> = {
  ids: string[];
  preview: TPreview & { live?: boolean; capturedAt?: string };
  window?: { from: string; to: string };
};

// Composed contract
type RegistryEntryOutput<TPreview> = ToolEnvelope<ToolOutput<TPreview>>;
```

W2's `buildToolsForAgent` helper unwraps:
- On `ok: true`, it feeds `data` (a `ToolOutput`) directly to the AI SDK's tool result. W3's dispatcher inspects `.ids`, `.preview`, `.window` and picks the component.
- On `ok: false`, it feeds `error.message` back as a tool-error result. W3's `ToolErrorRow` renders the error text.

W3's component props receive `{ input, output, state, errorText? }` where `output` is the unwrapped `ToolOutput`, not the envelope. W2's wrapper owns the unwrap so W3 never sees `ok` directly.

**Propose tools return a different shape** (not `ToolOutput`):

```ts
type ProposalToolOutput = {
  proposalId: Id<"agentProposals">;
  scope: "single" | "bulk";
  summary: string;
  sample: unknown;                // per-tool sample shape
  affectedCount: number;
};
```

W3's `ProposalConfirmCard` dispatches off `toolName.startsWith("propose_")` and treats the output accordingly. Non-propose read tools follow `ToolOutput`.

---

## 5. HTTP action contract (W2 owns; W1 consumes)

`POST /api/agent/send`:

Request body (Zod-validated):
```ts
{
  threadId?: Id<"agentThreads">;
  prompt: string;
}
```

Response:
- 200 OK: `{ threadId: Id<"agentThreads">, messageId: Id<"agentMessages"> }`
- 401: unauthorized (no Clerk identity)
- 429: `{ error: "budget_exhausted" | "rate_limited", reason: string, retryAfterSeconds?: number }`

W1 consumes via `fetch` against the Convex HTTP endpoint; no Next.js API route.

### 5.1 Streaming contract

Reactive query-backed (W2 D4 locked). W1 subscribes via cached `useQuery` from `convex-helpers/react/cache/hooks`:

- `api.agent.threads.listMessages({ threadId })` → `Array<agentMessages>`
- `api.agent.proposals.listOpenProposals({ threadId })` → `Array<agentProposals>`
- `api.agent.proposals.get({ proposalId })` → single-proposal subscription (for `ProposalConfirmCard`)

Both queries are public `query` from `./functions` and perform ownership checks (`thread.userId === viewerX()._id`).

---

## 6. Typed error codes (W2 emits)

Discriminated union propagated through the stream:

```ts
type AgentError =
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "budget_exhausted"; reason: string }
  | { kind: "llm_down" }
  | { kind: "reconsent_required"; plaidItemId: string }
  | { kind: "first_turn_guard" }
  | { kind: "proposal_timed_out" }
  | { kind: "proposal_invalid_state" };
```

W1's `ChatBanner` and `ReconsentModal` (W1 §12) map one-to-one on `kind`. W3's `ToolErrorRow` renders the text for any non-structural error.

---

## 7. Reversal token format (reconciliation M19)

Opaque string: `rev_<base32 of auditLogId>`.

- W5 execute emits the token; the agent sees the opaque form only.
- `undo_mutation` takes `{ reversalToken: string }` in its Zod input schema; W5's body decodes, resolves `auditLogId`, verifies user ownership and window.
- Raw `Id<"auditLog">` values never appear in chat messages, tool results, or system prompts.

---

## 8. `auditLog` schema (W5 owns)

Verbatim from W5 §12.4. Referenced here for discoverability.

```ts
auditLog: defineEnt({
  threadId: v.id("agentThreads"),
  proposalId: v.id("agentProposals"),
  toolName: v.string(),
  inputArgsJson: v.string(),
  affectedIdsJson: v.string(),
  executedAt: v.number(),
  reversalPayloadJson: v.string(),
  reversedAt: v.optional(v.number()),
  reversalOfAuditId: v.optional(v.id("auditLog")),
  chunkIndex: v.optional(v.number()),
  chunkCount: v.optional(v.number()),
})
  .edge("user")
  .index("by_user_executedAt", ["userId", "executedAt"])
  .index("by_proposal", ["proposalId"])
  .index("by_reversalOf", ["reversalOfAuditId"]),
```

W5 ships the table in the same PR as its schema additions (`isPrimary`, overlay fields). W2's `agent/proposals.ts` does not `import { auditLog }`; W5's execute wrapper holds the write responsibility.

---

## 9. Email event pipeline (W6 inserts; W7 owns table) (reconciliation M17)

Prior state: W6 §3.7 defined `notificationEvents`; W7 §4.2 defined `emailEvents`. Two tables, same pipeline.

**Resolved:** W7's `emailEvents` is the unified table. `notificationEvents` is dropped from W6. W7's schema gains a `workflowId` field (previously W6-only) so `@convex-dev/workflow` can attach its instance ID.

### 9.1 Unified `emailEvents` schema (W7 owns)

```ts
emailEvents: defineEnt({
  userId: v.optional(v.id("users")),                 // nullable for pre-user sends
  email: v.string(),                                 // lowercased
  templateKey: v.string(),                           // e.g. "promo-warning"
  cadence: v.optional(v.number()),                   // 30 / 14 / 7 / 1 / 3
  source: v.union(
    v.literal("send"),
    v.literal("dev-capture"),
    v.literal("webhook-sent"),
    v.literal("webhook-delivered"),
    v.literal("webhook-bounced"),
    v.literal("webhook-complained"),
    v.literal("webhook-opened"),
    v.literal("webhook-clicked"),
    v.literal("webhook-delayed"),
  ),
  resendEmailId: v.optional(v.string()),
  workflowId: v.optional(v.string()),                // added by M17; links to @convex-dev/workflow instance
  payloadJson: v.any(),
  errorMessage: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),                            // W6 insert (pre-send)
    v.literal("running"),                            // W7 workflow started
    v.literal("sent"),                               // W7 workflow dispatched to Resend
    v.literal("skipped_pref"),                       // preference disabled
    v.literal("skipped_dedup"),                      // idempotency hit (rare with unique constraint)
    v.literal("skipped_suppression"),                // bounce or complaint
    v.literal("failed"),                             // terminal error
  ),
  attemptCount: v.number(),
  createdAt: v.number(),
  processedAt: v.optional(v.number()),
})
  .field("idempotencyKey", v.string(), { unique: true })  // Strategy C-prime: DB-level dedup at insert
  .edge("user")
  .index("by_user_created", ["userId", "createdAt"])
  .index("by_resendEmailId", ["resendEmailId"])
  .index("by_template_created", ["templateKey", "createdAt"])
  .index("by_status_created", ["status", "createdAt"]),
  // `by_idempotencyKey` removed: the unique field above creates its own index.
  // Webhook events (source starting with "webhook-*") use a synthetic idempotencyKey
  // composed of `{resendEmailId}:{source}` so they never collide with application sends.
```

**Webhook-event rows use a synthetic idempotency key.** Since `idempotencyKey` is `unique` globally, webhook rows that reference a prior send by `resendEmailId` must still have their own distinct key. Pattern: `webhook:<resendEmailId>:<source>` (e.g., `webhook:abc-123:webhook-delivered`). W7's `handleEmailEvent` mutation constructs this inline.

### 9.2 Per-event insert, W7 coalesces (reconciliation M15)

W6 inserts one row per triggering event:
- One `emailEvents` row per `anomalies` row (`source: "send"`, `status: "pending"`, `templateKey: "anomaly-alert"`, `idempotencyKey` includes the `anomalyId` so each anomaly is distinct).
- One row per promo-warning threshold crossing (`cadence` set).
- One row per statement-closing threshold crossing.
- One row per `subscription_detected` per-user-per-day batch (the batch is logical; W7 renders the array within the template).
- One row per `weekly_digest` per-user-per-week.

W7's workflow consumes:
- `sendAnomalyAlert` starts on each anomaly insert; step 1 (`waitForMoreAnomaliesStep`, 15 min) queries by `userId + status=pending + templateKey=anomaly-alert + createdAt within window`, coalesces into one payload, and marks each constituent row `status: "running"` → `"sent"` on dispatch.
- Other workflows are 1:1 event-to-send; no coalesce.

Dispatch signature for W7's `dispatchAnomalyAlert` (reconciliation M15) accepts **a single anomaly** at the producer boundary:

```ts
dispatchAnomalyAlert({
  userId: Id<"users">;
  anomalyId: Id<"anomalies">;
})
```

The workflow's first step expands to the coalesced array by querying sibling `emailEvents` rows within the 15-minute window. This keeps W6 dumb (one event per detection) and centralizes coalesce logic in W7.

### 9.3 Status ownership rules

| Field | Writer | When |
|---|---|---|
| `createdAt`, `idempotencyKey`, `templateKey`, `payloadJson`, initial `status: "pending"` | W6 (or W4 for reconsent / item-error) | On event insert |
| `workflowId` | W6 right after `workflow.start` returns | Same transaction if possible, otherwise scheduler-follow |
| `status` transitions (`pending` → `running` → `sent` / `skipped_*` / `failed`), `attemptCount`, `processedAt`, `errorMessage`, `resendEmailId` | W7 workflow steps | On each step |
| `source: "webhook-*"` rows | W7 `handleEmailEvent` (inbound Resend) | Webhook receipt |

---

## 10. Idempotency layering (reconciliation M4, spike committed 2026-04-20)

**Committed strategy:** **C-prime (producer-insert dedup via unique index).** Full rationale in [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4. Key facts from that spike:

- `@convex-dev/resend` 0.2.3 provides **no user-exposed idempotency**. The internal `Idempotency-Key` header is batch-scoped for the component's own retries, not a user dedup surface. Strategy A (delegate to Resend) is impossible.
- `@convex-dev/workflow` `workflow.start` has **no dedup on args**. Every call spawns a new instance. Dedup must happen before `workflow.start`.
- Convex Ents `.field(..., { unique: true })` enforces uniqueness at the DB layer; concurrent duplicate inserts throw. This is the single atomic dedup surface across W5, W6, and W7.

### 10.1 Canonical hash utility

Single module at **`packages/backend/convex/notifications/hashing.ts`** (NOT `agent/hashing.ts`). Exports one function shared by W5 (via `agentProposals.contentHash`) and W7 (via `emailEvents.idempotencyKey`).

```ts
// packages/backend/convex/notifications/hashing.ts
export function idempotencyKey(input: {
  userId: string;
  scope: string;           // templateKey for W7; `propose_${toolName}` for W5
  threadId?: string;       // passed by W5 so same-proposal-in-different-thread does not collide
  cadence?: number;        // 30 / 14 / 7 / 1 / 3 / etc. for cadence-based sends
  ids?: string[];          // affected row IDs for W5; payload IDs for W7
  dateBucket?: string;     // YYYY-MM-DD (UTC) for daily; YYYY-MM-DD-HHMM for 15-min windows
}): string {
  const canonical = JSON.stringify({
    u: input.userId,
    s: input.scope,
    t: input.threadId ?? null,
    c: input.cadence ?? null,
    i: input.ids ? [...input.ids].sort() : null,
    d: input.dateBucket ?? null,
  });
  return sha256Hex(canonical);
}
```

### 10.2 Producer call pattern (Strategy C-prime)

For W5 `agentProposals`:

```ts
const contentHash = idempotencyKey({
  userId, scope: `propose_${toolName}`, threadId, ids: affectedIdsSorted,
});
try {
  return await ctx.table("agentProposals").insert({ ...fields, contentHash });
} catch (err) {
  if (isUniqueConstraintError(err)) {
    return await ctx.table("agentProposals").get("contentHash", contentHash);
  }
  throw err;
}
```

For W7 (inside each `dispatch*` action; the dispatch action IS the producer):

```ts
const key = idempotencyKey({ userId, scope: templateKey, cadence, dateBucket });
const existing = await ctx.runQuery(
  internal.email.events.getByIdempotencyKey,
  { idempotencyKey: key },
);
if (existing) return { skipped: "duplicate", emailEventId: existing._id };
const eventId = await ctx.runMutation(
  internal.email.events.insertPending,
  { idempotencyKey: key, userId, templateKey, cadence, payloadJson },
);
await workflow.start(ctx, internal.email.workflows.send<Template>, { emailEventId: eventId });
return { emailEventId: eventId };
```

The get-first check is a fast path; the unique constraint is the correctness boundary. If two concurrent inserts both pass the `get`, only one `insert` succeeds and the second throws; the caller catches and returns the existing row.

### 10.3 Scope boundaries (who passes what to `idempotencyKey`)

| Workstream | scope field | threadId | cadence | ids | dateBucket |
|---|---|---|---|---|---|
| W5 propose | `propose_<toolName>` | yes | no | affected row IDs (sorted) | no |
| W7 `promo-warning` | `promo-warning` | no | 30/14/7/1 | promoIds (sorted) | `YYYY-MM-DD` |
| W7 `statement-closing` | `statement-closing` | no | 3/1 | cardIds (sorted) | `YYYY-MM-DD` |
| W7 `anomaly-alert` | `anomaly-alert` | no | no | `[anomalyId]` | `YYYY-MM-DD-HHMM` (15-min bucket) |
| W7 `subscription-detected` | `subscription-detected` | no | no | subscriptionIds (sorted) | `YYYY-MM-DD` |
| W7 `weekly-digest` | `weekly-digest` | no | no | no | `YYYY-MM-DD` (Sunday) |
| W7 `welcome-onboarding` | `welcome-onboarding` | no | no | no | no (dedup by `{userId, scope}` only; once per user ever) |
| W7 `reconsent-required` | `reconsent-required` | no | no | `[plaidItemId]` | `YYYY-MM-DD` (24h dedup per item) |
| W7 `item-error-persistent` | `item-error-persistent` | no | no | `[plaidItemId]` | `YYYY-MM-DD` (or coarser per cron cadence) |

### 10.4 What this resolves

- W1, W2, W3, W4 plans unblocked already (no idempotency surface of their own).
- **W5, W6, W7 plans are now unblocked.** Execution can begin per each plan's Plan Handoff Header.
- `agentProposals.contentHash` and `emailEvents.idempotencyKey` both declared `{ unique: true }` (§1.6, §9.1). No application-layer pre-check-then-insert race; the DB closes the window.

---

## 11. `@convex-dev/workflow` installation (reconciliation M5)

W2 installs the component in [packages/backend/convex/convex.config.ts](../packages/backend/convex/convex.config.ts). See W2 §3.1. Single install, single version.

**W5, W6, W7 plans treat W2's PR that lands this component as an explicit prerequisite.** Each plan's "Prerequisite plans (must be merged)" row in the Plan Handoff Header names the W2 commit or branch.

W6's conditional "W6 installs if W2 hasn't" (W6 §9 assumption 6) is removed in the W6 amendment (see `W6-intelligence.brainstorm.md` amendment appendix). No double-install risk.

---

## 12. Rate-limit buckets (W2 owns)

Authoritative bucket set from W2 §5.4. W5 inherits for write tools; W7's preference-check step respects the buckets (it does not add its own).

| Bucket | Rate | Burst | Tools |
|---|---|---|---|
| `read_cheap` | 60/min | 15 | Most reads |
| `read_moderate` | 30/min | 10 | Aggregates |
| `write_single` | 20/min | 5 | Single-row propose |
| `write_bulk` | 5/min | 2 | Bulk propose |
| `write_expensive` | 2/min | 1 | `execute_confirmed_proposal`, `undo_mutation`, `trigger_plaid_resync` |

`read_semantic` from W2 §5.4 is dropped (no `search_transactions` at MVP per §2.4).

W5's destructive-ops bucket from its §8.1 (10/hour for card hard delete, Plaid item remove) is enforced inside W5's wrapper, on top of `write_expensive`. Not redundant; destructive-ops is a coarser scope.

---

## 13. Welcome-onboarding trigger (reconciliation M16)

W4 owns the trigger call on successful first Plaid link:

```ts
// Inside packages/convex-plaid consumer action in the host app, after exchangePublicToken succeeds
const priorLinkCount = await ctx.runQuery(internal.users.countActivePlaidItems, { userId });
if (priorLinkCount === 0) {
  await ctx.runAction(internal.email.dispatch.dispatchWelcomeOnboarding, {
    userId,
    variant: "plaid-linked",
    firstLinkedInstitutionName: institutionName,
  });
}
```

W7 owns the signup-only fallback cron that fires `variant: "signup-only"` for users created ≥48h ago who never linked a Plaid item and never received a welcome (§7.3 W7 welcome template is essential-tier; preference check bypassed but idempotency on `{userId, "welcome-class"}` prevents double-send across both triggers).

W4's amendment (in `W4-plaid-gap-closure.brainstorm.md`) adds this dispatch call to the existing `exchangePublicToken` action. W7 §10.3 already lists the signup-only fallback cron.

---

## 14. Template catalog (W7 owns; reconciliation M18)

Final MVP template count: **8** (W7's original 7 + `subscription-detected` per W6 contract).

| # | Template key | Tier | Trigger owner | Dispatch action |
|---|---|---|---|---|
| 1 | `welcome-onboarding` | essential | W4 (plaid-linked), W7 (signup-only cron) | `dispatchWelcomeOnboarding` |
| 2 | `weekly-digest` | non-essential | W7 Sunday cron | `dispatchWeeklyDigest` |
| 3 | `promo-warning` | non-essential | W6 promo countdown refresh | `dispatchPromoWarning` |
| 4 | `statement-closing` | non-essential | W6 statement reminder scan | `dispatchStatementReminder` |
| 5 | `anomaly-alert` | non-essential | W6 anomaly scan (per event) | `dispatchAnomalyAlert` |
| 6 | `reconsent-required` | essential | W4 webhook handler | `dispatchReconsentRequired` |
| 7 | `item-error-persistent` | essential | W4 6-hour cron | `dispatchItemErrorPersistent` |
| 8 | `subscription-detected` | non-essential | W6 subscription catch-up scan | `dispatchSubscriptionDigest` (W7) |

W6 §4.4.3 already defines per-user-per-day batching with payload `{ detected: [{ subscriptionId, normalizedMerchant, averageAmount, frequency }, ...] }`. W7's amendment adds the template and dispatch action to cover this.

Name reconciliation:
- W6 `deferred-interest-warning` → canonical `promo-warning` (W7 name wins).
- W6 `statement-closing-reminder` → canonical `statement-closing` (W7 name wins).
- W6 `subscription-detected` → kept verbatim as MVP template #8.
- W6 and W7 agree on `weekly-digest`, `anomaly-alert`.

---

## 15. Dispatch action signatures (W7 owns)

From W7 §3.3. All Zod-validated at the `internalAction` boundary. Callers (W4, W6) must adopt these exact shapes.

```ts
internal.email.dispatch.dispatchWelcomeOnboarding({
  userId: Id<"users">;
  variant: "signup-only" | "plaid-linked";
  firstLinkedInstitutionName?: string;
});

internal.email.dispatch.dispatchWeeklyDigest({
  userId: Id<"users">;
  weekStart: number;
  topSpendByCategory: /* finalised in W7 /plan */;
  upcomingStatements: /* ... */;
  activeAnomalies: /* ... */;
  expiringPromos: /* ... */;
  expiringTrials: /* ... */;
});

internal.email.dispatch.dispatchPromoWarning({
  userId: Id<"users">;
  cadence: 30 | 14 | 7 | 1;
  promos: Array<{ promoId, cardName, expirationDate, balance, daysRemaining }>;
});

internal.email.dispatch.dispatchStatementReminder({
  userId: Id<"users">;
  cadence: 3 | 1;
  statements: Array<{ cardId, cardName, closingDate, projectedBalance, minimumDue, dueDate }>;
});

internal.email.dispatch.dispatchAnomalyAlert({
  userId: Id<"users">;
  anomalyId: Id<"anomalies">;                // single event; workflow coalesces (M15)
});

internal.email.dispatch.dispatchSubscriptionDigest({         // added by M18
  userId: Id<"users">;
  batchDate: string;                        // YYYY-MM-DD
  detected: Array<{
    subscriptionId: Id<"detectedSubscriptions">,
    normalizedMerchant: string,
    averageAmount: number,
    frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "annual",
  }>;
});

internal.email.dispatch.dispatchReconsentRequired({
  userId: Id<"users">;
  plaidItemId: string;
  institutionName: string;
  reason: "ITEM_LOGIN_REQUIRED" | "PENDING_EXPIRATION";
});

internal.email.dispatch.dispatchItemErrorPersistent({
  userId: Id<"users">;
  plaidItemId: string;
  institutionName: string;
  firstErrorAt: number;
  lastSeenErrorAt: number;
  errorCode: string;
});
```

---

## 16. Subscription and anomaly write-side mutations (reconciliation M14)

W6 §7.1 flagged five single-field updates for W5 (`propose_confirm_subscription`, `propose_dismiss_subscription`, `propose_set_subscription_nickname`, `propose_acknowledge_anomaly`, `propose_dismiss_anomaly`). W5 §11 does not enumerate them.

**Resolved:** These are single-field user-intent updates, not the kind of high-stakes change the propose/confirm/execute flow exists for. **Demote to direct-UI mutations** in W5. The agent surfaces them via tool-hint turns (W3 drill-in pattern) that call the direct mutations from the chat UI, not via `propose_*` wrappers.

Direct mutations (not agent-proposed):
- `api.intelligence.subscriptions.confirm({ subscriptionId })` → patches `userStatus: "confirmed"`.
- `api.intelligence.subscriptions.dismiss({ subscriptionId })` → patches `userStatus: "dismissed"`.
- `api.intelligence.subscriptions.setNickname({ subscriptionId, nickname })` → patches `nickname`.
- `api.intelligence.anomalies.acknowledge({ anomalyId })` → patches `userStatus: "acknowledged"`.
- `api.intelligence.anomalies.dismiss({ anomalyId })` → patches `userStatus: "dismissed_false_positive"`.

Each lives in the `intelligence/` directory (W6 territory), uses the repo's `mutation` from `./functions`, and does not flow through `agentProposals` or `auditLog`.

If post-MVP feedback shows users want undo on these, they graduate to W5's wrapper in a follow-up milestone.

---

## 17. `get_upcoming_statements` wiring (reconciliation M13)

W6's `statementReminders` table becomes the authoritative source for `get_upcoming_statements` once W6 lands. Until then, the tool body reads `creditCards.statementClosingDay` directly and computes next occurrence (W2 §5.1 tool #11 current behavior).

W6's PR that lands the `statementReminders` table also submits a one-file change to `packages/backend/convex/agent/tools/read/getUpcomingStatements.ts` to switch the data source. W2 brainstorm §2.2 already anticipates this with "W2's `list_deferred_interest_promos` tool reads from `promoRates` directly until W6 lands"; the same pattern applies to statements.

No coordination required beyond this amendment note.

---

## 18. Amendment protocol

Any PR that touches a shared contract must:

1. Open amendment PR against the relevant brainstorm(s).
2. Open amendment PR against this file (same branch, same stack).
3. Bump the `Version` in §0 for the affected row.
4. Post a Linear comment on every dependent workstream's sub-project under M3 Agentic Home.

Breaking changes require all dependent workstream owners to ack before merge (mirrors W2 §7.3 bullet 3).

---

## 18.1 Post-plan amendment log (2026-04-20, second pass)

After W5-W7 emitted spec/plan/research artifacts, a second review surfaced follow-ups that were closed in this file:

| Item | Fix location | Affected workstreams |
|---|---|---|
| `agentProposals.contentHash` needs `{ unique: true }` for Strategy C-prime | §1.6 | W2 (schema), W5 (wrapper) |
| `emailEvents.idempotencyKey` needs `{ unique: true }` for Strategy C-prime | §9.1 | W7 (schema) |
| Hashing utility canonical path | §10.1 — `packages/backend/convex/notifications/hashing.ts` | W2 (moves from `agent/hashing.ts`), W5, W6, W7 |
| Hash input includes `threadId` (per-thread scoping) | §10.1, §10.3 | W5 |
| Webhook-event rows need synthetic idempotency keys | §9.1 | W7 |

Four outbound amendment messages were sent to the W2, W5, W6, W7 sessions. Once each session ACKs and re-emits, this file's §0 ownership-table version rows bump to `2026.04.20-2`.

---

## 19. Reconciliation closure map (M1 through M19)

| ID | Original issue | Resolution section |
|---|---|---|
| M1 | `dev` missing from `RESERVED_SLUGS` | §1.4 |
| M2 | `reminders` schema three-way conflict | §1.8 |
| M3 | `search_transactions` / RAG single-point-of-failure | §2.4 (deferred) |
| M4 | Idempotency layering across W5, W6, W7 | §10 (research spike) |
| M5 | `@convex-dev/workflow` unowned | §11 (W2 owns) |
| M6 | Proposal `scope` field | §1.6 |
| M7 | Proposal state enum disagrees | §3 (W2's 9-state enum) |
| M8 | Thread ID shape uncertainty | §1.3 (route on Ents ID) |
| M9 | Tool envelope shape mismatch | §4 (nested) |
| M10 | `agentThreads.readCallCount` not in W2 schema | §1.1, §1.2 |
| M11 | `get_proposal` tool not in W2 registry | §2.3, §2.5 |
| M12 | `cancel_proposal` owner conflict | §3 (W2 owns state transition) |
| M13 | `get_upcoming_statements` data source | §17 |
| M14 | Subscription / anomaly mutation surface | §16 (direct mutations) |
| M15 | Anomaly coalesce owner | §9.2 (W7 workflow; W6 per-event inserts) |
| M16 | Welcome trigger owner | §13 |
| M17 | `emailEvents` vs `notificationEvents` | §9.1 (merged) |
| M18 | Email template contract | §14 (8 templates) |
| M19 | Reversal token format | §7 (opaque `rev_<...>`) |

---

**End of cross-workstream contracts. Update in lockstep with any brainstorm amendment.**

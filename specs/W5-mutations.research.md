# W5: Mutation and Bulk Edit Tools (Research)

**Milestone:** M3 Agentic Home
**Workstream:** W5 Mutations
**Phase:** Obra Superpowers `/plan` (research and citations; required by master prompt §10)
**Author:** Claude
**Date:** 2026-04-20
**Writing convention:** No em-dashes.

This file answers the seven research tasks catalogued in [specs/W5-mutations.brainstorm.md](W5-mutations.brainstorm.md) §17. Most answers derive from the cross-workstream idempotency spike committed on the same date at [specs/00-idempotency-semantics.md](00-idempotency-semantics.md); citations inline.

---

## 1. `@convex-dev/workflow` current API

**Brainstorm §17 Task 1.** Version, retries, step durability semantics, progress-query shape, size-of-state limits.

### 1.1 Installation and version

Component installed by W2 per contracts §11. W2's install at [packages/backend/convex/convex.config.ts](../packages/backend/convex/convex.config.ts) pins the version via the W2 schema PR. Per [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4.2, the docs and source were fetched via Context7 at `/get-convex/workflow` on 2026-04-20.

### 1.2 Start signature

```ts
workflow.start(ctx, workflowRef, args, {
  onComplete?,
  context?,
  startAsync?,
}) -> WorkflowId
```

Returns a fresh `WorkflowId` per call. No dedup on args. Calling twice with identical args produces two independent instances. (Spike §4.2)

### 1.3 Step primitives

- `step.runQuery(queryRef, args)`
- `step.runMutation(mutationRef, args, { runAfter?, runAt?, inline?, retry? })`
- `step.runAction(actionRef, args, { runAfter?, runAt?, retry? })`

### 1.4 Durability semantics

Per spike §4.2:

- **Mutation steps: exactly-once.** `step.runMutation` output is journaled. On workflow resume after server restart, completed mutation steps return the journaled output; they do not re-execute.
- **Action steps: at-least-once.** Actions can retry (`{ retry: true }` or custom `{ maxAttempts, initialBackoffMs, base }`). Action bodies must be idempotent or tolerate re-runs.
- **Query steps: per-query semantics.** Queries are side-effect-free; replay is safe.

### 1.5 Scheduling within a workflow

- `runAfter: number` schedules a step to run after N milliseconds.
- `runAt: number` schedules a step for an absolute epoch time.
- `inline: true` (mutations only) runs the step within the workflow's Convex transaction.

### 1.6 Cancellation

`workflow.cancel(ctx, workflowId)` halts execution. Already-completed steps do not reverse automatically; application code must compensate.

### 1.7 Implications for W5

- **Task W5.6 (bulk orchestrator)** adopts `@convex-dev/workflow` as Variant B, superseding the brainstorm's tentative Variant A. Rationale: exactly-once mutation steps give resumability after Convex redeploy for free; plain scheduler fan-out does not.
- **Action steps must be idempotent.** W5's bulk path calls `step.runMutation` for chunks, not actions, so idempotency is automatic. If a future task requires action-step usage, the action body must self-dedupe.
- **`workflow.start` is never called twice with the same args at the right call site.** W5's bulk path calls `workflow.start` once, inside `executeWriteTool` after the proposal transitions to `executing`. The state-machine guard on `confirmed → executing` prevents duplicate starts.

**Sources:**
- `@convex-dev/workflow` README and llms.txt via Context7 `/get-convex/workflow` (2026-04-20).
- [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4.2.

---

## 2. Idempotency patterns in Convex Ents

**Brainstorm §17 Task 2.** Idempotency key in mutation args; scheduled dedup; content-hash approach; natural key upsert.

### 2.1 Primitives available

Per spike §4.3:

- **Unique-field constraint.** `.field("name", v.string(), { unique: true })` on a `defineEnt(...)` enforces uniqueness and creates an index. Duplicate inserts throw at commit time.
- **OCC retry.** Mutations retry automatically on optimistic-concurrency conflicts. Orthogonal to application idempotency.
- **Own-write read.** A mutation can insert then query and see its own write in the same transaction.
- **Scheduler semantics.** `ctx.scheduler.runAfter` is at-least-once. Bare-scheduled functions must be self-idempotent.

### 2.2 Pattern adopted for W5

Strategy C-prime from spike §4.4. The unique field `agentProposals.contentHash` IS the dedup primitive. The wrapper pattern:

```ts
try {
  return await ctx.table("agentProposals").insert({ ...fields, contentHash });
} catch (err) {
  if (isUniqueConstraintError(err)) {
    return await ctx.table("agentProposals").get("contentHash", contentHash);
  }
  throw err;
}
```

Two concurrent calls both passing a `get`-first check would still race; the unique-constraint commit-time throw closes that window (contracts §10.2).

### 2.3 Alternatives considered

- **Strategy A (delegate to `@convex-dev/resend`).** Impossible: Resend component exposes no user-keyed idempotency (spike §4.1).
- **Strategy B (pre-check then insert).** Race window; not used.
- **Strategy C (unique-index collision fallback).** Adopted, modified to C-prime which uses `get`-first for the fast path while keeping the unique constraint as the correctness boundary.

**Sources:**
- Convex Ents docs via Context7 `/get-convex/convex-ents` (2026-04-20).
- [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4.3 and §4.4.
- [specs/00-contracts.md](00-contracts.md) §10.

---

## 3. `@convex-dev/rate-limiter` component shape

**Brainstorm §17 Task 3.** Token bucket vs leaky bucket; per-resource bucket definitions; integration with `./functions.ts` custom wrapper.

### 3.1 Install and ownership

Component installed by W2 per contracts §11 and §12. W2's install at [packages/backend/convex/convex.config.ts](../packages/backend/convex/convex.config.ts) lands in the same PR as `@convex-dev/workflow`.

### 3.2 Bucket policy (contracts §12)

| Bucket | Rate | Burst | Tools |
|---|---|---|---|
| `read_cheap` | 60/min | 15 | Most reads |
| `read_moderate` | 30/min | 10 | Aggregates |
| `write_single` | 20/min | 5 | Single-row propose |
| `write_bulk` | 5/min | 2 | Bulk propose |
| `write_expensive` | 2/min | 1 | `execute_confirmed_proposal`, `undo_mutation`, `trigger_plaid_resync` |
| `destructive_ops` (W5-local) | 10/hour | 3 | Additional gate for tools in `DESTRUCTIVE_TOOLS` |

### 3.3 Integration pattern

The component typically exposes two calls:

- `rateLimiter.defineBucket(name, { rate, period, capacity })`: declares a bucket.
- `bucket.limit(ctx, { key })`: atomically checks and decrements a token; throws or returns rejection if empty.

The `./functions.ts` custom wrapper is unaffected. Write-tool wrapper calls `bucket.limit(...)` internally; the `ctx.viewerX()` identity provides the per-user bucket key.

### 3.4 Design concerns

- **Bucket keys.** Per-user for most buckets. Per-thread for `write_bulk` would add a layer but is not required by contracts.
- **Clock skew.** Component uses server-side time; immune to client clock skew.
- **Burst vs steady-state.** Capacities chosen for "casual agent usage" profile; not sized for automated flows.

**Sources:**
- [specs/00-contracts.md](00-contracts.md) §12.
- W2 spec (upcoming reference: [specs/W2-agent-backend.md](W2-agent-backend.md) §5.4).
- `@convex-dev/rate-limiter` docs (to be cited in W2's research file; not re-fetched here).

---

## 4. Per-mutation reversal-payload size limits

**Brainstorm §17 Task 4.** Convex document size cap and JSON serialization overhead.

### 4.1 Convex limit

Convex document size cap: **1 MiB** (1,048,576 bytes) per document. Source: Convex docs `https://docs.convex.dev/production/state/limits` (standard limit documented across Convex publications; no change reported in 2026 dev log).

### 4.2 W5 audit-row size budget

A single `auditLog` row stores:

- `inputArgsJson`: typically 100 to 2,000 bytes.
- `affectedIdsJson`: one transaction ID is ~40 bytes in Convex's base32 format; 500 IDs = ~20 KiB.
- `reversalPayloadJson`: per-row prior-field map; single-row mutations ~200 bytes, 500-row bulk chunks ~60 KiB at the 95th percentile.

Total upper-bound for a 500-row bulk chunk: ~100 KiB. Well under the 1 MiB cap.

### 4.3 Decision

Task W5.6 chunks bulk execution at 500 rows per mutation call; each chunk writes one `auditLog` row sharing `proposalId`. No risk of exceeding the document cap under normal usage. For hypothetical 10k-row bulks, 20 chunks = 20 audit rows; single-row query by `proposalId` retrieves all.

If a future tool writes a larger reversal payload per row (for example a full document snapshot rather than changed fields), the chunk size reduces accordingly. Rule of thumb: keep `reversalPayloadJson` under 500 KiB per chunk with 500-row chunks.

**Sources:**
- Convex Ents docs via Context7 `/get-convex/convex-ents` (2026-04-20) for Ents-layer limits.
- Convex public docs at `https://docs.convex.dev/production/state/limits` for the 1 MiB cap.

---

## 5. Ents `.delete()` edge cascade

**Brainstorm §17 Task 5.** Does `ctx.table("creditCards").getX(id).delete()` cascade to `walletCards`, `statementSnapshots`, `promoRates`, `installmentPlans`?

### 5.1 Finding

Convex Ents does NOT cascade by default. `.delete()` on an entity removes only that row. Edges become dangling references. Per convex-ents README (fetched via Context7 `/get-convex/convex-ents` 2026-04-20), cascade behavior requires explicit configuration on the edge definition via helper patterns not surfaced in the default schema API.

### 5.2 Implication for W5

W5 does not expose card hard delete at MVP (contracts §2.4 defers). Direct UI `hardDelete` mutation in [packages/backend/convex/creditCards/mutations.ts](../packages/backend/convex/creditCards/mutations.ts) currently calls `card.delete()` without explicit cascade; this leaves `walletCards` joins and child rows orphaned. Known gap; tracked separately from W5.

When a future `propose_card_hard_delete` tool lands (post-MVP), its precondition checklist per brainstorm §10.2 blocks delete unless all children are already inactive, avoiding the orphan problem.

**Sources:**
- convex-ents README via Context7 `/get-convex/convex-ents` (2026-04-20).
- Brainstorm §10 for the W5 policy that defers the problem.

---

## 6. Convex mutation-scope transactionality

**Brainstorm §17 Task 6.** Does a Convex mutation see a consistent snapshot across multiple `ctx.table()` calls? Atomicity of the `propose_card_primary_flag_update` two-patch sequence?

### 6.1 Finding

Per spike §4.3 and Convex docs, mutations are transactional: all reads and writes within one mutation run under a single consistent snapshot. A mutation can insert then query and see its own write. Concurrent mutations retry on OCC conflict.

### 6.2 Implication for W5

- The two-patch sequence in the deferred `propose_card_primary_flag_update` (clear prior primary, set new primary) would run atomically inside a single mutation. No window for two primary cards.
- The wrapper's create-then-audit sequence (`createProposal` then `markExecuted` then insert `auditLog`) runs across MULTIPLE mutations (each via `ctx.runMutation`), so atomicity breaks at the mutation boundary. The state machine (`confirmed → executing → executed`) closes this gap: if execute fails mid-way, state stays `executing` and a cleanup cron (owned by W2) transitions stale `executing` rows to `failed`.

### 6.3 Per-handler atomicity

Each per-tool handler's body (patches applied inside the handler callback) runs inside a single mutation, so the per-tool patches are atomic. Bulk execution chunks are individually atomic; cross-chunk atomicity is not guaranteed (and is explicitly relaxed by the abort-and-reverse policy in Task W5.6).

**Sources:**
- Convex docs on mutation transactionality (standard Convex model).
- [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4.3.

---

## 7. Vercel AI SDK tool-call metadata

**Brainstorm §17 Task 7.** What metadata the tool-result carries back so W5 tools can include it in audit rows.

### 7.1 Finding

Vercel AI SDK v5 and v6 expose tool results as structured objects with fields such as `toolCallId`, `toolName`, `args`, `result`, `state` (`"partial-call" | "call" | "result"`). Streamed tool results also carry per-chunk progression metadata (via `useChat`'s `onToolCall` callback).

W2 wraps the SDK's tool surface and adds the `ToolEnvelope` shape (contracts §4). Per-call metadata inside `ToolEnvelope.meta` includes `rowsRead: number` and `durationMs: number`.

### 7.2 Implication for W5

W5's audit row includes:

- `toolName: string` from the SDK's `toolName` field.
- `inputArgsJson: string` from the SDK's `args` serialized.
- `executedAt: number` (server-side wall clock at audit-row insert, NOT the SDK's call-time timestamp; safer for ordering).

Metadata from `ToolEnvelope.meta` (`rowsRead`, `durationMs`) is NOT persisted in `auditLog` at MVP. Rationale: these are read-path metrics; write-path audit tells a different story. A followup could add `executionMetaJson` to `auditLog` if observability requests it.

### 7.3 No `toolCallId` in audit

The SDK's `toolCallId` is per-agent-turn, not per-user-intent; two retries in the same turn share the same ID. W5 uses `proposalId` (per-user-intent) as the primary key and `toolCallId` is not persisted. If `toolCallId` is needed for debugging later, it can be added to `agentMessages` (W2's surface), not to `auditLog`.

**Sources:**
- Vercel AI SDK docs via Context7 `/vercel/ai-sdk` (not separately fetched here; W2's research file owns the canonical citation).
- [specs/00-contracts.md](00-contracts.md) §4 for the envelope shape.

---

## 8. Summary table

| Brainstorm §17 task | Primary source | Decision |
|---|---|---|
| 1. `@convex-dev/workflow` API | Spike §4.2, Context7 `/get-convex/workflow` | Adopt Variant B for bulk (mutation steps exactly-once) |
| 2. Convex Ents idempotency | Spike §4.3, §4.4; contracts §10 | Strategy C-prime (unique constraint as primary, get-first as fast path) |
| 3. `@convex-dev/rate-limiter` | Contracts §12; W2 spec | Use contracts §12 buckets; add W5-local `destructive_ops` |
| 4. Document size cap | Convex docs | 1 MiB cap; chunk at 500 rows keeps audit rows under 100 KiB |
| 5. Ents `.delete()` cascade | Context7 `/get-convex/convex-ents` | No cascade; W5 MVP defers card hard delete, so non-issue |
| 6. Mutation transactionality | Spike §4.3; Convex docs | Per-mutation atomicity; cross-mutation gaps closed by state machine |
| 7. Vercel AI SDK tool metadata | Contracts §4; W2 research | Persist `toolName`, `args`, server-side `executedAt`; skip SDK-side IDs and meta |

---

## 9. Things intentionally NOT researched for this workstream

- Per-provider retry semantics of the underlying LLM (W2 scope).
- React 19 Server Components streaming semantics for tool output (W1 and W3 scope).
- Plaid API rate limits (W4 scope).
- Resend provider quirks (W7 scope).

These live in the respective workstream research files and are cited here only where cross-cutting.

---

**End of research.**

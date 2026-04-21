# W5: Mutation and Bulk Edit Tools (Brainstorm)

**Milestone:** M3 Agentic Home
**Workstream:** W5 Mutation tools
**Phase:** Obra Superpowers `/brainstorm` (output of Phase 1)
**Author:** Claude (read-only session; this file is the only artifact produced)
**Date:** 2026-04-20
**Writing convention:** No em-dashes, per repo rule. Colons, semicolons, parentheses, or fresh sentences instead.

## Source documents consumed

- [specs/00-master-prompt.md](specs/00-master-prompt.md) Sections 1 through 7, Section 8 W5 brief, Section 11 dependency graph.
- [specs/W0-existing-state-audit.md](specs/W0-existing-state-audit.md) Sections 10.3 (existing creditCards mutations and `userOverrides` sub-object), 11.2 (`transactionOverlays` fields and mutations), W5 gap-matrix row in Section 1.
- [AGENTS.md](AGENTS.md) full file.
- [CLAUDE.md](CLAUDE.md) full file.
- [packages/backend/convex/creditCards/mutations.ts](packages/backend/convex/creditCards/mutations.ts) every handler.
- [packages/backend/convex/transactionOverlays/mutations.ts](packages/backend/convex/transactionOverlays/mutations.ts) every handler.
- [packages/backend/convex/promoRates/mutations.ts](packages/backend/convex/promoRates/mutations.ts) every handler.
- [packages/backend/convex/installmentPlans/mutations.ts](packages/backend/convex/installmentPlans/mutations.ts) every handler.
- [packages/backend/convex/schema.ts](packages/backend/convex/schema.ts) full schema (13 tables).
- [packages/backend/convex/functions.ts](packages/backend/convex/functions.ts) custom `query` / `mutation` / `internalMutation` factories.

## 0. Declared assumptions (approved by Eric, 2026-04-20)

These carry forward into `specs/W5-mutations.md` (the spec) unless overridden.

1. **Proposal table ownership.** The `agentProposals` Ents table and its state machine (`proposed | awaiting_confirmation | confirmed | executed | cancelled | timed_out`) live in W2. W5 consumes a W2-owned internal proposal API (see Section 13.1). W5 owns the `auditLog` table and the execute / undo semantics only.
2. **Audit log scope at MVP.** Only agent-initiated writes produce `auditLog` rows. Direct UI mutations (`toggleLock`, `toggleAutoPay`, `updateDisplayName`, `upsertField`, `toggleReviewed`, `toggleHidden`, `setOverride`, `setAprOverride`, `clearOverride`, `clearAprOverride`, promo CRUD, installment-plan CRUD, card soft / hard delete) stay unrecorded in the audit log at MVP. Retrofit is a followup issue.
3. **Transaction split and merge data model.** Extend `transactionOverlays` in place rather than add new tables. Add `tags: v.array(v.string())`, `splits: v.array(v.object({...}))`, `duplicateOfPlaidTransactionId: v.string()`. See Section 12 for the proposed schema diff.
4. **Primary card flag.** Add `isPrimary: v.optional(v.boolean())` to `creditCards`. Execute mutation enforces the "at most one primary per user" invariant atomically by clearing the prior primary.
5. **Reminders.** New SmartPockets-owned `reminders` Ents table. W5 owns CRUD. W6 owns scheduled evaluation and email fan-out. Schema sketch in Section 12.

---

## 1. Goal and non-goals

### 1.1 Goal

Deliver the write-path tool set the agent uses to mutate SmartPockets data on the user's behalf: propose, confirm, execute, audit, undo. Each write tool follows the same three-verb pattern:

1. `propose_<verb>`: agent-callable mutation. Runs read-only; computes diff; inserts an `agentProposals` row (owned by W2); returns the preview payload to chat.
2. `execute_confirmed_proposal(proposalId)`: agent-callable mutation invoked after the user clicks Confirm in `ProposalConfirmCard` (W3). Wrapper verifies state, runs the handler, writes the `auditLog` row with reversal payload, marks the proposal executed, returns a reversal token.
3. `undo_mutation(reversalToken)`: agent-callable mutation. Wrapper verifies the 10-minute window, applies the reversal, writes a new `auditLog` row of type "undo".

### 1.2 Non-goals for MVP

- Retrofitting direct UI mutations into the audit log (followup).
- Per-tool Zod input schemas (W2 tool registry catalogues these; W5 imports them).
- `ProposalConfirmCard` rendering (W3).
- `agentProposals` schema shape (W2).
- Reminders trigger evaluation and fan-out (W6).
- Voice confirmation. Out of MVP entirely (master prompt Section 3).
- Rollback of irreversible operations (Plaid resync, Plaid item remove). Undo on these tools is a no-op with an explanatory chat message.

### 1.3 Must not regress

- All existing direct UI mutations continue to work unchanged.
- Plaid component stays write-only-by-component (no SmartPockets writes to `plaid:plaidTransactions` or any other `plaid:*` table).
- Every write still derives `userId` from `ctx.viewerX()` or the internal `userId` arg (for internal-action-triggered writes), never from public function args.
- Every write still verifies ownership (`entity.userId === viewer._id`) before patching.

---

## 2. Approach variants

### 2.1 Approach A: Tool-layer wrapper plus dedicated `auditLog` table (RECOMMENDED)

Every agent-facing write is a Convex `mutation` built on a shared `writeTool(config, handler)` wrapper. The wrapper provides:

- `ctx.viewerX()` auth check (inherited from `./functions` custom context).
- Proposal lifecycle: load proposal, verify state `confirmed`, verify `viewer._id === proposal.userId`, verify `threadId` matches, transition to `executed`.
- Ownership re-verification: every affected entity is re-fetched and `entity.userId === viewer._id` checked inside the handler callback.
- Rate-limit gate: checks per-user and per-thread buckets before the handler runs; records usage after.
- Handler callback returns `{affectedIds, reversalPayload, summary}`.
- Writes one `auditLog` row per execute call (possibly one per chunk for bulk, sharing a `proposalId`).
- Returns a reversal token (the `auditLog._id` encoded with a lightweight prefix to make it non-ID-looking to the agent).

Direct UI mutations stay in their current files and do not invoke the wrapper.

Pros:
- Clean separation between agent-facing and direct-UI mutations.
- Low surface area for cross-cutting concerns (auth, rate-limit, audit, undo, proposal lifecycle) since they all live in one wrapper.
- New tools are small functions that plug into the wrapper.
- Undo logic is one function, not N per-tool functions.

Cons:
- Direct UI mutations are silently not in the audit log (mitigated by the Section 2 followup retrofit).
- A bug in the wrapper affects every write tool (mitigated by exhaustive tests in the wrapper's own test file).

### 2.2 Approach B: Data-layer interceptor (REJECTED)

Monkey-patch or re-export Convex `mutation` so every mutation wrapped in `./functions` records an audit-log row automatically. Agent and direct-UI mutations both produce audit rows.

Pros:
- Universal coverage without retrofit.

Cons:
- Invasive; touches every file.
- Hard to inject per-mutation reversal-payload builders at this layer (each mutation has distinct field semantics).
- `./functions` is already a custom-wrapper surface; adding more wrapping complicates the stack and the type inference.
- Breaks the "brain-off default" of the current `./functions` import.
- Conflicts with the master prompt's stated Section 8 W5 target state which describes audit as agent-scoped.

Rejected for MVP. A future revision could lift specific direct-UI mutations into the wrapper as needed.

### 2.3 Approach C: Proposal-as-serialized-payload (REJECTED)

Store the full mutation name plus argument bundle in `agentProposals.payloadJson`. `execute_confirmed_proposal` deserializes and dispatches to a string-keyed registry of handlers.

Pros:
- Extremely generic execute step (one function handles all mutations).

Cons:
- Loses Convex's static type checking at the handler boundary.
- Makes it hard to model per-tool rate-limit buckets and per-tool destructive-action confirmation gates.
- Increases attack surface: a bug in deserialization could invoke an arbitrary internal mutation.
- Harder to reason about proposal previews since each tool computes previews differently.

Rejected.

---

## 3. Design: tool-layer wrapper pattern

### 3.1 Anatomy of a write tool

Every write tool has four artifacts:

1. A Zod input schema for the propose mutation. Lives in `packages/backend/convex/agent/tools/<tool>.ts`. Registered with W2's tool registry so the agent sees the shape.
2. A `propose_<verb>` mutation that takes the input, computes preview data, inserts an `agentProposals` row via W2's internal API, returns `{proposalId, previewPayload}`.
3. A handler function passed to `executeWriteTool(config, handler)` which does the mutation body. The wrapper invokes this inside a Convex mutation context after all pre-flight checks.
4. A reversal-payload builder: a pure function `(preMutationSnapshot, args) => reversalPayloadJson`. Called during execute to persist the prior state.

### 3.2 Shared wrapper surface

Two exported helpers from `packages/backend/convex/agent/writeTool.ts` (exact location negotiable in the spec):

```ts
// Consumed inside propose mutations
export async function createProposal(ctx, args: {
  toolName: string,
  inputArgs: unknown,
  affectedIds: Array<string>,
  previewPayload: unknown,
  requiresDestructiveConfirmation?: boolean,
}): Promise<{ proposalId: Id<"agentProposals">, preview: unknown }>

// Consumed inside execute_confirmed_proposal
export async function executeWriteTool<T>(
  ctx,
  args: { proposalId: Id<"agentProposals"> },
  handler: (ctx, proposal) => Promise<{
    affectedIds: Array<string>,
    reversalPayload: unknown,
    summary: string,
  }>,
): Promise<{ reversalToken: string, summary: string }>
```

`executeWriteTool` is the single place that:

- Loads the proposal and verifies `state === "confirmed"`, `userId === viewer._id`, `threadId` matches.
- Invokes the rate-limit component.
- Runs the handler inside a mutation (so it is transactional).
- Writes the `auditLog` row with a reversal payload the handler returned.
- Calls W2's `agent.proposals.markExecuted(proposalId, auditLogId)`.
- Encodes the reversal token from `auditLogId`.

Ownership re-verification happens inside the handler, not the wrapper, because each tool knows which entity types it touches.

### 3.3 Interaction sequence

```
1. User: "recategorize all amazon charges as shopping"
2. Agent selects propose_bulk_transaction_category_update
3. propose mutation:
   - viewerX(); query transactionOverlays + plaidTransactions for "amazon" merchant
   - Compute diff: affected count, sample-first-5, sample-last-5, per-row prior value
   - W2.agent.proposals.create(...) -> proposalId
   - return { proposalId, previewPayload }
4. Agent streams tool-result to UI
5. W3 ProposalConfirmCard renders with { proposalId, preview, Confirm + Cancel }
6. User clicks Confirm
7. Client calls execute_confirmed_proposal(proposalId)
   - Wrapper verifies state, auth, thread match, rate-limit
   - Handler loops overlays, patches userCategory, records prior values
   - Audit row inserted with reversalPayload = { updates: [{plaidTransactionId, priorUserCategory}, ...] }
   - W2.agent.proposals.markExecuted(proposalId, auditLogId)
   - returns { reversalToken: "rev_<auditLogId>", summary: "Recategorized 37 transactions" }
8. Agent replies "Done. Undo available for 10 minutes."
9. If user types "undo":
   - Agent calls undo_mutation(reversalToken)
   - Wrapper decodes auditLogId, loads row, verifies (now - executedAt) < 10 min, verifies reversedAt is null
   - Invokes per-tool reversal runner on reversalPayload
   - Writes new audit row with reversalOfAuditId = auditLogId, sets original row's reversedAt
```

### 3.4 Destructive-action gating

Two tools are destructive beyond undo's reach: `propose_plaid_item_remove` and `propose_card_hard_delete` (if included in MVP; see Section 11). These require an affirmative `confirmDestructive: true` flag in the execute call, passed by the UI only after a second modal. The agent cannot set this flag itself; it flows from the confirmation UI back through W1 to execute.

Rationale: the first-turn-read-before-write rule blocks adversarial cold-start proposals. Destructive-action gating blocks an adversarial mid-thread prompt that tricks the user into a single click.

---

## 4. Design: audit log

### 4.1 Semantics

Each audit row represents one forward mutation or one undo. The forward row holds the reversal payload needed to roll back; the undo row holds a pointer back to the original via `reversalOfAuditId`.

### 4.2 Why JSON columns for `inputArgsJson`, `affectedIdsJson`, `reversalPayloadJson`?

- Reversal payloads are heterogeneous per tool. Typing a discriminated union across every tool type would churn as new tools land.
- Zod parsing at undo time provides per-tool type safety without schema coupling.
- `inputArgsJson` is stored verbatim for forensics; no need for structural search.
- `affectedIdsJson` is stored as a JSON array of strings so bulk rows can have 10k IDs without joining to a child table.

Trade-off: no index-backed query on "find every audit row that touched plaidTransaction X." Acceptable for MVP. Followup can add a child `auditLogAffectedRows` table if forensics needs it.

### 4.3 Row size budget

Convex document size cap is 1 MiB. At ~100 bytes per `{plaidTransactionId, priorUserCategory}` pair, one audit row holds ~10k affected rows comfortably. For larger proposals, see Section 7 on chunking (one audit row per chunk, all sharing `proposalId`).

---

## 5. Reversal-payload strategy per mutation type

Per-field "before" snapshot stored as JSON. Reversal replays the stored snapshot via the same Convex table write primitives used by the forward mutation, taking the same ownership and validation path.

| Tool | Reversal-payload shape | Reversal action |
|---|---|---|
| `propose_transaction_category_update` (single) | `{ plaidTransactionId, priorUserCategory: string \| null }` | `transactionOverlays.upsertField` with prior value |
| `propose_bulk_transaction_category_update` | `{ updates: Array<{plaidTransactionId, priorUserCategory}> }` | Loop over `upsertField` |
| `propose_transaction_tags_update` | `{ plaidTransactionId, priorTags: Array<string> }` | Patch overlay `tags` back |
| `propose_transaction_notes_update` | `{ plaidTransactionId, priorNotes: string \| null }` | `upsertField` with prior value |
| `propose_transaction_review` | `{ plaidTransactionId, priorIsReviewed, priorReviewedAt }` | Patch both fields |
| `propose_transaction_hide` | `{ plaidTransactionId, priorIsHidden }` | Patch back |
| `propose_transaction_split` | `{ plaidTransactionId, priorSplits: Array<Split> \| null }` | Patch overlay `splits` back |
| `propose_transaction_merge_duplicates` | `{ primaryId, childUpdates: Array<{plaidTransactionId, priorIsHidden, priorDuplicateOfPlaidTransactionId}> }` | Patch each child back |
| `propose_card_nickname_update` | `{ cardId, priorDisplayName }` | Patch back |
| `propose_card_primary_flag_update` | `{ updates: Array<{cardId, priorIsPrimary}> }` | Patch each card back (captures the cleared prior primary) |
| `propose_card_apr_override` | `{ cardId, aprIndex, priorApr: {aprPercentage?, balanceSubjectToApr?, interestChargeAmount?} \| null }` | Patch `userOverrides.aprs` slice back |
| `propose_card_provider_dashboard_url_update` | `{ cardId, priorUrl: string \| null }` | Patch `userOverrides.providerDashboardUrl` back |
| `propose_promo_create` | `{ promoRateId }` | Soft delete via `promoRates.remove` semantics (`isActive = false`) |
| `propose_promo_update` | `{ promoRateId, priorFields: {...} }` | Patch each prior field back |
| `propose_promo_delete` | `{ promoRateId }` | Re-activate (`isActive = true`) |
| `propose_installment_plan_create / update / delete` | Same shape as promos | Same semantics |
| `propose_reminder_create / update / delete` | Same shape as promos | Same semantics |
| `propose_plaid_item_resync` | `{}` | No-op reversal. Agent chat message: "Resync cannot be undone." |
| `propose_plaid_item_remove` | `{}` | No-op reversal. Agent chat message: "Item removal cannot be undone. Re-link the bank in Settings to restore." |

### 5.1 What lives outside the reversal payload

Side effects that are not part of the write itself stay unreversed by W5:

- `plaidTransactions` row deletion (owned by component; not touched by W5).
- Scheduled emails that fired after a reminder was created, if the reminder was later deleted and then undone (W6's scheduled evaluation re-picks up the re-activated reminder on the next tick; no custom W5 logic needed).

---

## 6. Undo semantics under concurrent edits

### 6.1 Per-field undo, stomping allowed, warning required

Scenario: user categorizes transaction T as Shopping at t=0. At t=5min, user edits T again to Groceries via a direct UI click. At t=8min, user says "undo" in chat.

Three options considered:

- **Option A: stomping undo** (RECOMMENDED). Undo always restores the prior value from the reversal payload. If the current value differs from the post-mutation value, undo still runs and stomps the later edit. Agent warns in the chat response summary.
- **Option B: refuse if state diverged**. Undo checks current value against post-mutation value and fails if they differ. Safer; more confusing UX ("why can't I undo?").
- **Option C: merge undo**. Restore only fields where current value still matches post-mutation value. Skip diverged fields.

Recommendation: Option A for MVP. Later-edit is preserved in its own audit row (because W5 only audits agent writes, this specific direct-UI case is NOT preserved; this is a gap noted in Section 15 risks). The agent's post-undo summary should call out the stomp: "Undid the recategorization of 37 transactions. Note: transaction T had been re-edited since; that edit was overwritten."

### 6.2 Undo window

10 minutes from `executedAt` per master prompt Section 3 MVP scope. Window is stored implicitly: `undo_mutation` rejects any token where `(Date.now() - audit.executedAt) > 10 * 60 * 1000`.

### 6.3 Chunked bulk and undo

For a bulk proposal that writes multiple audit rows (one per chunk), each chunk's `executedAt` starts its own 10-minute clock. `undo_mutation` takes a single `reversalToken` that points to the *proposal-level* record. Under the hood the wrapper resolves that to all audit rows sharing the proposalId, verifies every chunk is still within its individual window, and then applies reversals in reverse order. If any chunk's window has passed, the entire undo fails with a partial-success explanation (no half-undo state).

Alternative: allow partial undo of only in-window chunks. More complex; defers to a followup issue if real-world scope motivates.

### 6.4 Double-undo

Undo on an already-undone audit row fails with "already undone" error. To "redo," the user performs the original proposal again (idempotency of the state, not of the proposal).

---

## 7. Bulk chunking

### 7.1 Three candidate paths

Variant A: **plain Convex scheduler fan-out.** An action (`action` from `./_generated/server`) loops over chunks, each chunk calls `ctx.runMutation(internal.tools.<name>.applyChunk, {proposalId, chunkStartIdx, chunkEndIdx})`. One audit row per chunk, all sharing `proposalId`.

Variant B: **`@convex-dev/workflow` component.** Durable workflow with per-step retries, resumability after Convex deploy, and a progress query. Component must be installed and registered (currently absent per W0 Section 7).

Variant C: **single action with inline mutation loop.** Simplest but no durability; if the action crashes mid-loop, partial state exists.

### 7.2 Recommendation

Start with **Variant A** for MVP. Rationale:

- Master prompt specifies 500 rows per internal mutation call (Section 8 W5 target state).
- Plain scheduler fan-out is already a pattern in this repo (`plaidComponent.syncAllActiveItemsInternal` fans out per-item via `ctx.scheduler.runAfter(0, ...)` per W0 Section 8.2).
- Workflow component adds dependency weight. Research (Section 17) will confirm whether it materially improves reliability at MVP scope.
- Interface surface is identical at the tool-call level: the execute step schedules the orchestrator action, returns immediately with a `reversalToken` and `{status: "running", progressQueryId}`. The agent message tells the user the bulk is running and will notify on completion.

### 7.3 Progress visibility

Add a small Ents table `bulkExecutions` (optional, spec decides):

```ts
bulkExecutions: defineEnt({
  proposalId: v.id("agentProposals"),
  totalChunks: v.number(),
  completedChunks: v.number(),
  status: v.union(
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  errorMessage: v.optional(v.string()),
})
  .edge("user")
  .index("by_proposal", ["proposalId"]),
```

Alternative: fold progress into `agentProposals.progressJson` so no new table. Spec picks.

### 7.4 Partial failure

A chunk fails mid-bulk. Options:
- **Abort and reverse** all successfully applied chunks (bulk becomes atomic at the proposal level).
- **Continue** and record the failure; surface a partial-success summary.

MVP: abort and reverse. Predictable. If it proves too rigid under load, followup issue changes policy.

---

## 8. Rate limits

### 8.1 Two-layer bucket

- **Per-user bucket.** Tracks total write proposals per day and total affected rows per day. Default placeholders (research-informed in plan phase): 500 proposals per day, 5000 affected rows per day.
- **Per-thread bucket.** Tracks burst rate: default 20 proposals per minute.
- **Destructive-ops bucket.** Tighter per-user cap: 10 destructive ops per hour (card hard delete, plaid item remove).

### 8.2 Implementation options

Variant A: `@convex-dev/rate-limiter` if its API fits (token bucket, custom resources, TTL). Research task.

Variant B: Custom `rateLimitBuckets` Ents table with token-bucket maintenance in the wrapper. Self-contained; no new dependency.

Tentative: Variant A. Switch to B if the component surface feels wrong.

### 8.3 Error UX

Wrapper returns `{rateLimited: true, scope: "user" | "thread" | "destructive", resetAt: number, retryAfterSeconds: number}` when a bucket is empty. The tool propagates as a tool-result; W3 renders a rate-limit banner via `ToolResultRenderer`; W1 shows it inline.

### 8.4 Read vs write

Read tools are not rate-limited at W5. They may get a separate bucket in W2, out of scope here.

---

## 9. First-turn-read-before-write enforcement

### 9.1 Contract

W2 exposes `agentThreads.readCallCount: v.number()`. Every read tool increments it by one inside W2's tool wrapper. W5's write wrapper checks `readCallCount >= 1` before running any handler and throws `READ_REQUIRED_BEFORE_WRITE` if not.

### 9.2 Applies to resumed threads too?

Yes, per master prompt Section 3 spirit. Every thread must have at least one read before any write, regardless of session. If a user resumes an old thread, the counter survives because it lives on `agentThreads`.

### 9.3 Adversarial-prompt mitigation

This rule is a floor, not a ceiling. Destructive tools additionally require `confirmDestructive: true` set in execute args (Section 3.4). Rate limits on destructive ops add a third layer. All three must be breached for an adversarial chain to succeed.

---

## 10. Cascades on card operations

### 10.1 Current state

`creditCards.remove` (soft): sets `isActive = false`. No cascade.
`creditCards.hardDelete`: `card.delete()`. Ents does not cascade edges by default; `walletCards`, `statementSnapshots`, `promoRates`, `installmentPlans` become orphaned references.

### 10.2 W5 policy for hard delete

The agent tool `propose_card_hard_delete` (if included in MVP) gates execute on:

- Precondition 1: `card.isActive === false`. User must soft-delete first.
- Precondition 2: no active `promoRates` (`promoRate.creditCardId === cardId && promoRate.isActive === true`).
- Precondition 3: no active `installmentPlans` (same shape).
- Precondition 4: user passes `confirmDestructive: true`.

If any precondition fails, execute rejects with an explanatory error surfaced through the tool-result to chat.

Open question (Section 14): should hard delete be in MVP at all, given the soft-delete already removes the card from the UI? Tentative: out of MVP, keep direct-UI `hardDelete` only (no agent tool).

### 10.3 `transactionOverlays` and deleted cards

Overlays reference `plaidTransactionId` (the Plaid string ID), not `creditCardId`. A hard-deleted card does not orphan overlays; overlays remain linked to their (now orphaned) Plaid transactions. This is correct: the user may still want their notes and category overrides even after deleting the card from SmartPockets.

### 10.4 Soft delete is idempotent

Already idempotent: `card.patch({ isActive: false })` with `isActive` already false is a no-op.

---

## 11. Mutation catalog (MVP)

Scoped to master prompt Section 8 W5 "Supported mutation types." Each entry lists tool name, affected entity, rate-limit bucket.

### 11.1 Transactions (overlay-backed)

| Tool | Entity | Bucket |
|---|---|---|
| `propose_transaction_category_update` | `transactionOverlays.userCategory` | per-user, per-thread |
| `propose_bulk_transaction_category_update` | N x `transactionOverlays.userCategory` | per-user, per-thread; bulk-scope bucket |
| `propose_transaction_tags_update` | `transactionOverlays.tags` (new field) | per-user, per-thread |
| `propose_transaction_notes_update` | `transactionOverlays.notes` | per-user, per-thread |
| `propose_transaction_review` | `transactionOverlays.isReviewed + reviewedAt` | per-user, per-thread |
| `propose_transaction_hide` | `transactionOverlays.isHidden` | per-user, per-thread |
| `propose_transaction_split` | `transactionOverlays.splits` (new field) | per-user, per-thread |
| `propose_transaction_merge_duplicates` | N overlays: one primary, N-1 children | per-user, per-thread |
| `propose_transaction_delete` | `transactionOverlays.isHidden = true` with "deleted" semantic | per-user, per-thread |

### 11.2 Credit cards

| Tool | Entity | Bucket |
|---|---|---|
| `propose_card_nickname_update` | `creditCards.displayName` | per-user, per-thread |
| `propose_card_primary_flag_update` | `creditCards.isPrimary` (new field, at most one per user) | per-user, per-thread |
| `propose_card_apr_override` | `creditCards.userOverrides.aprs[index]` | per-user, per-thread |
| `propose_card_provider_dashboard_url_update` | `creditCards.userOverrides.providerDashboardUrl` | per-user, per-thread |

Not included at MVP (direct-UI only):
- `toggleLock` / `toggleAutoPay` (single-click UI actions; too low-stakes for propose/confirm).
- `setOverride` for `officialName` / `accountName` / `company` (handled by the Figma-style inline editor already in `InlineEditableField.tsx`).
- `clearOverride` / `clearAprOverride` (reset-to-Plaid operations; out of scope for MVP agent).
- `create` (manual card entry; no agent use case at MVP).
- `update` (generic update; superseded by more specific tools above).
- `remove` / `hardDelete` (open question; see Section 14.6).

### 11.3 Promos (SmartPockets-owned)

| Tool | Entity |
|---|---|
| `propose_promo_create` | `promoRates` insert with `isManual: true` |
| `propose_promo_update` | `promoRates` patch |
| `propose_promo_delete` | `promoRates.isActive = false` |

Bucket: per-user, per-thread. No bulk variant at MVP.

### 11.4 Installment plans (SmartPockets-owned)

| Tool | Entity |
|---|---|
| `propose_installment_plan_create` | `installmentPlans` insert |
| `propose_installment_plan_update` | `installmentPlans` patch |
| `propose_installment_plan_delete` | `installmentPlans.isActive = false` |

Bucket: per-user, per-thread.

### 11.5 Reminders (new table, W5 owns)

| Tool | Entity |
|---|---|
| `propose_reminder_create` | `reminders` insert |
| `propose_reminder_update` | `reminders` patch |
| `propose_reminder_delete` | `reminders.dismissedAt = now` |

Bucket: per-user, per-thread.

### 11.6 Plaid item (W4-proxied)

| Tool | Entity | Notes |
|---|---|---|
| `propose_plaid_item_resync` | Triggers W4 action | Destructive-ops bucket; undo is no-op |
| `propose_plaid_item_remove` | Triggers W4 action | Destructive-ops bucket; `confirmDestructive` required; undo is no-op |

W5 tools do not call Plaid directly. They invoke W4-exposed actions via `ctx.scheduler.runAfter(0, internal.plaidComponent.<action>, args)` and record the audit row referencing the scheduled-action ID.

---

## 12. Schema additions (W5-owned)

Diff against [packages/backend/convex/schema.ts](packages/backend/convex/schema.ts):

### 12.1 `creditCards` additions

```ts
// Inside defineEnt({...}):
isPrimary: v.optional(v.boolean()),
```

Invariant enforced by `propose_card_primary_flag_update`: at most one `creditCards` row per `userId` has `isPrimary === true`. Execute mutation runs two patches atomically:

1. Patch old primary to `isPrimary: undefined`.
2. Patch new primary to `isPrimary: true`.

Both patches happen inside the same Convex mutation, so the invariant holds transactionally.

### 12.2 `transactionOverlays` additions

```ts
// Inside defineEnt({...}):
tags: v.optional(v.array(v.string())),
splits: v.optional(v.array(v.object({
  amount: v.number(),
  category: v.optional(v.string()),
  merchantName: v.optional(v.string()),
  notes: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
}))),
duplicateOfPlaidTransactionId: v.optional(v.string()),
```

Invariants:
- `splits` sum equals the parent `plaidTransactions.amount` in absolute value (enforced by propose's validation, not schema).
- `duplicateOfPlaidTransactionId` may be set only when `isHidden === true`.

### 12.3 New table: `reminders`

```ts
reminders: defineEnt({
  relatedResourceType: v.union(
    v.literal("creditCard"),
    v.literal("promoRate"),
    v.literal("installmentPlan"),
    v.literal("transaction"),
    v.literal("none"),
  ),
  relatedResourceId: v.optional(v.string()),
  triggerDate: v.string(),       // YYYY-MM-DD
  triggerLeadDays: v.optional(v.number()), // for promo-based reminders
  message: v.string(),
  channels: v.array(v.union(
    v.literal("chat"),
    v.literal("email"),
  )),
  dismissedAt: v.optional(v.number()),
  createdByAgent: v.boolean(),
})
  .edge("user")
  .index("by_user_trigger", ["userId", "triggerDate"])
  .index("by_user_dismissed", ["userId", "dismissedAt"]),
```

### 12.4 New table: `auditLog`

```ts
auditLog: defineEnt({
  threadId: v.id("agentThreads"),        // W2 type; cross-module edge via id-ref
  proposalId: v.id("agentProposals"),    // W2 type
  toolName: v.string(),
  inputArgsJson: v.string(),
  affectedIdsJson: v.string(),           // JSON array of strings
  executedAt: v.number(),
  reversalPayloadJson: v.string(),
  reversedAt: v.optional(v.number()),
  reversalOfAuditId: v.optional(v.id("auditLog")),
  chunkIndex: v.optional(v.number()),    // for bulk: chunk ordinal
  chunkCount: v.optional(v.number()),    // total chunks in this proposal
})
  .edge("user")
  .index("by_user_executedAt", ["userId", "executedAt"])
  .index("by_proposal", ["proposalId"])
  .index("by_reversalOf", ["reversalOfAuditId"]),
```

Open design point: should `threadId` and `proposalId` be Ents edges (`.edge("agentThread")`) or plain id-refs? Depends on whether they are in the same `defineEntSchema` block. If W2's thread tables live in the same schema.ts, use edges. Spec decides once W2 lands.

### 12.5 Optional table: `bulkExecutions`

See Section 7.3. Spec decides whether to add or fold into `agentProposals`.

### 12.6 Optional table: `rateLimitBuckets`

Used if W5 elects Variant B of Section 8.2. Spec decides after research.

---

## 13. Contract requests

### 13.1 W2 must expose

1. Ents tables `agentThreads`, `agentMessages`, `agentProposals`, `agentUsage`, `promptVersions` (already in W2's brief).
2. `agentThreads.readCallCount: v.number()`, incremented by W2's read-tool wrapper on every read-tool invocation.
3. Internal mutations in `packages/backend/convex/agent/proposals.ts`:
   - `internal.agent.proposals.create({toolName, inputArgsJson, affectedIdsJson, previewPayloadJson, requiresDestructiveConfirmation}) -> Id<"agentProposals">`
   - `internal.agent.proposals.markConfirmed(proposalId)`
   - `internal.agent.proposals.markExecuted(proposalId, auditLogId)`
   - `internal.agent.proposals.markCancelled(proposalId, reason: string)`
   - `internal.agent.proposals.markTimedOut(proposalId)`
4. Public queries:
   - `api.agent.proposals.getForThread(threadId)`
   - `api.agent.proposals.getById(proposalId)`
5. Scheduled cron:
   - `internal.agent.proposals.timeoutExpired` fired every 5 minutes; transitions `proposed` or `awaiting_confirmation` rows older than N minutes to `timed_out`.
6. Tool registry API:
   - `agent.registerTool({name, kind: "read" | "propose" | "execute" | "undo" | "cancel", inputSchema: z.ZodType, description: string, handler})`
   - W5 tools register with `kind: "propose"` or `"execute"`; read tools register with `"read"` and increment `readCallCount`.

If W2's plan differs, W5's spec converges to W2's shape (W5 ships after W2 by the dependency graph).

### 13.2 W3 must expose

1. `ProposalConfirmCard` component accepting props: `{proposalId, toolName, previewPayload, affectedCount, sampleBefore[], sampleAfter[], rateLimitStatus?, destructive?: boolean}`.
2. Confirm handler calls `execute_confirmed_proposal(proposalId)` (for destructive, sets `confirmDestructive: true` after a second modal).
3. Cancel handler calls `cancel_proposal(proposalId, reason)` (W5 or W2 exposes; tentatively W2 since it owns the state machine).

### 13.3 W4 must expose

1. `internal.plaidComponent.triggerManualResync(itemId, userId)` idempotent action.
2. `internal.plaidComponent.removeItemHard(itemId, userId, confirmationToken)` action. Token is a UUID passed in from the destructive-confirm modal; action verifies against a short-lived cache.
3. Both actions emit a result payload describing what happened (resynced N transactions, removed M accounts) that the W5 tool records in its audit summary.

---

## 14. Open questions for Eric before `/plan`

1. **Primary-flag semantics:** is `isPrimary` used elsewhere in the UI today? If yes, W5 needs to audit the display sites before adding the field. If no, the field is pure metadata the agent writes.
2. **Transaction "delete" vs "hide":** same underlying op under two names, or different? Tentative: same op. `propose_transaction_delete` sets `isHidden = true` and records a `deleteReason` field on the overlay for UI differentiation. Alternatively, drop `propose_transaction_delete` from MVP and rely on hide only.
3. **Transaction split UX:** does the agent compute splits from a natural-language instruction and the user edits them in `ProposalConfirmCard`? Or does the UI ask the user to fill a form first, then the agent proposes? Tentative: agent drafts splits, UI allows edit before confirm.
4. **Merge-duplicate arity:** N-way (one primary, N-1 hidden) or strict 2-way? Tentative: N-way.
5. **Reminders channels at MVP:** chat-only, or chat and email both supported at the schema level with W6 deciding which fire? Tentative: both channels defined in schema; MVP emits to chat only; email gated by W6.
6. **Card hard delete in MVP agent surface:** include `propose_card_hard_delete` or leave hard delete to direct UI only? Tentative: exclude from MVP agent surface.
7. **Transaction tags shape:** flat array of strings vs enum of allowed tags? Tentative: flat array of strings; tag vocabulary is user-driven.
8. **Idempotency key surface:** should execute accept an explicit `idempotencyKey` arg, or is `proposalId` itself sufficient (one proposal = one execute = one audit row)? Tentative: `proposalId` is the idempotency key; execute on an already-executed proposal returns the original `reversalToken`.
9. **Rate-limit exact numbers:** 500 proposals/day, 5000 affected rows/day, 20 proposals/minute, 10 destructive ops/hour. Research in plan phase to validate against cost model. Placeholders only.
10. **Reversal token format:** `rev_<auditLogId>` opaque string to keep internal IDs out of chat context? Or plain `auditLogId`? Tentative: opaque prefix to prevent ID-guessing attacks via chat history.
11. **Undo audit row's `reversalPayloadJson`:** empty object, or the forward-direction patch data (so undo-of-undo = redo)? Tentative: empty object; redo via re-proposal only at MVP.
12. **Bulk partial-failure policy:** abort-and-reverse vs continue-with-partial-success. Tentative: abort-and-reverse.

Eric, please scan these and indicate which (if any) need redirection. The plan phase will bake each tentative decision into `specs/W5-mutations.md` and become the contract for execution.

---

## 15. Risks and mitigations

### 15.1 Dependency on W2 and W4

Both workstreams are in brainstorm or plan phase. Contract shifts impact W5 directly. Mitigation: Section 13 contract requests become explicit acceptance criteria on W2 and W4 plans. W5's `/plan` task list blocks on the merged PRs that land those contracts.

### 15.2 Undo window and bulk chunking collision

A bulk that takes > 10 min to finish may have chunks that are out-of-window at undo time. Mitigation: per-chunk audit rows with per-chunk `executedAt` (Section 6.3). Alternative is to cap bulk scope or increase the window; deferred.

### 15.3 Direct-UI edits corrupt undo state

Because MVP audit log scopes only agent writes, a direct-UI edit between execute and undo is invisible to the audit chain. Undo will stomp the direct edit silently (no audit row for the direct edit exists). Mitigation: agent's post-undo summary notes that fields may have been edited in the UI since. Followup issue covers direct-UI retrofit.

### 15.4 Rate-limit evasion via thread churn

Thread-scoped buckets are burst protection only. Per-user buckets apply across threads. Destructive-op bucket applies per user. Mitigation: in-design already.

### 15.5 Adversarial proposal confirmation

User is tricked into clicking Confirm on a malicious proposal. Mitigation: destructive-action gating (Section 3.4), first-turn-read-before-write (Section 9), rate limits (Section 8), and `ProposalConfirmCard` rendering (W3) that shows the full diff before confirm. Fourth mitigation is out of W5 scope: W1 should disable keyboard quick-confirm (Enter shortcut) for destructive proposals.

### 15.6 Cross-user contamination via thread IDs

Mitigation: wrapper verifies `proposal.userId === viewer._id` and `proposal.threadId === args.threadId` on every execute. Ents schema ensures `userId` derivation is authoritative.

### 15.7 Idempotency on network retry

Client retries execute after a transient network failure. Mitigation: execute checks `proposal.state`. If `executed`, re-returns the original reversal token. If `confirmed` but no audit row, continues execution. If `cancelled` or `timed_out`, rejects.

### 15.8 Concurrent confirm from two devices

Two clients both click Confirm. Mitigation: state transition from `awaiting_confirmation` to `confirmed` must be a Convex mutation guaranteed atomic. Second click finds state `confirmed` (or further) and becomes a no-op.

### 15.9 Cascade orphans

Deleting a card while a pending proposal references its transactions. Mitigation: execute re-fetches ownership and existence; missing rows produce partial-success summary; no crash.

### 15.10 Schema drift on W2 edges

If W5 uses `.edge("agentThread")` on `auditLog` and W2 ships `agentThreads` in a separate module, Ents may not resolve the edge. Mitigation: coordinate in W2's spec so `agentThreads` is defined in the same `packages/backend/convex/schema.ts` file. If constraint forces split, fall back to id-refs with application-level joins.

---

## 16. Edge cases and failure modes

### 16.1 Proposal created, user abandons browser

Proposal stays `proposed` or `awaiting_confirmation` forever. Mitigation: W2's scheduled cleanup (see 13.1 item 5) transitions stale rows to `timed_out` after N minutes.

### 16.2 Proposal executed on wrong thread

Client posts execute with `proposalId` from thread A while viewing thread B. Mitigation: wrapper verifies `proposal.threadId` matches the thread context passed from the agent. Execute arg is `proposalId` only; thread context is inferred from the chat session.

### 16.3 `plaidTransactionId` referenced in proposal is removed by Plaid sync

Plaid transactions can be removed via `/transactions/sync`. If a proposal references a plaid transaction that disappears between propose and execute, the overlay still exists. W5 execute proceeds on the overlay. Orphaned-overlay detection is a W4 concern.

### 16.4 Card soft-deleted mid-proposal

User soft-deletes card A at t=0. Agent has pending proposal to update A's APR override at t=1. Execute re-verifies `card.isActive`. If false, execute rejects. Agent response: "Cannot update APR; card A is no longer active."

### 16.5 Undo of a reminder delete that was subsequently re-created

Reminder R created by user at t=0. Agent `propose_reminder_delete(R)` at t=10, executed at t=11. User manually (UI) re-creates reminder R' with same fields at t=12. User says "undo" at t=13. Undo re-activates R (original, `isActive: true`). Now two reminders with same content exist. Mitigation: acceptable; user can dismiss one via another turn. Dedup logic is out of W5 scope.

### 16.6 Bulk execute interrupted by Convex deploy

Chunks 1 through 5 complete; chunk 6 onward never runs because deploy kills the action. Mitigation: on next scheduler tick after deploy, a recovery job picks up `bulkExecutions` in `running` state older than N seconds and resumes. If recovery is out of MVP, abort-and-reverse on startup becomes the fallback. Spec decides.

### 16.7 Agent calls `undo_mutation(reversalToken)` for a token not issued in the current thread

Wrapper verifies `audit.threadId` matches current thread or `audit.userId === viewer._id` (cross-thread undo is allowed same-user, since the audit row belongs to the user). Design question, tentative: allow cross-thread undo within 10 minutes by same user.

### 16.8 Empty bulk (zero affected rows)

Propose returns preview with `affectedCount: 0`. Either agent skips confirmation UI or W3 renders a "no matches" variant. Tentative: propose rejects with "no matches" before creating a proposal row. No audit row.

---

## 17. Research tasks (for `specs/W5-mutations.research.md`)

1. **`@convex-dev/workflow` current API.** Version, retries, step durability semantics, progress-query shape, size-of-state limits. Sources: Convex docs, `convex-dev/workflow` GitHub. Decision input: whether to adopt for bulk chunking (Section 7).
2. **Idempotency patterns in Convex Ents.** Idempotency key in mutation args; scheduled dedup; content-hash approach; natural key upsert pattern. Sources: Convex docs, convex-ents README, Convex discord practices. Decision input: whether `proposalId` alone is sufficient (Section 14.8).
3. **`@convex-dev/rate-limiter` component shape.** Token bucket vs leaky bucket; per-resource bucket definitions; integration with the custom `./functions.ts` wrapper. Sources: Convex docs. Decision input: Variant A vs B of Section 8.2.
4. **Per-mutation reversal-payload size limits.** Convex document size cap (1 MiB) and JSON serialization overhead. Decision input: when does chunking become mandatory for audit rows, not just for execute fan-out (Section 4.3, 7.1).
5. **Ents `.delete()` and edge cascade.** Does `ctx.table("creditCards").getX(id).delete()` cascade to `walletCards`, `statementSnapshots`, `promoRates`, `installmentPlans`? Sources: convex-ents README and source. Decision input: whether Section 10.2 preconditions are sufficient or additional cleanup logic is needed.
6. **Convex mutation-scope vs action-scope transactionality.** Does a Convex mutation see a consistent snapshot across multiple `ctx.table()` calls? Decision input: atomicity of the `propose_card_primary_flag_update` two-patch sequence (Section 12.1).
7. **Vercel AI SDK tool-call metadata.** What metadata the tool-result carries back (execution time, retry count, etc.) so W5 tools can include it in audit rows. Sources: AI SDK docs. Decision input: `auditLog.inputArgsJson` completeness.

---

## 18. Agent delegation plan (for `/plan`)

Per master prompt Section 6, W5 primary agent is Claude Code for the base pattern, Codex for per-tool implementation. Task-level allocation:

- **Claude Code:**
  - `writeTool()` and `executeWriteTool()` wrapper design (multi-file, cross-cutting, auth-sensitive).
  - `auditLog` schema with invariants; reversal-payload-per-tool table (Section 5).
  - Undo semantics and the 10-minute window implementation.
  - Concurrent-confirm and idempotency logic.
  - Bulk orchestrator action (Variant A of Section 7).
  - First-turn-read-before-write enforcement.
  - Destructive-action gating.
  - Cross-review of every Codex PR.
- **Codex:**
  - Per-tool propose/execute handlers (batched 2 to 3 per PR).
  - Reminders CRUD once the table schema lands.
  - Rate-limit wiring (Section 8) once Claude Code picks the component.
  - Test authoring under Claude Code's test plan.
  - Research-doc drafting (running external fetches and structured summaries).

Cross-review rule from master prompt Section 11 applies: Claude Code PRs go to Codex review and vice versa, plus CodeRabbit on everything.

---

## 19. Deliverables for `/plan`

The plan phase produces three files:

- `specs/W5-mutations.md`: authoritative spec. Bakes every tentative decision in Sections 14 and 17. Includes the "Questions This Spec Answered" list required by master prompt Section 10.
- `specs/W5-mutations.plan.md`: task-by-task implementation plan with Plan Handoff Header (master prompt Section 7). Each task tagged Claude Code or Codex. Graphite branch names and commit commands inline. Estimated 10 to 14 atomic tasks.
- `specs/W5-mutations.research.md`: external and local research with citations for the seven research tasks in Section 17.

### 19.1 Task-list sketch for the plan

Not final; `/plan` phase refines. Listed here only to validate scope:

1. Schema additions (auditLog, reminders, `isPrimary`, overlay fields) in one PR. Claude Code.
2. `createProposal` and `executeWriteTool` wrapper scaffolding. Claude Code.
3. `undo_mutation` wrapper with 10-min window. Claude Code.
4. Rate-limit wiring. Codex after Claude Code picks the component.
5. Transaction single-row tools (category, tags, notes, review, hide). Codex.
6. Transaction bulk category update tool + scheduler fan-out. Claude Code for orchestrator, Codex for the tool.
7. Transaction split tool. Codex.
8. Transaction merge-duplicates tool. Codex.
9. Card tools (nickname, primary, APR override, provider URL). Codex.
10. Promo + installment-plan CRUD tools. Codex.
11. Reminder CRUD tools. Codex.
12. Plaid item resync + remove tools (blocks on W4). Claude Code design, Codex impl.
13. First-turn-read-before-write enforcement and destructive-action gating. Claude Code.
14. Test suite (concurrency, idempotency, adversarial, bulk recovery). Codex.

Dependencies: tasks 1 to 3 block tasks 5 onward. Task 4 optional-parallel with 5 to 11. Task 12 blocks on W4's `plaidComponent` exports landing. Tasks 13 and 14 land last.

---

## 20. Next step

Eric reviews this brainstorm. If Sections 0, 1, 2, and 14 look right, invoke `/plan` to produce the authoritative spec plus the plan and research files. Any redirection in Sections 14 gets baked into the spec before the plan.

---

## 21. Reconciliation appendix (2026-04-20)

Cross-spec reconciliation pass closed the following W5 items. Canonical source: [specs/00-contracts.md](00-contracts.md). W5 `/plan` blocks on the shared idempotency spike (§21.7 below).

### 21.1 Proposal table ownership (reconciliation M2, M5, M6, M7)

W5 consumes W2's `agentProposals` and `agentProposalRows` schemas verbatim. W5 §0 assumption 1 already states W2 owns the state machine; reconciliation confirms:

- **9-state enum** is authoritative (see contracts §3). W5 Section 6.1 state machine (`proposed | awaiting_confirmation | confirmed | executed | cancelled | timed_out`) upgrades to the 9-state set with `executing`, `reverted`, `failed` added. W5 execute wrapper transitions through `confirmed → executing → executed` (or `failed`); undo transitions `executed → reverted`.
- **`scope` field** is set by W5's propose wrapper at creation time. Single-row tools write `scope: "single"`; bulk tools write `scope: "bulk"`. Consumed by W3 to pick `ProposalConfirmCard` variant.
- **`@convex-dev/workflow`** is installed by W2's PR. W5's plan cites W2's PR as prerequisite-merged (contracts §11). Variant A of §7.2 remains default path; Variant B (workflow) is available for bulk execute and becomes the recommended path during `/plan` if research shows per-step durability is meaningful at MVP scope.

### 21.2 `reminders` schema (reconciliation M2)

W5 adopts W2's canonical schema (contracts §1.8). Changes from W5 §12.3:

- `relatedResourceType` / `relatedResourceId` remain as in W5.
- `triggerDate: string` and `message: string` (W5 §12.3) are renamed to W2's `dueAt: number` and `title: string` respectively, with W5's `notes` and `channels` preserved.
- `triggerLeadDays`, `createdByAgent`, `dismissedAt` carry over from W5.
- W2 ships the table in its schema PR; W5 CRUD bodies (§11.5) consume.

W5 propose bodies for reminder operations:
- `propose_reminder_create`: inserts `reminders` row with `createdByAgent: true`, `channels: ["chat"]` default (email gated by W6/W7).
- `propose_reminder_delete`: sets `dismissedAt: now`.
- `propose_reminder_update` is implicit via new proposal (no direct-update agent tool at MVP; users edit via UI or re-create).

### 21.3 `readCallCount` enforcement (reconciliation M10)

W2 ships `agentThreads.readCallCount: v.number()` in the schema and increments inside the read-tool wrapper. W5 §9.1 enforcement now compiles against the field directly:

```ts
// Inside executeWriteTool wrapper, before handler runs
const thread = await ctx.table("agentThreads").getX(threadId);
if (thread.readCallCount < 1) {
  throw new ToolError({ code: "first_turn_guard", retryable: false });
}
```

### 21.4 `cancel_proposal` transitions (reconciliation M12)

W2 owns the state-transition mutation. W5 `cancel_proposal` tool handler wraps `internal.agent.proposals.markCancelled` (W2 contract §13.1). W5 does not duplicate the CAS logic.

### 21.5 Reversal token format (reconciliation M19)

Opaque `rev_<base32 of auditLogId>`. W5 Section 14 question 10 is resolved (opaque wins). W5 execute body encodes; `undo_mutation` body decodes. Canonical in contracts §7.

### 21.6 Subscription / anomaly mutations demoted (reconciliation M14)

W6 §7.1 flagged five mutation candidates (`propose_confirm_subscription`, `propose_dismiss_subscription`, `propose_set_subscription_nickname`, `propose_acknowledge_anomaly`, `propose_dismiss_anomaly`). Reconciliation demotes these to **direct UI mutations** (not agent propose/confirm/execute). W5 catalog §11.2 onward does not include them. The agent surfaces them via tool-hint turns (W3 drill-in pattern) that call the direct mutations in W6's `intelligence/` directory. Canonical in contracts §16.

If post-MVP feedback shows users want undo on these single-field updates, they graduate to W5's wrapper in a follow-up milestone.

### 21.7 Idempotency spike blocks `/plan` (reconciliation M4)

W5 `/plan` blocks on [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) Section 4 being populated. Specifically:

- The hash function for `agentProposals.contentHash` (W2 §6.4) is expected to match `emailEvents.idempotencyKey` (W7) for code-reuse. Spike confirms whether to share `packages/backend/convex/agent/hashing.ts` or have distinct utilities.
- The `executeWriteTool` retry guard (W5 Section 15.7) must align with the chosen policy (Strategy A, B, or C per spike §3).

W5 plan-phase can scaffold tasks 1, 2, 3, 13 (schema, wrappers, undo, first-turn guard, destructive gating) while the spike runs, since these do not depend on the spike output. Tasks 4, 5, 7, 8, 14 (rate-limit wiring, bulk orchestrator, tests for concurrency/idempotency) block.

### 21.8 `agentUsage`, `promptVersions`, workflow install

Out of W5 scope. W2 owns all three. W5 cites but does not modify.

### 21.9 Reconciliation table

| ID | Issue | Resolution |
|---|---|---|
| M2 | `reminders` schema three-way conflict | §21.2; adopt W2 canonical. |
| M4 | Idempotency layering | §21.7; spike blocks `/plan` on W5 tasks 4, 5, 7, 8, 14. |
| M5 | Workflow install unowned | §21.1; W2 owns. |
| M6 | `scope` field | §21.1; W5 propose wrapper sets. |
| M7 | Proposal state enum | §21.1; upgrade to W2's 9-state. |
| M10 | `readCallCount` | §21.3; enforce against W2-shipped field. |
| M12 | `cancel_proposal` owner | §21.4; W2 owns transition. |
| M14 | Subscription/anomaly mutations | §21.6; demote to direct UI. |
| M19 | Reversal token | §21.5; opaque `rev_<...>`. |

---

**End of brainstorm.**

# W5: Mutation and Bulk Edit Tools (Spec)

**Milestone:** M3 Agentic Home
**Workstream:** W5 Mutations
**Phase:** Obra Superpowers `/plan` (authoritative spec; required by master prompt §10)
**Author:** Claude
**Date:** 2026-04-20
**Status:** Final. Unblocked by idempotency spike commit at [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4.
**Writing convention:** No em-dashes.

## 0. Overview

W5 delivers the write-path tool set that the SmartPockets agent uses to mutate user data on request. Every agent-initiated mutation flows through a four-step lifecycle: propose, confirm (user clicks in W3's `ProposalConfirmCard`), execute, optionally undo within ten minutes. Every execute writes an `auditLog` row with a reversal payload. Rate limits, first-turn-read-before-write enforcement, and destructive-action gating guard the surface.

MVP scope is six propose tools, one execute tool, one cancel tool, one undo tool, and one execute-style Plaid resync tool (total ten tools, owned by W5). The 14 additional propose tools enumerated in the brainstorm §11 catalog are deferred until post-MVP (contracts §2.4).

Idempotency follows Strategy C-prime: `agentProposals.contentHash` is a unique Ents field; duplicate inserts throw at the database layer; the wrapper catches and returns the existing proposalId. The same `idempotencyKey` hashing utility is shared across W5 and W7 (contracts §10).

## 1. Canonical contracts consumed

Every design decision in this spec cites one of the following as the source of truth:

- [specs/00-contracts.md](00-contracts.md) §1 (agent tables), §1.6 (`agentProposals` with unique `contentHash` and `scope`), §1.8 (`reminders`), §2.2 through §2.5 (tool registry), §3 (9-state proposal machine), §4 (tool envelope), §6 (typed error codes), §7 (opaque reversal token), §8 (`auditLog` schema), §10 (Strategy C-prime), §11 (`@convex-dev/workflow` ownership), §12 (rate-limit buckets), §16 (subscription and anomaly mutations demoted to direct UI).
- [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4 (committed layering strategy; hashing utility signature; TTLs).
- [specs/00-master-prompt.md](00-master-prompt.md) §8 W5 (workstream scope); §3 (MVP scope); §4 (five-layer architecture); §6 (agent delegation).

Upstream dependencies:
- [specs/W2-agent-backend.md](W2-agent-backend.md) for the agent-table schemas, proposal API, tool registry, rate-limit bucket install.
- [specs/W4-plaid-gap-closure.md](W4-plaid-gap-closure.md) for `internal.plaidComponent.triggerManualResync`.

## 2. Goals and non-goals

### 2.1 Goals

1. Deliver a typed, auditable, reversible write surface for the agent.
2. Keep every existing direct UI mutation working unchanged.
3. Make each tool a small file that plugs into a shared wrapper; expand by adding tools, not by touching the wrapper.
4. Guard against adversarial cold-start prompts and replayed-proposal exploits.
5. Provide undo within a ten-minute window for every MVP tool except two non-reversible Plaid operations.

### 2.2 Non-goals (MVP)

- Retrofitting direct UI mutations (for example `toggleLock`, `toggleAutoPay`, `updateDisplayName`, `upsertField`, `toggleReviewed`, `toggleHidden`) into the audit log. Out of scope; logged as a followup.
- Transaction split, merge, tags. Deferred per contracts §2.4.
- Card `isPrimary` flag. Deferred per contracts §2.4.
- Card hard delete via the agent. Direct UI only.
- Installment plan CRUD, promo update, promo delete via the agent. Deferred.
- Subscription and anomaly mutations via the agent. Direct UI only per contracts §16.
- Voice confirmation. Out of MVP entirely (master prompt §3).

### 2.3 Must-not-regress

- Every direct UI mutation in [packages/backend/convex/creditCards/mutations.ts](../packages/backend/convex/creditCards/mutations.ts), [packages/backend/convex/transactionOverlays/mutations.ts](../packages/backend/convex/transactionOverlays/mutations.ts), [packages/backend/convex/promoRates/mutations.ts](../packages/backend/convex/promoRates/mutations.ts), [packages/backend/convex/installmentPlans/mutations.ts](../packages/backend/convex/installmentPlans/mutations.ts) still works with identical semantics.
- `@crowdevelopment/convex-plaid` component stays write-only-by-component. SmartPockets never writes to `plaid:*` tables.
- Every mutation derives `userId` from `ctx.viewerX()` (public mutations) or from the internal arg (internal mutations invoked from actions), never from public-facing args.
- Every mutation verifies ownership (`entity.userId === viewer._id`) before patching.

## 3. Architecture

### 3.1 Five-layer context

W5 lives in layers 2 (agent orchestration, shared with W2) and 3 (tool layer) per master prompt §4. Layer 1 (chat UI) is W1; layer 3 components for agent output are W3; layer 4 (Plaid integration) is W4; layer 5 (email) is W7.

### 3.2 Write-tool wrapper

One shared module at [packages/backend/convex/agent/writeTool.ts](../packages/backend/convex/agent/writeTool.ts) exports three helpers:

- `createProposal(ctx, args)`: called inside every `propose_*` mutation.
- `executeWriteTool(ctx, args, handler)`: called inside `execute_confirmed_proposal`.
- `registerReversal(toolName, handler)`: called at module top-level by each tool file to register its reversal handler in the shared registry.

Plus the single `undo_mutation` entry point that reads the registry.

### 3.3 Idempotency (Strategy C-prime)

Per contracts §10:

- `agentProposals.contentHash` is declared `.field("contentHash", v.string(), { unique: true })`. Duplicate inserts throw.
- The wrapper computes the hash via the shared `idempotencyKey` utility at [packages/backend/convex/notifications/hashing.ts](../packages/backend/convex/notifications/hashing.ts).
- W5's scope values follow `propose_<toolName>`; `threadId` is always set; `ids` is the sorted list of affected row IDs; `cadence` and `dateBucket` are unused.
- The insert-and-catch pattern (contracts §10.2) returns the existing `proposalId` on collision.

Hash input for W5:

```ts
idempotencyKey({
  userId: viewer._id,
  scope: `propose_${toolName}`,
  threadId,
  ids: [...affectedIds].sort(),
});
```

### 3.4 Audit log

One new table `auditLog` owned by W5 per contracts §8. One row per successful execute (or one per chunk for bulk). Undo inserts a second row with `reversalOfAuditId` set and `reversalPayloadJson: "{}"`.

### 3.5 Undo

Per-tool reversal handlers registered at tool-load time. `undo_mutation` takes an opaque `reversalToken` per contracts §7, decodes the audit ID, re-verifies ownership and window, invokes the registered handler, writes the reversal audit row, transitions the proposal state from `executed` to `reverted` (contracts §3).

Stomping semantics: undo restores the prior value from the reversal payload regardless of intervening edits. The agent's post-undo summary warns the user.

### 3.6 Rate limits

Four buckets from contracts §12 enforced inside the wrapper:

- `write_single` (20/minute, burst 5): single-row propose.
- `write_bulk` (5/minute, burst 2): bulk propose.
- `write_expensive` (2/minute, burst 1): execute, undo, and Plaid resync.
- `destructive_ops` (10/hour): additional gate for tools in `DESTRUCTIVE_TOOLS`.

### 3.7 First-turn guard and destructive-action gating

First-turn guard: `agentThreads.readCallCount` must be at least 1 before any `propose_*` runs. Enforced inside `createProposal`.

Destructive-action gating: `execute_confirmed_proposal` checks `DESTRUCTIVE_TOOLS.has(proposal.toolName)`; if so, requires `confirmDestructive: true` in the execute args (passed by W3's confirmation modal after a second click).

## 4. Schema additions (W5 owns)

Per contracts §8.

### 4.1 New table: `auditLog`

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

Invariants:
- Every row has exactly one of: `reversalOfAuditId === undefined` (forward mutation) OR `reversalOfAuditId !== undefined` (undo row).
- For forward rows, `reversalPayloadJson` is non-empty (at minimum `"{}"` signaling no-op reversal).
- For undo rows, `reversalPayloadJson === "{}"` always (undo-of-undo is not supported at MVP).

### 4.2 Tables NOT shipped by W5

- `agentThreads`, `agentMessages`, `agentProposals`, `agentProposalRows`, `agentUsage`, `promptVersions`, `reminders` (W2 owns).

### 4.3 Deferred schema changes (post-MVP)

- `creditCards.isPrimary`.
- `transactionOverlays.tags`, `transactionOverlays.splits`, `transactionOverlays.duplicateOfPlaidTransactionId`.

## 5. Mutation catalog (MVP)

Six propose tools, one execute, one cancel, one undo, one resync. All agent-facing write operations at MVP.

### 5.1 Propose tools

| Tool (registry name) | Hash `scope` field | Affected entity |
|---|---|---|
| `propose_transaction_update` | `propose_transaction_update` | `transactionOverlays` single row |
| `propose_bulk_transaction_update` | `propose_bulk_transaction_update` | `transactionOverlays` N rows |
| `propose_credit_card_metadata_update` | `propose_credit_card_metadata_update` | `creditCards` single row (up to six fields) |
| `propose_manual_promo` | `propose_manual_promo` | `promoRates` single row (insert or update) |
| `propose_reminder_create` | `propose_reminder_create` | `reminders` insert |
| `propose_reminder_delete` | `propose_reminder_delete` | `reminders` patch (`dismissedAt`) |

**Scope interpretation.** Contracts §10.1 documents the scope formula as `propose_${toolName}`. Since every W5 tool name is already `propose_<verb>` (registered in W2's tool registry with that literal name), the `scope` value passed to the hash utility is the tool name itself verbatim, not double-prefixed. The wrapper code therefore uses `scope: args.toolName` rather than `` scope: `propose_${args.toolName}` ``. This keeps registry names and hash scopes consistent and avoids the `propose_propose_*` double-prefix that a literal reading of the contract formula would produce. If Eric prefers the double-prefix as the canonical form, amend the wrapper and this section in a single PR.

### 5.2 Execute, cancel, undo

| Tool | Kind | Purpose |
|---|---|---|
| `execute_confirmed_proposal` | execute | Runs the handler for a confirmed proposal; writes audit row |
| `cancel_proposal` | wrapper around W2 | Transitions `awaiting_confirmation → cancelled`; no W5 body |
| `undo_mutation` | undo | Takes `reversalToken`; runs registered reversal handler |
| `trigger_plaid_resync` | execute-style | No propose; single shot; destructive-ops bucket; no-op undo |

### 5.3 Tool-to-scope mapping for ownership checks

Every tool verifies ownership against the entity it mutates:

| Tool | Ownership check |
|---|---|
| `propose_transaction_update`, `propose_bulk_transaction_update` | Each affected `plaidTransactionId`'s owning `accountId` must map to a `creditCards` row with `userId === viewer._id` |
| `propose_credit_card_metadata_update` | `creditCards.userId === viewer._id` |
| `propose_manual_promo` | `creditCards.userId === viewer._id` for the target card; if updating, `promoRates.userId === viewer._id` and `promoRates.isManual === true` |
| `propose_reminder_create` | `creditCards.userId === viewer._id` (or matching owner for other `relatedResourceType` values); `"none"` skips |
| `propose_reminder_delete` | `reminders.userId === viewer._id` |
| `trigger_plaid_resync` | `plaidItems.userId === viewer._id` via W4's owner query |

## 6. Reversal-payload strategy

Per-tool reversal handlers capture a "before" snapshot during execute. Undo restores the snapshot.

### 6.1 Envelope

```ts
type ReversalPayload = {
  kind: string;               // discriminator keyed on tool name or subtype
  // tool-specific fields below
};
```

Stored as `JSON.stringify(payload)` in `auditLog.reversalPayloadJson`. Zod-parsed by the reversal handler at undo time.

### 6.2 Per-tool reversal shapes

| Tool | `kind` | Payload fields |
|---|---|---|
| `propose_transaction_update` | `"overlay_patch"` | `{ plaidTransactionId, priorFields: { userCategory?, userCategoryDetailed?, notes?, isHidden?, userMerchantName?, userDate?, userTime? } }` |
| `propose_bulk_transaction_update` (per chunk) | `"overlay_patch_bulk"` | `{ updates: Array<{ plaidTransactionId, priorFields: {...} }> }` |
| `propose_credit_card_metadata_update` | `"card_patch"` | `{ cardId, priorDisplayName?, priorUserOverrides?: {...} }` |
| `propose_manual_promo` (create) | `"promo_soft_delete"` | `{ promoRateId }` |
| `propose_manual_promo` (update) | `"promo_restore"` | `{ promoRateId, priorFields: { description?, aprPercentage?, ... } }` |
| `propose_reminder_create` | `"reminder_dismiss"` | `{ reminderId }` |
| `propose_reminder_delete` | `"reminder_undismiss"` | `{ reminderId }` |
| `trigger_plaid_resync` | `"noop"` | `{}` (undo is no-op; summary text explains) |

### 6.3 Why JSON columns

- Reversal payloads are heterogeneous per tool.
- Typing a discriminated union across every tool couples the audit-log schema to the tool catalog; addition of a tool would require schema migration.
- Zod parsing at undo time gives per-tool safety without coupling.

Trade-off: no index-backed structural query on audit payloads. Acceptable at MVP; forensics-grade indexing is a followup.

### 6.4 Size budget

Convex document size cap is 1 MiB. A per-chunk bulk audit row with 500 transaction IDs and short `priorFields` snapshots is ~80 KiB at the 95th percentile, well within the cap.

## 7. Concurrency and idempotency

### 7.1 Two clients confirm the same proposal simultaneously

Proposal state transitions atomically from `awaiting_confirmation` to `confirmed`. Only one client's transition succeeds; the other sees `state === "confirmed"` (if the first has already transitioned) or `state === "executing"` / `"executed"` (later). The wrapper's state check on execute rejects any state other than `confirmed`.

### 7.2 Network retry of execute

Client retries `execute_confirmed_proposal` after a transient failure. Wrapper reads proposal; finds `state === "executed"`; fetches the audit row by `proposalId`; returns the original `reversalToken` without re-running the handler. No duplicate audit row.

### 7.3 Same propose args twice in the same thread

`idempotencyKey` computes identical hash. Second insert throws at the unique-constraint layer. Wrapper catches via `isUniqueConstraintError`, looks up existing proposal by `contentHash`, returns existing `proposalId`. No duplicate `agentProposals` row.

### 7.4 Concurrent `createProposal` calls with the same hash

Both `createProposal` invocations compute the same `contentHash`. Both attempt `insert`. Convex Ents enforces uniqueness at the database transaction commit; one succeeds, the other throws. The thrower catches and fetches; returns the existing proposalId. No race window.

### 7.5 Bulk idempotency

Bulk proposals use `agentProposalRows` per contracts §1.7 for the affected-ID list. A re-propose with the same filter produces identical sorted `ids`; the `contentHash` matches; existing proposal returned. No duplicate row set.

If the filter produces a different set (new transactions synced in between), the hash differs; a new proposal is created. Intended.

## 8. Authorization

### 8.1 Identity

`ctx.viewerX()` inside every public mutation. No public arg carries `userId`. Internal actions that call internal mutations pass `userId` explicitly, verified by the internal mutation against the resource's `userId`.

### 8.2 Thread scope

Propose and execute mutations accept `threadId` from the chat session. Wrapper verifies `proposal.agentThreadId === threadId` and `proposal.userId === viewer._id`.

Undo is cross-thread-tolerant: `undo_mutation` accepts a `reversalToken` without a thread argument and verifies `audit.userId === viewer._id`. A user with two open threads can undo a mutation from thread A while viewing thread B.

### 8.3 Cross-user attacks

All mutations re-verify ownership against the affected entity regardless of propose-time checks. An attacker who obtains another user's `proposalId` string cannot execute it because `proposal.userId !== viewer._id` rejects.

## 9. Cascades

### 9.1 Card deletions

Not a W5 agent surface at MVP. Direct UI `remove` and `hardDelete` remain; see brainstorm §10 for the pre-conditions hard delete would enforce if promoted to the agent surface later.

### 9.2 Promo and installment plan deletions

Not an agent surface at MVP. Direct UI retains the existing soft-delete semantics.

### 9.3 Reminder deletion

`propose_reminder_delete` sets `dismissedAt`. No cascade required; reminders reference resources by ID but do not own them.

### 9.4 Transaction overlay deletion

Not an agent surface at MVP. Overlays are created-or-patched by tool writes; no delete path.

## 10. Error codes and UX

Per contracts §6 typed error enum. W5-emitted codes:

| Code | Cause | Retryable |
|---|---|---|
| `first_turn_guard` | Propose called on a thread with `readCallCount === 0` | No |
| `proposal_invalid_state` | Execute called on a proposal not in `confirmed` state | No |
| `proposal_timed_out` | Proposal aged past `awaitingExpiresAt` before confirm | No |
| `destructive_unconfirmed` | Execute of a `DESTRUCTIVE_TOOLS` member without `confirmDestructive: true` | No |
| `rate_limited` | Bucket empty | Yes, with `retryAfterSeconds` |
| `reversal_token_not_found` | Opaque token decodes but audit row missing or cross-user | No |
| `undo_window_expired` | Undo called past the 10-minute window | No |
| `already_reverted` | Undo called on an already-undone audit row | No |
| `unsupported_reversal` | Registry missing the tool's reversal handler | No (indicates a bug; should never fire in production) |

Propagation: each error throws a `ToolError` whose `.kind` maps one-to-one onto the code. Wrapper rethrows; W2's `buildToolsForAgent` converts to a `ToolEnvelope` with `ok: false` (contracts §4).

## 11. Test strategy

Nine categories, all implemented in Task W5.12:

1. Concurrency: two confirms.
2. Idempotency: retry of execute.
3. Idempotency: same propose twice.
4. Adversarial: first-turn guard.
5. Adversarial: destructive without confirm.
6. Adversarial: cross-user undo.
7. Bulk recovery: mid-workflow crash.
8. Bulk out-of-window undo.
9. Undo under concurrent edits (stomping).

All tests use the `convex-test` harness with mocked `@convex-dev/workflow` step primitives per spike §4.2.

## 12. Rollout plan

1. Ship Task W5.1 (schema). Feature flag off.
2. Ship Tasks W5.2 through W5.11 in Graphite stack order. Feature flag remains off.
3. Ship Task W5.12 tests. Feature flag still off.
4. Enable feature flag for a small set of internal users (Eric plus one other) via a Clerk user list. Monitor `auditLog` writes and `agentProposals` state transitions for 48 hours.
5. Default feature flag on for all users. Close Linear sub-project W5.

Rollback: flip the feature flag off. The agent continues to function without write tools; read tools are unaffected. Existing `auditLog` rows and `agentProposals` rows remain queryable for forensics.

## 13. Post-MVP deferral backlog

Logged in `TODO.md` under a "W5 post-MVP" header after M3 close:

- Transaction split tool and schema (overlay `splits` field).
- Transaction merge tool and schema (overlay `duplicateOfPlaidTransactionId` field).
- Transaction tags tool and schema (overlay `tags` field).
- Card `isPrimary` flag and `propose_card_primary_flag_update` tool.
- Card hard-delete tool with precondition gating.
- Promo update and delete tools.
- Installment plan CRUD tools.
- Subscription and anomaly mutations (graduate from direct-UI to agent if post-MVP user feedback indicates value).
- Direct-UI mutation retrofit into the audit log.
- Per-tool destructive-confirmation UX polish (custom modal copy per tool in W3).

## 14. Open questions that do not block ship

These are small UX or observability choices that can land as micro-PRs post-MVP:

1. Should undo summaries include the affected-count? Tentative yes.
2. Should the wrapper log to the Convex logs on every audit row for observability during the initial roll-out? Tentative yes; turn off after 30 days.
3. Should `get_proposal` (W2 tool) also expose the reversal token string when the proposal is `executed`? Tentative yes; W3 uses this to render a "Undo" button on an executed-proposal card.
4. Error copy for `destructive_unconfirmed`: should it include the specific consequence ("this will permanently remove your bank connection") or generic ("this action cannot be undone")? Tentative: specific per tool, configured alongside the tool registration.

## 15. Questions This Spec Answered

Per master prompt §10, every spec ends with a one-to-one mapping to the "Questions the spec must answer" list from master prompt §8 W5.

### 15.1 Exact proposal schema

Contracts §1.6. `agentProposals` with `toolName`, `argsJson`, `summaryText`, `affectedCount`, `sampleJson`, `scope`, 9-state `state` enum, `awaitingExpiresAt`, `executedAt`, `undoExpiresAt`, `revertedAt`, `workflowId`, `errorJson`, and unique `contentHash`. W2 ships; W5 consumes.

### 15.2 Audit log schema

§4.1 above. New table `auditLog` with `threadId`, `proposalId`, `toolName`, `inputArgsJson`, `affectedIdsJson`, `executedAt`, `reversalPayloadJson`, `reversedAt`, `reversalOfAuditId`, `chunkIndex`, `chunkCount`. Three indexes. Edge to user.

### 15.3 Reversal payload format per mutation type

§6.2 above. Table enumerates payload shape for every MVP tool plus the two no-op cases (`trigger_plaid_resync`, `propose_plaid_item_remove` deferred).

### 15.4 TTL numbers

- Undo window: 10 minutes from `auditLog.executedAt` (also reflected on `agentProposals.undoExpiresAt`).
- Proposal `awaiting_confirmation` TTL: 5 minutes from creation; W2 cron transitions to `timed_out`.
- `agentProposals` retention after terminal state: 30 days for `executed` / `reverted` (for audit), 24 hours for `cancelled` / `timed_out` / `failed`.
- `auditLog` retention: 30 days (after which rows can be archived or deleted by a followup cron; not part of MVP).

### 15.5 Idempotency keys

Strategy C-prime from spike §4.4 and contracts §10. Shared `idempotencyKey` utility at [packages/backend/convex/notifications/hashing.ts](../packages/backend/convex/notifications/hashing.ts). W5 hash input: `{ userId, scope: "propose_<toolName>", threadId, ids: sortedAffected }`. Unique constraint on `agentProposals.contentHash` makes the insert itself the dedup boundary.

### 15.6 Concurrency (same proposal confirmed twice)

§7.1 above. State transition from `awaiting_confirmation` to `confirmed` is atomic (W2 CAS). Second confirm sees non-`awaiting_confirmation` state and is rejected; or transitions further along to `confirmed`/`executing`/`executed` idempotently. Execute on an already-`executed` proposal returns the original `reversalToken`.

### 15.7 Authorization (same user, same thread)

§8 above. `ctx.viewerX()`-derived `viewer._id` is authoritative. Every mutation re-verifies `proposal.userId === viewer._id`; propose and execute additionally verify `proposal.agentThreadId === args.threadId`. Undo is cross-thread-tolerant within same user; cross-user undo rejected.

### 15.8 Cascade rules

§9 above. MVP defers card hard delete, promo delete, installment plan delete from the agent surface, so cascades apply only to direct-UI paths (already in place). `reminders` and `auditLog` require no cascades at MVP.

### 15.9 Optimistic UI behavior

Optimistic UI is a W1 and W3 concern, not W5. W5's contract with W1 and W3:

- Propose returns `proposalId` and preview synchronously. W1 streams the tool-result into the chat.
- W3's `ProposalConfirmCard` subscribes to `api.agent.proposals.get` via cached `useQuery`; re-renders on state transitions `awaiting_confirmation → confirmed → executing → executed | failed | reverted`.
- Execute returns `reversalToken` and `summary` synchronously (for single-row) or `{ status: "running", proposalId }` (for bulk, since the workflow runs asynchronously).
- For bulk, W3 shows a progress state by re-subscribing to `agentProposals.state`; when it transitions to `executed`, the Undo button appears for 10 minutes.

No spec decisions required on W5's side beyond the above contract. W1 and W3 own optimistic rendering choices.

---

**End of authoritative spec.**

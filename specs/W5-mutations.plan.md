# W5: Mutation and Bulk Edit Tools

## Plan Handoff Header

| Field | Value |
|---|---|
| Linear milestone | M3 Agentic Home |
| Linear sub-project | W5 mutations |
| Linear issues | LIN-W5-001 through LIN-W5-012 (one per task; created on plan merge against the M3 Agentic Home sub-project) |
| Recommended primary agent | Claude Code for wrapper, schema, invariants, concurrency reasoning; Codex for per-tool handlers once the wrapper lands |
| Required MCP servers | Convex MCP, Graphite MCP |
| Required read access | None beyond the monorepo |
| Prerequisite plans (must be merged) | W2 PR landing `agentThreads` (with `readCallCount`), `agentMessages`, `agentProposals` (with unique `contentHash`), `agentProposalRows`, `agentUsage`, `promptVersions`, `reminders` schemas; W2 PR landing the internal proposal API (`agent.proposals.create`, `markConfirmed`, `markExecuted`, `markCancelled`, `markTimedOut`, `markReverted`, `getByContentHash`); W2 PR landing `@convex-dev/workflow` and `@convex-dev/rate-limiter` component installs (contracts §11, §12); W4 PR landing `internal.plaidComponent.triggerManualResync` internal action (task W5.10 only) |
| Branch | feat/agentic-home/W5-mutations |
| Graphite stack parent | feat/agentic-home/W2-agent-backend (or `main` after W2 lands) |
| Worktree directory | ~/Developer/smartpockets-W5-mutations |
| Estimated PRs in stack | 12 |
| Review bot | CodeRabbit (mandatory) |
| Rollback plan | Revert via Graphite per PR. Schema additions are additive and all new fields are either on a new table (`auditLog`) or optional, so rollback has zero data-loss risk. A feature flag `AGENT_WRITE_TOOLS_ENABLED` gates the six propose tools for the first week post-ship; flip off to disable agent writes while leaving direct UI paths untouched. |
| Acceptance checklist | See §7 |

---

## 0. Status

**Final plan.** Idempotency spike committed 2026-04-20 (Strategy C-prime) at [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4. Contracts amended same day: §1.6 (unique `contentHash` on `agentProposals`), §9.1 (unique `idempotencyKey` on `emailEvents`), §10 (Strategy C-prime layering plus canonical hash utility at `packages/backend/convex/notifications/hashing.ts`).

All W5 tasks except W5.10 (which blocks on W4) are ready for execution. W5 ships the shared hashing utility as part of Task W5.2; W7 consumes.

Authoritative spec at [specs/W5-mutations.md](W5-mutations.md). Research with citations at [specs/W5-mutations.research.md](W5-mutations.research.md).

---

## 1. Context bootstrap (for fresh agent sessions)

Before starting any W5 task, the agent must:

1. Read [AGENTS.md](../AGENTS.md) and [CLAUDE.md](../CLAUDE.md).
2. Read [specs/W0-existing-state-audit.md](W0-existing-state-audit.md) Sections 10 and 11.
3. Read [specs/00-master-prompt.md](00-master-prompt.md) Sections 1 through 7 and Section 8 W5.
4. Read [specs/00-contracts.md](00-contracts.md) in full. This is the single source of truth.
5. Read [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) §4 for the idempotency decision.
6. Read [specs/W5-mutations.brainstorm.md](W5-mutations.brainstorm.md) including the §21 reconciliation appendix.
7. Read [specs/W5-mutations.md](W5-mutations.md) (authoritative spec).
8. Read [specs/W5-mutations.research.md](W5-mutations.research.md) for citations.
9. Read this file top to bottom.
10. Run `git fetch origin` and confirm the worktree is on the correct branch.
11. Verify Convex MCP and Graphite MCP servers respond.

---

## 2. Scope recap (post-reconciliation)

Per [specs/00-contracts.md](00-contracts.md) §2.2, MVP propose-tool count is **6**:

1. `propose_transaction_update` (single-row overlay update: `userCategory`, `userCategoryDetailed`, `notes`, `isHidden`, `userMerchantName`, `userDate`, `userTime`).
2. `propose_bulk_transaction_update` (bulk variant).
3. `propose_credit_card_metadata_update` (consolidates `displayName`, `userOverrides.officialName`, `userOverrides.accountName`, `userOverrides.company`, `userOverrides.providerDashboardUrl`, `userOverrides.aprs[index]`).
4. `propose_manual_promo` (single tool handling create-or-update of a manual `promoRates` row).
5. `propose_reminder_create`.
6. `propose_reminder_delete`.

Plus these non-propose tools that W5 owns:

7. `execute_confirmed_proposal`.
8. `cancel_proposal` (wrapper; state transition lives in W2 per contracts §3).
9. `undo_mutation`.
10. `trigger_plaid_resync` (execute-style; no propose).

Deferred until post-MVP per contracts §2.4: transaction split/merge/tags, card `isPrimary`, APR override as standalone tool, provider dashboard URL as standalone tool, card hard delete, installment plan CRUD, promo update/delete tools, subscription and anomaly mutations (demoted to direct UI per contracts §16).

---

## 3. Schema changes (W5 owns)

Per contracts §8 and spec [specs/W5-mutations.md](W5-mutations.md) §4.

- New table `auditLog` (task W5.1 PR).

Tables NOT shipped by W5:
- `reminders` (W2 ships per contracts §1.8; W5 CRUD bodies consume).
- `agentThreads`, `agentMessages`, `agentProposals`, `agentProposalRows`, `agentUsage`, `promptVersions` (W2 ships).

Deferred schema changes (post-MVP):
- `creditCards.isPrimary` (no primary-flag tool in MVP).
- `transactionOverlays.tags`, `transactionOverlays.splits`, `transactionOverlays.duplicateOfPlaidTransactionId` (no tags/split/merge tools in MVP).

---

## 4. Task inventory

| # | Task | Agent | Status | Depends on |
|---|---|---|---|---|
| W5.1 | Schema: `auditLog` table | Claude Code | Ready | W2 schema PR merged |
| W5.2 | Wrapper: `createProposal`, `executeWriteTool`, shared `idempotencyKey` utility | Claude Code | Ready | W2 schema PR, W2 proposal API PR, W2 rate-limiter PR |
| W5.3 | Undo: `undo_mutation` with reversal registry | Claude Code | Ready | W5.2 |
| W5.4 | Rate-limit wiring inside wrapper | Codex | Ready | W5.2, W2 rate-limiter PR |
| W5.5 | `propose_transaction_update` and `propose_bulk_transaction_update` handlers | Codex | Ready | W5.2, W5.6 (for bulk) |
| W5.6 | Bulk execute orchestrator (`@convex-dev/workflow`) | Claude Code | Ready | W5.2, W2 workflow PR |
| W5.7 | `propose_credit_card_metadata_update` handler | Codex | Ready | W5.2 |
| W5.8 | `propose_manual_promo` handler | Codex | Ready | W5.2 |
| W5.9 | `propose_reminder_create` and `propose_reminder_delete` handlers | Codex | Ready | W5.2, W2 `reminders` PR |
| W5.10 | `trigger_plaid_resync` tool (execute-style) | Claude Code for design, Codex for impl | **BLOCKED on W4** | W4 `triggerManualResync` PR |
| W5.11 | First-turn-read-before-write guard and destructive-action gating | Claude Code | Ready | W5.2, W2 `agentThreads.readCallCount` field |
| W5.12 | Test suite (concurrency, idempotency, adversarial, bulk recovery) | Codex | Ready | W5.2 through W5.11 (minus W5.10) |

---

## 5. Tasks (detailed)

### Task W5.1: Schema additions (`auditLog`)

**Recommended agent:** Claude Code.
**Rationale:** Single-file schema change, but touches the authoritative Ents surface and must coexist with W2's schema PR landing multiple new tables. Claude Code reviews the cross-PR coexistence.

**Linear issue:** LIN-W5-001.

**Scope:**
- Files touched: [packages/backend/convex/schema.ts](../packages/backend/convex/schema.ts).
- Add `auditLog` Ents definition per contracts §8.
- Add `.edges("auditLog", { ref: true })` to the `users` entity.

**Steps:**
1. Add the `auditLog` Ents definition to `schema.ts`:
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
2. Add `.edges("auditLog", { ref: true })` to the `users` entity definition.
3. Run `bun typecheck` from repo root.
4. Add smoke test at `packages/backend/convex/auditLog.test.ts` that inserts one row via `internalMutation` and asserts readback.

**Test:**
- `bun typecheck` passes across all workspaces.
- `bun dev:backend` boots without schema errors.
- Smoke test passes.

**Commit:**
```bash
gt create feat/agentic-home/W5-schema-additions -m "feat(agent): add auditLog table for W5"
gt submit --stack
```

**Acceptance checklist:**
- [ ] `bun typecheck` passes.
- [ ] Smoke test covers insert plus read.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review (Codex reviews Claude Code output).

---

### Task W5.2: Write-tool wrapper and shared hashing utility

**Recommended agent:** Claude Code.
**Rationale:** Architectural, multi-file, auth-sensitive, cross-cutting. Implements Strategy C-prime from the spike plus the shared hashing utility that W7 also consumes.

**Linear issue:** LIN-W5-002.

**Scope:**
- New file [packages/backend/convex/notifications/hashing.ts](../packages/backend/convex/notifications/hashing.ts): shared `idempotencyKey` function per contracts §10.1. W7 consumes this same utility when it lands its `dispatch*` actions.
- New file [packages/backend/convex/agent/writeTool.ts](../packages/backend/convex/agent/writeTool.ts): `createProposal` and `executeWriteTool` helpers.
- Helper `isUniqueConstraintError(err): boolean` inside `writeTool.ts` (or a small `ents/errors.ts` sibling) that inspects Ents unique-constraint throws.

**Steps:**

1. Create `packages/backend/convex/notifications/hashing.ts`:
   ```ts
   import { createHash } from "node:crypto";

   export function idempotencyKey(input: {
     userId: string;
     scope: string;
     threadId?: string;
     cadence?: number;
     ids?: string[];
     dateBucket?: string;
   }): string {
     const canonical = JSON.stringify({
       u: input.userId,
       s: input.scope,
       t: input.threadId ?? null,
       c: input.cadence ?? null,
       i: input.ids ? [...input.ids].sort() : null,
       d: input.dateBucket ?? null,
     });
     return createHash("sha256").update(canonical).digest("hex");
   }
   ```

2. Create `packages/backend/convex/agent/writeTool.ts`.

3. Implement `createProposal(ctx, args)` per Strategy C-prime (contracts §10.2):
   ```ts
   export async function createProposal(ctx, args: {
     toolName: string;                   // full registry name, already `propose_<verb>`
     argsJson: string;
     summaryText: string;
     affectedCount: number;
     affectedIds: Array<string>;
     sampleJson: string;
     scope: "single" | "bulk";
     threadId: Id<"agentThreads">;
     awaitingExpiresAt: number;
   }): Promise<{ proposalId: Id<"agentProposals">; preview: string }> {
     const viewer = ctx.viewerX();
     // Scope interpretation (see spec §5.1): contracts §10.1 writes the formula as
     // `propose_${toolName}`; because every W5 tool name is already prefixed with
     // `propose_` in the registry, we pass `args.toolName` verbatim and avoid the
     // double-prefix. Spec amendment required if this interpretation is wrong.
     const contentHash = idempotencyKey({
       userId: viewer._id,
       scope: args.toolName,
       threadId: args.threadId,
       ids: [...args.affectedIds].sort(),
     });
     try {
       const proposalId = await ctx.runMutation(
         internal.agent.proposals.create,
         {
           toolName: args.toolName,
           argsJson: args.argsJson,
           summaryText: args.summaryText,
           affectedCount: args.affectedCount,
           sampleJson: args.sampleJson,
           scope: args.scope,
           agentThreadId: args.threadId,
           awaitingExpiresAt: args.awaitingExpiresAt,
           contentHash,
         },
       );
       return { proposalId, preview: args.sampleJson };
     } catch (err) {
       if (isUniqueConstraintError(err)) {
         const existing = await ctx.runQuery(
           internal.agent.proposals.getByContentHash,
           { contentHash },
         );
         if (existing == null) {
           throw new Error("Unique constraint fired but lookup returned null");
         }
         return { proposalId: existing._id, preview: existing.sampleJson };
       }
       throw err;
     }
   }
   ```

4. Implement `executeWriteTool(ctx, args, handler)`:
   - Loads proposal via `ctx.table("agentProposals").getX(args.proposalId)`.
   - Verifies `proposal.state === "confirmed"` (throw `proposal_invalid_state` per contracts §6 otherwise).
   - Verifies `proposal.agentThreadId === args.threadId`.
   - Verifies `proposal.userId === viewer._id`.
   - Calls rate-limit gate (see Task W5.4 for the bucket and wiring).
   - Calls `ctx.runMutation(internal.agent.proposals.markExecuting, { proposalId })`.
   - Invokes handler inside the execute mutation.
   - Inserts an `auditLog` row with `reversalPayloadJson = JSON.stringify(handler.reversalPayload)`.
   - On handler success: `internal.agent.proposals.markExecuted({ proposalId, auditLogId, undoExpiresAt: now + 10 * 60 * 1000 })`.
   - On handler throw: `internal.agent.proposals.markFailed({ proposalId, errorJson })`, no audit row written.
   - Encodes reversal token: `rev_` plus lowercase base32 of `auditLogId`. Use `node:crypto` or a small inline base32 helper.
   - Returns `{ reversalToken, summary }`.

5. Implement `isUniqueConstraintError(err)`:
   ```ts
   export function isUniqueConstraintError(err: unknown): boolean {
     if (!(err instanceof Error)) return false;
     return err.message.includes("UniqueConstraintError")
       || err.message.includes("unique constraint")
       || err.message.includes("Uniqueness");
   }
   ```
   (Exact Ents error-class check: confirm at implementation time by reading the convex-ents source.)

6. Unit tests at `packages/backend/convex/agent/writeTool.test.ts` covering:
   - `createProposal` happy path: inserts a new row with the computed hash.
   - `createProposal` duplicate-hash path: second call returns existing proposalId.
   - `executeWriteTool` invalid state: rejects.
   - `executeWriteTool` thread mismatch: rejects.
   - `executeWriteTool` user mismatch: rejects.
   - `executeWriteTool` happy path: audit row written, proposal transitions to `executed`, reversal token decodes back to `auditLogId`.
   - `executeWriteTool` handler throw: proposal transitions to `failed`, no audit row.

7. Unit tests at `packages/backend/convex/notifications/hashing.test.ts` covering:
   - Stable output for equal-by-value input (including sorted `ids`).
   - Different output for different `threadId`.
   - Different output for different `scope`.
   - `ids` sort behavior (input `["b","a"]` produces same hash as `["a","b"]`).

**Test:**
- `bun typecheck` passes.
- All unit tests pass.
- Reversal token round-trip: encode then decode yields the original `auditLogId`.

**Commit:**
```bash
gt create feat/agentic-home/W5-wrapper -m "feat(agent): add writeTool wrapper and shared idempotencyKey utility"
gt submit --stack
```

**Acceptance checklist:**
- [ ] `bun typecheck` passes.
- [ ] Unit tests cover the happy path, both duplicate-hash paths, and every reject path.
- [ ] Hashing utility is shared: W7 can import and use without modification.
- [ ] No `TODO` markers left in the wrapper source.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review.

---

### Task W5.3: Undo wrapper with reversal registry

**Recommended agent:** Claude Code.
**Rationale:** Concurrency reasoning, per-field snapshot semantics, window enforcement, cross-user ownership re-verification.

**Linear issue:** LIN-W5-003.

**Scope:**
- Extend `packages/backend/convex/agent/writeTool.ts` with `undo_mutation`.
- Reversal registry: in-memory map from `toolName` to reversal handler. Populated by per-tool tasks (W5.5, W5.7, W5.8, W5.9) that import `registerReversal`.

**Preconditions:**
- Task W5.2 merged.

**Steps:**

1. Declare the registry:
   ```ts
   type ReversalHandler = (
     ctx: MutationCtx,
     audit: Ent<"auditLog">,
   ) => Promise<{ summary: string }>;

   const reversalRegistry = new Map<string, ReversalHandler>();
   export function registerReversal(toolName: string, handler: ReversalHandler) {
     reversalRegistry.set(toolName, handler);
   }
   ```

2. Implement `undo_mutation`:
   - Zod input: `{ reversalToken: string }`.
   - Decode `reversalToken`: verify `rev_` prefix; base32-decode to `auditLogId`.
   - Load audit row; throw `reversal_token_not_found` on null.
   - Verify `audit.userId === viewer._id`.
   - Verify `(Date.now() - audit.executedAt) < 10 * 60 * 1000`; throw `undo_window_expired` otherwise.
   - Verify `audit.reversedAt === undefined`; throw `already_reverted` otherwise.
   - Verify proposal state is `executed` (not already `reverted` or `failed`).
   - Look up `reversalRegistry.get(audit.toolName)`; throw `unsupported_reversal` if missing.
   - Invoke handler within the undo mutation.
   - Patch audit row: `reversedAt: Date.now()`.
   - Insert a new audit row with `reversalOfAuditId: audit._id`, `reversalPayloadJson: "{}"` (undo-of-undo is not supported at MVP), summary from the handler.
   - Call `internal.agent.proposals.markReverted({ proposalId })` (contracts §3).
   - Return `{ summary }`.

3. Unit tests covering: invalid token format, expired window, already-reverted, cross-user undo attempt, unsupported tool name, happy path.

**Test:**
- `bun typecheck` passes.
- All reject paths and happy path covered.
- Original audit row's `reversedAt` set; new audit row with `reversalOfAuditId` created.
- Proposal state transitions from `executed` to `reverted`.

**Commit:**
```bash
gt create feat/agentic-home/W5-undo -m "feat(agent): add undo_mutation with reversal registry"
gt submit --stack
```

**Acceptance checklist:**
- [ ] `bun typecheck` passes.
- [ ] All reject paths and happy path covered by unit tests.
- [ ] Reversal registry is exported for per-tool registration.
- [ ] Proposal state transition verified against W2's 9-state enum.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review.

---

### Task W5.4: Rate-limit wiring inside the wrapper

**Recommended agent:** Codex.
**Rationale:** Well-specified by contracts §12. Buckets and rates are fixed; the wiring is mechanical once the component API is in hand.

**Linear issue:** LIN-W5-004.

**Preconditions:**
- Task W5.2 merged.
- W2 PR landing `@convex-dev/rate-limiter` component install.

**Scope:**
- Wire the component's bucket-check call into `createProposal` (`write_single` or `write_bulk` based on `scope`) and `executeWriteTool` (`write_expensive`).
- Destructive-ops sub-bucket (10/hour per user) enforced on top of `write_expensive` for tools in `DESTRUCTIVE_TOOLS`. Implement as a second bucket check gated by `DESTRUCTIVE_TOOLS.has(toolName)`.

**Steps:**

1. Import the rate-limiter component client: `import { rateLimiter } from "./rateLimiter"` (exact path per W2's install).

2. Define buckets in `packages/backend/convex/agent/rateLimitBuckets.ts`:
   ```ts
   export const writeSingle = rateLimiter.defineBucket("write_single", { rate: 20, period: "minute", capacity: 5 });
   export const writeBulk = rateLimiter.defineBucket("write_bulk", { rate: 5, period: "minute", capacity: 2 });
   export const writeExpensive = rateLimiter.defineBucket("write_expensive", { rate: 2, period: "minute", capacity: 1 });
   export const destructiveOps = rateLimiter.defineBucket("destructive_ops", { rate: 10, period: "hour", capacity: 3 });
   ```
   (Exact component API: confirm at implementation time against the installed version.)

3. Inside `createProposal`, before the insert: `await writeSingle.limit({ key: userId })` if `scope === "single"` else `await writeBulk.limit({ key: userId })`. On rejection, throw `rate_limited` with the retry-after value (contracts §6 error code).

4. Inside `executeWriteTool`, before the handler: `await writeExpensive.limit({ key: userId })`. If `DESTRUCTIVE_TOOLS.has(proposal.toolName)`, also `await destructiveOps.limit({ key: userId })`.

5. Unit tests:
   - Single-tool propose path respects `write_single`.
   - Bulk-tool propose path respects `write_bulk`.
   - Execute path respects `write_expensive`.
   - Destructive-op execute respects both `write_expensive` and `destructive_ops`.
   - Rate-limit throw propagates as `AgentError { kind: "rate_limited", retryAfterSeconds }` per contracts §6.

**Test:**
- `bun typecheck` passes.
- Unit tests validate every bucket check at the right call site.

**Commit:**
```bash
gt create feat/agentic-home/W5-rate-limit -m "feat(agent): wire rate-limit buckets into write tool wrapper"
gt submit --stack
```

**Acceptance checklist:**
- [ ] `bun typecheck` passes.
- [ ] Buckets match contracts §12 rates and capacities exactly.
- [ ] Destructive-ops sub-bucket applied only for tools in the set.
- [ ] Error propagation aligned with contracts §6 typed error codes.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review.

---

### Task W5.5: `propose_transaction_update` and `propose_bulk_transaction_update`

**Recommended agent:** Codex.
**Rationale:** Well-specified once the wrapper is stable. Follows the pattern.

**Linear issue:** LIN-W5-005.

**Preconditions:**
- Task W5.2, W5.4 merged.
- Task W5.6 merged (for bulk).

**Scope:**
- New file [packages/backend/convex/agent/tools/proposeTransactionUpdate.ts](../packages/backend/convex/agent/tools/proposeTransactionUpdate.ts).
- New file [packages/backend/convex/agent/tools/proposeBulkTransactionUpdate.ts](../packages/backend/convex/agent/tools/proposeBulkTransactionUpdate.ts).
- Zod input schemas registered with W2's tool registry.
- Execute bodies plus reversal-handler registrations.

**Steps:**

1. `propose_transaction_update`:
   - Zod input: `{ plaidTransactionId: string, updates: { userCategory?: string|null, userCategoryDetailed?: string|null, notes?: string|null, isHidden?: boolean, userMerchantName?: string|null, userDate?: string|null, userTime?: string|null } }`.
   - Propose body: reads the current overlay row (or `null`), computes per-field before snapshot, calls `createProposal({ toolName: "propose_transaction_update", scope: "single", affectedIds: [plaidTransactionId], ...})`. Returns `{ proposalId, preview: { before, after } }`.
   - Execute body: registered to `toolName: "propose_transaction_update"`. Upserts the overlay row per-field; builds reversal payload `{ plaidTransactionId, priorFields: { ... } }`.
   - Reversal body: patches the overlay back to `priorFields`.

2. `propose_bulk_transaction_update`:
   - Zod input: `{ filter: { merchantNameContains?: string, userCategory?: string, dateRange?: { from: string, to: string } }, updates: { ...same as single } }`.
   - Propose body: resolves affected `plaidTransactionId` list from `plaid:plaidTransactions` + `transactionOverlays` (via component query), writes each to `agentProposalRows` (contracts §1.7), computes `sample-first-5` plus `sample-last-5`, calls `createProposal({ scope: "bulk", affectedIds: [...sortedIds], ...})`.
   - Execute body: schedules the bulk orchestrator action from Task W5.6 with `proposalId`.
   - Reversal body: registered post-execute. Queries `auditLog` rows with the same `proposalId` (chunked), loops each chunk's reversal payload, patches overlays back.

3. Ownership verification inside each propose and execute body: reject `plaidTransactionId` values whose owning card does not belong to `viewer._id`. Bulk-scan: before accepting the bulk proposal, verify every affected transaction's card belongs to viewer; drop mismatches with an explanation in the proposal preview.

4. Unit tests:
   - Single happy path: propose, execute, undo.
   - Single cross-user: propose rejected.
   - Bulk small (10 rows): propose, execute, undo.
   - Bulk empty match: propose rejected with `affectedCount === 0` error.
   - Dedup: same content hash returns existing proposalId.

**Test:**
- `bun typecheck` passes.
- All unit tests pass.
- Bulk ownership filter drops mismatches cleanly.

**Commit:**
```bash
gt create feat/agentic-home/W5-transaction-tools -m "feat(agent): add propose_transaction_update and bulk variant"
gt submit --stack
```

**Acceptance checklist:**
- [ ] `bun typecheck` passes.
- [ ] Unit tests cover single, bulk, cross-user rejection, empty match, dedup.
- [ ] Reversal handlers registered via `registerReversal("propose_transaction_update", ...)`.
- [ ] Tool registered with W2's tool registry at import time.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review.

---

### Task W5.6: Bulk execute orchestrator

**Recommended agent:** Claude Code.
**Rationale:** Durable-workflow integration, chunking, partial-failure policy. Benefits from cross-file architectural reasoning.

**Linear issue:** LIN-W5-006.

**Preconditions:**
- Task W5.2 merged.
- W2 PR landing `@convex-dev/workflow` component install.
- Idempotency spike committed (it is).

**Design choice:** **Variant B** (`@convex-dev/workflow`) adopted, superseding the brainstorm §7 tentative Variant A. Spike §4.2 confirmed workflow mutation steps offer exactly-once semantics via the workflow journal; action steps are at-least-once and must be idempotent. This gives us resumability after Convex redeploy with zero extra code vs Variant A's plain scheduler fan-out.

**Scope:**
- New file [packages/backend/convex/agent/bulkExecute.ts](../packages/backend/convex/agent/bulkExecute.ts).
- Workflow definition `internal.agent.bulkExecute.runBulkWorkflow` that takes `{ proposalId }` and walks chunks.
- Internal mutation `internal.agent.bulkExecute.applyChunk` that runs a single 500-row chunk, writes an `auditLog` row with `chunkIndex` and `chunkCount`, and returns the chunk summary.

**Steps:**

1. Workflow body:
   ```ts
   export const runBulkWorkflow = workflow.define({
     args: { proposalId: v.id("agentProposals") },
     handler: async (step, { proposalId }) => {
       const proposal = await step.runQuery(internal.agent.proposals.getById, { proposalId });
       const rows = await step.runQuery(internal.agent.proposalRows.listForProposal, { proposalId });
       const chunkSize = 500;
       const chunkCount = Math.ceil(rows.length / chunkSize);

       for (let i = 0; i < chunkCount; i++) {
         const chunk = rows.slice(i * chunkSize, (i + 1) * chunkSize);
         try {
           await step.runMutation(internal.agent.bulkExecute.applyChunk, {
             proposalId,
             chunkIndex: i,
             chunkCount,
             rowIds: chunk.map(r => r._id),
           });
         } catch (err) {
           await step.runMutation(internal.agent.bulkExecute.reverseAllChunks, { proposalId, failedAtChunk: i });
           await step.runMutation(internal.agent.proposals.markFailed, { proposalId, errorJson: JSON.stringify({ err: String(err), failedAtChunk: i }) });
           throw err;
         }
       }

       await step.runMutation(internal.agent.proposals.markExecuted, {
         proposalId,
         auditLogId: null,
         undoExpiresAt: Date.now() + 10 * 60 * 1000,
       });
     },
   });
   ```

2. `applyChunk` mutation:
   - Ownership re-verification per row.
   - Per-row patch logic (delegated to the per-tool handler via a registry keyed on `proposal.toolName`).
   - Write one `auditLog` row per chunk with the chunk's `reversalPayloadJson`.

3. `reverseAllChunks` mutation:
   - Queries `auditLog` by `proposalId`, orders by `chunkIndex` descending.
   - For each row, invokes the registered reversal handler for the tool.
   - Patches each reversed row with `reversedAt: now`.

4. Undo path for bulk:
   - `undo_mutation` for a bulk proposal reads all `auditLog` rows by `proposalId`; verifies all are within the 10-minute window; invokes reversal handlers in reverse chunk order; fails the whole undo if any chunk's window has passed (brainstorm §6.3).

5. Unit tests:
   - 501-row bulk (chunked to 2 chunks): both chunks apply, audit rows written, undo reverses both.
   - Mid-workflow failure: reverseAllChunks runs; proposal marked `failed`.
   - Workflow resume after crash (simulated): completed step journaled; incomplete step retried from journal.
   - Out-of-window undo on bulk: entire undo fails with `undo_window_expired`.

**Test:**
- `bun typecheck` passes.
- Unit tests run under `convex-test` harness; workflow-step mocks per convex-dev/workflow test patterns.
- 501-row bulk end-to-end: both audit rows present with correct `chunkIndex` and `chunkCount`.

**Commit:**
```bash
gt create feat/agentic-home/W5-bulk-orchestrator -m "feat(agent): add bulk execute orchestrator via convex-dev/workflow"
gt submit --stack
```

**Acceptance checklist:**
- [ ] `bun typecheck` passes.
- [ ] Unit tests cover chunked apply, mid-workflow failure (abort-and-reverse), resume behavior.
- [ ] Audit rows include `chunkIndex` and `chunkCount`.
- [ ] Undo handles multi-chunk rollback correctly.
- [ ] Partial-failure policy is abort-and-reverse (brainstorm §7.4).
- [ ] CodeRabbit clean.
- [ ] Cross-agent review.

---

### Task W5.7: `propose_credit_card_metadata_update`

**Recommended agent:** Codex.
**Rationale:** Well-specified. Consolidates four existing direct-UI mutations under one agent tool.

**Linear issue:** LIN-W5-007.

**Preconditions:**
- Task W5.2, W5.4 merged.

**Scope:**
- New file [packages/backend/convex/agent/tools/proposeCreditCardMetadataUpdate.ts](../packages/backend/convex/agent/tools/proposeCreditCardMetadataUpdate.ts).
- Handles `displayName`, `userOverrides.officialName`, `userOverrides.accountName`, `userOverrides.company`, `userOverrides.providerDashboardUrl`, `userOverrides.aprs[index]` in one tool.

**Steps:**

1. Zod input:
   ```ts
   const Input = z.object({
     cardId: z.string(),
     updates: z.object({
       displayName: z.string().optional(),
       officialName: z.string().nullable().optional(),
       accountName: z.string().nullable().optional(),
       company: z.string().nullable().optional(),
       providerDashboardUrl: z.string().url().nullable().optional(),
       aprOverrides: z.array(z.object({
         index: z.number().int().nonnegative(),
         aprPercentage: z.number().optional(),
         balanceSubjectToApr: z.number().optional(),
         interestChargeAmount: z.number().optional(),
       })).optional(),
     }),
   });
   ```

2. Propose body:
   - Loads card; verifies ownership.
   - Builds diff preview per-field (before/after).
   - Calls `createProposal({ toolName: "propose_credit_card_metadata_update", scope: "single", affectedIds: [cardId], ...})`.

3. Execute body:
   - Re-loads card, re-verifies ownership.
   - Applies each update. For `userOverrides` fields, merges into the existing `userOverrides` object (preserving untouched keys).
   - Builds reversal payload `{ cardId, priorDisplayName?, priorUserOverrides? }` capturing the prior state of every field touched.
   - Inserts audit row via the wrapper.

4. Reversal body:
   - Re-loads card.
   - Patches `displayName` back if `priorDisplayName` present.
   - Patches `userOverrides` back to the captured prior object.

5. Unit tests:
   - Single field update, happy path, undo.
   - APR override update (adds or replaces an index), undo.
   - Clearing an override via `null`.
   - Cross-user rejection.

**Test:**
- `bun typecheck` passes.
- Tests cover each update kind and undo path.

**Commit:**
```bash
gt create feat/agentic-home/W5-card-metadata-tool -m "feat(agent): add propose_credit_card_metadata_update"
gt submit --stack
```

**Acceptance checklist:**
- [ ] `bun typecheck` passes.
- [ ] Tests cover all update paths plus undo.
- [ ] Reversal preserves prior `userOverrides` object correctly on partial clears.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review.

---

### Task W5.8: `propose_manual_promo`

**Recommended agent:** Codex.
**Rationale:** Single tool, clear shape. Reuses existing `promoRates` CRUD patterns.

**Linear issue:** LIN-W5-008.

**Preconditions:**
- Task W5.2, W5.4 merged.

**Scope:**
- New file [packages/backend/convex/agent/tools/proposeManualPromo.ts](../packages/backend/convex/agent/tools/proposeManualPromo.ts).
- Handles create-or-update semantics: if `promoRateId` arg is absent, insert; if present, update the existing row (only manual promos per `isManual === true`).

**Steps:**

1. Zod input:
   ```ts
   const Input = z.object({
     promoRateId: z.string().optional(),
     creditCardId: z.string(),
     description: z.string(),
     aprPercentage: z.number(),
     originalBalance: z.number(),
     remainingBalance: z.number(),
     startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
     expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
     isDeferredInterest: z.boolean(),
     accruedDeferredInterest: z.number().optional(),
     monthlyMinimumPayment: z.number().optional(),
   });
   ```

2. Propose body:
   - Verifies card ownership.
   - If `promoRateId` provided: loads promo, verifies `isManual === true` (Plaid-synced promos are not user-editable via this tool); verifies ownership; builds update diff.
   - If absent: builds insert preview.
   - Calls `createProposal({ toolName: "propose_manual_promo", scope: "single", affectedIds: [promoRateId ?? `new:${creditCardId}:${startDate}`], ... })`.

3. Execute body:
   - Create: inserts `promoRates` row with `isManual: true`. Reversal payload `{ kind: "soft_delete_created", promoRateId: newId }`; reversal sets `isActive: false`.
   - Update: patches fields. Reversal payload `{ kind: "restore_prior", promoRateId, priorFields: {...} }`; reversal patches back.

4. Reversal body:
   - Switches on `kind` and applies accordingly.

5. Unit tests:
   - Create happy path, undo (soft-deletes).
   - Update happy path (manual promo), undo.
   - Update rejection when promo is not manual.
   - Cross-user rejection.
   - Date validation.

**Test:**
- `bun typecheck` passes.
- All test paths pass.

**Commit:**
```bash
gt create feat/agentic-home/W5-manual-promo-tool -m "feat(agent): add propose_manual_promo"
gt submit --stack
```

**Acceptance checklist:**
- [ ] `bun typecheck` passes.
- [ ] Tests cover both branches (create and update) plus undo.
- [ ] Non-manual promos rejected from the update path.
- [ ] Date format validated.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review.

---

### Task W5.9: `propose_reminder_create` and `propose_reminder_delete`

**Recommended agent:** Codex.
**Rationale:** Shape is simple and mirrors contracts §1.8.

**Linear issue:** LIN-W5-009.

**Preconditions:**
- Task W5.2, W5.4 merged.
- W2 PR landing `reminders` schema per contracts §1.8.

**Scope:**
- New file [packages/backend/convex/agent/tools/proposeReminderCreate.ts](../packages/backend/convex/agent/tools/proposeReminderCreate.ts).
- New file [packages/backend/convex/agent/tools/proposeReminderDelete.ts](../packages/backend/convex/agent/tools/proposeReminderDelete.ts).

**Canonical `reminders` fields (contracts §1.8):** `title: string`, `dueAt: number` (epoch ms), `notes?: string`, `isDone: boolean`, `doneAt?: number`, `dismissedAt?: number`, `relatedResourceType` (union), `relatedResourceId?: string`, `triggerLeadDays?: number`, `channels: Array<"chat" | "email">`, `createdByAgent: boolean`.

**Steps:**

1. `propose_reminder_create`:
   - Zod input:
     ```ts
     const Input = z.object({
       title: z.string().min(1).max(200),
       dueAt: z.number().int(),               // epoch ms
       notes: z.string().max(2000).optional(),
       relatedResourceType: z.enum(["creditCard", "promoRate", "installmentPlan", "transaction", "none"]),
       relatedResourceId: z.string().optional(),
       triggerLeadDays: z.number().int().min(0).max(365).optional(),
       channels: z.array(z.enum(["chat", "email"])).min(1).default(["chat"]),
     });
     ```
   - Propose body: validates that `dueAt > Date.now()`; validates `relatedResourceId` ownership per `relatedResourceType` (load the resource and check `.userId === viewer._id`; `"none"` skips this check). Computes preview `{ kind: "create", title, dueAt, ... }`. Calls `createProposal({ toolName: "propose_reminder_create", scope: "single", affectedIds: [`new:${title}:${dueAt}`], ...})`.
   - Execute body: inserts `reminders` row with `createdByAgent: true`, `isDone: false`, `channels` from input (default `["chat"]`), `dismissedAt: undefined`. Reversal payload `{ kind: "soft_delete_created", reminderId: newId }`.
   - Reversal body: patches `dismissedAt: Date.now()` on the created reminder.

2. `propose_reminder_delete`:
   - Zod input: `{ reminderId: string }`.
   - Propose body: loads reminder, verifies ownership, verifies `dismissedAt === undefined`. Computes preview `{ kind: "delete", reminder: {...} }`.
   - Execute body: patches `dismissedAt: Date.now()`. Reversal payload `{ kind: "restore_dismissed", reminderId }`.
   - Reversal body: patches `dismissedAt: undefined`.

3. Unit tests:
   - Create happy path, undo.
   - Create with `relatedResourceType: "creditCard"` + ownership check pass.
   - Create with cross-user resource rejected.
   - Delete happy path, undo.
   - Double-delete rejected.

**Test:**
- `bun typecheck` passes.
- All tests pass.

**Commit:**
```bash
gt create feat/agentic-home/W5-reminder-tools -m "feat(agent): add propose_reminder_create and propose_reminder_delete"
gt submit --stack
```

**Acceptance checklist:**
- [ ] `bun typecheck` passes.
- [ ] Field names match contracts §1.8 exactly: `title`, `dueAt`, `notes`, `relatedResourceType`, `relatedResourceId`, `triggerLeadDays`, `channels`, `createdByAgent`.
- [ ] Resource ownership validated for non-`"none"` types.
- [ ] `createdByAgent: true` set on all agent-created reminders.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review.

---

### Task W5.10: `trigger_plaid_resync` (execute-style; no propose)

**Recommended agent:** Claude Code for the design decision (destructive classification, no-propose pattern justification); Codex for the tool body.
**Rationale:** The tool has no dry-run preview; it goes directly to execute. Needs explicit wrapper-support for non-propose tools.

**Linear issue:** LIN-W5-010.

**Status:** **BLOCKED on W4.**

**Blocker:** Per contracts §0 ownership table, `trigger_plaid_resync` requires `internal.plaidComponent.triggerManualResync` to be exported from W4. Until W4's PR for that internal action merges, this task cannot proceed.

**Unblocker steps:**
1. Confirm W4 has merged its PR adding `internal.plaidComponent.triggerManualResync({ itemId: string, userId: Id<"users"> })` returning `{ triggeredAt: number, resyncId: string }`.
2. Proceed with implementation below.

**Scope (to execute once unblocked):**
- New file [packages/backend/convex/agent/tools/triggerPlaidResync.ts](../packages/backend/convex/agent/tools/triggerPlaidResync.ts).
- Tool goes direct to execute pattern: registered with W2 registry as `kind: "execute"` (not `propose`).
- Destructive-ops classification: added to `DESTRUCTIVE_TOOLS` set. Requires `confirmDestructive: true` per Task W5.11.

**Steps (once unblocked):**

1. Zod input: `{ plaidItemId: string, confirmDestructive: boolean }`.

2. Handler:
   - Verifies `plaidItemId` belongs to viewer (via `internal.plaidComponent.getItemOwner` or equivalent W4 query).
   - Verifies `confirmDestructive === true` (redundant with wrapper check but explicit).
   - Checks item is not in open circuit breaker (per W4 contract).
   - Schedules `ctx.scheduler.runAfter(0, internal.plaidComponent.triggerManualResync, { itemId: plaidItemId, userId: viewer._id })`.
   - Writes an `auditLog` row with `toolName: "trigger_plaid_resync"`, `inputArgsJson: JSON.stringify({plaidItemId})`, `reversalPayloadJson: "{}"` (empty: resync is not reversible).
   - Returns `{ summary: "Resync scheduled for <institution>. May take several minutes." }`.

3. Reversal registered as a no-op handler that returns `{ summary: "Resync cannot be undone." }` (brainstorm §5).

4. Tests: invocation without `confirmDestructive` rejected; with flag succeeds; cross-user `plaidItemId` rejected; circuit-breaker-open state surfaces an explanatory error.

**Acceptance checklist (once unblocked):**
- [ ] `bun typecheck` passes.
- [ ] Tests cover all reject paths.
- [ ] Tool added to `DESTRUCTIVE_TOOLS`.
- [ ] Registered with W2 registry as `kind: "execute"`.
- [ ] Undo no-op handler registered.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review.

---

### Task W5.11: First-turn guard and destructive-action gating

**Recommended agent:** Claude Code.
**Rationale:** Security-critical; small code surface; high correctness stakes.

**Linear issue:** LIN-W5-011.

**Preconditions:**
- Task W5.2 merged.
- W2 PR landing `agentThreads.readCallCount` field and the read-tool wrapper that increments it.

**Scope:**
- First-turn-read-before-write guard inside `createProposal`.
- Destructive-action gating inside `executeWriteTool`.
- `DESTRUCTIVE_TOOLS` set definition and export.

**Steps:**

1. In `createProposal`, immediately after `viewer = ctx.viewerX()`:
   ```ts
   const thread = await ctx.table("agentThreads").getX(args.threadId);
   if (thread.readCallCount < 1) {
     throw new ToolError({ kind: "first_turn_guard" });
   }
   ```

2. Define `DESTRUCTIVE_TOOLS`:
   ```ts
   export const DESTRUCTIVE_TOOLS = new Set<string>([
     "trigger_plaid_resync",
     // future: "propose_card_hard_delete", "propose_plaid_item_remove"
   ]);
   ```

3. In `executeWriteTool`, after state and ownership checks and before rate-limit (or after; ordering matches Task W5.4):
   ```ts
   if (DESTRUCTIVE_TOOLS.has(proposal.toolName) && args.confirmDestructive !== true) {
     throw new ToolError({ kind: "destructive_unconfirmed" });
   }
   ```

4. Extend the Zod input of `execute_confirmed_proposal` to include `confirmDestructive?: boolean`.

5. Unit tests:
   - Propose on a thread with `readCallCount === 0`: throws `first_turn_guard`.
   - Propose on a thread with `readCallCount >= 1`: succeeds.
   - Execute of a destructive tool without the flag: throws `destructive_unconfirmed`.
   - Execute of a destructive tool with the flag: succeeds.
   - Execute of a non-destructive tool without the flag: succeeds.

**Test:**
- `bun typecheck` passes.
- All four scenarios covered.

**Commit:**
```bash
gt create feat/agentic-home/W5-guards -m "feat(agent): add first-turn guard and destructive-action gating"
gt submit --stack
```

**Acceptance checklist:**
- [ ] `bun typecheck` passes.
- [ ] Unit tests cover both guards and both outcomes.
- [ ] Error codes match contracts §6 typed enum.
- [ ] `DESTRUCTIVE_TOOLS` exports for re-use by W5.10 and future tools.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review.

---

### Task W5.12: Test suite (concurrency, idempotency, adversarial, bulk recovery)

**Recommended agent:** Codex.
**Rationale:** Test authoring is well-scoped once the handler surfaces exist.

**Linear issue:** LIN-W5-012.

**Preconditions:**
- Tasks W5.1 through W5.9, W5.11 merged.

**Scope:**
- Test files at `packages/backend/convex/agent/writeTool.concurrency.test.ts`, `writeTool.adversarial.test.ts`, `bulkExecute.recovery.test.ts`.
- `convex-test` harness for simulating Convex mutations and workflows.

**Test cases:**

1. **Concurrency: two confirms**
   - Two clients confirm the same proposal simultaneously.
   - Only one transitions `awaiting_confirmation → confirmed`; the other sees `confirmed` state and returns existing reversal token.
   - Audit row count: exactly one.

2. **Idempotency: network retry of execute**
   - Client retries `execute_confirmed_proposal` after a transient error.
   - Second call observes `state === "executed"` and returns the original reversal token.
   - Audit row count: exactly one.

3. **Idempotency: same propose args twice**
   - Call `propose_transaction_update` twice with identical args on the same thread.
   - Second call catches the unique-constraint throw and returns the existing proposalId.
   - `agentProposals` count: exactly one.

4. **Adversarial: first-turn guard**
   - New thread with `readCallCount: 0`; call `propose_transaction_update`.
   - Rejects with `first_turn_guard`.

5. **Adversarial: destructive without confirm**
   - Call `execute_confirmed_proposal` for a destructive tool without `confirmDestructive: true`.
   - Rejects with `destructive_unconfirmed`.

6. **Adversarial: cross-user undo**
   - User A creates and executes a proposal; user B attempts to undo with A's reversal token.
   - Rejects with `reversal_token_not_found` or similar (token decodes but ownership mismatch).

7. **Bulk recovery: mid-workflow crash**
   - 1500-row bulk; simulate a crash after chunk 1 completes and chunk 2 is mid-apply.
   - Workflow journal resumes; chunk 1 not re-run; chunk 2 retries from scratch.
   - Final audit: 3 rows (chunks 0, 1, 2), all applied.

8. **Bulk out-of-window undo**
   - 500-row bulk; wait 11 minutes; call `undo_mutation`.
   - Rejects with `undo_window_expired`. No partial undo.

9. **Undo under concurrent edits** (stomping semantics)
   - Transaction T edited via `propose_transaction_update` at t=0.
   - Direct UI edit of the same transaction at t=5min (outside audit log per MVP scope).
   - Undo at t=8min stomps the direct edit.
   - Audit log shows: forward row at t=0, undo row at t=8min.
   - Test asserts final state equals the pre-forward state, not the intermediate direct-edit state.

**Commit:**
```bash
gt create feat/agentic-home/W5-tests -m "test(agent): W5 mutation concurrency, idempotency, adversarial, bulk recovery"
gt submit --stack
```

**Acceptance checklist:**
- [ ] All nine test cases pass under `convex-test`.
- [ ] Tests executable via `bun test` in the backend workspace.
- [ ] CI picks them up on PR.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review.

---

## 6. Dependency graph (visual summary)

```
W5.1 (schema) ---+
                 +---> W5.2 (wrapper + hashing) ---+---> W5.3 (undo)
                 |                                  |
                 |                                  +---> W5.4 (rate-limit)
                 |                                  |
                 |                                  +---> W5.7 (card tool)
                 |                                  |
                 |                                  +---> W5.8 (promo tool)
                 |                                  |
                 |                                  +---> W5.9 (reminder tools)
                 |                                  |
                 |                                  +---> W5.11 (guards)
                 |                                                    |
                 +---> W5.6 (bulk orchestrator) ---> W5.5 (txn tools)-+
                                                                      |
                                                  W5.10 (plaid; blocked on W4) --+
                                                                                 |
                                                                                 v
                                                                           W5.12 (tests)
```

Critical path: W5.1 → W5.2 → (W5.4 and W5.6 parallel) → W5.5 → W5.12.

Tasks W5.7, W5.8, W5.9, W5.11 run in parallel with W5.5 and W5.6.

Task W5.10 runs after W4 lands; is not on the critical path for M3 close (it is a single non-propose tool and can merge after the others).

---

## 7. Acceptance checklist (plan-level)

Before W5 sub-project closes in Linear:

- [ ] All 12 tasks merged, each passing CodeRabbit and cross-agent review.
- [ ] `bun typecheck` passes across all workspaces after the final merge.
- [ ] `bun build` passes for `apps/app` and `apps/web`.
- [ ] Feature flag `AGENT_WRITE_TOOLS_ENABLED` defined and defaulted to `false`; flip-on plan documented.
- [ ] Test suite (Task W5.12) all pass in CI.
- [ ] Linear issues LIN-W5-001 through LIN-W5-012 closed.
- [ ] Dependent workstreams (W2 schema, W2 API, W2 workflow install, W2 rate-limiter, W4 plaid resync) confirmed merged with correct contract shapes.
- [ ] `specs/W5-mutations.md` "Questions This Spec Answered" list remains current against the merged code (no spec drift).
- [ ] Post-MVP deferral backlog logged in `TODO.md` (transaction split/merge/tags, card hard delete, promo update/delete, installment plan CRUD, subscription/anomaly tool graduation).

---

## 8. Amendment protocol

Any change to this plan after first merge follows the amendment protocol in [specs/00-contracts.md](00-contracts.md) §18:

1. Open amendment PR against this file.
2. If the amendment touches a shared contract, also open an amendment PR against `specs/00-contracts.md` on the same Graphite stack.
3. Bump the affected contract's version in the ownership table.
4. Post a Linear comment on dependent workstream sub-projects (W2, W6, W7) if the amendment affects them.

---

## 9. Post-spec-finalisation handoff notes

- This plan is the execution artifact. Fresh Claude Code or Codex sessions start here.
- Spec [specs/W5-mutations.md](W5-mutations.md) answers "why" for each decision.
- Research [specs/W5-mutations.research.md](W5-mutations.research.md) carries citations for every external claim.
- Brainstorm [specs/W5-mutations.brainstorm.md](W5-mutations.brainstorm.md) is retained for archaeological reference; the §21 reconciliation appendix captures the cross-spec resolutions.

---

**End of plan.**

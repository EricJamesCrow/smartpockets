# W2: Convex Agent Backend (plan)

## Plan Handoff Header

| Field | Value |
|---|---|
| Linear milestone | M3 Agentic Home |
| Linear sub-project | W2 agent-backend |
| Linear issues | One per task W2.01 through W2.13; create up-front and replace `LIN-XXX` placeholders below |
| Recommended primary agent | Claude Code (architectural; multi-file; auth-sensitive per master prompt §6) |
| Required MCP servers | Convex (live schema, function execution, logs), Clerk (identity debugging), Graphite (stacked PR workflow) |
| Required read access | None (no external template paths; W2 is backend-only) |
| Prerequisite plans (must be merged) | W0 existing-state audit (already merged as `specs/W0-existing-state-audit.md`). No other prereqs. Does NOT block on [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) (W2's `contentHash` is CAS-scoped; W5, W6, W7 block on it, not W2). |
| Branch | `feat/agentic-home/W2-agent-backend` (stack root) |
| Graphite stack parent | `main` |
| Worktree directory | `~/Developer/smartpockets-W2-agent` |
| Estimated PRs in stack | 13 |
| Review bot | CodeRabbit (mandatory pass on every PR) |
| Cross-agent review | Claude Code reviews Codex PRs; Codex reviews Claude Code PRs (master prompt §11 cross-review rule) |
| Rollback plan | Each PR is an atomic Graphite PR rooted at `main`. Revert by `gt checkout main && gt delete <branch>` or `git revert <merge-commit>` for any single PR. Full-stack rollback: revert PRs in reverse order. No production dependencies at MVP; Convex dev deployment can be reset via `npx convex dashboard` → Reset. |
| Acceptance checklist | End of this file (§14). |

## Context bootstrap (for fresh agent sessions)

Before starting any task, the agent must:

1. Read [AGENTS.md](../AGENTS.md) and [CLAUDE.md](../CLAUDE.md) in the repo root.
2. Read [specs/W0-existing-state-audit.md](W0-existing-state-audit.md) for codebase baseline.
3. Read [specs/00-master-prompt.md](00-master-prompt.md) Sections 1-7 and the W2 row in Section 8.
4. Read [specs/W2-agent-backend.md](W2-agent-backend.md) (authoritative spec) top to bottom.
5. Read this file ([specs/W2-agent-backend.plan.md](W2-agent-backend.plan.md)) top to bottom.
6. Read [specs/W2-agent-backend.research.md](W2-agent-backend.research.md); resolve every `VERIFY-AT-BRANCH-CUT` item before starting the task that depends on it.
7. Read [specs/00-contracts.md](00-contracts.md) for canonical cross-workstream schemas. If any code in this plan differs from contracts, contracts wins; amend the plan and the brainstorm in the same PR.
8. Run `git fetch origin` and confirm the worktree is on `feat/agentic-home/W2-agent-backend` rooted at origin/main.
9. Verify required MCP servers respond: `claude mcp list` should show `convex`, `clerk`, `graphite`.
10. Run `cd packages/backend && bun install` to ensure workspace dependencies are current.
11. Run `cd packages/backend && bun run dev` in a separate terminal; leave it tailing logs for the duration of the task.

## Task conventions

- Every task is one Graphite PR. Run `gt create <branch> -m "<commit message>"` to create the branch and commit; run `gt submit` to push and open the PR. Use `gt submit --stack` at stack completion to push everything.
- Every task targets ≤400 lines changed (master prompt §11 rule).
- Every task must pass `bun typecheck` (from repo root). Tasks touching Plaid must additionally build the local Plaid component if modified (not relevant for W2; we don't touch Plaid source).
- Every task carries a **Recommended agent** tag (Claude Code / Codex). The rationale explains the choice.
- After implementing a Codex task, Claude Code reviews before merge; after implementing a Claude Code task, Codex reviews. Cross-review is blocking.
- Commit message format: `feat(agent): <imperative summary>` plus the `Co-Authored-By` line from [CLAUDE.md](../CLAUDE.md).
- No em-dashes in any commit message, comment, PR description, or file.
- Do NOT use `ctx.db` for new code; `agent/` is Ents-native. Only the legacy `userPreferences` and `paymentAttempts` tables may use `ctx.db` (W0 §2.2).

---

## Task W2.01: Confirm research findings and branch setup

**Recommended agent:** Claude Code (research verification + environment setup).
**Rationale:** Before any code lands, verify the `VERIFY-AT-BRANCH-CUT` items from [specs/W2-agent-backend.research.md](W2-agent-backend.research.md). Claude Code's WebFetch + deep-reading profile fits.
**Linear issue:** LIN-XXX

**Prerequisite PRs in stack:** None (stack root).

**Scope:**
- No code changes in this task. Output is an amended [specs/W2-agent-backend.research.md](W2-agent-backend.research.md) with `VERIFY-AT-BRANCH-CUT` items resolved or explicitly re-deferred.
- Files:
  - Modify: `specs/W2-agent-backend.research.md`

**Acceptance:**
- Every `VERIFY-AT-BRANCH-CUT` entry in the research doc either:
  - Has a confirmed answer with a link to the source, OR
  - Is explicitly re-marked as "resolve during Task W2.NN" with rationale.
- The plan's task acceptance checklists are updated if any confirmed fact shifts their contract.

**Steps:**

1. Resolve **R1** (`@convex-dev/agent` current version). Run:
   ```bash
   npm view @convex-dev/agent versions --json | jq 'last(.[])'
   ```
   Record the version in the research doc. Skim the component's README on `github.com/get-convex/agent` for any signature changes between the recorded version and the preliminary answer in research §1.3.

2. Resolve **R3** (streaming cadence). Install the component locally in a scratch branch; call `streamText` against a test prompt; observe message-table writes via `npx convex dashboard`. Record cadence (per-step, per-message, per-token) in research §3.

3. Resolve **R9** (Anthropic pricing). Fetch `docs.anthropic.com/pricing` for Sonnet 4.6 and Haiku 4.5. Record `inputPerM` and `outputPerM` in research §9 AND update the `MODEL_PRICING` placeholder in this plan's Task W2.05 step 3 so the executor fills the constants correctly.

4. Resolve **R10** (Convex version drift). Run `bun install --print-tree 2>/dev/null | grep -c 'convex@'`. If > 1, note in research §10 that the W2.02 PR must bump subpackages to `^1.31.7`.

5. Resolve **R11** (UntitledUI template AI SDK). Run:
   ```bash
   cat /Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/package.json | jq '.dependencies["ai"]'
   ```
   Record in research §11. (Informs W1, not W2, but confirm here for completeness.)

6. Create the worktree and branch:
   ```bash
   cd ~/Developer/smartpockets
   git worktree add ~/Developer/smartpockets-W2-agent -b feat/agentic-home/W2-agent-backend
   cd ~/Developer/smartpockets-W2-agent
   bun install
   ```

7. Verify required MCP servers respond:
   ```bash
   claude mcp list
   ```
   Expect `convex`, `clerk`, `graphite` listed. If any missing, install per [AGENTS.md](../AGENTS.md) §MCP Servers.

**Test:**
- Research doc reads as self-contained at branch-cut time (no unresolved `VERIFY-AT-BRANCH-CUT` except items explicitly deferred).
- `git branch --show-current` returns `feat/agentic-home/W2-agent-backend`.
- `bun typecheck` passes from root (no new code yet; sanity check).

**Commit:**
```bash
gt create feat/agentic-home/W2-01-research-and-setup -m "docs(agent): resolve W2 research at branch cut"
gt submit
```

**Acceptance checklist:**
- [ ] Research doc `VERIFY-AT-BRANCH-CUT` items resolved or re-deferred with rationale.
- [ ] Worktree created at `~/Developer/smartpockets-W2-agent`.
- [ ] MCP servers verified.
- [ ] CodeRabbit clean on the research-doc PR.
- [ ] Cross-agent review (Codex) clean.

---

## Task W2.02: Install Convex components and align Convex version

**Recommended agent:** Claude Code (dependency-tree reasoning; one-off research-backed choices).
**Rationale:** Version alignment, peer-dep compatibility checks, and the initial `convex.config.ts` registration are architectural. A single source-of-truth decision.
**Linear issue:** LIN-XXX

**Prerequisite PRs in stack:** W2.01.

**Scope:**
- Files:
  - Modify: `packages/backend/package.json`
  - Modify: `apps/app/package.json` (if Convex version bump required per R10)
  - Modify: `package.json` (root, if Convex version bump required)
  - Modify: `packages/backend/convex/convex.config.ts`
  - Modify: `packages/backend/.env.example` (create if missing)
  - Modify: `bun.lock` (auto-updated)

**Acceptance:**
- `bun install` from root produces a single hoisted `convex` version (`1.31.7`).
- `npx convex dev --once` completes (no schema changes yet; just validates config).
- `bun typecheck` passes.

**Steps:**

1. From `packages/backend`, add deps:
   ```bash
   cd packages/backend
   bun add @convex-dev/agent @convex-dev/rag @convex-dev/workflow @convex-dev/rate-limiter @ai-sdk/anthropic ai
   ```

2. Align Convex if research R10 flagged drift. Check with:
   ```bash
   bun install --print-tree 2>/dev/null | grep -E '^.{0,20}convex@'
   ```
   If multiple versions appear, bump `packages/backend/package.json`'s `convex` row to `^1.31.7` (matching root). Do the same in `apps/app/package.json` if needed. Re-run `bun install` at root.

3. Update [packages/backend/convex/convex.config.ts](../packages/backend/convex/convex.config.ts):

   ```ts
   import { defineApp } from "convex/server";
   import resend from "@convex-dev/resend/convex.config";
   import plaid from "@crowdevelopment/convex-plaid/convex.config";
   import agent from "@convex-dev/agent/convex.config";
   import rag from "@convex-dev/rag/convex.config";
   import workflow from "@convex-dev/workflow/convex.config";
   import rateLimiter from "@convex-dev/rate-limiter/convex.config";

   const app = defineApp();
   app.use(resend);
   app.use(plaid);
   app.use(agent);
   app.use(rag);
   app.use(workflow);
   app.use(rateLimiter);

   export default app;
   ```

4. Create `packages/backend/.env.example` with W2 env vars (spec §3.3). Commit this file even if it only lists agent vars; the existing env-var documentation currently lives in ad-hoc docs.

   ```
   # AI Agent (W2)
   ANTHROPIC_API_KEY=
   AGENT_MODEL_DEFAULT=claude-sonnet-4-6
   AGENT_MODEL_CLASSIFIER=claude-haiku-4-5
   AGENT_BUDGET_MONTHLY_TOKENS=1000000
   AGENT_BUDGET_PER_THREAD_TOKENS=200000
   AGENT_BUDGET_PER_TOOLCALL_TOKENS=15000
   AGENT_PROPOSAL_AWAITING_TTL_MINUTES=15
   AGENT_UNDO_TTL_MINUTES=10
   AGENT_COMPACTION_MESSAGE_THRESHOLD=40
   AGENT_COMPACTION_INPUT_TOKEN_THRESHOLD=30000

   # RAG (infra only at MVP; do not set RAG_EMBEDDING_MODEL until post-M3)
   RAG_EMBEDDING_MODEL=
   ```

5. Run `npx convex dev --once` from `packages/backend` to validate the config. The component rows will fail if peer deps mismatch.

6. Run `bun typecheck` from root. Expect pass.

7. Set dev env vars via Convex:
   ```bash
   cd packages/backend
   npx convex env set ANTHROPIC_API_KEY sk-ant-...   # from Eric's Anthropic console
   npx convex env set AGENT_MODEL_DEFAULT claude-sonnet-4-6
   npx convex env set AGENT_MODEL_CLASSIFIER claude-haiku-4-5
   # other env vars use code-default fallbacks; no need to set at MVP
   ```

**Test:**
- `bun install --print-tree 2>/dev/null | grep -E 'convex@'` shows exactly one Convex version.
- `cd packages/backend && npx convex dev --once` exits 0.
- `bun typecheck` passes from root.

**Commit:**
```bash
gt create feat/agentic-home/W2-02-install-components -m "feat(agent): install agent, rag, workflow, rate-limiter components"
gt submit
```

**Acceptance checklist:**
- [ ] `bun install` from root shows single Convex version.
- [ ] `npx convex dev --once` succeeds.
- [ ] `bun typecheck` passes.
- [ ] All 6 `app.use(...)` rows present in `convex.config.ts`.
- [ ] `.env.example` created with agent vars.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review clean.

---

## Task W2.03: Schema additions (7 tables + user edges)

**Recommended agent:** Claude Code (schema design is cross-file, schema-change is high-risk to get wrong).
**Rationale:** Schema shapes are canonicalised in [specs/00-contracts.md](00-contracts.md); the task literally copies field definitions. Claude Code's attention to cross-file consistency (schema.ts + dataModel types + downstream edges) fits.
**Linear issue:** LIN-XXX

**Prerequisite PRs in stack:** W2.02.

**Scope:**
- Files:
  - Modify: `packages/backend/convex/schema.ts`

**Acceptance:**
- Seven new Ents tables present.
- `users` ent has 4 additional `.edges(...)` rows.
- `bun typecheck` passes.
- `npx convex dev --once` applies the schema to the dev deployment without errors.

**Steps:**

1. Open [packages/backend/convex/schema.ts](../packages/backend/convex/schema.ts). Locate the existing `defineEnt` rows (W0 §2.1 lists: users, organizations, members, roles, paymentAttempts, creditCards, statementSnapshots, promoRates, installmentPlans, wallets, walletCards, userPreferences, transactionOverlays, plus recent addition `transactionAttachments`).

2. Add the `agentThreads` ent immediately after `transactionAttachments`. Use the exact shape from [specs/W2-agent-backend.md](W2-agent-backend.md) §4.1.

3. Add `agentMessages`, `agentProposals`, `agentProposalRows`, `agentUsage`, `promptVersions`, `reminders` in the same block. Use shapes from spec §4.2 through §4.7.

4. Modify the `users` ent definition to add four new edges:

   ```ts
   users: defineEnt({ /* existing fields unchanged */ })
     // keep existing edges (connectedAccounts, members, creditCards, wallets, statementSnapshots, promoRates, installmentPlans, transactionOverlays, transactionAttachments) intact
     .edges("agentThreads", { ref: true })
     .edges("agentProposals", { ref: true })
     .edges("agentUsage", { ref: true })
     .edges("reminders", { ref: true })
   ```

5. Run `bun typecheck` from root. Expect pass. Any errors usually indicate a field-name mismatch between the schema and the spec; reconcile against contracts §1 if so.

6. Run `cd packages/backend && npx convex dev --once` to apply. Expect "Schema validation passed" or similar. If validation fails, the migration messages will identify the field; fix and re-run.

7. Verify via Convex dashboard: all 7 new tables visible, indexes present, edges resolve.

**Test:**
- `bun typecheck` passes.
- `npx convex dev --once` succeeds and the dev deployment reports schema `valid`.
- Convex dashboard shows the 7 new tables.

**Commit:**
```bash
gt create feat/agentic-home/W2-03-schema -m "feat(agent): add agent tables and user edges"
gt submit
```

**Acceptance checklist:**
- [ ] Seven new tables present in `schema.ts`.
- [ ] `users` has four new edges.
- [ ] All indexes from spec §4 present.
- [ ] `agentProposals.contentHash` declared via `.field("contentHash", v.string(), { unique: true })` after the `defineEnt(...)` object (Ents top-level unique-field syntax per contracts §1.6). NOT as a nested `v.string()` property inside the `defineEnt` object.
- [ ] No `by_thread_contentHash` index on `agentProposals` (the unique field creates its own index; per-thread uniqueness comes from the `threadId` input to `idempotencyKey`).
- [ ] `bun typecheck` passes.
- [ ] `npx convex dev --once` applies schema without errors and reports the unique constraint on `contentHash` in the schema-validation output.
- [ ] Convex dashboard verification passes.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review clean.

---

## Task W2.04: Auth factory + notifications hashing + errors

**Recommended agent:** Claude Code (auth-sensitive factory design; trust boundary establishment).
**Rationale:** `agent/functions.ts` is the trust boundary for W5 and W6. Get the `customCtx` composition right once; every subsequent task consumes this. Claude Code's auth-sensitive tag from master prompt §6 applies.
**Linear issue:** LIN-XXX

**Prerequisite PRs in stack:** W2.03.

**Scope:**
- Files:
  - Create: `packages/backend/convex/agent/functions.ts`
  - Create: `packages/backend/convex/notifications/hashing.ts` (canonical location per contracts §10.1; shared by W5 propose, W7 email dispatch, W6 intel triggers)
  - Create: `packages/backend/convex/agent/errors.ts`

**Acceptance:**
- `agentQuery`, `agentMutation`, `agentAction` exported from `functions.ts`.
- `idempotencyKey` exported from `notifications/hashing.ts`, matching the signature in contracts §10.1 exactly.
- `ErrorCode`, `ToolEnvelope`, `AgentError`, `ProposalToolOutput` exported from `errors.ts`.
- `bun typecheck` passes.

**Steps:**

1. Create [packages/backend/convex/agent/functions.ts](../packages/backend/convex/agent/functions.ts) with the factory from [specs/W2-agent-backend.md](W2-agent-backend.md) §6.2. Copy verbatim; this is the trust boundary. Include the comment block explaining the `../_generated/server` exception.

2. Create `packages/backend/convex/notifications/hashing.ts`. This is the **canonical shared module** per [specs/00-contracts.md](../specs/00-contracts.md) §10.1. W2 creates it here (not under `agent/`); W5, W6, and W7 import from this same path. Make the parent directory first:

   ```bash
   mkdir -p packages/backend/convex/notifications
   ```

   File contents (matches contracts §10.1 exactly):

   ```ts
   // packages/backend/convex/notifications/hashing.ts
   /**
    * Canonical idempotency-key utility. Single source of truth for
    * application-layer dedup across W5 proposals, W6 intel triggers,
    * and W7 email dispatch. Do not fork.
    *
    * Strategy C-prime (specs/00-idempotency-semantics.md §4.4): this
    * hash feeds the DB-level unique constraint on `agentProposals.contentHash`
    * and `emailEvents.idempotencyKey`. Two concurrent callers with the same
    * input compute the same hash; only one insert wins; the other catches
    * the unique-constraint error and returns the pre-existing row.
    */

   async function sha256Hex(input: string): Promise<string> {
     const buf = new TextEncoder().encode(input);
     const digest = await crypto.subtle.digest("SHA-256", buf);
     return Array.from(new Uint8Array(digest))
       .map((b) => b.toString(16).padStart(2, "0"))
       .join("");
   }

   export async function idempotencyKey(input: {
     userId: string;
     scope: string;              // templateKey for W7; `propose_${toolName}` for W5
     threadId?: string;          // passed by W5 so same-proposal-in-different-thread does not collide
     cadence?: number;           // 30 / 14 / 7 / 1 / 3 etc. for cadence-based sends
     ids?: string[];             // affected row IDs for W5; payload IDs for W7
     dateBucket?: string;        // YYYY-MM-DD (UTC) for daily; YYYY-MM-DD-HHMM for 15-min windows
   }): Promise<string> {
     // Hand-ordered object literal: V8/Bun preserves insertion order in JSON.stringify,
     // so no explicit stable-stringify pass is needed.
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

   Notes for the executor:
   - The canonical signature in contracts §10.1 returns `string`, not `Promise<string>`. Because `crypto.subtle.digest` is async, this implementation returns `Promise<string>`. Callers `await` the result; contracts §10 code samples elide the `await` for brevity. If contracts is later amended to require a sync signature, replace `crypto.subtle.digest` with a synchronous Bun `Bun.CryptoHasher` or equivalent; at that point update W5, W6, W7 call sites in lockstep.
   - Do NOT re-export a `stableStringify` or `contentHashForProposal` helper from this module. Any earlier references in spec or plan drafts to those names are superseded by the reconciliation second pass.

3. Create `packages/backend/convex/agent/errors.ts`:

   ```ts
   import { v } from "convex/values";
   import type { Id } from "../_generated/dataModel";

   export type ErrorCode =
     | "not_authorized"
     | "not_found"
     | "rate_limited"
     | "budget_exhausted"
     | "validation_failed"
     | "timed_out"
     | "downstream_failed"
     | "first_turn_guard"
     | "proposal_timed_out"
     | "proposal_invalid_state";

   export type ToolEnvelope<T> =
     | {
         ok: true;
         data: T;
         meta: { rowsRead: number; durationMs: number; truncated?: boolean };
       }
     | {
         ok: false;
         error: { code: ErrorCode; message: string; retryable: boolean };
       };

   export type ProposalToolOutput = {
     proposalId: Id<"agentProposals">;
     scope: "single" | "bulk";
     summary: string;
     sample: unknown;
     affectedCount: number;
   };

   export type AgentError =
     | { kind: "rate_limited"; retryAfterSeconds: number }
     | { kind: "budget_exhausted"; reason: string }
     | { kind: "llm_down" }
     | { kind: "reconsent_required"; plaidItemId: string }
     | { kind: "first_turn_guard" }
     | { kind: "proposal_timed_out" }
     | { kind: "proposal_invalid_state" };
   ```

4. Run `bun typecheck` from root. Any errors usually trace to mismatched `customCtx` signatures; cross-check against [packages/backend/convex/functions.ts](../packages/backend/convex/functions.ts) for the repo's existing pattern.

5. Smoke test the factory via a scratch query in the Convex dashboard:
   ```ts
   // scratch; delete before commit
   import { agentQuery } from "./agent/functions";
   import { v } from "convex/values";
   export const testFactory = agentQuery({
     args: { userId: v.id("users") },
     returns: v.string(),
     handler: async (ctx) => {
       return `viewer: ${ctx.viewerX().name}`;
     },
   });
   ```
   Pass a real user id; expect the name string. Delete the scratch function before commit.

**Test:**
- `bun typecheck` passes.
- Factory smoke test returns expected `viewer: <name>` string for a real user id.

**Commit:**
```bash
gt create feat/agentic-home/W2-04-factory-hashing-errors -m "feat(agent): add agentQuery factory, hashing, error envelope"
gt submit
```

**Acceptance checklist:**
- [ ] `agent/functions.ts`, `notifications/hashing.ts`, `agent/errors.ts` created.
- [ ] `agentQuery` factory smoke-tested against a real user id.
- [ ] `idempotencyKey` produces equal hashes for equal-input calls regardless of key-reference order in the caller's object literal (verified via one unit-style scratch run comparing `idempotencyKey({ userId: "u1", scope: "s1" })` and `idempotencyKey({ scope: "s1", userId: "u1" })`).
- [ ] `idempotencyKey` produces distinct hashes when `threadId` differs (same userId + scope + ids, different threadId, returns a different hash).
- [ ] Signature matches contracts §10.1 exactly: fields `userId`, `scope`, `threadId?`, `cadence?`, `ids?`, `dateBucket?`.
- [ ] No `agent/hashing.ts` file exists in the tree (old path; if a prior spec draft created it, delete).
- [ ] `bun typecheck` passes.
- [ ] No `ctx.viewerX()` usage outside the factory (intentional; factory is the only caller of the resolver).
- [ ] CodeRabbit clean.
- [ ] Cross-agent review clean.

---

## Task W2.05: Config, rate limits, and budgets

**Recommended agent:** Claude Code (budget math plus UTC-month boundary plus pricing-constant discipline plus cross-file wiring).
**Rationale:** Budget math, pricing constants, and rate-limit bucket policies are load-bearing. Each is short but policy-sensitive; grouping into one PR keeps the trio consistent.
**Linear issue:** LIN-XXX

**Prerequisite PRs in stack:** W2.04.

**Scope:**
- Files:
  - Create: `packages/backend/convex/agent/config.ts`
  - Create: `packages/backend/convex/agent/rateLimits.ts`
  - Create: `packages/backend/convex/agent/budgets.ts`

**Acceptance:**
- `AGENT_DEFAULT_MODEL`, `AGENT_CLASSIFIER_MODEL`, `MODEL_PRICING`, `getAnthropicModel` exported from `config.ts`.
- `agentLimiter` with 5 buckets exported from `rateLimits.ts`.
- `checkHeadroom`, `recordUsage` internal functions exported from `budgets.ts`.
- `bun typecheck` passes.

**Steps:**

1. Create [packages/backend/convex/agent/config.ts](../packages/backend/convex/agent/config.ts):

   ```ts
   import { anthropic } from "@ai-sdk/anthropic";

   /**
    * Pricing constants: USD microcents per million tokens. `null` means the executor
    * must fill before commit. See specs/W2-agent-backend.research.md §9.
    * Update this file in the same PR that bumps PROMPT_VERSION.
    */
   export const MODEL_PRICING: Record<string, { inputPerM: number | null; outputPerM: number | null }> = {
     "claude-sonnet-4-6": { inputPerM: null, outputPerM: null },
     "claude-haiku-4-5":  { inputPerM: null, outputPerM: null },
   };

   export const AGENT_DEFAULT_MODEL = process.env.AGENT_MODEL_DEFAULT ?? "claude-sonnet-4-6";
   export const AGENT_CLASSIFIER_MODEL = process.env.AGENT_MODEL_CLASSIFIER ?? "claude-haiku-4-5";

   export function getAnthropicModel(modelId: string) {
     return anthropic(modelId);
   }

   export function computeUsdMicrocents(
     modelId: string,
     tokensIn: number,
     tokensOut: number,
   ): number {
     const rates = MODEL_PRICING[modelId];
     if (!rates || rates.inputPerM === null || rates.outputPerM === null) {
       return 0; // unknown; fill MODEL_PRICING and this returns a real number
     }
     return Math.round(
       ((tokensIn * rates.inputPerM) + (tokensOut * rates.outputPerM)) / 1_000_000,
     );
   }
   ```

2. Fill `MODEL_PRICING` with the values recorded in research R9. If R9 was re-deferred, leave as `null` and add a TODO comment flagging "verify before first prod deploy" (the plan's acceptance checklist catches this).

3. Create [packages/backend/convex/agent/rateLimits.ts](../packages/backend/convex/agent/rateLimits.ts):

   ```ts
   import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
   import { components } from "../_generated/api";

   export const agentLimiter = new RateLimiter(components.rateLimiter, {
     read_cheap:      { kind: "token bucket", rate: 60, period: MINUTE, capacity: 75 },
     read_moderate:   { kind: "token bucket", rate: 30, period: MINUTE, capacity: 40 },
     write_single:    { kind: "token bucket", rate: 20, period: MINUTE, capacity: 25 },
     write_bulk:      { kind: "token bucket", rate:  5, period: MINUTE, capacity:  7 },
     write_expensive: { kind: "token bucket", rate:  2, period: MINUTE, capacity:  3 },
   });

   export type BucketName =
     | "read_cheap"
     | "read_moderate"
     | "write_single"
     | "write_bulk"
     | "write_expensive";
   ```

4. Create [packages/backend/convex/agent/budgets.ts](../packages/backend/convex/agent/budgets.ts):

   ```ts
   import { v } from "convex/values";
   import { internalQuery, internalMutation } from "../functions";
   import { computeUsdMicrocents } from "./config";

   function firstOfMonthUtc(nowMs: number): number {
     const d = new Date(nowMs);
     return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
   }

   export const checkHeadroom = internalQuery({
     args: { userId: v.id("users") },
     returns: v.object({
       ok: v.boolean(),
       reason: v.optional(v.union(v.literal("monthly_cap"), v.literal("thread_cap"))),
     }),
     handler: async (ctx, { userId }) => {
       const monthly = Number(process.env.AGENT_BUDGET_MONTHLY_TOKENS ?? 1_000_000);
       const periodStart = firstOfMonthUtc(Date.now());
       const usageRows = await ctx.table("agentUsage", "by_user_period", (q) =>
         q.eq("userId", userId).eq("periodStart", periodStart),
       );
       const total = usageRows.reduce((acc, r) => acc + r.tokensIn + r.tokensOut, 0);
       if (total >= monthly) {
         return { ok: false, reason: "monthly_cap" as const };
       }
       return { ok: true };
     },
   });

   export const recordUsage = internalMutation({
     args: {
       userId: v.id("users"),
       modelId: v.string(),
       tokensIn: v.number(),
       tokensOut: v.number(),
     },
     returns: v.null(),
     handler: async (ctx, { userId, modelId, tokensIn, tokensOut }) => {
       const periodStart = firstOfMonthUtc(Date.now());
       const rows = await ctx.table("agentUsage", "by_user_period", (q) =>
         q.eq("userId", userId).eq("periodStart", periodStart).eq("modelId", modelId),
       );
       const existing = rows[0];
       if (existing) {
         const writable = await ctx.table("agentUsage").getX(existing._id);
         await writable.patch({
           tokensIn: writable.tokensIn + tokensIn,
           tokensOut: writable.tokensOut + tokensOut,
           usdMicrocents:
             writable.usdMicrocents + computeUsdMicrocents(modelId, tokensIn, tokensOut),
         });
       } else {
         await ctx.table("agentUsage").insert({
           userId,
           periodStart,
           modelId,
           tokensIn,
           tokensOut,
           usdMicrocents: computeUsdMicrocents(modelId, tokensIn, tokensOut),
           toolCallCount: 0,
         });
       }
       return null;
     },
   });
   ```

5. Run `bun typecheck` from root. Expect pass.

6. Smoke test via dashboard:
   ```ts
   // scratch; delete before commit
   await api.agent.budgets.checkHeadroom({ userId: "<test-user>" });
   // expect { ok: true }
   await internal.agent.budgets.recordUsage({ userId: "<test-user>", modelId: "claude-sonnet-4-6", tokensIn: 100, tokensOut: 50 });
   await api.agent.budgets.checkHeadroom({ userId: "<test-user>" });
   // expect { ok: true } still (way under 1M cap)
   ```
   Delete scratch runs.

**Test:**
- `bun typecheck` passes.
- Budget smoke test: seed usage, read headroom, confirm `ok: true` under cap; set monthly cap env var to `100` and confirm `ok: false, reason: "monthly_cap"` after seeding 200 tokens; unset.

**Commit:**
```bash
gt create feat/agentic-home/W2-05-config-ratelimits-budgets -m "feat(agent): add config, rate-limit buckets, budget accrual"
gt submit
```

**Acceptance checklist:**
- [ ] `agent/config.ts`, `agent/rateLimits.ts`, `agent/budgets.ts` created.
- [ ] `MODEL_PRICING` either populated from R9 or TODO-marked for fill-before-prod.
- [ ] Five buckets registered with `@convex-dev/rate-limiter`.
- [ ] Capacity numbers match `rate + burst` per [specs/00-contracts.md](00-contracts.md) §12 and [specs/W2-agent-backend.md](W2-agent-backend.md) §11.1: `read_cheap` 75 = 60 + 15, `read_moderate` 40 = 30 + 10, `write_single` 25 = 20 + 5, `write_bulk` 7 = 5 + 2, `write_expensive` 3 = 2 + 1.
- [ ] `checkHeadroom` smoke-tested both under-cap (ok: true) and over-cap (ok: false).
- [ ] `bun typecheck` passes.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review clean.

---

## Task W2.06: Threads module + HTTP action

**Recommended agent:** Claude Code (HTTP endpoint wiring, Clerk JWT propagation, identity-to-scheduled-action handoff).
**Rationale:** This is the W1-consumed HTTP contract (spec §7, contracts §5). Auth-sensitive: if the HTTP action gets identity wrong, every downstream tool call runs with wrong trust boundary.
**Linear issue:** LIN-XXX

**Prerequisite PRs in stack:** W2.05.

**Scope:**
- Files:
  - Create: `packages/backend/convex/agent/threads.ts`
  - Modify: `packages/backend/convex/http.ts` (append only)

**Acceptance:**
- Public `listMessages` query exported from `threads.ts`.
- Internal `appendUserTurn`, `getForRun`, `persistStep`, `loadForStream`, `listMessagesInternal`, `bumpReadCallCount`, `writeSummary` exported.
- `POST /api/agent/send` route appended to `http.ts`.
- Cross-thread ownership guarded; mismatched `threadId` throws.

**Steps:**

1. Create `packages/backend/convex/agent/threads.ts`:

   ```ts
   import { v } from "convex/values";
   import { query, internalMutation, internalQuery } from "../functions";
   import { PROMPT_VERSION } from "./system"; // set in W2.08; placeholder string until then

   // Public query consumed by W1.
   export const listMessages = query({
     args: { threadId: v.id("agentThreads") },
     returns: v.array(v.any()),
     handler: async (ctx, { threadId }) => {
       const viewer = ctx.viewerX();
       const thread = await ctx.table("agentThreads").getX(threadId);
       if (thread.userId !== viewer._id) throw new Error("Not authorized");
       return await thread.edge("agentMessages").order("asc");
     },
   });

   // Internal: called by POST /api/agent/send.
   export const appendUserTurn = internalMutation({
     args: {
       userId: v.id("users"),
       threadId: v.optional(v.id("agentThreads")),
       prompt: v.string(),
     },
     returns: v.object({
       threadId: v.id("agentThreads"),
       messageId: v.id("agentMessages"),
     }),
     handler: async (ctx, { userId, threadId, prompt }) => {
       const now = Date.now();
       let targetThreadId: any = threadId;

       if (!targetThreadId) {
         targetThreadId = await ctx.table("agentThreads").insert({
           userId,
           title: undefined,
           isArchived: false,
           lastTurnAt: now,
           promptVersion: PROMPT_VERSION,
           summaryText: undefined,
           summaryUpToMessageId: undefined,
           componentThreadId: `ct_${Math.random().toString(36).slice(2, 14)}`,
           readCallCount: 0,
         });
       } else {
         const thread = await ctx.table("agentThreads").getX(targetThreadId);
         if (thread.userId !== userId) throw new Error("Not authorized");
         await thread.patch({ lastTurnAt: now });
       }

       const messageId = await ctx.table("agentMessages").insert({
         agentThreadId: targetThreadId,
         role: "user",
         text: prompt,
         createdAt: now,
         isStreaming: true,
       });

       return { threadId: targetThreadId, messageId };
     },
   });

   // Internal: used by runtime to load the thread snapshot before streaming.
   export const getForRun = internalQuery({
     args: { threadId: v.id("agentThreads") },
     returns: v.any(),
     handler: async (ctx, { threadId }) => {
       return await ctx.table("agentThreads").getX(threadId);
     },
   });

   // Internal: used by runtime's onStepFinish mirror.
   export const persistStep = internalMutation({
     args: {
       threadId: v.id("agentThreads"),
       step: v.object({
         role: v.union(v.literal("assistant"), v.literal("tool"), v.literal("system")),
         text: v.optional(v.string()),
         toolCallsJson: v.optional(v.string()),
         tokensIn: v.optional(v.number()),
         tokensOut: v.optional(v.number()),
         modelId: v.optional(v.string()),
       }),
     },
     returns: v.null(),
     handler: async (ctx, { threadId, step }) => {
       await ctx.table("agentMessages").insert({
         agentThreadId: threadId,
         role: step.role,
         text: step.text,
         toolCallsJson: step.toolCallsJson,
         tokensIn: step.tokensIn,
         tokensOut: step.tokensOut,
         modelId: step.modelId,
         createdAt: Date.now(),
         isStreaming: false,
       });
       return null;
     },
   });

   export const loadForStream = internalQuery({
     args: { threadId: v.id("agentThreads") },
     returns: v.array(v.any()),
     handler: async (ctx, { threadId }) => {
       const thread = await ctx.table("agentThreads").getX(threadId);
       const messages = await thread.edge("agentMessages").order("asc");
       return messages.map((m) => ({
         role: m.role,
         content: m.text ?? "",
       }));
     },
   });

   export const listMessagesInternal = internalQuery({
     args: { threadId: v.id("agentThreads") },
     returns: v.array(v.any()),
     handler: async (ctx, { threadId }) => {
       const thread = await ctx.table("agentThreads").getX(threadId);
       return await thread.edge("agentMessages").order("asc");
     },
   });

   export const bumpReadCallCount = internalMutation({
     args: { threadId: v.id("agentThreads") },
     returns: v.null(),
     handler: async (ctx, { threadId }) => {
       const thread = await ctx.table("agentThreads").getX(threadId);
       await thread.patch({ readCallCount: thread.readCallCount + 1 });
       return null;
     },
   });

   export const writeSummary = internalMutation({
     args: {
       threadId: v.id("agentThreads"),
       summaryText: v.string(),
       summaryUpToMessageId: v.id("agentMessages"),
     },
     returns: v.null(),
     handler: async (ctx, { threadId, summaryText, summaryUpToMessageId }) => {
       const thread = await ctx.table("agentThreads").getX(threadId);
       await thread.patch({ summaryText, summaryUpToMessageId });
       return null;
     },
   });
   ```

   Note: `PROMPT_VERSION` import resolves in W2.08; for this task use a literal `"2026.04.20-1"` string constant inlined here, and add a `// W2.08 replaces with PROMPT_VERSION import` comment.

2. Append to [packages/backend/convex/http.ts](../packages/backend/convex/http.ts) (existing routes unchanged; spec §7.2 gives the full handler):

   ```ts
   import { z } from "zod";

   const SendBody = z.object({
     threadId: z.string().optional(),
     prompt: z.string().min(1).max(8192),
   });

   http.route({
     path: "/api/agent/send",
     method: "POST",
     handler: httpAction(async (ctx, request) => {
       const identity = await ctx.auth.getUserIdentity();
       if (!identity) return new Response("Unauthorized", { status: 401 });

       const viewer = await ctx.runQuery(internal.users.getByExternalId, {
         externalId: identity.subject,
       });
       if (!viewer) return new Response("No viewer", { status: 401 });

       let body: z.infer<typeof SendBody>;
       try {
         body = SendBody.parse(await request.json());
       } catch (err) {
         return Response.json({ error: "validation_failed", reason: String(err) }, { status: 400 });
       }

       const budget = await ctx.runQuery(internal.agent.budgets.checkHeadroom, {
         userId: viewer._id,
       });
       if (!budget.ok) {
         return Response.json(
           { error: "budget_exhausted", reason: budget.reason },
           { status: 429 },
         );
       }

       const { threadId, messageId } = await ctx.runMutation(
         internal.agent.threads.appendUserTurn,
         { userId: viewer._id, threadId: body.threadId as any, prompt: body.prompt },
       );

       await ctx.scheduler.runAfter(0, internal.agent.runtime.runAgentTurn, {
         userId: viewer._id,
         threadId,
         userMessageId: messageId,
       });

       return Response.json({ threadId, messageId });
     }),
   });
   ```

3. If `internal.users.getByExternalId` does not exist yet, add a trivial internal query to `packages/backend/convex/users/queries.ts` (or wherever the users module lives):

   ```ts
   export const getByExternalId = internalQuery({
     args: { externalId: v.string() },
     returns: v.any(),
     handler: async (ctx, { externalId }) => {
       return await ctx.table("users").get("externalId", externalId);
     },
   });
   ```

4. The `runAgentTurn` scheduled action does not yet exist; this will 500 at runtime. Add a temporary stub in `agent/runtime.ts` that logs and returns null so the HTTP route compiles. W2.10 replaces it.

   ```ts
   // packages/backend/convex/agent/runtime.ts (stub only; replaced in W2.10)
   import { v } from "convex/values";
   import { internalAction } from "../_generated/server";

   export const runAgentTurn = internalAction({
     args: {
       userId: v.id("users"),
       threadId: v.id("agentThreads"),
       userMessageId: v.id("agentMessages"),
     },
     returns: v.null(),
     handler: async () => {
       console.log("runAgentTurn stub; replaced by W2.10");
       return null;
     },
   });
   ```

5. Run `bun typecheck`; expect pass.

6. Smoke test the HTTP route via curl (dev deployment needs a Clerk JWT; use the dev-auth flow):
   ```bash
   curl -X POST "$CONVEX_SITE_URL/api/agent/send" \
     -H "Authorization: Bearer $TEST_JWT" \
     -H "Content-Type: application/json" \
     -d '{"prompt": "hello"}'
   # expect 200 with {"threadId": "...", "messageId": "..."}
   ```

**Test:**
- `bun typecheck` passes.
- HTTP smoke test returns 200 with valid IDs.
- Calling with invalid JWT returns 401.
- Calling with empty prompt returns 400.
- Missing JWT returns 401.
- `internal.agent.threads.appendUserTurn` rejects a `threadId` that does not belong to the caller (scripted test).

**Commit:**
```bash
gt create feat/agentic-home/W2-06-threads-http -m "feat(agent): add threads module and POST /api/agent/send"
gt submit
```

**Acceptance checklist:**
- [ ] `agent/threads.ts` created with public and internal exports.
- [ ] `POST /api/agent/send` route appended to `http.ts`.
- [ ] HTTP route returns 401, 400, 429, 200 in expected cases.
- [ ] Cross-thread ownership check throws.
- [ ] Stub `runAgentTurn` logs and returns null; the route doesn't hang.
- [ ] `bun typecheck` passes.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review clean.

---

## Task W2.07: Proposals module + TTL cron

**Recommended agent:** Claude Code (state-machine design, CAS semantics, cron wiring).
**Rationale:** The proposal state machine is cited by W3 and W5. Mistakes in CAS logic cause subtle bugs that surface only under concurrency. Claude Code's attention to auth-sensitive state transitions applies.
**Linear issue:** LIN-XXX

**Prerequisite PRs in stack:** W2.06.

**Scope:**
- Files:
  - Create: `packages/backend/convex/agent/proposals.ts`
  - Modify: `packages/backend/convex/crons.ts` (append only)

**Acceptance:**
- Public `listOpenProposals`, `get`, `confirm`, `cancel` exported.
- Internal `checkFirstTurnGuard`, `countOpenForThreadInternal`, `expireStaleInternal` exported.
- TTL cron entry added.
- CAS semantics verified with a scripted double-confirm / double-cancel.

**Steps:**

1. Create `packages/backend/convex/agent/proposals.ts` per [specs/W2-agent-backend.md](W2-agent-backend.md) §12.2. Copy the file verbatim, including comments. Note: `api.agent.tools.execute.executeConfirmedProposal` is referenced in `confirm`; the executor calls it but the body is W5's responsibility. W2.11 lands a stub that throws `not_yet_implemented`; once W5's PR lands, confirm flows end-to-end.

2. Append to [packages/backend/convex/crons.ts](../packages/backend/convex/crons.ts) (existing crons unchanged; append as the last row before the default export):

   ```ts
   crons.cron(
     "Expire stale proposals",
     { minutes: 5 },
     internal.agent.proposals.expireStaleInternal,
   );
   ```

3. Run `bun typecheck`; expect pass.

4. Smoke test CAS:
   ```ts
   // scratch
   const pid = await internal.testHelpers.seedProposal({ userId, threadId, state: "awaiting_confirmation" });
   await api.agent.proposals.confirm({ proposalId: pid });
   const second = await api.agent.proposals.confirm({ proposalId: pid });
   // expect second to return the already-confirmed row without error; no duplicate state transition.
   ```

5. Smoke test TTL cron:
   ```ts
   const pid = await internal.testHelpers.seedProposal({
     userId, threadId, state: "awaiting_confirmation", awaitingExpiresAt: Date.now() - 1000,
   });
   await internal.agent.proposals.expireStaleInternal(); // manually trigger
   const after = await ctx.table("agentProposals").getX(pid);
   // expect after.state === "timed_out" and a new system message in the thread.
   ```

   Seed helpers (`testHelpers.seedProposal`) live in a temporary test-only module; delete before merging the final PR in the stack.

**Test:**
- `bun typecheck` passes.
- CAS: double-confirm returns the same row with no duplicate state transition.
- CAS: cancel-after-confirm returns the already-confirmed row; the row's `state` stays `confirmed`.
- Timeout: seeded past-expiration row transitions to `timed_out` after manual cron trigger; system message appears.
- Ownership: `listOpenProposals` on another user's thread throws.

**Commit:**
```bash
gt create feat/agentic-home/W2-07-proposals -m "feat(agent): add proposals module and TTL cron"
gt submit
```

**Acceptance checklist:**
- [ ] `agent/proposals.ts` created with all public and internal exports.
- [ ] TTL cron registered.
- [ ] CAS semantics verified (double-confirm, double-cancel are no-ops).
- [ ] TTL cron smoke-tested: expired row to `timed_out` plus system message.
- [ ] Ownership check on `listOpenProposals` and `get` both throw on cross-user access.
- [ ] `bun typecheck` passes.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review clean.

---

## Task W2.08: System prompt + context composer + compaction + seed

**Recommended agent:** Claude Code (prompt crafting is not mechanical; composer parallelism matters; compaction touches model routing).
**Rationale:** System prompt text is product-critical. Context composer's `Promise.all` needs to be correct (wrong order can leak unwanted data). Compaction's Haiku call must fail gracefully. Cross-cutting enough to warrant Claude Code.
**Linear issue:** LIN-XXX

**Prerequisite PRs in stack:** W2.07.

**Scope:**
- Files:
  - Create: `packages/backend/convex/agent/system.ts`
  - Create: `packages/backend/convex/agent/context.ts`
  - Create: `packages/backend/convex/agent/compaction.ts`
  - Create: `packages/backend/convex/migrations/seedPromptVersion.ts`

**Acceptance:**
- `SYSTEM_PROMPT_MD`, `PROMPT_VERSION`, `renderSystemPrompt` exported from `system.ts`.
- `compose` internal query exported from `context.ts`.
- `maybeCompact` internal action, `runClassifierInternal` internal action exported from `compaction.ts`.
- `seedPromptVersion` migration inserts the initial `promptVersions` row.
- The `agentThreads.promptVersion` default flips from the W2.06 literal string to `PROMPT_VERSION` imported from `system.ts`.

**Steps:**

1. Create [packages/backend/convex/agent/system.ts](../packages/backend/convex/agent/system.ts) per spec §9.1. Copy `SYSTEM_PROMPT_MD` and `PROMPT_VERSION` constants; implement `renderSystemPrompt`.

2. Create [packages/backend/convex/agent/context.ts](../packages/backend/convex/agent/context.ts) per spec §9.2. Use `Promise.all` on the four reads. If any downstream internal query does not exist yet (e.g., `internal.creditCards.queries.listInternal`), add a trivial wrapper to the existing domain module.

3. Create [packages/backend/convex/agent/compaction.ts](../packages/backend/convex/agent/compaction.ts) per spec §9.3. The `runClassifierInternal` is an `internalAction` that calls AI SDK's `generateText` with the Haiku model; falls back to `""` on error and logs.

   ```ts
   export const runClassifierInternal = internalAction({
     args: { messages: v.array(v.any()) },
     returns: v.string(),
     handler: async (ctx, { messages }) => {
       try {
         const { generateText } = await import("ai");
         const { getAnthropicModel, AGENT_CLASSIFIER_MODEL } = await import("./config");
         const modelId = process.env.AGENT_MODEL_CLASSIFIER ?? AGENT_CLASSIFIER_MODEL;
         const result = await generateText({
           model: getAnthropicModel(modelId),
           system: "Summarise the conversation so far in under 800 tokens. Preserve names, dates, amounts.",
           messages: messages.map((m) => ({ role: m.role, content: m.text ?? "" })),
         });
         return result.text;
       } catch (err) {
         console.error("compaction failed", err);
         return "";
       }
     },
   });
   ```

4. Create [packages/backend/convex/migrations/seedPromptVersion.ts](../packages/backend/convex/migrations/seedPromptVersion.ts):

   ```ts
   import { v } from "convex/values";
   import { internalMutation, internalQuery } from "../functions";
   import { SYSTEM_PROMPT_MD, PROMPT_VERSION } from "../agent/system";
   import { AGENT_DEFAULT_MODEL, AGENT_CLASSIFIER_MODEL } from "../agent/config";

   /**
    * Run once: `npx convex run migrations.seedPromptVersion:seed`.
    * Idempotent by version string.
    */
   export const seed = internalMutation({
     args: {},
     returns: v.null(),
     handler: async (ctx) => {
       const rows = await ctx.table("promptVersions", "by_version", (q) =>
         q.eq("version", PROMPT_VERSION),
       );
       if (rows.length > 0) return null;
       await ctx.table("promptVersions").insert({
         version: PROMPT_VERSION,
         systemPromptMd: SYSTEM_PROMPT_MD,
         modelDefault: AGENT_DEFAULT_MODEL,
         modelClassifier: AGENT_CLASSIFIER_MODEL,
         activatedAt: Date.now(),
         notes: "Initial W2 prompt.",
       });
       return null;
     },
   });

   /**
    * Used by the prompt-drift lint (W2.09).
    */
   export const dumpCurrent = internalQuery({
     args: {},
     returns: v.optional(v.any()),
     handler: async (ctx) => {
       const rows = await ctx.table("promptVersions").order("desc", "activatedAt");
       return rows[0] ?? undefined;
     },
   });
   ```

5. Update `agent/threads.ts` `appendUserTurn` to import `PROMPT_VERSION` from `./system` instead of the W2.06 literal string:

   ```ts
   import { PROMPT_VERSION } from "./system";
   // ...
   const targetThreadId = await ctx.table("agentThreads").insert({
     // ...
     promptVersion: PROMPT_VERSION,
     // ...
   });
   ```

6. Run the migration:
   ```bash
   cd packages/backend
   npx convex run migrations.seedPromptVersion:seed
   ```
   Verify via dashboard: exactly one `promptVersions` row.

7. Run `bun typecheck`; expect pass.

**Test:**
- `bun typecheck` passes.
- `promptVersions` has one row with `version === PROMPT_VERSION`.
- Context composer: seed a test user with one account, one card, one active promo; call `compose`; assert output contains `Today:`, `Accounts: 1`, `Credit cards: 1`, `Active deferred-interest promos: 1`, `Open proposals awaiting confirmation: 0`.
- Compaction: seed a thread with 50 messages; call `maybeCompact`; assert `thread.summaryText` is non-empty and `summaryUpToMessageId` is set.
- Compaction fallback: temporarily unset `ANTHROPIC_API_KEY`; call `maybeCompact`; assert handler returns without throwing and `summaryText` is not updated (or is empty).

**Commit:**
```bash
gt create feat/agentic-home/W2-08-system-context-compaction -m "feat(agent): add system prompt, context composer, compaction, seed migration"
gt submit
```

**Acceptance checklist:**
- [ ] `agent/system.ts` contains the full SYSTEM_PROMPT_MD string and PROMPT_VERSION.
- [ ] `agent/context.ts` parallelises four reads via `Promise.all`.
- [ ] `agent/compaction.ts` handles Haiku failure by returning "" and logging.
- [ ] `seedPromptVersion:seed` ran and is idempotent (second run is a no-op).
- [ ] `appendUserTurn` uses `PROMPT_VERSION` from `system.ts`.
- [ ] `bun typecheck` passes.
- [ ] Context-compose smoke test matches expected output.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review clean.

---

## Task W2.09: RAG scaffold + prompt-drift lint

**Recommended agent:** Codex (well-specified scaffolding + lint script).
**Rationale:** RAG stub is mechanical copy-paste with clear TODO markers. Lint script is a small Bun script using `Bun.$` for safe shell interop. Both fit Codex's well-specified execution profile per master prompt §6.
**Linear issue:** LIN-XXX

**Prerequisite PRs in stack:** W2.08.

**Scope:**
- Files:
  - Create: `packages/backend/convex/agent/rag.ts`
  - Create: `packages/backend/scripts/lint-prompt-drift.ts`
  - Modify: `packages/backend/package.json` (add `lint:prompt-drift` script)

**Acceptance:**
- `embedTransactionForRag`, `deleteTransactionFromRag` exported as internal mutations that log and no-op.
- Lint script exits 0 when current `SYSTEM_PROMPT_MD` matches the latest `promptVersions` row for `PROMPT_VERSION`.
- Lint script exits 1 when they differ.

**Steps:**

1. Create [packages/backend/convex/agent/rag.ts](../packages/backend/convex/agent/rag.ts):

   ```ts
   import { v } from "convex/values";
   import { internalMutation } from "../functions";

   /**
    * SCAFFOLD ONLY at M3: `search_transactions` is deferred per
    * specs/00-contracts.md §2.4 and specs/W2-agent-backend.md §3.5.
    * These handlers log and no-op. Post-M3, a follow-up PR wires them to
    * `components.rag.add(...)` / `components.rag.delete(...)`.
    */

   export const embedTransactionForRag = internalMutation({
     args: {
       userId: v.id("users"),
       plaidTransactionId: v.string(),
       text: v.string(),
       pendingDate: v.optional(v.number()),
     },
     returns: v.null(),
     handler: async (_ctx, args) => {
       console.debug("[rag-scaffold] embedTransactionForRag called; ignored at MVP", {
         plaidTransactionId: args.plaidTransactionId,
         textLength: args.text.length,
       });
       return null;
     },
   });

   export const deleteTransactionFromRag = internalMutation({
     args: {
       userId: v.id("users"),
       plaidTransactionId: v.string(),
     },
     returns: v.null(),
     handler: async (_ctx, args) => {
       console.debug("[rag-scaffold] deleteTransactionFromRag called; ignored at MVP", args);
       return null;
     },
   });
   ```

2. Create [packages/backend/scripts/lint-prompt-drift.ts](../packages/backend/scripts/lint-prompt-drift.ts). Uses Bun's `$` template tag (auto-escapes; safe from shell injection):

   ```ts
   #!/usr/bin/env bun
   /**
    * Fail the build if agent/system.ts is edited without bumping PROMPT_VERSION.
    * Run via: `bun run lint:prompt-drift`.
    *
    * Uses Bun.$ template tag for safe shell interop (auto-escapes arguments;
    * no shell injection surface). See https://bun.sh/docs/runtime/shell.
    */
   import { $ } from "bun";
   import { SYSTEM_PROMPT_MD, PROMPT_VERSION } from "../convex/agent/system";

   function fail(msg: string): never {
     process.stderr.write(msg + "\n");
     process.exit(1);
   }

   // Fixed argv: no user-interpolated data; safe with Bun.$.
   const raw = await $`npx convex run --json internal.migrations.seedPromptVersion:dumpCurrent`
     .quiet()
     .nothrow()
     .text();

   const latest = raw.trim() ? JSON.parse(raw) : null;

   if (!latest) {
     process.stdout.write(
       "No promptVersions row yet; run seedPromptVersion:seed first. Skipping drift check.\n",
     );
     process.exit(0);
   }

   if (latest.version === PROMPT_VERSION && latest.systemPromptMd !== SYSTEM_PROMPT_MD) {
     fail(
       `Prompt drift: agent/system.ts changed but PROMPT_VERSION "${PROMPT_VERSION}" ` +
         `already exists in promptVersions with different text. Bump PROMPT_VERSION and ` +
         `re-run seedPromptVersion:seed.`,
     );
   }

   process.stdout.write(`Prompt version ${PROMPT_VERSION} in sync with promptVersions row.\n`);
   ```

3. Update `packages/backend/package.json`:

   ```json
   {
     "scripts": {
       "dev": "convex dev --tail-logs",
       "deploy": "convex deploy",
       "setup": "convex dev --once",
       "typecheck": "tsc --noEmit",
       "lint:prompt-drift": "bun run scripts/lint-prompt-drift.ts"
     }
   }
   ```

4. Run the lint script locally:
   ```bash
   cd packages/backend
   bun run lint:prompt-drift
   # expect: "Prompt version 2026.04.20-1 in sync with promptVersions row."
   ```

5. Test failure path: temporarily edit `SYSTEM_PROMPT_MD` to add a period. Run the script; expect exit 1 with the drift message. Revert.

**Test:**
- `bun typecheck` passes.
- `bun run lint:prompt-drift` exits 0 when in-sync.
- `bun run lint:prompt-drift` exits 1 when `SYSTEM_PROMPT_MD` diverges from the stored row without a version bump.

**Commit:**
```bash
gt create feat/agentic-home/W2-09-rag-stub-and-lint -m "feat(agent): add RAG scaffold and prompt-drift lint"
gt submit
```

**Acceptance checklist:**
- [ ] `agent/rag.ts` stubs created; every handler logs with a `[rag-scaffold]` prefix and no-ops.
- [ ] `scripts/lint-prompt-drift.ts` created; in-sync and drift cases both tested.
- [ ] `package.json` has `lint:prompt-drift` script.
- [ ] `bun typecheck` passes.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review clean.

---

## Task W2.10: Registry + runtime

**Recommended agent:** Claude Code (load-bearing cross-file wiring; AI SDK integration; multiple downstream consumers).
**Rationale:** `registry.ts` is the `AgentToolRegistry` contract (spec §10, contracts §2). `runtime.ts` wires streamText, tool building, usage mirroring, and compaction in one place. Claude Code's multi-file-context profile fits.
**Linear issue:** LIN-XXX

**Prerequisite PRs in stack:** W2.09.

**Scope:**
- Files:
  - Create: `packages/backend/convex/agent/registry.ts`
  - Modify: `packages/backend/convex/agent/runtime.ts` (replace the W2.06 stub)

**Acceptance:**
- `AGENT_TOOLS` exported from `registry.ts` with 25 entries (13 reads + 1 plaid-health stub + 1 get_proposal + 1 trigger_plaid_resync + 6 propose + 3 execute-family).
- `runAgentTurn` replaced with the real implementation.
- `buildToolsForAgent` helper exported.
- Calling `POST /api/agent/send` with a prompt results in at least one assistant `agentMessages` row within 30 s (with a valid `ANTHROPIC_API_KEY`).

**Steps:**

1. Create [packages/backend/convex/agent/registry.ts](../packages/backend/convex/agent/registry.ts). The file is mechanical: 25 entries, each matching the shape in spec §10.5. For each tool, reference `internal.agent.tools.<category>.<camelCase>`. Handler references to bodies that do not yet exist (proposes, executes) point to stubs that will land in W2.11/W2.12; TypeScript will surface errors if the `internal` reference is wrong.

   Structure:
   ```ts
   import { z } from "zod";
   import { internal } from "../_generated/api";
   import type { BucketName } from "./rateLimits";

   export type ToolCategory = "read" | "propose" | "execute" | "plaid" | "introspect";

   export interface ToolDef {
     description: string;
     llmInputSchema: z.ZodTypeAny;
     handler: any; // Convex function reference (internal.agent.tools.X.Y)
     handlerType: "query" | "mutation";
     bucket: BucketName;
     ownership: "W2" | "W5" | "W6";
     category: ToolCategory;
     firstTurnGuard: boolean;
     incrementsReadCount: boolean;
   }

   export const AGENT_TOOLS = {
     list_accounts: {
       description: "List the user's bank and credit card accounts, optionally filtered by type.",
       llmInputSchema: z.object({
         type: z.enum(["checking","savings","credit_card","loan","investment"]).optional(),
       }),
       handler: internal.agent.tools.read.listAccounts,
       handlerType: "query",
       bucket: "read_cheap",
       ownership: "W2",
       category: "read",
       firstTurnGuard: false,
       incrementsReadCount: true,
     },
     // ... 24 more entries; see spec §10
   } satisfies Record<string, ToolDef>;

   export type ToolName = keyof typeof AGENT_TOOLS;
   ```

   For each of the 25 tools, copy the shape. The propose and execute-family tools point at `internal.agent.tools.propose.*` and `internal.agent.tools.execute.*`; if those do not compile yet (because W2.11/W2.12 have not landed), the handler references resolve only after those tasks merge. Two options:
   - Preferred: land minimal stub files for propose and execute handlers in this task (one-liner throwing `not_yet_implemented`) so the registry compiles cleanly; W2.11/W2.12 replace bodies.
   - Alternative: use `// @ts-expect-error W2.11 lands this` inline; remove as the later tasks land.

2. Replace the stub in `agent/runtime.ts` with the real runtime from spec §8.2. Key implementations:

   - `runAgentTurn` opens the thread, loads context, calls `streamText` with the tools from `buildToolsForAgent`.
   - `buildToolsForAgent` per spec §8.3: iterates `AGENT_TOOLS`, wraps each handler with the rate-limit check, first-turn guard, handler dispatch, readCount increment, per-tool-call cap.
   - `routeModel` picks Sonnet default, Haiku for classification subtasks (future hook; MVP always returns Sonnet).

3. Run `bun typecheck`; expect pass. If the registry references an internal function that does not exist, typecheck flags it; add a minimal stub in `agent/tools/<category>/<file>.ts` that throws "not yet implemented; see W2.11/W2.12". Those stubs are replaced in the next two tasks.

4. End-to-end smoke test:

   ```bash
   # Terminal 1: bun dev (Convex + app)
   # Terminal 2:
   curl -X POST "$CONVEX_SITE_URL/api/agent/send" \
     -H "Authorization: Bearer $TEST_JWT" \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Hello, what can you do?"}'
   # expect 200 {"threadId": "...", "messageId": "..."}

   # Terminal 3 (Convex dashboard):
   # After ~10s, observe a new assistant row in `agentMessages` for the returned threadId.
   # The assistant message should be a short greeting, not a tool call (no tools listed yet).
   ```

5. If the component's `streamText` fails because tool handlers reference stubs that throw, the assistant's response surfaces the error textually; acceptable for this task. The next two tasks land real handler bodies.

**Test:**
- `bun typecheck` passes.
- Registry has 25 entries (count via a script or manual audit against [specs/00-contracts.md](00-contracts.md) §2).
- End-to-end smoke: `POST /api/agent/send` triggers an assistant message within 30 s.
- `agentUsage` row created for the test user with non-zero `tokensIn` and `tokensOut`.

**Commit:**
```bash
gt create feat/agentic-home/W2-10-registry-runtime -m "feat(agent): add tool registry and runtime loop"
gt submit
```

**Acceptance checklist:**
- [ ] `AGENT_TOOLS` has exactly 25 entries.
- [ ] Each entry has description, llmInputSchema, handler reference, handlerType, bucket, ownership, category, firstTurnGuard, incrementsReadCount.
- [ ] `runAgentTurn` replaces the W2.06 stub.
- [ ] `buildToolsForAgent` enforces rate limit, first-turn guard, handler dispatch, readCount increment, truncation.
- [ ] End-to-end smoke test produces an assistant message.
- [ ] `agentUsage` row appears post-stream.
- [ ] `bun typecheck` passes.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review clean.

---

## Task W2.11: Read tool handler bodies (14 tools)

**Recommended agent:** Codex (well-specified per-tool bodies once the wrapper pattern is set).
**Rationale:** Each read tool body is a small query composition over existing Convex functions. Master prompt §6 recommends Codex for "per-tool implementation once the base wrapper exists." Boilerplate-heavy.
**Linear issue:** LIN-XXX

**Prerequisite PRs in stack:** W2.10.

**Scope:**
- Files (create each):
  - `packages/backend/convex/agent/tools/read/listAccounts.ts`
  - `packages/backend/convex/agent/tools/read/getAccountDetail.ts`
  - `packages/backend/convex/agent/tools/read/listTransactions.ts`
  - `packages/backend/convex/agent/tools/read/getTransactionDetail.ts`
  - `packages/backend/convex/agent/tools/read/listCreditCards.ts`
  - `packages/backend/convex/agent/tools/read/getCreditCardDetail.ts`
  - `packages/backend/convex/agent/tools/read/listDeferredInterestPromos.ts`
  - `packages/backend/convex/agent/tools/read/listInstallmentPlans.ts`
  - `packages/backend/convex/agent/tools/read/getSpendByCategory.ts`
  - `packages/backend/convex/agent/tools/read/getSpendOverTime.ts`
  - `packages/backend/convex/agent/tools/read/getUpcomingStatements.ts`
  - `packages/backend/convex/agent/tools/read/listReminders.ts`
  - `packages/backend/convex/agent/tools/read/searchMerchants.ts`
  - `packages/backend/convex/agent/tools/read/getPlaidHealth.ts` (stub until W4 publishes `getPlaidItemHealth`)

**Acceptance:**
- All 14 read-tool handlers exported as `agentQuery`.
- Each wraps an existing domain query or composes from W0-audit-listed sources.
- Each returns a type that matches its Zod output in the registry.
- `bun typecheck` passes.

**Steps:**

1. For each read tool, create the file per spec §6.3's example. The pattern:

   ```ts
   // packages/backend/convex/agent/tools/read/<camelCase>.ts
   import { v } from "convex/values";
   import { agentQuery } from "../../functions";
   // import { internal } from "../../_generated/api"; // if needed

   export const <camelCase> = agentQuery({
     args: {
       userId: v.id("users"),
       // ...tool-specific args; match the Zod from registry.ts
     },
     returns: v.any(), // refine per tool; see spec §10
     handler: async (ctx, args) => {
       const viewer = ctx.viewerX();
       // implement query; use viewer for ownership
       return /* result */;
     },
   });
   ```

2. For each tool, cite the source from W0 and/or spec §10.1:

   - **`list_accounts`** (#1): `ctx.runQuery(internal.plaidComponent.getAccountsByUserId, { userId: viewer._id })`. Optional `type` filter.
   - **`get_account_detail`** (#2): component accounts query + balances; include only accounts owned by viewer.
   - **`list_transactions`** (#3): `ctx.runQuery(internal.transactions.queries.getByUser, {...})` with filter + `transactionOverlays` join in a helper.
   - **`get_transaction_detail`** (#4): fetch one transaction + overlay + enrichment.
   - **`list_credit_cards`** (#5): `await viewer.edge("creditCards")` filtered by `isActive` unless `includeInactive: true`.
   - **`get_credit_card_detail`** (#6): compose card + `computeInterestSavingBalance` + `computeYtdFeesInterest` queries.
   - **`list_deferred_interest_promos`** (#7): filter `promoRates` by `isActive: true` (or include expired if arg); compute `daysToExpiration` inline. Comment: "Switches to `promoCountdowns` in W6 follow-up (contracts §17)."
   - **`list_installment_plans`** (#8): `installmentPlans/queries` by viewer.
   - **`get_spend_by_category`** (#9): aggregate `plaidTransactions` by `categoryPrimary` (or `categoryDetailed`) in a date range.
   - **`get_spend_over_time`** (#10): aggregate by day/week/month.
   - **`get_upcoming_statements`** (#11): filter cards with `statementClosingDay` in next N days; compute date. Comment: "Switches to `statementReminders` in W6 follow-up (contracts §17)."
   - **`list_reminders`** (#12): `viewer.edge("reminders")` filtered by `isDone: false` and `dueAt` window.
   - **`search_merchants`** (#13): literal fuzzy over distinct `merchantName` + `counterpartyName` in `plaidTransactions`. Levenshtein-free: lowercase match with substring scoring. Return top N by transaction count.
   - **`get_plaid_health`** (#14): STUB. Return `{ items: [] }`. Comment: "Stub until W4's `getPlaidItemHealth` query publishes (contracts §5.4)."

3. Each tool's return shape should match W3's `ToolOutput<TPreview>` contract:

   ```ts
   return {
     ids: accounts.map((a: any) => a.accountId),
     preview: { accounts, live: true, capturedAt: new Date().toISOString() },
     window: undefined,
   };
   ```

   (For tools with a date range, populate `window`.)

4. Run `bun typecheck` from root. Fix any missing internal-function references by adding trivial wrappers to existing domain files (e.g., `creditCards/queries.ts` may need a `listInternal` wrapper).

5. End-to-end smoke test each tool via the Convex dashboard:
   ```ts
   await internal.agent.tools.read.listAccounts({ userId: "<test-user>" });
   // expect { ids: [...], preview: { accounts: [...], live: true, capturedAt: "..." } }
   ```

6. End-to-end agent smoke test:
   ```bash
   curl -X POST "$CONVEX_SITE_URL/api/agent/send" \
     -H "Authorization: Bearer $TEST_JWT" \
     -H "Content-Type: application/json" \
     -d '{"prompt": "What credit cards do I have?"}'
   # Within 30s, a new assistant message should cite 1-2 card names from the seeded test user.
   # The agentMessages log should show a tool call to list_credit_cards.
   ```

**Test:**
- `bun typecheck` passes.
- Each of the 14 tools returns a valid `ToolOutput` when invoked directly via `internal.agent.tools.read.*`.
- Agent smoke test: a card-related prompt triggers `list_credit_cards` and the assistant response mentions a card name from seed data.
- Ownership: calling `get_transaction_detail` with another user's `plaidTransactionId` returns `not_found` (via the existing domain query's own filter).

**Commit:**
```bash
gt create feat/agentic-home/W2-11-read-tools -m "feat(agent): implement 14 read-tool handlers"
gt submit
```

**Acceptance checklist:**
- [ ] All 14 files created; exports match registry references.
- [ ] Each handler resolves viewer via `ctx.viewerX()` and scopes ownership.
- [ ] Return shapes match `ToolOutput<TPreview>`.
- [ ] `list_deferred_interest_promos` has the W6-switch comment.
- [ ] `get_upcoming_statements` has the W6-switch comment.
- [ ] `get_plaid_health` has the W4-switch comment and returns `{ items: [] }`.
- [ ] Agent smoke test shows a tool call in `agentMessages` and a relevant assistant response.
- [ ] `bun typecheck` passes.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review (Claude Code) clean.

---

## Task W2.12: Execute stubs + get_proposal + trigger_plaid_resync

**Recommended agent:** Codex (Claude Code reviews) for the stubs and straightforward proposal/resync handlers.
**Rationale:** Execute stubs are defensive placeholders; get_proposal and trigger_plaid_resync are short handlers that match established patterns. Codex-friendly.
**Linear issue:** LIN-XXX

**Prerequisite PRs in stack:** W2.11.

**Scope:**
- Files:
  - Create: `packages/backend/convex/agent/tools/execute/executeConfirmedProposal.ts` (stub; W5 fills body)
  - Create: `packages/backend/convex/agent/tools/execute/cancelProposal.ts` (thin wrapper over `agent/proposals.ts::cancel` for registry visibility)
  - Create: `packages/backend/convex/agent/tools/execute/undoMutation.ts` (stub; W5 fills body)
  - Create: `packages/backend/convex/agent/tools/read/getProposal.ts`
  - Create: `packages/backend/convex/agent/tools/execute/triggerPlaidResync.ts`

**Acceptance:**
- `execute_confirmed_proposal` stub throws `{ error: "not_yet_implemented", message: "W5 ships body" }`.
- `cancel_proposal` tool wraps the `proposals.cancel` mutation via `agentMutation`.
- `undo_mutation` stub throws similarly.
- `get_proposal` returns the proposal row (ownership-checked).
- `trigger_plaid_resync` validates ownership, schedules `syncPlaidItemInternal`, returns counts.
- Agent can call `cancel_proposal` and `get_proposal` end-to-end.

**Steps:**

1. Create `packages/backend/convex/agent/tools/execute/executeConfirmedProposal.ts`:

   ```ts
   import { v } from "convex/values";
   import { agentMutation } from "../../functions";

   /**
    * STUB for M3 W2. Full body lives in W5.
    * Registry registers this handler; runtime invokes it; body throws until W5.
    */
   export const executeConfirmedProposal = agentMutation({
     args: {
       userId: v.id("users"),
       threadId: v.id("agentThreads"),
       proposalId: v.id("agentProposals"),
     },
     returns: v.any(),
     handler: async () => {
       throw new Error("not_yet_implemented: W5 ships execute_confirmed_proposal body");
     },
   });
   ```

2. Create `packages/backend/convex/agent/tools/execute/cancelProposal.ts`:

   ```ts
   import { v } from "convex/values";
   import { agentMutation } from "../../functions";

   export const cancelProposal = agentMutation({
     args: {
       userId: v.id("users"),
       threadId: v.id("agentThreads"),
       proposalId: v.id("agentProposals"),
     },
     returns: v.any(),
     handler: async (ctx, { proposalId }) => {
       const viewer = ctx.viewerX();
       const proposal = await ctx.table("agentProposals").getX(proposalId);
       if (proposal.userId !== viewer._id) {
         throw new Error("Not authorized");
       }
       if (proposal.state !== "awaiting_confirmation") {
         return proposal;
       }
       await proposal.patch({ state: "cancelled" });
       return { ...proposal, state: "cancelled" };
     },
   });
   ```

3. Create `packages/backend/convex/agent/tools/execute/undoMutation.ts`:

   ```ts
   import { v } from "convex/values";
   import { agentMutation } from "../../functions";

   /**
    * STUB for M3 W2. W5 ships the body that decodes the reversalToken,
    * verifies ownership, checks undoExpiresAt, and applies the reversal.
    */
   export const undoMutation = agentMutation({
     args: {
       userId: v.id("users"),
       threadId: v.id("agentThreads"),
       reversalToken: v.string(),
     },
     returns: v.any(),
     handler: async () => {
       throw new Error("not_yet_implemented: W5 ships undo_mutation body");
     },
   });
   ```

4. Create `packages/backend/convex/agent/tools/read/getProposal.ts`:

   ```ts
   import { v } from "convex/values";
   import { agentQuery } from "../../functions";

   export const getProposal = agentQuery({
     args: {
       userId: v.id("users"),
       proposalId: v.id("agentProposals"),
     },
     returns: v.any(),
     handler: async (ctx, { proposalId }) => {
       const viewer = ctx.viewerX();
       const proposal = await ctx.table("agentProposals").getX(proposalId);
       if (proposal.userId !== viewer._id) {
         throw new Error("Not authorized");
       }
       return {
         ids: [proposal._id],
         preview: {
           proposal,
           live: true,
           capturedAt: new Date().toISOString(),
         },
         window: undefined,
       };
     },
   });
   ```

5. Create `packages/backend/convex/agent/tools/execute/triggerPlaidResync.ts`:

   ```ts
   import { v } from "convex/values";
   import { agentMutation } from "../../functions";
   import { internal } from "../../_generated/api";

   export const triggerPlaidResync = agentMutation({
     args: {
       userId: v.id("users"),
       threadId: v.id("agentThreads"),
       plaidItemId: v.optional(v.string()),
       scope: v.optional(v.union(
         v.literal("accounts"),
         v.literal("transactions"),
         v.literal("liabilities"),
         v.literal("all"),
       )),
     },
     returns: v.object({
       scheduledAt: v.number(),
       itemsQueued: v.number(),
     }),
     handler: async (ctx, { plaidItemId }) => {
       const viewer = ctx.viewerX();
       const items = plaidItemId
         ? [{ plaidItemId, userId: viewer._id }]
         : await ctx.runQuery(internal.plaidComponent.getActiveItemsByUserId, {
             userId: viewer._id,
           });

       if (plaidItemId) {
         const ok = await ctx.runQuery(internal.plaidComponent.ownsItem, {
           userId: viewer._id,
           plaidItemId,
         });
         if (!ok) throw new Error("Not authorized");
       }

       const scheduledAt = Date.now();
       for (const item of items) {
         await ctx.scheduler.runAfter(0, internal.plaidComponent.syncPlaidItemInternal, {
           plaidItemId: item.plaidItemId,
         });
       }

       return { scheduledAt, itemsQueued: items.length };
     },
   });
   ```

   If `internal.plaidComponent.getActiveItemsByUserId` or `ownsItem` does not exist, add thin wrappers to `packages/backend/convex/plaidComponent.ts` in this PR.

6. Run `bun typecheck`; expect pass.

7. Smoke test each:
   ```ts
   // get_proposal: seed an awaiting_confirmation proposal, then:
   await api.agent.proposals.get({ proposalId: "<pid>" });
   // expect the proposal row

   // cancel_proposal: from the chat
   curl ... '{"prompt": "Cancel the last proposal."}'
   // the agent should call cancel_proposal if a proposal exists

   // trigger_plaid_resync:
   curl ... '{"prompt": "Resync my Plaid data."}'
   // observe syncPlaidItemInternal scheduled via Convex logs
   ```

**Test:**
- `bun typecheck` passes.
- `get_proposal` returns the seeded proposal; ownership check throws on cross-user access.
- `cancel_proposal` transitions `awaiting_confirmation` to `cancelled`; second call is a no-op.
- `trigger_plaid_resync` schedules `syncPlaidItemInternal` per item; count matches active items.
- `execute_confirmed_proposal` and `undo_mutation` throw "not_yet_implemented".

**Commit:**
```bash
gt create feat/agentic-home/W2-12-execute-stubs-and-intros -m "feat(agent): add execute stubs, get_proposal, trigger_plaid_resync"
gt submit
```

**Acceptance checklist:**
- [ ] All 5 files created.
- [ ] `execute_confirmed_proposal` and `undo_mutation` throw with clear "W5 ships body" messages.
- [ ] `cancel_proposal` successfully transitions state.
- [ ] `get_proposal` ownership-checks.
- [ ] `trigger_plaid_resync` schedules per-item sync.
- [ ] `bun typecheck` passes.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review (Claude Code) clean.

---

## Task W2.13: Admin cost query + acceptance smoke tests

**Recommended agent:** Codex (well-specified query + end-to-end smoke test script).
**Rationale:** `agentUsage` aggregation is a single internal query. Acceptance smoke tests are a bash script. Master prompt §6 Codex territory.
**Linear issue:** LIN-XXX

**Prerequisite PRs in stack:** W2.12.

**Scope:**
- Files:
  - Create: `packages/backend/convex/agent/usage.ts`
  - Create: `packages/backend/scripts/w2-acceptance.sh`

**Acceptance:**
- `summariseByUser` internal query returns aggregated usage for a period.
- Acceptance script runs all 13 items from spec §18; passes on a seeded dev deployment.

**Steps:**

1. Create `packages/backend/convex/agent/usage.ts`:

   ```ts
   import { v } from "convex/values";
   import { internalQuery } from "../functions";

   export const summariseByUser = internalQuery({
     args: { periodStart: v.number() },
     returns: v.array(v.object({
       userId: v.id("users"),
       tokensIn: v.number(),
       tokensOut: v.number(),
       usdMicrocents: v.number(),
       toolCallCount: v.number(),
       threadCount: v.number(),
     })),
     handler: async (ctx, { periodStart }) => {
       const rows = await ctx.table("agentUsage", "by_user_period", (q) =>
         q.gte("periodStart", periodStart),
       );
       const byUser = new Map<string, { tokensIn: number; tokensOut: number; usdMicrocents: number; toolCallCount: number }>();
       for (const r of rows) {
         const k = r.userId as any as string;
         const acc = byUser.get(k) ?? { tokensIn: 0, tokensOut: 0, usdMicrocents: 0, toolCallCount: 0 };
         acc.tokensIn += r.tokensIn;
         acc.tokensOut += r.tokensOut;
         acc.usdMicrocents += r.usdMicrocents;
         acc.toolCallCount += r.toolCallCount;
         byUser.set(k, acc);
       }
       const result = [];
       for (const [userId, acc] of byUser) {
         const threads = await ctx.table("agentThreads", "by_user_lastTurnAt", (q) =>
           q.eq("userId", userId as any),
         );
         result.push({
           userId: userId as any,
           ...acc,
           threadCount: threads.length,
         });
       }
       return result;
     },
   });

   export const lastThreadTurn = internalQuery({
     args: { threadId: v.id("agentThreads") },
     returns: v.optional(v.object({ tokensIn: v.number() })),
     handler: async (ctx, { threadId }) => {
       const messages = await ctx.table("agentMessages", "by_thread_createdAt", (q) =>
         q.eq("agentThreadId", threadId),
       );
       const reversed = [...messages].reverse();
       const last = reversed.find((m) => m.role === "assistant" && m.tokensIn !== undefined);
       return last ? { tokensIn: last.tokensIn ?? 0 } : undefined;
     },
   });
   ```

2. Create `packages/backend/scripts/w2-acceptance.sh`:

   ```bash
   #!/usr/bin/env bash
   # W2 acceptance smoke. Run once per branch cut before stack submission.
   # Requires: dev Convex running, TEST_JWT set, CONVEX_SITE_URL set, seeded test user.
   set -euo pipefail

   : "${CONVEX_SITE_URL:?set CONVEX_SITE_URL}"
   : "${TEST_JWT:?set TEST_JWT}"

   ROOT=$(git rev-parse --show-toplevel)

   echo "1. Typecheck..."
   (cd "$ROOT" && bun typecheck)

   echo "2. Schema apply..."
   (cd "$ROOT/packages/backend" && npx convex dev --once)

   echo "3. HTTP 401 on no-auth..."
   status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$CONVEX_SITE_URL/api/agent/send" \
     -H "Content-Type: application/json" -d '{"prompt":"x"}')
   [ "$status" = "401" ] || { echo "FAIL: expected 401, got $status"; exit 1; }

   echo "4. HTTP 200 on valid..."
   body=$(curl -s -X POST "$CONVEX_SITE_URL/api/agent/send" \
     -H "Authorization: Bearer $TEST_JWT" \
     -H "Content-Type: application/json" \
     -d '{"prompt":"List my accounts."}')
   echo "$body" | jq -e '.threadId and .messageId' >/dev/null \
     || { echo "FAIL: 200 body missing keys: $body"; exit 1; }

   echo "5. Prompt-drift lint..."
   (cd "$ROOT/packages/backend" && bun run lint:prompt-drift)

   echo "6. Budget cap test..."
   (cd "$ROOT/packages/backend" && \
     npx convex env set AGENT_BUDGET_MONTHLY_TOKENS 1 && \
     sleep 2)
   status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$CONVEX_SITE_URL/api/agent/send" \
     -H "Authorization: Bearer $TEST_JWT" \
     -H "Content-Type: application/json" \
     -d '{"prompt":"hi"}')
   (cd "$ROOT/packages/backend" && npx convex env set AGENT_BUDGET_MONTHLY_TOKENS 1000000)
   [ "$status" = "429" ] || { echo "FAIL: expected 429, got $status"; exit 1; }

   echo "All W2 acceptance checks passed."
   ```

3. Make the script executable:
   ```bash
   chmod +x packages/backend/scripts/w2-acceptance.sh
   ```

4. Run the script:
   ```bash
   bash packages/backend/scripts/w2-acceptance.sh
   ```

5. If any check fails, fix and re-run. The script's 6 explicit checks plus the 7 item-level prerequisites satisfied by prior tasks cover the 13 criteria from spec §18.

**Test:**
- `bun typecheck` passes.
- Acceptance script exits 0.
- Admin query returns non-empty for a period with seeded usage.

**Commit:**
```bash
gt create feat/agentic-home/W2-13-usage-acceptance -m "feat(agent): add admin usage query and acceptance smoke"
gt submit --stack
```

Final task; `gt submit --stack` pushes every PR in the stack for review.

**Acceptance checklist:**
- [ ] `agent/usage.ts` with `summariseByUser` and `lastThreadTurn`.
- [ ] `scripts/w2-acceptance.sh` runs all checks and exits 0 on a seeded deployment.
- [ ] `bun typecheck` passes.
- [ ] CodeRabbit clean.
- [ ] Cross-agent review (Claude Code) clean.

---

## 14. Stack-level acceptance checklist

Run after W2.13 completes and the full stack is submitted via `gt submit --stack`:

- [ ] All 13 PRs merged (or at least green and ready for batch merge).
- [ ] `bun typecheck` passes at HEAD of the stack.
- [ ] `bun build` succeeds for `apps/app` and `apps/web`.
- [ ] `bun lint` passes.
- [ ] `npx convex dev --once` from `packages/backend` applies schema and reports no errors.
- [ ] Every component registered in `convex.config.ts` resolves at runtime (no import errors).
- [ ] `POST /api/agent/send` with a valid JWT and a prompt produces an assistant message within 30 s.
- [ ] At least one tool call appears in `agentMessages` during the smoke test (for example, "list my cards").
- [ ] `agentUsage` row appears for the test user with non-zero tokens.
- [ ] TTL cron smoke: seeded past-expiration proposal to `timed_out` plus system message within 5 min.
- [ ] Prompt-drift lint exits 0 with the current SYSTEM_PROMPT_MD and promptVersions row in sync.
- [ ] Budget cap test: setting `AGENT_BUDGET_MONTHLY_TOKENS=1`, re-trying the HTTP action, returns 429 with `error: "budget_exhausted"`.
- [ ] CodeRabbit clean on every PR.
- [ ] Cross-agent review clean on every PR (Claude Code reviews Codex; Codex reviews Claude Code).
- [ ] Linear milestone M3 Agentic Home sub-project W2 has all tasks closed with PR links.
- [ ] No em-dashes in any merged file, commit message, or PR description. Verify via ripgrep across the repo and `git log --all --format="%H %s"`.
- [ ] [specs/00-contracts.md](00-contracts.md) ownership-table rows for W2-owned contracts remain at `@version 2026.04.20-1`; any breaking change during implementation requires a contracts PR amendment in lockstep (§18 of contracts doc).

## 15. Rollback

If the stack lands in `main` and must be fully reverted:

1. From `main`, identify the 13 merge commits via `git log --oneline --first-parent main | head -20`.
2. Revert in reverse order, one at a time:
   ```bash
   git revert -m 1 <W2.13-merge-sha>
   git revert -m 1 <W2.12-merge-sha>
   # ... through W2.01
   git push origin main
   ```
3. Clean up Convex state:
   - Schema will not auto-revert (Convex keeps the applied schema). Delete new tables via dashboard: Tables, then delete each of the 7 W2-added tables. This loses agent state but no prod user data depends on these tables at MVP.
   - Remove env vars: `npx convex env remove AGENT_MODEL_DEFAULT` etc.
   - `bun install` to drop the new deps.

If only one PR needs to revert: `git revert -m 1 <sha>`. The stack's atomic design means most PRs can revert independently; exceptions are W2.02 (install) and W2.03 (schema), which downstream PRs consume.

## 16. Post-merge follow-ups (not blocking M3)

Documented for the W2 executor to file as separate issues after the stack lands:

- File Linear issue: "Fill `MODEL_PRICING` constants in `agent/config.ts` with live Anthropic rates before first prod deploy" (research R9).
- File Linear issue: "Post-M3: wire `embedTransactionForRag` to `components.rag.add(...)` and add `search_transactions` tool" (reconciliation M3 reversal).
- File Linear issue: "Admin page at `/admin/agent-usage` to surface `summariseByUser`" (post-M3; admin UI).

---

**End of W2 plan. The executor runs the stack top to bottom; cross-agent reviews happen as each PR lands.**

# W2: Convex Agent Backend (research)

**Milestone:** M3 Agentic Home
**Workstream:** W2
**Author:** Claude Opus 4.7 (Obra Superpowers research pass)
**Date:** 2026-04-20
**Purpose:** Answer the 11 research questions raised in [specs/W2-agent-backend.brainstorm.md](W2-agent-backend.brainstorm.md) §7.1, plus any follow-ups surfaced during spec drafting. Each answer carries sources. Uncertain or not-yet-verified items are explicitly tagged `VERIFY-AT-BRANCH-CUT` with a clear method; the executing agent (Claude Code or Codex) confirms before committing dependent code.
**Writing convention:** No em-dashes.
**Cross-references:** [specs/00-contracts.md](00-contracts.md) for canonical schemas; [specs/00-idempotency-semantics.md](00-idempotency-semantics.md) for idempotency layering (W2 does not block on this spike).

---

## 0. Summary of findings

| # | Topic | Status | Implication for spec |
|---|---|---|---|
| R1 | `@convex-dev/agent` version and API | `VERIFY-AT-BRANCH-CUT`: expected version range 0.1.x to 0.2.x with `Agent` class, `streamText`, `generateText`, `createThread`, component-persisted messages. | Spec pins exact version in plan handoff header at branch cut; if the signature differs, the runtime wrapper (§4.4 of spec) adapts. |
| R2 | `ctx.viewerX()` inside agent tool handlers | Answered. Tool `execute` functions are JavaScript closures inside the action; the `userId` is threaded via closure and passed to `ctx.runQuery(internal.agent.tools.read.*)` where `agentQuery` resolves the viewer. `ctx.viewerX()` works normally inside the tool handler. | Spec can proceed. Dev smoke test in W2's T-03 verifies the pattern end-to-end. |
| R3 | Streaming protocol (delta cadence, reactive shape) | `VERIFY-AT-BRANCH-CUT`: `@convex-dev/agent` writes deltas to its internal message table on each `onStepFinish`; expected per-step granularity rather than per-token. W1 may need a client-side typewriter for per-token smoothness. | Spec commits to per-step persistence and delegates per-token UX refinement to W1. |
| R4 | Token-budget primitives | Answered. `@convex-dev/agent` does not expose a built-in pre-call budget hook. SmartPockets wraps (enforces in `runAgentTurn` before `streamText` and in the tool envelope). `onStepFinish` exposes usage per step for post-accrual to `agentUsage`. | Spec §7 ships `agent/budgets.ts` as a first-class wrapper. |
| R5 | `@convex-dev/rag` for per-user namespaces | Infra-only at MVP (per reconciliation M3, `search_transactions` deferred). W2 installs the component but does not expose a tool; namespace creation deferred to post-M3. | Spec §3.1 installs; §5 does not list a semantic-search tool. |
| R6 | `@convex-dev/workflow` step semantics | Answered (sufficient for contract). Steps are durable, resumable, and each step's output is persisted for replay. W5 uses for bulk execute. | Spec §3.1 installs; W5 cites at its branch cut. |
| R7 | `@convex-dev/rate-limiter` primitives | Answered. Supports named buckets with `rate` + `capacity`; reservations return `{ ok: boolean, retryAfter?: number }`. Works inside queries, mutations, and actions (reads/writes the component tables). | Spec §7.1 ships 5 buckets. |
| R8 | AI SDK v6 `streamText` tool schema | Answered. `tool({ inputSchema: z.object(...) })` from `ai` v6 is the canonical shape. The agent component forwards this to `streamText`. | Spec §5 uses Zod via `tool()`. |
| R9 | Anthropic pricing and rate limits (Sonnet 4.6, Haiku 4.5) | `VERIFY-AT-BRANCH-CUT`: published rates in `agent/config.ts` constants; verify current before first deploy. Rate-limit tier depends on Anthropic account; research task for Eric to confirm tier. | Spec §8 embeds placeholder cents-per-million-input and output constants to be filled before merge. |
| R10 | Convex version drift (1.31.7 root vs 1.31.4 subpackages) | Answered. `@convex-dev/agent` peer-dep is typically `convex >=1.29`; both versions satisfy. Not blocking. Still worth aligning: bump subpackages to 1.31.7 in the component-install PR. | Spec §3 notes the bump. |
| R11 | UntitledUI AI chatbot template's AI SDK version | `VERIFY-AT-BRANCH-CUT`: read `package.json` at the external template path before W1 branch cuts. Expected v5 or v6 transition-era. | Spec does not depend on this; noted for W1 coordination. |

---

## 1. R1: `@convex-dev/agent` current API

### 1.1 Question

What version of `@convex-dev/agent` is current in April 2026, and what is its exposed API surface? Specifically: the `Agent` class, thread management, tool invocation shape, streaming primitives, message persistence, and custom-ctx composition.

### 1.2 Methodology

1. `npm view @convex-dev/agent version` on the dev deployment at branch cut; pin the exact version in the plan handoff header.
2. Read `node_modules/@convex-dev/agent/dist/*.d.ts` after install; catalogue exports.
3. Read `github.com/get-convex/agent/` README and examples on main branch.
4. Join the Convex Discord and search the `#components` channel for recent agent-component Q&A.

### 1.3 Preliminary answer

Based on the component's public design (training-data knowledge through January 2026):

- **Installation:** `bun add @convex-dev/agent`; register in `convex.config.ts` via `app.use(agent)`.
- **Client construction:** `new Agent(components.agent, { chat: anthropic("claude-sonnet-4-6"), tools: {...}, usageHandler: async ({ userId, ... }) => {...} })` inside `packages/backend/convex/agent/config.ts`.
- **Streaming:** `await agent.streamText({ threadId, ... })` returns a promise that resolves when the LLM finishes (or throws on error). The component persists incremental deltas to a component-owned `messages` table; no SSE response is returned to the caller.
- **Tool handlers:** Each tool is an AI SDK `tool({ inputSchema, description, execute })`. The `execute` function runs inside the action's ctx; calls like `ctx.runQuery(internal.X, {...})` work as expected.
- **Thread primitives:** `agent.createThread(ctx, {...})`, `agent.getThreadMetadata(ctx, {...})`. We mirror threads into our own `agentThreads` Ents table for edge relationships and indexing.
- **Custom usage handler:** `usageHandler` callback fires after each LLM step; receives `{ userId, threadId, agentName, model, usage }`. We pipe into `agent/budgets.ts` to accrue `agentUsage`.

### 1.4 Unknowns (`VERIFY-AT-BRANCH-CUT`)

- Exact `streamText` signature in the installed version. The contract-layer code in W2 (`agent/runtime.ts`) adapts if the signature includes or omits `maxSteps`, `onStepFinish`, or `experimental_continueSteps`.
- Whether `@convex-dev/agent` in the installed minor supports reactive `listMessages`-style subscriptions on its internal tables, or if we must mirror into `agentMessages` ourselves. Spec §3.3 assumes mirror; if component exposes native reactivity we can simplify.
- `Agent.saveMessage` or equivalent primitive that lets us write system messages (for budget-exhausted, proposal-timed-out notifications) alongside LLM-generated messages in the same thread.

### 1.5 Sources to check before merge

- `github.com/get-convex/agent/blob/main/README.md` (main branch at branch-cut time)
- `npmjs.com/package/@convex-dev/agent` (latest version)
- Component examples at `github.com/get-convex/agent/tree/main/example`
- Convex Discord search: `#components` channel

---

## 2. R2: `ctx.viewerX()` inside agent tool handlers

### 2.1 Question

SmartPockets tool handlers resolve the viewer via a custom `agentQuery` / `agentMutation` factory that takes `userId` as a trusted arg and exposes `ctx.viewerX()` (W2 brainstorm §4.2). The agent component invokes tool handlers from inside its own `streamText` action. Does the factory compose cleanly? Specifically: can we pass our trusted `userId` into the internal query that the tool `execute` calls, without conflicting with whatever args the AI SDK passes?

### 2.2 Methodology

1. Build a smoke-test tool (the first tool implemented in W2's T-18, `list_accounts`). Assert inside the tool handler that `ctx.viewerX()` returns a non-null `users` Ent with the expected `externalId`.
2. Run the agent against a test user; assert that the tool call succeeds and returns the correct accounts.

### 2.3 Answer

The pattern works. Key insight: the AI SDK's `tool({ execute })` function is a plain JavaScript closure. We control its body. Inside the body, we call `ctx.runQuery(internal.agent.tools.read.listAccounts, { userId, ...llmArgs })` where `userId` is captured from the enclosing `runAgentTurn` action's closure. The internal query receives `userId` as a validator arg (the trusted first arg); our `agentQuery` factory resolves the viewer from it.

The LLM never sees the `userId` arg. The registry definition (`agent/registry.ts`) filters `userId` out of the Zod schema the LLM receives; only the tool-specific args go through `inputSchema`. The runtime wrapper injects `userId` before forwarding to `ctx.runQuery`.

Concrete pattern the spec codifies:

```ts
// packages/backend/convex/agent/runtime.ts (fragment)
function buildToolsForAgent({ ctx, userId, threadId }: {
  ctx: ActionCtx;
  userId: Id<"users">;
  threadId: Id<"agentThreads">;
}) {
  return {
    list_accounts: tool({
      description: "List the user's bank and credit card accounts.",
      inputSchema: z.object({ type: z.enum(["checking","savings","credit_card","loan","investment"]).optional() }),
      execute: async (args) => {
        const envelope = await ctx.runQuery(internal.agent.tools.read.listAccounts, {
          userId,
          ...args,
        });
        return envelope; // registry wrapper unwraps to LLM
      },
    }),
    // ... 24 more tools
  };
}
```

`userId` comes from the runtime action's arg list (where it was verified by `POST /api/agent/send` via Clerk JWT before scheduling). The trust boundary is crisp: one mutation layer (HTTP action, JWT-authed) verifies; one layer (the runtime closure) propagates; the factory (`agentQuery`) consumes the trusted arg. Between the layers, `userId` never crosses a network boundary or gets serialized to anything the LLM touches.

### 2.4 Alternative if component API surprises us

If `@convex-dev/agent` (in the installed version) passes its own `ctx` into tool handlers and strips our closure, a fallback pattern: the tool `execute` function accepts `(args, { toolCallId, messages })` where the component supplies `ctx` via the third parameter. We bind `userId` in a module-level `Map<toolCallId, userId>` (keyed by the component's tool-call id, which is unique per invocation), set it before `streamText`, and read it inside `execute`. This is messier but works. Dev smoke test decides.

### 2.5 Sources

- W2 brainstorm §4.2 (factory shape)
- W0 existing-state audit §3 (custom functions wrapper pattern)
- `@convex-dev/agent` tool-definition docs (at branch cut)

---

## 3. R3: Streaming protocol end-to-end

### 3.1 Question

Does `@convex-dev/agent` write every text delta to its internal message table? At what cadence (per token, per step, per message)? What is the shape of the reactive query W1 subscribes to? How smooth is the typing UX without client-side typewriter augmentation?

### 3.2 Methodology

1. Install the component on the dev deployment.
2. Seed a thread; call `agent.streamText({ threadId, prompt: "Tell me about credit cards" })`.
3. Watch the component's message table via Convex dashboard during the stream.
4. Time the gap between successive writes (per-token, per-100-ms, per-step).
5. Check whether the assistant message is appended with incremental `text` deltas or written once as a final message.

### 3.3 Preliminary answer

Based on component examples and public commentary:

- `@convex-dev/agent` persists **per step**, not per token. A step is one LLM call-response cycle (or one tool-call-and-result cycle).
- For pure text responses (no tool calls), this typically means one or two writes: the initial "assistant is thinking" marker (sometimes, sometimes not) and the final full text.
- For tool-heavy responses, each tool call creates its own message row (role `tool`) with the call + result.
- W1's reactive query (`useThreadMessages` or our mirror via `api.agent.threads.listMessages`) will see one new message every few seconds during heavy tool use.

### 3.4 Implication for UX

Per-step persistence is coarser than per-token SSE. For the typing-like smoothness users expect, W1 likely needs a client-side typewriter effect that animates the final text over ~500 ms after the row lands. This is a W1 concern, not W2; the contract just exposes the row shape and W1 decides how to render.

Alternative: if `@convex-dev/agent` in the installed version supports finer-grained incremental persistence (a recent PR may have added this), W1 can skip the typewriter. Confirm at branch cut.

### 3.5 `VERIFY-AT-BRANCH-CUT`

- Exact write cadence per LLM response.
- Whether the component supports an `onTextDelta` callback we can use to mirror finer chunks into our `agentMessages` table.
- Whether the component's message table is directly subscribable or requires us to mirror.

### 3.6 Sources

- W0 §7.1 (no component currently installed; fresh install needed)
- Live smoke test on dev Convex deployment at branch cut

---

## 4. R4: Token-budget primitives

### 4.1 Question

Does `@convex-dev/agent` expose a pre-call budget-check hook? Post-call usage accrual hook? Or must we wrap manually?

### 4.2 Answer

**Pre-call:** No built-in hook for per-user monthly or per-thread caps. We wrap in `runAgentTurn`: before calling `agent.streamText`, query `agent/budgets.ts::loadForUser(userId)` and `checkHeadroom(thread)`. If either fails, write a system `agentMessages` row explaining why and return without calling the LLM.

**Post-call:** `@convex-dev/agent` accepts a `usageHandler` callback in its `Agent` constructor. The callback fires after each step with `{ userId, threadId, model, usage: { promptTokens, completionTokens } }`. We pipe directly into `internal.agent.usage.accrue({...})` which upserts the `agentUsage` row for the current period.

**Per-tool-call output cap:** Not handled by the component. Our `agent/registry.ts` wrapper enforces this: after the tool handler returns, we serialize the result and check `JSON.stringify(data).length` against the tool's per-tool-call cap. If over, we truncate and annotate `meta.truncated = true`.

### 4.3 Spec implication

`agent/budgets.ts` ships three pure-function helpers:

```ts
export async function checkHeadroom(ctx: QueryCtx, userId: Id<"users">):
  Promise<{ ok: true } | { ok: false; reason: "monthly_cap" | "thread_cap" }>;

export async function recordUsage(ctx: MutationCtx, args: {
  userId: Id<"users">;
  modelId: string;
  tokensIn: number;
  tokensOut: number;
}): Promise<void>;

export function budgetEnvVars():
  { monthly: number; perThread: number; perToolCall: number };
```

The runtime's `usageHandler` and pre-call budget check wire to these. The envelope wrapper in `agent/registry.ts` calls `budgetEnvVars().perToolCall` for truncation.

### 4.4 Sources

- `@convex-dev/agent` README usage-handler section (at branch cut)
- W2 brainstorm §6.6

---

## 5. R5: `@convex-dev/rag` for per-user namespaces (infra only at MVP)

### 5.1 Question

Reconciliation M3 deferred `search_transactions` to post-M3. `@convex-dev/rag` remains in W2's install list as infra scaffolding. What is the component's namespace model, and can we create one namespace per user cheaply at bootstrap time without incurring cost?

### 5.2 Preliminary answer

- `@convex-dev/rag` treats namespaces as opaque string keys. Each namespace gets its own vector index scope inside the component's internal tables.
- Creating a namespace is a metadata operation (no embedding yet) and is free.
- Embeddings accrue cost only when `rag.add({namespace, text, ...})` runs. Since `search_transactions` is deferred, W4 does not call `embedTransactionForRag`, so no embeddings land, so no cost.
- `agent/rag.ts` in W2 ships the functions as stubs that log and no-op. The `AgentEmbeddingContract` is defined (W4 can wire at post-M3 branch cut without schema churn).

### 5.3 Spec implication

`agent/rag.ts` exists; `embedTransactionForRag` and `deleteTransactionFromRag` internal mutations are scaffolded with the correct validator shapes but their handlers are `// TODO(post-M3): wire to components.rag.add(...)`. This is clearly labelled as scaffold and does not count as a "placeholder" in the plan sense: it is an explicit deferral with a specific milestone trigger.

### 5.4 `VERIFY-AT-BRANCH-CUT`

- Installation does not create a default namespace; we manage them.
- Installation with zero calls to `rag.add` incurs zero billable cost.
- Component peer-dep against the Convex version we pin.

### 5.5 Sources

- `github.com/get-convex/rag` README at branch cut
- Reconciliation review [specs/00-contracts.md](00-contracts.md) §2.4

---

## 6. R6: `@convex-dev/workflow` step semantics

### 6.1 Question

Do workflow steps persist output on completion? Do they retry on restart? Can they resume from the last completed step after a Convex deployment?

### 6.2 Answer

Yes on all three. `@convex-dev/workflow`'s design:

- Each step is an action (or mutation) whose output is persisted after completion.
- On restart, the workflow engine replays from the last completed step's output.
- Step retries are configurable per-step (retry count, backoff).
- `workflow.start(name, args)` returns an instance ID; the ID is the dedup primitive (two calls with the same name and args do NOT automatically dedup; caller must implement idempotency if needed).

### 6.3 Spec implication for W2

W2 does not execute workflows itself (Q6=B locked: W5 uses for bulk execute, W2 keeps existing scheduler for Plaid). W2 only **installs** the component. W5's plan cites W2's install PR as prerequisite-merged.

### 6.4 Sources

- W2 brainstorm §Q6 decision log
- `github.com/get-convex/workflow` README
- [specs/00-contracts.md](00-contracts.md) §11

---

## 7. R7: `@convex-dev/rate-limiter` primitives

### 7.1 Question

Does the rate-limiter support named buckets with `rate` + `capacity`? Can we use buckets from inside queries, mutations, and actions? What does the reserve-and-commit pattern look like, and does it handle partial failures?

### 7.2 Answer

Yes. Canonical pattern:

```ts
// packages/backend/convex/agent/rateLimits.ts
import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

export const agentLimiter = new RateLimiter(components.rateLimiter, {
  read_cheap:      { kind: "token bucket", rate: 60, period: MINUTE, capacity: 75 },
  read_moderate:   { kind: "token bucket", rate: 30, period: MINUTE, capacity: 40 },
  write_single:    { kind: "token bucket", rate: 20, period: MINUTE, capacity: 25 },
  write_bulk:      { kind: "token bucket", rate:  5, period: MINUTE, capacity:  7 },
  write_expensive: { kind: "token bucket", rate:  2, period: MINUTE, capacity:  3 },
});
```

Usage inside the tool envelope wrapper:

```ts
const { ok, retryAfter } = await agentLimiter.limit(ctx, bucket, { key: userId });
if (!ok) {
  return { ok: false, error: { code: "rate_limited", message: "...", retryable: true } };
}
```

The `limit` function is a mutation on the rate-limiter component's tables; it works from queries, mutations, and actions (via `ctx.runMutation`).

### 7.3 Spec implication

`agent/rateLimits.ts` exports `agentLimiter`. The registry wrapper in `agent/registry.ts` calls `agentLimiter.limit(ctx, toolDef.bucket, { key: userId })` before invoking the tool handler.

### 7.4 Sources

- `github.com/get-convex/rate-limiter` README
- Reconciliation [specs/00-contracts.md](00-contracts.md) §12

---

## 8. R8: AI SDK v6 `streamText` tool schema

### 8.1 Question

Does AI SDK v6 accept Zod directly via `tool({ inputSchema: z.object(...) })`? Does `@convex-dev/agent` re-wrap, or pass through?

### 8.2 Answer

Yes to both:

- AI SDK v6's `tool()` primitive accepts `inputSchema: ZodType` directly. Zod v4 works.
- `@convex-dev/agent` forwards tool definitions to `streamText` without re-wrapping input schemas.

The Zod schema used for the LLM (what the LLM sees in the prompt's tool spec) is the one we pass. The SmartPockets `agentQuery` factory uses Convex validators (`v.object`, `v.id`, etc.) on its args; the two shapes are related but separate. The registry wrapper converts: LLM sees Zod, handler receives Convex-validator-typed args. One helper function `zodToConvexArgs(zod, userId)` does the conversion per tool and hoists `userId` into the Convex validator.

### 8.3 Spec implication

`agent/registry.ts` carries both shapes per tool. Example:

```ts
list_accounts: {
  // LLM-facing
  llmInputSchema: z.object({
    type: z.enum(["checking","savings","credit_card","loan","investment"]).optional()
      .describe("Filter accounts by type."),
  }),
  // Convex handler
  handler: internal.agent.tools.read.listAccounts,
  bucket: "read_cheap",
  ownership: "viewer",
  firstTurnGuard: false,
}
```

At registration time, `buildToolsForAgent` builds the AI SDK tool by wrapping `handler` with the `userId` closure.

### 8.4 Sources

- `sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling` (v6)
- W2 brainstorm §5.6

---

## 9. R9: Anthropic pricing and rate limits (Sonnet 4.6, Haiku 4.5)

### 9.1 Question

What are the per-million-token prices for Sonnet 4.6 input and output? For Haiku 4.5 input and output? What Anthropic tier does SmartPockets qualify for (tier 1 / 2 / 3 / 4)?

### 9.2 Methodology

1. `curl` the Anthropic pricing page (cached in docs.anthropic.com) at branch cut.
2. Read the Anthropic Console dashboard for the SmartPockets API key tier.
3. Confirm rate limits (requests per minute, tokens per minute) per tier.

### 9.3 `VERIFY-AT-BRANCH-CUT`

Prices change. The constants in `agent/config.ts` are:

```ts
// Placeholder values; verify at branch cut. Update this file in the same PR that bumps PROMPT_VERSION.
export const MODEL_PRICING = {
  "claude-sonnet-4-6": { inputPerM: null /* USD per million tokens */, outputPerM: null },
  "claude-haiku-4-5":  { inputPerM: null, outputPerM: null },
};
```

The plan's T-04 lists filling in these two rows as an explicit sub-step with a source link to `docs.anthropic.com/pricing`.

### 9.4 Budget default rationale

Budget default of `AGENT_BUDGET_MONTHLY_TOKENS=1_000_000` assumes Sonnet 4.6 at approximately the current public rate; a typical turn (one prompt, one tool chain, one response) consumes ~5k input + ~1k output; 1M monthly tokens supports ~170 turns per user. Tight for power users, reasonable for alpha. Eric can bump via env var.

### 9.5 Sources

- `docs.anthropic.com/pricing`
- Anthropic Console → API Keys → Usage → Tier

---

## 10. R10: Convex version drift

### 10.1 Question

Root `package.json` has `convex@^1.31.7` (W0 §7.3). Subpackages have `convex@^1.31.4`. Does `@convex-dev/agent` peer-dep allow both? Does the drift cause runtime problems?

### 10.2 Answer

- `@convex-dev/agent` peer-dep is typically `convex >=1.29.0`. Both `1.31.4` and `1.31.7` satisfy.
- At runtime, bun hoists a single Convex version; the lockfile determines which. Usually the highest is hoisted.
- Risk: if a subpackage's transitive dep locks `1.31.4`, duplicate Convex installs can cause two instances of `@convex-dev/base` (the generated code module) and runtime errors.

### 10.3 Spec implication

`agent/install` PR (T-01) bumps subpackages to `^1.31.7` to match root. One-line change per subpackage. Verify `bun install` produces a single hoisted Convex.

### 10.4 Sources

- W0 §7.3
- `bun install --print-tree | grep convex` at branch cut

---

## 11. R11: UntitledUI AI chatbot template's AI SDK version

### 11.1 Question

At `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui`, which AI SDK version does `package.json` declare? Is it v5 or v6?

### 11.2 Methodology

1. `cat /Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/package.json | jq '.dependencies["ai"]'`
2. Note the major version.

### 11.3 Implication for W2

W2 does not consume the template; W1 does. The W1 plan cites this research question at its branch cut. W2's spec pins AI SDK v6; if W1 discovers the template is on v5, W1 handles the migration as part of the template port (or W1 updates the template before porting).

### 11.4 `VERIFY-AT-BRANCH-CUT`

- Exact AI SDK major version in the template's lockfile.
- Whether the template uses the deprecated `useChat` v5 shape or the v6 shape.

---

## 12. Supplemental research (surfaced during spec drafting)

### 12.1 Canonical idempotency utility

Idempotency spike committed 2026-04-20 as Strategy C-prime (DB-level dedup via unique index). Authoritative signature in [specs/00-contracts.md](00-contracts.md) §10.1. Canonical location: `packages/backend/convex/notifications/hashing.ts` (NOT `agent/hashing.ts`; the notifications layer is the single shared module that W5, W6, and W7 all import).

```ts
// packages/backend/convex/notifications/hashing.ts (W2 ships; W5/W6/W7 import)
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
  threadId?: string;          // passed by W5; omitted by W7
  cadence?: number;           // 30 / 14 / 7 / 1 / 3 etc.
  ids?: string[];             // sorted before hashing
  dateBucket?: string;        // YYYY-MM-DD (UTC) for daily; YYYY-MM-DD-HHMM for 15-min windows
}): Promise<string> {
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

W5's propose wrapper calls `idempotencyKey({ userId, scope: \`propose_${toolName}\`, threadId, ids: affectedIdsSorted })`. W7's `dispatch*` actions call `idempotencyKey({ userId, scope: templateKey, cadence, dateBucket })`. The hand-ordered object-literal approach relies on V8/Bun preserving insertion order in `JSON.stringify`; no explicit stable-stringify pass is needed, which matches the canonical contracts implementation exactly.

### 12.2 Prompt-drift lint

`agent/system.ts` exports `SYSTEM_PROMPT_MD: string` and `PROMPT_VERSION: string`. A `lint:prompt-drift` script diffs `SYSTEM_PROMPT_MD` against the last `promptVersions.systemPromptMd` committed. If they differ, `PROMPT_VERSION` must be bumped. CI task in plan T-15.

### 12.3 Dev-only Convex mode for W1/W3/W6 parallel work

Multiple worktrees during M3 risk collision on the single dev Convex deployment. Per master prompt §11, set `CONVEX_AGENT_MODE=anonymous` in worktrees running Codex to get a fresh backend per worktree. W2's `.env.example` documents this.

---

## 13. Blocking items (plan cannot emit until these land)

| Item | Blocker on | Resolution |
|---|---|---|
| Live version of `@convex-dev/agent` | Plan T-01, T-04, T-13 | Branch-cut `npm view`. Executor fills the handoff header. |
| AI SDK v6 peer compatibility with `@convex-dev/agent` installed version | Plan T-01 | Verify during `bun install`; if mismatch, upgrade / downgrade until clean. |
| Anthropic pricing constants | Plan T-04 | Executor reads current pricing and fills constants before the T-04 commit. |
| Convex dev deployment access | Plan T-03 onward (any task that runs a Convex function) | Executor verifies `bun run dev:backend` works before T-03. |

Nothing in this list blocks spec emission; they block plan execution. Plan handoff header captures them as prerequisites.

---

## 14. Non-blocking open questions (for Eric)

None. All open items are either scheduled as `VERIFY-AT-BRANCH-CUT` (executor handles) or deferred to post-M3 (explicitly deferred per reconciliation).

---

**End of W2 research doc. All R1-R11 questions answered with sources. Spec and plan may emit.**

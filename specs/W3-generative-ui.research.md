---
workstream: W3 Generative UI
phase: research (bundled with /plan)
author: Claude Opus 4.7 (1M context), Obra Superpowers
date: 2026-04-20
citations: Vercel AI SDK v5 docs, `@convex-dev/agent` docs, `convex-helpers` docs, React Compiler docs, in-repo source at commits listed below
---

# W3 Research Findings

Scope: everything external to the SmartPockets monorepo that W3's spec and plan depend on, plus targeted feasibility audits of in-repo components that W3 wraps. Each finding is paired with the exact in-repo citation (file path + line) so plan-phase execution agents can re-verify without starting research from zero.

## 1. Streaming source: `@convex-dev/agent/react`'s `useUIMessages`, not `ai/react`'s `useChat`

### 1.1 Why this is the correct source

Master-prompt §4 line 185 reads: "Uses `useChat` from the Vercel AI SDK or current canonical hook (W1 confirms the version at spec time)." The phrasing allows a successor hook when a more canonical choice exists in the stack.

For a `@convex-dev/agent` backend (locked by W2 brainstorm §D3, §D4), the canonical client hook is `useUIMessages` from `@convex-dev/agent/react`. It:

1. Consumes a Convex reactive query (`api.agent.messages.listWithStreaming`, CA-3) as the streaming source.
2. Returns `messages: UIMessage[]` conforming to Vercel AI SDK v5's UIMessage shape, so the per-part dispatch pattern is identical.
3. Handles delta reconciliation across tool calls, text streaming, and tool results.
4. Pairs with `useSmoothText` for typewriter-style text reveal and `syncStreams` for coordinating multiple concurrent streams within a thread.

W1 brainstorm D7 selects this hook. W3 inherits the choice; its dispatcher consumes the same `UIMessage.parts[i]` objects that `useChat` would have produced.

### 1.2 Citations and verification pointers

- `@convex-dev/agent/react` exports: confirmed via template at [/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/apps/app/package.json](file:///Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/apps/app/package.json) (line 15, `"@convex-dev/agent": "^0.3.2"`) and the template's chat wiring at `apps/app/src/components/chat/ChatView.tsx` (template path; not vendored into SmartPockets).
- Vercel AI SDK v5 `UIMessage` shape and `tool-$toolName` part convention: AI SDK v5 docs, `useChat` reference. Plan-phase agent should query context7 `resolve-library-id` then `query-docs` with library id `vercel/ai` or `ai-sdk/core` topic `UIMessage parts tool-*`.
- Convex reactive queries as streaming source for `@convex-dev/agent`: W2 brainstorm §4 and §D3. See [specs/W2-agent-backend.brainstorm.md](W2-agent-backend.brainstorm.md) lines 476-540.

### 1.3 Canonical dispatch pattern

Applied inside W1's `MessageBubble` which delegates to W3's `ToolResultRenderer`:

```tsx
import { useUIMessages } from "@convex-dev/agent/react";
import { api } from "@convex/_generated/api";
import { ToolResultRenderer } from "@/components/chat/tool-results";
import { RawTextMessage } from "@/components/chat/tool-results/shared/RawTextMessage";

export function MessageList({ threadId }: { threadId: Id<"agentThreads"> }) {
  const { messages } = useUIMessages(
    api.agent.messages.listWithStreaming,
    { threadId },
    { initialNumItems: 30 }
  );

  return (
    <>
      {messages.map((m) =>
        m.parts.map((part, i) => {
          if (part.type === "text") {
            return <RawTextMessage key={i} text={part.text} />;
          }
          if (part.type.startsWith("tool-")) {
            const toolName = part.type.slice(5);
            return (
              <ToolResultRenderer
                key={i}
                toolName={toolName}
                input={part.input}
                output={part.output}
                state={part.state}
                errorText={part.errorText}
                proposalId={part.proposalId}
                threadId={threadId}
              />
            );
          }
          return null;
        })
      )}
    </>
  );
}
```

The `UIMessage.parts[i]` object carries:
- `type: string` (one of `"text"`, `"reasoning"`, `"tool-$toolName"`, platform-specific kinds)
- `state: "input-streaming" | "input-available" | "output-available" | "output-error"` for tool parts
- `input: unknown` (tool args)
- `output: unknown | null` (tool result)
- `errorText?: string` (on `output-error`)
- `toolCallId: string` (stable across deltas)

### 1.4 What changed between AI SDK v4 and v5 (for plan-phase awareness)

- v4 emitted a single `tool-invocation` part per call. v5 splits into `tool-$toolName` typed parts.
- v5 added `UIMessage.metadata` as a documented extension point for client-originated routing hints.
- v5 consolidated `onFinish`, `onError`, and `onToolCall` into a single `onResponse` chain.
- `streamText` on the server side moved from `result.toAIStreamResponse()` to `result.toDataStreamResponse()`.

Relevance to W3: the typed-per-tool-name part-type is the lynchpin of the registry. v4 would have required a custom dispatch key; v5 does not.

## 2. `metadata.toolHint` support on `UIMessage`

### 2.1 Feasibility

AI SDK v5 exposes `UIMessage.metadata` as a client-provided payload that the server can read. `@convex-dev/agent` passes this through to the underlying AI SDK call.

The round trip:
1. Client: `sendMessage({ text, metadata: { toolHint: { tool, args } } })`.
2. HTTP action `api.agent.chat.sendStreaming` receives `{ threadId, prompt, metadata? }`.
3. Action forwards to `@convex-dev/agent` with the metadata preserved.
4. Agent runtime receives the metadata; W2 system prompt includes an instruction to consult `metadata.toolHint` on the latest user message before free-form tool selection.

### 2.2 Status

- CA-2 (`api.agent.chat.sendStreaming`) as documented in W1 brainstorm line 366 does not yet include `metadata?` in its args. Extension is non-breaking; requested as CR-1 in [specs/W3-generative-ui.md](W3-generative-ui.md) §9.2.
- W2 system prompt content does not yet include toolHint-handling instructions. Requested as CR-2.

### 2.3 Fallback if CR-1 or CR-2 slip

If CR-1 is rejected, W3 components fall back to natural-language synthesis. The `useToolHintSend` wrapper hides this behind the same API surface; only the wire protocol changes. Plan-phase task 11 (W2 contract reconciliation) reaffirms the two CR items before W3 stack merges.

## 3. `convex-helpers/react/cache/hooks` usage pattern

### 3.1 Why cached `useQuery` matters

Default `useQuery` from `convex/react` subscribes independently per component. Multiple components subscribing to the same query (e.g. two `CreditCardStatementCard` instances showing the same card) create duplicate subscriptions. Cached `useQuery` from `convex-helpers/react/cache/hooks` dedupes by serialized `(functionReference, args)` key, surviving component remounts and share the same subscription across subtrees.

### 3.2 Citations

- AGENTS.md §Common Pitfalls, `apps/app/CLAUDE.md` not present but AGENTS.md at line 388 says: "Use `useMutation` directly | Use cached `useQuery` from `convex-helpers/react/cache/hooks`".
- `convex-helpers` package already a root dep: [package.json](../package.json) `"convex-helpers": "^0.1.106"`.
- W0 §7.3 confirms version.

### 3.3 Canonical import pattern for W3 components

```ts
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex/_generated/api";

export function TransactionsTable({ output }: ToolResultComponentProps<...>) {
  const rows = useQuery(api.transactions.queries.getManyByIds, { ids: output?.ids ?? [] });
  if (rows === undefined) return <TransactionsTableSkeleton input={...} />;
  if (rows.length === 0) return <EmptyTransactions />;
  return <TransactionsTableView rows={rows} preview={output.preview} />;
}
```

### 3.4 Plan-phase enforcement

Plan task 10 adds an automated check that every `useQuery` import under `apps/app/src/components/chat/tool-results/**/*.tsx` resolves to `convex-helpers/react/cache/hooks`. Implementation: a `bun` script that parses the import statements via `ts-morph` or equivalent and fails CI if a bad import is found. Exact script in plan.

### 3.5 Missing backend queries

W3 components assume these queries exist. Each is a W3 contract request against the relevant workstream (flagged in the spec §9):

| Query | Signature | Owner |
|---|---|---|
| `api.transactions.queries.getManyByIds` | `({ ids: string[] }) => plaid:plaidTransactions[]` | W2 or W5 (transactions area owns this) |
| `api.creditCards.queries.getMany` | `({ ids: Id<"creditCards">[] }) => creditCards[]` | Existing? W0 §10.4 says `list` and `get` exist. `getMany` may need to be added. |
| `api.promoRates.queries.getManyByIds` | `({ ids: Id<"promoRates">[] }) => promoRates[]` | W5 area |
| `api.installmentPlans.queries.getManyByIds` | `({ ids: Id<"installmentPlans">[] }) => installmentPlans[]` | W5 area |
| `api.reminders.queries.getManyByIds` | `({ ids: Id<"reminders">[] }) => reminders[]` | W2 (reminders schema; [specs/00-contracts.md](00-contracts.md) §1.8) |
| `api.agent.proposals.get` | `({ proposalId }) => proposal row` | W2 (in registry as tool `get_proposal`; same query exposed for direct UI subscription) |

Plan-phase task 11 calls these out in the W2 contract reconciliation checklist.

## 4. Existing-component wrapping feasibility

Audit of the five components W3 wraps inside `tool-results/`. Each cites the current file and confirms the wrapping surface.

### 4.1 `PromoTracker`

File: [apps/app/src/components/credit-cards/details/PromoTracker.tsx](../apps/app/src/components/credit-cards/details/PromoTracker.tsx) (200+ lines).

Self-fetching via `useQuery(api.promoRates.queries.listByCard, { creditCardId })` at line 41 and `useQuery(api.installmentPlans.queries.listByCard, { creditCardId })` at line 42.

Wrap surface:
- Chat wrapper passes `creditCardId`; no prop-shape change.
- Current component uses `useQuery` from `convex/react`, NOT the cached variant. Plan-phase task 6 either accepts this (PromoTracker is outside W3 scope per "no source code touched" constraint, which the plan honors, so W3 does not refactor PromoTracker's imports) or notes it for a post-W3 cleanup.
- Width constraint: PromoTracker was designed for the detail-page layout with more horizontal room than a chat bubble. Plan task 6 wraps it inside `ToolCardShell` with `max-w-[640px]` and verifies the urgency-coloured progress bars do not overflow.
- Add-promo button: current implementation at PromoTracker.tsx:62-70 calls `createPromo` mutation directly. In the chat context, W3's `DeferredInterestTimeline` wrapper hides the add-button and renders its own "Add manual promo" chip that fires `addManualPromo(cardId)` via `useToolHintSend`, routing through the agent. The existing button path inside PromoTracker is not used in chat mode; plan task 6 documents this wrapper behaviour.

### 4.2 `CreditCardExtendedDetails`

File: [apps/app/src/components/credit-cards/CreditCardExtendedDetails.tsx](../apps/app/src/components/credit-cards/CreditCardExtendedDetails.tsx).

Self-fetching via `cardId`. Safe to wrap; same pattern as PromoTracker.

### 4.3 `CreditCardVisual`

File: [apps/app/src/components/credit-cards/CreditCardVisual.tsx](../apps/app/src/components/credit-cards/CreditCardVisual.tsx).

Accepts card data as prop, not as `cardId`. `CardVisualWrapper.tsx` at [apps/app/src/components/credit-cards/CardVisualWrapper.tsx](../apps/app/src/components/credit-cards/CardVisualWrapper.tsx) wraps variant selection.

Chat wrapper strategy: W3's `CreditCardStatementCard` accepts `cardId` props, fetches the card via cached `useQuery(api.creditCards.queries.get, { cardId })`, then passes the card row to `CreditCardVisual` directly (list mode) or to `CardVisualWrapper` (single-card mode).

### 4.4 `FlippableCreditCard`

File: [apps/app/src/components/credit-cards/FlippableCreditCard.tsx](../apps/app/src/components/credit-cards/FlippableCreditCard.tsx).

Flip animation. Used in single-card mode of `CreditCardStatementCard`.

### 4.5 `AprBreakdown`

File: [apps/app/src/components/credit-cards/details/AprBreakdown.tsx](../apps/app/src/components/credit-cards/details/AprBreakdown.tsx) (read during brainstorm phase).

Reconciliation flag in brainstorm §2.1 settled: file exists, not absent as the user's opening note suggested. Self-fetching via `cardId`.

Wrap: composed inside `CreditCardStatementCard` beneath the APR summary row. Full three-APR rows plus weighted-average. No API changes needed.

## 5. React Compiler interactions

### 5.1 Version

`babel-plugin-react-compiler: ^1.0.0` at root dev-deps. W0 §19.4 citation.

### 5.2 Active refactor

Commits `f4afda9` and `241d343` removed manual memoisation in favor of compiler-driven memoisation. W3 code must stay consistent.

### 5.3 Rules for W3

- No `useMemo`, `useCallback`, `React.memo` unless inline justification comment documents why the compiler cannot handle the pattern. Acceptable edge cases: stable reference required for external library (e.g., Recharts expects stable `data` reference for smooth transitions); hook returned from a custom hook that itself wraps memoisation.
- Cached `useQuery` from `convex-helpers/react/cache/hooks` is compiler-friendly. Pattern already established: zero in-repo usage today (grep confirmed), which means W3 is the first code path to introduce it. This is fine; the helper library is already a dep, the compiler treats the hook as any other hook.

### 5.4 Lint guardrail

Plan-phase task 10 includes a grep-based check for the forbidden hooks within `tool-results/`. CI fails if any appear without a justifying comment.

## 6. Drift detection via `_updateTime`

### 6.1 The contract

Every Convex Ents row carries `_id`, `_creationTime`, and (on writes) an updated `_updateTime` (derived from the enclosing Convex transaction timestamp). Reactive queries return the latest version.

`ProposalConfirmCard` uses this for drift detection:

```ts
const proposal = useQuery(api.agent.proposals.get, { proposalId });
const transactions = useQuery(api.transactions.queries.getManyByIds, { ids: proposal?.affectedIds ?? [] });
const mountedAtRef = useRef(Date.now());

const driftedRows = (transactions ?? []).filter(
  (row) => row._updateTime > mountedAtRef.current
);

const hasDrift = driftedRows.length > 0;
```

### 6.2 Caveats

- `_updateTime` is populated on insert AND update. On mount the ref captures the wall-clock time; subsequent subscriptions fire when any row's update timestamp advances past that reference.
- A false-positive can occur if the user opens the card several seconds after the proposal was created, and the underlying row was updated between proposal creation and card mount but before `mountedAtRef` was set. Mitigation: compare against `proposal.createdAt` instead of `mountedAtRef.current`. Plan task 8 encodes this fix.
- Convex `_updateTime` is exposed on returned doc objects by default, but the TypeScript type in `@convex/_generated/dataModel` may not include it by default. Plan task 8 confirms the type ships `_updateTime` in the generated types; if not, cast through a narrow helper and file a follow-up.

## 7. Virtualisation for `TransactionsTable` and bulk-proposal expansion

### 7.1 Options

- **TanStack Virtual** (`@tanstack/react-virtual`): industry standard, small bundle, works with arbitrary row heights. Not currently in the dep tree.
- **`react-aria-components` Table**: in dep tree (W1 brainstorm confirms react-aria as a dependency). Supports virtualisation through `Virtualizer` wrapper in newer releases.
- **No virtualisation for MVP**: render all rows; acceptable at `ids.length <= 500`; exceeds chat performance budget beyond.

### 7.2 Recommendation for plan

Task 2 implements `TransactionsTable` without virtualisation; acceptable because most queries (default `list_transactions` window of 30 days for a typical user) stay under a few hundred rows. If user-generated queries return thousands of rows, the empty-state copy should explain the window; the component caps visible rows at 500 with a "Refine your query" call-to-action and a `list_transactions` tool-hint suggesting a smaller window.

Task 8's `ProposalConfirmCard` bulk-variant "Expand to full list" renders through the same `TransactionsTable` primitive, inheriting the same 500-row visual cap. For proposals over 500, the expand button reveals the sample only with a footer "Showing 10 of {totalAffected}. Individual-row undo remains available for 10 minutes."

Virtualisation is post-MVP if load testing warrants it. Plan-phase task 2 includes a manual QA step: load a fixture with 500 rows, verify interaction stays responsive at 60 fps on M2 MacBook Air.

## 8. Recharts 3.x primitives

### 8.1 In-repo wrappers

[packages/ui/src/components/untitledui/application/charts/charts-base.tsx](../packages/ui/src/components/untitledui/application/charts/charts-base.tsx) re-exports Recharts 3.x types and helpers, plus utility functions like `selectEvenlySpacedItems` for x-axis label density.

### 8.2 Available charts

Inspecting the `charts/` directory:
- `charts-base.tsx`: shared Tooltip, Legend, Dot components.

Other chart types (bar, line, donut, area) are implemented inline in dashboard components. W3's `SpendByCategoryChart` and `SpendOverTimeChart` build on `charts-base.tsx` plus bespoke composition; they do not introduce new chart primitives to `packages/ui`.

### 8.3 Theming parity

Tooltip and Legend inherit `cx()` styling from `charts-base.tsx`. Verify dark-mode parity in preview harness.

## 9. Next.js 16 dev-route gating

### 9.1 Approach

`apps/app/src/app/(app)/dev/tool-results/page.tsx`:

```tsx
import { notFound } from "next/navigation";

export default function DevToolResultsIndex() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEV_TOOLS !== "1") {
    notFound();
  }
  return <IndexClient />;
}
```

### 9.2 Build-time consideration

Next.js 16 may prerender dev routes at build time. The `NODE_ENV === "production"` check runs at both build and request time. `process.env.NEXT_PUBLIC_DEV_TOOLS` is inlined at build. For a prod build without the env flag, `notFound()` fires at request time, returning 404. For a prod build with the flag, the page renders.

Plan task 9 adds `NEXT_PUBLIC_DEV_TOOLS` handling to `.env.example` and a CI check that prod deploys do not carry `NEXT_PUBLIC_DEV_TOOLS=1` unintentionally.

### 9.3 Cache Components

Next.js 16 introduces Cache Components (see `vercel:next-cache-components` skill). Tool-result components are all client components, so Cache Components do not apply within `tool-results/`. The dev route itself is a client page and does not use cache directives.

## 10. Summary of open items for plan phase

| # | Item | Section |
|---|---|---|
| 1 | CR-1 (toolHint on CA-2) acknowledgment from W2 | Spec §9.2, research §2 |
| 2 | CR-2 (system prompt toolHint handling) acknowledgment from W2 | Spec §9.2, research §2 |
| 3 | CR-3 (`api.agent.proposals.undo`) acknowledgment from W5 | Spec §9.2 |
| 4 | CR-4 (`ChatInteractionProvider`) acknowledgment from W1 | Spec §9.2 |
| 5 | Backend query additions: `getMany`, `getManyByIds` variants | Research §3.5 |
| 6 | `_updateTime` type visibility | Research §6.2 |
| 7 | Virtualisation deferral confirmation | Research §7.2 |

All seven are cross-workstream blockers flagged explicitly at the top of the plan doc.

---

End of research.

---
workstream: W3 Generative UI
milestone: M3 Agentic Home
phase: Phase 1 (brainstorm)
author: Claude Opus 4.7 (1M context), Obra Superpowers
date: 2026-04-20
status: awaiting Eric review
depends_on: W0 (audit), W2 (tool registry contract; assumptions listed in §5)
blocks: W3 /plan
---

# W3 Generative UI: Brainstorm

This document is the Phase 1 deliverable for workstream W3 per `specs/00-master-prompt.md` §0. It captures the exploration, reconciles flags against `specs/W0-existing-state-audit.md`, records every design fork considered, names the chosen approach, and lists the W2 contract assumptions that must hold for W3 to proceed to `/plan`. No source code was touched. Writing convention: no em-dashes anywhere.

## 0. Context bootstrap

Inputs consumed:
- `specs/00-master-prompt.md` §§1 to 7, 11, and §8 W3 entry.
- `specs/W0-existing-state-audit.md` (full), with emphasis on §13 (`packages/ui` inventory) and §14 (credit-card UI components).
- `AGENTS.md` (full), `CLAUDE.md` (full).
- External read: `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/` (chat primitive reference), `/Users/itsjusteric/CrowDevelopment/Templates/untitledui/` (component library reference).
- Recent commit `0518c46 feat(transactions): detail-panel enhancements` and the transaction panel design docs under `docs/plans/2026-03-04-transaction-*.md` (to confirm the transaction detail panel exists and can be wrapped).

## 1. Scope (per master prompt §8 W3)

Goal: define how tool results become rendered React components inside chat, and build the MVP component set.

In scope for W3:
1. Streaming-aware dispatch protocol from Vercel AI SDK v5 `UIMessage` parts to per-tool-name React components.
2. A registry at `apps/app/src/components/chat/tool-results/index.ts`.
3. A `ToolResultRenderer` dispatcher that takes `(toolName, input, output, state, errorText)` and renders the matching component (plus a skeleton when streaming).
4. Eleven generative components per master prompt §8 W3 (full cut; Eric chose option A on scope).
5. A `ProposalConfirmCard` with live diff and bulk-aware rendering.
6. A dev-only preview harness at `apps/app/src/app/(app)/dev/tool-results/`.
7. Explicit documentation of W2 contract dependencies (§5 of this doc).

Out of scope for W3 (deferrals in §7 below): Storybook, visual-regression tooling, W6 intelligence-feature components (anomalies, subscription detection), voice drill-ins, component-level analytics.

## 2. Reconciliation flags (must resolve before /plan)

Flagging these here so they are settled before any plan task is authored. The `/plan` phase treats them as closed once Eric acknowledges.

### 2.1 AprBreakdown reconciliation

The initiating prompt asserted `AprBreakdown.tsx` does not exist and APR rendering happens via `CreditCardExtendedDetails` plus `PromoTracker`. Two independent sources contradict that:
- W0 audit §14.2 line 567 lists `apps/app/src/components/credit-cards/details/AprBreakdown.tsx` as present.
- Filesystem check during brainstorm confirmed the file is on disk.

Resolution adopted for this brainstorm: W3 treats `AprBreakdown` as an existing component and wraps it inside `CreditCardStatementCard`. If Eric wants to deprecate `AprBreakdown` and fold APR rendering into the other two, that is a separate refactor and must be scoped out of W3 because it would touch source code outside the W3 deliverable.

### 2.2 AI SDK hook

Master prompt §4 line 185 says "useChat from the Vercel AI SDK or current canonical hook." The research task for this workstream names Vercel AI SDK explicitly. The reference template at `ai-chatbot-untitledui` uses `@convex-dev/agent` directly rather than the Vercel AI SDK.

Resolution adopted: Vercel AI SDK v5 `useChat` is the client hook. W2 owns the backend serialization from `@convex-dev/agent` stream events into `UIMessage` parts. W3 does not negotiate this boundary and does not call Convex Agent primitives directly.

### 2.3 Where "transaction detail panel" lives

The master prompt lists `TransactionDetailCard` as an MVP W3 component. The recent commit `0518c46` (the panel enhancements) shipped a transaction detail panel that already renders in `apps/app`. W3 wraps that existing panel rather than rebuilding one.

## 3. Approaches explored

Every fork considered and how it resolved. Each entry records the options, the tradeoffs, and the chosen path.

### 3.1 MVP cut (full 11 vs phased)

Options considered:
- (A) Full eleven components in the initial W3 stack.
- (B) Core six now (`TransactionsTable`, `TransactionDetailCard`, `CreditCardStatementCard`, `SpendOverTimeChart`, `ProposalConfirmCard`, `RawTextMessage`) plus a W3.5 follow-up stack for the remaining five.
- (C) A custom cut.

Chosen: (A). Eric picked the full cut; downstream W5 and W6 then have no component gaps blocking their tool rollout.

### 3.2 Data-freshness contract

Options considered:
- (A) Pure ID-set; component re-aggregates client-side from a reactive query every render.
- (B) Hybrid; tool returns precomputed buckets plus the ID-set so the component renders immediately and also subscribes for live recompute.
- (C) Split protocol; entity lists use ID-set, aggregates return payload-only with no subscription.

Chosen: (B). Best latency and best liveness; cost is that W2 tools enumerate IDs and precompute. Explicit escape hatch: tools whose underlying data is not reactively subscribable set `preview.live: false` and render statically with a "captured at {timestamp}" footer.

### 3.3 Drill-in and card-action protocol

Options considered:
- (A) Natural-language synthesis.
- (B) Text plus tool-hint metadata on the `UIMessage`.
- (C) Slash-command convention.
- (D) Hybrid NL plus hint.

Chosen: (B). Transcript stays human-readable, routing stays deterministic, and the same pattern carries row clicks, card-action buttons (Edit, Add Note, Set Reminder), and `ProposalConfirmCard` Confirm/Cancel buttons. Requires W2 system prompt to honor `metadata.toolHint` as a strong routing directive.

### 3.4 ProposalConfirmCard diff (computation and rendering)

Computation options:
- (i-a) W2 ships a precomputed before/after snapshot.
- (i-b) W3 subscribes to affected rows and computes the diff live.
- (i-c) Hybrid: W2 ships a baseline plus `patch`, W3 subscribes and shows a drift banner if underlying rows change before confirm.

Rendering options:
- (ii-a) Side-by-side before/after columns.
- (ii-b) Inline unified (`field: before → after`).
- (ii-c) Bulk-aware (headline delta plus sampled rows plus affected count).

Chosen: (i-c) plus (ii-b as the primary single-variant) plus (ii-c for bulk). One component, `scope: "single" | "bulk"` variant. Single renders `category: Shopping -> Travel` inline with strike-through for before. Bulk renders a headline, 5 first and 5 last sample rows, an expandable full list, an affected count, and an irreversible-scope banner when `affectedIds.length > 500`.

### 3.5 Preview harness

Options considered:
- (A) Storybook via `@storybook/nextjs`.
- (B) In-app dev route at `/dev/tool-results`, gated by env.
- (C) Both.

Chosen: (B). The value the harness must capture (live Convex subscription, W2 tool-hint round-trip, UntitledUI tokens, theme toggle, Clerk viewer context) all exist naturally in the real app shell. Storybook mocks of those behaviors add complexity without matching the target environment. Visual-regression tooling can be layered later via Playwright screenshot diffs against the dev route.

### 3.6 Dispatcher and registry shape

Options considered:
- (A) Flat map keyed by tool-name literal (`Record<ToolName, RegistryEntry>`).
- (B) Categorized map (`{ read: {...}, propose: {...}, action: {...} }`).
- (C) Factory with tool-type discrimination on the output shape.

Chosen: (A). MVP size does not justify categorization; the registry file itself is small enough that a flat object is readable. TypeScript discriminated union on tool name gives the same compile-time safety as a categorized shape would.

### 3.7 Server vs client split

All tool-result components are client components. The chat page is a client component. React Server Components do not apply inside `tool-results/` because every component uses hooks (`useQuery` from `convex-helpers/react/cache/hooks`, `useChat`, `useState`, `useMutation` via `sendMessage`). RSC wrapping happens at `(app)/layout.tsx` and is W1's concern, not W3's.

## 4. Chosen design

Detail for each section of the brief. Section numbering matches the "questions the spec must answer" list in master prompt §8 W3.

### 4.1 Protocol layer (how tool calls become renders)

Client hook: `useChat` from Vercel AI SDK v5.

Dispatch flow:
1. A `UIMessage` arrives from the stream; each `parts[i]` is inspected.
2. If `part.type === 'text'`, render through `RawTextMessage` (Markdown pass-through).
3. If `part.type` matches the pattern `tool-$toolName` and `toolName` is a registry key, render `<Entry.Component input={part.input} output={part.output} state={part.state} errorText={part.errorText} proposalId={part.proposalId} />`.
4. On `state === 'input-streaming' | 'input-available' && !output`, render `<Entry.Skeleton />`.
5. On `state === 'output-available'`, render the full component.
6. On `state === 'output-error'`, render a shared `<ToolErrorRow toolName={toolName} errorText={part.errorText} />`.
7. Unknown tool name falls through to `<RawTextMessage text={JSON.stringify(part, null, 2)} />` so the thread never breaks on a streamed-but-unregistered tool.

Tool output schema (every read tool; confirmed in §5 as a W2 contract):

```ts
type ToolOutput<TPreview = unknown> = {
  ids: string[];
  preview: TPreview & { live?: boolean; capturedAt?: string };
  window?: { from: string; to: string };
};
```

**Reconciliation M9 (2026-04-20):** W2 wraps every tool call in a `ToolEnvelope<T>` (W2 §5.6). The envelope shape nests cleanly: `ToolEnvelope<ToolOutput<TPreview>>`. W2's `buildToolsForAgent` helper unwraps on success and feeds the `ToolOutput` directly to the AI SDK tool result; on envelope error, W2 feeds the error message back as a tool-error result. W3 components receive the **unwrapped** `ToolOutput` in props (not the envelope), so no W3 code changes. Canonical contract in [specs/00-contracts.md](00-contracts.md) §4. Propose tools use a distinct `ProposalToolOutput` shape; W3 dispatches off `toolName.startsWith("propose_")` and treats those separately.

Reactive data layer: every component receives `output.ids` and subscribes via `useQuery` (cached variant) to the relevant Convex query. The `preview` payload renders while the query resolves; on `ids` change, the component re-renders with live rows. Aggregates re-bucket client-side from the live rows, matching the `preview.buckets` shape so the render is visually identical.

Drill-in + card-action submission:

```ts
sendMessage({
  text: humanReadableLabel,
  metadata: {
    toolHint: { tool: "get_transaction_detail", args: { transactionId } }
  }
});
```

`sendMessage` is the Vercel AI SDK v5 API on the `useChat` return. W2 system prompt reads `metadata.toolHint` on the latest user message; if the hint is feasible (tool exists, user is authorized), the agent invokes the hinted tool directly. Otherwise it falls back to free-form tool selection.

### 4.2 Registry + ToolResultRenderer dispatcher

Location: `apps/app/src/components/chat/tool-results/`. File layout (authoritative for the plan phase):

```
apps/app/src/components/chat/tool-results/
├── index.ts                         // re-exports registry + dispatcher
├── registry.ts                      // flat map + type discriminant
├── ToolResultRenderer.tsx           // dispatcher
├── ToolErrorRow.tsx                 // shared error cell
├── RawTextMessage.tsx               // fallback renderer
├── shared/
│   ├── ToolCardShell.tsx            // card chrome with drill-in affordance
│   └── useToolHintSend.ts           // typed wrapper around sendMessage + toolHint
├── transactions/
│   ├── TransactionsTable.tsx
│   └── TransactionDetailCard.tsx
├── accounts/
│   └── AccountsSummary.tsx
├── credit-cards/
│   └── CreditCardStatementCard.tsx
├── charts/
│   ├── SpendByCategoryChart.tsx
│   └── SpendOverTimeChart.tsx
├── promos/
│   ├── DeferredInterestTimeline.tsx
│   └── InstallmentPlansList.tsx
├── reminders/
│   └── RemindersList.tsx
└── proposals/
    └── ProposalConfirmCard.tsx
```

Registry shape:

```ts
type ToolName =
  | "list_accounts"
  | "get_account_detail"
  | "list_transactions"
  | "get_transaction_detail"
  | "list_credit_cards"
  | "get_credit_card_detail"
  | "list_deferred_interest_promos"
  | "list_installment_plans"
  | "get_spend_by_category"
  | "get_spend_over_time"
  | "get_upcoming_statements"
  | "list_reminders"
  | "search_merchants"
  | "propose_transaction_update"
  | "propose_bulk_transaction_update"
  | "propose_credit_card_metadata_update"
  | "propose_manual_promo"
  | "propose_reminder_create"
  | "propose_reminder_delete";

type RegistryEntry<Input, Output> = {
  Component: FC<{ input: Input; output: Output | null; state: PartState; errorText?: string; proposalId?: string }>;
  Skeleton?: FC<{ input?: Input }>;
  variant?: "single" | "bulk";
};

export const toolResultRegistry: { [K in ToolName]: RegistryEntry<any, any> } = { ... };
```

### 4.3 ProposalConfirmCard

One component; `scope` field on the proposal payload drives variant selection.

State-machine subscription: `useQuery(api.agent.proposals.get, { proposalId })` (cached; W2 exposes this as `get_proposal` in the tool registry). Card re-renders when state transitions (`awaiting_confirmation | confirmed | executed | cancelled | timed_out`).

Live diff: card subscribes to each `affectedIds[i]` through the appropriate reactive query (`api.transactions.getById`, `api.creditCards.queries.get`, etc.). For each row, diff is computed as `current + patch`. If any subscribed row's `_updateTime` changes between mount and confirm, a subtle banner renders: "Underlying data changed while this proposal was pending. Recomputed preview below."

Single variant (`scope: "single"`):
- Inline unified rendering per field: `category: Shopping -> Travel`.
- Strike-through on before, color on after using UntitledUI utility tokens (`text-tertiary line-through` and `text-utility-success-700`).
- Collapses to a single line if only one field changes.

Bulk variant (`scope: "bulk"`):
- Headline delta ("847 transactions: category Shopping -> Travel; date unchanged").
- Sampled rows table: first 5 + last 5 `affectedIds` rendered via the same row component as `TransactionsTable`, with diff decoration.
- Expand control reveals all rows (virtualized; same approach as `TransactionsTable`).
- Affected count and an irreversible-scope banner when `affectedIds.length > 500`. Banner copy: "This proposal affects more than 500 rows. Chunked execution will run and cannot be undone as a single action; individual-row undo remains available for 10 minutes."

Confirm and Cancel:

```ts
// Confirm button
onClick={() => sendMessage({
  text: "Confirm proposal",
  metadata: { toolHint: { tool: "execute_confirmed_proposal", args: { proposalId } } }
})}

// Cancel button
onClick={() => sendMessage({
  text: "Cancel proposal",
  metadata: { toolHint: { tool: "cancel_proposal", args: { proposalId } } }
})}
```

Confirm button shows a 3-second countdown (disabled during countdown) when the irreversible-scope banner is present.

Post-execute state: card re-renders with a success state plus an Undo button. Button submits `{ text: "Undo", metadata: { toolHint: { tool: "undo_mutation", args: { reversalToken } } } }`. Button vanishes when `Date.now() - executedAt >= 10 * 60 * 1000`. Reactive timer via `setInterval` in a `useEffect` with cleanup; re-checks every 30 seconds.

### 4.4 Component inventory (11 MVP)

Mapping from tool name to component to existing-component reuse. Components marked "wrap" inherit behavior and styling from existing work; "new" components are built fresh.

| Tool name | Component | Existing components wrapped | Notes |
|---|---|---|---|
| `list_transactions` | `TransactionsTable` | Structure of existing `TransactionTableRow` from `apps/app/src/components/credit-cards/TransactionTableRow.tsx`. | Virtualized (TanStack Virtual if added, otherwise `react-aria-components` Table with windowing). Sort + filter are local client state. Row click submits drill-in with `toolHint: get_transaction_detail`. |
| `get_transaction_detail` | `TransactionDetailCard` | Existing transaction detail panel (shipped in `0518c46`). | Thin wrapper accepting `transactionId`; inherits the panel's attachment + time + PFC categories + hide affordances; adds chat-local action buttons (Edit category, Add note) that submit toolHint turns. |
| `list_accounts` | `AccountsSummary` | None direct; styling from UntitledUI `content-divider` + `metrics` primitives. | Groups accounts by institution (query `plaid:plaidItems` edge); institution click drill-in filters transactions by `plaidItemId`. |
| `get_account_detail` | (shares `AccountsSummary`; no separate component) | -- | Rendered by `AccountsSummary` with `ids.length === 1`. Registry entry points at the same component. |
| `list_credit_cards` + `get_credit_card_detail` | `CreditCardStatementCard` | `CreditCardExtendedDetails`, `CreditCardVisual`, `FlippableCreditCard`, `AprBreakdown`. | Accepts `cardId` (single) or `cardIds` (list). Single mode composes all four existing subcomponents. List mode renders a compact grid of `CreditCardVisual` instances with click drill-in. `AprBreakdown` and `PromoTracker` remain intact. |
| `list_deferred_interest_promos` | `DeferredInterestTimeline` | `PromoTracker` promo rows; urgency palette from `PromoTracker`'s `getUrgencyColor`. | Timeline view rather than per-card stack; shared data model; read-only variant of `PromoTracker` for chat. Manual-add affordance submits a `propose_manual_promo` tool-hint turn rather than calling the existing mutation directly. |
| `list_installment_plans` | `InstallmentPlansList` | `PromoTracker` installments portion. | List with expand-row to show payment schedule. |
| `get_spend_by_category` | `SpendByCategoryChart` | Recharts 3.x primitives wrapped in `packages/ui/src/components/untitledui/application/charts/*`. | Donut; category click drill-in submits `list_transactions` with `toolHint.args.category = <clicked>`. |
| `get_spend_over_time` | `SpendOverTimeChart` | Same chart primitives. | Line or area chart with bucket granularity from `window.granularity`; bucket click drill-in submits `list_transactions` with a date window. |
| `get_upcoming_statements` | (shares `CreditCardStatementCard`; list mode) | -- | `ids` point at `creditCards` rows; component renders a compact "next closing" strip. |
| `list_reminders` | `RemindersList` | None direct. | Grouped by due-date buckets (overdue / today / this week / later); create and edit affordances submit tool-hint turns. |
| `search_merchants` | (fallback to `RawTextMessage` for MVP) | -- | MVP punt: tool returns a merchant-name list; `RawTextMessage` renders it. A real merchant card is post-MVP; flagging but not building. |
| `propose_*` (all six) | `ProposalConfirmCard` | None. | Per §4.3. `scope` drives variant. |
| fallback | `RawTextMessage` | None. | Markdown pass-through. |

This maps the eleven components from the master-prompt brief onto the tool registry. The only tool from W2's list without a purpose-built component is `search_merchants`, which MVP renders via `RawTextMessage`.

### 4.5 Preview harness

Route: `apps/app/src/app/(app)/dev/tool-results/page.tsx` plus one sub-page per component at `apps/app/src/app/(app)/dev/tool-results/[component]/page.tsx`.

Gating: a server-side check at the top of each page:

```ts
if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEV_TOOLS !== "1") {
  notFound();
}
```

Per-component fixtures live under `apps/app/src/components/chat/tool-results/__fixtures__/{toolName}.fixture.ts`. Each fixture exports every relevant state:

- `inputStreaming` (no output yet)
- `outputAvailable` (typical)
- `outputAvailableEmpty` (zero ids)
- `outputError` (error-text string)
- For proposals: `awaitingConfirmation_single`, `awaitingConfirmation_bulk`, `awaitingConfirmation_irreversible`, `executed`, `executedWithinUndoWindow`, `executedPastUndoWindow`, `cancelled`, `timedOut`.

Theme toggle: re-uses the existing `useTheme` hook. Harness page exposes a toggle button. Acceptance: every component renders correctly in light and dark.

Harness does not mock Convex. It runs against the dev backend with a seeded fixture user (see plan-phase task for seed script).

### 4.6 RSC split and theming

RSC split: none of `tool-results/*` is an RSC. Chat page is client. `(app)/layout.tsx` remains the only RSC boundary, unchanged by W3.

Theming: every component imports from `@repo/ui/untitledui/...` and `@/utils/cx`. No local color literals. No new CSS files. Tailwind tokens only. The light/dark audit runs through the preview harness.

### 4.7 Error, empty, skeleton patterns

- Skeletons: each component owns a skeleton that matches its final shape. `ToolResultRenderer` delegates to `Entry.Skeleton` if present; otherwise renders a shared shimmer row.
- Empty states: `ids.length === 0` renders an empty variant inside the same component. No separate empty-state component.
- Error: `state === 'output-error'` routes to shared `<ToolErrorRow toolName={toolName} errorText={part.errorText} />` with a "Retry" button that re-submits the last user turn.
- Tool-hint rejection: if W2 reports back that a `toolHint` was infeasible and the agent routed elsewhere, the resulting tool result still renders normally. No special handling.

## 5. W2 contract dependencies (hard)

W3 cannot progress to `/plan` until these are acknowledged by the W2 brainstorm or formally negotiated. Each is a hard assumption that will be re-surfaced in the W3 `/plan` phase.

1. Every public agent tool output conforms to `{ ids, preview, window? }`. `preview` may carry `live: false` for static aggregates.
2. Tool names are the literal strings from master prompt §8 W2. Part types arrive as `tool-$toolName`.
3. W2 backend serializes Convex Agent stream events into Vercel AI SDK v5 `UIMessage` parts. Client uses `useChat` from `ai/react` or the equivalent, not `@convex-dev/agent`'s direct React hooks.
4. W2 system prompt treats `metadata.toolHint` on the latest user message as a strong routing directive. Hint schema: `{ tool: ToolName, args: Record<string, unknown> }`.
5. W2 exposes `get_proposal(proposalId)` as a read tool. Proposal shape: `{ proposalId, scope: "single" | "bulk", patch, affectedIds, preview: { sampleFirst, sampleLast, counts }, state, executedAt?, reversalToken? }`.
6. W2 exposes `execute_confirmed_proposal(proposalId)` and `cancel_proposal(proposalId)` as tools. Both ack with the updated proposal state.
7. W5 owns `undo_mutation(reversalToken)`. W3 emits the user turn; W3 does not implement the mutation.
8. Clerk viewer context propagates into every tool handler via `ctx.viewerX()` (per AGENTS.md §Auth Pattern and W0 §3 custom `functions.ts` wrapper). W3 does not verify this and assumes W2 tests it.
9. W2 handles rate limiting and token budget enforcement. W3 renders the resulting error states via `ToolErrorRow` but does not introduce client-side quota display (that is W1's banner territory).

## 6. Risks, edge cases, open questions

### 6.1 Concurrent proposal confirmation

Risk: user has the same proposal open in two tabs and confirms in both. W5 owns idempotency; W3 must render the already-executed state on the second tab without errors. Mitigation: `ProposalConfirmCard` subscribes to `get_proposal`; the second tab re-renders into the executed state as soon as the state machine updates. Acceptance test in the preview harness covers the transition.

### 6.2 Streaming backpressure and partial payloads

Risk: a long-running aggregate tool streams partial `buckets`. The `input-streaming` state is the master-prompt cue. W3 either renders skeleton throughout or progressively updates. MVP: skeleton until `output-available`, then single-shot render. Progressive chart updates are a follow-up.

### 6.3 Fixture drift from the real backend

Risk: fixtures at `__fixtures__/*.fixture.ts` become stale relative to what W2 actually ships. Mitigation: fixtures import the W2 tool-output types from `@convex/_generated/api` or a shared `packages/backend/convex/agent/types.ts`. TypeScript compile breaks if the shape drifts. Plan-phase task: enforce this import.

### 6.4 Tool-hint rejection UX

Risk: agent routes to a different tool than the hint. User clicked "Open transaction" but agent ran `list_transactions` instead. Behavior today is the resulting tool result renders normally; transcript reads correctly. No mitigation needed unless Eric wants a "hint was not honored" indicator (flagged as a nice-to-have for post-MVP).

### 6.5 Bulk scope above the chunking threshold

Risk: a bulk proposal above 500 rows exceeds the chunked-execution boundary W5 documents. `ProposalConfirmCard` currently shows an irreversible-scope banner. Open question: does the banner copy hint that per-row undo remains available? Resolved in the design (§4.3) as yes; will refine copy with Eric at `/plan` time.

### 6.6 Theming parity across wrapped components

Risk: existing components (`PromoTracker`, `CreditCardExtendedDetails`, `CreditCardVisual`, `FlippableCreditCard`, `AprBreakdown`) were built for standalone detail pages and may carry layout assumptions (container width, padding, sidebar neighbor) that break inside a chat message column. Mitigation: each wrapper in `tool-results/` places the wrapped component inside a `ToolCardShell` with a constrained max-width and a reset for any container-relative styles. Plan-phase task: audit each wrapped component's CSS for absolute widths or tight-container assumptions and document necessary wrapper overrides.

### 6.7 React Compiler interactions

Risk: the repo runs `babel-plugin-react-compiler` 1.x (per W0 §19.4). Manual memoization is being removed. Plan-phase tasks must avoid `useMemo` / `useCallback` / `React.memo` unless the compiler opts out. Reactive queries from `convex-helpers/react/cache/hooks` are already compiler-friendly. Flag for plan-phase lint check.

### 6.8 `search_merchants` MVP fallback

`search_merchants` has no purpose-built card for MVP and falls back to `RawTextMessage`. If Eric wants a proper merchant card in M3, it becomes a W3.5 item. Flagging, not blocking.

## 7. Out of scope (explicit followups)

- Storybook and Playwright visual-regression tooling.
- A dedicated `MerchantCard` for `search_merchants`.
- Voice input / voice-triggered drill-ins.
- Component-level analytics (drill-in funnel, click-through heatmaps).
- Server-side rendering of any tool-result component.
- W6 intelligence-feature components (anomalies, subscription detection cards). These slot into the same registry after W6 ships tool outputs; W3 does not build them.
- Progressive chart rendering during `input-streaming`.
- A dedicated "tool-hint was not honored" UX indicator.

## 8. What `/plan` must produce

Per master prompt §7, the plan file carries a Plan Handoff Header and per-task Claude Code / Codex tagging. The `/plan` phase for W3 must output:

- `specs/W3-generative-ui.md` (authoritative spec)
- `specs/W3-generative-ui.plan.md` (task breakdown with Plan Handoff Header)
- `specs/W3-generative-ui.research.md` (Vercel AI SDK v5 `useChat` pattern with citations; `convex-helpers/react/cache/hooks` usage notes; existing-component wrapping feasibility for the four named components plus `AprBreakdown`)

Proposed task slicing for the plan phase (not authoritative; the plan itself decides):
1. Registry scaffolding + `ToolResultRenderer` dispatcher + `RawTextMessage` + `ToolErrorRow` + `ToolCardShell` + `useToolHintSend` helper. Tagging: Claude Code (architectural).
2. `TransactionsTable` + `TransactionDetailCard`. Tagging: Codex (pattern-following; wraps existing panel).
3. `CreditCardStatementCard` composing the four existing card components plus `AprBreakdown`. Tagging: Claude Code (composition judgement across five existing components; cross-file reasoning).
4. `AccountsSummary`. Tagging: Codex.
5. `SpendByCategoryChart` + `SpendOverTimeChart`. Tagging: Codex (Recharts wrappers against existing `packages/ui` primitives).
6. `DeferredInterestTimeline` + `InstallmentPlansList`. Tagging: Codex (wraps `PromoTracker` portions).
7. `RemindersList`. Tagging: Codex.
8. `ProposalConfirmCard` (single + bulk + live diff + drift banner + countdown + undo). Tagging: Claude Code (most architectural component; cross-concerns with state machine and live query).
9. Preview harness at `apps/app/src/app/(app)/dev/tool-results/` plus per-component fixtures. Tagging: mixed; Claude Code designs the harness shape, Codex ships per-component fixtures.
10. Theming + RSC split audit (automated check that no tool-result file ships without `"use client"` and no tool-result file imports a color literal). Tagging: Codex.
11. W2 contract reconciliation: a short check-in with the W2 spec once it lands to confirm each of the nine contract assumptions in §5 is honored. Tagging: Claude Code (cross-spec reconciliation).

Each task above will carry a Plan Handoff Header, Linear issue id (LIN-TBD), Graphite branch (`feat/agentic-home/W3-<slug>`), acceptance criteria, and explicit `gt create` command per master prompt §7.

## 9. Research summary (preview; full doc in `/plan` phase)

These findings will be cited with links in `specs/W3-generative-ui.research.md` during `/plan`. Captured here to anchor the brainstorm's assumptions.

### 9.1 Vercel AI SDK v5 canonical pattern for tool-call-driven React rendering

The AI SDK v5 `useChat` hook returns `messages: UIMessage[]`. Each `UIMessage.parts[i]` has a discriminated `type` field. The canonical pattern for per-tool-name React rendering is:

```tsx
messages.map((m) =>
  m.parts.map((part, i) => {
    if (part.type === "text") return <Markdown key={i}>{part.text}</Markdown>;
    const toolName = part.type.startsWith("tool-") ? part.type.slice(5) : null;
    if (!toolName) return null;
    const entry = toolResultRegistry[toolName as ToolName];
    if (!entry) return <RawTextMessage key={i} text={JSON.stringify(part, null, 2)} />;
    const { Component, Skeleton } = entry;
    if (part.state === "input-streaming" || (part.state === "input-available" && !part.output)) {
      return Skeleton ? <Skeleton key={i} input={part.input} /> : <DefaultSkeleton key={i} />;
    }
    if (part.state === "output-error") {
      return <ToolErrorRow key={i} toolName={toolName} errorText={part.errorText} />;
    }
    return <Component key={i} input={part.input} output={part.output} state={part.state} proposalId={part.proposalId} />;
  })
)
```

Citation target for `/plan`: Vercel AI SDK v5 docs, `useChat` + `UIMessage` + `tool-*` part types. Research doc will capture the exact doc URL and version.

Key confirmations:
- v5 added the `tool-*` part-type convention (earlier versions used a single `tool-invocation` part).
- `metadata` field on `UIMessage` is a supported escape hatch for client-originated routing hints.
- Streaming partials arrive as incremental parts; the same `toolCallId` dedupes.

### 9.2 `convex-helpers/react/cache/hooks` usage

The cached `useQuery` dedupes identical queries across subscribers and maintains the cache across remounts. Used in place of `convex/react`'s `useQuery` (per `AGENTS.md` Common Pitfalls and the user instruction at the top of this brainstorm).

Typical wire-up:

```tsx
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex/_generated/api";

const rows = useQuery(api.transactions.queries.getManyByIds, { ids: output.ids });
```

Plan-phase tasks will add a lint rule or a pre-commit check that flags imports of `useQuery` from `convex/react` inside `tool-results/*`.

### 9.3 Existing-component wrapping feasibility

- `PromoTracker`: self-fetching (`useQuery(api.promoRates.queries.listByCard, ...)`). Chat wrapper passes `creditCardId`; no refactor needed.
- `CreditCardExtendedDetails`: self-fetching via `cardId`. Safe to wrap.
- `CreditCardVisual` + `FlippableCreditCard`: accept card data as prop or `cardId` (mixed; `CardVisualWrapper` in W0 §14.1 handles the variants). Chat wrapper leans on `CardVisualWrapper`.
- `AprBreakdown`: self-fetching via `cardId`. Safe to wrap.

No source code changes required to wrap any of the four; the chat wrappers pass the right IDs and constrain the container width.

---

## 10. Reconciliation appendix (2026-04-20)

Cross-spec reconciliation pass closed the following W3 items. Canonical source: [specs/00-contracts.md](00-contracts.md).

| ID | Issue | Resolution |
|---|---|---|
| M6 | `scope` field on proposal payload | W2 adds `scope: v.union(v.literal("single"), v.literal("bulk"))` to `agentProposals` schema. `ProposalConfirmCard` in §4.3 reads `scope` directly from the W2-provided proposal (via `get_proposal`), does not derive from `affectedIds.length`. |
| M7 | Proposal state enum count | Align to W2's 9-state enum: `proposed`, `awaiting_confirmation`, `confirmed`, `executing`, `executed`, `cancelled`, `timed_out`, `reverted`, `failed`. `ProposalConfirmCard` renders for `awaiting_confirmation`, `executing`, `executed` (with Undo if in-window), `cancelled`, `timed_out`, `reverted`, `failed`. No `confirmed` or `proposed` rendering (both are transient). See contracts §3. |
| M9 | `ToolEnvelope` / `ToolOutput` layering | §4.1 updated inline. W2 owns unwrap; W3 receives `ToolOutput` only. Canonical in contracts §4. |
| M11 | `get_proposal` tool dependency made explicit | §5 item 5 already states the assumption. W2 brainstorm amendment added the tool (registry item 25). No W3 change needed; `/plan` treats the assumption as satisfied. |
| M12 | `cancel_proposal` and `execute_confirmed_proposal` ownership | Both in W2's tool registry. `ProposalConfirmCard` §4.3 `sendMessage` toolHint pattern correctly targets them. No change. |

No W3 contract moves. W3 `/plan` proceeds once W2 brainstorm is approved (which it is after its reconciliation amendment lands).

---

End of brainstorm. Awaiting review before proceeding to `/plan`.

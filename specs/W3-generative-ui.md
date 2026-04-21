---
workstream: W3 Generative UI
milestone: M3 Agentic Home
status: spec (awaiting /plan execution)
author: Claude Opus 4.7 (1M context), Obra Superpowers
date: 2026-04-20
depends_on:
  - specs/W0-existing-state-audit.md
  - specs/W1-chat-home.brainstorm.md (CA-1 through CA-14, CB-1 through CB-4)
  - specs/W2-agent-backend.brainstorm.md (D4 reactive query, D7 useUIMessages)
  - specs/00-contracts.md (tool registry §2, proposal state machine §3, ToolEnvelope §4)
blocks:
  - specs/W3-generative-ui.plan.md
supersedes:
  - §4.1 of specs/W3-generative-ui.brainstorm.md (Vercel AI SDK `useChat` language; see §2.1 of this spec)
---

# W3: Generative UI Protocol and Component Library

## 1. Goal

Define how agent tool results become rendered React components inside chat, and build the 11-component MVP set per master-prompt §8 W3 (option A, full cut). Deliver one dispatcher, one registry, eleven components, one preview harness, one `ProposalConfirmCard` that covers all six `propose_*` tools, and a complete W2 contract-assumption ledger.

## 2. Non-goals (explicit deferrals)

- Storybook and Playwright visual-regression tooling (preview harness at `/dev/tool-results` is MVP; visual-regression layered post-M3).
- Voice input or voice-driven drill-ins.
- Component-level analytics (drill-in funnel, click-through heatmaps).
- Server-side rendering inside `tool-results/` (all client).
- Progressive chart rendering during `input-streaming` (skeleton until `output-available`; progressive updates are post-MVP).
- A dedicated `MerchantCard` for `search_merchants` (MVP renders via `RawTextMessage`).
- Tool-hint rejection indicator UI (agent routing that ignored a hint still renders normally).
- W6 intelligence-feature components (anomalies, subscription detection). Same registry accepts them post-M3; W3 does not build them.

## 3. Architecture

### 3.1 Dispatch source (correction to brainstorm §4.1)

The brainstorm's §4.1 language assumed Vercel AI SDK v5 `useChat` from `ai/react`. Cross-workstream reconciliation (see [specs/00-contracts.md](00-contracts.md) §5.1 D4 lock, plus W1 brainstorm D7) overrides this. The streaming source is the `@convex-dev/agent` React integration, which surfaces Vercel AI SDK `UIMessage[]` via a reactive Convex query wrapper:

```ts
import { useUIMessages } from "@convex-dev/agent/react";
import { api } from "@convex/_generated/api";

const { messages, ... } = useUIMessages(
  api.agent.messages.listWithStreaming,
  { threadId },
  { initialNumItems: 30 }
);
```

Per-`UIMessage.parts[i]` dispatch shape (`part.type === 'tool-$toolName'`) is identical to the canonical Vercel AI SDK v5 pattern because `@convex-dev/agent/react` emits the AI SDK UIMessage format. W3 code does not import from `ai/react` directly; it imports from `@convex-dev/agent/react` via W1's wrapper.

This is the only architectural correction from the brainstorm. Every other §4 section of the brainstorm stands.

### 3.2 Layering

| Layer | Owner | Responsibility |
|---|---|---|
| Stream + hook (`useUIMessages`, thread query) | W1 (consumes W2 CA-3) | Surfaces UIMessage[] to the UI tree |
| `MessageBubble` (renders per message) | W1 | Iterates parts; text parts go through `Markdown`; tool parts delegate to `ToolResultRenderer` |
| `ToolResultRenderer` (dispatcher) | W1 ships shell; W3 populates | Reads registry; renders component or skeleton or error |
| `toolResultRegistry` (registry) | W3 | `Record<ToolName, RegistryEntry>` plus `proposalFallback` |
| 11 generative components | W3 | Per §5 inventory |
| `ChatInteractionProvider` + `useChatInteraction()` | W1 | Supplies `sendMessage({ text, toolHint? })`. That one primitive carries every write-path action: Confirm, Cancel, and Undo from `ProposalConfirmCard` all dispatch `sendMessage` turns with `toolHint.tool` set to `execute_confirmed_proposal`, `cancel_proposal`, or `undo_mutation` respectively, routing the write through the agent tool-path so W5's wrapper (rate limit, first-turn guard, audit log, workflow) fires. No dedicated confirm or cancel or undo callback surface. |
| Preview harness at `/dev/tool-results` | W3 | Renders every component against fixtures against dev Convex backend |

### 3.3 Data-freshness contract

Every read tool's output (inside the `ok: true` branch of `ToolEnvelope<T>`; W2 unwraps before the result reaches W3) conforms to:

```ts
type ToolOutput<TPreview = unknown> = {
  ids: string[];
  preview: TPreview & { live?: boolean; capturedAt?: string };
  window?: { from: string; to: string; granularity?: "day" | "week" | "month" };
};
```

Rules:
1. Entity-list tools (`list_transactions`, `list_credit_cards`, etc.) fill `ids` with Convex Ents IDs as strings; `preview` is null or a light header payload.
2. Aggregate tools (`get_spend_by_category`, `get_spend_over_time`, `get_upcoming_statements`) fill both `ids` (participating Convex Ents IDs) and `preview.buckets` (precomputed aggregate data).
3. Tools whose underlying data is not subscribable set `preview.live: false` and set `preview.capturedAt` to an ISO timestamp. Component renders statically from `preview` and displays a footer reading "Captured at {formattedTimestamp}".
4. Components read `output.ids`, subscribe via cached `useQuery` from `convex-helpers/react/cache/hooks` to the relevant query, and render live rows once the query resolves. While the query loads, components render from `preview`.

Propose tools return a distinct shape (not `ToolOutput`), per [specs/00-contracts.md](00-contracts.md) §4:

```ts
type ProposalToolOutput = {
  proposalId: Id<"agentProposals">;
  scope: "single" | "bulk";
  summary: string;
  sample: unknown;
  affectedCount: number;
};
```

### 3.4 Dispatcher contract

`ToolResultRenderer` (owned by W1 per CB-1) consumes each `UIMessagePart` and dispatches as follows:

```
Part type                                          Render path
------------------------------------------------------------------------
part.type === "text"                              Markdown (W1-owned)
part.type === "reasoning"                         ReasoningAccordion (W1-owned, post-MVP)
part.type starts with "tool-"                     lookup(toolName) in toolResultRegistry
  toolName starts with "propose_"                 proposalFallback (ProposalConfirmCard)
  toolName in registry                             registry[toolName].Component
  toolName not in registry                         RawTextMessage (registry fallback)
part.state === "input-streaming"                  registry[toolName].Skeleton (if any) else shared skeleton
part.state === "output-error"                     ToolErrorRow (W1-owned; passes errorText through)
```

Signature for every registered component:

```ts
type ToolResultComponentProps<Input, Output> = {
  toolName: ToolName;
  input: Input;
  output: Output | null;
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  errorText?: string;
  proposalId?: Id<"agentProposals">;
  threadId: Id<"agentThreads">;
};
```

Matches W1 CB-1 signature verbatim. `threadId` is passed through so drill-ins can target the same thread on follow-up turns.

### 3.5 Registry shape (W3 authoritative)

```ts
// apps/app/src/components/chat/tool-results/registry.ts

type RegistryEntry<Input, Output> = {
  Component: FC<ToolResultComponentProps<Input, Output>>;
  Skeleton?: FC<{ input?: Input }>;
};

export const toolResultRegistry: {
  [K in ReadToolName]: RegistryEntry<InputFor<K>, OutputFor<K>>;
} = {
  list_accounts:                   { Component: AccountsSummary,           Skeleton: AccountsSummarySkeleton },
  get_account_detail:              { Component: AccountsSummary,           Skeleton: AccountsSummarySkeleton },
  list_transactions:               { Component: TransactionsTable,         Skeleton: TransactionsTableSkeleton },
  get_transaction_detail:          { Component: TransactionDetailCard,     Skeleton: TransactionDetailCardSkeleton },
  list_credit_cards:               { Component: CreditCardStatementCard,   Skeleton: CreditCardStatementCardSkeleton },
  get_credit_card_detail:          { Component: CreditCardStatementCard,   Skeleton: CreditCardStatementCardSkeleton },
  list_deferred_interest_promos:   { Component: DeferredInterestTimeline,  Skeleton: DeferredInterestTimelineSkeleton },
  list_installment_plans:          { Component: InstallmentPlansList,      Skeleton: InstallmentPlansListSkeleton },
  get_spend_by_category:           { Component: SpendByCategoryChart,      Skeleton: SpendByCategoryChartSkeleton },
  get_spend_over_time:             { Component: SpendOverTimeChart,        Skeleton: SpendOverTimeChartSkeleton },
  get_upcoming_statements:         { Component: CreditCardStatementCard,   Skeleton: CreditCardStatementCardSkeleton },
  list_reminders:                  { Component: RemindersList,             Skeleton: RemindersListSkeleton },
  search_merchants:                { Component: RawTextMessage,            /* fallback */ },
  get_plaid_health:                { Component: RawTextMessage,            /* W4-owned view is post-MVP */ },
  get_proposal:                    { Component: ProposalConfirmCard        /* scope read from payload at render time */ },
};

export const proposalFallback: FC<ToolResultComponentProps<unknown, ProposalToolOutput>> =
  ProposalConfirmCard;
```

`ReadToolName` is the 14-element union from [specs/00-contracts.md](00-contracts.md) §2.1 plus `get_proposal` from §2.5. Propose tool names (§2.2) do not appear in `toolResultRegistry`; they route through `proposalFallback` keyed on the `propose_` prefix.

### 3.6 Drill-in and card-action protocol

Every interactive element inside a tool-result component (row click, category tile click, bucket click, "Edit category" button, "Add note" button, "Set reminder" button) submits a new user turn via `ChatInteractionContext`:

```ts
const { sendMessage } = useChatInteraction();

sendMessage({
  text: "Open this transaction",
  toolHint: {
    tool: "get_transaction_detail",
    args: { transactionId }
  }
});
```

W1 owns the `ChatInteractionProvider` mounted at `ChatView`. W1 owns the `useChatInteraction` hook. W3 components consume both via `apps/app/src/components/chat/` imports. W3 contributes `apps/app/src/components/chat/tool-results/shared/useToolHintSend.ts`, a typed convenience wrapper that W3 components call in preference to the raw context:

```ts
// Typed per tool; generated from ToolName union
export function useToolHintSend() {
  const { sendMessage } = useChatInteraction();
  return {
    openTransaction: (transactionId: Id<"plaid:plaidTransactions">) =>
      sendMessage({ text: "Open transaction", toolHint: { tool: "get_transaction_detail", args: { transactionId } } }),
    openCard: (cardId: Id<"creditCards">) =>
      sendMessage({ text: "Open card", toolHint: { tool: "get_credit_card_detail", args: { cardId } } }),
    filterTransactionsByCategory: (category: string) =>
      sendMessage({ text: `Show ${category} transactions`, toolHint: { tool: "list_transactions", args: { category } } }),
    filterTransactionsByWindow: (from: string, to: string) =>
      sendMessage({ text: `Show transactions from ${from} to ${to}`, toolHint: { tool: "list_transactions", args: { window: { from, to } } } }),
    filterByInstitution: (plaidItemId: string) =>
      sendMessage({ text: "Show transactions for this institution", toolHint: { tool: "list_transactions", args: { plaidItemId } } }),
    createReminder: (prefill: { title: string; dueAt: number }) =>
      sendMessage({ text: `Create a reminder: ${prefill.title}`, toolHint: { tool: "propose_reminder_create", args: prefill } }),
    editTransactionCategory: (transactionId: string, currentCategory: string) =>
      sendMessage({ text: `Recategorize this transaction`, toolHint: { tool: "propose_transaction_update", args: { transactionId, currentCategory } } }),
    addManualPromo: (cardId: Id<"creditCards">) =>
      sendMessage({ text: "Add a manual promo for this card", toolHint: { tool: "propose_manual_promo", args: { cardId } } }),
  };
}
```

Requires a W2 CA-2 extension (flagged as contract request in §9).

### 3.7 `ProposalConfirmCard` contract

Single component; one file; one `scope` branch read from the payload at render time. Confirm, Cancel, and Undo route through agent tools per [specs/00-contracts.md](00-contracts.md) §2.3 (reconciliation M12). The component calls `sendMessage({ text, toolHint })` from `useChatInteraction()` directly; no mutation-callback props. W1's CB-3 prop signature (line 390 of W1 brainstorm) contradicts M12 and must reconcile to match this contract; see §9.2 CR-4 below.

```ts
type ProposalConfirmCardProps = {
  proposalId: Id<"agentProposals">;
};

// Everything else (scope, state, diff, executedAt, undoExpiresAt, reversalToken,
// errorSummary) comes from the reactive subscription to api.agent.proposals.get
// and the live row subscriptions over affectedIds. The card is self-contained
// given a proposalId.

type ProposalDiff = {
  patch: Record<string, unknown>;
  affectedIds: string[];
  sampleFirst: Array<{ id: string; before: Record<string, unknown>; after: Record<string, unknown> }>;
  sampleLast: Array<{ id: string; before: Record<string, unknown>; after: Record<string, unknown> }>;
  totalAffected: number;
};
```

States that W3 renders (per [specs/00-contracts.md](00-contracts.md) §3):

| State | Rendering |
|---|---|
| `awaiting_confirmation` | Diff visible; Confirm and Cancel buttons active; drift banner if any `affectedIds[i]._updateTime` drifted since mount |
| `executing` | Diff dimmed; spinner in place of Confirm; Cancel disabled |
| `executed` | Success state; Undo button active if `Date.now() < undoExpiresAt`; collapses to summary after Undo window passes |
| `cancelled` | Greyed-out summary card; no actions |
| `timed_out` | Warning-coloured summary card; "Proposal expired" message; no actions |
| `reverted` | Neutral summary card; "Reverted at {time}"; no actions |
| `failed` | Error summary card; `errorSummary` visible; no actions |

States that W3 does NOT render (transient; W2 transitions through them synchronously): `proposed`, `confirmed`.

Live-diff behaviour:
1. On mount, the component subscribes to `api.agent.proposals.get({ proposalId })` via cached `useQuery` for state-machine transitions.
2. For each `affectedIds[i]`, the component subscribes to the relevant entity's canonical query via cached `useQuery`. Row type is discriminated by a prefix on the ID (`agentProposalRows.targetTable` per contracts §1.6).
3. If any subscribed row's `_updateTime` changes between mount and confirm, a non-destructive banner surfaces: `"Underlying data changed while this proposal was pending. Recomputed preview below."`
4. If `affectedIds.length > 500`, the card renders an irreversible-scope banner: `"This proposal affects more than 500 rows. Chunked execution will run and cannot be undone as a single action; individual-row undo remains available for 10 minutes via separate agent prompts."`

Single variant rendering (`scope === "single"`):
- One field per line: `category: Shopping -> Travel` (value `Shopping` strike-through in `text-tertiary`, value `Travel` in `text-utility-success-700`).
- Fields collapse if only one entry in `patch`.

Bulk variant rendering (`scope === "bulk"`):
- Headline: `"{totalAffected} transactions: {field-summary}"` where `field-summary` joins every `patch` entry as `{key}: {before} -> {after}` (or `{key} unchanged` for null diffs).
- Sample rows table: `sampleFirst` then separator then `sampleLast`, each row rendered with the same row component as `TransactionsTable` plus inline diff decoration on changed cells.
- `Expand` control reveals all `affectedIds` rendered via the same virtualized row component; trades off performance at 10,000+ row scope.
- `Irreversible` banner when `affectedIds.length > 500`.

Confirm button behaviour:
- Default: disabled for 250 ms on mount (prevents misclicks after the card appears from streaming).
- Irreversible scope: 3-second countdown badge overlays the button; disabled during countdown; re-enables with a subtle flash.
- On click, fires `sendMessage({ text: "Confirm", toolHint: { tool: "execute_confirmed_proposal", args: { proposalId } } })`. The agent invokes `execute_confirmed_proposal` (tool 21 from contracts §2.3) which runs W5's write-tool wrapper: auth check, rate-limit bucket, first-turn guard, audit log insert, workflow kickoff. State transitions `awaiting_confirmation -> confirmed -> executing -> executed` are observed via the reactive subscription to `api.agent.proposals.get`.

Cancel button behaviour:
- On click, fires `sendMessage({ text: "Cancel", toolHint: { tool: "cancel_proposal", args: { proposalId } } })`. Agent invokes `cancel_proposal` (tool 22). State transitions `awaiting_confirmation -> cancelled`, observed reactively.

Undo button behaviour:
- Visible only in `state === "executed"` with `undoExpiresAt > Date.now()`.
- `useEffect` polls `Date.now()` every 30 s (`setInterval` with cleanup) to hide the button past window.
- On click, fires `sendMessage({ text: "Undo", toolHint: { tool: "undo_mutation", args: { reversalToken } } })`. Agent invokes `undo_mutation` (tool 23) which runs W5's wrapper and emits a reversal audit entry. State transitions `executed -> reverted`, observed reactively.

## 4. File structure

Authoritative layout for `apps/app/src/components/chat/tool-results/`:

```
apps/app/src/components/chat/tool-results/
├── index.ts                                    // re-exports registry, proposalFallback, ToolResultComponentProps
├── registry.ts                                 // Record<ToolName, RegistryEntry> + proposalFallback
├── types.ts                                    // ToolOutput, ProposalToolOutput, ToolResultComponentProps, ProposalDiff
├── shared/
│   ├── ToolCardShell.tsx                      // card chrome with drill-in affordance; consistent padding; dark-mode friendly
│   ├── useToolHintSend.ts                     // typed wrapper around ChatInteractionContext.sendMessage
│   ├── RawTextMessage.tsx                     // Markdown fallback
│   ├── ToolErrorRow.tsx                       // shared error cell; NOTE this file is W1-owned; W3 imports only
│   ├── Skeletons.tsx                          // shared skeleton primitives used by per-component skeletons
│   └── liveRowsHooks.ts                       // hook family for subscribing to ids via cached useQuery
├── transactions/
│   ├── TransactionsTable.tsx
│   └── TransactionDetailCard.tsx
├── accounts/
│   └── AccountsSummary.tsx                    // handles both list_accounts and get_account_detail
├── credit-cards/
│   ├── CreditCardStatementCard.tsx            // handles list_credit_cards, get_credit_card_detail, get_upcoming_statements
│   └── CreditCardStatementCardSkeleton.tsx
├── charts/
│   ├── SpendByCategoryChart.tsx
│   └── SpendOverTimeChart.tsx
├── promos/
│   ├── DeferredInterestTimeline.tsx
│   └── InstallmentPlansList.tsx
├── reminders/
│   └── RemindersList.tsx
├── proposals/
│   └── ProposalConfirmCard.tsx
└── __fixtures__/
    ├── list_transactions.fixture.ts
    ├── get_transaction_detail.fixture.ts
    ├── list_accounts.fixture.ts
    ├── list_credit_cards.fixture.ts
    ├── list_deferred_interest_promos.fixture.ts
    ├── list_installment_plans.fixture.ts
    ├── get_spend_by_category.fixture.ts
    ├── get_spend_over_time.fixture.ts
    ├── get_upcoming_statements.fixture.ts
    ├── list_reminders.fixture.ts
    ├── search_merchants.fixture.ts
    ├── propose_transaction_update.fixture.ts
    ├── propose_bulk_transaction_update.fixture.ts
    ├── propose_credit_card_metadata_update.fixture.ts
    ├── propose_manual_promo.fixture.ts
    ├── propose_reminder_create.fixture.ts
    └── propose_reminder_delete.fixture.ts

apps/app/src/app/(app)/dev/tool-results/
├── page.tsx                                    // index; lists every component with links
└── [component]/
    └── page.tsx                                // renders one component against all fixture states plus theme toggle
```

Ten directories, twenty-four files inside `tool-results/`, two files under `dev/tool-results/`. No changes outside these paths.

## 5. Component inventory (11 MVP per master-prompt §8 W3)

| # | Component | Tool names it serves | Wraps existing | Notes |
|---|---|---|---|---|
| 1 | `TransactionsTable` | `list_transactions` | Structure of existing `apps/app/src/components/credit-cards/TransactionTableRow.tsx` | Virtualised table. Sort + filter are local client state. Row click: `openTransaction(transactionId)`. |
| 2 | `TransactionDetailCard` | `get_transaction_detail` | Existing transaction detail panel (`0518c46`; plans at [docs/plans/2026-03-04-transaction-detail-panel-design.md](../docs/plans/2026-03-04-transaction-detail-panel-design.md)) | Thin wrapper accepting `transactionId`; inherits attachments, time, PFC categories, hide affordances. Adds three chat actions: Edit category, Add note, Hide. Each fires a toolHint turn. |
| 3 | `AccountsSummary` | `list_accounts`, `get_account_detail` | None | Groups by institution (edge to `plaidItems`); click institution -> `filterByInstitution`. Compact variant when `ids.length === 1` (detail mode). |
| 4 | `CreditCardStatementCard` | `list_credit_cards`, `get_credit_card_detail`, `get_upcoming_statements` | `CreditCardExtendedDetails`, `CreditCardVisual`, `FlippableCreditCard`, `AprBreakdown` | Accepts `cardId` (single) or `cardIds` (list). Single mode composes all four existing subcomponents inside a `ToolCardShell`. List mode renders a grid of `CreditCardVisual` instances. |
| 5 | `SpendByCategoryChart` | `get_spend_by_category` | Recharts primitives wrapped in `packages/ui/src/components/untitledui/application/charts/charts-base.tsx` | Donut; category click -> `filterTransactionsByCategory`. |
| 6 | `SpendOverTimeChart` | `get_spend_over_time` | Same chart primitives | Line or area. Bucket click -> `filterTransactionsByWindow(bucket.from, bucket.to)`. Granularity from `output.window.granularity`. |
| 7 | `DeferredInterestTimeline` | `list_deferred_interest_promos` | `PromoTracker` promo rows; urgency palette from `PromoTracker.getUrgencyColor` | Timeline view (horizontal track with urgency-coloured markers) rather than per-card stack. Manual-add action fires `addManualPromo(cardId)`. |
| 8 | `InstallmentPlansList` | `list_installment_plans` | `PromoTracker` installments portion | List with expand-row for payment schedule. |
| 9 | `RemindersList` | `list_reminders` | None | Grouped by due-date bucket (overdue / today / this week / later). Create action fires `createReminder(prefill)`. |
| 10 | `ProposalConfirmCard` | all `propose_*` tools (via `proposalFallback`) | None | Per §3.7. |
| 11 | `RawTextMessage` | `search_merchants` and unregistered fallback | None | Markdown pass-through. |

## 6. Preview harness

Route: `apps/app/src/app/(app)/dev/tool-results/`.

Index page at `page.tsx` lists every component with links to sub-pages. Each sub-page at `[component]/page.tsx` renders all fixture states for that component with a theme-toggle button and a "dark" / "light" indicator.

Fixture file per tool at `apps/app/src/components/chat/tool-results/__fixtures__/{toolName}.fixture.ts`. Each fixture exports at minimum:

```ts
export const inputStreaming: ToolResultComponentProps<InputFor<ToolName>, null> = { ... };
export const outputAvailable: ToolResultComponentProps<InputFor<ToolName>, OutputFor<ToolName>> = { ... };
export const outputAvailableEmpty: ToolResultComponentProps<...> = { ... };
export const outputError: ToolResultComponentProps<...> = { ... };
```

Proposal fixtures additionally export: `awaitingConfirmation_single`, `awaitingConfirmation_bulk`, `awaitingConfirmation_irreversible` (≥501 rows), `executing`, `executed`, `executedWithinUndoWindow`, `executedPastUndoWindow`, `cancelled`, `timedOut`, `reverted`, `failed`.

Gating (applied at both `page.tsx` files):

```ts
if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEV_TOOLS !== "1") {
  notFound();
}
```

The harness runs against the live dev Convex backend. Fixtures point at seeded user data (plan task 10 specifies the seed script).

## 7. Theming, RSC, React Compiler

### 7.1 Theming

- Every component imports from `@repo/ui/untitledui/...` and `@/utils/cx`.
- No local colour literals. Tailwind UntitledUI tokens only (`text-primary`, `text-tertiary`, `text-utility-success-700`, `bg-primary`, `bg-utility-brand-50`, etc.).
- No new CSS files.
- Light-and-dark audit happens in the preview harness. Every sub-page has a toggle that calls `useTheme().setTheme("dark" | "light")`.

### 7.2 RSC split

- Every file under `apps/app/src/components/chat/tool-results/` begins with `"use client"`.
- `dev/tool-results/page.tsx` and `dev/tool-results/[component]/page.tsx` begin with `"use client"` so the theme toggle and live queries work.
- The RSC boundary remains at `(app)/layout.tsx` (W1 territory; unchanged by W3).

### 7.3 React Compiler

- Repo runs `babel-plugin-react-compiler` 1.x. Manual memoisation is being removed (W0 §19.4, commit `241d343`).
- No `useMemo`, `useCallback`, or `React.memo` anywhere under `tool-results/` unless the compiler explicitly cannot handle the case. If an edge case arises, the component file carries a `// Compiler cannot handle X because Y` comment immediately above the hook; otherwise these hooks are forbidden.
- Cached `useQuery` from `convex-helpers/react/cache/hooks` is compiler-friendly (confirmed pattern; see research §9.2 in brainstorm).

## 8. Error, empty, skeleton patterns

- **Skeleton:** Each component owns its skeleton matching final shape (table rows as empty strips, chart as grey lines, card as outlined boxes). `ToolResultRenderer` delegates to `Entry.Skeleton` when `state === "input-streaming"` or `state === "input-available" && !output`. When no skeleton is registered, the dispatcher renders a shared single-row shimmer.
- **Empty:** `ids.length === 0` renders an empty variant inside the same component. Copy pattern: `"No {nouns} in {window}."` No separate empty-state component.
- **Error:** `state === "output-error"` routes to W1's `<ToolErrorRow toolName={toolName} errorText={errorText} />`. W1 owns the error row; W3 passes `errorText` through.
- **Retry:** `ToolErrorRow` (W1) renders a Retry button that re-submits the last user turn. W3 does not own retry.
- **Drift banner** (proposal-specific): See §3.7.

## 9. W2 contract assumptions and contract requests

All bind the spec. W3 `/plan` blocks until each is acknowledged in the matching W2 or W1 plan phase.

### 9.1 Honored by existing W2 or W1 brainstorms

| # | Assumption | Source |
|---|---|---|
| 1 | Tool outputs conform to `{ ids, preview, window? }` (read tools) or `ProposalToolOutput` (propose tools) | [specs/00-contracts.md](00-contracts.md) §4 |
| 2 | Tool names match the 25-tool registry literals | [specs/00-contracts.md](00-contracts.md) §2 |
| 3 | Streaming source is `@convex-dev/agent`'s `useUIMessages` over `api.agent.messages.listWithStreaming` | W1 §D7; W2 §D4 |
| 4 | Proposal state enum is 9 states; W3 renders 7 (see §3.7) | [specs/00-contracts.md](00-contracts.md) §3 |
| 5 | `scope` field is on `agentProposals` and is read from `ProposalToolOutput.scope`, not derived | [specs/00-contracts.md](00-contracts.md) §1.6 (reconciliation M6) |
| 6 | `get_proposal` is a read tool returning the proposal with sample and state | [specs/00-contracts.md](00-contracts.md) §2.5 (M11) |
| 7 | Confirm, Cancel, and Undo on `ProposalConfirmCard` route through the agent tool-path (`execute_confirmed_proposal`, `cancel_proposal`, `undo_mutation`) via `sendMessage` + `toolHint`, not through direct Convex mutations. This enforces the write-tool wrapper (rate limit, first-turn guard, audit log, workflow) per reconciliation M12. W1's CA-9 / CA-10 may exist as internal W2 state-flip helpers that the tool path calls; W3 does not consume them. | [specs/00-contracts.md](00-contracts.md) §2.3 (tools 21 to 23) and §3 (state machine) |
| 8 | Clerk viewer context propagates into every tool handler via `ctx.viewerX()` | AGENTS.md §Auth Pattern; W0 §3 |
| 9 | Rate-limit and budget errors surface as `AgentError.kind` typed values; W1 renders banners | [specs/00-contracts.md](00-contracts.md) §6 |

### 9.2 Contract extension requests (W3 asks W2 or W1 to add)

| # | Request | Why | Status |
|---|---|---|---|
| CR-1 | `api.agent.chat.sendStreaming` args extend to `{ threadId, prompt, modelId?, toolHint?: { tool: ToolName, args: Record<string, unknown> } }`. Non-breaking addition. | Drill-in and card-action determinism per §3.6. Without `toolHint`, drill-ins degrade to natural-language matching, which W2 system prompt cannot guarantee. | Must land in W2 plan; W3 plan blocks on CR-1 acknowledgment. |
| CR-2 | W2 system prompt honors `metadata.toolHint` on the latest user message as a strong routing bias, falling back to free-form only if the hint is infeasible. | Same as CR-1. | Same. |
| CR-3 | `undo_mutation(reversalToken)` is an agent tool (contracts §2.3 item 23). Owned by W5. Invoked via `sendMessage` + `toolHint` from `ProposalConfirmCard` Undo button; not a direct Convex mutation. This keeps undo inside the write-tool wrapper (rate limit, audit log). | `ProposalConfirmCard` Undo button per §3.7. | Must land in W5 plan. Undo button is inert until CR-3 lands; W3 plan ships the button with a `disabled` fallback when the tool is not yet registered. |
| CR-4 | W1 exports `ChatInteractionProvider` at `apps/app/src/components/chat/ChatInteractionContext.tsx` plus `useChatInteraction()` hook. Provider supplies a single primitive: `sendMessage({ text, toolHint? })`. No confirm / cancel / undo callback surface; all three are `sendMessage` turns with appropriate `toolHint`. | W3 drill-ins, card actions, and `ProposalConfirmCard` Confirm / Cancel / Undo per §3.6 and §3.7. | Must land in W1 plan. Additionally, W1 must reconcile its CB-3 prop signature (`onConfirm`, `onCancel` wired to CA-9 / CA-10 mutations) to match M12: `ProposalConfirmCard` takes only `proposalId` as a prop and calls `sendMessage` internally; no mutation callbacks. W3 flags this as a W1 brainstorm correction required before W3 stack merges. |

W3 plan lists CR-1 through CR-4 as cross-workstream blockers at the top; tasks that depend on them carry explicit `gt submit --stack --no-submit` holds until the corresponding PR lands.

## 10. Acceptance criteria

1. `toolResultRegistry` covers all 14 read tool names plus `get_proposal`; every entry points at a file under `tool-results/` that exports the declared component.
2. `proposalFallback` points at `ProposalConfirmCard`.
3. Every component has a fixture file exporting at least the four base states; `ProposalConfirmCard` additionally exports all nine proposal-specific state fixtures.
4. `/dev/tool-results` index renders every component link; each sub-page renders every fixture with a light-and-dark toggle.
5. Every file under `tool-results/` begins with `"use client"`.
6. Zero imports of `useMemo`, `useCallback`, `React.memo` under `tool-results/` without an inline justification comment.
7. Zero imports of `useQuery` from `convex/react` under `tool-results/`; every `useQuery` import resolves to `convex-helpers/react/cache/hooks`.
8. Zero colour literal strings (hex, rgb, hsl, or direct Tailwind palette values like `text-red-500`) under `tool-results/`; all colour references come from UntitledUI tokens.
9. `bun typecheck` passes across the workspace after W3 tasks merge.
10. `bun build --filter=@repo/app` succeeds with `NODE_ENV=production` and `NEXT_PUBLIC_DEV_TOOLS` unset; `/dev/tool-results/*` returns 404.
11. With `NEXT_PUBLIC_DEV_TOOLS=1`, `/dev/tool-results/*` renders every component and every fixture. Manual QA checklist in the plan covers this.
12. `ProposalConfirmCard` renders the correct variant for `scope`, shows the drift banner on simulated row mutation in the fixture, and shows the irreversible-scope banner for fixture `awaitingConfirmation_irreversible`.
13. Existing routes unchanged: `/credit-cards`, `/credit-cards/[cardId]`, `/wallets`, `/transactions`, `/settings/*`. `bun dev:app` renders each route with no regressions.
14. CodeRabbit passes on the Graphite stack.

## 11. Rollback plan

If W3 is rolled back mid-stack:

1. `gt delete feat/agentic-home/W3-*` removes every W3 branch from the stack.
2. Revert commits on `main` land in reverse order: preview harness first, then components, then scaffolding, then registry types. Order matches the plan task sequence (§5 of the plan doc).
3. `apps/app/src/components/chat/tool-results/` becomes an empty directory; W1's `ToolResultRenderer` falls through to `RawTextMessage` fallback via `proposalFallback` wildcard only. Chat remains functional; tool results render as JSON until W3 re-lands.
4. No schema migrations are in scope for W3, so no backfill is needed on rollback.
5. Preview harness route is dev-gated; production is unaffected.

## 12. Questions this spec answered (one-to-one with master-prompt §8 W3)

| Master-prompt question | Section answering it |
|---|---|
| Where the registry lives | §3.5, §4 |
| How drill-ins call `sendPrompt` | §3.6 (`useChatInteraction` + `useToolHintSend`; requires CR-1, CR-2 on W2) |
| How `ProposalConfirmCard` renders the diff | §3.7 |
| Server vs client component split | §7.2 |
| Theming verification | §7.1, §6 (harness toggle) |
| Component-to-tool mapping table | §5 |
| Storybook or preview harness for every component | §6 (preview harness; Storybook deferred per §2) |

---

End of spec.

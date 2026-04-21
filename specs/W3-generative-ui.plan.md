# W3: Generative UI Protocol and Component Library

## Plan Handoff Header

| Field | Value |
|---|---|
| Linear milestone | M3 Agentic Home |
| Linear sub-project | W3 Generative UI |
| Linear issues | LIN-TBD (one per task below; create at the start of W3 execution) |
| Recommended primary agent | Claude Code for scaffolding and `ProposalConfirmCard`; Codex for per-component implementation once the registry pattern is set |
| Required MCP servers | Convex MCP (`npx convex mcp start`), Graphite MCP (`gt mcp`); Clerk MCP optional for seed-user verification |
| Required read access | `/Users/itsjusteric/Developer/smartpockets` (primary), `/Users/itsjusteric/CrowDevelopment/Templates/untitledui/` (reference only for UntitledUI primitives not yet ported) |
| Prerequisite plans (must be acknowledged or merged) | W1 (CB-1 through CB-4; CR-4 `ChatInteractionProvider`); W2 (CA-2 extension CR-1, system prompt CR-2, `api.agent.proposals.get`, 9-state enum); W5 (CR-3 `api.agent.proposals.undo`) |
| Branch | feat/agentic-home/W3-generative-ui |
| Graphite stack parent | main |
| Worktree directory | ~/Developer/smartpockets-W3-genui (per master-prompt §11) |
| Estimated PRs in stack | 15 |
| Review bot | CodeRabbit (mandatory pass) |
| Rollback plan | See specs/W3-generative-ui.md §11 |
| Acceptance checklist | See specs/W3-generative-ui.md §10 |

## Context bootstrap (for fresh agent sessions)

Before starting any task, the executing agent must:

1. Read `AGENTS.md` and `CLAUDE.md` in the repo root.
2. Read `specs/W0-existing-state-audit.md` (sections 13 to 14 for UI component inventory; section 19 for bun version and React Compiler).
3. Read `specs/W3-generative-ui.md` (authoritative spec for every contract).
4. Read this file top to bottom.
5. Read `specs/W3-generative-ui.research.md` for external references.
6. Skim `specs/00-contracts.md` §§1.6 (`agentProposals.scope`), 2 (tool registry), 3 (9-state proposal machine), 4 (`ToolEnvelope` + `ToolOutput`), 5 (`listWithStreaming` streaming contract).
7. Run `git fetch origin` and confirm the worktree is on `feat/agentic-home/W3-generative-ui` (or a task sub-branch).
8. Verify Convex MCP and Graphite MCP respond.
9. Confirm `bun --version` outputs `1.1.42`; otherwise stop and ask the user to install the correct version.

## Cross-workstream blockers

Tasks below are tagged `[blocked:CR-X]` when they depend on a contract request from another workstream. Do not merge a blocked task until the dependency merges; create the PR and mark it as Draft in Graphite until the blocker clears.

| ID | Dependency | Owner | Blocks tasks |
|---|---|---|---|
| CR-1 | `api.agent.chat.sendStreaming` accepts optional `toolHint: { tool, args }` | W2 | Task 11 (all three proposal actions), plus any drill-in where routing determinism matters. Tasks 2 through 10 can land before CR-1 with a text-only fallback; ProposalConfirmCard cannot, because Confirm / Cancel / Undo route through `execute_confirmed_proposal` / `cancel_proposal` / `undo_mutation` tools (contracts §2.3 items 21 to 23) rather than direct Convex mutations (reconciliation M12). |
| CR-2 | W2 system prompt honours `metadata.toolHint` as a strong routing directive | W2 | Same as CR-1 |
| CR-3 | `undo_mutation(reversalToken)` agent tool registered in W2 tool registry (tool 23 per contracts §2.3); body owned by W5 | W5 body, W2 registration | Task 11 Undo button (button ships disabled if CR-3 has not landed) |
| CR-4 | W1 exports `ChatInteractionProvider` + `useChatInteraction()` from `apps/app/src/components/chat/ChatInteractionContext.tsx`. Provider supplies a single primitive: `sendMessage({ text, toolHint? })`. **Additionally:** W1 must reconcile its CB-3 prop signature (line 390 of W1 brainstorm) to match M12. Current CB-3 says `onConfirm` wires to CA-9 mutation and `onCancel` to CA-10 mutation; that bypasses the write-tool wrapper. Correct contract: `ProposalConfirmCard` takes only `proposalId` as a prop; Confirm / Cancel / Undo are self-dispatched `sendMessage` turns. | W1 | All tasks that import `useToolHintSend` (Tasks 2 through 11) |
| CR-5 | Helper queries: `getManyByIds` on transactions, `getMany` on creditCards, `getManyByIds` on promoRates / installmentPlans / reminders, `api.agent.proposals.get` | W2 or W5 | Tasks 2, 4, 5, 8, 9, 10, 11 |

Each task below carries an explicit blocker note. Tasks 1, 12, 13, 14 have no blockers and proceed first.

---

## Task 1: Scaffold registry, types, shared helpers, `RawTextMessage`

**Recommended agent:** Claude Code
**Rationale:** Protocol shape, multiple files, cross-cutting types the rest of the plan depends on.
**Linear issue:** LIN-TBD-W3-01
**Blocker:** none.

**Files:**
- Create: `apps/app/src/components/chat/tool-results/index.ts`
- Create: `apps/app/src/components/chat/tool-results/types.ts`
- Create: `apps/app/src/components/chat/tool-results/registry.ts`
- Create: `apps/app/src/components/chat/tool-results/shared/ToolCardShell.tsx`
- Create: `apps/app/src/components/chat/tool-results/shared/RawTextMessage.tsx`
- Create: `apps/app/src/components/chat/tool-results/shared/Skeletons.tsx`
- Create: `apps/app/src/components/chat/tool-results/shared/useToolHintSend.ts`
- Create: `apps/app/src/components/chat/tool-results/shared/liveRowsHooks.ts`

### Steps

- [ ] **Step 1.1: Create `types.ts`.**

```ts
"use client";

import type { FC } from "react";
import type { Id } from "@convex/_generated/dataModel";

export type PartState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

export type ReadToolName =
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
  | "get_plaid_health"
  | "get_proposal";

export type ProposeToolName =
  | "propose_transaction_update"
  | "propose_bulk_transaction_update"
  | "propose_credit_card_metadata_update"
  | "propose_manual_promo"
  | "propose_reminder_create"
  | "propose_reminder_delete";

export type ToolName = ReadToolName | ProposeToolName;

export type ToolOutput<TPreview = unknown> = {
  ids: string[];
  preview: TPreview & { live?: boolean; capturedAt?: string };
  window?: { from: string; to: string; granularity?: "day" | "week" | "month" };
};

export type ProposalToolOutput = {
  proposalId: Id<"agentProposals">;
  scope: "single" | "bulk";
  summary: string;
  sample: unknown;
  affectedCount: number;
};

export type ToolResultComponentProps<Input = unknown, Output = unknown> = {
  toolName: ToolName;
  input: Input;
  output: Output | null;
  state: PartState;
  errorText?: string;
  proposalId?: Id<"agentProposals">;
  threadId: Id<"agentThreads">;
};

export type RegistryEntry<Input = unknown, Output = unknown> = {
  Component: FC<ToolResultComponentProps<Input, Output>>;
  Skeleton?: FC<{ input?: Input }>;
};
// Variant is not a registry field: components read `scope` directly from the
// runtime payload (ProposalToolOutput.scope per contracts §1.6 / §4).
```

- [ ] **Step 1.2: Create `shared/Skeletons.tsx`** with a single `SharedShimmer` component that the dispatcher uses when `Entry.Skeleton` is absent. One rounded rectangle with a Tailwind animate-pulse utility; UntitledUI tokens only (`bg-secondary`).

- [ ] **Step 1.3: Create `shared/RawTextMessage.tsx`.**

```tsx
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cx } from "@/utils/cx";

export function RawTextMessage({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cx("prose prose-sm max-w-none text-primary dark:prose-invert", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
```

Imports `react-markdown` and `remark-gfm`, which are already in the template dep tree per `ai-chatbot-untitledui/apps/app/package.json`. Verify presence in SmartPockets `apps/app/package.json`; add via `bun add react-markdown remark-gfm` if missing.

- [ ] **Step 1.4: Create `shared/ToolCardShell.tsx`.** A client component with padding, max-width `[640px]`, and a title prop. Wraps every tool-result render for consistent chrome. Uses UntitledUI tokens only.

```tsx
"use client";

import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

type Props = {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ToolCardShell({ title, subtitle, action, children, className }: Props) {
  return (
    <section
      className={cx(
        "max-w-[640px] rounded-xl border border-secondary bg-primary px-4 py-4 shadow-xs",
        className
      )}
    >
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-primary">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-tertiary">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
```

- [ ] **Step 1.5: Create `shared/useToolHintSend.ts`.**

```ts
"use client";

import type { Id } from "@convex/_generated/dataModel";
import { useChatInteraction } from "@/components/chat/ChatInteractionContext";

export function useToolHintSend() {
  const { sendMessage } = useChatInteraction();

  return {
    openTransaction: (transactionId: string) =>
      sendMessage({
        text: "Open transaction",
        toolHint: { tool: "get_transaction_detail", args: { transactionId } },
      }),
    openCard: (cardId: Id<"creditCards">) =>
      sendMessage({
        text: "Open card",
        toolHint: { tool: "get_credit_card_detail", args: { cardId } },
      }),
    filterTransactionsByCategory: (category: string) =>
      sendMessage({
        text: `Show ${category} transactions`,
        toolHint: { tool: "list_transactions", args: { category } },
      }),
    filterTransactionsByWindow: (from: string, to: string) =>
      sendMessage({
        text: `Show transactions from ${from} to ${to}`,
        toolHint: { tool: "list_transactions", args: { window: { from, to } } },
      }),
    filterByInstitution: (plaidItemId: string) =>
      sendMessage({
        text: "Show transactions for this institution",
        toolHint: { tool: "list_transactions", args: { plaidItemId } },
      }),
    createReminder: (prefill: { title: string; dueAt: number; relatedResourceType?: string; relatedResourceId?: string }) =>
      sendMessage({
        text: `Create a reminder: ${prefill.title}`,
        toolHint: { tool: "propose_reminder_create", args: prefill },
      }),
    editTransactionCategory: (transactionId: string, currentCategory: string | null) =>
      sendMessage({
        text: "Recategorize this transaction",
        toolHint: { tool: "propose_transaction_update", args: { transactionId, currentCategory } },
      }),
    addManualPromo: (cardId: Id<"creditCards">) =>
      sendMessage({
        text: "Add a manual promo for this card",
        toolHint: { tool: "propose_manual_promo", args: { cardId } },
      }),
    editCardMetadata: (cardId: Id<"creditCards">, field: string) =>
      sendMessage({
        text: `Edit ${field} on this card`,
        toolHint: { tool: "propose_credit_card_metadata_update", args: { cardId, field } },
      }),
    // Proposal actions: all three route through the agent tool-path so W5's
    // write-wrapper (rate limit, first-turn guard, audit log, workflow) fires.
    // Do not add direct Convex mutation equivalents here; that would bypass
    // contracts §2.3 tools 21 to 23 (reconciliation M12).
    confirmProposal: (proposalId: Id<"agentProposals">) =>
      sendMessage({
        text: "Confirm",
        toolHint: { tool: "execute_confirmed_proposal", args: { proposalId } },
      }),
    cancelProposal: (proposalId: Id<"agentProposals">) =>
      sendMessage({
        text: "Cancel",
        toolHint: { tool: "cancel_proposal", args: { proposalId } },
      }),
    undoMutation: (reversalToken: string) =>
      sendMessage({
        text: "Undo",
        toolHint: { tool: "undo_mutation", args: { reversalToken } },
      }),
  };
}
```

`useChatInteraction` import resolves to W1-owned file (CR-4). If CR-4 has not yet landed, create a stub context at `apps/app/src/components/chat/ChatInteractionContext.tsx` with a throwing provider and document the stub-replacement note inside the file.

- [ ] **Step 1.6: Create `shared/liveRowsHooks.ts`.** One hook per entity table family:

```ts
"use client";

import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export function useLiveTransactions(ids: string[]) {
  return useQuery(api.transactions.queries.getManyByIds, ids.length > 0 ? { ids } : "skip");
}

export function useLiveCreditCards(ids: Array<Id<"creditCards">>) {
  return useQuery(api.creditCards.queries.getMany, ids.length > 0 ? { ids } : "skip");
}

export function useLivePromoRates(ids: Array<Id<"promoRates">>) {
  return useQuery(api.promoRates.queries.getManyByIds, ids.length > 0 ? { ids } : "skip");
}

export function useLiveInstallmentPlans(ids: Array<Id<"installmentPlans">>) {
  return useQuery(api.installmentPlans.queries.getManyByIds, ids.length > 0 ? { ids } : "skip");
}

export function useLiveReminders(ids: Array<Id<"reminders">>) {
  return useQuery(api.reminders.queries.getManyByIds, ids.length > 0 ? { ids } : "skip");
}

export function useLiveProposal(proposalId: Id<"agentProposals"> | undefined) {
  return useQuery(api.agent.proposals.get, proposalId ? { proposalId } : "skip");
}
```

Each query is a CR-5 dependency. If a query is not yet present in `@convex/_generated/api`, flag the task as blocked and create a TODO comment inside the hook file: `// CR-5: api.X.Y.Z pending from W2/W5 plan`. Replace with real import once available.

- [ ] **Step 1.7: Create `registry.ts` with all fourteen entries pointing at `RawTextMessage` initially (populated in later tasks).**

```ts
"use client";

import type { RegistryEntry, ReadToolName } from "./types";
import { RawTextMessage } from "./shared/RawTextMessage";
import type { FC } from "react";
import type { ToolResultComponentProps, ProposalToolOutput } from "./types";

function FallbackToRaw(props: ToolResultComponentProps) {
  return <RawTextMessage text={JSON.stringify(props.output ?? props.input ?? {}, null, 2)} />;
}

export const toolResultRegistry: Record<ReadToolName, RegistryEntry> = {
  list_accounts:                 { Component: FallbackToRaw },
  get_account_detail:            { Component: FallbackToRaw },
  list_transactions:             { Component: FallbackToRaw },
  get_transaction_detail:        { Component: FallbackToRaw },
  list_credit_cards:             { Component: FallbackToRaw },
  get_credit_card_detail:        { Component: FallbackToRaw },
  list_deferred_interest_promos: { Component: FallbackToRaw },
  list_installment_plans:        { Component: FallbackToRaw },
  get_spend_by_category:         { Component: FallbackToRaw },
  get_spend_over_time:           { Component: FallbackToRaw },
  get_upcoming_statements:       { Component: FallbackToRaw },
  list_reminders:                { Component: FallbackToRaw },
  search_merchants:              { Component: FallbackToRaw },
  get_plaid_health:              { Component: FallbackToRaw },
  get_proposal:                  { Component: FallbackToRaw },
};

export const proposalFallback: FC<ToolResultComponentProps<unknown, ProposalToolOutput>> = FallbackToRaw;
```

Each subsequent task swaps an entry from `FallbackToRaw` to the real component.

- [ ] **Step 1.8: Create `index.ts`.**

```ts
export { toolResultRegistry, proposalFallback } from "./registry";
export type {
  ToolResultComponentProps,
  ToolName,
  ReadToolName,
  ProposeToolName,
  ToolOutput,
  ProposalToolOutput,
  PartState,
  RegistryEntry,
} from "./types";
```

- [ ] **Step 1.9: Verify `bun typecheck --filter=@repo/app`.**

Expected: passes. If missing helper queries fail the typecheck, replace with `any` for the hook return and leave a `// CR-5` TODO; typecheck must not block Task 1 landing.

- [ ] **Step 1.10: Commit.**

```bash
gt create feat/agentic-home/W3-01-scaffold -m "feat(genui): scaffold W3 tool-results registry and shared helpers"
```

**Acceptance:**
- [ ] Directory `apps/app/src/components/chat/tool-results/` exists with 8 files from the list above.
- [ ] `bun typecheck --filter=@repo/app` passes (with `// CR-5` TODOs acceptable).
- [ ] `bun lint --filter=@repo/app` passes.
- [ ] CodeRabbit clean.
- [ ] Cross-review: if implemented by Claude Code, queue Codex review; if implemented by Codex, queue Claude Code review. Per master-prompt §11.

---

## Task 2: `TransactionsTable` + `list_transactions` fixture

**Recommended agent:** Codex
**Rationale:** Pattern-following; similar row structure to existing `TransactionTableRow.tsx`; no architectural ambiguity once Task 1 is merged.
**Linear issue:** LIN-TBD-W3-02
**Blocker:** CR-4 (useChatInteraction); CR-5 (`getManyByIds`).

**Files:**
- Create: `apps/app/src/components/chat/tool-results/transactions/TransactionsTable.tsx`
- Create: `apps/app/src/components/chat/tool-results/transactions/TransactionsTableSkeleton.tsx`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/list_transactions.fixture.ts`
- Modify: `apps/app/src/components/chat/tool-results/registry.ts` (swap `list_transactions` entry)

### Steps

- [ ] **Step 2.1: Write the component.** Pattern after `apps/app/src/components/credit-cards/TransactionTableRow.tsx`. Columns: date, merchant + logo, amount, category. Sort controls are local client state. Row click fires `openTransaction(tx._id)` via `useToolHintSend`. Empty-state copy: `"No transactions in the selected window."` Cap visible rows at 500 with a footer "Showing 500 of {total}. Refine the window to narrow results." Use `ToolCardShell` as the outer chrome with `title={summarizeWindow(output.window)}`.

Key signature:

```tsx
"use client";

import type { ToolResultComponentProps, ToolOutput } from "../types";
import { ToolCardShell } from "../shared/ToolCardShell";
import { useLiveTransactions } from "../shared/liveRowsHooks";
import { useToolHintSend } from "../shared/useToolHintSend";
import { TransactionsTableSkeleton } from "./TransactionsTableSkeleton";

type Preview = {
  totalCount: number;
  summary?: string;
};

export function TransactionsTable(
  props: ToolResultComponentProps<unknown, ToolOutput<Preview>>
) {
  const { output, state } = props;
  const rows = useLiveTransactions(output?.ids ?? []);
  const hint = useToolHintSend();

  if (state === "input-streaming" || !output) {
    return <TransactionsTableSkeleton />;
  }
  if (rows === undefined) {
    return <TransactionsTableSkeleton />;
  }
  if (output.ids.length === 0) {
    return (
      <ToolCardShell title="Transactions">
        <p className="text-sm text-tertiary">No transactions in the selected window.</p>
      </ToolCardShell>
    );
  }
  const display = rows.slice(0, 500);
  const overflow = output.ids.length - display.length;

  return (
    <ToolCardShell title={output.preview.summary ?? "Transactions"} subtitle={formatWindow(output.window)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-tertiary">
            <th className="py-2">Date</th>
            <th>Merchant</th>
            <th className="text-right">Amount</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          {display.map((tx) => (
            <tr
              key={tx._id}
              onClick={() => hint.openTransaction(tx._id)}
              className="cursor-pointer border-t border-secondary hover:bg-secondary/50"
            >
              <td className="py-2 text-secondary">{formatDate(tx.date)}</td>
              <td>{tx.merchantName ?? tx.name}</td>
              <td className="text-right tabular-nums">{formatAmount(tx.amount)}</td>
              <td className="text-secondary">{tx.categoryPrimary ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {overflow > 0 && (
        <footer className="mt-3 text-xs text-tertiary">
          Showing 500 of {output.ids.length}. Refine the window to narrow results.
        </footer>
      )}
    </ToolCardShell>
  );
}
```

Helpers `formatDate`, `formatAmount`, `formatWindow` live inside this file or inside a sibling `transactions/format.ts`. Monetary amounts in `plaidTransactions` are milliunits per W0 §8.3; divide by 1000 in `formatAmount` (verify by inspecting `apps/app/src/components/credit-cards/TransactionTableRow.tsx` for the existing convention).

- [ ] **Step 2.2: Write `TransactionsTableSkeleton.tsx`.** Renders a `ToolCardShell` with 10 muted rows, each with three pulsing cells.

- [ ] **Step 2.3: Create the fixture at `__fixtures__/list_transactions.fixture.ts`.**

```ts
import type { ToolResultComponentProps, ToolOutput } from "../types";

const common = {
  toolName: "list_transactions" as const,
  threadId: "agentThreads:fx-thread" as any,
  input: { window: { from: "2026-04-01", to: "2026-04-20" }, category: "Dining" },
};

export const inputStreaming: ToolResultComponentProps = {
  ...common,
  output: null,
  state: "input-streaming",
};

export const outputAvailable: ToolResultComponentProps<unknown, ToolOutput<{ totalCount: number; summary: string }>> = {
  ...common,
  output: {
    ids: ["plaid:plaidTransactions:fx-1", "plaid:plaidTransactions:fx-2", "plaid:plaidTransactions:fx-3"],
    preview: { totalCount: 3, summary: "3 dining transactions in April" },
    window: { from: "2026-04-01", to: "2026-04-20" },
  },
  state: "output-available",
};

export const outputAvailableEmpty: ToolResultComponentProps<unknown, ToolOutput<{ totalCount: 0; summary: string }>> = {
  ...common,
  output: { ids: [], preview: { totalCount: 0, summary: "No dining transactions" }, window: { from: "2026-04-01", to: "2026-04-20" } },
  state: "output-available",
};

export const outputError: ToolResultComponentProps = {
  ...common,
  output: null,
  errorText: "Rate limit exceeded. Try again in 30 seconds.",
  state: "output-error",
};
```

The IDs need to resolve to real `plaidTransactions` rows in the dev Convex backend for the live-data path to work inside the preview harness. Task 14 seed script addresses this.

- [ ] **Step 2.4: Update `registry.ts`.** Swap `list_transactions` entry to the real component:

```ts
import { TransactionsTable } from "./transactions/TransactionsTable";
import { TransactionsTableSkeleton } from "./transactions/TransactionsTableSkeleton";

// ...
list_transactions: { Component: TransactionsTable, Skeleton: TransactionsTableSkeleton },
// ...
```

- [ ] **Step 2.5: Verify with `bun typecheck --filter=@repo/app && bun build --filter=@repo/app`.**

- [ ] **Step 2.6: Commit.**

```bash
gt create feat/agentic-home/W3-02-transactions-table -m "feat(genui): TransactionsTable wraps list_transactions output"
```

**Acceptance:**
- [ ] `TransactionsTable.tsx` and `TransactionsTableSkeleton.tsx` exist; registry `list_transactions` points at the new component.
- [ ] Component begins with `"use client"`.
- [ ] Component imports `useQuery` from `convex-helpers/react/cache/hooks` (not from `convex/react`).
- [ ] Fixture exports four shapes (inputStreaming, outputAvailable, outputAvailableEmpty, outputError).
- [ ] `bun typecheck` passes.
- [ ] Cross-review queued.

---

## Task 3: `TransactionDetailCard` + `get_transaction_detail` fixture

**Recommended agent:** Codex
**Rationale:** Wraps existing transaction detail panel (shipped in commit `0518c46`). Codex inherits the wrapping pattern from Task 2.
**Linear issue:** LIN-TBD-W3-03
**Blocker:** CR-4; CR-5.

**Files:**
- Create: `apps/app/src/components/chat/tool-results/transactions/TransactionDetailCard.tsx`
- Create: `apps/app/src/components/chat/tool-results/transactions/TransactionDetailCardSkeleton.tsx`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/get_transaction_detail.fixture.ts`
- Modify: `apps/app/src/components/chat/tool-results/registry.ts`

### Steps

- [ ] **Step 3.1: Inspect existing detail panel.** Run `grep -l "TransactionDetail\|TransactionPanel" apps/app/src/components` and read the top-level file. Note the props it accepts (likely `transactionId` or a `transaction` row).

- [ ] **Step 3.2: Write `TransactionDetailCard.tsx` as a chat-context wrapper.**

Skeleton structure (full code; replace placeholders with names discovered in Step 3.1):

```tsx
"use client";

import type { ToolResultComponentProps, ToolOutput } from "../types";
import { ToolCardShell } from "../shared/ToolCardShell";
import { useLiveTransactions } from "../shared/liveRowsHooks";
import { useToolHintSend } from "../shared/useToolHintSend";
import { TransactionDetailPanel } from "@/components/transactions/TransactionDetailPanel";
import { TransactionDetailCardSkeleton } from "./TransactionDetailCardSkeleton";

export function TransactionDetailCard(
  props: ToolResultComponentProps<unknown, ToolOutput<{ merchantName?: string }>>
) {
  const { output, state } = props;
  const rows = useLiveTransactions(output?.ids ?? []);
  const hint = useToolHintSend();

  if (state === "input-streaming" || !output) return <TransactionDetailCardSkeleton />;
  if (rows === undefined) return <TransactionDetailCardSkeleton />;
  if (rows.length === 0) {
    return (
      <ToolCardShell title="Transaction not found">
        <p className="text-sm text-tertiary">The transaction may have been deleted or you no longer have access.</p>
      </ToolCardShell>
    );
  }

  const tx = rows[0];
  return (
    <ToolCardShell
      title={tx.merchantName ?? tx.name}
      subtitle={output.preview.merchantName}
      action={
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-secondary px-2 py-1 text-xs text-secondary hover:bg-secondary/50"
            onClick={() => hint.editTransactionCategory(tx._id, tx.categoryPrimary ?? null)}
          >
            Edit category
          </button>
        </div>
      }
    >
      <TransactionDetailPanel transaction={tx} chatContext />
    </ToolCardShell>
  );
}
```

`chatContext` prop is a W3-originated optional flag that tells the existing panel to drop affordances that belong on the full-page detail (attachments picker overflow, hide-button ambiguity). If the existing panel doesn't accept such a flag, W3 opts to render the panel with its current affordances; document in the PR description that this is the MVP acceptance. **Do not modify the existing panel** (no source code outside W3 scope).

- [ ] **Step 3.3: Write `TransactionDetailCardSkeleton.tsx`.** ToolCardShell with heading bar, three metadata rows, attachment strip placeholder.

- [ ] **Step 3.4: Create fixture at `__fixtures__/get_transaction_detail.fixture.ts`** with the four base states. `ids` contains one real dev `plaidTransactions` ID (seeded via Task 14) or a dummy ID that the live query will report empty for, testing the "not found" branch.

- [ ] **Step 3.5: Update `registry.ts`.**

```ts
get_transaction_detail: { Component: TransactionDetailCard, Skeleton: TransactionDetailCardSkeleton },
```

- [ ] **Step 3.6: Verify `bun typecheck && bun build --filter=@repo/app`.**

- [ ] **Step 3.7: Commit.**

```bash
gt create feat/agentic-home/W3-03-transaction-detail -m "feat(genui): TransactionDetailCard wraps existing detail panel"
```

**Acceptance:**
- [ ] Component renders existing detail panel inside chat-friendly chrome.
- [ ] Edit-category action fires a `propose_transaction_update` tool-hint turn.
- [ ] "Transaction not found" branch renders when the live query returns zero rows.

---

## Task 4: `AccountsSummary` + `list_accounts` and `get_account_detail` fixtures

**Recommended agent:** Codex
**Rationale:** Net-new but straightforward grouping over existing Plaid data.
**Linear issue:** LIN-TBD-W3-04
**Blocker:** CR-4; CR-5 (may require a new `api.plaidAccounts.queries.getManyByIds` helper).

**Files:**
- Create: `apps/app/src/components/chat/tool-results/accounts/AccountsSummary.tsx`
- Create: `apps/app/src/components/chat/tool-results/accounts/AccountsSummarySkeleton.tsx`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/list_accounts.fixture.ts`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/get_account_detail.fixture.ts`
- Modify: `apps/app/src/components/chat/tool-results/registry.ts`

### Steps

- [ ] **Step 4.1: Groups accounts by institution.** Use `plaidItems.institutionName` for grouping headers. `plaidAccounts.balances.current` is the balance. Single-account detail mode triggers when `ids.length === 1`; renders an expanded card with account number mask, official name, and click-to-filter-transactions action.

- [ ] **Step 4.2: Implement.** Shared component handles both list and detail:

```tsx
"use client";

import type { ToolResultComponentProps, ToolOutput } from "../types";
import { ToolCardShell } from "../shared/ToolCardShell";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex/_generated/api";
import { useToolHintSend } from "../shared/useToolHintSend";
import { AccountsSummarySkeleton } from "./AccountsSummarySkeleton";

type Preview = { totalBalance: number; institutionCount: number };

export function AccountsSummary(
  props: ToolResultComponentProps<unknown, ToolOutput<Preview>>
) {
  const { output, state } = props;
  const accounts = useQuery(
    api.plaidAccounts.queries.getManyByIds,
    output?.ids.length ? { ids: output.ids } : "skip"
  );
  const hint = useToolHintSend();

  if (state === "input-streaming" || !output || accounts === undefined) {
    return <AccountsSummarySkeleton />;
  }
  if (output.ids.length === 0) {
    return (
      <ToolCardShell title="Accounts">
        <p className="text-sm text-tertiary">No accounts connected.</p>
      </ToolCardShell>
    );
  }
  const grouped = groupByInstitution(accounts);
  return (
    <ToolCardShell title="Accounts" subtitle={`${output.preview.institutionCount} institutions, ${formatCurrency(output.preview.totalBalance)} total`}>
      <ul className="divide-y divide-secondary">
        {grouped.map(([institution, rows]) => (
          <li key={institution.id} className="py-2">
            <button
              type="button"
              onClick={() => hint.filterByInstitution(institution.id)}
              className="flex w-full items-center justify-between text-left hover:bg-secondary/50"
            >
              <span className="text-sm font-medium text-primary">{institution.name}</span>
              <span className="text-sm tabular-nums text-secondary">
                {formatCurrency(rows.reduce((sum, r) => sum + (r.balances.current ?? 0), 0))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </ToolCardShell>
  );
}
```

`groupByInstitution` and `formatCurrency` are local helpers. `api.plaidAccounts.queries.getManyByIds` is a CR-5 query; if absent, the wrapper falls back to calling `api.plaidAccounts.queries.getByAccountIds` (one call per ID) with a TODO.

- [ ] **Step 4.3: Skeleton renders 3 institution rows with pulsing bars.**

- [ ] **Step 4.4: Both fixtures share the component; detail fixture has `ids.length === 1`.**

- [ ] **Step 4.5: Register.**

```ts
list_accounts: { Component: AccountsSummary, Skeleton: AccountsSummarySkeleton },
get_account_detail: { Component: AccountsSummary, Skeleton: AccountsSummarySkeleton },
```

- [ ] **Step 4.6: Verify + commit.**

```bash
gt create feat/agentic-home/W3-04-accounts-summary -m "feat(genui): AccountsSummary renders list_accounts and get_account_detail"
```

**Acceptance:** registry entries updated; both fixtures render correctly in preview harness (after Task 13).

---

## Task 5: `CreditCardStatementCard` (composition of four existing + AprBreakdown)

**Recommended agent:** Claude Code
**Rationale:** Composition judgment over five existing components (`CreditCardExtendedDetails`, `CreditCardVisual`, `FlippableCreditCard`, `AprBreakdown`, and the `CardVisualWrapper` variant chooser). Single mode vs. list mode vs. next-closing-strip mode differ in layout. Benefits from cross-file reasoning.
**Linear issue:** LIN-TBD-W3-05
**Blocker:** CR-4; CR-5.

**Files:**
- Create: `apps/app/src/components/chat/tool-results/credit-cards/CreditCardStatementCard.tsx`
- Create: `apps/app/src/components/chat/tool-results/credit-cards/CreditCardStatementCardSkeleton.tsx`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/list_credit_cards.fixture.ts`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/get_credit_card_detail.fixture.ts`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/get_upcoming_statements.fixture.ts`
- Modify: `apps/app/src/components/chat/tool-results/registry.ts`

### Steps

- [ ] **Step 5.1: Read the five existing components.** Record the prop shape each accepts. In particular:
  - `CreditCardExtendedDetails` (in apps/app/src/components/credit-cards)
  - `CreditCardVisual`
  - `FlippableCreditCard`
  - `AprBreakdown` (details/)
  - `CardVisualWrapper`
  - `PromoTracker` (if the statement view includes promos inline)

- [ ] **Step 5.2: Decide variant selection.** Three modes:
  - `single`: `ids.length === 1` and `toolName === "get_credit_card_detail"`. Full statement treatment with `FlippableCreditCard` + `CreditCardExtendedDetails` + `AprBreakdown` + `PromoTracker` wrapper.
  - `list`: `toolName === "list_credit_cards"`. Grid of `CreditCardVisual` thumbnails; each tile clickable to `openCard(cardId)`.
  - `upcoming`: `toolName === "get_upcoming_statements"`. Compact strip with mask, closing day, amount due, days-to-close.

- [ ] **Step 5.3: Write the component.** Pseudocode outline:

```tsx
"use client";

import type { ToolResultComponentProps, ToolOutput, ToolName } from "../types";
import { ToolCardShell } from "../shared/ToolCardShell";
import { useLiveCreditCards } from "../shared/liveRowsHooks";
import { CardVisualWrapper } from "@/components/credit-cards/CardVisualWrapper";
import { CreditCardVisual } from "@/components/credit-cards/CreditCardVisual";
import { CreditCardExtendedDetails } from "@/components/credit-cards/CreditCardExtendedDetails";
import { AprBreakdown } from "@/components/credit-cards/details/AprBreakdown";
import { PromoTracker } from "@/components/credit-cards/details/PromoTracker";
import { useToolHintSend } from "../shared/useToolHintSend";
import { CreditCardStatementCardSkeleton } from "./CreditCardStatementCardSkeleton";

type Preview = { summary?: string };

export function CreditCardStatementCard(
  props: ToolResultComponentProps<unknown, ToolOutput<Preview>>
) {
  const { output, toolName, state } = props;
  const cards = useLiveCreditCards((output?.ids ?? []) as Array<Id<"creditCards">>);
  const hint = useToolHintSend();

  if (state === "input-streaming" || !output || cards === undefined) {
    return <CreditCardStatementCardSkeleton />;
  }
  if (cards.length === 0) {
    return <ToolCardShell title="Credit cards"><p className="text-sm text-tertiary">No cards connected.</p></ToolCardShell>;
  }
  if (toolName === "list_credit_cards" || cards.length > 1) {
    return <ListView cards={cards} onOpen={hint.openCard} />;
  }
  if (toolName === "get_upcoming_statements") {
    return <UpcomingStrip cards={cards} onOpen={hint.openCard} />;
  }
  return <SingleStatement card={cards[0]} />;
}

function ListView({ cards, onOpen }: { cards: CreditCard[]; onOpen: (id: Id<"creditCards">) => void }) {
  return (
    <ToolCardShell title={`${cards.length} cards`}>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <button key={c._id} type="button" onClick={() => onOpen(c._id)} className="text-left">
            <CreditCardVisual card={c} /* props per existing component */ />
          </button>
        ))}
      </div>
    </ToolCardShell>
  );
}

function SingleStatement({ card }: { card: CreditCard }) {
  return (
    <ToolCardShell title={card.displayName} subtitle={card.company}>
      <div className="space-y-4">
        <CardVisualWrapper cardId={card._id} />
        <CreditCardExtendedDetails cardId={card._id} />
        <AprBreakdown cardId={card._id} />
        <PromoTracker creditCardId={card._id} />
      </div>
    </ToolCardShell>
  );
}

function UpcomingStrip({ cards, onOpen }: { cards: CreditCard[]; onOpen: (id: Id<"creditCards">) => void }) {
  return (
    <ToolCardShell title="Upcoming statements">
      <ul className="divide-y divide-secondary">
        {cards.map((c) => (
          <li key={c._id} className="flex items-center justify-between py-2">
            <button type="button" onClick={() => onOpen(c._id)} className="flex-1 text-left text-sm text-primary hover:underline">
              {c.displayName} {c.mask && `••• ${c.mask}`}
            </button>
            <span className="text-sm text-tertiary">{formatClosingDay(c.statementClosingDay)}</span>
          </li>
        ))}
      </ul>
    </ToolCardShell>
  );
}
```

**Important:** existing components use `useQuery` from `convex/react` (not the cached variant). W3 does not refactor them (no source outside W3). The wrappers pass `cardId` and let each subcomponent manage its own data flow. Trade-off: duplicated subscriptions for the same card across subcomponents. Acceptable for MVP; document in the PR description.

- [ ] **Step 5.4: Skeleton mirrors single-mode layout.**

- [ ] **Step 5.5: Three fixtures at `__fixtures__/` for the three tool names, each covering the four base states.**

- [ ] **Step 5.6: Register all three tool names.**

```ts
list_credit_cards: { Component: CreditCardStatementCard, Skeleton: CreditCardStatementCardSkeleton },
get_credit_card_detail: { Component: CreditCardStatementCard, Skeleton: CreditCardStatementCardSkeleton },
get_upcoming_statements: { Component: CreditCardStatementCard, Skeleton: CreditCardStatementCardSkeleton },
```

The component reads `toolName` and `ids.length` at render time to pick list vs. single vs. upcoming mode; no `variant` metadata on the registry entry.

- [ ] **Step 5.7: Verify + commit.**

```bash
gt create feat/agentic-home/W3-05-credit-card-statement -m "feat(genui): CreditCardStatementCard composes existing card components"
```

**Acceptance:** single, list, and upcoming variants each render correctly; no regressions to the four existing credit-card components (verified by running `bun dev:app` and opening `/credit-cards/[cardId]` detail page; compare against pre-W3 screenshot).

---

## Task 6: `SpendByCategoryChart` + fixture

**Recommended agent:** Codex
**Rationale:** Recharts wrapper using existing `charts-base.tsx` primitives. Pattern-following.
**Linear issue:** LIN-TBD-W3-06
**Blocker:** CR-4; CR-5 (transactions live query for recompute).

**Files:**
- Create: `apps/app/src/components/chat/tool-results/charts/SpendByCategoryChart.tsx`
- Create: `apps/app/src/components/chat/tool-results/charts/SpendByCategoryChartSkeleton.tsx`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/get_spend_by_category.fixture.ts`
- Modify: `apps/app/src/components/chat/tool-results/registry.ts`

### Steps

- [ ] **Step 6.1: Write the donut chart.** Use `PieChart` + `Pie` + `Cell` + `Tooltip` from Recharts 3.x. Colour palette: UntitledUI utility-brand, utility-warning, utility-success, utility-error, utility-gray, cycling for additional categories. Category click calls `hint.filterTransactionsByCategory(category)`. Tooltip uses `charts-base.tsx`'s shared Tooltip component.

- [ ] **Step 6.2: Re-aggregate from live transactions.**

```tsx
const transactions = useLiveTransactions(output?.ids ?? []);

const buckets = useMemo(() => {
  // JUSTIFIED: Recharts needs a stable array reference for smooth animations.
  // React Compiler cannot infer the shape-stability requirement.
  if (!transactions) return output?.preview.buckets ?? [];
  return aggregateByCategory(transactions);
}, [transactions, output]);
```

Inline justification comment for `useMemo` required per spec §7.3.

- [ ] **Step 6.3: Skeleton renders a pulsing circle.**

- [ ] **Step 6.4: Fixture has `preview.buckets` with three sample categories plus `ids` array of 5 transaction IDs.**

- [ ] **Step 6.5: Register + verify + commit.**

```bash
gt create feat/agentic-home/W3-06-spend-by-category -m "feat(genui): SpendByCategoryChart donut with category drill-in"
```

---

## Task 7: `SpendOverTimeChart` + fixture

**Recommended agent:** Codex
**Rationale:** Same pattern as Task 6, different chart type.
**Linear issue:** LIN-TBD-W3-07
**Blocker:** CR-4; CR-5.

**Files:**
- Create: `apps/app/src/components/chat/tool-results/charts/SpendOverTimeChart.tsx`
- Create: `apps/app/src/components/chat/tool-results/charts/SpendOverTimeChartSkeleton.tsx`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/get_spend_over_time.fixture.ts`
- Modify: `apps/app/src/components/chat/tool-results/registry.ts`

### Steps

- [ ] **Step 7.1: Area chart.** `AreaChart` + `Area` + `XAxis` + `YAxis` from Recharts. Granularity from `output.window.granularity`; x-axis labels use `selectEvenlySpacedItems` from `charts-base.tsx`. Bucket click calls `hint.filterTransactionsByWindow(bucket.from, bucket.to)`.

- [ ] **Step 7.2: Re-aggregate from live transactions** (same pattern as Task 6).

- [ ] **Step 7.3: Skeleton renders a pulsing rectangular band.**

- [ ] **Step 7.4: Fixture covers 30-day granularity plus daily window with sample buckets and IDs.**

- [ ] **Step 7.5: Register + verify + commit.**

```bash
gt create feat/agentic-home/W3-07-spend-over-time -m "feat(genui): SpendOverTimeChart area chart with window drill-in"
```

---

## Task 8: `DeferredInterestTimeline` + fixture (wraps `PromoTracker`)

**Recommended agent:** Codex
**Rationale:** Read-only timeline view; reuses `PromoTracker`'s urgency colour function.
**Linear issue:** LIN-TBD-W3-08
**Blocker:** CR-4; CR-5.

**Files:**
- Create: `apps/app/src/components/chat/tool-results/promos/DeferredInterestTimeline.tsx`
- Create: `apps/app/src/components/chat/tool-results/promos/DeferredInterestTimelineSkeleton.tsx`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/list_deferred_interest_promos.fixture.ts`
- Modify: `apps/app/src/components/chat/tool-results/registry.ts`

### Steps

- [ ] **Step 8.1: Extract urgency helper.** Re-export `getUrgencyColor` from `PromoTracker.tsx` by importing it; if not currently exported, document the need for a one-line export addition (separate PR outside W3 scope; for W3, duplicate the function inline with a `// TODO: extract helper in promo-tracker cleanup PR`).

- [ ] **Step 8.2: Timeline markup.** Horizontal track; each promo as a coloured marker plotted by proportional `daysToExpiration`. Click marker to fire `openCard(promo.creditCardId)`. Add-manual-promo button fires `addManualPromo(cardId)` via `useToolHintSend`.

- [ ] **Step 8.3: Skeleton: horizontal line with pulsing dots.**

- [ ] **Step 8.4: Fixture covers 2 active promos, 1 expiring-soon, and an empty branch.**

- [ ] **Step 8.5: Register + verify + commit.**

```bash
gt create feat/agentic-home/W3-08-promo-timeline -m "feat(genui): DeferredInterestTimeline wraps promo data for chat"
```

---

## Task 9: `InstallmentPlansList` + fixture (wraps `PromoTracker` installment portion)

**Recommended agent:** Codex
**Rationale:** Same pattern as Task 8.
**Linear issue:** LIN-TBD-W3-09
**Blocker:** CR-4; CR-5.

**Files:**
- Create: `apps/app/src/components/chat/tool-results/promos/InstallmentPlansList.tsx`
- Create: `apps/app/src/components/chat/tool-results/promos/InstallmentPlansListSkeleton.tsx`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/list_installment_plans.fixture.ts`
- Modify: `apps/app/src/components/chat/tool-results/registry.ts`

### Steps

- [ ] **Step 9.1: List with expand-row for payment schedule.** Each row: merchant, total owed, remaining months, monthly payment. Expand reveals the `totalPayments` / `remainingPayments` breakdown.

- [ ] **Step 9.2: Skeleton: 3 pulsing rows.**

- [ ] **Step 9.3: Fixture: 2 active plans + 1 recently-started plan.**

- [ ] **Step 9.4: Register + verify + commit.**

```bash
gt create feat/agentic-home/W3-09-installment-plans -m "feat(genui): InstallmentPlansList wraps installment data for chat"
```

---

## Task 10: `RemindersList` + fixture

**Recommended agent:** Codex
**Rationale:** Net-new but simple list over new `reminders` Ents table (owned by W2 per contracts §1.8).
**Linear issue:** LIN-TBD-W3-10
**Blocker:** CR-4; CR-5; W2 `reminders` table must exist.

**Files:**
- Create: `apps/app/src/components/chat/tool-results/reminders/RemindersList.tsx`
- Create: `apps/app/src/components/chat/tool-results/reminders/RemindersListSkeleton.tsx`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/list_reminders.fixture.ts`
- Modify: `apps/app/src/components/chat/tool-results/registry.ts`

### Steps

- [ ] **Step 10.1: Group by due-date bucket** (`overdue`, `today`, `this week`, `later`, `done`).

- [ ] **Step 10.2: Create action** fires `createReminder(prefill)` via `useToolHintSend`. Edit action on hover fires a `propose_reminder_update` tool-hint (requires a propose tool variant; if not in contracts §2.2, defer edit-action to post-MVP and document).

- [ ] **Step 10.3: Register + verify + commit.**

```bash
gt create feat/agentic-home/W3-10-reminders-list -m "feat(genui): RemindersList renders list_reminders grouped by due-date"
```

---

## Task 11: `ProposalConfirmCard` (single + bulk + live diff + drift + countdown + undo)

**Recommended agent:** Claude Code
**Rationale:** Most architectural component in W3. Live diff with drift detection, state-machine subscription, bulk-aware rendering, countdown timer, and Undo wiring all interact.
**Linear issue:** LIN-TBD-W3-11
**Blocker:** CR-1 (required for Confirm / Cancel / Undo dispatch via `toolHint`; without it, the card renders in read-only preview mode); CR-2 (agent must honour the hint); CR-3 (registers `undo_mutation` tool; Undo button renders disabled until CR-3 lands); CR-4 (required: W1's `ChatInteractionProvider` plus the CB-3 prop-signature reconciliation noted in the blocker ledger); CR-5 (`api.agent.proposals.get` specifically).

**Files:**
- Create: `apps/app/src/components/chat/tool-results/proposals/ProposalConfirmCard.tsx`
- Create: `apps/app/src/components/chat/tool-results/proposals/ProposalConfirmCardSkeleton.tsx`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/propose_transaction_update.fixture.ts`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/propose_bulk_transaction_update.fixture.ts`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/propose_credit_card_metadata_update.fixture.ts`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/propose_manual_promo.fixture.ts`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/propose_reminder_create.fixture.ts`
- Create: `apps/app/src/components/chat/tool-results/__fixtures__/propose_reminder_delete.fixture.ts`
- Modify: `apps/app/src/components/chat/tool-results/registry.ts`

### Steps

- [ ] **Step 11.1: Write `ProposalConfirmCard.tsx`.** Full component per spec §3.7. Props: **only** `{ proposalId: Id<"agentProposals"> }`. Everything else (scope, state, diff, timestamps, reversalToken, errorSummary) comes from reactive subscriptions. Confirm, Cancel, and Undo route through `sendMessage` + `toolHint` via `useToolHintSend`; no mutation callbacks.

Structure (full code outline):

```tsx
"use client";

import type { Id } from "@convex/_generated/dataModel";
import { useLiveProposal } from "../shared/liveRowsHooks";
import { useToolHintSend } from "../shared/useToolHintSend";
import { ToolCardShell } from "../shared/ToolCardShell";
import { ProposalConfirmCardSkeleton } from "./ProposalConfirmCardSkeleton";

type Props = { proposalId: Id<"agentProposals"> };

export function ProposalConfirmCard({ proposalId }: Props) {
  const proposal = useLiveProposal(proposalId);
  const hint = useToolHintSend();

  if (proposal === undefined) return <ProposalConfirmCardSkeleton />;
  if (proposal === null) {
    return <ToolCardShell title="Proposal not found"><p className="text-sm text-tertiary">The proposal may have expired or been reverted.</p></ToolCardShell>;
  }

  switch (proposal.state) {
    case "awaiting_confirmation":
      return <AwaitingView proposal={proposal} onConfirm={() => hint.confirmProposal(proposalId)} onCancel={() => hint.cancelProposal(proposalId)} />;
    case "executing":
      return <ExecutingView proposal={proposal} />;
    case "executed":
      return <ExecutedView proposal={proposal} onUndo={(token) => hint.undoMutation(token)} />;
    case "cancelled":
      return <CancelledView proposal={proposal} />;
    case "timed_out":
      return <TimedOutView proposal={proposal} />;
    case "reverted":
      return <RevertedView proposal={proposal} />;
    case "failed":
      return <FailedView proposal={proposal} />;
    default:
      return null;
  }
}
```

`AwaitingView`, `ExecutingView`, etc., are file-local subcomponents. Each subcomponent receives the proposal row from the `useLiveProposal` subscription. The `scope` branch (single vs. bulk rendering) lives inside `AwaitingView` and reads `proposal.scope` directly.

- [ ] **Step 11.2: Write drift detector.**

```tsx
const proposal = useLiveProposal(proposalId);
const affectedRows = useAffectedRows(proposal?.affectedIds ?? [], proposal?.toolName);

const hasDrift = useMemo(() => {
  // JUSTIFIED: stable reference across renders ensures banner flicker does not fire.
  if (!proposal || !affectedRows) return false;
  return affectedRows.some((r: any) => r._updateTime > proposal.createdAt);
}, [proposal, affectedRows]);
```

- [ ] **Step 11.3: Write countdown** (`useEffect` + `setInterval` + cleanup, no memo). Renders a badge on the Confirm button for irreversible scope.

- [ ] **Step 11.4: Write Undo timer** (`useEffect` + `setInterval` at 30-second cadence; hides Undo button past `undoExpiresAt`).

- [ ] **Step 11.5: Write six fixture files.** Each exports at minimum the four base states plus all nine proposal-specific states (`awaitingConfirmation_single`, `awaitingConfirmation_bulk`, `awaitingConfirmation_irreversible` when `affectedIds.length > 500`, `executing`, `executed`, `executedWithinUndoWindow`, `executedPastUndoWindow`, `cancelled`, `timedOut`, `reverted`, `failed`). Use real `agentProposals` IDs from the seeded dev backend if possible; otherwise fabricate.

- [ ] **Step 11.6: Update registry.**

```ts
import { ProposalConfirmCard } from "./proposals/ProposalConfirmCard";
// ...
export const proposalFallback: FC<ToolResultComponentProps<unknown, ProposalToolOutput>> = (props) => (
  <ProposalConfirmCard proposalId={(props.output as ProposalToolOutput).proposalId} />
);

// Also register get_proposal so the agent can render the card directly; the
// dispatcher extracts proposalId from the output payload.
get_proposal: {
  Component: (props) => <ProposalConfirmCard proposalId={(props.output as any).proposalId} />,
},
```

No `variant` metadata on the registry entry; `ProposalConfirmCard` reads `scope` from the live proposal row at render time.

- [ ] **Step 11.7: Verify `bun typecheck`, `bun build`, and commit.**

```bash
gt create feat/agentic-home/W3-11-proposal-confirm -m "feat(genui): ProposalConfirmCard with live diff, drift, countdown, undo"
```

**Acceptance:**
- [ ] All 9 proposal state fixtures render correctly in preview harness.
- [ ] Drift banner fires when fixture simulates an `_updateTime` post-mount.
- [ ] Irreversible banner fires at `affectedIds.length > 500`.
- [ ] Confirm countdown is 3 seconds on irreversible scope; 250 ms otherwise.
- [ ] Undo button disappears when `Date.now() > undoExpiresAt`.

---

## Task 12: Preview harness routes (`/dev/tool-results` + `[component]`)

**Recommended agent:** Claude Code designs the harness shape; Codex ships the per-component sub-pages.
**Rationale:** Cross-component orchestration with theme toggle and env gating.
**Linear issue:** LIN-TBD-W3-12
**Blocker:** none (fixtures from Tasks 2 through 11 lifted as ready).

**Files:**
- Create: `apps/app/src/app/(app)/dev/tool-results/page.tsx`
- Create: `apps/app/src/app/(app)/dev/tool-results/[component]/page.tsx`
- Create: `apps/app/src/app/(app)/dev/tool-results/_parts/ThemeToggle.tsx`
- Create: `apps/app/src/app/(app)/dev/tool-results/_parts/FixtureRenderer.tsx`
- Modify: `.env.example` (add `NEXT_PUBLIC_DEV_TOOLS=1` with a comment)

### Steps

- [ ] **Step 12.1: Gate.**

```tsx
// apps/app/src/app/(app)/dev/tool-results/page.tsx
"use client";

import Link from "next/link";
import { notFound } from "next/navigation";

const COMPONENTS = [
  "list_transactions",
  "get_transaction_detail",
  "list_accounts",
  "list_credit_cards",
  "get_credit_card_detail",
  "get_upcoming_statements",
  "get_spend_by_category",
  "get_spend_over_time",
  "list_deferred_interest_promos",
  "list_installment_plans",
  "list_reminders",
  "propose_transaction_update",
  "propose_bulk_transaction_update",
  "propose_credit_card_metadata_update",
  "propose_manual_promo",
  "propose_reminder_create",
  "propose_reminder_delete",
] as const;

export default function DevIndex() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEV_TOOLS !== "1") {
    notFound();
  }
  return (
    <div className="mx-auto max-w-screen-md p-8">
      <h1 className="mb-6 text-2xl font-bold text-primary">Tool Result Preview Harness</h1>
      <p className="mb-6 text-sm text-tertiary">Dev-only. Each link renders every fixture state for that component with a theme toggle.</p>
      <ul className="space-y-2">
        {COMPONENTS.map((c) => (
          <li key={c}>
            <Link href={`/dev/tool-results/${c}`} className="text-primary hover:underline">{c}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 12.2: Sub-page.**

```tsx
// apps/app/src/app/(app)/dev/tool-results/[component]/page.tsx
"use client";

import { notFound } from "next/navigation";
import { FixtureRenderer } from "../_parts/FixtureRenderer";
import { ThemeToggle } from "../_parts/ThemeToggle";

export default function DevComponentPage({ params }: { params: { component: string } }) {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEV_TOOLS !== "1") {
    notFound();
  }
  return (
    <div className="mx-auto max-w-screen-md p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">{params.component}</h1>
        <ThemeToggle />
      </header>
      <FixtureRenderer toolName={params.component} />
    </div>
  );
}
```

- [ ] **Step 12.3: `FixtureRenderer`** dynamic-imports the fixture by `toolName` and looks up the component from the registry. Renders every exported state in a vertical stack, each inside a bordered panel with the state name as a header.

- [ ] **Step 12.4: `ThemeToggle`** uses `next-themes` `useTheme`. Toggles between light and dark.

- [ ] **Step 12.5: `.env.example`** addition:

```
# Dev-only preview harness at /dev/tool-results. Set to 1 in local dev to enable;
# MUST remain unset in prod deploys.
NEXT_PUBLIC_DEV_TOOLS=
```

- [ ] **Step 12.6: Verify manually.** `bun dev:app`; navigate to `http://localhost:3000/dev/tool-results`. Click each component link. Toggle theme. Verify every fixture renders.

- [ ] **Step 12.7: Verify gated.** Run `NODE_ENV=production bun build --filter=@repo/app`. Expect build to succeed. Start `NODE_ENV=production bun start`; navigate to `/dev/tool-results`; expect 404. Set `NEXT_PUBLIC_DEV_TOOLS=1` and rebuild; expect 200.

- [ ] **Step 12.8: Commit.**

```bash
gt create feat/agentic-home/W3-12-preview-harness -m "feat(genui): dev-only preview harness for tool-results with theme toggle"
```

---

## Task 13: Guardrail scripts (forbidden hooks, raw useQuery, color literals, "use client")

**Recommended agent:** Codex
**Rationale:** Self-contained script; deterministic acceptance criteria.
**Linear issue:** LIN-TBD-W3-13
**Blocker:** none.

**Files:**
- Create: `apps/app/scripts/check-tool-results.ts`
- Modify: `apps/app/package.json` (add `"check:tool-results": "bun run scripts/check-tool-results.ts"`)
- Modify: `turbo.json` (wire `check:tool-results` into the `lint` pipeline for `@repo/app`)

### Steps

- [ ] **Step 13.1: Write the check script.**

```ts
import { Project } from "ts-morph";
import { globSync } from "glob";

const TOOL_RESULTS = "apps/app/src/components/chat/tool-results/**/*.{ts,tsx}";
const FORBIDDEN_HOOKS = ["useMemo", "useCallback", "React.memo", "memo"];
const ALLOWED_IF_JUSTIFIED = /\/\/ JUSTIFIED:/;
const ALLOWED_USEQUERY = "convex-helpers/react/cache/hooks";
const FORBIDDEN_USEQUERY = "convex/react";
const COLOR_LITERAL = /#(?:[0-9a-fA-F]{3}){1,2}\b|rgb\(|rgba\(|hsl\(|text-(?:red|blue|green|yellow|orange|purple|pink|slate|gray|zinc|neutral|stone)-\d/;

const project = new Project({ tsConfigFilePath: "apps/app/tsconfig.json" });
const sources = globSync(TOOL_RESULTS);
let failed = 0;

for (const file of sources) {
  if (file.endsWith(".fixture.ts")) continue;
  const source = project.addSourceFileAtPath(file);
  const text = source.getFullText();

  // 1. "use client"
  if (!/^"use client";/m.test(text)) {
    console.error(`FAIL [${file}] missing "use client" directive`);
    failed++;
  }

  // 2. useQuery from forbidden source
  const queryImport = source.getImportDeclaration(
    (d) => d.getModuleSpecifierValue() === FORBIDDEN_USEQUERY
  );
  if (queryImport && queryImport.getNamedImports().some((n) => n.getName() === "useQuery")) {
    console.error(`FAIL [${file}] imports useQuery from "${FORBIDDEN_USEQUERY}" (use "${ALLOWED_USEQUERY}")`);
    failed++;
  }

  // 3. forbidden hooks without JUSTIFIED comment
  for (const hook of FORBIDDEN_HOOKS) {
    const calls = source.getDescendants().filter((n) => n.getText() === hook);
    for (const call of calls) {
      const line = text.substring(0, call.getStart()).split("\n").slice(-3).join("\n");
      if (!ALLOWED_IF_JUSTIFIED.test(line)) {
        console.error(`FAIL [${file}:${call.getStartLineNumber()}] ${hook} without // JUSTIFIED: comment`);
        failed++;
      }
    }
  }

  // 4. color literals
  const match = text.match(COLOR_LITERAL);
  if (match) {
    console.error(`FAIL [${file}] color literal found: ${match[0]}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} violation(s) in apps/app/src/components/chat/tool-results/`);
  process.exit(1);
}
console.log("OK: all tool-results files pass guardrails.");
```

- [ ] **Step 13.2: Wire into `turbo.json` lint task.** Add a new task in `apps/app/turbo.json` if per-app, or wire into root `turbo.json` under a `lint` pipeline extension.

- [ ] **Step 13.3: Run locally and fix any violations** that the script catches. Expected: zero violations after Tasks 1 through 11 are merged if the plan was followed.

- [ ] **Step 13.4: Commit.**

```bash
gt create feat/agentic-home/W3-13-guardrails -m "feat(genui): CI guardrails for tool-results (forbidden hooks, raw useQuery, color literals)"
```

---

## Task 14: Seed script for dev preview harness (optional)

**Recommended agent:** Codex
**Rationale:** Deterministic data population; no architectural decision.
**Linear issue:** LIN-TBD-W3-14
**Blocker:** none.

**Skip this task if:** fixtures carry enough hard-coded IDs plus inline `preview` payloads for the preview harness to render convincingly without live queries resolving. Decide at the start of Task 12.

**Files (if shipping):**
- Create: `apps/app/scripts/seed-dev-tool-results.ts`

### Steps

- [ ] **Step 14.1:** Write a bun script that connects to the dev Convex backend via `ConvexHttpClient` and seeds the minimum set of entities for each fixture ID. Idempotent (upsert). Runs via `bun run scripts/seed-dev-tool-results.ts`.

- [ ] **Step 14.2:** Document in the README block at the top of `dev/tool-results/page.tsx`.

- [ ] **Step 14.3:** Commit.

```bash
gt create feat/agentic-home/W3-14-dev-seed -m "feat(genui): dev seed script for preview harness"
```

---

## Task 15: W2 / W1 / W5 contract reconciliation + manual QA

**Recommended agent:** Claude Code
**Rationale:** Cross-spec reconciliation; requires reading four workstream plans and confirming each CR landed as spec'd.
**Linear issue:** LIN-TBD-W3-15
**Blocker:** all CRs (CR-1 through CR-5) must have merged PRs.

**Files:**
- Create: `specs/W3-generative-ui.reconciliation.md` (short follow-up doc documenting which CR items landed and any residual gaps)

### Steps

- [ ] **Step 15.1: For each of CR-1 through CR-5**, open the W1, W2, W5 plan PRs and confirm the merged signature matches the W3 spec. If a signature drifted, file a follow-up task.

- [ ] **Step 15.2: Manual QA against live dev backend.**

Run `bun dev` (starts app, backend, web, email preview). Log in as a dev user. Open `/dev/tool-results`. For each component, verify:
- Input-streaming state renders skeleton.
- Output-available state renders correct live data.
- Output-error renders error row with retry.
- Light and dark toggles both render correctly.
- Drill-ins fire toolHint turns (inspect network tab for POST to `api.agent.chat.sendStreaming` with `toolHint` body).

For `ProposalConfirmCard`, additionally verify:
- `awaiting_confirmation` with `scope: single` renders inline diff.
- `awaiting_confirmation` with `scope: bulk` renders sampled rows plus expand.
- Irreversible banner fires at `affectedIds.length > 500`.
- Drift banner fires when a row's `_updateTime` updates mid-session (simulate by editing a row in another tab).
- Confirm button: 3-second countdown on irreversible scope; 250 ms otherwise.
- Executed state shows Undo button; button disappears after 10 minutes (fast-forward via fixture override).

- [ ] **Step 15.3: Close acceptance checklist.** Copy every item from spec §10 into the reconciliation doc; mark each as passed with evidence.

- [ ] **Step 15.4: Commit.**

```bash
gt create feat/agentic-home/W3-15-reconciliation -m "docs(specs): W3 contract reconciliation and acceptance log"
```

- [ ] **Step 15.5: Submit stack.**

```bash
gt submit --stack
```

CodeRabbit reviews the entire stack. Cross-review: Claude Code reviews the Codex-authored tasks; Codex reviews the Claude Code-authored tasks. Per master-prompt §11.

---

## Self-review checklist (executing agent runs before merging Task 15)

1. Every task has been landed on its Graphite branch; stack navigates cleanly via `gt log short`.
2. `bun typecheck`, `bun build`, `bun lint`, `bun run check:tool-results` (via turbo) all pass on `main` after merge.
3. Spec `specs/W3-generative-ui.md` §10 acceptance criteria all satisfied.
4. Zero em-dashes or en-dashes in any new file. Automated via a grep for Unicode code points `U+2014` (em-dash) and `U+2013` (en-dash) across `apps/app/src/components/chat/tool-results/` and `specs/W3-generative-ui.*`. Script: `bun run scripts/check-dashes.ts` (add in the same PR as task 13 guardrails if not already present).
5. `/dev/tool-results` renders every component in both themes in dev; 404 in prod.
6. Existing routes (`/credit-cards`, `/credit-cards/[cardId]`, `/wallets`, `/transactions`, `/settings/*`) unchanged; manual smoke test in the reconciliation log.

---

End of plan.

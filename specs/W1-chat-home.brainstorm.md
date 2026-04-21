# W1: Agentic Chat Home Page (Brainstorm)

**Milestone:** M3 Agentic Home (to be created in Linear)
**Workstream:** W1 Chat UI
**Phase:** Obra Superpowers /brainstorm output (Phase 1)
**Author:** Claude Opus 4.7 (1M context)
**Date:** 2026-04-20
**Status:** Draft for Eric review. Blocks `/plan` until approved.
**Writing convention:** No em-dashes, per repo rule. Colons, parentheses, semicolons, and fresh sentences only.

> This is exploration, not spec. It enumerates the decisions already made through brainstorming dialogue, the trade-offs considered, the contracts W1 needs from W2 and W3, and the risks that the `/plan` phase must address. It does not instruct an executing agent. The authoritative spec is `specs/W1-chat-home.md` (not yet written). The task-by-task implementation plan with the Plan Handoff Header is `specs/W1-chat-home.plan.md` (not yet written).

---

## 1. Inputs consumed

| Source | Role |
|---|---|
| `specs/00-master-prompt.md` Sections 1 through 7, Section 8 W1, Section 11 | Authoritative brief; W1 target state and dependency graph |
| `specs/W0-existing-state-audit.md` Section 1 (W1 gap matrix row), Sections 12 (app routing), 13 (packages/ui inventory), 20 (mismatches) | Baseline of what already exists; must-not-re-specify list |
| `AGENTS.md` | Convex Ents conventions, security rules, UntitledUI rules, common pitfalls |
| `CLAUDE.md` | Git workflow, commit discipline, Graphite rules, plan-mode guidance |
| `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/` | Reference implementation for `@convex-dev/agent` + UntitledUI chat |
| `/Users/itsjusteric/CrowDevelopment/Templates/untitledui/` | Source for any missing UntitledUI primitive |
| `apps/app/src/app/(app)/layout.tsx`, `apps/app/src/app/(app)/page.tsx`, `apps/app/src/components/application/dashboard-sidebar.tsx` | Existing shell that W1 mutates, not replaces |
| `packages/ui/src/components/untitledui/application/messaging/messaging.tsx`, `packages/ui/src/components/untitledui/application/command-menus/` | Primitives already vendored that W1 reuses |

---

## 2. What W0 says is already built (W1 must not re-specify)

Quoting the W1 row from the W0 gap matrix (Section 1 of `specs/W0-existing-state-audit.md`):

- Shell at `apps/app/src/app/(app)/layout.tsx`: Clerk auth, Convex bootstrap, `DashboardSidebar`.
- Theme provider wired.
- UntitledUI `command-menu` primitive vendored in `packages/ui/src/components/untitledui/application/command-menus/`.

W0 Section 13 additionally confirms that `packages/ui/src/components/untitledui/application/messaging/messaging.tsx` exists (the `MessageItem` primitive the template imports). The W0 gap row did not call this out; W1 relies on it and flags the update for the W0 follow-up.

**Partial, W1 closes the gap:** the current `/` is a real dashboard composed of 7 live-query subcomponents in `apps/app/src/app/(app)/dashboard/components/`. It must relocate intact. Sidebar needs a "Home" chat pointer (already labelled Home today; mapping behind the label changes from dashboard to chat).

**Net-new for W1:** everything chat-specific. Route files, component files, sidebar History entry, keyboard bindings, reserved-slug guard, deep-link audit, proposal card slot.

---

## 3. Decisions locked during brainstorming dialogue

| # | Decision | Rationale |
|---|---|---|
| D1 | Relocate current `/` to `/overview`. Keep all 7 dashboard subcomponents. | Satisfies master-prompt Section 3 "must not regress". Lowest blast radius; reuses existing component co-location. |
| D2 | Route pattern: `/` hosts the new-chat `ChatView`, `/[threadId]` hosts the same view with `initialThreadId`. | Matches `ai-chatbot-untitledui` template. Shareable URLs; browser back works; simplest file tree. Collision risk with top-level routes is handled by a reserved-slug guard (Section 9). |
| D3 | Thread list surfaces as a nested "History" item in the existing sidebar. No second column; no dedicated thread pane. | Matches template pattern. Uses the sidebar primitive already paid for. Per-thread hover actions (rename, delete) live on the row via the existing UntitledUI dropdown primitive. |
| D4 | Proposals render through the W3 tool-result registry. Any `toolName.startsWith("propose_")` maps to `ProposalConfirmCard` (owned by W3). | Keeps the W1 dispatcher dumb; concentrates diff visualisation in W3 where the generative UI library lives. Confirm and Cancel buttons call Convex mutations that W2 or W5 own. |
| D5 | Empty state: SmartPockets-branded hero, single centered composer, 4 finance-specific suggestion chips. | Sets the finance tone immediately; the generic template chips (DeepSearch, Create Image, Pick Personas, Voice) do not fit SmartPockets. Draft chip copy in Section 13. |
| D6 | Keyboard: keep `Cmd+K` bound to the existing command menu. Add "Threads" and "New chat" sections to that menu. Leave `Cmd+/` unbound in MVP (follow-up if discoverability fails). `Enter` sends, `Shift+Enter` newlines, `Esc` cancels a focused proposal card. | Master-prompt Section 8 W1 lists `Cmd+K = new thread`; this conflicts with the working command menu bound to `Cmd+K` today. Deliberate deviation; documented here so reviewers see the trade. |
| D7 | Streaming primitive: `useUIMessages` and `syncStreams` from `@convex-dev/agent/react`, plus `useSmoothText` for typewriter animation. | Master-prompt Section 4 says "`useChat` from the Vercel AI SDK or current canonical hook"; `useUIMessages` is the canonical hook for the `@convex-dev/agent` stack. Deliberate deviation from the AI SDK literal; documented here. Hinges on W2 installing `@convex-dev/agent` and writing the `messages.listWithStreaming` query (contract CA-3 below). |

---

## 4. Approach: lean semantic port

Three approaches were considered.

### 4.a. Lean port (selected)

Port 12 client components from `ai-chatbot-untitledui/apps/app/src/components/chat/` into `apps/app/src/components/chat/`. Drop template features that are outside the MVP surface defined by master-prompt Section 3: research mode, voice recorder, model selector, file upload, attachment preview, source cards, TipTap-based rich composer. Keep markdown, tool-call display, message actions, thread item, smooth streaming, failed-state retry, error boundary. Add five net-new files: `tool-results/index.ts`, `tool-results/ToolResultRenderer.tsx`, `tool-results/types.ts`, `ChatBanner.tsx`, `ReconsentModal.tsx`. Result: 12 ported files plus 5 net-new files plus 3 route files (`/`, `/[threadId]`, `/overview`) plus one sidebar diff.

### 4.b. Full port, trim later (rejected)

Port everything from the template verbatim, then follow with a PR that removes unused features. Doubles the reviewer load for no net gain; leaves dead code in between PRs; amplifies the CodeRabbit surface.

### 4.c. Clean-room rebuild on the messaging primitive (rejected)

Ignore the template and build the chat surface afresh on `@repo/ui/untitledui/application/messaging`. Preserves SmartPockets tokens more tightly but re-solves problems the template has already solved (smooth streaming, tool-call collapse, optimistic first-turn shim). Trade is not worth the latency cost.

---

## 5. File tree (before and after)

### 5.1 Before (current state, verified)

```
apps/app/src/app/(app)/
  layout.tsx
  page.tsx                         dashboard, 40 lines, renders 7 subcomponents
  dashboard/
    components/
      AlertBanner.tsx
      ConnectedBanks.tsx
      HeroMetrics.tsx
      RecentTransactions.tsx
      SpendingBreakdown.tsx
      UpcomingPayments.tsx
      YourCards.tsx
  credit-cards/**
  transactions/**
  wallets/**
  settings/**
  sign-in/[[...sign-in]]/page.tsx
  sign-up/[[...sign-up]]/page.tsx

apps/app/src/components/application/
  dashboard-sidebar.tsx            Home, Credit Cards, Transactions, Wallets, Settings

apps/app/src/components/chat/      does not exist
```

### 5.2 After (target state, W1 scope)

```
apps/app/src/app/(app)/
  layout.tsx                       unchanged
  page.tsx                         REWRITTEN; renders <ChatView />
  [threadId]/
    page.tsx                       NEW; RSC shell that extracts params then renders <ChatView initialThreadId={...} />
  overview/
    page.tsx                       NEW; hosts the old dashboard body
  dashboard/
    components/*                   unchanged; imported by /overview
  credit-cards/**                  unchanged
  transactions/**                  unchanged
  wallets/**                       unchanged
  settings/**                      unchanged

apps/app/src/components/chat/      NEW directory
  ChatView.tsx                     orchestrator; accepts optional initialThreadId
  ChatContainer.tsx                scroll region + input region shell
  ChatHome.tsx                     empty state; SmartPockets hero + 4 finance chips
  MessageList.tsx                  useUIMessages; optimistic first-turn shim; scroll-to-end
  MessageBubble.tsx                role, parts, useSmoothText, retry
  MessageInput.tsx                 composer wrapper
  MessageActionMinimal.tsx         input + send
  MessageActions.tsx               copy + retry row under bubble
  MessageFailedState.tsx           inline retry for failed messages
  MarkdownContent.tsx              react-markdown + remark-gfm + rehype-raw
  ToolCallDisplay.tsx              collapsible fallback when no registry match
  ThreadItem.tsx                   sidebar History row with hover rename/delete
  tool-results/
    index.ts                       registry stub; W3 fills in component bodies
    ToolResultRenderer.tsx         dispatcher stub; wildcard match for propose_*
    types.ts                       shared types for tool-result payload shapes
  ChatBanner.tsx                   NEW; variant-driven banner for rate limit, budget, llm-down, reconsent-nudge
  ReconsentModal.tsx               NEW; modal linking to /settings/institutions

apps/app/src/components/application/
  dashboard-sidebar.tsx            MODIFIED (see Section 6.3)
```

No source files are written in the brainstorm phase. The Write operations above are targets for the `/plan` phase.

---

## 6. Component inventory

### 6.1 Ported components (semantic port, SmartPockets conventions applied)

| Component | Template source | W1 change list |
|---|---|---|
| ChatView | `components/chat/ChatView.tsx` | Drop `researchMode`, `quickResearch`, model selector, `fileIds`. Strip `useFileUpload`. Initial `threadId` is `optional` only (no server-side preload). Optimistic prompt pattern retained. |
| ChatContainer | `components/chat/ChatContainer.tsx` | Straight port; uses `bg-primary` SmartPockets token. |
| ChatHome | `components/chat/ChatHome.tsx` | Replace chips and logo. New chip copy in Section 13. |
| MessageList | `components/chat/MessageList.tsx` | Straight port; query path changes (CA-3). |
| MessageBubble | `components/chat/MessageBubble.tsx` | Drop file parts path for MVP. Keep parts-aware rendering. When a `tool-call` or `tool-result` part appears, delegate to `ToolResultRenderer`; fall back to `ToolCallDisplay` only when the registry has no match. |
| MessageInput | `components/chat/MessageInput.tsx` | Drop model selector, files, research toggle. Keep footer disclaimer string. |
| MessageActionMinimal | `components/chat/MessageActionMinimal.tsx` | Drop file upload affordance for MVP. Strip voice recorder entry. |
| MessageActions | `components/chat/MessageActions.tsx` | Straight port. Copy + retry; regenerate button only on assistant messages. |
| MessageFailedState | `components/chat/MessageFailedState.tsx` | Straight port. |
| MarkdownContent | `components/chat/MarkdownContent.tsx` | Straight port; verify against SmartPockets typography tokens. |
| ToolCallDisplay | `components/chat/ToolCallDisplay.tsx` | Straight port as the fallback renderer when the W3 registry lacks a mapping. |
| ThreadItem | `components/chat/thread-item.tsx` | Add hover actions (rename, delete) via UntitledUI dropdown primitive. Template shows title only. |

### 6.2 Net-new files

| File | Purpose |
|---|---|
| `tool-results/index.ts` | Registry stub. Exports a `toolResultRegistry` object keyed by `toolName`, and a wildcard branch for `propose_*`. W3 fills this in; W1 ships a placeholder that renders `ToolCallDisplay` for every key. |
| `tool-results/ToolResultRenderer.tsx` | Dispatcher component. Takes `(toolName, result, state)`; looks up the registry; renders the matched component or `ToolCallDisplay` fallback. |
| `tool-results/types.ts` | Shared type exports: `ToolResultComponentProps`, `ToolResultRegistry`. W3 extends these. |

### 6.3 Sidebar diff

`apps/app/src/components/application/dashboard-sidebar.tsx` modifications (scope defined; not written in the brainstorm):

1. Import `api.agent.threads.listForUser` via `useQuery` (cached from `convex-helpers/react/cache/hooks` per AGENTS.md).
2. Build `historyItems` from the query result; render each as `<ThreadItem threadId={...} title={...} />`.
3. Add two nav entries: "Home" (pointing to `/` unchanged in label, changed in target page behaviour) and "History" (nested, children = `historyItems`).
4. Add "Overview" entry below "Home" pointing at `/overview`.
5. Extend `CommandMenu` content: add a "Threads" section with "New chat" (navigates to `/`) and last 10 threads; keep "Navigation" and "Settings" sections.
6. Extend `commandRoutes` map with `overview: "/overview"` and `threads: "/"`.

---

## 7. Streaming UX state machine

```
idle
  | user submits prompt
  v
optimistic-sending                      (ChatView sets optimisticPrompt; ChatHome unmounts; MessageList renders an optimistic user bubble plus typing indicator)
  | first real user message appears in useUIMessages results
  v
streaming                               (assistant text part grows via useSmoothText)
  |                                     |
  | tool-call part appears              | completion event
  v                                     v
streaming+tool-pending                  ready
  | tool-result part arrives            |
  v                                     |
streaming+tool-done                     | next prompt restarts at idle
  | (continues streaming text, or next tool-call cycle, or completion)
  v
streaming                               (back to the streaming line above)

failure branch:
  streaming  ----- status == "failed" -----> failed  (MessageFailedState visible; Retry button re-invokes chat.regenerate)

proposal branch inside streaming+tool-done:
  if toolName.startsWith("propose_")   -> ToolResultRenderer picks ProposalConfirmCard (W3)
  Confirm                              -> api.agent.proposals.confirm({ proposalId }); registry shows in-progress then Executed state
  Cancel                               -> api.agent.proposals.cancel({ proposalId }); card shows Cancelled state
  Escape keypress while focused        -> same as Cancel
```

**Key behaviours the spec will need to nail down:**

- `optimisticPrompt` lingers until `useUIMessages` returns a user message with matching text; then it clears. Template pattern retained.
- The typing indicator under the optimistic state uses the UntitledUI `messaging` primitive `MessageItem` with `typing: true`. Already vendored.
- `useSmoothText` is called with `startStreaming: isStreaming`; applies only to assistant bubbles.
- Tool-call collapse is closed by default; user can expand inputs and outputs. `ProposalConfirmCard` does not collapse (it has live buttons).

---

## 8. Keyboard map

| Keys | Context | Action |
|---|---|---|
| `⌘K` | Anywhere in `(app)` | Open command menu (unchanged; menu gains Threads and New chat sections) |
| `⌘/` | Anywhere | Unbound in MVP. Flagged as follow-up if Eric finds thread discoverability lacking. |
| `Enter` | Composer focused, no Shift | Send message |
| `Shift+Enter` | Composer focused | Newline in composer |
| `Esc` | Focused proposal card | Call `cancelProposal({ proposalId })` and blur |
| `Esc` | Composer focused, no active proposal | Blur composer (native) |

Accessibility: the proposal card is focusable and carries `role="dialog"` (or equivalent ARIA group) so `Esc` is discoverable via screen reader. Final ARIA shape decided in `/plan`.

---

## 9. Routing guardrail

`/[threadId]` at the app root means every literal first segment that exists or will exist must be reserved against thread-ID collisions. Enforcement lives inside `[threadId]/page.tsx`:

```ts
// Shape, not final. Specifies the guard; does not ship code.
const RESERVED_SLUGS = new Set([
  "overview",
  "credit-cards",
  "transactions",
  "wallets",
  "settings",
  "sign-in",
  "sign-up",
]);

if (RESERVED_SLUGS.has(params.threadId)) notFound();
if (!isThreadIdShaped(params.threadId)) notFound();
```

`isThreadIdShaped` is a regex check against the thread ID format that `@convex-dev/agent` returns (W2 confirms the exact shape; Convex IDs are a known prefix plus 32 characters of base-32, so the regex is tight). Research note to W2: confirm Convex Agent thread IDs cannot collide with any reserved slug above.

**Follow-up risk:** future routes like `/subscriptions` or `/promos` will need to be added to `RESERVED_SLUGS` atomically with their route files. A lint rule that scans `(app)/*/page.tsx` and diffs against `RESERVED_SLUGS` is a cheap guard; noted for `/plan` as an optional task.

---

## 10. SSR / RSC split

| File | Render mode | Reason |
|---|---|---|
| `apps/app/src/app/(app)/layout.tsx` | Client | Already client. Clerk + Convex bootstrap with hooks. No change. |
| `apps/app/src/app/(app)/page.tsx` | Client (`"use client"`) | Renders `<ChatView />` which uses Convex hooks. |
| `apps/app/src/app/(app)/[threadId]/page.tsx` | Async RSC that awaits `params`, then hands off to a client `<ChatView initialThreadId>`. | Matches the template pattern. The RSC shell gets Next's typed param access; the client subtree does the work. |
| `apps/app/src/app/(app)/overview/page.tsx` | Client | Dashboard subcomponents use Convex hooks. |

No Next.js API routes are introduced, per master-prompt Section 13 guardrail. All agent traffic flows through Convex actions and queries via the Convex client SDK.

---

## 11. Deep link and copy audit

Scope in `/plan`:

1. Grep `apps/app` and `apps/web` for `href="/"`, `push("/")`, `redirect("/")`. Confirm none of them mean "dashboard" after pivot (they now mean "chat"). Any that want the old dashboard become `/overview`.
2. Grep for sidebar or breadcrumb labels that say "Dashboard" and point at `/`. Change label to "Home" or point at `/overview`.
3. Grep email templates (`packages/email/emails/`) for deep links into `/`. Update if any reference the dashboard intent; none expected but W7 audit confirms.

No emails or marketing pages currently link to `/` as "Dashboard" per W0 Section 15.4; confirmed no active email triggers beyond the 4 Clerk slugs. Audit is cheap.

---

## 12. Error UX inventory

Every error class the chat surface can show. Each maps to a dedicated component; each component is W1 scope except where noted.

| Condition | Source | Surface | W1 component |
|---|---|---|---|
| Tool call throws | W2 emits `tool-result` part with `error` field | Inline red card in the bubble | `ToolCallDisplay` error branch (already in template) |
| Rate limit (per-minute) | W2 returns `{ error: "rate_limited", retryAfterSeconds }` from streaming action | Sticky banner above input: "Slow down. Retry in Ns." | `ChatBanner` (net-new; subcomponent of `ChatView`) |
| Token budget exhausted | W2 returns `{ error: "budget_exhausted" }` | Sticky banner: "Monthly budget reached. Upgrade in Settings." with link | `ChatBanner` variant |
| LLM provider down | W2 emits `llm_down` via typed error | Sticky banner: "Assistant is offline. Retrying..." | `ChatBanner` variant |
| Plaid re-consent required | W4 emits reconsent signal; W2 surfaces to agent tool result | Modal linking to `/settings/institutions` | `ReconsentModal` (net-new; lightweight wrapper on UntitledUI modal) |
| Network loss | `useConvexAuth` isLoading spikes or query returns undefined after timeout | Sonner toast | Existing toaster |

`ChatBanner` is a single component with a variant prop rather than three components. Flagged as W1 scope.

---

## 13. Empty-state copy drafts

To review. Drafts are colloquial, direct, no em-dashes.

**Hero headline:** "Ask SmartPockets anything about your money."

**Subheadline:** "Balances, promos, transactions, spend breakdowns. Ask in plain language."

**Suggestion chips (4):**

1. "What did I spend on groceries last month?"
2. "Which deferred-interest promo expires first?"
3. "Show my Chase Sapphire statement."
4. "Mark all Amazon charges as Shopping."

Chip click behaviour: pre-fills the composer with the chip text and triggers send immediately (template pattern: `onClick -> onSend(label)`).

---

## 14. Dependencies

### 14.1 New npm packages for `apps/app`

| Package | Version target | Source |
|---|---|---|
| `@convex-dev/agent` | Version W2 picks; shared install | Master-prompt Section 8 W2 |
| `react-markdown` | `^10.1.0` | Template parity |
| `remark-gfm` | `^4.0.1` | Template parity |
| `rehype-raw` | `^7.0.0` | Template parity |

### 14.2 Already present

`convex`, `convex-helpers`, `motion`, `sonner`, `react-aria`, `react-aria-components`, `@untitledui/icons`, Tailwind 4, UntitledUI primitives.

### 14.3 Explicitly not added in W1

`@ai-sdk/anthropic`, `@ai-sdk/react`, `ai` (Vercel AI SDK), TipTap packages, `input-otp`, `qr-code-styling`, `@tiptap/*`, `embla-carousel-react` from the template. `useUIMessages` replaces `useChat`; the AI SDK lives in W2.

---

## 15. W2 contract assumptions

W1 depends on W2's agent backend contract. Every item below is an assumption; the `/plan` phase must cross-check against W2's brainstorm and spec outputs before committing any code. If W2 chooses a different shape, each assumption becomes a W1 plan task to reconcile.

| # | Symbol or contract | W1 expectation | Reconciliation owner |
|---|---|---|---|
| CA-1 | `api.agent.chat.startConversation` | Action; `args: { prompt, modelId?, fileIds? }`; returns `{ threadId, text }`. Also schedules a title-generation internal action in the background. | W2 |
| CA-2 | `api.agent.chat.sendStreaming` | Action; `args: { threadId, prompt, modelId? }`; returns `{ scheduled: true }`; schedules an internal action that calls `thread.streamText` with `saveStreamDeltas`. | W2 |
| CA-3 | `api.agent.messages.listWithStreaming` | Query; `args: { threadId, paginationOpts, streamArgs }`; returns `{ ...paginatedUIMessages, streams }`. Enables `useUIMessages` to drive the MessageList. | W2 |
| CA-4 | `api.agent.threads.listForUser` | Query; no args; returns `Array<{ threadId, title, summary?, updatedAt }>` filtered by the authenticated viewer and archived-excluded. | W2 |
| CA-5 | `api.agent.threads.renameThread` | Mutation; `args: { threadId, title }`; verifies thread ownership via Clerk identity match. | W2 |
| CA-6 | `api.agent.threads.deleteThread` | Mutation; `args: { threadId }`; soft-deletes (archives) the thread. | W2 |
| CA-7 | Message part schema | Messages carry `parts: Array<{ type: "text" | "tool-call" | "tool-result" | "file", ... }>`. Tool-call parts expose `toolCallId`, `toolName`, `args`. Tool-result parts expose `toolCallId`, `toolName`, `result`, optional `error`, optional `state`. | W2 |
| CA-8 | Proposal naming convention | Tool-result parts where `toolName.startsWith("propose_")` carry `result: { proposalId: Id<"agentProposals">, summary, diff, scope, ... }`. The exact diff shape is W3's call; W1 passes the result through the registry. | W2 (names) + W3 (diff shape) + W5 (proposal semantics) |
| CA-9 | `api.agent.proposals.confirm` | Mutation; `args: { proposalId }`; returns `{ executed: boolean, reversalToken? }`. W1 renders Confirm button that calls this; mutation may schedule the actual execute action. | W2 or W5 |
| CA-10 | `api.agent.proposals.cancel` | Mutation; `args: { proposalId }`; returns `{ cancelled: boolean }`. | W2 or W5 |
| CA-11 | Thread ownership check | Every W2 query and action that takes `threadId` calls an `assertThreadAccess` helper that throws if `identity.subject !== thread.userId`. W1 relies on this guardrail; does not duplicate it. | W2 |
| CA-12 | Typed error codes | Streaming actions and tool results propagate structured errors using a discriminated union: `{ kind: "rate_limited", retryAfterSeconds } | { kind: "budget_exhausted" } | { kind: "llm_down" } | { kind: "reconsent_required", plaidItemId }`. W1 `ChatBanner` and `ReconsentModal` map 1-to-1 to these kinds. | W2 |
| CA-13 | Thread ID shape | `@convex-dev/agent` thread IDs are opaque strings with a format that does not collide with any SmartPockets reserved slug (Section 9). W2 research confirms. | W2 |
| CA-14 | Cached `useQuery` pattern | Sidebar thread list uses `useQuery` from `convex-helpers/react/cache/hooks`, not raw `convex/react`. AGENTS.md enforced. W2 queries must be cache-safe (stable return shape, no `now()` in return). | W2 |

The `/plan` phase translates each CA-N into a "Verify contract" checklist entry; implementation tasks then reference the CA-number instead of restating the contract.

---

## 16. W3 contract assumptions

| # | Symbol | W1 expectation | Owner |
|---|---|---|---|
| CB-1 | `ToolResultRenderer` | Component rendered by `MessageBubble` for every `tool-call` or `tool-result` part. Props: `{ toolName, args?, result?, state, threadId }`. | W1 ships the dispatcher; W3 populates the registry. |
| CB-2 | Registry shape | `tool-results/index.ts` exports `toolResultRegistry: Record<string, ComponentType<ToolResultComponentProps>>` plus a `proposalFallback: ComponentType<ToolResultComponentProps>` that handles `propose_*`. | W3 |
| CB-3 | `ProposalConfirmCard` | Component rendered when `toolName.startsWith("propose_")`. Props: `{ proposalId, summary, diff, scope, onConfirm, onCancel, state }`. W1 wires `onConfirm` to CA-9 mutation and `onCancel` to CA-10 mutation. | W3 owns body; W1 owns wiring. |
| CB-4 | Theming | Every generative component inherits UntitledUI tokens; works in light and dark. | W3 |

---

## 17. Testing plan

No test code is written in W1 brainstorm. The `/plan` phase lists test tasks; `/execute` writes them. Target coverage:

| Layer | Scope |
|---|---|
| Component smoke | `ChatHome` renders with mock `onSend`; each chip fires the expected prompt. `MessageBubble` renders user / assistant / streaming / failed variants. `ToolCallDisplay` renders pending / done / error. `ThreadItem` renders with rename and delete hover actions. |
| Route | `/` renders `ChatView` with no thread. `/abc123` shaped like a Convex ID renders `ChatView` with `initialThreadId`. `/overview` renders the 7 dashboard subcomponents. Reserved slugs (`overview`, `credit-cards`, `transactions`, `wallets`, `settings`, `sign-in`, `sign-up`) at `/[threadId]` return 404 rather than chat. |
| Sidebar | With 0 threads, History item renders empty state. With 1 thread, History shows 1 row. With 30 threads, History paginates or caps at 10 (decision in `/plan`). |
| Manual smoke | Bun dev running; log in; open `/`; submit a chip; see optimistic then streaming then final; navigate to `/overview`; confirm all 7 dashboard subcomponents render live data; navigate back; confirm sidebar active state tracks the route; confirm Cmd+K opens command menu; confirm command menu has Threads section; confirm Enter sends, Shift+Enter newlines. |

W1 does not write integration tests against the agent backend. W2 owns those.

---

## 18. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `@convex-dev/agent` thread ID shape collides with future reserved slugs | Low | High (routing breakage) | Regex guard in `[threadId]/page.tsx`; W2 research confirms shape; add lint rule (noted in Section 9). |
| W2 picks a different hook than `useUIMessages` | Medium | High (W1 rewrites MessageList) | CA-3 flagged; `/plan` reconciles against W2 brainstorm before writing MessageList. |
| W3 registry naming diverges from `propose_*` convention | Low | Medium (dispatcher rewires) | CA-8 and CB-2 flagged; `/plan` cross-reference to W3 brainstorm. |
| Reserved slug lint rule rot (new route added without reserving) | Medium | Medium (user reports chat fails for a specific thread ID) | Test that iterates every `(app)/*/page.tsx` directory against `RESERVED_SLUGS`; noted for `/plan`. |
| Sidebar thread list query fires on every page load | High | Low (cost, not correctness) | Use cached `useQuery` from `convex-helpers`; paginate to 50 initial; defer virtualisation. |
| Chat breaks on mobile soft keyboard | Low | Low | Template handles most of this; manual QA on iOS Safari and Android Chrome in `/plan`. |
| Markdown rendering injects unsafe HTML | Low | High | `rehype-raw` plus sanitisation audit in `/plan`. Template sets the pattern; W1 confirms. |
| Optimistic prompt never clears (desync bug) | Medium | Low | Template has a working shim; port the shim; add a timeout guard (10 seconds) that clears optimistic if no real message arrives. |
| Pre-existing sidebar slim mode (localStorage) conflicts with new History item | Low | Low | Verify the slim variant hides nested items correctly; flagged for manual QA. |
| React Compiler tries to re-memoise patterns the template already hand-memoised | Medium | Low | Code review removes any stale `useMemo`/`useCallback` that the compiler now handles. W0 Section 19.4 and commit `241d343` establish the pattern. |

---

## 19. Agent delegation (for `/plan`)

Every task in the eventual `specs/W1-chat-home.plan.md` must carry a recommended-agent tag per master-prompt Section 6. Pre-tagging the likely task clusters now, so `/plan` can lift them:

| Task cluster | Recommended agent | Rationale |
|---|---|---|
| Relocate dashboard to `/overview`; update imports | Codex | Mechanical file move plus import fixup. Well-specified. |
| Scaffold `apps/app/src/components/chat/` with ported components | Claude Code | Multi-file architectural shape; needs judgement on what to drop from the template. |
| Wire ChatView to CA-1 through CA-6 | Claude Code | Cross-cutting; confirms W2 contracts as writes happen. |
| Implement reserved-slug guard | Codex | Self-contained logic; tests included. |
| Sidebar diff: History nav item, Overview entry, Threads command-menu section | Codex | Straight edit to existing file; small blast radius. |
| `ChatBanner` variants and `ReconsentModal` | Codex | Well-specified component set. |
| Suggestion chip copy and hero | Claude Code | Copy judgement; tone. |
| `ToolResultRenderer` dispatcher and registry stub | Claude Code | Protocol shape; downstream consumer is W3. |
| Manual QA checklist | Claude Code | Synthesis; not mechanical. |

The session-level recommended agent for W1 is Claude Code for scaffolding, with Codex for follow-on execution once patterns are in place. Matches master-prompt Section 6 "W1 Chat UI: Claude Code for scaffolding, Codex for component extraction once patterns are set."

---

## 20. Plan Handoff Header fields (pre-filled sketch)

For `specs/W1-chat-home.plan.md` to be written in the `/plan` phase. The exact table is mandated by master-prompt Section 7.

| Field | Value |
|---|---|
| Linear milestone | M3 Agentic Home |
| Linear sub-project | W1 Chat UI |
| Linear issues | TBD at `/plan` time; one per task |
| Recommended primary agent | Claude Code (scaffolding) plus Codex (execution follow-on) |
| Required MCP servers | Convex MCP, Graphite MCP; Clerk MCP optional |
| Required read access | `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/`, `/Users/itsjusteric/CrowDevelopment/Templates/untitledui/` |
| Prerequisite plans | W2 (contract fixed; see CA-1 through CA-14), W3 (registry shape fixed; see CB-1 through CB-4). Implementation may start on W1 shell scaffolding before W2 or W3 land, but the full surface cannot green-light until both contracts are stable. |
| Branch | `feat/agentic-home/W1-chat-home` |
| Graphite stack parent | `main` (W1 is track C in master-prompt Section 11 dependency graph) |
| Worktree directory | `~/Developer/smartpockets-W1-chat` |
| Estimated PRs in stack | 4 to 6; each 200 to 400 lines |
| Review bot | CodeRabbit (mandatory pass) |
| Rollback plan | Revert the stack; `/` falls back to the previous dashboard because `page.tsx` is rewritten, not deleted (the relocated dashboard at `/overview` survives). |

---

## 21. Open questions left to `/plan` or later

1. **Thread list pagination at scale.** Is 50 threads the right initial load? Need per-user thread volume telemetry after alpha. Flagged for M4 follow-up.
2. **Title auto-generation failure.** If W2's title action fails, what does the sidebar show? "Untitled" per template; confirmed in `/plan`.
3. **Proposal auto-dismiss on navigation.** If user clicks away from the proposal card to another thread, does the proposal stay alive? Default: yes, survives page reloads per master-prompt Section 4 "survives page reloads". W5 decides the TTL.
4. **Undo toast placement.** Master-prompt Section 3 says 10-minute undo per mutation. W5 owns the UX; W1 reserves space for a toast but does not render it.
5. **Mobile bottom-sheet composer.** Template is mobile-responsive but the composer on iOS Safari with soft keyboard sometimes jumps. Flagged for `/plan` manual QA task.
6. **Avatar fallback when user has no Clerk photo.** Template derives initials; works. No action.
7. **Dark mode parity.** Template uses `bg-primary`, `bg-secondary` tokens that SmartPockets already defines. Confirm in `/plan` via manual toggle test.
8. **Reserved-slug lint rule.** Optional `/plan` task. Low cost, high value if the app grows many top-level routes.

---

## 22. Writing-discipline checks (self-review)

- **No em-dashes:** passes; document is free of the character. Colons, parens, semicolons, and fresh sentences only.
- **No re-specification of W0-built items:** does not redesign the sidebar shell, Clerk bootstrap, theme provider, layout.tsx, messaging primitive, or command-menu primitive. All four are referenced as dependencies; W0 is cited as authoritative.
- **No source code edited:** the document lists target files; the Write operations that will create them live in the `/plan` and `/execute` phases.
- **Every CA-N is testable:** each contract assumption maps to a W2 symbol name, argument shape, or return shape that `/plan` can verify against W2's brainstorm.
- **Every decision has a rationale:** Section 3 decisions table; Section 4 approaches table; Section 18 risks table.
- **Scope is single workstream:** does not wander into W2 schema, W3 component internals, W5 proposal semantics, or W7 emails. Every cross-workstream concern is a flagged assumption, not a decision.

---

## 23. Next steps

1. Eric reviews this brainstorm. Blocks before `/plan`.
2. On approval, `/plan` produces three files: `specs/W1-chat-home.md` (authoritative spec), `specs/W1-chat-home.plan.md` (tasks plus Plan Handoff Header), `specs/W1-chat-home.research.md` (external findings with citations). Every task tagged Claude Code or Codex per Section 6.
3. Before `/plan` emits the first task, it cross-reads W2's brainstorm (if present) to reconcile CA-1 through CA-14. If W2 has not brainstormed yet, `/plan` records assumptions and blocks on W2.

---

**End of W1 brainstorm.**

# W1: Agentic Chat Home Page (Specification)

**Milestone:** M3 Agentic Home (to be created in Linear)
**Workstream:** W1 Chat UI
**Phase:** Obra Superpowers /plan output (Phase 2), authoritative spec
**Author:** Claude Opus 4.7 (1M context)
**Date:** 2026-04-20
**Status:** Draft for Eric review. Reconciled against `specs/00-contracts.md` (authoritative cross-workstream contracts), `specs/W2-agent-backend.md`, and `specs/W3-generative-ui.md`.
**Writing convention:** No em-dashes. Colons, parentheses, semicolons, fresh sentences.

> **Reconciliation marker (2026-04-20):** This spec supersedes the initial W1 brainstorm's assumption D7 (streaming via `useUIMessages`). Per contracts §5.1, W2 locked the streaming source to reactive queries (`listMessages`, `listOpenProposals`, `proposals.get`). CA-1 is now a single HTTP action `POST /api/agent/send`, replacing the prior `startConversation` + `sendStreaming` action pair. CA-15 (undo), CA-16 (tool envelope), and CB-5 (ChatInteractionProvider) are new. Every CA-N and CB-N below carries an Authoritative Source citation so future reconciliations can diff cleanly.

> This spec is the authoritative target state for W1. Companion files: `specs/W1-chat-home.brainstorm.md` (exploration), `specs/W1-chat-home.plan.md` (tasks), `specs/W1-chat-home.research.md` (findings).
>
> **Hard boundary:** W1 delivers the chat UI layer only. The Convex Agent backend (W2), generative UI component library (W3), write-path mutations (W5), intelligence features (W6), and email kit (W7) are out of scope. Where W1 consumes a contract from another workstream, the contract appears as a CA-N or CB-N assumption in Section 14 and is referenced by every plan task that depends on it.

---

## 1. Goal

Replace the `/` route in `apps/app/src/app/(app)/` with an agentic chat surface. Keep every other user-facing route intact. Preserve the existing dashboard at a new path.

One-sentence description: turn `/` into a Convex Agent-driven chat that streams text, renders tool results through a generative UI registry, and confirms mutations inline, while relocating the old dashboard to `/overview`.

---

## 2. Architecture

Five layers, as defined by master prompt Section 4. W1 owns layer 1 only:

| Layer | Owner | W1 touches |
|---|---|---|
| Chat UI (Next.js, `apps/app`) | **W1** | All client components under `apps/app/src/components/chat/`; 3 route files; one sidebar file edit |
| Agent orchestration (`@convex-dev/agent`) | W2 | No; W1 consumes the `useSmoothText` client hook plus Convex query and HTTP action symbols |
| Tool layer | W2, W5 | No; W1 dispatches `tool-call` and `tool-result` parts |
| Plaid integration | W4 | No |
| Email and notification | W7 | No |

**Approach:** lean semantic port of the 12 chat components from `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/apps/app/src/components/chat/`. Drop features outside the MVP surface; add a small set of net-new UI pieces (banner, reconsent modal, tool-results registry stub). See brainstorm Section 4.

**Tech stack W1 uses:** Next.js 16 App Router, React 19, Tailwind 4, UntitledUI primitives from `@repo/ui`, `useSmoothText` from `@convex-dev/agent/react` (text smoothing only), `react-markdown` + `remark-gfm` + `rehype-raw`, Convex client hooks cached via `convex-helpers/react/cache/hooks`, native `fetch` against the Convex HTTP action at `/api/agent/send`.

> **Reconciled from brainstorm D7:** W1 does NOT use `useUIMessages` or `syncStreams` from `@convex-dev/agent/react`. Per `specs/00-contracts.md` §5.1, W2 locked the streaming source to a query-backed model: reactive `useQuery` against `api.agent.threads.listMessages`, `api.agent.proposals.listOpenProposals`, and `api.agent.proposals.get`. The only `@convex-dev/agent/react` primitive W1 consumes is `useSmoothText` for assistant typewriter animation on a plain string input.

---

## 3. Scope

### 3.1 In scope

- Replace `apps/app/src/app/(app)/page.tsx` with a chat surface.
- Add `apps/app/src/app/(app)/[threadId]/page.tsx` for active threads.
- Add `apps/app/src/app/(app)/overview/page.tsx` with the dashboard body.
- Add 12 ported chat components in `apps/app/src/components/chat/`.
- Add 5 net-new files in `apps/app/src/components/chat/`: `tool-results/index.ts`, `tool-results/ToolResultRenderer.tsx`, `tool-results/types.ts`, `ChatBanner.tsx`, `ReconsentModal.tsx`.
- Sidebar edits: Overview nav item, History nav item with nested threads, Threads + New chat command-menu section.
- Reserved-slug guard in `[threadId]/page.tsx`.
- Deep-link audit of `apps/app` + `apps/web`.
- New dependencies: `@convex-dev/agent`, `react-markdown`, `remark-gfm`, `rehype-raw`.

### 3.2 Out of scope

- Installing or configuring `@convex-dev/agent` backend (W2).
- Writing any Convex queries, mutations, or actions (W2).
- Building generative UI components beyond the registry stub (W3).
- Building `ProposalConfirmCard` body (W3).
- Writing tests beyond smoke (no test runner in `apps/app`; adding one is a flagged follow-up, not W1 scope).
- Any schema changes.
- Any Plaid, email, or intelligence work.
- Voice, rich text, file uploads, model selector, research mode (template features dropped for MVP).

### 3.3 Must not regress (from master prompt Section 3)

- Clerk auth flows.
- Existing Convex schema.
- Plaid component security properties.
- Existing `/credit-cards`, `/transactions`, `/wallets`, `/settings/**`, `/sign-in`, `/sign-up` routes.

---

## 4. User-facing target state

### 4.1 First page load (authenticated, no prior threads)

- Route `/`. `ChatView` renders `ChatHome` (no `threadId` yet).
- Centered SmartPockets logo and a headline reading: "Ask SmartPockets anything about your money."
- Single centered composer below the headline.
- Four suggestion chips:
  1. "What did I spend on groceries last month?"
  2. "Which deferred-interest promo expires first?"
  3. "Show my Chase Sapphire statement."
  4. "Mark all Amazon charges as Shopping."
- Sidebar: Home (active), Overview, History (empty, hidden), Credit Cards, Transactions, Wallets, Settings.

### 4.2 First turn

- User clicks a chip or types a prompt and presses Enter.
- Optimistic user bubble appears immediately with the prompt text. A "typing" assistant bubble appears below it.
- `ChatView` calls `fetch("/api/agent/send", { method: "POST", body: JSON.stringify({ prompt }) })` (CA-1). The endpoint schedules the agent turn and returns `{ threadId, messageId }` quickly.
- `ChatView` navigates to `/{threadId}` using Next's `router.push` as soon as `threadId` is returned.
- `MessageList` swaps the optimistic bubble for the real user message. It subscribes to `api.agent.threads.listMessages({ threadId })` via cached `useQuery` (CA-3) and re-renders as rows arrive. The assistant row has `isStreaming: true` while the agent turn writes; `useSmoothText` smooths the text field as it grows.
- If the assistant invokes a tool, a new `role: "tool"` row appears with `toolName` set and `toolCallsJson` populated; the row renders through `ToolResultRenderer` with `state: "input-streaming"`, typically a skeleton. When `toolResultJson` fills in, `state` flips to `"output-available"` and the registered component renders. If `toolName.startsWith("propose_")` or the row carries `proposalId`, `ProposalConfirmCard` renders via `proposalFallback` (W3 owns the body); it additionally subscribes to `api.agent.proposals.get({ proposalId })` (CA-3b) for live state.

### 4.3 Thread with prior context

- Route `/{threadId}`. `ChatView` renders with `initialThreadId` set.
- `MessageList` renders all prior messages in order with the same part-rendering rules.
- Scroll-to-end on thread load and on each new assistant message.
- Load-earlier link at the top when the paginated history exceeds the initial window.

### 4.4 Sidebar

- "Home" points at `/` and highlights for any path that matches `/` or `/[threadId]`.
- "Overview" points at `/overview` and highlights on `/overview`.
- "History" expands to show the user's threads (last 50 via CA-4). Hover a thread: dropdown with Rename and Delete.
- Command menu (Cmd+K) gains a Threads section: "New chat" (navigates to `/`), then the last 10 thread titles. Navigation and Settings sections remain.

### 4.5 Error surfaces

| Condition | Surface |
|---|---|
| Tool returns `error` in its part | Inline red card in the assistant bubble via `ToolCallDisplay` error branch |
| Rate limit | Sticky `ChatBanner` above input: "Slow down. Retry in Ns." |
| Monthly token budget exhausted | Sticky `ChatBanner`: "Monthly budget reached. Upgrade in Settings." with link |
| LLM provider down | Sticky `ChatBanner`: "Assistant is offline. Retrying..." |
| Plaid re-consent required | `ReconsentModal` with link to `/settings/institutions` |
| Network loss | Existing Sonner toast via `next-themes`-aware toaster |

### 4.6 Keyboard

| Keys | Action |
|---|---|
| `⌘K` | Command menu (with Threads section) |
| `Enter` | Send message |
| `Shift+Enter` | Newline in composer |
| `Esc` | Cancel focused proposal card (calls CA-10) |

`⌘/` stays unbound in MVP.

---

## 5. File tree

### 5.1 Before (verified current)

```
apps/app/src/app/(app)/
  layout.tsx                       unchanged
  page.tsx                         40-line dashboard composing 7 subcomponents
  dashboard/components/*           7 subcomponent files
  credit-cards/**
  transactions/**
  wallets/**
  settings/**
  sign-in/[[...sign-in]]/page.tsx
  sign-up/[[...sign-up]]/page.tsx

apps/app/src/components/application/dashboard-sidebar.tsx
apps/app/src/components/chat/      does not exist
```

### 5.2 After (W1 target)

```
apps/app/src/app/(app)/
  layout.tsx                       unchanged
  page.tsx                         client; renders <ChatView />
  [threadId]/page.tsx              async RSC; extracts params then renders <ChatView initialThreadId>
  overview/page.tsx                client; composes the 7 dashboard subcomponents
  dashboard/components/*           unchanged; imported from /overview
  credit-cards/**                  unchanged
  transactions/**                  unchanged
  wallets/**                       unchanged
  settings/**                      unchanged
  sign-in/[[...sign-in]]/page.tsx  unchanged
  sign-up/[[...sign-up]]/page.tsx  unchanged

apps/app/src/components/chat/
  ChatView.tsx
  ChatContainer.tsx
  ChatHome.tsx
  ChatInteractionContext.tsx    NEW (CB-5 provider + useChatInteraction hook)
  MessageList.tsx
  MessageBubble.tsx
  MessageInput.tsx
  MessageActionMinimal.tsx
  MessageActions.tsx
  MessageFailedState.tsx
  MarkdownContent.tsx
  ToolCallDisplay.tsx            Collapsible raw fallback for edge cases; most tool rendering goes through ToolResultRenderer
  ToolErrorRow.tsx               NEW (W1-owned; handles state="output-error" per CB-1)
  ThreadItem.tsx
  ChatErrorBoundary.tsx
  ChatBanner.tsx
  ReconsentModal.tsx
  tool-results/
    registry.ts                  NEW (W3 authoritative name per W3 §3.5; W1 ships stub)
    ToolResultRenderer.tsx
    types.ts

apps/app/src/components/application/dashboard-sidebar.tsx   MODIFIED
apps/app/scripts/verify-reserved-slugs.mjs                  NEW (mandatory lint rule per §6.3)
```

Total new files in `apps/app/src/components/chat/`: 19 (12 ported + 3 tool-results + 4 net-new: ChatBanner, ReconsentModal, ChatInteractionContext, ToolErrorRow). Plus 1 lint script. Total modified files: 1 (sidebar). Total new routes: 2 (`[threadId]`, `overview`). Total rewritten routes: 1 (`page.tsx`).

Two items supersede the prior spec: `tool-results/index.ts` is renamed to `tool-results/registry.ts` to match W3 §3.5 authoritative naming; `ToolCallDisplay` is no longer the canonical error surface (that role moves to `ToolErrorRow`).

---

## 6. Routing and reserved slugs

### 6.1 Route shape

- `/` mounts `ChatView` with no `initialThreadId`. Equivalent to "new chat".
- `/[threadId]` mounts `ChatView` with `initialThreadId={params.threadId}`.
- `/overview` mounts the relocated dashboard.
- All pre-existing routes (`/credit-cards`, `/transactions`, `/wallets`, `/settings/**`, `/sign-in`, `/sign-up`) stay.

### 6.2 Reserved slug guard

Every first-segment slug that exists (or will exist) as a top-level route must be excluded from the `[threadId]` match so that navigating to `/overview` never interprets "overview" as a thread ID.

**Implementation requirement** (code belongs in plan task T-2.2):

- Define a constant `RESERVED_SLUGS` in `[threadId]/page.tsx`:
  - `overview`, `credit-cards`, `transactions`, `wallets`, `settings`, `sign-in`, `sign-up`, `dev`.
- `dev` is reserved for W3's preview harness at `/dev/tool-results` per `specs/00-contracts.md` §1.4.
- Define `isThreadIdShaped(slug)` that matches the Convex Ents ID format for `agentThreads` (`Id<"agentThreads">`). Per `specs/00-contracts.md` §1.3, the route param value is the Ents ID, not the opaque `componentThreadId` from `@convex-dev/agent`. Regex confirmed in plan task T-0.3.
- If `RESERVED_SLUGS.has(params.threadId)` or `!isThreadIdShaped(params.threadId)`, call `notFound()`.

### 6.3 Adding new top-level routes

When a future workstream adds a new top-level route, it must append that segment to `RESERVED_SLUGS`. A mandatory lint rule scans `apps/app/src/app/(app)/*/page.tsx` and asserts the directory names equal the `RESERVED_SLUGS` set (excluding grouped routes `sign-in`, `sign-up`, and the `[threadId]` catch-all). Ships as plan task T-6.2. Upgraded from optional to required per `specs/00-contracts.md` §1.4.

---

## 7. Streaming UX state machine

Reconciled against `specs/00-contracts.md` §5.1: reactive queries, not streaming hooks. Each `agentMessages` row is discrete; `isStreaming: true` while the turn writes, `false` on completion. W1 transitions on row arrival and field updates, not on a streaming protocol.

```
idle
  | user submits prompt (chip click or Enter)
  v
optimistic-sending              ChatView sets optimisticPrompt; ChatHome unmounts; MessageList shows optimistic user bubble + typing indicator
  | fetch POST /api/agent/send returns { threadId, messageId } (CA-1)
  v
navigated                       router.push(`/${threadId}`); listMessages query subscribes; first row lands (the user message matching optimisticPrompt); optimistic state clears
  | assistant row appears with isStreaming=true; useSmoothText reveals row.text
  v
streaming                       assistant row's text field grows reactively; ToolResultRenderer ready for any role=tool row
  |                            \
  | role=tool row, toolCallsJson set, toolResultJson empty  \ assistant row flips isStreaming=false
  v                                                           v
streaming+tool-pending          ready                      next prompt restarts at idle
  | role=tool row gains toolResultJson                     |
  v                                                         |
streaming+tool-done                                         |
  | (more assistant text, next tool cycle, or completion)
  v
(back to streaming until row.isStreaming === false)

Failure:
  assistant row has text and error (or dedicated system row with AgentError.kind)
     -> MessageFailedState visible on assistant bubble; Retry calls /api/agent/send with the previous user prompt

Proposal branch (role=tool row with proposalId set, or toolName.startsWith("propose_")):
  row renders via ToolResultRenderer with state = "output-available"
     -> ToolResultRenderer selects ProposalConfirmCard (W3 owns; registered as proposalFallback)
     -> ProposalConfirmCard subscribes to api.agent.proposals.get({ proposalId }) for live state (CA-3b)
  Confirm click  -> onConfirm() calls CA-9 confirmProposal({ proposalId })
  Cancel click   -> onCancel() calls CA-10 cancelProposal({ proposalId })
  Esc while card focused  -> same as Cancel
  State sequence rendered by ProposalConfirmCard:
    awaiting_confirmation -> executing -> executed (with undo window) -> [reverted | collapsed after window]
    awaiting_confirmation -> cancelled | timed_out (no further actions)
    executing -> failed (errorSummary visible)
  Undo click (state=executed, within undoExpiresAt) -> onUndo(reversalToken) calls CA-15 api.agent.proposals.undo({ reversalToken })
```

**W1 reconstructs "parts" client-side from flat `agentMessages` rows.** Message grouping rule: a contiguous run of `role: "assistant"` followed by zero or more `role: "tool"` rows within the same `agentThreadId` forms a single visual "turn" bubble. The assistant text sits at the top; each tool row renders below it via `ToolResultRenderer`. New assistant text after tool rows starts a new bubble.

---

## 8. Error handling inventory

Reconciled from `specs/00-contracts.md` §6: the authoritative typed `AgentError` discriminated union has 7 `kind` values. W1 surfaces each at the right level (banner, modal, inline row, or card state).

```ts
type AgentError =
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "budget_exhausted"; reason: string }
  | { kind: "llm_down" }
  | { kind: "reconsent_required"; plaidItemId: string }
  | { kind: "first_turn_guard" }
  | { kind: "proposal_timed_out" }
  | { kind: "proposal_invalid_state" };
```

Routing matrix:

| Error kind | Source | Surface | Component |
|---|---|---|---|
| `rate_limited` | HTTP 429 response from `/api/agent/send` | Banner above input | `ChatBanner variant="rate_limited" retryAfterSeconds={n}` |
| `budget_exhausted` | HTTP 429 response from `/api/agent/send` | Banner with `/settings/billing` link | `ChatBanner variant="budget_exhausted"` |
| `llm_down` | System row emitted by W2 during provider outage (per W2 §15.2 / §17.2) | Banner | `ChatBanner variant="llm_down"` |
| `reconsent_required` | Tool-result error from any Plaid-dependent read tool | Modal with `/settings/institutions` link | `ReconsentModal plaidItemId={id}` |
| `first_turn_guard` | Tool-result error when the agent attempts a write on turn 0 (per W5 first-turn rule) | Inline error row in the assistant bubble | `ToolErrorRow` (W1-owned; passes `errorText`) |
| `proposal_timed_out` | `agentProposals.state === "timed_out"` on the row subscription | Card state (not a banner) | `ProposalConfirmCard state="timed_out"` (W3-owned) |
| `proposal_invalid_state` | Client attempted confirm or cancel in the wrong state | Transient toast; card state re-renders from the fresh subscription | Sonner toast + next render of `ProposalConfirmCard` |
| Generic tool-call error | Tool-result row with `error` string | Red card in bubble | `ToolErrorRow` (handles any `state === "output-error"`) |
| Network / auth loss | Convex client | Toast | Existing Sonner |

W1 components:
- `ChatBanner` with 3 variants (`rate_limited`, `budget_exhausted`, `llm_down`). Dismissible. Variant-specific props (`retryAfterSeconds`, `reason`).
- `ReconsentModal` with `plaidItemId` and `onDismiss`.
- `ToolErrorRow` replaces the prior `ToolCallDisplay` error branch as the canonical inline error surface. Consumes `{ toolName, errorText }`. Rendered by `ToolResultRenderer` when `state === "output-error"`.

Copy drafts in plan task T-5.1 through T-5.3.

---

## 9. SSR / RSC split

| File | Render mode | Reason |
|---|---|---|
| `apps/app/src/app/(app)/layout.tsx` | Client | Existing; `useConvexAuth`, `useMutation`, `useQuery`, `useEffect` |
| `apps/app/src/app/(app)/page.tsx` | Client (`"use client"`) | Renders `<ChatView />` which uses Convex hooks |
| `apps/app/src/app/(app)/[threadId]/page.tsx` | Async RSC shell, hands to client `<ChatView initialThreadId>` | Template parity; Next's typed `params` is async |
| `apps/app/src/app/(app)/overview/page.tsx` | Client | Dashboard subcomponents use Convex hooks |

No Next.js API routes are introduced (master prompt Section 13 guardrail). The chat send path targets the Convex-owned HTTP action `POST /api/agent/send` via `fetch`. Reactive subscriptions use Convex queries via the client SDK. `ChatInteractionProvider` (W1-owned; details in Section 14.2 CB-5) wraps the chat subtree and exposes `{ sendMessage, confirmProposal, cancelProposal, undoMutation }` so W3 components have a single injection point for user actions that originate in their UI.

---

## 10. Deep link and copy audit

Scope executed in plan task T-4.3:

1. Grep `apps/app` and `apps/web` for `href="/"`, `Link.*href="/"`, `router.push("/")`, `redirect("/")`, `<a href="/">`, and label strings "Dashboard". Update label-only hits to "Home". Update intent-level hits (anywhere that means "the dashboard") to `/overview`.
2. Grep `packages/email/emails/` for `/` in `href` usages. W0 Section 15.4 says only 4 templates are actively triggered and none are dashboard pointers. Confirm.
3. Confirm `apps/web` landing page CTA ("Get started", "Sign in", etc.) points at auth, not dashboard. W0 Section 12.4 notes CTA wiring.

Expected: zero functional redirects needed; the relocation is label-only.

---

## 11. Dependencies

### 11.1 New in `apps/app/package.json`

| Package | Target version | Reason |
|---|---|---|
| `@convex-dev/agent` | `^0.3.2` (final pin set by W2) | `useSmoothText` only. `useUIMessages` is NOT used. |
| `react-markdown` | `^10.1.0` | Assistant text rendering |
| `remark-gfm` | `^4.0.1` | GFM tables in markdown |
| `rehype-raw` | `^7.0.0` | Raw HTML allowlist (W1 sanitizes before; see §12) |

### 11.2 Present and reused

`convex`, `convex-helpers`, `@clerk/nextjs`, `tailwindcss`, `next`, `react`, `react-dom`, `next-themes`, `zod`. Motion, react-aria, react-aria-components, sonner, UntitledUI primitives accessed via `@repo/ui`.

### 11.3 Not added

`@ai-sdk/anthropic`, `@ai-sdk/react`, `ai` (Vercel AI SDK), TipTap, input-otp, qr-code-styling, embla-carousel-react, `react-hotkeys-hook`. W1 does not need them; W2 decides about AI SDK on its own timeline.

---

## 12. Security requirements

| Requirement | Enforcement |
|---|---|
| Every Convex call uses the authenticated viewer | W2 owns via `assertThreadAccess` (CA-11); W1 never sends `userId` as an arg |
| Markdown rendering does not execute injected HTML | W1 strips `<script>`, `<iframe>`, `on*=` attributes in `MarkdownContent` before `rehype-raw` parses; plan task T-3.3 |
| Tool-result payloads never leak other users' IDs to the UI | W2 owns query scoping; W1 simply renders what comes back |
| Proposal confirm does not execute until the user clicks Confirm | W1 mutates only on button click, not on card mount |
| Escape key on proposal card cancels, not confirms | W1 binds Esc to CA-10, not CA-9 |
| Reserved slug guard prevents unauthorized access to other user's threads via URL typing | `isThreadIdShaped` regex plus backend ownership check (CA-11) |

W1 does not handle JWE, webhook signatures, or circuit breakers; those live in W2 and W4.

---

## 13. Accessibility and performance requirements

### 13.1 Accessibility

- Chat input composer is a proper `<textarea>` with `aria-label="Send a message"`.
- Messages list uses `role="log"` with `aria-live="polite"` so screen readers announce new assistant text.
- Proposal cards use `role="group"` with a focus-trap boundary; `Esc` reads as "Cancel proposal" via `aria-keyshortcuts`.
- Command menu keyboard nav: already handled by UntitledUI's `CommandMenu` primitive.
- Thread item hover actions (rename, delete) reachable via keyboard (dropdown triggers expose `aria-haspopup`).
- Color contrast: all text within the chat view meets WCAG AA (verified against SmartPockets tokens).
- Motion-reduce: `useSmoothText` respects `prefers-reduced-motion` if the library supports it; if not, fallback to instant text reveal (plan task T-3.4 confirms).

### 13.2 Performance

- Thread list in sidebar uses cached `useQuery` from `convex-helpers/react/cache/hooks`.
- Initial paint of `/` is a static empty state (no queries on first render before thread selection).
- Cached `useQuery` against `api.agent.threads.listMessages` fires only when `threadId` is present; `"skip"` argument suppresses the query otherwise.
- Markdown renders synchronously (react-markdown is fast); avoid wrapping in `<Suspense>` unless profiling shows a need.
- Tool-result components are code-split only if bundle size demands (W3 decides per component).
- No unnecessary re-renders: React Compiler handles memoization automatically; do not add `useMemo` or `useCallback` except where the compiler cannot reach (e.g., event handlers that create new objects).

---

## 14. W2 and W3 contract assumptions

Every Convex symbol and registry contract W1 depends on is listed below. **Reconciled against `specs/00-contracts.md` (the authoritative cross-workstream doc), W2's `specs/W2-agent-backend.md`, and W3's `specs/W3-generative-ui.md`.** The plan file has one task per contract that verifies the shape against W2 or W3 before code lands.

### 14.1 W2 contracts (CA-N)

| # | Symbol / contract | W1 expectation | Authoritative source |
|---|---|---|---|
| CA-0 | Convex backend files import from `./functions`, not `./_generated/server` | AGENTS.md rule; W2 honours; W1 never writes Convex code | AGENTS.md |
| CA-1 | `POST /api/agent/send` (Convex HTTP action; NOT a Convex action) | Request `{ threadId?: Id<"agentThreads">, prompt: string }`. Response 200 `{ threadId, messageId }`; 401 Unauthorized; 429 `{ error: "budget_exhausted"|"rate_limited", reason, retryAfterSeconds? }`; 400 validation; 500 unhandled. W1 calls with native `fetch`. Supersedes the former CA-1 / CA-2 pair. | contracts §5; W2 §7 |
| CA-2 | (removed) | Subsumed by CA-1; the single HTTP endpoint handles both new-thread and existing-thread sends by checking whether `threadId` is present. | contracts §5 |
| CA-3 | `api.agent.threads.listMessages({ threadId })` reactive query | Returns `Array<agentMessages>` ordered by `createdAt` asc. Viewer-scoped via `assertThreadAccess`. W1 subscribes via cached `useQuery` from `convex-helpers/react/cache/hooks`. No pagination in MVP; W2's initial window is "all messages for this thread" (bounded by compaction per W2 §9.3). | contracts §5.1; W2 §7 |
| CA-3a | `api.agent.proposals.listOpenProposals({ threadId })` reactive query | Returns `Array<agentProposals>` filtered to states that W3 renders (`awaiting_confirmation`, `executing`, `executed` within undo window). W1 does not render this list directly; `MessageList` uses it to decide whether a proposal inline in the stream has since transitioned. | contracts §5.1 |
| CA-3b | `api.agent.proposals.get({ proposalId })` reactive query | Returns a single `agentProposals` row. `ProposalConfirmCard` subscribes directly from inside its body (W3-owned); W1 passes `proposalId` down through `ToolResultRenderer` props. | contracts §5.1 |
| CA-4 | `api.agent.threads.listForUser` | `query() → Array<{ threadId: Id<"agentThreads">, title, summary?, updatedAt }>`, viewer-scoped, archived excluded. Used by sidebar History and command menu Threads section. | contracts §5.1; W2 §4.1 |
| CA-5 | `api.agent.threads.renameThread` | `mutation({ threadId, title }) → null`, owner-checked | W2 §4.1 |
| CA-6 | `api.agent.threads.deleteThread` | `mutation({ threadId }) → null`, soft-deletes (archive state) | W2 §4.1 |
| CA-7 | `agentMessages` row schema | Flat rows (NOT UIMessage parts). Fields: `role: "user"|"assistant"|"system"|"tool"`, `text?`, `toolCallsJson?`, `toolName?`, `toolResultJson?`, `proposalId?: Id<"agentProposals">`, `tokensIn?`, `tokensOut?`, `modelId?`, `createdAt`, `isStreaming: boolean`. W1 reconstructs "parts" client-side by grouping consecutive rows; see §7. | contracts §1.5; W2 §4.2 |
| CA-8 | Proposal message convention | A proposal surfaces as a `role: "tool"` row with `toolName.startsWith("propose_")` (or `toolName === "get_proposal"`), `proposalId` set, and `toolResultJson` deserializing to `ProposalToolOutput { proposalId, scope: "single"\|"bulk", summary, sample, affectedCount }`. | contracts §1.6, §4; W2 §4.2, §4.3 |
| CA-9 | `api.agent.proposals.confirm` | `mutation({ proposalId }) → { executed: boolean, reversalToken?: string }`. `reversalToken` is `rev_<base32 of auditLogId>` per contracts §7. | contracts §3, §7; W2 §12.2 |
| CA-10 | `api.agent.proposals.cancel` | `mutation({ proposalId }) → { cancelled: boolean }` | contracts §3; W2 §12.2 |
| CA-11 | Thread ownership check | Every W2 thread-scoped query and HTTP action verifies `thread.userId === viewerX()._id`. W1 relies on the guardrail; does not duplicate. | contracts §5.1; W2 §7.3 |
| CA-12 | Typed error codes | `AgentError` union has 7 kinds: `rate_limited`, `budget_exhausted`, `llm_down`, `reconsent_required`, `first_turn_guard`, `proposal_timed_out`, `proposal_invalid_state`. W1 §8 maps each to a surface. | contracts §6 |
| CA-13 | Route param type | `/[threadId]` param is `Id<"agentThreads">` (Convex Ents ID; base32-with-prefix format). NOT the opaque `componentThreadId` from `@convex-dev/agent`. The Ents ID shape cannot collide with any `RESERVED_SLUGS` entry. | contracts §1.3 |
| CA-14 | Cached `useQuery` safety | All reactive queries W1 subscribes to return stable shapes (no `Date.now()` in return); safe for `convex-helpers` cache. | AGENTS.md; contracts §5.1 |
| CA-15 | `api.agent.proposals.undo` | `mutation({ reversalToken: string }) → { reverted: boolean }`. Invoked by `ProposalConfirmCard` via the `onUndo` prop that W1 wires. New in the reconciled plan per W3 CR-3 and contracts §7. | W3 §9.2 CR-3; contracts §7 |
| CA-16 | Tool envelope and output shape | `ToolEnvelope<T>` wraps every tool result in `{ ok: true, data: T, meta }` or `{ ok: false, error }`. W2's `buildToolsForAgent` unwraps `ok: true` before the result reaches the message stream, so W1 components consume the unwrapped `T` (either `ToolOutput<TPreview>` for read tools or `ProposalToolOutput` for propose tools). W1 never handles `ok` directly. | contracts §4; W3 §3.3 |

Each plan task referencing a CA cites the number in its acceptance checklist.

### 14.2 W3 contracts (CB-N)

| # | Symbol / contract | W1 expectation | Authoritative source |
|---|---|---|---|
| CB-1 | `ToolResultRenderer` component | W1 ships the dispatcher. Props per W3 §3.4 `ToolResultComponentProps`: `{ toolName, input, output, state: "input-streaming"|"input-available"|"output-available"|"output-error", errorText?, proposalId?, threadId: Id<"agentThreads"> }`. Dispatch: registry hit → `registry[toolName].Component`; `toolName.startsWith("propose_")` or `toolName === "get_proposal"` → `proposalFallback`; `state === "input-streaming"` → `registry[toolName].Skeleton` or shared skeleton; `state === "output-error"` → `ToolErrorRow`; miss → `RawTextMessage` fallback (W3-owned). | W3 §3.4 |
| CB-2 | Registry shape | `apps/app/src/components/chat/tool-results/registry.ts` exports `toolResultRegistry: Record<ToolName, { Component, Skeleton?, variant? }>` plus a separate `proposalFallback: FC<...>` export. `get_proposal` is registered in the map (not just in the prefix branch). W3 populates all 14 read tools plus `get_proposal`; W1 ships the stub that W3 replaces. | W3 §3.5 |
| CB-3 | `ProposalConfirmCard` props | W3 owns the body. W1's wiring supplies: `{ proposalId, summary, diff: ProposalDiff, scope: "single"\|"bulk", state: "awaiting_confirmation"\|"executing"\|"executed"\|"cancelled"\|"timed_out"\|"reverted"\|"failed", onConfirm, onCancel, onUndo, executedAt?, undoExpiresAt?, reversalToken?, errorSummary? }`. Card subscribes to CA-3b internally. | W3 §3.7 |
| CB-4 | Theming | W3 components inherit UntitledUI tokens; W1 provides no style overrides. | W3 §7.1 |
| CB-5 | `ChatInteractionProvider` + `useChatInteraction()` | W1 exports a context provider at `apps/app/src/components/chat/ChatInteractionContext.tsx` that wraps the chat subtree and exposes `{ sendMessage(prompt, options?), confirmProposal(proposalId), cancelProposal(proposalId), undoMutation(reversalToken) }`. W3 drill-ins and card actions call `useChatInteraction()` instead of receiving individual callbacks as props. Optional `options.toolHint: { tool, args }` on `sendMessage` is wired through to a future W2 extension (W3 CR-1); W1 forwards it as a request metadata field on `/api/agent/send`. | W3 §9.2 CR-4; W3 §3.6 |

---

## 15. Acceptance criteria

W1 is complete when all of the following hold simultaneously. Each is verified in plan task T-6.

| # | Check | Evidence |
|---|---|---|
| A1 | Navigating to `/` renders the chat surface (hero, composer, 4 chips). No dashboard visible. | Manual smoke on `bun dev:app`; screenshot attached to Linear |
| A2 | Navigating to `/overview` renders all 7 dashboard subcomponents with live data. | Manual smoke |
| A3 | The 7 dashboard subcomponents in `apps/app/src/app/(app)/dashboard/components/` are unchanged. | `git diff` shows no edits to those files |
| A4 | Sidebar contains: Home, Overview, History (empty-state tolerant), Credit Cards, Transactions, Wallets, Settings. | Manual smoke |
| A5 | Command menu (Cmd+K) exposes a Threads section with "New chat" and up to 10 threads. | Manual smoke after creating a thread |
| A6 | A prompt at `/` issues `POST /api/agent/send` (CA-1), receives `{ threadId, messageId }`, navigates to `/{threadId}`, and shows streaming via reactive `listMessages` query. | Manual smoke against W2's live backend |
| A7 | Tool rows render through `ToolResultRenderer` (CB-1). Input-streaming rows show the registered `Skeleton` (CB-2). Output-available rows show the registered `Component`. Output-error rows show `ToolErrorRow`. Unknown tool names fall back to `RawTextMessage`. | Manual smoke with any tool from W2's read set |
| A8 | Proposal rows (toolName `propose_*` or `get_proposal`) render `ProposalConfirmCard` via `proposalFallback`. Confirm triggers CA-9. Cancel or Esc triggers CA-10. Undo within window triggers CA-15. | Manual smoke after W3 ships `ProposalConfirmCard` body; gated on W5 delivering a propose tool |
| A9 | Reserved slugs (`overview`, `credit-cards`, `transactions`, `wallets`, `settings`, `sign-in`, `sign-up`, `dev`) at `/{slug}` return 404, not chat. | Manual test per slug |
| A10 | Unreserved but malformed slug (e.g. `/not-a-thread-id`) returns 404. | Manual test |
| A11 | `ChatBanner` renders for `rate_limited`, `budget_exhausted`, `llm_down` with correct copy and link. | Dev toggle in plan task T-5.3 |
| A12 | `ReconsentModal` renders with the correct Plaid item ID and links to `/settings/institutions`. | Dev toggle |
| A13 | `bun typecheck` passes at the root. | CI |
| A14 | `bun build` succeeds for `@repo/app`. | CI |
| A15 | `bun lint` passes. | CI |
| A16 | CodeRabbit review is clean on every PR in the W1 stack. | PR UI |
| A17 | Cross-agent review completed (Claude Code reviews Codex output or vice versa). | PR comment |
| A18 | No em-dashes introduced anywhere in code, comments, PR descriptions, or commit messages. | `git diff` scan |
| A19 | `ChatInteractionProvider` wraps the chat subtree; `useChatInteraction()` exposes `sendMessage`, `confirmProposal`, `cancelProposal`, `undoMutation` to W3 components. | Smoke test via a registered W3 component that invokes a drill-in |
| A20 | `MessageList` subscribes to `api.agent.threads.listMessages`; no usage of `useUIMessages` anywhere. | `grep -r "useUIMessages" apps/app` returns zero |
| A21 | `tool-results/registry.ts` exists (not `tool-results/index.ts`); W1 ships it as a stub; W3's bodies replace it without a file rename. | File inventory check |
| A22 | `apps/app/scripts/verify-reserved-slugs.mjs` runs in CI and fails when a new `(app)` route is added without updating `RESERVED_SLUGS`. | CI workflow verified with a deliberate-fail test |
| A23 | `ToolErrorRow` handles every `state === "output-error"` tool row. `ToolCallDisplay` is never the canonical error surface. | Code review |

---

## 16. Rollback plan

Because the Graphite stack for W1 is 6 PRs layered on top of `main`, rolling back means reverting the stack head and any merged descendants. The relocated dashboard at `/overview` persists across rollback (it is a net-new file), so even a full rollback to pre-W1 leaves the dashboard reachable at both `/` (restored) and `/overview` (still present). Post-rollback cleanup optional: remove `/overview` if not wanted.

Partial rollback: the bottom of the stack (dashboard relocation) is independent of chat work and rarely needs to be reverted. The top of the stack (agent integration) is the most likely revert candidate if W2 ships an incompatible contract.

---

## 17. Questions this spec answered

Mapped 1-to-1 to the questions list in master prompt Section 8 W1:

| Master prompt question | Answered in |
|---|---|
| 1. Exact file tree before and after, including every moved file. | Section 5 |
| 2. AI SDK version, hook name, streaming protocol. | Section 2, 7; research Section 1.4; brainstorm D7 (documented deviation from literal AI SDK to `@convex-dev/agent/react`) |
| 3. How tool-call streaming works: placeholder rendering, transition to final component, error transitions. | Section 7, 8 |
| 4. Confirmation card contract: what `ProposalConfirmCard` receives, how Confirm and Cancel propagate. | Section 14.2 (CB-3), Section 7 (state machine), Section 14.1 (CA-9, CA-10) |
| 5. Keyboard shortcut map and how it avoids conflicts with UntitledUI components. | Section 4.6, brainstorm D6 |
| 6. How deep links to old home content redirect. | Section 10 |
| 7. Integration with existing Clerk user menu and theme provider. | Section 9 (layout unchanged), Section 13.1 (accessibility), research Section 2.1, 2.6 |
| 8. SSR/RSC split. | Section 9 |

---

## 18. Open follow-ups (out of W1 scope)

- Add a test runner (Vitest + React Testing Library) to `apps/app` to enable component smoke tests. Not W1 scope.
- Reserved-slug lint rule that validates `(app)/*/page.tsx` directories against `RESERVED_SLUGS`. Optional; plan task T-6.2.
- Mobile soft keyboard tuning on iOS Safari. Plan task T-6.3 covers manual QA; iteration as needed.
- Thread list pagination beyond 50. Defer to post-alpha telemetry (M4 follow-up).
- Conversation title auto-generation retry UX. W2 owns; W1 displays whatever title comes back.

---

**End of W1 spec.**

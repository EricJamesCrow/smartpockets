---
linear: CROWDEV-329
title: Agentic chat UI/UX polish pass — MVP-grade
date: 2026-04-30
status: draft
parent_issue: CROWDEV-329
---

# Agentic chat UI/UX polish pass — MVP-grade

Spec for a two-week polish pass on the SmartPockets agentic chat. Addresses Linear issue [CROWDEV-329](https://linear.app/crowdevelopment/issue/CROWDEV-329).

## 1. Goal & bar

Bring the chat from "functional, decently themed" to **demo-able to a friend without apologizing** — portfolio-centerpiece grade. Calm, consistent, complete-feeling. Not perfectionist.

Aesthetic neighbors, in order of dominance:
- **Linear's Asks/AI** — productivity-app aesthetic, motion discipline, density-without-clutter. Closest match for SmartPockets.
- **Claude.ai** — chat-shape patterns: collapsed tool calls, code-block treatment, hover-revealed actions, conversation history grouped by time.
- **Cursor** — inline tool-call disclosure, density without clutter.
- **Raycast** — input snappiness, crisp auto-resize.
- **Monarch / Copilot** — restraint, transition durations (~150–250ms), surrounding-shell coherence.

The chat shares a route with the rest of the app (`(app)` route group); a flashy chat next to a calm app reads worse than a consistent merely-good one.

## 2. Scope

### In scope
- All of `apps/app/src/components/chat/` and its `tool-results/` subtree
- `apps/app/src/components/application/dashboard-sidebar.tsx` (chat-history slot only — not the whole sidebar)
- `apps/app/src/components/chat/MarkdownContent.tsx` and a new `CodeBlock` component
- `ChatHome` empty state
- Selective additions to `packages/backend/convex/agent/threads.ts` only if the stop-button (A3) backend prereq is missing — probed in PR 1
- One-time install + selective integration of `reactbits`
- New shared CSS motion tokens (`--sp-motion-fast/base/slow`, `--sp-ease-productive`)

### Out of scope (flagged, not touched)
- The external MCP server at `apps/app/src/lib/mcp/` and `apps/app/src/app/api/mcp/route.ts`. This is the Claude-Desktop-and-friends external endpoint; it is **not** chat-UI plumbing. The CROWDEV-329 prompt's mention of it for chat plumbing is a misread we surface here per its own "surface conflicts" instruction.
- `@convex-dev/agent` internals (system prompt, tool registry, RAG, rate limits, budgets, compaction) — public API only.
- AI SDK migration — `useSmoothText` from `@convex-dev/agent/react` is already doing the streaming-smoothness work the prompt asked about. No need to migrate.
- New agent tools, expansion of the existing tool surface, or backend behavior changes beyond the optional A3 prereq.
- All J1–J6 deferrals (conversation search, share, token usage, voice, attachments, custom prompts) — see §13.

### Conflicts surfaced from the issue prompt
1. **Tool surface mismatch.** The prompt names 4 tools (`list_credit_cards`, `get_credit_card`, `get_credit_card_stats`, `list_transactions`); the chat actually surfaces ~18 agent tools including proposals (`propose_*`), reminders, deferred-interest promos, installment plans, accounts, and charts. Audit covers the full surface; sequencing covers the full surface.
2. **MCP path mislabel.** The prompt asks for an end-to-end read of `apps/app/src/lib/mcp/` as part of chat plumbing. That directory is the external MCP server. Chat plumbing is `ChatInteractionContext` → `.convex.site/api/agent/send` HTTP action → Convex `agent` module at `packages/backend/convex/agent/`.
3. **API-route rule.** `AGENTS.md` and the prompt both say "no Next.js API routes." `apps/app/src/app/api/mcp/route.ts` exists. It is the external MCP server endpoint, not chat plumbing — this spec leaves it alone and recommends a separate evaluation if the team wants to port it to a Convex HTTP action.

### Done means
P0 + all P1s shipped. P2 items deferred with clear post-launch tags. A multi-turn conversation across credit-card, transaction, proposal, and chart tools streams smoothly, surfaces tool calls cleanly, recovers from errors gracefully, and feels native to SmartPockets in **dark mode (primary) and light mode (parity)**, on desktop and mobile.

## 3. Architecture orientation (current state)

### Streaming model
- Chat sends to a Convex HTTP action at `<deployment>.convex.site/api/agent/send` (NOT a Next.js API route).
- Streaming flows back via Convex reactivity: `useQuery(api.agent.threads.listMessages, { threadId })` re-renders as `agentMessages` rows update.
- Per-message smooth tokens via `useSmoothText` from `@convex-dev/agent/react` inside `MessageBubble`.
- Optimistic prompt is hand-managed in `MessageList` as a parallel render path (current source of the visual flicker on send — see audit §5.4).

### Routing
- `/` (in `(app)/page.tsx`) renders `<ChatView />` — new chat, no `threadId`.
- `/[threadId]` (in `(app)/[threadId]/page.tsx`) renders `<ChatView initialThreadId={threadId} />`.
- The `(app)` route group is wrapped by `DashboardSidebar` which already queries `api.agent.threads.listForUser` and renders thread links — sidebar history exists, just under-polished.

### Tool result rendering
- Dispatcher: `tool-results/ToolResultRenderer.tsx`.
- Registry: `tool-results/registry.tsx` (per-tool components keyed by `ToolName`).
- Generic fallback: `chat/ToolCallDisplay.tsx` (currently bare — see audit §5.2).
- Proposal fallback: `proposalFallback` in registry.
- Error fallback: `chat/ToolErrorRow.tsx`.
- Per-tool components live under `tool-results/{accounts, charts, credit-cards, promos, proposals, reminders, transactions}/` with skeletons.
- Fixture harness at `apps/app/src/app/(app)/dev/tool-results/` for previewing components in isolation — used for verification.

### Deps already installed
- `@convex-dev/agent ^0.3.2` — drives streaming, threads, agent runtime
- `motion ^12` (framer-motion) — used in `packages/ui`
- `react-markdown ^10`, `remark-gfm ^4`
- **NOT** installed: `@ai-sdk/*` (not needed), `reactbits` (will install in PR 1), `rehype-highlight` / `shiki` (decided in PR 1)

## 4. Audit (current state, by category)

Mapped to the 14 categories from the issue prompt. Each: (a) what exists, (b) what's missing or weak, (c) closest reference pattern.

### 4.1 Streaming behavior
- **(a) Exists:** `useSmoothText` per-message renders smooth tokens. Convex reactivity feeds messages.
- **(b) Missing/weak:** No streaming cursor / tail. Container expands fine. No `aria-busy="true"` on the log during stream.
- **(c) Reference:** Claude.ai's calm tail cursor; not Cursor's typewriter (too marketing-feel for this app).

### 4.2 Tool call display
- **(a) Exists:** `ToolCallDisplay` collapsed-by-default with chevron, generic `Settings01` icon, status icon (spinner/check/x). Rich tool components per tool with skeletons during input-streaming.
- **(b) Missing/weak:** Generic fallback uses `Settings01` for all tools; no per-tool icon. Collapsed view shows only tool name + status — no inline summary preview ("4 cards", "$425 spent on groceries"). Expanded view dumps `JSON.stringify(input, null, 2)` and `JSON.stringify(output, null, 2)` in `<pre>` — no copy buttons, no key collapse, no monospace polish. No subtle entrance when result lands.
- **(c) Reference:** Claude.ai's collapsed-with-summary pattern; Cursor's progressive disclosure (running → result, with running summary visible).

### 4.3 Message states
- **(a) Exists:** User vs. assistant differentiation by bubble color and side. Streaming flag drives `useSmoothText`. Error states route through banner/modal/inline. `MessageActions` only show when `!isStreaming`.
- **(b) Missing/weak:** No stop-during-streaming affordance. The optimistic-prompt code path renders a parallel user bubble + thinking-dots loader (lines 73–104 of `MessageList.tsx`), causing visual flicker between optimistic and reactive renders. No explicit "completed-with-actions" hover state beyond opacity transition.
- **(c) Reference:** Claude.ai stop button placement (replaces send while streaming); Linear's restrained entrance/transition timing.

### 4.4 Input affordances
- **(a) Exists:** Auto-resize textarea (max 200px), Enter to send, Shift+Enter for newline, send button disabled when empty/loading, hover scale on send button.
- **(b) Missing/weak:** No Cmd/Ctrl+Enter alt-submit. No Esc handling (clear-then-blur). No autofocus return after send. Send button is 36px (under 44px touch-target). No stop-button mode while streaming.
- **(c) Reference:** Raycast input snappiness; Claude.ai's stop affordance.

### 4.5 Conversation management
- **(a) Exists:** Sidebar already queries `listForUser` and renders thread links. Backend has `renameThread`, `deleteThread` mutations. Command-menu integration for first 10 threads. New-chat link.
- **(b) Missing/weak:** No time grouping (Today / Yesterday / Last 7 days / Last 30 / Older). No rename UI surfaced in the sidebar (only backend mutation). No delete UI surfaced in the sidebar. Active-thread highlight may pass through `DashboardSidebar`'s existing nav-item selection styling — needs explicit verification in PR 7 and tuning if not visually distinct enough for the chat surface. Orphaned `ThreadItem.tsx` (12-line stub, unused).
- **(c) Reference:** Claude.ai sidebar grouping by recency.

### 4.6 Empty / error / edge states
- **(a) Exists:** `ChatHome` with kicker, headline, 4 hardcoded suggestion chips, dark-mode aurora wash. `ChatBanner` for `rate_limited`, `budget_exhausted`, `llm_down`. `ReconsentModal` for Plaid re-consent. Typed `AgentError` routing in `ChatView`.
- **(b) Missing/weak:** Light mode has no aurora-wash anchor — plain. Suggestions are hardcoded; no variety / category mix. `ChatBanner` dismiss-button hover bg matches the banner bg → invisible hover. No transient-error toast for network blips. Loading-state flash for very-short responses not mitigated.
- **(c) Reference:** Linear's quiet-but-grounded empty states; Monarch banner restraint.

### 4.7 Scroll behavior
- **(a) Exists:** `endRef.current?.scrollIntoView({ behavior: "smooth" })` on every messages-length change.
- **(b) Missing/weak:** Always scrolls to bottom even when user scrolls up mid-stream → fights the user. No scroll-to-bottom button. No stick-to-bottom hook. The optimistic-prompt path also triggers the scroll, multiplying the fight.
- **(c) Reference:** Claude.ai's scroll-to-bottom + stick-to-bottom pattern (the `useStickToBottom` library or our own implementation).

### 4.8 Message actions
- **(a) Exists:** Copy + Retry (assistant only) via `MessageActions`. Hover-revealed (`group-hover/msg`). Hidden during streaming.
- **(b) Missing/weak:** "Copied" feedback is a small text label (could be tooltip / icon swap). No edit-and-resend on user messages. No copy-just-the-code-block — copy includes the whole message. No share / link.
- **(c) Reference:** Claude.ai's hover-revealed action row + tooltip-style "copied".

### 4.9 Identity
- **(a) Exists:** "You" disk for user (brand-solid bg), "SP" italic disk for assistant (border + secondary bg, with explicit dark-mode moss tokens).
- **(b) Missing/weak:** No user Clerk avatar. Assistant disk is fine but inconsistent between bubble row and the actions row (which has no avatar). No timestamps on messages.
- **(c) Reference:** Claude.ai's persistent identity column on the left of each message group; Linear's avatar reuse across surfaces.

### 4.10 Content rendering
- **(a) Exists:** `MarkdownContent` uses `react-markdown` + `remark-gfm` with prose styling. Per-tool rich components (TransactionsTable, AccountsSummary, charts, etc.).
- **(b) Missing/weak:** **Code blocks have no syntax highlighting, no copy button, no language label.** Markdown tables are unstyled (default react-markdown). `TransactionsTable` is decent but lacks sorting, sticky headers, keyboard nav. Some tool-result components (e.g., `TransactionsTable`) use generic tokens (`text-tertiary`, `border-secondary`) without the moss-aesthetic dark tokens that `MessageBubble` uses — possible dark-mode parity gap to verify per tool.
- **(c) Reference:** Claude.ai code blocks; `TransactionsTable`'s tabular-nums precedent for monetary alignment everywhere.

### 4.11 Accessibility
- **(a) Exists:** `aria-live="polite"` on the message log. `role="log"`. `aria-label` on send button and textarea. `role="status"` on system messages and banner. Recent CROWDEV-320 contrast tightening (1B accessibility).
- **(b) Missing/weak:** No `aria-busy="true"` on the log during stream. `ToolCallDisplay` button has no `aria-expanded` or content `id` binding. `TransactionsTable` rows are clickable `<tr>` but not keyboard-focusable; no Enter to open. Need to verify chat-surface contrast under the recent 1B tightening — chat may have residual issues.
- **(c) Reference:** Linear's quiet-but-correct screen-reader behavior.

### 4.12 Mobile
- **(a) Exists:** Some responsive padding (`md:px-8`). DashboardSidebar already drawer-capable in the app shell.
- **(b) Missing/weak:** Uses `100vh` (or implicit `h-screen`) — virtual keyboard pushes things wrong on iOS. No `env(safe-area-inset-bottom)` on the input dock. Send button 36px (<44px). Sidebar drawer behavior on the chat surface specifically unverified.
- **(c) Reference:** Monarch/Copilot mobile restraint.

### 4.13 Aesthetic consistency
- **(a) Exists:** Moss + champagne tokens (`--sp-moss-mint`, `--sp-moss-line`, `--sp-surface-panel-strong`, `--sp-fraunces-accent`, etc.) used in some chat components. `cubic-bezier(0.32, 0.72, 0, 1)` ease in ChatHome chips. Dark mode is the primary theme and gets explicit care in `MessageBubble` and `MessageActionMinimal`.
- **(b) Missing/weak:** Motion timing is ad-hoc (300ms here, 1500ms copy-feedback there); no shared tokens. Some surfaces use generic tokens where moss tokens would be richer (esp. tool-result components). Light mode is the parity theme — must not be broken, but isn't the primary polish target. Recent CROWDEV-277 typography rein-in may not have reached chat surfaces.
- **(c) Reference:** Linear's tight motion-timing palette.

### 4.14 Performance / perceived latency
- **(a) Exists:** `useSmoothText` provides good TTFT feel. Convex reactivity is fast. `convex-helpers/react/cache/hooks` cache reduces refetch.
- **(b) Missing/weak:** `MessageList` `space-y-6` + per-message smooth-text + the optimistic-prompt parallel path — a long thread (>100 messages) may cause render pressure. Not measured. No memoization on `MessageBubble` parts. Markdown parsing per render. Animation jank not measured.
- **(c) Reference:** Monarch's invisible perf — verify, don't optimize prematurely.

## 5. Polish menu

Each item has an ID (used in §6 sequencing), priority, and complexity (S = ½ day, M = 1 day, L = 1–2 days).

### A. Streaming & Scroll
- **A1 P0 M** Scroll-to-bottom button (visible when not at bottom; framer-motion enter/exit; `useStickToBottom` hook)
- **A2 P0 S** Scroll lock during stream (auto-scroll only when at bottom; no fight with user scroll)
- **A3 P0 M** Stop button replaces send while streaming (Convex `cancelRun`-style mutation; backend prereq probed in PR 1)
- **A4 P0 M** Optimistic-prompt dedup (single render path; remove duplicate user bubble + thinking-dots block)
- **A5 P1 S** Streaming cursor / tail (calm vertical bar, reactbits text effect or CSS animation)

### B. Tool Call Display
- **B1 P0 M** Rich collapsed summary (inline preview line, e.g., "4 cards · $4,200 outstanding")
- **B2 P0 S** Per-tool icon mapping (replace generic `Settings01`)
- **B3 P0 M** Better expanded JSON viewer (collapsible keys, copy buttons, monospace)
- **B4 P1 S** Inline error recovery (retry button, link to settings for Plaid errors)
- **B5 P1 S** Tool result entrance (subtle fade/slide via framer-motion `layout`)

### C. Message Rendering
- **C1 P0 S** User avatar (Clerk image; initials fallback). Closes existing Linear avatar issue (ID resolved in PR 1).
- **C2 P0 S** Assistant avatar consistency (same disk in bubble + actions)
- **C3 P0 M** Code blocks (copy button, language label, syntax highlighting via `rehype-highlight` or `shiki` — decided in PR 1)
- **C4 P0 S** Markdown tables (styled, tabular-nums, header divider, zebra rows aligned to `TransactionsTable` density)
- **C5 P1 S** Message timestamps (hover-revealed at bubble corner)
- **C6 P1 M** Edit-and-resend on user messages (sends new turn, visually replaces previous)

### D. Input Affordances
- **D1 P1 S** Cmd/Ctrl+Enter alt submit (Enter still works)
- **D2 P1 S** Esc handling (clear input when non-empty, blur when empty)
- **D3 P1 S** Autofocus input after send
- **D4 P1 S** Send button 44px touch target on mobile

### E. Conversation History Sidebar
- **E1 P0 M** Time-bucket grouping (Today / Yesterday / Last 7 days / Last 30 days / Older)
- **E2 P0 M** Rename UI (kebab menu → inline edit; calls `renameThread`)
- **E3 P0 M** Delete UI (kebab menu → confirm dialog; calls `deleteThread`; navigates away if active)
- **E4 P0 S** Active-thread highlight (distinct from hover)
- **E5 P0 S** Delete orphaned `ThreadItem.tsx`
- **E6 P1 S** Hover preview (first user-message snippet)

### F. Empty / Error / Banner
- **F1 P2 S** Light-mode anchor for `ChatHome` (currently dark-only aurora wash). Demoted from P1 because dark is primary; light is parity-only.
- **F2 P1 S** `ChatBanner` contrast fix (dismiss-hover bg currently same as banner bg)
- **F3 P1 S** Suggestion variety (refresh per visit, category mix)
- **F4 P2 —** Network-blip toast for transient failures

### G. Mobile
- **G1 P1 M** Virtual keyboard handling (sticky input, `100dvh`, scroll on focus)
- **G2 P1 S** Safe-area insets (`pb-[env(safe-area-inset-bottom)]`)
- **G3 P1 S** Drawer behavior verification on chat surface

### H. Accessibility
- **H1 P1 S** `aria-busy="true"` on log during stream; verify focus stays on input
- **H2 P1 S** `ToolCallDisplay` button `aria-expanded` + content id binding
- **H3 P1 S** `TransactionsTable` keyboard nav (rows tabbable, Enter opens detail)
- **H4 P1 S** Chat-surface contrast verification under recent 1B tightening

### I. Aesthetic Consistency
- **I1 P1 S** Motion-timing token introduction; clamp to 150–250ms across chat
- **I2 P1 S** Typography scale verification (post CROWDEV-277 rein-in)
- **I3 P1 M** Tool-result component dark-mode parity sweep (audit-driven; some components use generic tokens where moss tokens would be richer — verify per tool, fix where visibly off)
- **I4 P2 —** Moss-leaf assistant glyph replacing "SP" italic disk

### J. Deferred (P2 — flagged, not built)
- **J1** Conversation search
- **J2** Share message / share thread
- **J3** Token usage display
- **J4** Voice input
- **J5** File uploads
- **J6** Custom system prompts
- **J7** I4 (moss-leaf glyph)
- **J8** F4 (network-blip toast)

### Budget tally
- P0 (must-ship): A1+A2+A3+A4 ≈ 3d, B1+B2+B3 ≈ 2d, C1+C2+C3+C4 ≈ 2d, E1+E2+E3+E4+E5 ≈ 3d → **~10 days of P0**
- P1 (should-ship): A5+B4+B5+C5+C6+D1-D4+E6+F2+F3+G1-G3+H1-H4+I1-I3 ≈ **~5–6 days of P1**
- Total ~15–16 days estimated against a ~10-business-day envelope → **~5 days of trim required**

### Trim plan (in order most likely to cut)
1. C6 (edit-and-resend) — drops to P2 first
2. C5 (timestamps) — drops to P2
3. B4 (tool error inline recovery) — drops to P2
4. E6 (hover preview) — drops to P2
5. I3 split-half (sweep just the visibly-off tool-results, defer the rest)

## 6. Sequencing — Graphite stack

**Acceptance principle for every PR:** dark mode is visually correct first; light mode reaches functional parity (no broken layouts, no contrast failures) by end of same PR. No "polish in dominant theme later" allowed.

| # | PR title | IDs | Notes |
|---|---|---|---|
| 1 | `chat: deps + per-tool icon map + motion tokens (foundations)` | (deps + tokens) | reactbits + `rehype-highlight`/`shiki` install. `lib/icons/toolIconMap.ts`. `--sp-motion-fast/base/slow` + `--sp-ease-productive`. PR 1 also: probe backend cancel pathway (A3 prereq), look up existing Linear avatar issue ID (C1 prereq), reactbits import smoke test. No behavior change. |
| 2 | `chat: streaming + scroll polish` | A4, A2, A1 | Highest demo blast radius. Coupled because all three live in `MessageList`/`ChatView`. |
| 3 | `chat: stop button during streaming` | A3 | If PR 1 probe found no backend cancel primitive, this PR adds the small Convex mutation. If backend work >½ day, splits into a separate sub-issue. |
| 4 | `chat: user + assistant avatars` | C1, C2 | Closes the existing Linear avatar issue with `Fixes <ID>`. |
| 5 | `chat: markdown polish (code blocks + tables)` | C3, C4 | Dark-mode syntax theme picked first; light theme tested second. |
| 6 | `chat: tool call display (rich summary, per-tool icons, JSON viewer)` | B1, B2, B3 | Consumes the icon map from PR 1. Uses fixture harness for verification. |
| 7 | `chat: sidebar history grouping + active highlight + cleanup` | E1, E4, E5 | Read-only sidebar work. Delete `ThreadItem.tsx`. |
| 8 | `chat: sidebar rename + delete (+ hover preview)` | E2, E3, E6 | Stacks on PR 7. Mutation flows. E6 (hover preview) is bundled because it shares the same surface; first item to drop if PR 8 exceeds budget. |
| 9 | `chat: input affordances` | D1–D4 | All in `MessageActionMinimal`. Bundled because each is tiny. |
| 10 | `chat: mobile + safe-area + banner contrast` | G1, G2, G3, F2 | Mobile + banner-on-mobile context. |
| 11 | `chat: accessibility pass` | H1, H2, H3, H4 | After visual structure is settled so aria-* don't drift. |
| 12 | `chat: empty state + motion + typography sweeps` | F3, I1, I2 | F1 (light-mode anchor) is P2-deferred. |
| 13 | `chat: streaming cursor + tool result entrance + dark-mode tool-result sweep` | A5, B5, I3 | Ends the core stack. I3 may split into its own PR if review feedback demands. |
| 14 *(stretch)* | `chat: tool error inline recovery` | B4 | First to drop if budget is tight. |
| 15 *(stretch)* | `chat: message timestamps` | C5 | Drops second. |
| 16 *(stretch)* | `chat: edit-and-resend` | C6 | Drops first to P2; highest implementation risk. |

### Milestones
- **After PR 6** — single-turn interaction looks premium. ~6 business days in.
- **After PR 8** — multi-turn flow coherent. ~9 days in.
- **After PR 11** — mobile + a11y clean. ~12 days in.
- **After PR 13** — core stack complete; demo-ready. ~14–15 days in.

## 7. Architecture changes

### New components
- `apps/app/src/components/chat/ScrollToBottomButton.tsx` — floating CTA, framer-motion enter/exit
- `apps/app/src/components/chat/StopButton.tsx` (or inline mode in `MessageActionMinimal` — decide at PR 3 by readability)
- `apps/app/src/components/chat/UserAvatar.tsx` — Clerk image with initials fallback
- `apps/app/src/components/chat/AssistantAvatar.tsx` — moss-aesthetic mark, single source for bubble + actions row
- `apps/app/src/components/chat/CodeBlock.tsx` — wraps `<pre><code>` with copy + language label, consumed by `MarkdownContent`
- `apps/app/src/components/chat/StreamingCursor.tsx` — calm tail cursor, reactbits-backed
- `apps/app/src/components/chat/MessageTimestamp.tsx` — hover-revealed timestamp (P1, **only created if stretch PR 15 ships**; if C5 drops to P2, this file is not created)
- `apps/app/src/components/chat/sidebar/ChatHistoryGroup.tsx` — time-bucket section
- `apps/app/src/components/chat/sidebar/ChatHistoryItem.tsx` — sidebar row with kebab menu
- `apps/app/src/components/chat/sidebar/RenameThreadDialog.tsx` — inline edit (likely a popover, not a modal)
- `apps/app/src/components/chat/sidebar/DeleteThreadConfirm.tsx` — confirm dialog
- `apps/app/src/lib/hooks/useStickToBottom.ts` — `{ isAtBottom, scrollToBottom, onScroll }` hook
- `apps/app/src/lib/icons/toolIconMap.ts` — `Record<ToolName, IconComponent>`

### Modified
- `apps/app/src/components/chat/MessageList.tsx` — adopt `useStickToBottom`, drop the duplicate optimistic-prompt block, render scroll-to-bottom slot
- `apps/app/src/components/chat/MessageBubble.tsx` — avatar slot via `UserAvatar`/`AssistantAvatar`; (P1) timestamp slot
- `apps/app/src/components/chat/ToolCallDisplay.tsx` — major refactor: `summary?: ReactNode | string` prop, per-tool `icon?: IconComponent` prop, JSON viewer subcomponent
- `apps/app/src/components/chat/MarkdownContent.tsx` — adopt `CodeBlock`, table styles, syntax theme via `rehype-highlight` or `shiki`
- `apps/app/src/components/chat/MessageActionMinimal.tsx` — Cmd+Enter, Esc, autofocus return, 44px touch target, stop-button mode toggle
- `apps/app/src/components/chat/ChatBanner.tsx` — dismiss-button hover bg fix
- `apps/app/src/components/chat/ChatHome.tsx` — suggestion variety; (P2) light-mode anchor
- `apps/app/src/components/application/dashboard-sidebar.tsx` — chat-history slot re-render with `ChatHistoryGroup` + `ChatHistoryItem`
- `packages/backend/convex/agent/threads.ts` — only if A3 backend prereq surfaces (probed PR 1)

### Deleted
- `apps/app/src/components/chat/ThreadItem.tsx` — orphaned 12-line stub

### Component contracts
- `useStickToBottom(scrollContainerRef)` returns `{ isAtBottom: boolean; scrollToBottom: () => void; onScroll: (e: UIEvent) => void }`. `MessageList` owns the ref; `isAtBottom` controls `<ScrollToBottomButton>` visibility; `onScroll` updates `isAtBottom`.
- `ToolCallDisplay` props: `{ toolName, input?, output?, error?, state, summary?, icon? }`. When `summary` is provided, the collapsed header shows it instead of the bare tool name. When `icon` is provided, replaces `Settings01`.
- Sidebar history slot accepts `{ threads: Thread[]; activeThreadId: Id<'agentThreads'> | null; onRename: (id, newTitle) => Promise<void>; onDelete: (id) => Promise<void> }`. Pure presentation; mutations come from existing Convex hooks in `DashboardSidebar`.
- `MarkdownContent` stays thin — complexity moves into `CodeBlock`.

## 8. Animation strategy

### framer-motion (primary, already installed as `motion@^12`)
- Layout transitions (sidebar item layout, banner enter/exit)
- `<ScrollToBottomButton>` enter/exit via `AnimatePresence` + `initial={{ opacity: 0, y: 4 }}`
- `<RenameThreadDialog>` and `<DeleteThreadConfirm>` enter
- Tool result entrance via `motion.div` with `layout`

### reactbits (selective, install in PR 1)
- **`<StreamingCursor>`** — one of reactbits' calm text effects, calibrated to ≤200ms
- **Suggestion-chip press feedback** in `ChatHome` — one of reactbits' button effects, capped overshoot
- **Optional:** assistant-message entrance refinement, only if it doesn't break Linear-aesthetic restraint

### Banned categorically
- Anything that reads as "marketing landing-page": gradient sweeps, particle FX, big bouncy springs (>5% overshoot), glow trails, parallax
- Effects on every element — motion is for moments, not ambient
- Color-shifting text, decrypt effects, typewriter effects on assistant body text (the `useSmoothText` already provides the right token-level smoothness)

### Motion tokens (PR 1)
```css
--sp-motion-fast: 150ms;   /* button press, hover state changes */
--sp-motion-base: 220ms;   /* banner, dialog, sidebar item */
--sp-motion-slow: 320ms;   /* large layout — rare */
--sp-ease-productive: cubic-bezier(0.32, 0.72, 0, 1);  /* matches ChatHome chips */
```

Spring overshoot capped at ~5%. If reactbits' default overshoots, override or drop.

## 9. Testing & verification

### Existing infrastructure
- Fixture harness at `apps/app/src/app/(app)/dev/tool-results/` — preview every tool-result component in isolation in both themes. Use heavily for B-area and tool-result-touching PRs.
- `bun typecheck`, `bun lint` per workspace.
- Vercel preview per PR (`smartpockets-app` check).

### Per-PR smoke protocol
1. **Visual smoke (dark first, then light)** — screenshots at affected surfaces, both themes
2. **Streaming smoke** — full cycle: send → tokens stream → tool call appears → result lands → done. Verify scroll behavior, stop button, error path
3. **Mobile smoke** — DevTools iPhone 14 viewport: send a message, verify sticky input, safe-area, no `100vh` jank
4. **Keyboard-only smoke** — Tab order through chat, visible focus rings, Enter/Cmd+Enter send
5. **Screen-reader spot-check** — VoiceOver: verify `aria-live`, `aria-busy`, `aria-expanded` on tool-call disclosure
6. **Typecheck + lint** — `bun typecheck && bun lint`
7. **Vercel preview** — confirm `smartpockets-app` check passes
8. **Regression spot-check** — load `/credit-cards`, `/transactions`, `/settings` to confirm chat changes don't bleed

### Cross-PR demo run
Every ~3 PRs, point `app.preview.smartpockets.com` at the latest stack head (per CLAUDE.md offer), do a full multi-turn demo, capture any new gaps as comments on CROWDEV-329.

### Acceptance for CROWDEV-329 closure
- All P0 IDs shipped
- All P1 IDs shipped (or explicitly deferred to P2 with rationale and follow-up issue created)
- The "demo without apologizing" smell test on `app.preview.smartpockets.com` — complete a multi-turn conversation that exercises card lookup, transactions table, a proposal flow, and a chart, in dark mode, on desktop and mobile
- Existing Linear avatar issue closed by PR 4

## 10. Risks & open questions

### Risks
1. **A3 backend cancel prereq.** If `@convex-dev/agent` lacks a cancel primitive, PR 3 adds a small Convex mutation. If that grows beyond ½ day, A3 splits into a separate backend sub-issue and the UI ships in a follow-up PR.
2. **reactbits + Next 16 + Tailwind v4 compat.** PR 1 includes one trivial reactbits import as a smoke test. If broken, drop reactbits entirely and rely on framer-motion + CSS for A5, suggestion-chip press feedback, and any other planned effect.
3. **Syntax-highlighting bundle weight.** `rehype-highlight` (~30KB with curated languages: `json, ts, sql, py, sh, bash`) is the default pick. If we want better moss-tuned themes, switch to `shiki` (heavier, lazy-load required). Decision lands at PR 1.
4. **Edit-and-resend (C6) complexity.** Visual replacement of a turn while preserving thread integrity is the highest-risk P1. Drops to P2 if it grows past 1.5 days.
5. **Tool-result dark-mode parity (I3).** Some components use generic tokens. Sweep is M-complexity but could be S if most components are already correct, or L if they're broadly off — bounded by 1.5 days, otherwise split.

### Open questions for PR 1 to resolve
- Backend cancel pathway for A3 — yes/no, and if yes which mutation
- Existing Linear avatar issue ID — locate via Linear MCP
- reactbits import smoke — confirm Next 16 + Tailwind v4 compatibility
- `rehype-highlight` vs `shiki` — pick based on theme fit + bundle weight
- `renameThread` / `deleteThread` mutation stability — confirm no flag gating, no race conditions with active thread

## 11. Linear plumbing

- **Parent:** [CROWDEV-329](https://linear.app/crowdevelopment/issue/CROWDEV-329) stays open until PR 13 (or last shipped stretch PR) lands
- **Sub-issues:** one per PR in §6, created at execution time with the Linear MCP
- **Avatar issue:** an existing Linear issue covers user-avatar-in-chat (per CROWDEV-329 prompt). Its ID is intentionally unresolved at spec time — PR 1 looks it up via the Linear MCP. Once known, the issue is moved under CROWDEV-329 as a sub-issue and closed by PR 4 with `Fixes <ID>`.
- **Commits:** use `Refs CROWDEV-329` until the final PR which uses `Fixes CROWDEV-329`
- **Comments:** on CROWDEV-329 at start, on each PR, and at any blocker. Per-sub-issue: comment when PR is opened with the Graphite link
- **Parent state:** if CROWDEV-329 is in To-do or Backlog when PR 1 lands, move it to In Progress and comment with the active child sub-issue

## 12. Out-of-scope items (with rationale)

| Item | Reason |
|---|---|
| External MCP server (`apps/app/src/lib/mcp/`, `app/api/mcp/route.ts`) | Different consumer (Claude Desktop and other external MCP clients). Not chat-UI plumbing. May warrant a separate evaluation if the team wants to port to a Convex HTTP action — out of scope here. |
| AI SDK migration | `useSmoothText` already handles streaming smoothness; AI SDK isn't needed. |
| `@convex-dev/agent` internals (system prompt, tool registry, RAG, rate limits, budgets, compaction) | Public API only. |
| New agent tools / tool-surface expansion | Polish, not feature work. |
| Conversation search (J1) | P2. |
| Share message / thread (J2) | P2. |
| Token usage display (J3) | P2. |
| Voice input (J4) | P2. |
| File uploads (J5) | P2. |
| Custom system prompts (J6) | P2. |
| Moss-leaf assistant glyph (I4 / J7) | P2 — current "SP" italic disk is acceptable. |
| Network-blip toast (F4 / J8) | P2. |
| Light-mode aurora-wash anchor for ChatHome (F1) | P2 — light is parity, not primary. |

## 13. Handoff to writing-plans

After user approval of this spec, the next step is invoking the **writing-plans** skill to convert this design into a concrete implementation plan. The implementation plan should preserve the §6 Graphite stack ordering and treat each row as a separate sub-task with its own pre-flight, implementation, and verification steps.

The implementation phase MUST honor the dark-first acceptance principle (§6 header) and the per-PR smoke protocol (§9). Stretch PRs are explicitly optional and depend on remaining budget at PR 13.

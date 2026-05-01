---
linear: CROWDEV-329
title: External research revisions — Revision 1
date: 2026-04-30
status: applied
parent_design: docs/superpowers/specs/2026-04-30-crowdev-329-agentic-chat-polish-design.md
parent_plan: docs/superpowers/plans/2026-04-30-crowdev-329-agentic-chat-polish.md
---

# Revision 1 — External Research Findings Applied

External deep-research review of the spec + plan landed substantive findings. This addendum captures every override on top of the original design + plan. **Executors must read all three documents (spec, plan, this revision) and treat overrides here as authoritative.**

## 1. Architectural facts to absorb

### 1.1 UntitledUI Pro is built on React Aria (NOT Radix)
This is the critical detail the original spec elided. Mixing raw `@radix-ui/*` primitives into a React Aria–based shell creates two parallel keyboard / focus / dismiss systems. They mostly work side-by-side but produce small inconsistencies in typeahead behavior, focus-loop direction on Tab, and Esc-handling priority — exactly where polish matters. **Keep one a11y stack.** For every behavior-heavy primitive (Dropdown Menu, Modal, Popover, Tooltip) in the chat plumbing, use **UntitledUI Pro's wrappers**, not raw Radix.

### 1.2 `@convex-dev/agent` exposes both `optimisticallySendMessage` and a public abort surface
- The component ships an `optimisticallySendMessage` helper. PR 2's optimistic-prompt rewrite should adopt this, not hand-roll an optimistic state.
- The agent's public abort surface (`result.consumeStream()`, `onAsyncAbort`, `cancelMessage` per the changelog) is the right probe target for PR 1 / PR 3, not a `grep` against the project's own backend.

### 1.3 `propose_*` proposal flow needs an `awaiting-approval` state
The plan's `ToolCallDisplay` state union (`input-streaming` / `input-available` / `output-available` / `output-error`) is missing the human-in-the-loop pause that the proposal tools land in. Add `awaiting-approval` to the state union in PR 6.

### 1.4 `use-stick-to-bottom` is by `stackblitz-labs` (not Stack-Auth)
Minor naming correction. Confirm in PR 1 probe before installing. MIT, zero-deps, used in production by bolt.new and others.

### 1.5 iOS Safari 26 has a known `100dvh` clipping bug
Real-device check (or BrowserStack) is required for PR 10 — DevTools doesn't simulate the bug. Workarounds: set page bg on `<body>` instead of the dvh-sized container, or fall back to `100svh` for the outer wrapper.

## 2. User decisions

### 2.1 Adopt `streamdown` (Vercel) for PR 5 — performance is critical
Replaces `react-markdown` + `rehype-highlight` + custom `CodeBlock`. Streamdown is a drop-in `react-markdown` replacement engineered for AI streaming: per-block memoization (so completed messages don't re-parse on every new token), unterminated-block parsing (so a half-streamed code fence renders as a styled incomplete block), shiki-bundled code blocks with copy/language built in, GFM, KaTeX, security-hardened links/images.

**Cost:** ~½ day to map shadcn-CSS-variable surface (`--background`, `--foreground`, `--card`, `--muted`, etc.) to the moss palette in `globals.css`. Tailwind v4 `@source './node_modules/streamdown/dist'` directive required.

**Bundle:** lazy-loaded code/mermaid/math splits mean delivered bundle is ≤ `rehype-highlight` for text-only messages. Concrete gate in PR 5: chat-route bundle >+60KB gzipped → fail PR.

### 2.2 Drop `reactbits` entirely
Aesthetic mismatch with productivity feel. The actual reactbits phenotype (animated backgrounds, decrypt text, WebGL splash, overshoot springs) violates the Set 1B "no bouncy springs, no gradient sweeps, no marketing-aesthetic" rule. Pure CSS + framer-motion v12 covers everything:
- Streaming cursor (PR 13): CSS `@keyframes sp-cursor-pulse` (already in plan)
- Suggestion-chip press feedback (PR 12): framer-motion or CSS scale
- Tool result entrance (PR 13): `motion.div` with `layout` (already in plan)

The original CROWDEV-329 prompt's preference for reactbits is explicitly overridden. Reactbits is reserved for marketing site only.

## 3. File structure deltas

### 3.1 Removed (vs. original plan)
- `apps/app/src/components/chat/CodeBlock.tsx` — Streamdown ships its own code block; do not create.
- `apps/app/src/components/chat/code-block-theme.css` — replaced by **streamdown-theme additions in `apps/app/src/app/globals.css`** (CSS-variable mapping for moss palette).

### 3.2 Added (vs. original plan)
- *(no new component files; the simplifications are net file reductions)*

### 3.3 Unchanged
- `useStickToBottom.ts` — file path stays, but the **content is `re-export from "use-stick-to-bottom"`** (or it's removed entirely and `MessageList` imports the lib directly). Decided at PR 2.

### 3.4 Renamed conceptually
- `StreamingCursor.tsx` description in §7 of spec: drop "(reactbits-backed)" — **CSS-only**. Implementation in plan PR 13 Step 13.3 is already CSS-only and stays as-is.

## 4. Per-task overrides

### Task 1 (PR 1) — Foundations

**Replace Step 1.2** with:
> **Step 1.2: Probe — `@convex-dev/agent` public abort surface.**
> Inspect public abort + cancellation API:
> ```bash
> grep -E "consumeStream|onAsyncAbort|cancelMessage|abort" node_modules/@convex-dev/agent/dist/**/*.d.ts | head -20
> ```
> Look for `result.consumeStream(options)` with `onAsyncAbort`, and any `cancelMessage` / cancel-helpers exposed by the `Agent` instance. Document the abort flow API surface in the Linear sub-issue. PR 3's stop button consumes whichever helper is available; only fall back to a custom Convex-side cancel flag if no helper exists.

**Replace Step 1.4** with:
> **Step 1.4: Install `streamdown` + Tailwind `@source` directive.**
> ```bash
> cd apps/app && bun add streamdown
> ```
> Add to `apps/app/src/app/globals.css` (top, before token blocks):
> ```css
> @source './node_modules/streamdown/dist';
> ```
> Run `bun typecheck && bun run build` to confirm Tailwind v4 picks up streamdown's class names. If build fails, document the failure mode in the Linear sub-issue and pause this PR — escalate before continuing.

**Remove Step 1.5 entirely.** The rehype-highlight vs shiki decision is moot — streamdown bundles shiki internally and lazy-loads it.

**Insert new step between 1.5 (now removed) and 1.6:**
> **Step 1.5 (new): Probe `optimisticallySendMessage`.**
> ```bash
> grep -E "optimisticallySendMessage" node_modules/@convex-dev/agent/dist/**/*.d.ts
> ```
> Read the helper's signature (`(threadId, args) => OptimisticUpdate` or similar). PR 2 Step 2.6 consumes it. If not present in the installed version of `@convex-dev/agent`, document the version gap and decide whether to upgrade — this is a hard prereq for PR 2's optimistic-prompt rewrite.

**Update Step 1.11 commit body:**
> Subject stays `chore(chat): foundations — deps, icon map, motion tokens`. Body now mentions: "streamdown install (replaces rehype-highlight + shiki decision tree). reactbits dropped per Revision 1. Probes resolved: agent abort surface, `optimisticallySendMessage`, existing avatar issue, renameThread/deleteThread mutation stability. Tailwind `@source` directive added for streamdown."

**Drop the reactbits compat smoke probe** that was implicit in the original Step 1.4 — there's no reactbits to smoke-test.

### Task 2 (PR 2) — Streaming + Scroll Polish

**Replace Step 2.3** with:
> **Step 2.3: Install `use-stick-to-bottom`.**
> ```bash
> cd apps/app && bun add use-stick-to-bottom
> ```
> Maintainer: `stackblitz-labs/use-stick-to-bottom` (MIT, zero-deps). **Do not create `apps/app/src/lib/hooks/useStickToBottom.ts`.** Either skip the file entirely or make it a thin re-export. The hand-rolled hook from the original plan is replaced wholesale.

**Replace Step 2.4** with:
> **Step 2.4: Create `ScrollToBottomButton` using `useStickToBottomContext`.**
> ```tsx
> "use client";
> import { ArrowDown } from "@untitledui/icons";
> import { AnimatePresence, motion } from "motion/react";
> import { useStickToBottomContext } from "use-stick-to-bottom";
> import { cx } from "@/utils/cx";
>
> export function ScrollToBottomButton({ className }: { className?: string }) {
>     const { isAtBottom, scrollToBottom } = useStickToBottomContext();
>     return (
>         <AnimatePresence>
>             {!isAtBottom && (
>                 <motion.button
>                     type="button"
>                     onClick={() => scrollToBottom()}
>                     aria-label="Scroll to latest message"
>                     initial={{ opacity: 0, y: 8 }}
>                     animate={{ opacity: 1, y: 0 }}
>                     exit={{ opacity: 0, y: 8 }}
>                     transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
>                     className={cx(
>                         "absolute bottom-4 left-1/2 z-10 -translate-x-1/2",
>                         "flex size-9 items-center justify-center rounded-full",
>                         "border border-secondary bg-primary shadow-md transition-colors hover:bg-secondary",
>                         "dark:border-[var(--sp-moss-line-strong)] dark:bg-[var(--sp-surface-panel-strong)] dark:hover:border-white/20",
>                         className,
>                     )}
>                 >
>                     <ArrowDown className="size-4 text-secondary" />
>                 </motion.button>
>             )}
>         </AnimatePresence>
>     );
> }
> ```
> No prop-passed visibility — the context provides it.

**Replace Step 2.5** with:
> **Step 2.5: Refactor `MessageList` to use `<StickToBottom>` wrapper.**
> ```tsx
> "use client";
> import { useEffect } from "react";
> import { useQuery } from "convex-helpers/react/cache/hooks";
> import { StickToBottom } from "use-stick-to-bottom";
> import { api } from "@convex/_generated/api";
> import type { Doc, Id } from "@convex/_generated/dataModel";
> import { MessageBubble } from "@/components/chat/MessageBubble";
> import { ScrollToBottomButton } from "@/components/chat/ScrollToBottomButton";
>
> type AgentMessage = Doc<"agentMessages">;
>
> interface MessageListProps {
>     threadId: Id<"agentThreads"> | null;
>     onMessagesLoaded?: () => void;
>     onRegenerate?: (message: AgentMessage) => Promise<void> | void;
> }
>
> export function MessageList({ threadId, onMessagesLoaded, onRegenerate }: MessageListProps) {
>     const messages = useQuery(
>         api.agent.threads.listMessages,
>         threadId ? { threadId } : "skip",
>     ) as AgentMessage[] | undefined;
>
>     useEffect(() => {
>         if (messages && onMessagesLoaded) onMessagesLoaded();
>     }, [messages, onMessagesLoaded]);
>
>     if (!threadId) return null;
>     if (messages === undefined) {
>         return (
>             <div className="flex flex-1 items-center justify-center">
>                 <div className="size-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
>             </div>
>         );
>     }
>
>     return (
>         <StickToBottom
>             className="relative flex flex-1 flex-col overflow-hidden"
>             resize="smooth"
>             initial="instant"
>         >
>             <StickToBottom.Content
>                 role="log"
>                 aria-live="polite"
>                 className="flex-1 space-y-6 overflow-y-auto px-4 py-6 md:px-8"
>             >
>                 {messages.map((message) => (
>                     <MessageBubble
>                         key={message._id}
>                         message={message}
>                         threadId={threadId}
>                         onRegenerate={
>                             onRegenerate && message.role === "assistant"
>                                 ? () => onRegenerate(message)
>                                 : undefined
>                         }
>                     />
>                 ))}
>             </StickToBottom.Content>
>             <ScrollToBottomButton />
>         </StickToBottom>
>     );
> }
> ```
> The library handles `ResizeObserver`, scroll-anchoring, and the velocity-based spring algorithm. Verify the exact API surface (`StickToBottom.Content`, `resize`, `initial` props) against the installed version in PR 1 — they may differ slightly across minor versions.

**Replace Step 2.6** with:
> **Step 2.6: Adopt `optimisticallySendMessage` from `@convex-dev/agent`.**
> Per PR 1 Step 1.5 probe, the helper exists. Use it in `ChatInteractionContext.defaultSendMessage` (or in `ChatView` if cleaner) so the user message renders immediately on submit, then dedupes against the real Convex row when it arrives. Rough shape (verify against the installed signature):
> ```tsx
> import { optimisticallySendMessage } from "@convex-dev/agent/react";
>
> // In sendMessage handler:
> const optimistic = optimisticallySendMessage(api.agent.threads.listMessages);
> // Apply optimistic update before the network call; library handles the dedupe.
> ```
> This closes the 100–400ms gap that the original Step 2.6 hand-waved as "defer to verification." **No more visible flicker on submit.**

### Task 3 (PR 3) — Stop Button

**Replace Step 3.2** with:
> **Step 3.2: Use `@convex-dev/agent`'s public abort surface.**
> Per PR 1 Step 1.2 probe. The agent component exposes abort directly — typically `result.consumeStream({ onAsyncAbort })` and an `Agent`-level `cancelMessage(threadId)` or similar. The handler in `ChatView` calls whichever helper is available.
>
> **Path (a) — agent helper available (expected case):** wire it. No backend code needed.
>
> **Path (b) — only if no helper exists (unlikely):** add a small Convex mutation that flags the active run as cancelled. The agent step loop must honor the flag on its next iteration. If this design grows beyond ½ day, **stop and split into a separate backend sub-issue.**

### Task 5 (PR 5) — Markdown Polish (Streamdown)

**Replace Steps 5.2–5.5 entirely** with:

> **Step 5.2: Confirm streamdown is installed (from PR 1, Step 1.4).**
> If skipped in PR 1, install now: `cd apps/app && bun add streamdown` and add the `@source` directive to `globals.css`.
>
> **Step 5.3: Replace `MarkdownContent.tsx` with streamdown.**
> ```tsx
> "use client";
> import { Streamdown } from "streamdown";
>
> interface MarkdownContentProps {
>     content: string;
> }
>
> export function MarkdownContent({ content }: MarkdownContentProps) {
>     return <Streamdown>{content}</Streamdown>;
> }
> ```
> **Do not create `apps/app/src/components/chat/CodeBlock.tsx` or `code-block-theme.css`.** Streamdown ships both the code-block component and the theme.
>
> **Step 5.4: Map shadcn CSS variables to moss palette in `globals.css`.**
> Streamdown reads shadcn-style CSS variables (`--background`, `--foreground`, `--card`, `--muted`, `--border`, `--ring`). Map them to existing moss tokens. Add to the `:root` block (after the existing `--sp-microcopy`) and override in `.dark-mode` / `.light-mode` as needed:
> ```css
> :root {
>     /* Streamdown / shadcn-compat surface tokens — mapped to moss palette. */
>     --background: var(--sp-moss-bg);
>     --foreground: rgb(228 222 207);
>     --card: var(--sp-surface-panel-strong);
>     --card-foreground: rgb(228 222 207);
>     --muted: var(--sp-surface-panel);
>     --muted-foreground: rgb(120 113 108);
>     --border: var(--sp-moss-line);
>     --ring: var(--sp-moss-mint);
> }
>
> .light-mode {
>     /* Override for parity. */
>     --background: rgb(248 244 232);
>     --foreground: rgb(28 25 23);
>     --card: rgb(245 241 232);
>     --card-foreground: rgb(28 25 23);
>     /* ... */
> }
> ```
> Use a temporary chat-bound test message that triggers code blocks, tables, and lists to verify the visual smoke (Step 5.5 below). The exact mappings may need tuning per visual review — ½ day budget.
>
> **Step 5.5: Visual smoke (was Step 5.6).**
> Send test messages exercising: (a) code block in TypeScript, (b) markdown table, (c) ordered/unordered lists, (d) inline code, (e) bold/italic, (f) blockquote, (g) link. Verify in **dark mode first**, then light. Streaming-incomplete-block test: send a query that streams a long code fence — verify the partial code renders as a styled (incomplete) block, NOT raw text.
>
> **Step 5.6: Bundle weight gate (was Step 5.7) — concrete fail criterion.**
> ```bash
> cd apps/app && bun run build
> ```
> Compare chat-route bundle vs. pre-PR-5 baseline. **>+60KB gzipped → fail PR.** Mitigation if exceeded: force code-block lazy-load via `<Streamdown components={{ code: lazy(() => import('./LazyCode')) }}>` (verify exact API). Document delta in the Linear sub-issue.
>
> **Step 5.7: Commit + submit (was Step 5.8).**
> Commit subject: `feat(chat): markdown polish via streamdown (C3, C4)`. Body notes: replaces react-markdown + rehype-highlight; per-block memoization for streaming perf; shadcn CSS vars mapped to moss tokens; bundle delta within gate.

### Task 6 (PR 6) — Tool Call Display

**Update Step 6.2** — extend the state union with `awaiting-approval`:
> ```tsx
> interface ToolCallDisplayProps {
>     toolName: string;
>     input?: unknown;
>     output?: unknown;
>     error?: string;
>     state: "input-streaming" | "input-available" | "output-available" | "output-error" | "awaiting-approval";
>     summary?: ReactNode | string;
>     icon?: ComponentType<SVGProps<SVGSVGElement>>;
> }
> ```
> The `awaiting-approval` state covers `propose_*` tools that pause for human-in-the-loop confirmation. Visual treatment in the collapsed header: distinct status badge ("awaiting approval" or pending-circle) instead of spinner / check / x.

**Augment Step 6.3** — add a comment block referencing assistant-ui's source as visual inspiration:
> ```tsx
> // Visual idioms for state badges, awaiting-approval, error states inspired by
> // assistant-ui's ToolHeader / ToolInput / ToolOutput components — read the
> // source for layout patterns; we don't import the library (architectural
> // mismatch with our React Aria-based UntitledUI Pro shell).
> ```

### Task 7 (PR 7) — Sidebar History

**Update Step 7.5** — pick URL params as canonical source for `activeThreadId`:
> Use `useParams<{ threadId?: string }>()` as the **single source of truth** for the active thread. Do not introduce parallel state. If `MessageList` or any consumer needs `activeThreadId`, derive it from URL params and pass through. This avoids the one-paint-cycle flash where the sidebar and chat disagree on hard navigation.

### Task 8 (PR 8) — Sidebar Rename + Delete + Hover Preview

**Replace Step 8.2** with (now mandatory, not optional):
> **Step 8.2: Locate UntitledUI Pro's Dropdown / Modal / Popover / Tooltip primitives — these are the implementation, not a fallback.**
> ```bash
> grep -rln "Dropdown\|Modal\|Tooltip\|Popover" packages/ui/src --include="*.tsx" | head -20
> ```
> Inspect the wrappers' export paths and prop surfaces. UntitledUI Pro is built on React Aria; using its wrappers preserves the app's keyboard / focus / dismiss consistency. **Do not install or use raw `@radix-ui/*` primitives.** If a specific UntitledUI Pro primitive is missing or insufficient, escalate before reaching for Radix.

**Replace Step 8.3** — `RenameThreadDialog` uses UntitledUI Pro's Popover or inline form (no Radix):
> Use UntitledUI Pro's `Popover` or `Modal` (whichever has cleaner inline-edit semantics for the sidebar surface — verify via Step 8.2). The popover hosts the inline-edit form. Keep the existing form logic (autoFocus, Enter/Escape handling, submit/cancel buttons). Do not import Radix dialog/popover.

**Replace Step 8.4** — `DeleteThreadConfirm` uses UntitledUI Pro's `<Modal>`:
> ```tsx
> "use client";
> import { Modal } from "<UntitledUI Pro Modal import path — verify in Step 8.2>";
>
> interface DeleteThreadConfirmProps {
>     open: boolean;
>     threadTitle: string;
>     onConfirm: () => Promise<void>;
>     onCancel: () => void;
> }
>
> export function DeleteThreadConfirm({ open, threadTitle, onConfirm, onCancel }: DeleteThreadConfirmProps) {
>     return (
>         <Modal isOpen={open} onOpenChange={(o) => !o && onCancel()}>
>             {/* UntitledUI Modal API — verify props in Step 8.2 */}
>             <h2 className="text-base font-medium text-primary">Delete this conversation?</h2>
>             <p className="mt-1 text-sm text-tertiary">
>                 "{threadTitle}" will be permanently removed. This cannot be undone.
>             </p>
>             <div className="mt-4 flex justify-end gap-2">
>                 <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm text-secondary hover:bg-secondary">Cancel</button>
>                 <button type="button" onClick={onConfirm} className="rounded-md bg-error-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">Delete</button>
>             </div>
>         </Modal>
>     );
> }
> ```
> The hand-rolled `motion.div` overlay in the original Step 8.4 is replaced. Focus trap, aria-modal, dismiss-on-backdrop, Esc handling come for free from React Aria.

**Augment Step 8.5** — shared `openMenuId` to prevent multiple open kebabs:
> In `DashboardSidebar` (or its chat-history slot owner), introduce shared state:
> ```tsx
> const [openMenuThreadId, setOpenMenuThreadId] = useState<string | null>(null);
> // Pass to each <ChatHistoryItem>:
> <ChatHistoryItem
>     threadId={t.threadId}
>     title={t.title ?? "Untitled"}
>     isActive={t.threadId === activeThreadId}
>     summary={t.summary}
>     isMenuOpen={openMenuThreadId === t.threadId}
>     onMenuOpenChange={(open) => setOpenMenuThreadId(open ? t.threadId : null)}
> />
> ```
> `ChatHistoryItem` becomes controlled on menu open state. Only one kebab can be open at a time.

### Task 10 (PR 10) — Mobile + Safe-Area + Banner Contrast

**Augment Step 10.6** — add real-device iOS Safari 26 check:
> Add to verification:
> - **Real-device iOS Safari 26 check** (or BrowserStack iOS 26 + Safari 17/18). DevTools doesn't simulate the known viewport bug. The bug: with `100dvh` + sticky/fixed bottom content, the input may render in a clipped state on first paint until a scroll event reflows it.
> - **If clipping is observed:** fall back to `100svh` for `ChatContainer`'s outer wrapper (stable viewport height), or move the page background from the dvh container to `<body>`. Document the chosen workaround in the Linear sub-issue.

### Task 11 (PR 11) — Accessibility Pass

**Augment Step 11.3** — primitive-verified note:
> If PR 8 used UntitledUI Pro primitives (per Revision 1 §Task 8 Step 8.2 mandate), `aria-expanded` / `aria-controls` on the kebab disclosure is primitive-verified — no code change needed for H2. Document this in the sub-issue.

**Augment Step 11.5** — add `axe` extension run:
> In addition to Chrome DevTools' built-in audit, run the **`axe` Chrome extension** (or `@axe-core/react` if integrated). Built-in DevTools misses alpha-blended contrast cases (e.g., `text-tertiary` on `bg-secondary/40`); `axe` catches them. Document any failures + fixes.

### Task 12 (PR 12) — Empty State + Motion + Typography

**Drop reactbits references** from Step 12.3. The motion-token sweep is pure framer-motion + CSS adjustments. Specifically:
- Suggestion-chip press feedback in `ChatHome`: keep the existing CSS `transition-[transform,...]` pattern, no reactbits effect needed.
- Any other "reactbits effect" planned for chat surfaces: replace with a CSS or framer-motion equivalent.

### Task 13 (PR 13) — Streaming Cursor + Tool Result Entrance + Dark-Mode Sweep

**Step 13.3** unchanged — `StreamingCursor` is already CSS-only. Drop any "reactbits-backed" framing in commit body / Linear comment.

**Insert new Step 13.6.0 before Step 13.6:**
> **Step 13.6.0: Pre-sweep triage.**
> Before walking all 22 tool-result components, do a 30-minute screenshot pass:
> ```bash
> bun dev:app
> # Open http://localhost:3000/dev/tool-results/ in dark mode
> # Cycle through every fixture, screenshot
> # Switch to light mode, repeat
> ```
> Identify the visibly-off components (likely 4–6, not 22). Sweep ONLY those. Defer the rest to a follow-up sub-issue with the screenshot evidence. **Saves 1–2 days of perfect-is-the-enemy-of-good time.** The spec §5 trim plan already authorizes this; PR 13 formalizes it.

## 5. Per-PR smoke protocol additions

Append to spec §9 (per-PR smoke protocol) and plan Conventions §4:

> **Step 9: Empty/loading/error coverage** — verify (a) empty thread (no messages — currently shows just a spinner; should be empty-state-aware), (b) thread loading skeleton (`messages === undefined`), (c) thread load error (failed to fetch), (d) all-messages-errored edge. Especially required for PR 2 (streaming/scroll), PR 7 (sidebar), and PR 11 (a11y).

## 6. Animation strategy (replaces spec §8)

**Replace the entire `reactbits (selective, install in PR 1)` subsection** of spec §8 with:

> ### reactbits (DROPPED — Revision 1)
> Reactbits is not used in this polish pass. The aesthetic mismatch (animated backgrounds, decrypt text, WebGL splash, overshoot springs) violates Set 1B's productivity restraint. All planned reactbits roles are covered by:
> - **Streaming cursor (A5):** CSS `@keyframes sp-cursor-pulse` (PR 13)
> - **Suggestion-chip press feedback:** existing `transition-[transform,...]` CSS in `ChatHome` (no change needed)
> - **Tool result entrance (B5):** `motion.div` with `layout` (PR 13)
>
> Reactbits is reserved for marketing-site contexts where its phenotype is appropriate.

The framer-motion section, motion tokens, and "Banned categorically" list **stay as written**. The "Spring overshoot capped at ~5%" rule still applies to all framer-motion and CSS animations.

## 7. Risks (replaces spec §10 risks)

**Drop:** "reactbits + Next 16 + Tailwind v4 compat" risk — no longer relevant.

**Replace:** "Syntax-highlighting bundle weight" risk with:
> **Streamdown bundle weight.** Streamdown lazy-loads its code/mermaid/math splits, so delivered bundle is ≤ rehype-highlight for text-only messages. Concrete gate in PR 5 Step 5.6: chat-route bundle >+60KB gzipped → fail PR. Mitigation: force lazy-load of code component via `<Streamdown components={{ code: lazy(...) }}>`. **½-day theming cost (mapping shadcn CSS vars to moss palette) is the real adoption cost, not bundle.**

**Update:** "Open questions for PR 1 to resolve":
- Drop: `rehype-highlight` vs `shiki` — moot with streamdown.
- Drop: reactbits compat — dropped.
- Add: streamdown integration smoke (Tailwind `@source`, CSS var mapping in dark + light).
- Update: "Backend cancel pathway" → "`@convex-dev/agent` public abort + `optimisticallySendMessage` API surfaces" (one combined probe).

## 8. Linear plumbing notes

Sub-issue creation (per task in plan §6) is unchanged. The avatar issue lookup (Task 4 prereq, located in PR 1 Step 1.3) is unchanged.

When commenting on the parent CROWDEV-329 at start of execution, reference this revision: "External research review applied — see Revision 1 doc for overrides on top of original spec/plan."

## 9. Acceptance for CROWDEV-329 closure (additions)

Per spec §9 closure criteria, also verify:
- [ ] No raw `@radix-ui/*` imports landed (`grep -rn "@radix-ui" apps/app/src` returns empty).
- [ ] No `reactbits` import landed (`grep -rn "reactbits" apps/app/src apps/app/package.json` returns empty).
- [ ] `streamdown` is the only markdown rendering path in chat (`grep -rn "react-markdown" apps/app/src/components/chat` returns empty post-PR-5).
- [ ] `use-stick-to-bottom` is used; no hand-rolled `useStickToBottom.ts` content.

## Document trail

- **Spec (original):** `docs/superpowers/specs/2026-04-30-crowdev-329-agentic-chat-polish-design.md` (commit `42c70d7`)
- **Plan (original):** `docs/superpowers/plans/2026-04-30-crowdev-329-agentic-chat-polish.md` (commit `f00814e`)
- **Revision 1 (this doc):** `docs/superpowers/specs/2026-04-30-crowdev-329-agentic-chat-polish-revision-1.md` (commit TBD)

**Read all three.** Treat overrides here as authoritative.

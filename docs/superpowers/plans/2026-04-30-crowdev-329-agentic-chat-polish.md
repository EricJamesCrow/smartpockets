# Agentic Chat Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 13-PR core polish stack (+3 stretch) on the SmartPockets agentic chat per spec at `docs/superpowers/specs/2026-04-30-crowdev-329-agentic-chat-polish-design.md`. Demo-able to a friend without apologizing — portfolio-centerpiece grade — within ~10 business days.

**Architecture:** Sequential Graphite stack of 13 PRs, each one logical polish unit, each shipping independently with passing CI and a green Vercel preview. Dark-mode-first acceptance on every PR. Animation split: framer-motion (already installed, primary) + reactbits (new dep, selective) per spec §8. New components go in `apps/app/src/components/chat/` and `apps/app/src/components/chat/sidebar/`; new hooks in `apps/app/src/lib/hooks/`; new icon map in `apps/app/src/lib/icons/`; new motion tokens in `apps/app/src/app/globals.css`.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, `@convex-dev/agent ^0.3.2` (streaming + threads), `motion ^12` (framer-motion, already installed), `reactbits` (PR 1 install — fallback to framer-motion if compat fails), `rehype-highlight` or `shiki` (PR 1 decision based on bundle weight + theme fit), `react-markdown ^10`, `remark-gfm ^4`, Clerk (avatars), `@untitledui/icons`, `convex-helpers/react/cache/hooks`, Bun (package manager), Graphite (`gt`) for stacked PRs.

**Spec reference:** All section numbers like `§4.7` refer to the design spec. Item IDs (A1, B2, etc.) are defined in spec §5.

**Linear parent:** [CROWDEV-329](https://linear.app/crowdevelopment/issue/CROWDEV-329).

---

## File Structure

### New files
| Path | Responsibility | Created in PR |
|---|---|---|
| `apps/app/src/lib/icons/toolIconMap.ts` | `Record<ToolName, IconComponent>` mapping for tool-call display | 1 |
| `apps/app/src/lib/hooks/useStickToBottom.ts` | `{ isAtBottom, scrollToBottom, onScroll }` for `MessageList` | 2 |
| `apps/app/src/components/chat/ScrollToBottomButton.tsx` | Floating CTA, framer-motion enter/exit | 2 |
| `apps/app/src/components/chat/StopButton.tsx` | Stop button used by `MessageActionMinimal` while streaming | 3 |
| `apps/app/src/components/chat/UserAvatar.tsx` | Clerk image with initials fallback | 4 |
| `apps/app/src/components/chat/AssistantAvatar.tsx` | Moss-aesthetic mark, used in bubble + actions row | 4 |
| `apps/app/src/components/chat/CodeBlock.tsx` | Syntax-highlighted code block with copy + language label | 5 |
| `apps/app/src/components/chat/sidebar/ChatHistoryGroup.tsx` | Time-bucket section for sidebar history | 7 |
| `apps/app/src/components/chat/sidebar/ChatHistoryItem.tsx` | Sidebar row with kebab menu + active highlight | 7 |
| `apps/app/src/components/chat/sidebar/RenameThreadDialog.tsx` | Inline-edit popover for renaming threads | 8 |
| `apps/app/src/components/chat/sidebar/DeleteThreadConfirm.tsx` | Confirm dialog before `deleteThread` | 8 |
| `apps/app/src/components/chat/StreamingCursor.tsx` | Calm tail cursor (reactbits-backed) | 13 |
| `apps/app/src/components/chat/MessageTimestamp.tsx` | Hover-revealed timestamp | 15 (stretch) |

### Modified files
| Path | What changes | PR(s) |
|---|---|---|
| `apps/app/package.json` | Add `reactbits`, `rehype-highlight` (or `shiki`); maybe pin versions | 1 |
| `apps/app/src/app/globals.css` | Add motion tokens to `:root` | 1 |
| `apps/app/src/components/chat/MessageList.tsx` | Adopt `useStickToBottom`, drop optimistic-prompt parallel block, render scroll-to-bottom slot | 2 |
| `apps/app/src/components/chat/ChatView.tsx` | Move optimistic-prompt write to a single source; expose `isLoading`, `onStop` to input | 2, 3 |
| `apps/app/src/components/chat/MessageActionMinimal.tsx` | Cmd+Enter, Esc handling, autofocus return, 44px touch target, stop-button mode toggle | 3, 9, 10 |
| `apps/app/src/components/chat/MessageBubble.tsx` | Replace "You"/"SP" disks with `UserAvatar`/`AssistantAvatar`; (stretch) timestamp slot | 4, 15 |
| `apps/app/src/components/chat/MessageActions.tsx` | Use `AssistantAvatar` glyph for actions row consistency | 4 |
| `apps/app/src/components/chat/MarkdownContent.tsx` | Wire `rehype-highlight` plugin; pass through `CodeBlock`; add table styles | 5 |
| `apps/app/src/components/chat/ToolCallDisplay.tsx` | Add `summary?: ReactNode \| string` and `icon?: IconComponent` props; refactor expanded JSON viewer | 6 |
| `apps/app/src/components/chat/tool-results/ToolResultRenderer.tsx` | Pass per-tool icon and summary into `ToolCallDisplay` fallback | 6 |
| `apps/app/src/components/chat/ToolErrorRow.tsx` | Inline retry / settings link recovery | 14 (stretch) |
| `apps/app/src/components/application/dashboard-sidebar.tsx` | Replace inline thread mapping with `ChatHistoryGroup` + `ChatHistoryItem`; wire `renameThread`/`deleteThread` mutations | 7, 8 |
| `apps/app/src/components/chat/ChatBanner.tsx` | Fix dismiss-button hover bg | 10 |
| `apps/app/src/components/chat/ChatHome.tsx` | Suggestion variety + categories | 12 |
| `packages/backend/convex/agent/threads.ts` | Add cancel mutation **only** if PR 1 probe finds none | 3 |

### Deleted files
| Path | Reason |
|---|---|
| `apps/app/src/components/chat/ThreadItem.tsx` | Orphaned 12-line stub, replaced by `sidebar/ChatHistoryItem.tsx` | 7 |

---

## Conventions Applied to Every Task

These apply to every task. Not repeated in each task body.

1. **Linear sub-issue creation.** At the start of each task, create a Linear sub-issue under [CROWDEV-329](https://linear.app/crowdevelopment/issue/CROWDEV-329) using the Linear MCP `save_issue` tool. Title format: `Chat polish — <PR title>`. Capture the returned ID (e.g., `CROWDEV-NNN`).

2. **Graphite branch.** Create the branch with `gt create <linear-branch-name> -m "<commit subject>"`. Use the Linear-generated branch name when available. If the previous task in the stack hasn't been submitted, this branch stacks on top. **Never** use raw `git branch` / `git push`.

3. **Atomic commits.** Per CLAUDE.md, each commit is one logical change, working state, describable in one sentence, safely revertable. Commit message format:
   ```
   <type>(<scope>): <description under 50 chars>

   [optional body]

   Refs CROWDEV-NNN

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```
   The final stretch PR (or whichever PR closes CROWDEV-329) uses `Fixes CROWDEV-329` instead of `Refs`.

4. **Per-PR smoke protocol.** Before `gt submit`, run the 8-step smoke from spec §9:
   1. Visual smoke (dark first, then light) — capture before/after screenshots if PR is visible
   2. Streaming smoke — full cycle: send → tokens → tool call → result → done. Verify scroll, stop, error
   3. Mobile smoke — Chrome DevTools iPhone 14 viewport
   4. Keyboard-only smoke — Tab order, focus rings, Enter/Cmd+Enter
   5. Screen-reader spot-check — VoiceOver `aria-live`, `aria-busy`, `aria-expanded`
   6. `bun typecheck && bun lint` (workspace-aware)
   7. Vercel preview check — `gh pr checks <PR_NUMBER>` after `gt submit`
   8. Regression: load `/credit-cards`, `/transactions`, `/settings`

5. **Submit + verify.** `gt submit --stack` (first PR) or `gt submit` (subsequent). After submit:
   ```bash
   gh pr checks <PR_NUMBER>
   ```
   If `Vercel – smartpockets-app` fails, run `npx vercel inspect <DEPLOYMENT_URL> --logs` and fix before continuing.

6. **Linear comment.** After `gt submit`, post a comment on the sub-issue with the **Graphite PR link** (primary), Vercel preview URL (secondary), summary of changes, and verification status.
   - Graphite link format: `https://app.graphite.com/github/pr/EricJamesCrow/smartpockets/<PR_NUMBER>`

7. **Dark mode is primary.** Visual verification starts in dark mode for every PR. Light mode reaches functional parity (no broken layouts, no contrast failures) by end of same PR. No "polish dominant theme later" allowed.

8. **Token discipline.** Use existing tokens (`bg-primary`, `text-primary`, `--sp-moss-line`, `--sp-moss-mint`, `--sp-moss-line-strong`, `--sp-surface-panel-strong`, `--sp-fraunces-accent`, the new motion tokens from PR 1) — no hardcoded hex colors or ad-hoc durations.

9. **TODO.md.** Check off each item in TODO.md after completing the corresponding work, and add new items discovered during execution.

---

## Task 1: PR 1 — Foundations (deps + icon map + motion tokens + probes)

**Goal:** Land all dependencies, the per-tool icon map, motion tokens, and resolve four open questions from spec §10. No behavior change to the chat itself.

**Files:**
- Create: `apps/app/src/lib/icons/toolIconMap.ts`
- Modify: `apps/app/package.json`, `apps/app/src/app/globals.css`

### Steps

- [ ] **Step 1.1: Create Linear sub-issue.**
  Use Linear MCP `save_issue`:
  ```
  Title: Chat polish — Foundations (deps, icon map, motion tokens, probes)
  Description: PR 1 of CROWDEV-329 stack. Adds reactbits + syntax-highlighting deps, per-tool icon map, motion tokens. Probes: backend cancel pathway, existing Linear avatar issue, reactbits compat, rehype-highlight vs shiki.
  Parent: CROWDEV-329
  Team: CrowDevelopment, LLC
  Project: SmartPockets
  ```
  Capture the returned ID as `<ISSUE_ID>`. Below referred to as `CROWDEV-330` (placeholder — replace with actual).

- [ ] **Step 1.2: Probe — backend cancel pathway.**
  Search the Convex agent module for cancel/stop primitives:
  ```bash
  grep -rn "cancel\|stop\|abort" packages/backend/convex/agent/ | head -30
  ```
  Also check `@convex-dev/agent` source if installed:
  ```bash
  find node_modules/@convex-dev/agent -name "*.d.ts" | xargs grep -l "cancel\|abort" 2>/dev/null | head
  ```
  Document the finding in the Linear sub-issue as a comment (yes/no, and which API). If absent, note that PR 3 will add a small mutation.

- [ ] **Step 1.3: Probe — locate existing Linear avatar issue.**
  Use Linear MCP `list_issues` with `query: "avatar"` filtered to project SmartPockets:
  ```
  list_issues(project: "SmartPockets", query: "avatar", limit: 20)
  ```
  Identify the issue covering "user profile picture in chat log." Note its ID (e.g., `CROWDEV-NNN`) — used in PR 4. Comment the ID on the PR-1 sub-issue.

- [ ] **Step 1.4: Probe — reactbits compat smoke.**
  Install reactbits and `rehype-highlight` as a smoke test:
  ```bash
  cd apps/app && bun add reactbits rehype-highlight
  ```
  Then add a trivial reactbits import to verify Next 16 + Tailwind v4 + Turbopack compat. Create temporary file:
  ```tsx
  // apps/app/src/components/chat/_reactbits-smoke.tsx
  "use client";
  // Pick any small reactbits effect — confirm it imports + tree-shakes cleanly.
  // Refer to https://reactbits.dev for current export names.
  // Example (verify exact name on the docs):
  // import { ShinyText } from "reactbits/text";
  export function ReactBitsSmoke() {
    return <span>reactbits import works</span>;
  }
  ```
  Run `bun typecheck` and `bun build` to confirm no compile errors. Delete the file after verification.

- [ ] **Step 1.5: Decide rehype-highlight vs shiki.**
  Compare bundle size for the curated language set (`json, ts, sql, py, sh, bash`):
  ```bash
  cd apps/app && bun pm ls rehype-highlight && bun add shiki && bun pm ls shiki && bun remove shiki
  ```
  Default decision: `rehype-highlight` (~30KB, simpler). If a moss-tuned theme is unavailable in `highlight.js` themes, switch to `shiki`. Document the decision in the Linear sub-issue.
  - If sticking with `rehype-highlight`: `bun add rehype-highlight` is already done from Step 1.4 (or run it now if removed).
  - If switching to `shiki`: `bun remove rehype-highlight && bun add shiki`.

- [ ] **Step 1.6: Probe — `renameThread` / `deleteThread` mutation stability.**
  Read the implementation:
  ```bash
  grep -A 20 "renameThread\|deleteThread" packages/backend/convex/agent/threads.ts
  ```
  Verify both: (a) take only required args (no `userId`), (b) check viewer authorization, (c) return cleanly. Document any concerns in the Linear sub-issue.

- [ ] **Step 1.7: Add motion tokens to globals.css.**
  Open `apps/app/src/app/globals.css` and add the four motion tokens to the `:root` block (after the existing `--sp-microcopy` token at line 48):
  ```css
      /* Motion timing tokens (CROWDEV-329 PR 1).
       * Use across chat surfaces and elsewhere where motion is intentional.
       * Spring overshoot capped at ~5% — antithesis of bouncy.
       */
      --sp-motion-fast: 150ms;   /* button press, hover state changes */
      --sp-motion-base: 220ms;   /* banner, dialog, sidebar item */
      --sp-motion-slow: 320ms;   /* large layout — rare in chat */
      --sp-ease-productive: cubic-bezier(0.32, 0.72, 0, 1);
  ```

- [ ] **Step 1.8: Create per-tool icon map.**
  Create `apps/app/src/lib/icons/toolIconMap.ts`:
  ```ts
  // Per-tool icon map for chat tool-call display.
  // Used by ToolCallDisplay (generic fallback) and ToolResultRenderer
  // when a richer per-tool icon is desired over Settings01.
  //
  // Tool names mirror those in apps/app/src/components/chat/tool-results/types.ts.
  import {
      BarChart01,
      CreditCard02,
      File05,
      Receipt,
      Settings01,
      Bell01,
      Tag01,
      ClockFastForward,
      Edit05,
      Trash01,
  } from "@untitledui/icons";
  import type { ComponentType, SVGProps } from "react";

  export type ToolIcon = ComponentType<SVGProps<SVGSVGElement>>;

  export const toolIconMap: Record<string, ToolIcon> = {
      // Read tools
      list_credit_cards: CreditCard02,
      get_credit_card: CreditCard02,
      get_credit_card_detail: CreditCard02,
      list_accounts: File05,
      get_account_detail: File05,
      list_transactions: Receipt,
      get_transaction_detail: Receipt,
      get_spend_by_category: BarChart01,
      get_spend_over_time: BarChart01,
      get_upcoming_statements: ClockFastForward,
      list_reminders: Bell01,
      list_deferred_interest_promos: Tag01,
      list_installment_plans: Tag01,
      // Proposal tools
      propose_transaction_update: Edit05,
      propose_bulk_transaction_update: Edit05,
      propose_credit_card_metadata_update: Edit05,
      propose_manual_promo: Tag01,
      propose_reminder_create: Bell01,
      propose_reminder_delete: Trash01,
      get_proposal: Edit05,
  };

  export function getToolIcon(toolName: string): ToolIcon {
      return toolIconMap[toolName] ?? Settings01;
  }
  ```

- [ ] **Step 1.9: Verify icons exist in @untitledui/icons.**
  ```bash
  grep -E "BarChart01|CreditCard02|File05|Receipt|Bell01|Tag01|ClockFastForward|Edit05|Trash01" node_modules/@untitledui/icons/dist/types/index.d.ts | head -20
  ```
  If any name is wrong, replace with the closest existing icon (check `node_modules/@untitledui/icons/dist/types/index.d.ts` for the canonical export list). Update the import block in `toolIconMap.ts` accordingly.

- [ ] **Step 1.10: Typecheck + lint.**
  ```bash
  bun typecheck && bun lint
  ```
  Expected: no errors. Fix anything that surfaces.

- [ ] **Step 1.11: Commit deps + tokens + icon map.**
  ```bash
  git add apps/app/package.json apps/app/src/app/globals.css apps/app/src/lib/icons/toolIconMap.ts
  ```
  If the lockfile is updated, also stage `bun.lock` / `bun.lockb`. Then use `gt create` to make the branch and commit in one shot. The commit subject is `chore(chat): foundations — deps, icon map, motion tokens`. Body explains the additions and notes that probes are documented as comments on the sub-issue. End with `Refs CROWDEV-330` and the `Co-Authored-By: Claude <noreply@anthropic.com>` line.

- [ ] **Step 1.12: Submit PR via Graphite.**
  ```bash
  gt submit --stack
  ```
  Capture the PR number printed by Graphite. Below referred to as `<PR_1_NUMBER>`.

- [ ] **Step 1.13: Verify Vercel preview check.**
  ```bash
  gh pr checks <PR_1_NUMBER>
  ```
  Expected: all checks green. If `Vercel – smartpockets-app` fails:
  ```bash
  npx vercel inspect <DEPLOYMENT_URL> --logs
  ```
  Fix and create a NEW commit (per CLAUDE.md — never amend after hook failure).

- [ ] **Step 1.14: Linear comment on sub-issue.**
  Use Linear MCP `save_comment`:
  ```
  issueId: CROWDEV-330
  body: |
    PR 1 (foundations) submitted: [Graphite PR](https://app.graphite.com/github/pr/EricJamesCrow/smartpockets/<PR_1_NUMBER>) · [Vercel preview](<URL_FROM_PR_CHECKS>)

    **Probes resolved:**
    - Backend cancel pathway: <yes/no, which API>
    - Existing avatar issue: <CROWDEV-NNN>
    - reactbits compat: <pass/fail; if fail, fallback strategy>
    - rehype-highlight vs shiki: <decision + reason>
    - renameThread/deleteThread: <stable/concerns>

    Smoke protocol passed (typecheck, lint, Vercel preview). No visible behavior change.
  ```

---

## Task 2: PR 2 — Streaming + Scroll Polish (A4, A2, A1)

**Goal:** Fix the optimistic-prompt flicker (A4), stop fighting user scroll (A2), and add the floating scroll-to-bottom button (A1). All three live in `MessageList` / `ChatView` and ship as one PR for review coherence.

**Files:**
- Create: `apps/app/src/lib/hooks/useStickToBottom.ts`, `apps/app/src/components/chat/ScrollToBottomButton.tsx`
- Modify: `apps/app/src/components/chat/MessageList.tsx`, `apps/app/src/components/chat/ChatView.tsx`

### Steps

- [ ] **Step 2.1: Create Linear sub-issue.**
  Title: `Chat polish — Streaming + scroll polish (A1, A2, A4)`. Parent: CROWDEV-329. Capture `<ISSUE_ID>`.

- [ ] **Step 2.2: Create branch via Graphite.**
  ```bash
  gt create CROWDEV-NNN-chat-streaming-scroll
  ```

- [ ] **Step 2.3: Create `useStickToBottom` hook.**
  Create `apps/app/src/lib/hooks/useStickToBottom.ts`:
  ```ts
  "use client";

  import { useCallback, useEffect, useRef, useState, type RefObject, type UIEvent } from "react";

  // Threshold (px) for "at bottom" — small enough to feel correct,
  // large enough to forgive subpixel scroll positioning.
  const AT_BOTTOM_THRESHOLD = 24;

  export interface UseStickToBottomResult {
      isAtBottom: boolean;
      scrollToBottom: () => void;
      onScroll: (e: UIEvent<HTMLDivElement>) => void;
  }

  /**
   * Tracks whether a scroll container is at the bottom and exposes a
   * scroll-to-bottom action. Use in chat-style logs where you want to
   * auto-scroll only when the user is following the tail.
   */
  export function useStickToBottom(
      containerRef: RefObject<HTMLDivElement | null>,
  ): UseStickToBottomResult {
      const [isAtBottom, setIsAtBottom] = useState(true);
      const lastScrollTop = useRef(0);

      const compute = useCallback(() => {
          const node = containerRef.current;
          if (!node) return;
          const distanceFromBottom = node.scrollHeight - (node.scrollTop + node.clientHeight);
          setIsAtBottom(distanceFromBottom <= AT_BOTTOM_THRESHOLD);
      }, [containerRef]);

      const onScroll = useCallback(
          (_e: UIEvent<HTMLDivElement>) => {
              compute();
          },
          [compute],
      );

      const scrollToBottom = useCallback(() => {
          const node = containerRef.current;
          if (!node) return;
          node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
      }, [containerRef]);

      // Recompute on mount + when container size changes.
      useEffect(() => {
          compute();
      }, [compute]);

      return { isAtBottom, scrollToBottom, onScroll };
  }
  ```

- [ ] **Step 2.4: Create `ScrollToBottomButton`.**
  Create `apps/app/src/components/chat/ScrollToBottomButton.tsx`:
  ```tsx
  "use client";

  import { ArrowDown } from "@untitledui/icons";
  import { AnimatePresence, motion } from "motion/react";
  import { cx } from "@/utils/cx";

  interface ScrollToBottomButtonProps {
      visible: boolean;
      onClick: () => void;
      className?: string;
  }

  export function ScrollToBottomButton({ visible, onClick, className }: ScrollToBottomButtonProps) {
      return (
          <AnimatePresence>
              {visible && (
                  <motion.button
                      type="button"
                      onClick={onClick}
                      aria-label="Scroll to latest message"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                      className={cx(
                          "absolute bottom-4 left-1/2 z-10 -translate-x-1/2",
                          "flex size-9 items-center justify-center rounded-full",
                          "border border-secondary bg-primary shadow-md",
                          "transition-colors hover:bg-secondary",
                          "dark:border-[var(--sp-moss-line-strong)] dark:bg-[var(--sp-surface-panel-strong)] dark:hover:border-white/20",
                          className,
                      )}
                  >
                      <ArrowDown className="size-4 text-secondary" />
                  </motion.button>
              )}
          </AnimatePresence>
      );
  }
  ```

- [ ] **Step 2.5: Refactor `MessageList` — drop optimistic-prompt parallel block, adopt `useStickToBottom`, render the button.**
  Edit `apps/app/src/components/chat/MessageList.tsx`. The new file is roughly:
  ```tsx
  "use client";

  import { useEffect, useRef } from "react";
  import { useQuery } from "convex-helpers/react/cache/hooks";
  import { api } from "@convex/_generated/api";
  import type { Doc, Id } from "@convex/_generated/dataModel";
  import { MessageBubble } from "@/components/chat/MessageBubble";
  import { ScrollToBottomButton } from "@/components/chat/ScrollToBottomButton";
  import { useStickToBottom } from "@/lib/hooks/useStickToBottom";

  type AgentMessage = Doc<"agentMessages">;

  interface MessageListProps {
      threadId: Id<"agentThreads"> | null;
      onMessagesLoaded?: () => void;
      onRegenerate?: (message: AgentMessage) => Promise<void> | void;
  }

  export function MessageList({ threadId, onMessagesLoaded, onRegenerate }: MessageListProps) {
      const containerRef = useRef<HTMLDivElement | null>(null);
      const { isAtBottom, scrollToBottom, onScroll } = useStickToBottom(containerRef);

      const messages = useQuery(
          api.agent.threads.listMessages,
          threadId ? { threadId } : "skip",
      ) as AgentMessage[] | undefined;

      // Only auto-scroll when the user is already at the bottom.
      useEffect(() => {
          if (!isAtBottom) return;
          scrollToBottom();
      }, [messages?.length, isAtBottom, scrollToBottom]);

      // Notify parent when messages have arrived (used to clear optimistic prompt).
      useEffect(() => {
          if (messages && onMessagesLoaded) onMessagesLoaded();
      }, [messages, onMessagesLoaded]);

      if (!threadId) return null;

      if (messages === undefined) {
          return (
              <div className="flex flex-1 items-center justify-center">
                  <div className="size-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              </div>
          );
      }

      return (
          <div className="relative flex flex-1 flex-col overflow-hidden">
              <div
                  ref={containerRef}
                  onScroll={onScroll}
                  role="log"
                  aria-live="polite"
                  className="flex-1 space-y-6 overflow-y-auto px-4 py-6 md:px-8"
              >
                  {messages.map((message) => (
                      <MessageBubble
                          key={message._id}
                          message={message}
                          threadId={threadId}
                          onRegenerate={
                              onRegenerate && message.role === "assistant"
                                  ? () => onRegenerate(message)
                                  : undefined
                          }
                      />
                  ))}
              </div>
              <ScrollToBottomButton visible={!isAtBottom} onClick={scrollToBottom} />
          </div>
      );
  }
  ```
  **Note:** the `optimisticPrompt` prop and parallel render block are intentionally removed. The optimistic state is now owned by `ChatView` as a phantom message in the messages array.

- [ ] **Step 2.6: Refactor `ChatView` — single optimistic-prompt source.**
  Edit `apps/app/src/components/chat/ChatView.tsx`. Remove the `optimisticPrompt` state and replace with a derived approach. Once `sendMessage` resolves the new threadId, the reactive `messages` array supersedes any UI optimistic state.

  The key change in `ChatViewBody`:
  ```tsx
  const handleSend = async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;
      setIsLoading(true);
      setBanner(null);
      try {
          await sendMessage({ text: trimmed });
      } catch (err) {
          routeError(err);
      } finally {
          setIsLoading(false);
      }
  };

  return (
      <ChatContainer>
          {banner && <ChatBanner state={banner} onDismiss={() => setBanner(null)} />}
          {!threadId ? (
              <ChatHome onSend={handleSend} />
          ) : (
              <MessageList threadId={threadId} />
          )}
          <MessageInput onSend={handleSend} isLoading={isLoading} />
          {reconsent && (
              <ReconsentModal
                  plaidItemId={reconsent.plaidItemId}
                  onDismiss={() => setReconsent(null)}
              />
          )}
      </ChatContainer>
  );
  ```
  **Trade-off:** there's a brief moment between `sendMessage` resolving and the first `agentMessages` row arriving where the user sees the input clear and nothing else. This is acceptable because `sendMessage` returns only after the row is persisted. If empirically the gap shows, add a tiny `isLoading` spinner inside `MessageList`'s empty-state handling — defer to verification.

- [ ] **Step 2.7: Drop `optimisticPrompt` prop from `MessageList` callers.**
  Search for any remaining references:
  ```bash
  grep -rn "optimisticPrompt" apps/app/src/
  ```
  Remove the prop from any caller. Should be limited to `ChatView.tsx` from Step 2.6.

- [ ] **Step 2.8: Typecheck + lint.**
  ```bash
  bun typecheck && bun lint
  ```

- [ ] **Step 2.9: Local smoke — start dev server.**
  ```bash
  bun dev:app
  ```
  Open http://localhost:3000 in **dark mode** (system preference or app toggle). Send a message. Verify:
  - **A4 dedup:** no double user bubble, no double thinking-dots loader. Single, clean send.
  - **A2 scroll lock:** while assistant is streaming, scroll up. The view STAYS where you left it. New tokens are not yanking you back to bottom.
  - **A1 button:** while scrolled up, the floating ↓ button appears centered above the input. Click it — smooth scroll to bottom, button disappears.
  Then switch to light mode and repeat. Capture before/after screenshots if available.

- [ ] **Step 2.10: Mobile + a11y smoke.**
  - DevTools iPhone 14 viewport — verify same behavior, button positioning correct.
  - Tab to the button when visible — focus ring shows.
  - Screen reader: button announces as "Scroll to latest message".

- [ ] **Step 2.11: Regression spot-check.**
  Load `/credit-cards`, `/transactions`, `/settings` — confirm no chat changes bled into other pages.

- [ ] **Step 2.12: Commit + submit + Linear comment.**
  Commit subject: `feat(chat): streaming + scroll polish (A1, A2, A4)`. Submit with `gt submit`. Post Linear comment with Graphite PR link, Vercel preview, and a one-line "scroll-to-bottom + scroll lock + flicker dedup landed" summary.

---

## Task 3: PR 3 — Stop Button During Streaming (A3)

**Goal:** Replace the send button with a stop button while the assistant is streaming. Calls a Convex cancel mutation.

**Files:**
- Create: `apps/app/src/components/chat/StopButton.tsx`
- Modify: `apps/app/src/components/chat/MessageActionMinimal.tsx`, `apps/app/src/components/chat/MessageInput.tsx`, `apps/app/src/components/chat/ChatView.tsx`
- Conditional modify: `packages/backend/convex/agent/threads.ts` (only if PR 1 probe found no cancel primitive)

### Steps

- [ ] **Step 3.1: Linear sub-issue + branch.** Title: `Chat polish — Stop button during streaming (A3)`. `gt create CROWDEV-NNN-chat-stop-button`.

- [ ] **Step 3.2: Implement backend cancel mutation if missing.**
  Per PR 1 probe (Step 1.2). Two paths:
  - **(a) `@convex-dev/agent` already exposes a cancel primitive:** skip this step. Note the API (e.g., `agent.cancelRun(threadId)`) for use in Step 3.4.
  - **(b) No cancel primitive available:** add a small mutation. Edit `packages/backend/convex/agent/threads.ts`:
    ```ts
    export const cancelActiveRun = mutation({
        args: { threadId: v.id("agentThreads") },
        handler: async (ctx, { threadId }) => {
            const viewer = await getViewerOrThrow(ctx); // existing pattern
            const thread = await ctx.db.get(threadId);
            if (!thread) throw new Error("Thread not found");
            if (thread.userId !== viewer._id) throw new Error("Forbidden");
            // Implementation: mark the active run as cancelled in agentRuns
            // table (or wherever runs are tracked). The agent step loop must
            // honor the cancellation flag on its next iteration.
            const activeRun = await ctx.db
                .query("agentRuns")
                .withIndex("by_thread_active", (q) => q.eq("threadId", threadId).eq("active", true))
                .first();
            if (activeRun) {
                await ctx.db.patch(activeRun._id, { active: false, cancelledAt: Date.now() });
            }
            return null;
        },
    });
    ```
    **Caveat:** this is a sketch — adapt to the actual `agentRuns` schema. If `agentRuns` doesn't exist in this codebase, the cancellation mechanism needs to be designed around whatever the agent uses to track in-flight runs (likely a flag on `agentMessages` or a separate scheduled-functions handle). If the design grows beyond ½ day, **stop here**, comment on the Linear sub-issue with findings, and split A3 into a separate backend sub-issue. Skip the rest of Task 3 and ship the UI in a follow-up PR.

- [ ] **Step 3.3: Create `StopButton` component.**
  Create `apps/app/src/components/chat/StopButton.tsx`:
  ```tsx
  "use client";

  import { Square } from "@untitledui/icons";
  import { motion } from "motion/react";

  interface StopButtonProps {
      onStop: () => void;
      disabled?: boolean;
  }

  export function StopButton({ onStop, disabled }: StopButtonProps) {
      return (
          <motion.button
              type="button"
              onClick={onStop}
              disabled={disabled}
              aria-label="Stop generating"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
              className="flex size-9 items-center justify-center rounded-full bg-brand-solid text-white shadow-[0_4px_14px_rgba(127,184,154,0.25)] transition-all duration-150 disabled:opacity-40 hover:scale-[1.04] hover:brightness-110 active:scale-[0.96] active:brightness-95"
          >
              <Square className="size-4" />
          </motion.button>
      );
  }
  ```
  (If `Square` isn't in `@untitledui/icons`, substitute the closest stop-square glyph. Verify via the same grep as Step 1.9.)

- [ ] **Step 3.4: Wire up cancel mutation in `ChatView`.**
  Edit `apps/app/src/components/chat/ChatView.tsx`. Add a `handleStop` callback that calls the cancel mutation. Track `isStreaming` from the assistant message state (any message with `isStreaming === true` in the current thread):
  ```tsx
  const cancelActiveRun = useMutation(api.agent.threads.cancelActiveRun);
  // (or the existing public API discovered in Step 3.2)

  const isStreaming = (messages ?? []).some(
      (m) => m.role === "assistant" && m.isStreaming === true,
  );

  const handleStop = async () => {
      if (!threadId) return;
      try {
          await cancelActiveRun({ threadId });
      } catch (err) {
          console.error("[ChatView] cancel failed", err);
      }
  };
  ```
  Pass `isStreaming` and `onStop` to `MessageInput`.

- [ ] **Step 3.5: Update `MessageInput` to forward streaming flag + stop handler.**
  ```tsx
  interface MessageInputProps {
      onSend: (message: string) => Promise<void> | void;
      onStop?: () => void;
      isLoading?: boolean;       // request inflight (sending)
      isStreaming?: boolean;     // assistant currently streaming response
      disabled?: boolean;
  }

  export function MessageInput({ onSend, onStop, isLoading, isStreaming, disabled }: MessageInputProps) {
      return (
          <div className="bg-primary px-4 pb-6 pt-2 md:px-8">
              <div className="mx-auto max-w-4xl">
                  <MessageActionMinimal
                      onSubmit={onSend}
                      onStop={onStop}
                      isLoading={isLoading}
                      isStreaming={isStreaming}
                      disabled={disabled}
                      className="w-full"
                  />
                  <p className="sp-kicker mt-3 text-center text-tertiary dark:text-stone-500">
                      Assistant can make mistakes &middot; check important info
                  </p>
              </div>
          </div>
      );
  }
  ```

- [ ] **Step 3.6: Update `MessageActionMinimal` to swap send → stop while streaming.**
  Edit `apps/app/src/components/chat/MessageActionMinimal.tsx`. Add `onStop` and `isStreaming` props. Replace the send button with `<StopButton>` when `isStreaming === true`:
  ```tsx
  {isStreaming && onStop ? (
      <StopButton onStop={onStop} />
  ) : (
      <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label="Send"
          className={/* existing send button classes */}
      >
          <ArrowUp className="size-5" />
      </button>
  )}
  ```
  Add the import: `import { StopButton } from "@/components/chat/StopButton";`.

- [ ] **Step 3.7: Typecheck + lint.**
  ```bash
  bun typecheck && bun lint
  ```

- [ ] **Step 3.8: Streaming smoke (the critical verification).**
  Start dev server. Send a long-running query (e.g., one that triggers a tool call). While streaming:
  - Stop button appears in place of send.
  - Click stop → streaming halts. The assistant message is finalized with whatever has streamed so far.
  - After streaming stops, send button is back, input refocuses.
  - Edge case: rapid stop+send. Verify no orphaned state.
  - Edge case: stop with no active run (race). Verify the mutation is idempotent.

- [ ] **Step 3.9: Mobile + a11y + dark/light smoke.**
  Per the standard protocol. Stop button must be 44px on mobile (matches send-button update in PR 9, but ship 44px now to avoid regression).

- [ ] **Step 3.10: Commit + submit + Linear comment.**
  Stage all touched files. If Step 3.2 added a backend mutation, also stage `packages/backend/convex/agent/threads.ts`. Commit subject: `feat(chat): stop button during streaming (A3)`. Submit and comment on Linear.

---

## Task 4: PR 4 — User + Assistant Avatars (C1, C2)

**Goal:** Replace the "You" / "SP" disks with proper avatars. Ship the user's Clerk image with initials fallback (C1) and a single moss-aesthetic assistant glyph reused across bubble + actions row (C2). **Closes the existing Linear avatar issue identified in PR 1 with `Fixes <ID>`.**

**Files:**
- Create: `apps/app/src/components/chat/UserAvatar.tsx`, `apps/app/src/components/chat/AssistantAvatar.tsx`
- Modify: `apps/app/src/components/chat/MessageBubble.tsx`, `apps/app/src/components/chat/MessageActions.tsx`

### Steps

- [ ] **Step 4.1: Linear sub-issue + branch.** Title: `Chat polish — User + assistant avatars (C1, C2)`. **Move the existing avatar issue (located in PR 1) under CROWDEV-329 as a sub-issue** using Linear MCP `save_issue` with `parentId: CROWDEV-329`.

- [ ] **Step 4.2: Create `UserAvatar`.**
  Create `apps/app/src/components/chat/UserAvatar.tsx`:
  ```tsx
  "use client";

  import { useUser } from "@clerk/nextjs";
  import { useState } from "react";
  import { cx } from "@/utils/cx";

  interface UserAvatarProps {
      size?: "sm" | "md";
      className?: string;
  }

  function getInitials(name: string | undefined | null): string {
      if (!name) return "?";
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }

  const SIZE_CLASSES: Record<NonNullable<UserAvatarProps["size"]>, string> = {
      sm: "size-8 text-xs",
      md: "size-10 text-xs",
  };

  export function UserAvatar({ size = "md", className }: UserAvatarProps) {
      const { user } = useUser();
      const [imageError, setImageError] = useState(false);
      const showImage = Boolean(user?.imageUrl) && !imageError;

      const initials = getInitials(user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress);

      return (
          <div
              className={cx(
                  "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-solid font-semibold text-white",
                  SIZE_CLASSES[size],
                  className,
              )}
              aria-hidden
          >
              {showImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                      src={user!.imageUrl}
                      alt=""
                      className="size-full object-cover"
                      onError={() => setImageError(true)}
                  />
              ) : (
                  initials
              )}
          </div>
      );
  }
  ```

- [ ] **Step 4.3: Create `AssistantAvatar`.**
  Create `apps/app/src/components/chat/AssistantAvatar.tsx`:
  ```tsx
  "use client";

  import { cx } from "@/utils/cx";

  interface AssistantAvatarProps {
      size?: "sm" | "md";
      className?: string;
  }

  const SIZE_CLASSES: Record<NonNullable<AssistantAvatarProps["size"]>, string> = {
      sm: "size-8 text-xs",
      md: "size-10 text-xs",
  };

  export function AssistantAvatar({ size = "md", className }: AssistantAvatarProps) {
      return (
          <div
              className={cx(
                  "flex shrink-0 items-center justify-center rounded-full",
                  "border border-secondary bg-secondary text-primary",
                  "dark:border-[var(--sp-moss-line)] dark:bg-[var(--sp-surface-panel-strong)]",
                  SIZE_CLASSES[size],
                  className,
              )}
              aria-hidden
          >
              <span className="font-[family-name:var(--font-fraunces)] italic">SP</span>
          </div>
      );
  }
  ```
  (The "SP" italic disk is preserved as the moss-aesthetic mark. The P2 item I4 — moss-leaf glyph — supersedes this if shipped later.)

- [ ] **Step 4.4: Replace inline disks in `MessageBubble`.**
  Edit `apps/app/src/components/chat/MessageBubble.tsx`. Replace the inline avatar div (lines 110–121 of the current file) with:
  ```tsx
  import { UserAvatar } from "@/components/chat/UserAvatar";
  import { AssistantAvatar } from "@/components/chat/AssistantAvatar";

  // ... inside the rendered JSX:
  {isUser ? <UserAvatar /> : <AssistantAvatar />}
  ```

- [ ] **Step 4.5: Use `AssistantAvatar` in `MessageActions` (consistency).**
  The actions row currently has no avatar. To keep identity consistent, leave the actions row without an avatar (the bubble's avatar is enough — adding one to the actions row would create visual clutter). Skip this sub-step *unless* visual review reveals identity ambiguity; in that case, add a small `<AssistantAvatar size="sm" />` at the start of the actions row for assistant messages.

- [ ] **Step 4.6: Typecheck + lint + visual smoke.**
  ```bash
  bun typecheck && bun lint
  bun dev:app
  ```
  Verify in dark mode first:
  - User bubble shows the Clerk image (or initials fallback if no image).
  - Assistant bubble shows the "SP" italic disk styled with moss tokens.
  - On image load failure, fallback initials render correctly.
  - Test with a Clerk user that has no image set — initials path works.
  Then verify in light mode.

- [ ] **Step 4.7: Mobile smoke.** Avatar sizing is correct at viewport widths. No layout shift.

- [ ] **Step 4.8: Commit + submit.**
  Commit subject: `feat(chat): user + assistant avatars (C1, C2)`. The commit body must include `Fixes <AVATAR_ISSUE_ID>` (replace with the ID found in PR 1) AND `Refs CROWDEV-NNN` (the avatar PR sub-issue). Submit with `gt submit`.

- [ ] **Step 4.9: Linear comment + close avatar issue.**
  Comment on the avatar sub-issue: "Closed by [PR <N>](graphite link)." The `Fixes` keyword in the commit will auto-close on merge; comment for visibility.

---

## Task 5: PR 5 — Markdown Polish (C3, C4)

**Goal:** Make code blocks (C3) and markdown tables (C4) feel premium. Code blocks get syntax highlighting, copy button, language label. Tables get tabular-nums alignment, header divider, optional zebra rows.

**Files:**
- Create: `apps/app/src/components/chat/CodeBlock.tsx`, `apps/app/src/components/chat/code-block-theme.css`
- Modify: `apps/app/src/components/chat/MarkdownContent.tsx`

### Steps

- [ ] **Step 5.1: Linear sub-issue + branch.** Title: `Chat polish — Markdown polish (C3, C4)`. `gt create CROWDEV-NNN-chat-markdown`.

- [ ] **Step 5.2: Pick syntax-highlighting strategy.**
  Use the decision from PR 1, Step 1.5. The plan below assumes `rehype-highlight`. If you chose `shiki`, the integration differs (lazy `getHighlighter` inside `CodeBlock`); document the deltas inline in `CodeBlock`.

- [ ] **Step 5.3: Create `CodeBlock` component.**
  Create `apps/app/src/components/chat/CodeBlock.tsx`:
  ```tsx
  "use client";

  import { Copy01 } from "@untitledui/icons";
  import { useState, type ReactNode } from "react";
  import { cx } from "@/utils/cx";

  interface CodeBlockProps {
      language?: string;
      // Children come pre-highlighted from rehype-highlight (raw <code> with hljs spans).
      children?: ReactNode;
      // Plain string used for clipboard copy.
      raw: string;
  }

  export function CodeBlock({ language, children, raw }: CodeBlockProps) {
      const [copied, setCopied] = useState(false);

      const handleCopy = async () => {
          await navigator.clipboard.writeText(raw);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
      };

      return (
          <div
              className={cx(
                  "group/code relative my-3 overflow-hidden rounded-lg border border-secondary bg-primary",
                  "dark:border-[var(--sp-moss-line)] dark:bg-[var(--sp-surface-panel-strong)]",
              )}
          >
              <div
                  className={cx(
                      "flex items-center justify-between border-b border-secondary px-3 py-1.5 text-xs",
                      "dark:border-[var(--sp-moss-line)]",
                  )}
              >
                  <span className="font-[family-name:var(--font-geist-mono)] text-tertiary">
                      {language ?? "text"}
                  </span>
                  <button
                      type="button"
                      onClick={handleCopy}
                      aria-label="Copy code"
                      className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-tertiary transition-colors hover:bg-secondary"
                  >
                      <Copy01 className="size-3.5" />
                      <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
              </div>
              <pre className="overflow-x-auto px-4 py-3 text-xs leading-relaxed">
                  <code className="font-[family-name:var(--font-geist-mono)] text-primary">
                      {children}
                  </code>
              </pre>
          </div>
      );
  }
  ```

- [ ] **Step 5.4: Refactor `MarkdownContent`.**
  Edit `apps/app/src/components/chat/MarkdownContent.tsx`. Wire `rehype-highlight` and pass `<pre>` blocks through `CodeBlock`. Add table styles via `components` override:
  ```tsx
  "use client";

  import ReactMarkdown, { type Components } from "react-markdown";
  import remarkGfm from "remark-gfm";
  import rehypeHighlight from "rehype-highlight";
  import { CodeBlock } from "@/components/chat/CodeBlock";
  import { cx } from "@/utils/cx";
  import "@/components/chat/code-block-theme.css";

  interface MarkdownContentProps {
      content: string;
  }

  // Curated language list per spec §10. Lazy-loaded by rehype-highlight by
  // default, but we set the languages prop to keep the bundle predictable.
  const LANGUAGES = ["json", "ts", "tsx", "js", "jsx", "sql", "py", "sh", "bash"];

  const components: Components = {
      pre: ({ node, children, ...props }) => {
          const codeEl = (Array.isArray(children) ? children[0] : children) as
              | { props?: { className?: string; children?: unknown } }
              | undefined;
          const className = codeEl?.props?.className ?? "";
          const langMatch = /language-(\w+)/.exec(className);
          const language = langMatch?.[1];
          const raw = node && "children" in node && Array.isArray(node.children)
              ? extractText(node.children)
              : "";
          return (
              <CodeBlock language={language} raw={raw}>
                  {codeEl?.props?.children as React.ReactNode}
              </CodeBlock>
          );
      },
      table: ({ children, ...props }) => (
          <div className="my-3 overflow-x-auto">
              <table
                  className={cx(
                      "w-full text-sm border-collapse",
                      "[&_th]:py-2 [&_th]:px-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-tertiary [&_th]:text-xs [&_th]:uppercase",
                      "[&_td]:py-2 [&_td]:px-3 [&_td]:text-primary [&_td]:tabular-nums",
                      "[&_thead]:border-b [&_thead]:border-secondary",
                      "[&_tbody_tr]:border-t [&_tbody_tr]:border-secondary/60",
                      "dark:[&_thead]:border-[var(--sp-moss-line)] dark:[&_tbody_tr]:border-[var(--sp-moss-line)]",
                  )}
                  {...props}
              >
                  {children}
              </table>
          </div>
      ),
  };

  function extractText(nodes: unknown[]): string {
      return nodes
          .map((n) => {
              if (typeof n === "object" && n !== null && "value" in n && typeof (n as { value: unknown }).value === "string") {
                  return (n as { value: string }).value;
              }
              if (typeof n === "object" && n !== null && "children" in n && Array.isArray((n as { children: unknown }).children)) {
                  return extractText((n as { children: unknown[] }).children);
              }
              return "";
          })
          .join("");
  }

  export function MarkdownContent({ content }: MarkdownContentProps) {
      return (
          <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[[rehypeHighlight, { languages: LANGUAGES, ignoreMissing: true }]]}
                  components={components}
              >
                  {content}
              </ReactMarkdown>
          </div>
      );
  }
  ```

- [ ] **Step 5.5: Add code-block theme CSS.**
  Create `apps/app/src/components/chat/code-block-theme.css`. Two strategies:
  - **(a)** Use `highlight.js`'s GitHub themes gated by `.dark-mode` / `.light-mode`. Copy the rules from `node_modules/highlight.js/styles/github-dark.css` (gated to `.dark-mode .hljs ...`) and `github.css` (gated to `.light-mode`). Set both `.hljs` backgrounds to `transparent` so the `CodeBlock` panel shows through.
  - **(b)** Hand-tune a moss-aware theme. More work — only do this if (a) reads off in dark mode against the moss palette.
  Default: (a). Document the choice in the commit body.

- [ ] **Step 5.6: Visual smoke.**
  Run a test message through the chat that triggers a code block (e.g., "show me a JSON example") and a markdown table. Verify:
  - **Dark mode (primary):** code block has language label, copy button, syntax highlighting visible, monospace font, copy works.
  - **Light mode:** parity — readable, no contrast failures.
  - **Markdown table:** zebra-light row borders, tabular-nums alignment, no horizontal overflow on mobile (wrapper scrolls).

- [ ] **Step 5.7: Bundle weight check.**
  ```bash
  cd apps/app && bun run build
  ```
  Verify the chat route bundle hasn't grown more than ~50KB beyond pre-PR-5. If significantly over, switch to `shiki` (lazy-load) and rework `CodeBlock`. Document the bundle delta in the Linear sub-issue.

- [ ] **Step 5.8: Commit + submit.**
  Commit subject: `feat(chat): markdown polish — code blocks + tables (C3, C4)`. Submit with `gt submit`.

---

## Task 6: PR 6 — Tool Call Display (B1, B2, B3)

**Goal:** Make the generic-fallback `ToolCallDisplay` premium: rich collapsed summary (B1), per-tool icon (B2), better expanded JSON viewer (B3). Per-tool components are unchanged — this is the fallback path.

**Files:**
- Create: `apps/app/src/lib/chat/toolSummary.ts`
- Modify: `apps/app/src/components/chat/ToolCallDisplay.tsx`, `apps/app/src/components/chat/tool-results/ToolResultRenderer.tsx`

### Steps

- [ ] **Step 6.1: Linear sub-issue + branch.** Title: `Chat polish — Tool call display (B1, B2, B3)`.

- [ ] **Step 6.2: Add `summary` and `icon` props to `ToolCallDisplay`.**
  Edit `apps/app/src/components/chat/ToolCallDisplay.tsx`. New signature:
  ```tsx
  import type { ComponentType, SVGProps, ReactNode } from "react";

  interface ToolCallDisplayProps {
      toolName: string;
      input?: unknown;
      output?: unknown;
      error?: string;
      state: "input-streaming" | "input-available" | "output-available" | "output-error";
      summary?: ReactNode | string;
      icon?: ComponentType<SVGProps<SVGSVGElement>>;
  }
  ```
  Use `summary` (when provided) inside the collapsed header in place of just `toolName`. Use `icon` (or fallback `Settings01`) for the leading glyph.

- [ ] **Step 6.3: Build the collapsed header layout.**
  Inside the existing button:
  ```tsx
  const Icon = icon ?? Settings01;
  // ...
  <button onClick={() => setIsExpanded(!isExpanded)} aria-expanded={isExpanded} aria-controls={`tool-${toolName}-content`} className="...">
      {isExpanded ? <ChevronDown ... /> : <ChevronRight ... />}
      <Icon className="size-4 text-tertiary" />
      <div className="flex flex-1 items-center gap-2">
          <span className="font-medium text-secondary">{toolName.replace(/_/g, " ")}</span>
          {summary && (
              <>
                  <span className="text-quaternary">·</span>
                  <span className="truncate text-tertiary">{summary}</span>
              </>
          )}
      </div>
      {/* status icon stays */}
  </button>
  ```

- [ ] **Step 6.4: Build the expanded JSON viewer.**
  Replace the existing `<pre>{JSON.stringify(...)}</pre>` blocks with a small viewer that has monospace text and copy buttons. Defer fancy collapsibility — focus on monospace + copy:
  ```tsx
  function JsonView({ label, value }: { label: string; value: unknown }) {
      const [copied, setCopied] = useState(false);
      const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);

      const handleCopy = async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
      };

      return (
          <div className="space-y-1">
              <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-tertiary">{label}</p>
                  <button
                      type="button"
                      onClick={handleCopy}
                      aria-label={`Copy ${label.toLowerCase()}`}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-tertiary hover:bg-secondary"
                  >
                      <Copy01 className="size-3" />
                      <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
              </div>
              <pre className="max-h-64 overflow-auto rounded bg-secondary p-2 font-[family-name:var(--font-geist-mono)] text-xs text-secondary">
                  {text}
              </pre>
          </div>
      );
  }
  ```
  Use it inside the expanded panel:
  ```tsx
  {isExpanded && (
      <div id={`tool-${toolName}-content`} className="space-y-2 border-t border-secondary px-3 pb-3 pt-2">
          {input !== undefined && <JsonView label="Input" value={input} />}
          {output !== undefined && output !== null && <JsonView label="Output" value={output} />}
          {error && (
              <div>
                  <p className="text-xs font-medium text-tertiary">Error</p>
                  <p className="text-xs text-error-primary">{error}</p>
              </div>
          )}
      </div>
  )}
  ```

- [ ] **Step 6.5: Wire `ToolResultRenderer` to pass icon + summary into the fallback.**
  Edit `apps/app/src/components/chat/tool-results/ToolResultRenderer.tsx`. The fallback branch becomes:
  ```tsx
  import { getToolIcon } from "@/lib/icons/toolIconMap";
  import { deriveSummary } from "@/lib/chat/toolSummary";

  return (
      <ToolCallDisplay
          toolName={toolName}
          input={props.input}
          output={props.output ?? undefined}
          error={errorText}
          state={state}
          icon={getToolIcon(toolName)}
          summary={deriveSummary(toolName, props.output)}
      />
  );
  ```

- [ ] **Step 6.6: Create `deriveSummary` helper.**
  Create `apps/app/src/lib/chat/toolSummary.ts`:
  ```ts
  /**
   * Derive a short collapsed-header summary from a tool's output. Returns
   * undefined for tools where the rich tool-result component is the right
   * UI — generic fallback path only.
   */
  export function deriveSummary(toolName: string, output: unknown): string | undefined {
      if (!output || typeof output !== "object") return undefined;
      const o = output as Record<string, unknown>;

      if (Array.isArray(o.ids)) {
          const n = (o.ids as unknown[]).length;
          return `${n} ${n === 1 ? "result" : "results"}`;
      }
      if (typeof o.count === "number") {
          return `${o.count} ${o.count === 1 ? "result" : "results"}`;
      }
      if (o.preview && typeof o.preview === "object" && "summary" in o.preview && typeof (o.preview as { summary: unknown }).summary === "string") {
          return (o.preview as { summary: string }).summary;
      }
      return undefined;
  }
  ```

- [ ] **Step 6.7: Use the fixture harness for verification.**
  Open http://localhost:3000/dev/tool-results to visually verify each per-tool component still renders correctly (these don't go through `ToolCallDisplay`, but make sure no fallout from the renderer change). Then trigger a generic-fallback path by sending a tool that has no per-tool component (e.g., a hypothetical tool name not in the registry) — verify the rich collapsed header + JSON viewer render correctly.

- [ ] **Step 6.8: A11y verification — `aria-expanded`, `aria-controls`.**
  Tab to a collapsed tool call, hit Enter — expands. VoiceOver announces "expanded" / "collapsed" correctly.

- [ ] **Step 6.9: Commit + submit.**
  Commit subject: `feat(chat): tool call display polish (B1, B2, B3)`. Submit with `gt submit`.

---

## Task 7: PR 7 — Sidebar History Grouping + Active Highlight + Cleanup (E1, E4, E5)

**Goal:** Read-only sidebar work — time-bucket grouping, active-thread highlight, delete the orphaned `ThreadItem.tsx`.

**Files:**
- Create: `apps/app/src/components/chat/sidebar/ChatHistoryGroup.tsx`, `apps/app/src/components/chat/sidebar/ChatHistoryItem.tsx`
- Modify: `apps/app/src/components/application/dashboard-sidebar.tsx`
- Delete: `apps/app/src/components/chat/ThreadItem.tsx`

### Steps

- [ ] **Step 7.1: Linear sub-issue + branch.** Title: `Chat polish — Sidebar history grouping + active highlight + cleanup (E1, E4, E5)`.

- [ ] **Step 7.2: Determine bucketing function.**
  Add to a small util file or co-locate in the new component. Buckets:
  - Today (created/updated within last 24 hours, calendar-day aware)
  - Yesterday
  - Last 7 days
  - Last 30 days
  - Older

- [ ] **Step 7.3: Create `ChatHistoryGroup` (presentational).**
  ```tsx
  // apps/app/src/components/chat/sidebar/ChatHistoryGroup.tsx
  "use client";

  import type { ReactNode } from "react";

  interface ChatHistoryGroupProps {
      label: string;
      children: ReactNode;
  }

  export function ChatHistoryGroup({ label, children }: ChatHistoryGroupProps) {
      return (
          <div className="space-y-1">
              <p className="px-2 text-[10px] font-medium uppercase tracking-[0.18em] text-tertiary">
                  {label}
              </p>
              <ul className="space-y-0.5">{children}</ul>
          </div>
      );
  }
  ```

- [ ] **Step 7.4: Create `ChatHistoryItem`.**
  ```tsx
  // apps/app/src/components/chat/sidebar/ChatHistoryItem.tsx
  "use client";

  import Link from "next/link";
  import { cx } from "@/utils/cx";
  import { truncate } from "@/utils/truncate";

  interface ChatHistoryItemProps {
      threadId: string;
      title: string;
      isActive: boolean;
      summary?: string;
  }

  export function ChatHistoryItem({ threadId, title, isActive, summary }: ChatHistoryItemProps) {
      return (
          <li>
              <Link
                  href={`/${threadId}`}
                  title={summary ?? title}
                  className={cx(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      isActive
                          ? "bg-secondary text-primary dark:bg-[var(--sp-surface-panel-strong)]"
                          : "text-secondary hover:bg-secondary/50 hover:text-primary dark:hover:bg-white/5",
                  )}
              >
                  <span className="block truncate">{truncate(title, 40)}</span>
              </Link>
          </li>
      );
  }
  ```
  (PR 8 adds the kebab menu and rename/delete actions. The `summary` prop is the seed for E6 hover preview — using native `title` here as the simplest implementation.)

- [ ] **Step 7.5: Update `DashboardSidebar`.**
  Edit `apps/app/src/components/application/dashboard-sidebar.tsx`. Replace the inline `historyItems` mapping (lines 64–84 of the current file) with a bucketed render that uses `ChatHistoryGroup` + `ChatHistoryItem`. Active threadId comes from `useParams`:
  ```tsx
  import { useParams, usePathname } from "next/navigation";
  import { ChatHistoryGroup } from "@/components/chat/sidebar/ChatHistoryGroup";
  import { ChatHistoryItem } from "@/components/chat/sidebar/ChatHistoryItem";

  const params = useParams<{ threadId?: string }>();
  const activeThreadId = params?.threadId ?? null;

  const buckets = useMemo(() => bucketByRecency(threads), [threads]);
  ```
  Where `bucketByRecency` is co-located in the same file or a sibling util:
  ```ts
  function bucketByRecency(threads: { threadId: string; title?: string; summary?: string; updatedAt: number }[]) {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      const todayMs = startOfToday.getTime();
      const yesterdayMs = todayMs - day;
      const buckets: Record<string, typeof threads> = {
          Today: [],
          Yesterday: [],
          "Last 7 days": [],
          "Last 30 days": [],
          Older: [],
      };
      for (const t of threads) {
          if (t.updatedAt >= todayMs) buckets.Today!.push(t);
          else if (t.updatedAt >= yesterdayMs) buckets.Yesterday!.push(t);
          else if (t.updatedAt >= now - 7 * day) buckets["Last 7 days"]!.push(t);
          else if (t.updatedAt >= now - 30 * day) buckets["Last 30 days"]!.push(t);
          else buckets.Older!.push(t);
      }
      return buckets;
  }
  ```
  Render only buckets that have items.

- [ ] **Step 7.6: Delete `ThreadItem.tsx`.**
  ```bash
  rm apps/app/src/components/chat/ThreadItem.tsx
  ```
  Verify no remaining imports:
  ```bash
  grep -rn "ThreadItem" apps/app/src/
  ```

- [ ] **Step 7.7: Typecheck + lint + visual smoke.**
  - **Dark mode primary:** sidebar shows time buckets with subtle uppercase labels; threads under each. Active thread has a distinct background (not just hover).
  - **Light mode parity:** same structure, no contrast failures.
  - Mobile: sidebar drawer behavior unchanged; bucketed view still fits.

- [ ] **Step 7.8: Commit + submit.**
  Commit subject: `feat(chat): sidebar history — grouping + active highlight (E1, E4, E5)`. Stage with `git rm` for the deleted file. Submit with `gt submit`.

---

## Task 8: PR 8 — Sidebar Rename + Delete + Hover Preview (E2, E3, E6)

**Goal:** Rename and delete UIs surfaced via kebab menu in `ChatHistoryItem`. Hover preview added in the same surface (E6 already seeded as `title` in PR 7; here we replace with a richer treatment if the existing project has a tooltip primitive).

**Files:**
- Create: `apps/app/src/components/chat/sidebar/RenameThreadDialog.tsx`, `apps/app/src/components/chat/sidebar/DeleteThreadConfirm.tsx`
- Modify: `apps/app/src/components/chat/sidebar/ChatHistoryItem.tsx`, `apps/app/src/components/application/dashboard-sidebar.tsx`

### Steps

- [ ] **Step 8.1: Linear sub-issue + branch.** Title: `Chat polish — Sidebar rename + delete + hover preview (E2, E3, E6)`.

- [ ] **Step 8.2: Search for existing dialog/tooltip primitives.**
  ```bash
  grep -rn "AlertDialog\|ConfirmDialog\|Tooltip\|Modal" packages/ui/src --include="*.tsx" | head -10
  ```
  If a project-standard dialog exists, use it for `DeleteThreadConfirm`. Same for tooltip — if Radix/UntitledUI tooltip is set up, use that for the hover preview instead of native `title`.

- [ ] **Step 8.3: Create `RenameThreadDialog`.**
  Use a popover-style inline edit (lighter than a full modal):
  ```tsx
  // apps/app/src/components/chat/sidebar/RenameThreadDialog.tsx
  "use client";
  import { useState } from "react";
  import { Check, XClose } from "@untitledui/icons";

  interface RenameThreadDialogProps {
      currentTitle: string;
      onConfirm: (newTitle: string) => Promise<void>;
      onCancel: () => void;
  }

  export function RenameThreadDialog({ currentTitle, onConfirm, onCancel }: RenameThreadDialogProps) {
      const [value, setValue] = useState(currentTitle);
      const [submitting, setSubmitting] = useState(false);

      const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          if (!value.trim() || value.trim() === currentTitle) {
              onCancel();
              return;
          }
          setSubmitting(true);
          try {
              await onConfirm(value.trim());
          } finally {
              setSubmitting(false);
          }
      };

      return (
          <form onSubmit={handleSubmit} className="flex items-center gap-1 px-2 py-1">
              <input
                  type="text"
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
                  className="flex-1 rounded border border-secondary bg-primary px-2 py-1 text-sm focus:border-[var(--sp-moss-mint)]/50 focus:outline-none"
                  disabled={submitting}
              />
              <button type="submit" aria-label="Save" disabled={submitting} className="rounded p-1 text-[var(--sp-moss-mint)] hover:bg-secondary disabled:opacity-50">
                  <Check className="size-4" />
              </button>
              <button type="button" aria-label="Cancel" onClick={onCancel} className="rounded p-1 text-tertiary hover:bg-secondary">
                  <XClose className="size-4" />
              </button>
          </form>
      );
  }
  ```

- [ ] **Step 8.4: Create `DeleteThreadConfirm`.**
  Use UntitledUI Pro's existing dialog/modal primitive if available (per Step 8.2). Otherwise:
  ```tsx
  // apps/app/src/components/chat/sidebar/DeleteThreadConfirm.tsx
  "use client";
  import { motion, AnimatePresence } from "motion/react";

  interface DeleteThreadConfirmProps {
      open: boolean;
      threadTitle: string;
      onConfirm: () => Promise<void>;
      onCancel: () => void;
  }

  export function DeleteThreadConfirm({ open, threadTitle, onConfirm, onCancel }: DeleteThreadConfirmProps) {
      return (
          <AnimatePresence>
              {open && (
                  <motion.div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="delete-thread-title"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                      onClick={onCancel}
                  >
                      <motion.div
                          initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="w-full max-w-sm rounded-lg border border-secondary bg-primary p-4 shadow-lg dark:border-[var(--sp-moss-line-strong)] dark:bg-[var(--sp-surface-panel-strong)]"
                          onClick={(e) => e.stopPropagation()}
                      >
                          <h2 id="delete-thread-title" className="text-base font-medium text-primary">Delete this conversation?</h2>
                          <p className="mt-1 text-sm text-tertiary">"{threadTitle}" will be permanently removed. This cannot be undone.</p>
                          <div className="mt-4 flex justify-end gap-2">
                              <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm text-secondary hover:bg-secondary">Cancel</button>
                              <button type="button" onClick={onConfirm} className="rounded-md bg-error-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">Delete</button>
                          </div>
                      </motion.div>
                  </motion.div>
              )}
          </AnimatePresence>
      );
  }
  ```

- [ ] **Step 8.5: Add kebab menu to `ChatHistoryItem`.**
  Update the file to manage `isRenaming`, `confirmDeleteOpen` local state, render the kebab menu button on hover, and toggle the dialogs. Use UntitledUI's dropdown primitive if present, else inline a portal-less dropdown:
  ```tsx
  import { useState } from "react";
  import { useMutation } from "convex/react";
  import { useRouter } from "next/navigation";
  import { api } from "@convex/_generated/api";
  import type { Id } from "@convex/_generated/dataModel";
  import { DotsHorizontal, Edit05, Trash01 } from "@untitledui/icons";
  import { RenameThreadDialog } from "./RenameThreadDialog";
  import { DeleteThreadConfirm } from "./DeleteThreadConfirm";
  ```
  Wrap the link in a `group/item` flex container, render the kebab button on `group-hover/item:opacity-100`, and conditionally render `RenameThreadDialog` (replaces the link inline while editing) or `DeleteThreadConfirm` (overlay). On confirm:
  ```tsx
  const renameThread = useMutation(api.agent.threads.renameThread);
  const deleteThread = useMutation(api.agent.threads.deleteThread);
  const router = useRouter();

  const handleRename = async (newTitle: string) => {
      await renameThread({ threadId: threadId as Id<"agentThreads">, title: newTitle });
      setIsRenaming(false);
  };
  const handleDelete = async () => {
      await deleteThread({ threadId: threadId as Id<"agentThreads"> });
      setConfirmDeleteOpen(false);
      if (isActive) router.push("/");
  };
  ```

- [ ] **Step 8.6: Hover preview (E6).**
  Already seeded by the `title` attribute in PR 7. If the project has a Tooltip primitive (per Step 8.2), upgrade — otherwise leave native `title`. Don't reinvent a tooltip just for this.

- [ ] **Step 8.7: Verification — rename, delete, navigation.**
  - Hover a thread item → kebab appears → click → menu shows Rename, Delete.
  - Rename: inline form replaces the link, autofocuses, Enter saves, Esc cancels, sidebar updates.
  - Delete: confirm dialog renders, Cancel dismisses, Delete calls mutation, if active thread is deleted you're redirected to `/`.
  - Hover preview: tooltip shows summary on hover.
  - Keyboard: Tab to kebab, Enter, arrow keys navigate menu.
  - Dark mode + light mode parity.
  - Mobile: kebab is touch-friendly (≥44px), drawer still works.
  - **Trim trigger:** if PR 8 grows past budget, drop E6 (revert to PR-7 native `title`) before cutting rename or delete.

- [ ] **Step 8.8: Commit + submit.**
  Commit subject: `feat(chat): sidebar rename + delete + hover preview (E2, E3, E6)`. Submit with `gt submit`.

---

## Task 9: PR 9 — Input Affordances (D1, D2, D3, D4)

**Goal:** Cmd/Ctrl+Enter alt submit, Esc handling, autofocus return after send, 44px send button on mobile.

**Files:** Modify `apps/app/src/components/chat/MessageActionMinimal.tsx`.

### Steps

- [ ] **Step 9.1: Linear sub-issue + branch.**

- [ ] **Step 9.2: Update `MessageActionMinimal` keyboard handling.**
  Patch `handleKeyDown`:
  ```tsx
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      // D1: Cmd/Ctrl+Enter as alt submit.
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          submit();
          return;
      }
      // Existing: Enter (no shift) submits.
      if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          submit();
          return;
      }
      // D2: Esc clears non-empty, blurs empty.
      if (event.key === "Escape") {
          event.preventDefault();
          if (value.trim()) {
              setValue("");
              if (textareaRef.current) textareaRef.current.style.height = "auto";
          } else {
              textareaRef.current?.blur();
          }
      }
  };
  ```

- [ ] **Step 9.3: D3 — autofocus return after send.**
  In `submit()`:
  ```tsx
  const submit = () => {
      if (!canSubmit) return;
      onSubmit(value.trim());
      setValue("");
      if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.focus();
      }
  };
  ```
  Also focus on mount:
  ```tsx
  useEffect(() => {
      textareaRef.current?.focus();
  }, []);
  ```

- [ ] **Step 9.4: D4 — 44px touch target.**
  Update the send-button class from `size-9` (36px) to be 44px on mobile, 36px on desktop:
  ```tsx
  className="flex size-11 md:size-9 items-center justify-center rounded-full ..."
  ```
  Apply the same to `StopButton` (PR 3) if not already.

- [ ] **Step 9.5: Verification.**
  - **D1:** Cmd+Enter submits (mac), Ctrl+Enter (Windows/Linux). Test both.
  - **D2:** Esc with text → text clears, focus stays. Esc with empty → input blurs.
  - **D3:** After clicking send, focus returns to input.
  - **D4:** On mobile DevTools view, send button is visibly larger (44px hit area).

- [ ] **Step 9.6: Commit + submit.**
  Commit subject: `feat(chat): input affordances (D1–D4)`. Submit with `gt submit`.

---

## Task 10: PR 10 — Mobile + Safe-Area + Banner Contrast (G1, G2, G3, F2)

**Goal:** Virtual keyboard handling, safe-area insets, drawer verification, banner dismiss-button contrast fix.

**Files:** Modify `apps/app/src/components/chat/ChatContainer.tsx`, `apps/app/src/components/chat/MessageInput.tsx`, `apps/app/src/components/chat/ChatBanner.tsx`.

### Steps

- [ ] **Step 10.1: Linear sub-issue + branch.**

- [ ] **Step 10.2: G1 — virtual keyboard / dynamic viewport.**
  Edit `ChatContainer.tsx`. Replace `h-screen` with `h-[100dvh]` (dynamic viewport unit):
  ```tsx
  return (
      <div className="flex h-[100dvh] flex-col bg-primary">
          <div className="relative flex flex-1 flex-col overflow-hidden">{children}</div>
      </div>
  );
  ```

- [ ] **Step 10.3: G2 — safe-area insets.**
  Edit `MessageInput.tsx`:
  ```tsx
  <div className="bg-primary px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 md:px-8">
  ```

- [ ] **Step 10.4: G3 — drawer behavior verification.**
  Open the chat on mobile (DevTools or real device). Verify the existing `DashboardSidebar` drawer:
  - Opens via the menu button.
  - Backdrop tap closes it.
  - Active thread highlighting works (carries over from PR 7).
  - Closing the drawer brings focus back to the chat input.
  No code changes expected unless drawer is broken — if it is, document and fix here.

- [ ] **Step 10.5: F2 — `ChatBanner` dismiss-button contrast.**
  Edit `ChatBanner.tsx`. Change the dismiss button's hover from same-as-bg to a tinted variant:
  ```tsx
  <button
      type="button"
      onClick={onDismiss}
      aria-label="Dismiss"
      className="ml-auto rounded p-1 text-warning-primary hover:bg-warning-primary/10 dark:hover:bg-warning-primary/20"
  >
      <XClose className="size-4" />
  </button>
  ```

- [ ] **Step 10.6: Verification.**
  - Mobile DevTools: focus the input → keyboard simulated; content above keyboard stays visible. No bottom-clipped input.
  - Real iPhone if possible: rotation, orientation, virtual keyboard.
  - Banner: hover the dismiss button → visible bg change in both modes.

- [ ] **Step 10.7: Commit + submit.**
  Commit subject: `feat(chat): mobile + safe-area + banner contrast (G1, G2, G3, F2)`. Submit with `gt submit`.

---

## Task 11: PR 11 — Accessibility Pass (H1, H2, H3, H4)

**Goal:** Verify and tighten chat-surface accessibility. `aria-busy` on log during streaming, `aria-expanded`/`aria-controls` on tool disclosure, keyboard nav on `TransactionsTable`, and a contrast verification under the recent 1B tightening.

**Files:** Modify `apps/app/src/components/chat/MessageList.tsx`, `apps/app/src/components/chat/ToolCallDisplay.tsx` (if not already done in PR 6), `apps/app/src/components/chat/tool-results/transactions/TransactionsTable.tsx`.

### Steps

- [ ] **Step 11.1: Linear sub-issue + branch.**

- [ ] **Step 11.2: H1 — `aria-busy` on log during streaming.**
  Edit `MessageList.tsx`. Compute `isStreaming` from messages and bind:
  ```tsx
  const isStreaming = (messages ?? []).some(
      (m) => m.role === "assistant" && m.isStreaming === true,
  );
  // ...
  <div role="log" aria-live="polite" aria-busy={isStreaming} ...>
  ```

- [ ] **Step 11.3: H2 — verify `aria-expanded` / `aria-controls` on `ToolCallDisplay`.**
  Should already be there from PR 6. If not, add it now.

- [ ] **Step 11.4: H3 — TransactionsTable keyboard nav.**
  Edit `apps/app/src/components/chat/tool-results/transactions/TransactionsTable.tsx`. The current `<tr onClick>` is mouse-only. Make rows focusable + Enter-activated:
  ```tsx
  <tr
      key={tx._id}
      tabIndex={0}
      role="button"
      onClick={() => void hint.openTransaction(tx._id)}
      onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              void hint.openTransaction(tx._id);
          }
      }}
      className="border-secondary hover:bg-secondary/40 focus:bg-secondary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sp-moss-mint)]/50 cursor-pointer border-t"
  >
  ```

- [ ] **Step 11.5: H4 — contrast verification.**
  Use Chrome DevTools' built-in accessibility audit on:
  - The chat surface in dark mode.
  - The chat surface in light mode.
  - The sidebar.
  - The empty state.
  Note any element that fails WCAG AA (4.5:1 for body, 3:1 for large text or icons). Fix by darkening / lightening the relevant token reference. Common offenders: `text-tertiary` on `bg-secondary` in some variants; `text-quaternary` icons.

- [ ] **Step 11.6: Screen-reader smoke.**
  - VoiceOver navigates the chat: bubble identity announces correctly (user vs. assistant), message content read, tool call disclosure announces "expanded"/"collapsed", input announces label.
  - Keyboard-only flow: Tab from input → message bubbles → tool calls → sidebar threads. Logical order.

- [ ] **Step 11.7: Commit + submit.**
  Commit subject: `feat(chat): accessibility pass (H1–H4)`. Submit with `gt submit`.

---

## Task 12: PR 12 — Empty State + Motion + Typography Sweeps (F3, I1, I2)

**Goal:** Suggestion variety in `ChatHome` (F3), motion-token application across chat surfaces (I1), typography scale verification post CROWDEV-277 (I2).

**Files:** Modify `apps/app/src/components/chat/ChatHome.tsx`, plus any chat surface using ad-hoc durations.

### Steps

- [ ] **Step 12.1: Linear sub-issue + branch.**

- [ ] **Step 12.2: F3 — suggestion variety + categories.**
  Edit `ChatHome.tsx`. Replace the hardcoded `SUGGESTIONS` array with a per-category mix that's randomized per visit:
  ```tsx
  const SUGGESTION_POOL = [
      // Spend
      { category: "spend", label: "What did I spend on groceries last month?" },
      { category: "spend", label: "Show my spend by category for this quarter." },
      { category: "spend", label: "Compare my dining spend to last month." },
      // Cards
      { category: "cards", label: "Show my Chase Sapphire statement." },
      { category: "cards", label: "Which card has the highest balance?" },
      { category: "cards", label: "Which card's statement is closest to closing?" },
      // Promos
      { category: "promos", label: "Which deferred-interest promo expires first?" },
      { category: "promos", label: "List my installment plans." },
      // Transactions
      { category: "tx", label: "Mark all Amazon charges as Shopping." },
      { category: "tx", label: "Find my five biggest charges this month." },
  ];

  function pickFour(): typeof SUGGESTION_POOL {
      const byCat: Record<string, typeof SUGGESTION_POOL> = {};
      for (const s of SUGGESTION_POOL) {
          (byCat[s.category] ??= []).push(s);
      }
      const picks: typeof SUGGESTION_POOL = [];
      for (const cat of Object.keys(byCat)) {
          const arr = byCat[cat]!;
          picks.push(arr[Math.floor(Math.random() * arr.length)]!);
      }
      return picks.sort(() => Math.random() - 0.5).slice(0, 4);
  }
  ```
  Use `useMemo(() => pickFour(), [])` to compute once per mount.

- [ ] **Step 12.3: I1 — apply motion tokens.**
  Search for ad-hoc durations on chat surfaces:
  ```bash
  grep -rn "duration-300\|duration-500\|duration-700\|duration-1000" apps/app/src/components/chat/ apps/app/src/components/application/dashboard-sidebar.tsx
  ```
  Replace with token references via the Tailwind v4 arbitrary-value syntax:
  - `duration-300` → `duration-[var(--sp-motion-base)]`
  - `duration-150` → `duration-[var(--sp-motion-fast)]`
  - `duration-500` / `700` / `1000` → audit case-by-case; usually too slow, drop to base or slow

- [ ] **Step 12.4: I2 — typography scale verification.**
  Compare chat font sizes to the rest of the app post CROWDEV-277:
  ```bash
  git log --oneline | grep CROWDEV-277
  ```
  Read the CROWDEV-277 commit diff to see what type sizes were rein-in'd. Verify `MessageBubble`, `MarkdownContent` `prose-sm`, `ChatHome` headline/body, `MessageActionMinimal` placeholder all match. Adjust where chat is louder than the shell.

- [ ] **Step 12.5: Verification.**
  - Reload the chat home repeatedly — different suggestions each time.
  - Hover the chips, press them — feel calmer (no over-long durations).
  - Type sizes match across pages — switch between `/`, `/credit-cards`, `/transactions`.

- [ ] **Step 12.6: Commit + submit.**
  Commit subject: `feat(chat): empty state + motion + typography sweeps (F3, I1, I2)`. Submit with `gt submit`.

---

## Task 13: PR 13 — Streaming Cursor + Tool Result Entrance + Dark-Mode Tool-Result Sweep (A5, B5, I3)

**Goal:** Add the calm streaming tail cursor (A5), subtle tool-result entrance (B5), and sweep the tool-result components for dark-mode token consistency (I3). Closes the core stack.

**Files:**
- Create: `apps/app/src/components/chat/StreamingCursor.tsx`
- Modify: `apps/app/src/components/chat/MessageBubble.tsx`, `apps/app/src/components/chat/tool-results/ToolResultRenderer.tsx`, several `apps/app/src/components/chat/tool-results/**/*.tsx` files (per audit)
- Modify: `apps/app/src/app/globals.css` (add cursor keyframes)

### Steps

- [ ] **Step 13.1: Linear sub-issue + branch.**

- [ ] **Step 13.2: Add cursor keyframes to globals.css.**
  Append to `apps/app/src/app/globals.css`:
  ```css
  @keyframes sp-cursor-pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 0.15; }
  }
  ```

- [ ] **Step 13.3: Create `StreamingCursor`.**
  ```tsx
  // apps/app/src/components/chat/StreamingCursor.tsx
  "use client";

  // A calm vertical bar that pulses while streaming. CSS-only — reactbits can
  // be substituted later if a richer effect lands. Keep ≤200ms cycle.
  export function StreamingCursor() {
      return (
          <span
              aria-hidden
              className="ml-0.5 inline-block h-[1em] w-[2px] -mb-0.5 align-middle bg-current opacity-60 motion-safe:animate-[sp-cursor-pulse_1s_ease-in-out_infinite]"
          />
      );
  }
  ```

- [ ] **Step 13.4: Wire `StreamingCursor` into `MessageBubble`.**
  Inside the assistant body render, when `isStreaming === true`, append `<StreamingCursor />` after `MarkdownContent`:
  ```tsx
  <div className={...}>
      <MarkdownContent content={displayText} />
      {isStreaming && <StreamingCursor />}
  </div>
  ```

- [ ] **Step 13.5: B5 — tool result entrance.**
  Edit `apps/app/src/components/chat/tool-results/ToolResultRenderer.tsx`. Wrap the rendered component in a `motion.div` with `layout` + initial fade:
  ```tsx
  import { motion } from "motion/react";
  // ... in the return:
  return (
      <motion.div
          layout
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
      >
          {/* existing render branches */}
      </motion.div>
  );
  ```
  Wrap once at the top, not per-branch.

- [ ] **Step 13.6: I3 — dark-mode tool-result sweep.**
  For each tool-result component, verify dark-mode token usage:
  ```bash
  ls apps/app/src/components/chat/tool-results/{accounts,charts,credit-cards,promos,proposals,reminders,transactions}/*.tsx
  ```
  Walk each component. Where you see generic tokens (`border-secondary`, `bg-secondary/40`, `text-tertiary`), check the rendering in dark mode and replace with the moss tokens (`border-[var(--sp-moss-line)]`, `bg-[var(--sp-surface-panel-strong)]`, etc.) where the visual reads thinly. Don't blanket-rename — only where it's visibly off in dark mode.

  **Per-file checklist:**
  - [ ] `accounts/AccountsSummary.tsx`
  - [ ] `accounts/AccountsSummarySkeleton.tsx`
  - [ ] `charts/SpendByCategoryChart.tsx`
  - [ ] `charts/SpendByCategoryChartSkeleton.tsx`
  - [ ] `charts/SpendOverTimeChart.tsx`
  - [ ] `charts/SpendOverTimeChartSkeleton.tsx`
  - [ ] `credit-cards/CreditCardStatementCard.tsx`
  - [ ] `credit-cards/CreditCardStatementCardSkeleton.tsx`
  - [ ] `promos/DeferredInterestTimeline.tsx`
  - [ ] `promos/DeferredInterestTimelineSkeleton.tsx`
  - [ ] `promos/InstallmentPlansList.tsx`
  - [ ] `promos/InstallmentPlansListSkeleton.tsx`
  - [ ] `proposals/ProposalConfirmCard.tsx`
  - [ ] `proposals/ProposalConfirmCardSkeleton.tsx`
  - [ ] `reminders/RemindersList.tsx`
  - [ ] `reminders/RemindersListSkeleton.tsx`
  - [ ] `transactions/TransactionsTable.tsx`
  - [ ] `transactions/TransactionsTableSkeleton.tsx`
  - [ ] `transactions/TransactionDetailCard.tsx`
  - [ ] `transactions/TransactionDetailCardSkeleton.tsx`
  - [ ] `shared/ToolCardShell.tsx`
  - [ ] `shared/Skeletons.tsx`

  Use the fixture harness at `/dev/tool-results/` for visual verification — open each fixture in dark mode, then light mode. **Budget:** if this sweep grows past 1.5 days, ship the PR with the components most visibly off; create a follow-up sub-issue for the rest.

- [ ] **Step 13.7: Commit + submit.**
  Commit subject: `feat(chat): streaming cursor + tool result entrance + dark-mode tool-result sweep (A5, B5, I3)`. If this is the final PR (no stretch shipping), use `Fixes CROWDEV-329` instead of `Refs`. Submit with `gt submit`.

---

## Stretch Tasks (only if budget permits at PR 13 completion)

### Task 14 (stretch): PR 14 — Tool Error Inline Recovery (B4)

- [ ] Create or modify `ToolErrorRow` to expose a retry button + (for `reconsent_required`) a Settings/Banks deeplink.
- [ ] Verify across error fixtures — synthesize a Plaid reconsent error and confirm the deeplink resolves.
- [ ] Commit subject: `feat(chat): tool error inline recovery (B4)`. Submit.

### Task 15 (stretch): PR 15 — Message Timestamps (C5)

- [ ] Create `apps/app/src/components/chat/MessageTimestamp.tsx` — hover-revealed at the bubble corner. Use `_creationTime` from the message doc. Format as relative time inline; native `title` for absolute hover.
- [ ] Wire into `MessageBubble`.
- [ ] Verify hover reveal, light/dark, mobile (long-press should reveal too).
- [ ] Commit subject: `feat(chat): message timestamps (C5)`. Submit.

### Task 16 (stretch): PR 16 — Edit-and-Resend (C6)

- [ ] On user messages, surface a small "Edit" action in `MessageActions`.
- [ ] On click: replace the bubble with a textarea pre-filled with the message content, Save / Cancel.
- [ ] On Save: call `sendMessage` with the new text; visually replace the previous turn in the message list (preserving thread integrity — the original user message remains in the thread, but the UI elides it in favor of the resend). The exact visual treatment is open: simplest is to show the new turn beneath the original; cleanest is to hide the original. Pick whichever ships in the budget.
- [ ] **Budget cap:** if this grows past 1.5 days, drop to P2 and create a follow-up sub-issue.
- [ ] Commit subject: `feat(chat): edit-and-resend on user messages (C6)`. Submit.

---

## Final closure of CROWDEV-329

After the last shipped PR (core or stretch):

- [ ] **Final commit uses `Fixes CROWDEV-329`** (replacing `Refs CROWDEV-329`) so merging closes the parent issue automatically.
- [ ] **Linear comment on CROWDEV-329** with: stack summary (PR titles + Graphite links), what shipped vs. deferred (P0 / P1 status, P2 follow-up issue IDs if any), final smoke-test sign-off on `app.preview.smartpockets.com`.
- [ ] **TODO.md** — check off any items related to chat polish.
- [ ] **Cross-PR demo run** on `app.preview.smartpockets.com`: complete a multi-turn conversation that exercises card lookup, transactions table, a proposal flow, and a chart, in dark mode, on desktop and mobile. If anything reads as "would apologize for", open a P1 follow-up sub-issue rather than reopening the parent.

---

## Self-review notes (for the executing agent)

- **Atomic commits:** every step that ends in `git commit` is one logical change. Don't bundle.
- **No `--no-verify`:** if a hook fails, fix the issue and create a NEW commit (per CLAUDE.md). Don't amend after hook failure.
- **Graphite stack discipline:** if you find yourself wanting to push to a different branch mid-stack, stop and reorder via `gt move` rather than ad-hoc git operations.
- **Dark-first:** every visual verification starts in dark mode. Light mode is parity check, not the primary test.
- **Trim plan triggers:** if you hit any of these mid-execution, defer per spec §5 trim plan:
  - PR 8 budget overrun → drop E6 (hover preview).
  - PR 13 sweep exceeds 1.5 days → ship visibly-off only, follow-up sub-issue.
  - Stretch PR 16 (edit-and-resend) exceeds 1.5 days → drop to P2.
- **Linear plumbing:** every PR's commit message uses `Refs CROWDEV-NNN` (the sub-issue, not the parent) until the final PR which uses `Fixes CROWDEV-329`.

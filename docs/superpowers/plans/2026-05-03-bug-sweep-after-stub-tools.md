# Post-Stub-Tools Bug Sweep

> **Surfaced during user manual testing of PRs #174–#177 (stub-tool implementations).** Each bug below gets its own atomic PR + Linear sub-issue under CROWDEV-329.

**Stack base:** `CROWDEV-349-implement-get-plaid-health` (PR #177, current head).
**All sub-agents start with `gt create CROWDEV-NNN-<slug>`** stacked on PR #177.

---

## Bug #1 (CRITICAL) — Follow-up messages don't get a response after a tool call

**User report:** After the agent calls a tool (any tool — credit cards, transactions, charts, search), subsequent messages in the same thread send but never get a reply. The user sees their bubble appear (optimistic dedup works) but the assistant never streams a response. Multi-turn is broken end-to-end.

**Hypothesis:** The `cancelledAtTurn` flag on `agentThreads` (added in PR #163) is being set incorrectly during tool execution and not cleared before the next turn. Specifically, suspect that:

- The `isStreaming` flag on the user-turn marker may not be flipped back to `false` after a tool-call turn completes (separate code path from text-only completions).
- OR `appendUserTurn`'s flag-clear (`ctx.db.patch(threadId, { cancelledAtTurn: undefined })`) isn't running on subsequent turns.
- OR `runAgentTurn`'s `isCancelledForThisTurn` check is returning true for new turns because of a stale `cancelledAtTurn` value.

**Investigation steps:**
1. Read `packages/backend/convex/agent/runtime.ts` — find `runAgentTurn`, the cancel-flag-check loop, the `onStepFinish` gate.
2. Read `packages/backend/convex/agent/threads.ts` — find `appendUserTurn` (does it patch `cancelledAtTurn: undefined`?), `abortRun`.
3. Trace: send a message that triggers a tool call → does the user-turn marker's `isStreaming` flip false at end of turn? Does `cancelledAtTurn` get cleared on the next user turn?
4. Reproduce locally if possible: send a tool-triggering message, send a follow-up, capture Convex function logs to see where the second turn dies (or never starts).

**Files likely touched:** `packages/backend/convex/agent/runtime.ts`, `packages/backend/convex/agent/threads.ts`, possibly `packages/backend/convex/schema.ts`.

**Verification:** add a convex-test case that simulates a multi-turn flow with a tool call in the first turn — the second turn must get a response. Plus end-to-end manual smoke after deploy.

**Sub-issue:** create as `Fix multi-turn responses: agent doesn't reply after a tool call`.

---

## Bug #2 (HIGH visual) — `searchMerchants` dumps raw JSON instead of rendering nicely

**User report:** The `searchMerchants` tool result rendered the entire output JSON as plain text in the chat bubble, followed by the agent's natural-language summary. The JSON shouldn't be visible.

**Root cause:** PR #176 implemented the tool but did NOT register a per-tool component in `apps/app/src/components/chat/tool-results/registry.tsx`. The fallback path is `RawTextMessage` (always-visible JSON dump), not the cleaner `ToolCallDisplay` (collapsed-by-default with rich summary from PR #160).

**Fix options (pick one):**
1. **Build a per-tool component** at `apps/app/src/components/chat/tool-results/merchants/MerchantsList.tsx` — renders the `merchants` array nicely (count, name, totalAmount, lastDate). Add to `registry.tsx`. **Best UX.**
2. **Switch the fallback** so unmapped tools route through `ToolCallDisplay` (with `deriveSummary` from `lib/chat/toolSummary.ts`) instead of `RawTextMessage`. **Faster, generic improvement.**

Recommend **option 1** for `searchMerchants` specifically (the data structure is uniform and worth a real component) AND option 2 as a defensive improvement (catches future stub tools that ship without per-tool components).

**Files likely touched:**
- New: `apps/app/src/components/chat/tool-results/merchants/MerchantsList.tsx` + `MerchantsListSkeleton.tsx` + `__fixtures__/search_merchants.fixture.ts`
- Modify: `apps/app/src/components/chat/tool-results/registry.tsx`
- Possibly modify: `apps/app/src/components/chat/tool-results/ToolResultRenderer.tsx` if changing the fallback strategy.

**Verification:** typecheck, fixture renders correctly in `/dev/tool-results/`, real user query "find all my Amazon charges" no longer shows raw JSON.

**Sub-issue:** `Build searchMerchants tool-result component (replace RawTextMessage fallback)`.

---

## Bug #3 (HIGH UX) — Sidebar kebab menu opens TWO copies + rename/delete don't work

**User report:** Clicking the kebab (three dots) on a sidebar thread row:
- Opens the dropdown menu in the correct anchored position (next to the row).
- ALSO opens a second copy of the dropdown in the upper-left corner of the sidebar.
- Clicking Rename or Delete in either dropdown does nothing visible.

Screenshot in user's message confirms both visuals.

**Hypothesis:** PR #169's UntitledUI Pro `Dropdown` refactor likely:
- Renders the popover both inline AND portaled to body (so two copies appear).
- Has the click handlers wired to the wrong instance (so clicks don't fire mutations).
- OR the `isOpen` / `onOpenChange` controlled-state from the parent's `openMenuId` is conflicting with the `Dropdown.Root`'s own internal state.

**Investigation steps:**
1. Read `apps/app/src/components/chat/sidebar/ChatHistoryItem.tsx` — how `Dropdown.Root` is composed, how `isMenuOpen` / `onMenuOpenChange` flows through.
2. Read `packages/ui/src/components/untitledui/base/dropdown/dropdown.tsx` to understand the wrapper's expected usage.
3. Check whether the dropdown is being rendered with both controlled (`isOpen`) AND uncontrolled (`defaultOpen`) props, which could cause double-render.
4. Verify the click handlers (`handleRename`, `handleDelete`) are wired correctly — likely the `Dropdown.Item` `onAction` prop or similar isn't firing.

**Files likely touched:** `apps/app/src/components/chat/sidebar/ChatHistoryItem.tsx`, possibly `apps/app/src/components/application/dashboard-sidebar.tsx` (the parent's shared `openMenuId` state).

**Verification (per user's request):** add a Playwright test at `apps/app/tests/sidebar-rename-delete.spec.ts` that:
- Navigates to a thread.
- Hovers a sidebar row.
- Clicks the kebab.
- Verifies exactly ONE dropdown is visible.
- Clicks Rename → fills new title → submits → verifies the row's title updated.
- Clicks Delete on a different row → confirms → verifies the row is gone.

Test must pass before declaring this PR done. The Playwright setup may not exist yet — if not, scaffolding it is part of this PR.

**Sub-issue:** `Fix sidebar kebab menu duplicates + non-functional rename/delete (with Playwright verification)`.

---

## Bug #4 (MEDIUM) — Threads always named "Untitled"

**User report:** Every thread in the sidebar shows as "Untitled" — no auto-titling happens after the first user/assistant exchange.

**Hypothesis:** Auto-titling logic likely doesn't exist OR isn't being called. Need to investigate:
1. Does `agentThreads.title` have any code that sets it (other than `renameThread`)?
2. Is there a title-generation function (e.g., `generateThreadTitle`) that should run after the first turn but isn't being scheduled?

**Implementation approach (if no existing logic):**
1. After the first assistant response completes in `runAgentTurn`, schedule an internal action `generateThreadTitle({ threadId })`.
2. The action calls the LLM with the first user message + first assistant response, asks for a 3-5 word title, patches `agentThreads.title` with the result.
3. Skip if `title` is already set (e.g., user manually renamed).
4. Use a cheap model for this (Haiku) — no need for Sonnet to title a chat.

**Files likely touched:** `packages/backend/convex/agent/runtime.ts` (trigger after first turn), new file `packages/backend/convex/agent/titling.ts`, `packages/backend/convex/agent/threads.ts` (patch title mutation if not already there).

**Verification:** convex-test that simulates first turn → verify `title` is set to a non-empty, non-"Untitled" string within a few seconds. Manual smoke: send a message about credit cards → thread title becomes something like "Credit card review" within seconds.

**Sub-issue:** `Implement automatic thread titling after first turn`.

---

## Bug #5 (LOW, agent-flagged) — Backend tsconfig lacks `noUncheckedIndexedAccess`

**Source:** Stub-tools sub-agent flagged this after hitting a typecheck error in `getSpendOverTime` (PR #175, fix commit `bbd334d`). The backend's tsconfig is more lax than `apps/app`'s, so backend changes that pass `cd packages/backend && bun typecheck` can still fail `cd apps/app && bun typecheck` downstream because the app's stricter config catches issues the backend's misses.

**Fix:** Align `packages/backend/tsconfig.json` with `tooling/typescript/base.json` (or wherever `apps/app` extends from) — specifically enable `noUncheckedIndexedAccess`. Fix any new errors that surface (likely a small handful).

**Files likely touched:** `packages/backend/tsconfig.json`, possibly some `.ts` files in `packages/backend/convex/`.

**Verification:** `cd packages/backend && bun typecheck` passes (post-fix); full Convex test suite (328+) still passes; `cd apps/app && bun typecheck` also passes.

**Sub-issue:** `Align packages/backend tsconfig with apps/app (enable noUncheckedIndexedAccess)`.

---

## Deferred — bank/transaction logos in tool-result tables

**User wish list, NOT a bug.** Adds visual polish to `TransactionsTable`, `AccountsSummary`, `CreditCardStatementCard`, and the new `MerchantsList` (post Bug #2). Likely use `https://logo.clearbit.com/<domain>` or a similar logo CDN, or the existing `merchantLogos` data if Plaid populates it.

**Tracked separately** as a future polish item. Not in this bug sweep — would expand scope and isn't blocking the demo.

---

## Dispatch strategy

Five sub-agents dispatched in parallel, each starting from PR #177 head. Each creates an independent branch (does NOT stack on the others — they're parallel fix PRs that all eventually merge to the chat polish parent).

| Sub-agent | Bug | Branch | Touches |
|---|---|---|---|
| A | #1 follow-up messages | `CROWDEV-NNN-fix-multi-turn` | runtime.ts, threads.ts, schema.ts |
| B | #2 searchMerchants render | `CROWDEV-NNN-fix-merchants-render` | tool-results/* (frontend only) |
| C | #3 sidebar kebab + Playwright | `CROWDEV-NNN-fix-sidebar-kebab` | sidebar/* (frontend only) |
| D | #4 auto-titling | `CROWDEV-NNN-implement-thread-titling` | runtime.ts (small hook), new titling.ts |
| E | #5 tsconfig alignment | `CROWDEV-NNN-tsconfig-strict-backend` | packages/backend/tsconfig.json |

**Conflict risk:** A and D both touch `runtime.ts`. If both succeed, the second one merged will need to rebase. Acceptable — the conflict surface is small (different parts of the file).

All sub-agents follow the same conventions:
- Linear sub-issue under CROWDEV-329
- Atomic commit, `Refs CROWDEV-NNN`, Co-Authored-By
- `bunx convex dev --once` after backend changes (CLAUDE.md rule #9)
- Comprehensive Linear comment on completion (Graphite URL only, no GitHub URLs per CLAUDE.md/AGENTS.md updated rules)
- Vercel preview verification before reporting DONE

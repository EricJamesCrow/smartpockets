# Agent Tool Stubs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Each tool gets its own atomic PR.

**Goal:** Implement four agent tools that ship as stubs in the SmartPockets backend. Surfaced during PR #172 (CROWDEV-344) when fixing `list_transactions`. Each stub returns empty/wrong results today, breaking common chat questions.

**Stack base:** PR #172 head (`crowdev-344-fix-list-transactions-empty`, commit `967d04e`). Each PR in this plan stacks on top.

**Linear parent:** [CROWDEV-329](https://linear.app/crowdevelopment/issue/CROWDEV-329) (chat polish stack).

**Reference implementation:** PR #172's `list_transactions` (commit `967d04e`) — read it first. It establishes the pattern: query against `agentMessages` / user data with viewer auth, sensible defaults for missing args, return the contract the frontend tool-result component expects, hydrate live via `agent.liveRows.*` hooks.

---

## Tools to implement

### Tool 1 — `getSpendByCategory`

**User question this answers:** "How much did I spend on groceries last month?" / "Show my spend by category for this quarter."

**Frontend component:** `apps/app/src/components/chat/tool-results/charts/SpendByCategoryChart.tsx` (already exists with a fixture at `__fixtures__/get_spend_by_category.fixture.ts` — the contract is defined there).

**Backend location:** `packages/backend/convex/agent/tools/getSpendByCategory.ts` (or wherever the existing stub lives — search with `grep -rn "getSpendByCategory\|get_spend_by_category" packages/backend/convex/`).

**Implementation notes:**
- Aggregate by `categoryPrimary` (existing field on transactions).
- Default window: last 30 days when no window arg.
- Limit to top N categories by spend (default 8).
- Apply `transactionOverlays` for hidden rows + edited categories.
- Return shape: per the existing fixture file — read `__fixtures__/get_spend_by_category.fixture.ts` for the canonical contract.

**Tests:** add to `convex/__tests__/agentGetSpendByCategory.test.ts`:
1. Returns categories sorted by spend descending.
2. Honors window arg.
3. Hidden overlays excluded.
4. Cross-user account spoofing rejected.
5. Empty when no transactions in window (legitimate empty, not bug).

### Tool 2 — `getSpendOverTime`

**User question this answers:** "Show my spend trend over the last quarter." / "Compare my dining spend to last month."

**Frontend component:** `apps/app/src/components/chat/tool-results/charts/SpendOverTimeChart.tsx` (fixture: `__fixtures__/get_spend_over_time.fixture.ts`).

**Backend location:** likely co-located with `getSpendByCategory`.

**Implementation notes:**
- Bucket by day / week / month based on window length (auto-pick granularity).
- Default window: last 90 days.
- Sum amounts per bucket.
- Optional category filter arg.
- Apply `transactionOverlays`.
- Return shape: per fixture.

**Tests:**
1. Buckets correctly per granularity.
2. Honors category filter.
3. Hidden overlays excluded.
4. Cross-user spoofing rejected.

### Tool 3 — `searchMerchants`

**User question this answers:** "Find all charges from Amazon." / "Show me my recent Starbucks transactions."

**Frontend component:** likely renders via `TransactionsTable` or a dedicated merchant-list component. Check `__fixtures__/` and `tool-results/registry.tsx` for the rendering contract. If no per-tool component exists, the generic `ToolCallDisplay` fallback handles it.

**Backend location:** `packages/backend/convex/agent/tools/searchMerchants.ts` (search to confirm).

**Implementation notes:**
- Substring match on `merchantName ?? name` (case-insensitive).
- Apply `transactionOverlays` so user-edited merchant names match.
- Optional date window.
- Return matching transactions or aggregated merchant info — depends on the fixture contract.
- Limit to N results (default 25, cap 200).

**Tests:**
1. Case-insensitive match.
2. Honors window.
3. Honors limit.
4. Edited merchant names match (overlays applied before search).
5. Cross-user spoofing rejected.

### Tool 4 — `getPlaidHealth`

**User question this answers:** "Are any of my bank connections broken?" / "Why isn't my Citi card syncing?"

**Frontend component:** check `tool-results/registry.tsx` — if no per-tool component, generic `ToolCallDisplay` fallback handles it. Probably reasonable to render via the generic fallback with a good `summary` string from `deriveSummary` (see `apps/app/src/lib/chat/toolSummary.ts`).

**Backend location:** `packages/backend/convex/agent/tools/getPlaidHealth.ts` (search to confirm).

**Implementation notes:**
- Query `plaidItems` (or wherever Plaid item state lives — likely the `convex-plaid` component schema).
- Return per-item: institution name, last successful sync timestamp, current error state if any (`reconsent_required`, `item_login_required`, etc.), days since last sync.
- Sort by error severity then by oldest sync.
- Surface a summary line for `deriveSummary` (e.g., "2 connections healthy, 1 needs reconnect").

**Tests:**
1. All-healthy case returns clean state.
2. Error states surface correctly.
3. Stale sync surfaces correctly.
4. Cross-user item spoofing rejected.

---

## Implementation conventions (apply to each PR)

1. **Linear sub-issue per tool**, parent CROWDEV-329. Title pattern: `Implement <toolName> agent tool (was W2.11 stub)`.
2. **Branch per tool**: `gt create CROWDEV-NNN-implement-<tool-name>`.
3. **Atomic PR per tool** — do not bundle. Each is a single logical change.
4. **Stack on PR #172 head** (or whatever the latest stack head is at execution time).
5. **Read the fixture first** to lock in the contract — the frontend component already expects a specific shape.
6. **Mirror PR #172's pattern** for query structure, viewer auth, default args, output shape, test approach.
7. **Required after implementing** — `cd packages/backend && bunx convex dev --once` to push the new function to the dev deployment. Otherwise the Vercel preview can't call the new tool. (See CLAUDE.md / AGENTS.md "Backend changes must be deployed before testing.")
8. **Verification:** convex-test cases for the regression + auth boundary at minimum. Full backend test suite must still pass (currently 298/298 + new tests per PR).
9. **Final report on Linear sub-issue** with Graphite PR link (NOT GitHub URL per CLAUDE.md / AGENTS.md rules), Vercel preview URL, root cause notes (if the stub was truly empty vs. partially implemented), test coverage summary, and any concerns.

## Recommended order

In rough order of user-visible impact:

1. **`getSpendByCategory`** — most-asked of the four ("how much did I spend on X"). Highest demo impact.
2. **`getSpendOverTime`** — second-most-asked (charts make a strong demo).
3. **`searchMerchants`** — useful but less common.
4. **`getPlaidHealth`** — diagnostic; lowest user-facing impact but useful for support.

Total estimated work: ~½ day per tool if the stub-pattern matches `list_transactions` (query-only, no schema changes). If a tool needs schema additions or backend mutations, scope grows.

## Acceptance for full closure

- [ ] All 4 tools implemented and deployed to `dev:canny-turtle-982`.
- [ ] All 4 corresponding chat queries return real data on `app.preview.smartpockets.com`:
  - "How much did I spend on groceries last month?" → real category breakdown.
  - "Show my spend trend over the last quarter." → real chart data.
  - "Find all my Amazon charges." → real merchant matches.
  - "Are any of my Plaid connections broken?" → real health status.
- [ ] Each tool has convex-test regression coverage.
- [ ] No new agent tools land as stubs without explicit fixture-only scope and a sub-issue tracking the implementation.

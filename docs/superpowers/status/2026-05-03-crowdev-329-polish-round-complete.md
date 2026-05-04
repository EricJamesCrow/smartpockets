# CROWDEV-329 Polish Round — Complete

**Date:** 2026-05-03
**Linear parent:** [CROWDEV-329](https://linear.app/crowdevelopment/issue/CROWDEV-329) — Agentic Chat Polish (parent stays In Progress for W2.9–W2.13)
**Status:** Polish chapter (Tasks 1–8 + bug-sweep + bugs 6–9 + sign-convention follow-ups) complete, all merged into `main`.

## What shipped

Every PR in the polish stack landed in `main`. See the [final summary comment on CROWDEV-329](https://linear.app/crowdevelopment/issue/CROWDEV-329) for the full PR-by-PR table with merged SHAs.

Highlights:

- **Foundations (PRs #154–#167):** dependencies, motion tokens, streaming + scroll polish, stop button, avatars, markdown via streamdown, tool-call display, sidebar grouping + mutations, backend cancellation, multiple codex-review fixes.
- **W2.11 stub tools (PRs #174–#177):** real implementations of `getSpendByCategory`, `getSpendOverTime`, `searchMerchants`, `getPlaidHealth`.
- **Auto-titling (PR #181):** threads auto-title via Haiku after first turn.
- **Bug-sweep (PRs #186–#190):** em-dash lint fix, lint-script removal, idempotency-test await, **unsubscribe token base64url padding (real production bug)**, vitest include glob.
- **Final consolidation (PR #191):** kebab fix + multi-turn-after-tool-call fix + plaid-health tool-result component + tsconfig alignment + searchMerchants tool-result component.
- **Bugs 6–9 (PRs #192–#195):** copy → checkmark icon, thinking indicator on follow-ups, Plaid sign convention at display boundary, compact row snapshots in id-emitting tools.
- **Sign-convention extensions (PRs #196, #198, #200):** `displayAmount` on rows + `amountFormatted` verbatim string + `direction` label; merchant aggregation `displayTotalAmount`; external MCP `MCPTransaction.displayAmount`; system prompt rule #10 hardened across three iterations.
- **`isStreaming` finally cleanup (PR #197):** `finalizeUserTurnIfStranded` mutation called from `runAgentTurn`'s `finally` so user rows aren't left flagged streaming forever after `streamText` errors.

## `PROMPT_VERSION` lineage

`2026.04.28-1` → `2026.05.03-1` (sign-convention rule #10 introduced) → `2026.05.03-2` (merchant aggregation guidance + balance-tool no-flip note) → `2026.05.03-3` (verbatim `amountFormatted` rules).

## Lessons encoded into the docs

This session contributed three additions to the project guardrails:

1. **CLAUDE.md mandatory rule #11 (`885d270`):** parallel sub-agent dispatches must use `isolation: "worktree"`. Any time you fan out two or more concurrent `Agent` calls, every parallel call gets its own checkout. Sharing one worktree across parallel agents is unsafe — we have spent multiple sessions recovering from `git symbolic-ref HEAD ...` corruption.

2. **AGENTS.md → Common Pitfalls → Sub-Agent Mistakes table:** worktree-isolation rule + bootstrap recipe (`.env.local` copy + `bun install`) + audit-scope discipline ("name every surface in scope by name; vague audits miss surfaces").

3. **AGENTS.md → Agent Tool Output Patterns (new top-level section):** pre-format every value the model echoes back to the user. The CROWDEV-329 sign-convention saga showed that `displayAmount: number` alone wasn't enough to overcome Haiku's "eBay = purchase" semantic prior. The fix that held was `amountFormatted: "+$550.47"` (pre-formatted string, copy verbatim) plus `direction: "inflow" | "outflow"` (verb selector). The new section codifies this pattern: when a model echoes a value, give it the exact string + a categorical label, not a number it has to reason about.

## Open follow-ups

Tracked but not yet sub-issued:

- **Persist `toolCallId` for full `ToolCallPart` / `ToolResultPart` history reconstruction.** CROWDEV-355's fix drops `tool` rows from `loadForStream` because we don't have the metadata to reconstruct them as valid `ModelMessage`s. CROWDEV-365's row snapshots partially mitigate (the model gets a compact row preview instead of just IDs), but full fidelity for arbitrary tools needs a schema change that's out of scope for the polish round.

## Process observation: `Refs` vs `Fixes`

Throughout this session I used `Refs CROWDEV-XXX` in commit messages. Most of those PRs fully completed their sub-issue, which means the correct magic word was `Fixes`. As a result, 16 sub-issues stayed in "In Progress" after their PRs merged — the GitHub-Linear automation didn't fire. I batch-corrected them post-merge by manually moving each to Done with a "shipped" comment that documents the merged SHA + PR.

This was a violation of CLAUDE.md rule #5 ("Never manually mark Linear issues as Done") — done with explicit user authorization for this specific cleanup. The general rule still stands. Default to `Fixes <ID>` for narrow sub-issues; reserve `Refs <ID>` for partial / exploratory / docs-only work.

## What's in `main` now (top of log)

```
8ae0646 #200 pre-format amount strings so model copies verbatim
f8150de #198 sign convention parity (MCP + searchMerchants totals + no-flip doc)
5fc35ad #196 widen sign convention to model-emitted text
996e32a #194 flip Plaid sign at display boundary
a3b96b2 #195 row snapshots in id-emitting tools
786c85b #197 finalize stranded isStreaming flag
f11f6c7 #193 thinking indicator on follow-ups
53591e0 #192 copy icon checkmark
cd2bb84 #190 vitest include glob (nested __tests__)
dcb33a0 #189 unsubscribe token base64url padding
7c55679 #188 await async idempotencyKey
f3f242e #187 drop broken lint scripts
e8fb667 #186 MerchantsList em-dash
b54e391 #191 final consolidation (kebab + multi-turn + plaid-health + tsconfig + searchMerchants)
```

## Next phase: W2.9–W2.13

The original plan at `docs/superpowers/plans/2026-04-30-crowdev-329-agentic-chat-polish.md` lists Tasks 9–13 (and beyond). Pick up there with a **fresh session** invoking `superpowers:subagent-driven-development` cleanly. Recommended new-session prompt is in the conversation handoff alongside this doc.

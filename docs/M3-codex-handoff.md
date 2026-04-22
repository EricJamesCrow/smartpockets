# M3 Agentic Home: Codex Handoff

**Status:** 22 open PRs across 3 stacks (W1, W5, W6). UI is complete. Handing off remaining backend/test/review work.
**Date:** 2026-04-22
**Author:** Claude (orchestrator session)
**Target agent:** Codex

---

## 0. TL;DR for Codex

Pick up M3 from this point:
1. Read `specs/00-contracts.md` as the cross-workstream source of truth.
2. Wait for CodeRabbit to finish reviewing the 22 PRs (it runs async; partial findings already landed).
3. Address CodeRabbit findings across all 22 PRs using `codex review` / `codex exec` per worktree.
4. Ship the remaining deferred pieces: W5.6 bulk orchestrator, W5.12 test suite, bulk filter resolver improvement.
5. Merge stacks in dependency order once reviews are clean.

Do NOT: run `npx convex codegen` (it corrupts `plaid.private` namespace — see §5.3). Do NOT: try to ship W5.10 Plaid item tools yet (blocked — see §5.4). Do NOT: mark draft PRs ready without addressing their fix session's notes.

---

## 1. Canonical references (read first)

| Path | Role |
|---|---|
| `specs/00-contracts.md` | Cross-workstream contract source of truth. §1 schemas, §2 25-tool registry, §3 9-state proposal machine, §4 tool envelope, §9 emailEvents, §10 Strategy C-prime idempotency, §12 rate-limit buckets, §14 8 email templates, §15 dispatch signatures, §16 direct-UI mutations, §17 `get_upcoming_statements` wiring. |
| `specs/00-idempotency-semantics.md` §4 | Committed Strategy C-prime (producer-insert dedup via unique index on `agentProposals.contentHash` and `emailEvents.idempotencyKey`). Shared hash utility at `packages/backend/convex/notifications/hashing.ts`. |
| `specs/W0-existing-state-audit.md` | Baseline of pre-M3 repo. Don't re-specify what's already built. |
| `specs/W{1-7}-{slug}.md` | Per-workstream authoritative specs. |
| `specs/W{1-7}-{slug}.plan.md` | Per-workstream task plans. |
| `AGENTS.md`, `CLAUDE.md` | Repo conventions (atomic commits, Graphite workflow, no em-dashes, `ctx.viewerX()`, `./functions` imports). |

---

## 2. PR board (as of handoff)

### W1 — Chat Home (6 PRs, all READY)
- #81 relocate dashboard → `/overview`
- #82 replace `/` with chat placeholder + `[threadId]` guard
- #83 port UntitledUI chat components with live agent wiring
- #84 sidebar History nav + Threads command menu section
- #85 error UX banners + reconsent modal + typed error routing + **Clerk auth bearer + toolHint + tool-result persistence** (added during fix cycle)
- #86 reserved-slug lint guard (canonical-list enforcement)

### W5 — Mutations (9 PRs)
**Foundation stack (READY):**
- #90 `auditLog` table + overlay/card schema fields
- #91 `writeTool` wrapper + internal proposal CRUD + 6 unit tests
- #92 `undo_mutation` with reversal registry + idempotent retry
- #93 first-turn-read guard + destructive-action gating (trusted field only)

**Round 3 stack (DRAFT — need `gh pr ready`):**
- #103 rate-limit wiring inside wrapper (`write_single`, `write_bulk`, `write_expensive`, `destructive_ops`)
- #104 `propose_transaction_update` + bulk bodies (unified multi-field overlay)
- #105 `propose_credit_card_metadata_update` (whole-record patch)
- #106 `propose_manual_promo`
- #107 `propose_reminder_create` + `propose_reminder_delete`

### W6 — Intelligence (12 PRs)
**Phase 1 stack (READY):**
- #87 6 W6 tables (countdowns, reminders, anomalies, subs, cashflow)
- #88 W4 schema snapshot test
- #89 promo countdown refresh + recompute + daily 07:00 UTC cron
- #94 statement reminder daily scan (07:10 UTC) + queries
- #95 anomaly detection (hourly :20, 3 rules, per-event dispatch, inclusive watermark)
- #96 merchant normalizer + interval helpers (pure, 23 fixture tests)
- #97 subscription detection (Plaid + catchup, canonical-tuple upsert, per-user digest dispatch in dollars)

**Round 3 stack (DRAFT — need `gh pr ready`):**
- #98 cashflow compute (pure function + 15 unit tests)
- #99 cashflow daily refresh cron (07:15 UTC) + `getForViewer` query
- #100 5 direct-UI mutations for subscriptions/anomalies (per contracts §16)
- #101 `get_upcoming_statements` reads `statementReminders`
- #102 W7 statement-closing dispatch wiring at 3d/1d cadences

**W6 is feature-complete.**

### Already merged before handoff (for reference)
- W2 agent backend (#80 stack + prior)
- W3 generative UI registry + 11 components + ProposalConfirmCard
- W4 Plaid gap closure (#62-#77)
- W7 email system (#80)

---

## 3. Review cycles completed so far

**Round 1 Codex cross-review** surfaced:
- **W1:** 4 CRITICAL (reserved slugs incomplete, chat auth missing, `toolHint` dropped, tool result not persisted) + 1 IMPORTANT (markdown XSS) + 3 MINOR.
- **W5:** 1 CRITICAL (`confirmDestructive` model-settable) + 3 IMPORTANT (execute retry, undo retry, `auditLog` field names).
- **W6:** 2 CRITICAL (api.d.ts codegen, subscription unit mismatch) + 4 IMPORTANT (watermark, TooManyReads, missing cron, Plaid upsert key) + 1 MINOR.

**Fix cycle** addressed all CRITICAL + IMPORTANT + MINOR. Commits are already pushed to the respective branches.

**Round 3 (W5 + W6 deferred work)** subsequently shipped the PRs listed in §2.

**Round 2 Codex cross-review** has NOT been run on the fix commits or round-3 additions. CodeRabbit is running async in place of it.

---

## 4. What Codex should do next (suggested order)

### Phase 1: review intake (now)

1. **Flip round-3 draft PRs to ready-for-review** so CodeRabbit picks them up:
   ```
   gh pr ready 98 99 100 101 102 103 104 105 106 107
   ```
2. **Wait for CodeRabbit** to finish reviewing all 22 PRs (typically 5-15 min per PR once ready; full pass ~30 min).
3. **Optional:** Run `codex review --base main` in each of the 3 worktrees (`~/Developer/smartpockets-W1-chat`, `-W5-mutations`, `-W6-intel`) for an independent cross-review alongside CodeRabbit. Known CLI gotcha: `codex review` cannot combine `--base` with a custom prompt argument. Use `codex exec --dangerously-bypass-approvals-and-sandbox "<prompt>"` if you need custom focus areas.

### Phase 2: fix cycle

4. **Collect CodeRabbit + Codex findings** per PR.
5. **Apply fixes** using the Graphite `gt modify -a` pattern (amend commits in place rather than stacking fixups). The prior fix cycle used this successfully.
6. **`gt submit --stack --no-interactive`** to push amended content.
7. **Verify:** `bun typecheck` (apps/app + packages/backend); `bun test` in packages/backend.

### Phase 3: remaining deferred work

8. **W5.6 — bulk orchestrator via `@convex-dev/workflow`** (architecturally substantial).
   - Current state: `propose_bulk_transaction_update` uses inline scheduler fan-out (Variant A).
   - Target: migrate to a Convex workflow that chunks the per-row execution across step-runMutation calls.
   - Plan: `specs/W5-mutations.plan.md` has the workflow step shape.
   - Acceptance fallback: if the workflow component's step API is subtle, ship Variant A as final MVP and defer the workflow migration to post-MVP. Document the decision.
9. **W5.12 — full test suite**. Concurrency (race between confirm/execute/undo), adversarial inputs (first-turn bypass attempts, destructive without flag, cross-user token forgery), bulk recovery (workflow restart mid-chunk). Mechanical; Codex's strength.
10. **Bulk filter resolver improvement**. W5 R3 v2 caveat: `propose_bulk_transaction_update` currently only matches viewer-owned `transactionOverlays`. Extend to resolve over raw Plaid transactions via the Plaid component so "mass-categorize all Starbucks in March" works even on un-overlaid transactions.

### Phase 4: merges

11. **Merge order** (respect the Graphite stack deps):
    - W1: merge #81 → #82 → #83 → #84 → #85 → #86 in order.
    - W5: merge #90 → #91 → #92 → #93 → #103 → #104 → #105 → #106 → #107.
    - W6: merge #87 → #88 → #89 → #94 → #95 → #96 → #97 → #98 → #99 → #100 → #101 → #102.
    - W1 and W6 are independent. W5 can merge any time. All three stacks are anchored at `main`.
12. **After schema PRs merge** (#87 W6, #90 W5): run `npx convex dev --once` locally to regenerate `_generated/api.d.ts` with the full intelligence + agent tree. **See gotcha in §5.3 first.**

### Phase 5: close-out

13. Close Linear M3 Agentic Home milestone once all 22 PRs merge.
14. Update `TODO.md` — mark M3 items complete.
15. Post-MVP backlog per master prompt §16 (subdomain routing, Clerk billing alpha, PostHog, pricing page, self-hosting guide, dashboard polish).

---

## 5. Known gotchas and deferred items

### 5.1 Bulk filter resolver (W5 R3 caveat)

`propose_bulk_transaction_update` filter resolver currently queries `transactionOverlays` only. Users who say "recategorize all Starbucks in March" where none of those transactions have ever been touched get `no_matches`. Fix: add a Plaid-component-backed resolver path. Not urgent; agent behavior is correct, just limited to the "already touched" subset.

### 5.2 W5 pre-existing test baseline

`bun test` in `packages/backend` shows 10 pre-existing failures in:
- `email/__tests__/unsubscribeToken.test.ts` — Web Crypto type issues (CryptoKey / BufferSource).
- `email/templates.ts` — JSX render without `--jsx` flag.
- `notifications/__tests__/hashing.test.ts` — async/sync mismatch (outside vitest include glob; doesn't actually run).

These are NOT caused by W1/W5/W6. Do not let them block progress. W7 ships a follow-up fix for email/template JSX separately.

### 5.3 convex codegen corrupts `plaid.private`

**Important:** running `npx convex dev --once` or `convex codegen` with the current local state regenerates `_generated/api.d.ts` but ALSO rewrites the `plaid.private` namespace in a way that breaks the Plaid component's internal exports. The fix sessions worked around this by **hand-editing `api.d.ts`** to add intelligence/agent tree entries without running codegen.

Pattern: find the `intelligence` or `agent` module sibling in `fullApi` and append new module references manually. See commits on branches `W6-01-schema`, `W6-03-promo-countdown`, etc. for examples.

Post-merge, once all stacks land on main, Codex may need to run `convex dev --once` once against a clean deployment to rebuild `api.d.ts` properly — but verify `plaid.private` roundtrips correctly afterward.

### 5.4 W5.10 still blocked on W4

`propose_plaid_item_resync` and `propose_plaid_item_remove` are deferred because W4's current surface exposes `syncPlaidItemInternal` (internal) but not a user-scoped `triggerManualResync` action with the auth checks W5 expects. Options:
- (a) Extend W4 with a trusted wrapper action — a separate PR on the W4 stack.
- (b) Let W5 bypass by calling `internal.plaidComponent.syncPlaidItemInternal` directly with its own auth enforcement.
- (c) Accept W5.10 as post-MVP.

No action required unless the roadmap needs it.

### 5.5 Round 3 draft PRs

PRs #98-#102 (W6) and #103-#107 (W5) are draft. CodeRabbit skips draft PRs by default. Codex must flip them via `gh pr ready` before the first review cycle.

### 5.6 Graphite stack hygiene

Each stack is anchored at `main`. If main advances (via merges) during the fix cycle, use `gt restack` to rebase the remaining stack. Conflicts may arise in `_generated/api.d.ts` since multiple stacks touch it — resolve by taking the union of module references.

### 5.7 Worktrees used so far

```
~/Developer/smartpockets-W1-chat       → feat/agentic-home/W1-*
~/Developer/smartpockets-W5-mutations  → feat/agentic-home/W5-*
~/Developer/smartpockets-W6-intel      → feat/agentic-home/W6-*
```

Each has its own `.fix.log`, `.round3.log`, `.codex-review.log` from prior sessions. These can be deleted or ignored; they're local-only and `.gitignored` effectively (untracked in git).

---

## 6. Contract invariants Codex must not break

When applying fixes, do NOT regress these (they were each hard-won in the reconciliation pass):

1. **`agentProposals.contentHash` is `.field(..., { unique: true })`** — enforces Strategy C-prime dedup at insert. No pre-check-then-insert.
2. **`emailEvents.idempotencyKey` is `.field(..., { unique: true })`** — same rule.
3. **9-state proposal enum** (`proposed | awaiting_confirmation | confirmed | executing | executed | cancelled | timed_out | reverted | failed`) is canonical.
4. **Shared hashing utility** at `packages/backend/convex/notifications/hashing.ts`. Both W5 (`contentHash`) and W7 (`idempotencyKey`) import from here.
5. **`W5.executeWriteTool` retry idempotency**: `state === "executed"` returns original reversal token; `state === "failed"` rethrows. Similarly `undo_mutation` returns `alreadyReverted: true` for second call.
6. **`confirmDestructive` is NOT in LLM-facing schema**; trusted `userConfirmedDestructive` is set by W3's second-click path on the proposal row.
7. **Reserved slugs include `dev`, `sign-in`, `sign-up`** plus the canonical list in contracts §1.4. Lint guard parses the canonical list, not just directory contents.
8. **Route param is `Id<"agentThreads">`, not `componentThreadId`**.
9. **Tool registry has 25 entries** including `get_proposal` and `get_plaid_health`, NOT `search_transactions` (deferred).
10. **Per-event anomaly inserts**, W7 workflow coalesces. `dispatchAnomalyAlert` takes single `anomalyId`.
11. **Subscription and anomaly mutations are direct-UI** (per contracts §16), not propose/confirm/execute.
12. **Subscription dispatch payload in dollars** not cents.
13. **No em-dashes anywhere.**

---

## 7. Quick commands for Codex

```bash
# Phase 1: flip draft PRs
gh pr ready 98 99 100 101 102 103 104 105 106 107

# Phase 2: cross-review (from each worktree)
cd ~/Developer/smartpockets-W5-mutations
codex exec --dangerously-bypass-approvals-and-sandbox "Review feat/agentic-home/W5-05-rate-limits through W5-09-reminders against specs/00-contracts.md. Flag CRITICAL/IMPORTANT/MINOR. Under 600 words."

# Phase 3: fix findings (Graphite amend pattern)
gt checkout feat/agentic-home/<branch>
# edit files
gt modify -a
gt submit --stack --no-interactive

# Phase 4: merge in order via Graphite (requires approval)
gt merge --stack  # or squash-merge per-PR via gh

# Regenerate api.d.ts post-merge (read §5.3 first)
cd packages/backend
# only run once all intelligence + agent PRs have merged:
npx convex dev --once
# then verify plaid.private still exports correctly and commit if so
```

---

## 8. If Codex gets stuck

- **Contract ambiguity:** `specs/00-contracts.md` wins. If contracts and a workstream spec disagree, contracts wins unless a reconciliation amendment lands first.
- **Pre-existing test failures:** the 10 W7/email/hashing failures noted in §5.2 are not Codex's to fix.
- **Architectural decision required:** stop and leave a clear note in a draft PR description or a TODO.md entry rather than guess.
- **Merge conflicts in `_generated/api.d.ts`:** take the union of module references. Do not run codegen (§5.3).

---

**End of handoff.** Everything Codex needs to wrap M3 is above. The three worktrees are clean and on their top branches. PR numbers 81-107 (with 82, 83, 85, 86, 89, 94, 95, 97 already updated with fixes) are the complete M3 delivery.

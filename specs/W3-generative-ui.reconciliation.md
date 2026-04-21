---
workstream: W3 Generative UI
phase: reconciliation
author: Claude Opus 4.7 (1M context), Obra Superpowers
date: 2026-04-20
---

# W3 Generative UI Reconciliation Log

Closes the plan's Task 15 checklist. Documents which cross-workstream contract
requests (CR-1 through CR-5) are satisfied at the time W3 lands on the stack,
which remain open, and what the W3 shape looks like against each.

## Cross-workstream status

| CR | Required of | Status at W3 merge | W3 stance |
|---|---|---|---|
| CR-1: `api.agent.chat.sendStreaming` accepts optional `toolHint` | W2 | **Open.** W2 plan acknowledges the extension as non-breaking (§5.4 of W2 plan). No implementation on the stack yet. | W3 ships useToolHintSend against the final wire shape. Until CR-1 lands, `sendMessage` in `ChatInteractionContext` is a throwing stub that warns in the console. Drill-ins will no-op (harmlessly) until W1 wires the real action. |
| CR-2: Agent system prompt honors `metadata.toolHint` | W2 | **Open.** W2 plan Task 7 (system prompt) slots the instruction. | Same as CR-1. Without it, drill-ins fall back to natural-language routing. |
| CR-3: `undo_mutation(reversalToken)` agent tool | W5 | **Open.** W5 plan registers the tool body. W2 plan adds it to the tool registry. | ProposalConfirmCard renders the Undo button normally; `undoMutation` helper dispatches a `toolHint` turn. When CR-3 is not registered in W2's tool registry, the agent simply refuses the hint and the user sees no action — no frontend failure mode. |
| CR-4: W1 exports `ChatInteractionProvider` + `useChatInteraction()` | W1 | **Open.** W1 has not yet implemented the provider or the CB-3 signature reconciliation. | W3 ships the stub at `apps/app/src/components/chat/ChatInteractionContext.tsx` (path W1 must preserve). Real W1 implementation replaces the body while keeping the exported signature stable. The stub throws outside a provider, keeping the error surface identical to what W1 will ship. |
| CR-5: Helper queries (`getManyByIds` family, `api.agent.proposals.get`) | W2 / W5 | **Open.** No queries merged. | `shared/liveRowsHooks.tsx` returns `undefined` from each hook until a real query lands. Components fall through to their skeleton during this period. Fixtures carry `preview` payloads so every tool's card still reads correctly in the preview harness. |

## Acceptance criteria (W3 spec §10)

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | `toolResultRegistry` covers all 14 read tool names plus `get_proposal`; every entry points at a file that exports the declared component | Pass | `apps/app/src/components/chat/tool-results/registry.tsx` — 15 entries wired |
| 2 | `proposalFallback` points at `ProposalConfirmCard` | Pass | Same file; extracts `proposalId` from payload |
| 3 | Every component has a fixture exporting the four base states; `ProposalConfirmCard` exports the propose-specific states | Pass | 12 fixture files in `__fixtures__/`; propose fixtures cover `awaitingConfirmation_single / _bulk / _irreversible`, `executing`, `executed`, `executedWithinUndoWindow`, `executedPastUndoWindow`, `cancelled`, `timedOut`, `reverted`, `failed` across the six propose tools |
| 4 | `/dev/tool-results` index lists every component; each sub-page renders every fixture with theme toggle | Pass | `apps/app/src/app/(app)/dev/tool-results/page.tsx` lists 18 tool names; `[component]/page.tsx` renders fixtures via `FixtureRenderer` with `ThemeToggle` |
| 5 | Every file under `tool-results/` begins with `"use client"` | Pass, enforced | Guardrail rule R1 in `scripts/check-tool-results.ts` |
| 6 | Zero `useMemo` / `useCallback` / `React.memo` without inline justification | Pass, enforced | Guardrail rule R3 |
| 7 | Zero `useQuery` imports from `convex/react`; all resolve to `convex-helpers/react/cache/hooks` | Pass, enforced | Guardrail rule R2. Note: current `liveRowsHooks.tsx` does not import either yet (stub returns `undefined`); when CR-5 lands, the imports must come from the cached module |
| 8 | Zero color literals; all colour references come from UntitledUI tokens | Pass, enforced | Guardrail rule R4. Chart palettes reference `var(--color-utility-*)` CSS variables |
| 9 | `bun typecheck --filter=@repo/app` passes | Pass | `apps/app/typecheck` is clean. The workspace-level `@repo/backend` typecheck has pre-existing failures unrelated to W3 (email template tsx resolution) |
| 10 | `bun build --filter=@repo/app` succeeds with `NEXT_PUBLIC_DEV_TOOLS` unset; `/dev/tool-results/*` returns 404 | Blocked in this environment | Main build fails without `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` regardless of W3; re-verify in a CI environment with secrets. Route-level gating verified by code inspection: both `page.tsx` files call `notFound()` when `NODE_ENV === "production" && NEXT_PUBLIC_DEV_TOOLS !== "1"` |
| 11 | With `NEXT_PUBLIC_DEV_TOOLS=1`, `/dev/tool-results/*` renders every component and fixture | Deferred | Manual QA must run in an env with Clerk keys present. Walkthrough checklist below |
| 12 | `ProposalConfirmCard` renders correct variant for `scope`, shows drift banner on simulated mutation, shows irreversible-scope banner for ≥501 rows | Pass | `AwaitingView` dispatches on `proposal.scope`; `useDriftDetection` returns true when any affected row's `_updateTime > proposal.createdAt`; `IrreversibleBanner` fires at `affectedCount > 500`; `awaitingConfirmation_irreversible` fixture mocks 650 rows |
| 13 | Existing routes unchanged | Pass | W3 only adds files under `apps/app/src/components/chat/tool-results/**`, `apps/app/src/components/chat/ChatInteractionContext.tsx`, `apps/app/src/app/(app)/dev/tool-results/**`, and `apps/app/scripts/check-tool-results.ts`. No modifications to `/credit-cards`, `/wallets`, `/transactions`, `/settings/*`. `bun dev:app` + visual confirmation deferred to the merge PR |
| 14 | CodeRabbit passes on the Graphite stack | Deferred | Runs automatically on PR submission via `gt submit --stack` |

## Manual QA checklist (run in an environment with Clerk keys + `bun dev`)

1. `bun dev:app` to start the app.
2. Sign in with a dev user.
3. Navigate to `http://localhost:3000/dev/tool-results`.
4. Verify each link in the index lists every expected component name.
5. For each `/dev/tool-results/:component`:
   - [ ] Input-streaming fixture renders a skeleton (per-component style).
   - [ ] Output-available fixture renders the expected card layout.
   - [ ] Output-available-empty fixture renders the empty state copy.
   - [ ] Output-error fixture renders an error-level readout (W3 MVP does not own the retry row; W1's `ToolErrorRow` will render in the real chat path).
   - [ ] Dark-mode toggle flips all text and surface colors via UntitledUI tokens.
6. For `ProposalConfirmCard` fixtures additionally:
   - [ ] `awaitingConfirmation_single` shows the inline patch diff.
   - [ ] `awaitingConfirmation_bulk` shows the sample JSON beneath the diff.
   - [ ] `awaitingConfirmation_irreversible` renders the irreversible banner.
   - [ ] `awaitingConfirmation_single_withDrift` surfaces the drift banner.
   - [ ] `executing` shows the spinner.
   - [ ] `executedWithinUndoWindow` shows the Undo button with a minute countdown.
   - [ ] `executedPastUndoWindow` hides the Undo button.
   - [ ] `cancelled` renders greyed out.
   - [ ] `timedOut` renders warning copy.
   - [ ] `reverted` shows the revert timestamp.
   - [ ] `failed` surfaces `errorSummary`.
7. Click any drill-in affordance inside a fixture card. Expected: console warning from the `ChatInteractionContext` stub (no network call). After CR-1/CR-4 land, the warning is replaced with a real `api.agent.chat.sendStreaming` POST visible in devtools.

## Build guardrails

- `bun run lint --filter=@repo/app` → runs `scripts/check-tool-results.ts`; reports `OK: 47 file(s) in tool-results/ pass guardrails.`
- `bun run typecheck --filter=@repo/app` → clean.

## Open follow-ups

| # | Follow-up | Source |
|---|---|---|
| 1 | Wire `liveRowsHooks.tsx` to real queries once CR-5 merges. Swap the `return undefined` bodies for `useQuery(api.X.Y, ids.length ? { ids } : "skip")` imports from `convex-helpers/react/cache/hooks`. | spec §9.2 CR-5 |
| 2 | Replace the stub body in `ChatInteractionContext.tsx` with W1's real `api.agent.chat.sendStreaming` dispatch. The exported signature must not change. | spec §9.2 CR-4 |
| 3 | Extract `getUrgencyColor` from `apps/app/src/components/credit-cards/details/PromoTracker.tsx:20` into a shared helper. The duplicated definition in `DeferredInterestTimeline.tsx` carries a `// TODO` pointer. | plan §8.1 |
| 4 | Add the real-data helper queries (`getManyByIds` variants and `api.agent.proposals.get`) to `@convex/_generated/api`. Owning plans: W2 for proposal and reminders; W2/W5 for transactions; W5 for promoRates/installmentPlans. | research §3.5 |
| 5 | Post-MVP: add virtualisation to `TransactionsTable` and the `ProposalConfirmCard` bulk expansion when user queries routinely return >500 rows. | research §7.2 |

## Rollback

If the W3 stack must be reverted mid-flight:

1. `gt delete feat/agentic-home/W3-*` removes every W3 branch.
2. All W3 files live under three isolated paths (`apps/app/src/components/chat/**`, `apps/app/src/app/(app)/dev/tool-results/**`, `apps/app/scripts/check-tool-results.ts`) plus one `.env.example` line. Reverting removes all chat-related UI scaffolding cleanly; no existing routes depend on anything W3 introduces.
3. No schema migrations; rollback is code-only.

---

End of reconciliation log.

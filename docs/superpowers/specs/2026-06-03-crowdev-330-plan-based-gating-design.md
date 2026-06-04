---
linear: CROWDEV-330
title: Plan-based gating — Free vs Pro (Clerk Billing) for chat + Plaid
date: 2026-06-03
status: draft
parent_issue: CROWDEV-330
related_issues:
  - CROWDEV-268  # recruiter-demo seed data (no real Plaid/billing) — sibling concern
  - CROWDEV-439  # chat_turn per-user rate limit (done) — burst layer this builds on
---

# Plan-based gating — Free vs Pro (Clerk Billing) for chat + Plaid

Spec for introducing a paid tier to SmartPockets so the project can stay an open,
demo-able portfolio app without exposing the owner to unbounded Anthropic + Plaid
cost. Addresses [CROWDEV-330](https://linear.app/crowdevelopment/issue/CROWDEV-330)
("Make Plaid + agentic features gated properly by Clerk subscriptions"), whose
description is currently empty — this doc is its canonical design.

## 1. Goal & bar

Today **any** signed-in user gets the full product: unlimited Plaid connections
and an AI agent metered only by a single **global** allowance (`1,000,000`
tokens/month, shared limit for everyone — see §3). That is fine for the owner and
catastrophic for an open demo: each connected user can run up real Anthropic spend
and real Plaid production billing.

The bar: a **limited free tier** that is genuinely useful for a demo, and a single
**Pro tier at $10/month** that unlocks meaningfully more. Both tiers stay capped —
Pro is "more headroom," not "unlimited." Enforcement must be **server-side** (the
security boundary), fail to the *least*-privileged plan on any doubt, and reuse the
metering scaffolding that already exists rather than rebuilding it.

Success criteria (verifiable):

- A free user is blocked from sending a chat turn after their monthly message
  allowance is spent, and sees an upgrade CTA — not a generic error.
- A free user with 1 active Plaid connection cannot create a 2nd; the Plaid Link
  button shows an upgrade prompt instead of opening Link.
- A Pro user gets the Pro allowances; downgrading reverts them to free limits.
- The owner's account always resolves to unlimited via an explicit allowlist (so
  demos keep working without self-paying).
- Every gate defaults to **free** limits when the plan can't be determined.

## 2. Scope

### In scope

- **Schema** (`packages/backend/convex/schema.ts`): add `plan` + subscription
  metadata to `users`; add a `usageCounters` ent (monthly message counter).
- **Entitlements module** (new `packages/backend/convex/billing/entitlements.ts`):
  the single source of truth mapping `plan → limits`.
- **Plan source of truth**: mirror the Clerk Billing plan onto `users.plan` via the
  existing Clerk webhook in `packages/backend/convex/http.ts`.
- **Chat enforcement**: extend `agent/budgets.ts` `checkHeadroom` to be
  plan-aware and add a message cap; increment the message counter at both
  turn-admit paths (`agent/threads.ts`).
- **Plaid enforcement**: cap active connections by plan in
  `packages/backend/convex/plaidComponent.ts` (link-token + exchange/onboard).
- **Frontend**: render the existing `CustomClerkPricing` at a `/pricing` route +
  an in-app upgrade entry; a `billing.getMyPlanAndUsage` query + hook; upgrade
  CTAs in the chat banner and Plaid Link button.
- **Owner grandfathering**: `BILLING_UNLIMITED_USER_IDS` env allowlist.
- **Tests**: unit tests for entitlements + plan-aware headroom + Plaid cap; a
  frontend test for the upgrade-CTA path.

### Out of scope (flagged, not touched)

- **Annual plans, multiple paid tiers, proration UI, usage-based overage
  billing.** Single `$10/mo` Pro tier only. (YAGNI — add later if there's demand.)
- **Team/Organization plans.** Clerk Orgs were intentionally removed
  ([CROWDEV-429](https://linear.app/crowdevelopment/issue/CROWDEV-429)); this is
  per-user B2C billing only.
- **A live "N messages left" counter inside the composer.** The banner at the cap
  is enough for v1; a persistent meter can be a fast-follower.
- **Gating the read-only product** (dashboard, manual card entry, viewing existing
  data). Free users keep full access to everything that doesn't cost the owner
  per-use money. Only *AI chat turns* and *new Plaid connections* are gated.
- **Recruiter-demo seed data** ([CROWDEV-268](https://linear.app/crowdevelopment/issue/CROWDEV-268)).
  Separate issue; this spec assumes real Clerk Billing, not a seeded demo path.
- **Changing the per-minute `chat_turn` burst limiter or the per-thread token
  cap.** Both stay as-is (runaway guards, plan-independent).

### Done means

Free and Pro plans exist in Clerk; `users.plan` tracks them; both choke points
enforce per-plan limits server-side with the owner allowlisted; the UI surfaces
limits + upgrade; tests pass; `cd apps/app && bun typecheck` is clean; backend is
deployed to `dev:canny-turtle-982` (per AGENTS.md rule 9). The work lands as an
atomic Graphite stack only if/when the owner explicitly asks to open PRs.

## 3. Architecture orientation (current state)

The metering scaffolding mostly **already exists** — it is just global and
plan-blind. This spec adds a *plan dimension* to it.

### What exists

- **Chat cost metering** — `agentUsage` ent (`schema.ts:454`) accrues
  `tokensIn / tokensOut / usdMicrocents` per `(userId, periodStart, modelId)`,
  written by `agent/budgets.ts` `recordUsage` on every step (`runtime.ts:718`).
- **Chat headroom gate** — `agent/budgets.ts` `checkHeadroom` enforces a monthly
  token cap (`AGENT_BUDGET_MONTHLY_TOKENS`, default `1_000_000`) and a per-thread
  token cap (`AGENT_BUDGET_PER_THREAD_TOKENS`, default `200_000`), reading
  `agentUsage` for the current UTC month (`firstOfMonthUtc`). Returns
  `{ ok, reason?: "monthly_cap" | "thread_cap" }`. **Plan-blind today.**
- **Gate call sites** — `http.ts:699` (`POST /api/agent/send`) returns
  `429 { error: "budget_exhausted", reason }`; `agent/threads.ts:355`
  (edit-and-resend) throws `budget_exhausted:<reason>`.
- **Per-minute burst** — `agent/rateLimits.ts` `chat_turn` bucket (6/min, cap 8)
  per user, applied in `agent/threads.ts:83` `applyChatTurnRateLimit`
  (from [CROWDEV-439](https://linear.app/crowdevelopment/issue/CROWDEV-439)).
- **Plaid connection count** — `users.ts:170` `countActivePlaidItems(userId)`
  already counts non-`deleting` items via the Plaid component. **No cap consumes
  it.** New connections flow through `plaidComponent.ts`
  `createLinkTokenAction` (:117) → `exchangePublicTokenAction` (:144) /
  `onboardNewConnectionAction` (:369).
- **Clerk Billing, half-wired** — `apps/app/src/components/clerk/custom-clerk-pricing.tsx`
  imports Clerk's `<PricingTable/>` and themes it, but it is **rendered nowhere**
  and there are **zero `has({ plan })` / `<Protect>`** checks in the codebase.
  `/pricing` appears in the marketing nav but has no app route.
- **Frontend typed-error pipeline** — `ChatInteractionContext.tsx` parses the
  `429` into `TypedAgentError({ kind: "budget_exhausted", reason })` (:147–205);
  `ChatBanner.tsx` renders `rate_limited | budget_exhausted | run_in_progress`.
  Extending these for an upgrade CTA is a small, well-bounded change.

### Stack

- Convex backend with **convex-ents** (`defineEnt`), `schemaValidation: false`.
- Auth: **Clerk**; Convex authenticates via the "convex" Clerk JWT template.
  Clerk user upserted into `users` by webhook (`users.ts` `upsertFromClerk`).
- `@convex-dev/rate-limiter` component already installed.
- Next.js 16 App Router, React 19, `@clerk/nextjs` (incl. `PricingTable`).

## 4. Decisions

Three were confirmed with the owner during brainstorming; the fourth (plan storage)
is the one real architecture fork.

1. **Payment = Clerk Billing.** Already on Clerk, `<PricingTable/>` already
   imported, no Stripe-webhook/customer-sync plumbing to own. Plans are created in
   the Clerk dashboard; checkout + card handling is Clerk's.
2. **Chat metering = messages + token backstop.** User-facing cap is a legible
   monthly **message count**; a per-plan monthly **token ceiling** sits underneath
   as a cost safety net so a single tool-heavy turn can't blow the budget. The
   message cap is the primary gate; tokens only bite pathological cases.
3. **Tiers = limited free + single Pro.** Free is useful-but-strict; Pro ($10/mo)
   is more headroom, still capped. (Numbers in §9.)
4. **Plan storage = mirror-to-DB + Clerk `has()` for UI (chosen).**
   - *Chosen:* Clerk Billing is the source of truth; a webhook mirrors the resolved
     plan onto `users.plan`. Every server-side gate (`checkHeadroom` is an
     `internalQuery` taking `userId`; the Plaid gate is an action with `userId`;
     future crons) reads one local field — trivial, uniform, unit-testable, easy to
     grandfather. The frontend *additionally* uses Clerk `has({ plan: 'pro' })` /
     `<Protect>` for **instant** UI reaction post-checkout (before the webhook
     lands). Server trusts the DB; UI is optimistic.
   - *Rejected:* read plan from JWT claims in Convex. `checkHeadroom` never touches
     auth today (it takes `userId`), so this would thread identity through every
     gate and couple us to Clerk's claim format. Kept only as a fallback if webhook
     mirroring proves unreliable.

## 5. Data model changes (`schema.ts`)

All additions are optional / new ents ⇒ migration-safe under
`schemaValidation: false`; existing rows need no backfill (absent `plan` ⇒ free).

```ts
// users: add billing fields (all optional)
plan: v.optional(v.union(v.literal("free"), v.literal("pro"))),
subscriptionStatus: v.optional(v.string()),   // raw Clerk status, for debugging/UI
planUpdatedAt: v.optional(v.number()),

// new ent: monthly message counter, one row per (user, month)
usageCounters: defineEnt({
    periodStart: v.number(),       // firstOfMonthUtc, matches agentUsage
    chatMessagesUsed: v.number(),
})
    .edge("user")
    .index("by_user_period", ["userId", "periodStart"]),
```

Notes:
- **Why a dedicated counter, not a column on `agentUsage`:** `agentUsage` is keyed
  per *model* (multiple rows/month); a message count doesn't belong on a per-model
  row. `usageCounters` has one clear purpose and one row per user-month.
- **Reset is implicit:** a new month ⇒ a new `periodStart` ⇒ a fresh row starting
  at 0. No cron needed (mirrors how `checkHeadroom` already scopes tokens).
- Token accounting is **unchanged** — still read from `agentUsage`.

## 6. Entitlements module (single source of truth)

New `packages/backend/convex/billing/entitlements.ts` — a small pure module:

```ts
export type Plan = "free" | "pro";

export interface Entitlements {
    chatMessagesPerMonth: number;   // primary, user-facing cap
    chatTokensPerMonth: number;     // secondary cost backstop
    maxPlaidConnections: number;
}

export function entitlementsFor(plan: Plan): Entitlements; // pure lookup
export function resolvePlan(input): Plan;                  // normalize unknown ⇒ "free"
```

- Numbers live as constants here (env-overridable for the global token backstop,
  matching the existing `AGENT_BUDGET_*` convention). The per-thread 200k cap stays
  in `budgets.ts` as a shared runaway guard — plan-independent.
- `resolvePlan` is the **fail-safe**: any unknown/missing value ⇒ `"free"`. The
  owner allowlist (§8) is applied *above* this, by callers that have the userId.

## 7. Backend enforcement — chat

### 7.1 Read side — plan-aware `checkHeadroom` (`agent/budgets.ts`)

Extend the existing `internalQuery` (signature unchanged: still `{ userId, threadId? }`):

1. Load `users.plan` for `userId`; apply owner allowlist; `entitlementsFor(plan)`.
2. **Message cap (new):** read the `usageCounters` row for the current
   `periodStart`; if `chatMessagesUsed >= ent.chatMessagesPerMonth` →
   `{ ok: false, reason: "message_cap" }`.
3. **Token backstop:** existing monthly-token logic, but the threshold is now
   `ent.chatTokensPerMonth` (not the global env constant) →
   `{ ok: false, reason: "monthly_cap" }`.
4. **Per-thread cap:** unchanged (`thread_cap`).

`reason` union becomes `"message_cap" | "monthly_cap" | "thread_cap"`. Both call
sites already forward `reason` verbatim (`http.ts:705`, `threads.ts:360`), so they
need no logic change — only the new literal flows through.

### 7.2 Write side — increment the counter at turn-admit (`agent/threads.ts`)

Add a shared internal helper `incrementChatMessageCount(ctx, userId)` (upsert the
`usageCounters` row for the current `periodStart`, `+1`). Call it from **both**
turn-creation mutations, *after* their headroom check passes and in the same
transaction as the user-message insert:

- `startUserTurn` (:119) — the `POST /api/agent/send` path.
- the edit-and-resend mutation (:302–406) — counts as a fresh turn (it triggers a
  new LLM run).

The authoritative *enforcement* is the pre-flight `checkHeadroom` (clean `429`
before we create a turn); the increment just maintains the counter. The tiny
check-then-increment race is per-user and bounded to ±1 turn at the month boundary —
acceptable for a quota. Failed/aborted turns still count (rare; keeps the code
simple and the increment transactional with admit).

## 8. Backend enforcement — Plaid (`plaidComponent.ts`)

Two layers, because the Plaid Item is created at exchange time:

1. **UX pre-check at link-token issuance** — in `createLinkTokenAction` (:117),
   before issuing a `link_token`: if
   `countActivePlaidItems(userId) >= ent.maxPlaidConnections`, throw a typed
   `plaid_connection_limit` error so the button never opens Plaid Link for a capped
   user (no dead-end through the Plaid modal).
2. **Hard enforcement at exchange** — in `exchangePublicTokenAction` (:144) **and**
   `onboardNewConnectionAction` (:369), re-check the cap *before* calling Plaid's
   `exchangePublicToken`. This blocks direct API calls and the race where two Links
   complete concurrently. Reject with `plaid_connection_limit` and do not exchange.

"Connection" = one Plaid **Item** (institution login), which is what
`countActivePlaidItems` counts. A single item may expose multiple accounts/cards;
the cap is on items, matching the owner's "one connection" intent.

**Fail-safe:** if the plan or count can't be resolved, treat as free
(`maxPlaidConnections: 1`).

## 9. Proposed numbers (entitlements defaults)

| Limit | Free | Pro ($10/mo) |
|---|---|---|
| Chat messages / month (primary) | **15** | **500** |
| Chat tokens / month (backstop) | **500,000** | **10,000,000** |
| Per-thread tokens (shared guard) | 200,000 | 200,000 |
| Active Plaid connections | **1** | **5** |

Rationale: the message cap is sized to bite first in virtually all normal use; the
token backstop is generous enough that a typical 15-message free user is never cut
off early by tokens, but a pathological tool-storm is still bounded. All values are
tunable constants (token backstops env-overridable). Pro's $10 covers a 500-message
month at the model's blended rate with comfortable margin (validate against
`computeUsdMicrocents` in `agent/config.ts` before launch).

## 10. Plan source of truth — Clerk Billing → `users.plan`

- **Clerk dashboard:** create a Billing **Free** plan and a **Pro** plan ($10/mo).
  Decide the plan slug used by `has({ plan })` and the webhook mapping (e.g.
  `pro`). Document the slugs in `AGENTS.md`.
- **Webhook sync:** extend the existing Clerk webhook handler in `http.ts` (which
  already routes `user.created/updated/deleted` → `users.ts`) to also handle
  Billing subscription lifecycle events. On any relevant event, resolve the user's
  *current active plan* and write `users.plan` + `subscriptionStatus` +
  `planUpdatedAt` via a new internal mutation `billing.syncPlanFromClerk`.
  - Resolution must be resilient: derive the plan from the event payload where
    unambiguous, otherwise fall back to reading Clerk's API for the user's active
    subscription. Unknown ⇒ `free` (least privilege).
  - Idempotent upsert keyed on the Clerk user id (same pattern as `upsertFromClerk`).
- **Eventual-consistency window:** between checkout success and the webhook landing,
  the server still sees `free`. The UI bridges this with Clerk `has()` (optimistic
  unlock); the server reconciles within seconds when the webhook writes `users.plan`.
  Acceptable for this product.

> **Verify during implementation (do not guess now):** exact Clerk Billing webhook
> event names/payloads, the `has({ plan })` slug format, and whether the "convex"
> JWT template can carry billing claims (the rejected fallback in §4, decision 4).
> Resolve via
> the `clerk` skill + Context7 (`@clerk/nextjs` / Clerk Billing docs) in the plan's
> first task, before writing the webhook.

## 11. Owner grandfathering & fail-safe

- **Allowlist:** `BILLING_UNLIMITED_USER_IDS` (comma-separated Clerk user ids) set
  in the Convex deployment env. A central ctx-aware resolver
  `resolveEffectivePlan(ctx, userId)` is what every gate calls. For an allowlisted
  user it returns an **`"unlimited"`** marker that makes the gates **skip the cap
  comparison entirely** (not merely map to `"pro"` — the owner does heavy
  dev/testing and would otherwise hit Pro's 500-message cap). For everyone else it
  reads `users.plan` and normalizes via `resolvePlan` (§6, unknown ⇒ free). Mirrors
  the repo's existing documented-exception pattern (Plaid prod exceptions in
  `vercel-build.sh`). Document the env var in `AGENTS.md`.
- **Fail-safe direction:** every resolver defaults to **free** on missing/unknown
  plan or lookup error. Unknown never grants Pro. Mirrors the existing
  `shouldFailClosedOnRateLimitError` philosophy for writes.

## 12. Frontend surfaces

- **Pricing page:** add an app route (e.g. `apps/app/src/app/(app)/pricing/page.tsx`
  or a `settings/billing` tab) rendering the existing `CustomClerkPricing`. Wire the
  marketing `/pricing` nav target. Clerk's `<PricingTable/>` owns checkout.
- **Usage + plan query:** new public Convex query `billing.getMyPlanAndUsage` →
  `{ plan, chat: { used, limit }, plaid: { used, limit } }`, backed by
  `resolveEffectivePlan` + `usageCounters` + `countActivePlaidItems`. A small
  `usePlanUsage` hook wraps it.
- **Chat composer:** when `chat.used >= chat.limit`, disable send and show an
  **upgrade** banner. Extend `ChatInteractionContext` to map the new
  `message_cap` reason and `ChatBanner` to render an upgrade action linking to
  `/pricing`. (Existing `budget_exhausted` plumbing is reused; `monthly_cap` keeps
  its current copy, `message_cap` gets upgrade copy.)
- **Plaid Link button** (`plaid-link-button.tsx`): when at the connection cap,
  render "Upgrade to connect more banks" → `/pricing` instead of launching Link;
  handle the `plaid_connection_limit` error from the actions as a defensive toast.

## 13. Error taxonomy

- Reuse the existing `429 { error: "budget_exhausted", reason }` envelope; add the
  `message_cap` reason value (no new HTTP shape).
- New typed Plaid error `plaid_connection_limit` surfaced from the Plaid actions;
  mapped client-side to an upgrade prompt. Slot into `agent/errors.ts` /
  `plaid/errorTaxonomy.ts` as appropriate so it's a known code, not a raw string.

## 14. Testing strategy

- **Unit (Convex, vitest):**
  - `entitlements`: lookups + `resolvePlan` fail-safe (unknown ⇒ free).
  - `checkHeadroom`: free user hits `message_cap` at limit; Pro user does not;
    token backstop still trips `monthly_cap`; per-thread `thread_cap` unchanged;
    missing plan ⇒ free limits. (Extends `__tests__/` alongside existing budget/
    rate-limit suites.)
  - counter increment: both turn-admit paths bump `usageCounters`; month rollover
    yields a fresh count.
  - Plaid cap: free user with 1 item is rejected at link-token *and* exchange; Pro
    user allowed up to 5; allowlisted owner unlimited. (Sibling to
    `__tests__/countActivePlaidItems.test.ts`.)
  - `syncPlanFromClerk`: maps a sample Billing webhook payload → `users.plan`;
    unknown ⇒ free; idempotent.
- **Frontend:** a Playwright/RTL test that a capped free user sees the upgrade CTA
  in the chat banner and the Plaid button shows the upgrade state.
- **Type/deploy gates (AGENTS.md rules 9–10):** `cd packages/backend &&
  bunx convex dev --once` to deploy functions to `dev:canny-turtle-982`, then
  `cd apps/app && bun typecheck`.

## 15. Rollout / migration

1. Land schema + entitlements + webhook sync first (no enforcement yet) so plans
   start populating and the owner is allowlisted — nothing changes for users.
2. Turn on Plaid cap, then chat cap (cheap to toggle via the entitlement numbers).
3. Existing connected users (incl. the owner's work-email account that prompted
   this) default to `free` until a Clerk subscription exists; allowlist the owner so
   demos keep working. No destructive backfill — `plan` simply absent ⇒ free.
4. Ship as an atomic Graphite stack (schema → entitlements/sync → chat gate →
   Plaid gate → frontend) **only when the owner explicitly asks to open PRs**;
   default finish is local verification + Linear-linked commits (AGENTS.md rule 6).

## 16. Open questions deferred to implementation

- Exact Clerk Billing event names / plan-slug format / API call for active-plan
  resolution (§10 verify-note).
- Whether to expose a persistent "messages left" meter now or defer (currently
  deferred, §2 out-of-scope).
- Final $10 margin check against `computeUsdMicrocents` blended rate (§9).

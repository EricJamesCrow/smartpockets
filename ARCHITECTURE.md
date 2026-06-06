# Architecture Reference

Detailed architecture standards and patterns for SmartPockets. Referenced from `AGENTS.md`.

For a higher-level architecture overview, see `docs/ARCHITECTURE.md`.

---

## Next.js + React Architecture Standards

### App Router Boundaries

Default pages and layouts in `apps/app/src/app/` to Server Components. Add `'use client'` only at the smallest component boundary that needs state, effects, browser APIs, event handlers, or Convex React hooks.

Keep data loading and auth-sensitive decisions on the server whenever possible. Client Components should receive the minimum serializable props they need and should not import server-only modules, Convex server functions, secrets, or Node-only SDKs.

### Request Interception

For Next.js 16 request interception work, use `apps/app/src/proxy.ts`. Do not create new `middleware.ts` files. Next.js proxy files run as Node.js proxy functions by default; keep that default unless a dedicated Linear issue documents why an Edge runtime is required and verifies Clerk/auth redirect behavior under that runtime.

### React Compiler

`apps/app/next.config.mjs` enables React Compiler. Avoid adding `memo`, `useMemo`, or `useCallback` by default. Use them only when profiling or a concrete compiler limitation shows they are needed, and leave a short comment explaining why.

### Dynamic Rendering

Do not add `export const dynamic = "force-dynamic"` to production app pages or layouts. Investigate the root cause instead. Test-only exceptions must be non-production guarded, documented in the file, and tied to a Linear issue. For Route Handlers, choose documented caching/runtime behavior deliberately.

### Route Handlers

SmartPockets is Convex-first. Do not create app data API routes for normal product reads/writes. Route Handlers are acceptable for external protocols that require HTTP endpoints, such as MCP, webhooks, file uploads, or streaming integrations, and must still enforce auth/ownership and return minimal DTOs.

---

## Convex Ents — Custom Context

This codebase uses **Convex Ents** with a custom viewer context. Import from `./functions`, NOT from `./_generated/server`:

```ts
// ✅ CORRECT
import { query, mutation } from "./functions";

// ❌ WRONG
import { query, mutation } from "./_generated/server";
```

## Viewer Context

| Method | Behavior |
|--------|----------|
| `ctx.viewer` | Current user (returns null if not authenticated) |
| `ctx.viewerX()` | Current user (throws if not authenticated) |
| `ctx.table()` | Ents table factory for type-safe queries |

## Table Operations

| Operation | Example |
|-----------|---------|
| Get by ID | `ctx.table("creditCards").get(cardId)` |
| Get by ID (throws) | `ctx.table("creditCards").getX(cardId)` |
| Get by unique field | `ctx.table("users").get("externalId", clerkId)` |
| Get by index | `ctx.table("members", "orgUser", (q) => q.eq("organizationId", orgId).eq("userId", userId)).unique()` |
| Edge traversal | `await wallet.edge("walletCards")` |
| Insert | `ctx.table("wallets").insert({ ...data })` |
| Update | `const w = await ctx.table("wallets").getX(id); await w.patch({ name })` |
| Delete | `const w = await ctx.table("wallets").getX(id); await w.delete()` |

## Read-Only vs Writable Entities

Edge traversals return **read-only** entities. For mutations, fetch directly:

```ts
// ❌ WRONG — edge() returns read-only
const cards = await wallet.edge("walletCards");
await cards[0].delete(); // ERROR

// ✅ CORRECT — fetch writable
for (const wc of await wallet.edge("walletCards")) {
  const writable = await ctx.table("walletCards").getX(wc._id);
  await writable.delete();
}
```

## Function Types

| Type | Import From | Use For |
|------|-------------|---------|
| `query`, `mutation` | `./functions` | Public API with auth context |
| `internalQuery`, `internalMutation` | `./_generated/server` | Internal functions |
| `action`, `internalAction` | `./_generated/server` | External API calls (Plaid, etc.) |

## Actions (External APIs)

Actions use base Convex functions — no custom context. Use internal mutations to persist:

```ts
"use node";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

export const syncCards = action({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const data = await fetchFromPlaidAPI();
    await ctx.runMutation(internal.creditCards.mutations.upsert, { userId, data });
    return null;
  },
});
```

## Required Validators

Always include argument AND return validators:

```ts
export const myQuery = query({
  args: { cardId: v.id("creditCards") },
  returns: v.string(),  // Required — use v.null() if nothing returned
  handler: async (ctx, { cardId }) => { ... },
});
```

## Convex Data + API Standards

### Query Scale

Queries over user-growing tables must use a specific index range plus `.take(n)`, `.paginate(...)`, `.first()`, or `.unique()`. Avoid unbounded scans or broad `.filter(...)` over growing tables unless the table is provably small and the reason is documented near the query.

When adding a query pattern that filters by user, account, card, wallet, status, date, or sort order, add or reuse a matching schema index. Prefer index-backed narrowing before in-memory filtering.

### Public Return Shapes

Public Convex functions must return DTOs, not raw Ent/component/provider documents. Never return Plaid access tokens, raw Clerk objects, secrets, raw provider errors, or fields not needed by the UI/tool. Shape the result for the caller and include only user-authorized data.

### Validators and `v.any()`

Use precise validators for public function args and returns. Avoid `v.any()` in public functions unless the payload is intentionally schemaless, provider-owned, or already validated elsewhere; document that reason inline. Internal compatibility boundaries can use `v.any()` sparingly, but should normalize into typed DTOs before reaching UI or agent tool outputs.

### Actions and Side Effects

Default to mutations that schedule actions for external side effects. Direct client `useAction` is allowed only for approved interactive Plaid flows or manual sync operations, must derive auth server-side, verify ownership, be idempotent or safe to retry, and return only minimal status needed by the UI.

---

## Plaid Architecture

The Plaid integration uses `@crowdevelopment/convex-plaid` component with a **denormalized data model**.

### Data Model

| Table | Owner | Purpose |
|-------|-------|---------|
| `plaid:plaidItems` | Component | Bank connections |
| `plaid:plaidAccounts` | Component | All bank accounts |
| `plaid:plaidTransactions` | Component | Transaction history |
| `plaid:plaidCreditCardLiabilities` | Component | APRs, payment info |
| `plaid:plaidRecurringStreams` | Component | Recurring patterns |
| `creditCards` | Native | **Denormalized** — merged account + liability data |

### Data Flow

```
User connects bank → Plaid Link
        ↓
exchangePublicToken → creates plaidItem
        ↓
fetchAccounts → creates plaidAccounts
        ↓
syncTransactions → creates plaidTransactions
        ↓
fetchLiabilities → creates plaidCreditCardLiabilities
        ↓
syncCreditCardsAction → DENORMALIZES into creditCards table
```

### Sync Triggers

| Trigger | When |
|---------|------|
| Onboarding | After Plaid Link connection (`onboardNewConnectionAction`) |
| Webhooks | `TRANSACTIONS`, `DEFAULT_UPDATE`, `LIABILITIES_UPDATE` |
| Daily Cron | 2 AM UTC via `syncAllActiveItemsInternal` |
| Manual | Settings > Institutions refresh |

### Key Files

| File | Purpose |
|------|---------|
| `packages/backend/convex/plaidComponent.ts` | Component wrapper, sync orchestration |
| `packages/backend/convex/creditCards/actions.ts` | `syncCreditCardsAction` — denormalization logic |
| `packages/backend/convex/creditCards/queries.ts` | Card queries with ownership verification |
| `packages/backend/convex/http.ts` | Plaid webhook handlers |
| `packages/backend/convex/crons.ts` | Daily sync scheduler |

### Local Component Development

The `@crowdevelopment/convex-plaid` component is a **local workspace package** at `packages/convex-plaid/`. After making changes:

```bash
cd packages/convex-plaid && bun run build
```

### Card ↔ Transactions Relationship

Cards and transactions are queried separately (supports future transactions page):
- `creditCards.accountId` links to `plaid:plaidTransactions.accountId`
- Card detail fetches card first, then transactions on demand

### Plaid Sync and Webhooks

Plaid webhook handlers must verify `Plaid-Verification` using the raw body hash, reject invalid or expired signatures, and make processing idempotent for duplicate or out-of-order events.

New transaction sync work must use `/transactions/sync` cursor semantics through the local Plaid component. Do not build new flows on `/transactions/get` unless there is a documented Plaid limitation and a Linear issue explains the exception.

### Money and Date Semantics

Every new amount field must document unit, sign convention, and display convention at the schema/tool boundary. User- or model-facing payloads should include preformatted strings when values may be echoed in prose, markdown, charts, or external MCP responses.

Every new date field must document whether it is an ISO date string, timestamp milliseconds, provider-local date, or UTC instant. Do not mix display dates and sortable instants in the same field.

---

## Billing & Plan Gating (CROWDEV-330)

SmartPockets is a portfolio/demo app, so AI chat and Plaid connections are gated by a per-user plan to bound Anthropic + Plaid cost.

**Tiers (tunable in `convex/billing/entitlements.ts`):**

| Limit | Free | Pro ($10/mo) |
|---|---|---|
| Chat messages / month (primary, user-facing) | 15 | 500 |
| Chat tokens / month (cost backstop) | 500,000 | 10,000,000 |
| Active Plaid connections (items) | 1 | 5 |

The per-thread token cap (`AGENT_BUDGET_PER_THREAD_TOKENS`, default 200k) is a plan-independent runaway guard and still applies. The old global `AGENT_BUDGET_MONTHLY_TOKENS` is **superseded** — `checkHeadroom` now uses the per-plan `chatTokensPerMonth` and no longer reads it.

**How it works:**
- Plan is the **Clerk Billing** plan, mirrored onto `users.plan` by the billing webhook: `http.ts` routes every `subscription.*` / `subscriptionItem.*` event to `billing/actions.syncPlanFromClerk`, which re-reads the user's **current** subscription from Clerk's Backend API (`billing.getUserBillingSubscription`) — shape-independent, so it handles upgrade, downgrade, and cancellation alike. Pro is matched by `CLERK_PRO_PLAN_SLUG` (default `pro`); anything else ⇒ `free`. **Requires `CLERK_SECRET_KEY` in the Convex deployment env** (`bunx convex env set CLERK_SECRET_KEY sk_...`); if absent the sync is skipped (fail-safe — plan left unchanged). The Clerk webhook endpoint must be subscribed to the billing events for this to fire.
- `billing/entitlements.ts` maps plan → limits; `billing/plan.ts` resolves the effective plan (`resolveEffectivePlan`, fail-safe to `free`).
- **Chat** enforcement: `agent/budgets.checkHeadroom` returns `message_cap` / `monthly_cap` / `thread_cap`; the monthly message count lives in the `usageCounters` ent, incremented at both turn-admit paths in `agent/threads.ts`.
- **Plaid** enforcement: `createLinkTokenAction` preflights with `billing/plaidLimit.getPlaidHeadroom` (UX gate). `exchangePublicTokenAction` / `onboardNewConnectionAction` use the **atomic** `reservePlaidSlot` (serializable check-and-insert of a short-lived `plaidConnectionReservations` row, released in `finally`, TTL-backstopped) so concurrent Links can't exceed the cap. Over the cap throws `plaid_connection_limit`.
- **UI**: `billing/queries.getMyPlanAndUsage` drives the `/settings/billing` usage panel, the chat upgrade banner, and the Plaid Link button's upgrade state.

**Owner exception (documented):** `BILLING_UNLIMITED_USER_IDS` (comma-separated Clerk user ids, set in the Convex deployment env) resolves those users to `unlimited`, bypassing every cap so the owner can demo without self-paying. Mirrors the Plaid prod-exception pattern. Every resolver fails safe to `free` on any doubt. Plans must exist in the Clerk Billing dashboard for checkout to work.

## Security Requirements

SmartPockets handles real financial data. Security is non-negotiable.

### Authentication Pattern

| Rule | Implementation |
|------|----------------|
| Always verify auth | Use `ctx.viewerX()` to throw if not authenticated |
| Never trust args | Never accept `userId` from function arguments |
| Derive from session | Get user ID from `ctx.viewer` or `ctx.viewerX()` |

```ts
// ❌ WRONG — userId from args can be spoofed
export const getCards = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return ctx.table("creditCards").filter(q => q.eq(q.field("userId"), userId));
  },
});

// ✅ CORRECT — derive from authenticated session
export const getCards = query({
  args: {},
  handler: async (ctx) => {
    const viewer = ctx.viewerX();
    return viewer.edge("creditCards");
  },
});
```

### Ownership Verification

| Resource | Verification |
|----------|--------------|
| Credit Cards | Card must belong to `ctx.viewerX()` |
| Wallets | Wallet must belong to `ctx.viewerX()` |
| Transactions | Transaction's card must belong to viewer |

```ts
// Always verify ownership before mutations
const card = await ctx.table("creditCards").getX(cardId);
const viewer = ctx.viewerX();
if (card.userId !== viewer._id) {
  throw new Error("Not authorized");
}
```

### Internal Functions

Use `internalMutation` / `internalQuery` for functions that bypass auth (called from actions or crons):

```ts
// Safe because action already verified auth
export const upsertFromPlaid = internalMutation({
  args: { userId: v.id("users"), data: v.any() },
  handler: async (ctx, { userId, data }) => { ... },
});
```

### Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| Plaid credentials | Convex env vars | API access |
| Clerk webhook secret | Convex env vars | Webhook verification |
| Never commit secrets | Use `.env.local` | Local dev only |

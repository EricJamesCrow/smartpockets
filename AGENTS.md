# AGENTS.md

Universal project context for AI coding assistants (Claude Code, Cursor, Copilot, etc.).

## Project Overview

SmartPockets is a fintech application for credit card power users who manage multiple cards. It provides real-time balance tracking, wallet organization, and transaction visibility by syncing with Plaid.

| Attribute | Value |
|-----------|-------|
| Target User | Credit card enthusiasts (10+ cards) |
| Core Function | Track balances, organize cards into wallets, view transactions |
| Data Source | Plaid API (real bank connections) |
| Auth | Clerk (user management synced to Convex) |

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 16 |
| UI Library | React | 19 |
| Backend | Convex + Convex Ents | Latest |
| Auth | Clerk | Latest |
| Bank Data | Plaid | Latest |
| Components | UntitledUI | Paid library |
| Styling | Tailwind CSS | 4 |
| Package Manager | bun | 1.1.42 |
| Monorepo | Turborepo | Latest |

## Monorepo Structure

| Path | Purpose |
|------|---------|
| `apps/app/` | Primary Next.js application |
| `apps/web/` | Marketing/secondary site |
| `packages/backend/` | Convex backend (schema, functions) |
| `packages/ui/` | Shared UI components |
| `packages/email/` | React Email templates |
| `packages/convex-plaid/` | Local Plaid component (workspace package) |
| `tooling/typescript/` | Shared TS configs |
| `docs/` | Architecture notes and plans |

## Key Directories (apps/app)

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router pages |
| `src/components/` | UI components (base/, foundations/, application/) |
| `src/hooks/` | Custom React hooks |
| `src/utils/` | Utility functions (includes `cx()` for class merging) |
| `src/providers/` | React context (Convex, Clerk, Theme) |
| `src/features/` | Feature-specific code |

## Key Directories (packages/backend/convex)

| Path | Purpose |
|------|---------|
| `schema.ts` | Convex Ents schema with relationships |
| `functions.ts` | Custom query/mutation with viewer context |
| `types.ts` | TypeScript types (QueryCtx, Ent, EntWriter) |
| `creditCards/` | Card CRUD, sync, queries |
| `wallets/` | Wallet management |
| `transactions/` | Transaction queries |
| `plaidComponent.ts` | Plaid integration wrapper |

## Development Commands

| Command | Purpose |
|---------|---------|
| `bun dev` | Run all workspaces in parallel via Turbo |
| `bun dev:app` | Run primary app only (localhost:3000) |
| `bun dev:backend` | Run Convex dev server with tail logs |
| `bun dev:email` | Run React Email preview (localhost:3003) |
| `bun build` | Production build all packages |
| `bun typecheck` | TypeScript checks across workspaces |
| `bun lint` | Run workspace lint tasks |
| `bun clean` | Remove build artifacts |

## Convex-Specific Commands

| Command | Purpose |
|---------|---------|
| `cd packages/backend && npx convex dev` | Start Convex dev (if not using bun dev:backend) |
| `cd packages/backend && npx convex deploy` | Deploy to production |
| `cd packages/convex-plaid && bun run build` | Rebuild local Plaid component after changes |

## Path Aliases

| Alias | Path |
|-------|------|
| `@/*` | `./src/*` (in apps/app) |
| `@convex/*` | `./convex/*` (in packages/backend) |

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

## UntitledUI Component Guidelines

SmartPockets uses **UntitledUI's paid React component library**. All UI must use UntitledUI components.

### Rules

| DO | DON'T |
|----|-------|
| Use existing UntitledUI components for all UI | Create custom components that duplicate UntitledUI |
| Check UntitledUI docs before creating anything | Override UntitledUI styles with custom CSS |
| Use component props/features as designed | Ignore component APIs (e.g., `items` for nav children) |
| Ask if you can't find a component | Improvise a custom solution |

### Class Utilities

| Utility | Import | Purpose |
|---------|--------|---------|
| `cx()` | `@/utils/cx` | Tailwind-merge wrapper for class merging |
| `sortCx()` | `@/utils/cx` | Organize Tailwind class objects |

### Avoid AI Slop Patterns

**Overuse of cards/boxes:**
```tsx
// ❌ DON'T — individual cards for each metric
<div className="grid grid-cols-4 gap-4">
  <div className="rounded-xl border p-4"><p>Balance</p></div>
  <div className="rounded-xl border p-4"><p>Credit</p></div>
</div>

// ✅ DO — clean horizontal row with dividers
<div className="flex items-stretch border-y py-6">
  <div className="flex-1 text-center"><p>Balance</p></div>
  <div className="w-px bg-secondary" />
  <div className="flex-1 text-center"><p>Credit</p></div>
</div>
```

**Other anti-patterns to avoid:**
- Standalone back buttons → Use breadcrumbs instead
- Modals for detail views → Use SlideoutMenu for scrollable content
- Shadows/borders on every container → Use typography and spacing for hierarchy

### UI Copy Accuracy (Fintech-Critical)

SmartPockets **tracks** financial data — it does NOT control external systems.

| Feature | What It Does | What It Does NOT Do |
|---------|--------------|---------------------|
| "Lock" toggle | Internal organization marker | Freeze actual credit card |
| "AutoPay" toggle | Tracks user-reported status | Set up automatic payments |
| Due dates | Display payment reminders | Process payments |

**Bad copy:**
- ❌ "Lock card to prevent all new transactions"
- ❌ "Enable AutoPay to avoid late fees"

**Good copy:**
- ✅ "Mark as locked" (internal tracking)
- ✅ No misleading tooltips on toggles

## Common Pitfalls

Things AI agents frequently get wrong in this codebase.

### Convex Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Import from `./_generated/server` | Import `query`, `mutation` from `./functions` |
| Mutate edge-traversed entities | Fetch writable entity via `ctx.table().getX()` |
| Accept `userId` in function args | Derive from `ctx.viewerX()` |
| Omit return validator | Always include `returns: v.something()` |
| Use `useMutation` directly | Use cached `useQuery` from `convex-helpers/react/cache/hooks` |
| Call actions from browser | Trigger via mutation that schedules the action |

### Next.js Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Use `export const dynamic = "force-dynamic"` | **NEVER** — investigate root cause instead |
| Missing `'use client'` directive | Add to files with hooks/interactivity |
| Over-using client components | Keep most components as RSC |
| Creating API routes | Use Convex functions instead (Convex-first) |

### File Path Mistakes

| Wrong Path | Correct Path |
|------------|--------------|
| `src/app/` | `apps/app/src/app/` |
| `src/components/` | `apps/app/src/components/` |
| `convex/` | `packages/backend/convex/` |
| `lib/hooks/` | `apps/app/src/hooks/` |

### UntitledUI Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Create custom dropdown/modal/nav | Use UntitledUI component |
| Wrap everything in bordered cards | Use horizontal layouts with dividers |
| Add shadows/borders "just in case" | Use typography and spacing for hierarchy |
| Use standalone back button | Use Breadcrumbs component |

### Git Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Large commits with multiple changes | One logical change per commit |
| Amend after pre-commit hook failure | Create NEW commit (hook failure = no commit happened) |
| `git add -A` or `git add .` | Stage specific files by name |
| Push to main without PR | Create feature branch, open PR via Graphite |
| Showing GitHub PR links as the primary link | Show the Graphite PR link first |

### Graphite PR Links

SmartPockets uses Graphite as the primary review surface. When creating, submitting, or summarizing PRs, display Graphite links instead of GitHub links unless the user explicitly asks for GitHub or Graphite is unavailable.

Use the Graphite URL printed by `gt submit`. If only a GitHub PR number or URL is available, convert it to this repo's Graphite format:

```
https://app.graphite.com/github/pr/EricJamesCrow/smartpockets/<PR_NUMBER>
```

GitHub links may be included as secondary fallback context, but the user-facing PR link should point to Graphite.

### Graphite PR Preview Verification

Every Graphite branch/PR should have a working Vercel preview for `apps/app` before handoff.

After `gt submit`, verify checks:

```bash
gh pr checks <PR_NUMBER>
```

If `Vercel – smartpockets-app` fails, inspect the deployment logs:

```bash
npx vercel inspect <DEPLOYMENT_ID_OR_URL> --logs
```

When reporting a submitted PR, include:
- Graphite PR link first
- Vercel `smartpockets-app` preview URL or Vercel deployment link second
- Any failed checks and the exact inspect command needed for follow-up

Use the preview URL from Vercel checks/comments. Do not invent the final public preview URL from the branch name unless Vercel printed it, because branch names are normalized in generated deployment URLs.

### Clerk Preview Environment

Vercel Preview deployments must not use production Clerk keys or production Convex.

Use non-production values for the Vercel **Preview** environment:

| Variable | Preview Value |
|----------|---------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk development key (`pk_test_...`) |
| `CLERK_SECRET_KEY` | Clerk development key (`sk_test_...`) |
| `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` | Dev Clerk issuer/FAPI domain (`https://<dev-clerk-domain>.clerk.accounts.dev`) |
| `NEXT_PUBLIC_CONVEX_URL` | Dev/staging Convex URL |
| `CONVEX_DEPLOYMENT` | `dev:<deployment>` or unset, never `prod:*` |

The browser error `Clerk: Production Keys are only allowed for domain "smartpockets.com"` means a preview origin is using production Clerk keys. Fix the Vercel Preview environment variables and redeploy the branch.

Only share production Clerk settings/data with a preview if the preview is intentionally hosted on an approved `smartpockets.com` subdomain. The default Graphite/Vercel preview workflow should use Clerk development keys and non-production Convex data.

## Schema Overview

| Table | Purpose | Key Edges |
|-------|---------|-----------|
| `users` | Clerk-synced users | → members, creditCards, wallets |
| `organizations` | Org hierarchy | → members, roles |
| `members` | Org membership | → organization, user, role |
| `roles` | Permission sets | → organization, members |
| `creditCards` | Denormalized card data | → user, walletCards |
| `wallets` | Card organization groups | → user, walletCards |
| `walletCards` | Wallet-Card join table | → wallet, creditCard |
| `userPreferences` | Appearance settings | indexed by userId |
| `paymentAttempts` | Clerk billing events | indexed by paymentId, userId |

### Key Indexes

| Table | Index | Fields |
|-------|-------|--------|
| `creditCards` | `by_accountId` | `accountId` |
| `creditCards` | `by_user_active` | `userId`, `isActive` |
| `wallets` | `by_user_sortOrder` | `userId`, `sortOrder` |
| `walletCards` | `by_wallet_sortOrder` | `walletId`, `sortOrder` |
| `members` | `orgUser` | `organizationId`, `userId` |

### Plaid Component Tables

Managed by `@crowdevelopment/convex-plaid` — query via component API:

| Table | Purpose |
|-------|---------|
| `plaid:plaidItems` | Bank connections |
| `plaid:plaidAccounts` | All account types |
| `plaid:plaidTransactions` | Transaction history |
| `plaid:plaidCreditCardLiabilities` | APRs, payment info |

## MCP Servers

Configure in Claude Code for live schema/function access.

### Convex MCP (Required)

```bash
claude mcp add convex -- npx convex mcp start
```

Provides: schema inspection, function execution, logs, env vars

### Clerk MCP

```bash
claude mcp add clerk -- npx -y @clerk/agent-toolkit -p local-mcp
```

Provides: user management, organization operations

### Plaid Sandbox MCP (Development)

```bash
claude mcp add plaid -- uvx mcp-server-plaid --client-id $PLAID_CLIENT_ID --secret $PLAID_SANDBOX_SECRET
```

Provides: mock data generation, docs search, webhook simulation

> **Note:** Only configure if sandbox credentials are in env. Do not commit credentials.

### Plaid Dashboard MCP (Production Debugging)

```bash
claude mcp add plaid-dashboard --url https://api.dashboard.plaid.com/mcp/sse
```

Provides: diagnose live Plaid items, Link analytics, API usage metrics

> **Note:** Uses OAuth authentication via Plaid Dashboard. Use for troubleshooting real bank connection issues.

### Graphite MCP (Stacked PRs)

```bash
claude mcp add graphite -- gt mcp
```

Provides: stacked PR creation, branch management, stack submission and navigation

## References

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Claude Code-specific behavior (git, permissions) |
| `docs/ARCHITECTURE.md` | Detailed architecture notes |
| `docs/email-infrastructure-roadmap.md` | Email system status |
| `packages/backend/convex/schema.ts` | Full schema definition |

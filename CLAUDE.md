# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev    # Start dev server with Turbopack (localhost:3000)
npm run build  # Production build
npm run start  # Start production server
```

## Architecture Overview

- **Framework**: Next.js 15 App Router with React 19
- **Backend**: Convex (real-time database with Convex Ents ORM)
- **Auth**: Clerk (user management, synced to Convex)
- **UI Library**: Untitled UI components with Tailwind CSS v4
- **Accessibility**: React Aria Components
- **Path Aliases**: `@/*` → `./src/*`, `@convex/*` → `./convex/*`

### Key Directories

- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - UI components (base/, foundations/, application/, marketing/)
- `src/hooks/` - Custom React hooks
- `src/utils/` - Utility functions
- `src/providers/` - React context providers (Convex, Clerk, Theme)
- `src/styles/` - Global CSS and theme variables
- `convex/` - Convex backend (schema, functions, permissions)
- `docs/` - Project documentation and roadmaps

## Project-Specific Patterns

- **Class merging**: Use `cx()` from `@/utils/cx` (tailwind-merge wrapper)
- **Class organization**: Use `sortCx()` for organizing Tailwind class objects
- **Icons**: Import from `@untitledui/icons`
- **Theme colors**: CSS custom properties in `src/styles/theme.css`

## Next.js Rules

### NEVER Use `force-dynamic`

**NEVER use `export const dynamic = "force-dynamic"` as a solution for build errors.** This is a lazy workaround that disables static optimization and is never the correct fix. If you encounter build errors related to:
- Missing environment variables during prerendering
- Authentication providers (Clerk, Auth.js, etc.) failing at build time
- API calls failing during static generation

The correct solutions are:
1. Ensure environment variables are properly set in the deployment platform (Vercel, etc.)
2. Use proper client/server component boundaries
3. Wrap auth-dependent code in client components
4. Use `Suspense` boundaries appropriately

**Do NOT reach for `force-dynamic` - investigate the root cause instead.**

### General Rules

- Use the App Router structure with `page.tsx` files in route directories.
- Client components must be explicitly marked with `'use client'` at the top of the file.
- Use kebab-case for directory names (e.g., `components/auth-form`) and PascalCase for component files.
- Prefer named exports over default exports, i.e. `export function Button() { /* ... */ }` instead of `export default function Button() { /* ... */ }`.
- Minimize `'use client'` directives:
    - Keep most components as React Server Components (RSC)
    - Only use client components when you need interactivity and wrap in `Suspense` with fallback UI
    - Create small client component wrappers around interactive elements
- Avoid unnecessary `useState` and `useEffect` when possible:
    - Use server components for data fetching
    - Use React Server Actions for form handling
    - Use URL search params for shareable state
- Use `nuqs` for URL search param state management

## Convex Guidelines

### This Project Uses Convex Ents

This codebase uses **Convex Ents** for type-safe entity management with relationships. Import custom functions from `./functions`, NOT from `./_generated/server`:

```ts
// ✅ CORRECT - Use custom functions with viewer context
import { query, mutation } from "./functions";

// ❌ WRONG - Don't use base functions directly
import { query, mutation } from "./_generated/server";
```

### Custom Context Pattern

The custom context provides authentication via Clerk:

```ts
import { v } from "convex/values";
import { mutation, query } from "./functions";

export const myFunction = query({
    args: { cardId: v.id("creditCards") },
    returns: v.string(),
    async handler(ctx, { cardId }) {
        // ctx.viewer - Current user (nullable, returns null if not authenticated)
        // ctx.viewerX() - Current user (throws Error if not authenticated)
        // ctx.table() - Ents table factory for type-safe queries

        const viewer = ctx.viewerX(); // Throws if not logged in
        return viewer.name;
    },
});
```

### Ents Table Operations

```ts
// Get by ID
const card = await ctx.table("creditCards").get(cardId);           // Returns null if not found
const card = await ctx.table("creditCards").getX(cardId);          // Throws if not found

// Get by unique field
const user = await ctx.table("users").get("externalId", clerkId);

// Get by index
const member = await ctx.table("members", "orgUser", (q) =>
  q.eq("organizationId", orgId).eq("userId", userId)
).unique();

// Edge traversal (returns read-only entities)
const wallet = await ctx.table("wallets").getX(walletId);
const cards = await wallet.edge("walletCards");  // Read-only array

// Insert
const id = await ctx.table("wallets").insert({ userId, name, isPinned: false, sortOrder: 0, pinnedSortOrder: 0 });

// Update (need writable entity)
const wallet = await ctx.table("wallets").getX(walletId);
await wallet.patch({ name: "New Name" });

// Delete
const wallet = await ctx.table("wallets").getX(walletId);
await wallet.delete();
```

### Read-Only vs Writable Entities

Edge traversals return **read-only** entities. For mutations, fetch the entity directly:

```ts
// ❌ WRONG - edge() returns read-only
const walletCards = await wallet.edge("walletCards");
await walletCards[0].delete();  // ERROR: read-only

// ✅ CORRECT - fetch writable entity
const walletCards = await wallet.edge("walletCards");
for (const wc of walletCards) {
  const writable = await ctx.table("walletCards").getX(wc._id);
  await writable.delete();
}
```

### Actions (External API Calls)

Actions use base Convex functions (no custom context). Use internal mutations to persist data:

```ts
"use node";

import { internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";

export const syncCreditCards = action({
    args: { userId: v.id("users") },
    returns: v.null(),
    handler: async (ctx, { userId }) {
        // Actions CAN'T use ctx.viewer or ctx.table()
        // Use ctx.runQuery/ctx.runMutation with api/internal references

        const plaidData = await fetchFromPlaidAPI();

        // Save via internal mutation (bypasses auth, safe because action verified)
        await ctx.runMutation(internal.creditCards.mutations.upsertFromPlaid, { userId, data: plaidData });
        return null;
    },
});
```

### Function Registration

- Use `query`, `mutation` from `./functions` for public API with auth context
- Use `internalQuery`, `internalMutation` from `./_generated/server` for internal functions
- Use `action`, `internalAction` from `./_generated/server` for external API calls
- ALWAYS INCLUDE ARGUMENT AND RETURN VALIDATORS. If a function returns nothing, specify `returns: v.null()`.

### TypeScript Types

Import types from `./types`:

```ts
import { QueryCtx, MutationCtx, Ent, EntWriter } from "./types";
import { Id } from "./_generated/dataModel";

// Use Id<"tableName"> for type-safe document IDs
function processCreditCard(cardId: Id<"creditCards">) { ... }

// Use Ent<T> for read-only entities, EntWriter<T> for writable
type CreditCard = Ent<"creditCards">;
type WritableCreditCard = EntWriter<"creditCards">;
```

### Next.js Query Types

#### `useQuery` with Cache (Client Components) – PREFERRED

```tsx
"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache/hooks";

export function CreditCardList() {
    const cards = useQuery(api.creditCards.queries.listForUser, {});
    return cards?.map((card) => <div key={card._id}>{card.displayName}</div>);
}
```

#### `useMutation` (Client Components)

```tsx
"use client";

import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";

export function LockCardButton({ cardId }: { cardId: Id<"creditCards"> }) {
    const lockCard = useMutation(api.creditCards.mutations.toggleLock);

    return <button onClick={() => lockCard({ cardId, isLocked: true })}>Lock Card</button>;
}
```

## The Zen of Convex

### Double down on the sync engine

The more you center your apps around the deterministic, reactive database, the better your projects will fare over time.

### Use a query for nearly every app read

Queries are the reactive, automatically cacheable, consistent way to propagate data to your application.

### Keep sync engine functions light & fast

Mutations and queries should work with less than a few hundred records and aim to finish in less than 100ms.

### Use actions sparingly

Actions are wonderful for batch jobs and integrating with outside services, but they're slower, more expensive, and provide fewer guarantees. Never use an action if a query or mutation will get the job done.

### Don't over-complicate client-side state management

Let your client-side code take advantage of Convex's built-in caching and consistency controls.

### Don't misuse actions

- Don't invoke actions directly from the browser
- Trigger actions by invoking a mutation that writes a record AND schedules the subsequent action
- Think 'workflow' not 'background jobs': `action code → mutation → more action code → mutation`
- Record progress one step at a time with smaller batches of work

### Current Schema (Convex Ents)

```typescript
import { defineEnt, defineEntSchema, getEntDefinitions } from "convex-ents";
import { v } from "convex/values";

const schema = defineEntSchema({
    // Users (synced from Clerk)
    users: defineEnt({
      name: v.string(),
      approved: v.boolean(),
      connectedAccounts: v.optional(v.array(v.object({...}))),
    })
      .field("externalId", v.string(), { unique: true })
      .edges("members", { ref: true })
      .edges("creditCards", { ref: true })
      .edges("wallets", { ref: true }),

    // Organization hierarchy
    organizations: defineEnt({ name: v.string() })
      .field("slug", v.string(), { unique: true })
      .edges("members", { ref: true })
      .edges("roles", { ref: true }),

    members: defineEnt({})
      .edge("organization")
      .edge("user")
      .edge("role")
      .index("orgUser", ["organizationId", "userId"]),

    roles: defineEnt({
      name: v.string(),
      permissions: v.array(v.string()),
    })
      .edge("organization")
      .edges("members", { ref: true })
      .index("byOrgAndName", ["organizationId", "name"]),

    // Payment attempts (Clerk billing)
    paymentAttempts: defineEnt({...})
      .index("byPaymentId", ["payment_id"])
      .index("byUserId", ["userId"]),

    // Credit Cards (Plaid + manual entry)
    creditCards: defineEnt({
      accountId: v.string(),
      accountName: v.string(),
      displayName: v.string(),
      currentBalance: v.optional(v.number()),
      availableCredit: v.optional(v.number()),
      creditLimit: v.optional(v.number()),
      isOverdue: v.boolean(),
      isLocked: v.boolean(),
      isAutoPay: v.boolean(),
      isActive: v.boolean(),
      // ... more fields
    })
      .edge("user")
      .edges("walletCards", { ref: true })
      .index("by_accountId", ["accountId"])
      .index("by_user_active", ["userId", "isActive"]),

    // Wallets (card organization)
    wallets: defineEnt({
      name: v.string(),
      color: v.optional(v.string()),
      icon: v.optional(v.string()),
      isPinned: v.boolean(),
      sortOrder: v.number(),
      pinnedSortOrder: v.number(),
    })
      .edge("user")
      .edges("walletCards", { ref: true })
      .index("by_user_sortOrder", ["userId", "sortOrder"]),

    // Wallet-Card join table
    walletCards: defineEnt({
      sortOrder: v.number(),
      addedAt: v.number(),
    })
      .edge("wallet")
      .edge("creditCard")
      .index("by_wallet_sortOrder", ["walletId", "sortOrder"]),

    // User preferences
    userPreferences: defineEnt({
      userId: v.id("users"),
      notifications: v.optional(v.object({...})),
      appearance: v.optional(v.object({...})),
    }).index("byUserId", ["userId"]),
});

export default schema;
export const entDefinitions = getEntDefinitions(schema);
```

### Key Convex Files

- `convex/schema.ts` - Ents schema with relationships
- `convex/functions.ts` - Custom query/mutation with viewer context
- `convex/types.ts` - TypeScript types (QueryCtx, MutationCtx, Ent, EntWriter)
- `convex/organizations.ts` - Org CRUD with auto role creation
- `convex/members.ts` - Org membership management
- `convex/users.ts` - User management (Clerk sync)
- `convex/http.ts` - Webhook handlers (Clerk, Plaid)
- `convex/crons.ts` - Scheduled jobs (daily Plaid sync)
- `convex/creditCards/` - Credit card CRUD and sync
- `convex/wallets/` - Wallet management
- `convex/transactions/` - Transaction queries
- `convex/plaidComponent.ts` - Plaid integration wrapper

## UntitledUI Component Guidelines

This project uses **UntitledUI's paid React component library** as the design system. All UI must use UntitledUI components — do NOT create custom components that duplicate UntitledUI functionality.

### MUST DO:

- Use existing UntitledUI components for ALL UI elements
- Check `/components` and UntitledUI docs before creating anything new
- Use component props/features (like `items` arrays for nested navigation) instead of building custom solutions
- Maintain UntitledUI's visual patterns: spacing, typography, color tokens, border radii
- When extending functionality, pass props to UntitledUI components — don't wrap them unnecessarily

### MUST NOT:

- NEVER create new UI components without explicit approval
- NEVER duplicate functionality that UntitledUI already provides (dropdowns, modals, nav items, etc.)
- NEVER override UntitledUI styles with custom CSS unless specifically requested
- NEVER ignore component APIs (e.g., if a nav item supports `items` for children, USE IT)

### Avoid AI Slop (CRITICAL)

AI-generated code often falls into predictable, generic patterns that look "safe" but result in visually bland, over-engineered UIs. Avoid these common AI anti-patterns:

**Overuse of Cards/Boxes:**
- DON'T wrap every piece of content in a bordered card with rounded corners
- DON'T create grids of identical cards when a simpler layout would work
- DO use horizontal layouts with vertical dividers for related metrics
- DO use clean sections separated by borders or whitespace, not nested cards

**Bad Example (AI Slop):**
```tsx
// DON'T: Individual cards for each metric
<div className="grid grid-cols-4 gap-4">
  <div className="rounded-xl border p-4"><p>Balance</p><p>$1,234</p></div>
  <div className="rounded-xl border p-4"><p>Credit</p><p>$5,000</p></div>
  ...
</div>
```

**Good Example:**
```tsx
// DO: Clean horizontal row with dividers
<div className="flex items-stretch border-y py-6">
  <div className="flex-1 text-center"><p>Balance</p><p>$1,234</p></div>
  <div className="w-px bg-secondary" />
  <div className="flex-1 text-center"><p>Credit</p><p>$5,000</p></div>
  ...
</div>
```

**Navigation Anti-patterns:**
- DON'T use standalone back buttons with arrow icons for hierarchical navigation
- DO use breadcrumbs for page hierarchy (UntitledUI has a Breadcrumbs component)

**Modal vs Slideout:**
- DON'T use modals for detail views that need scrolling or have multiple sections
- DO use slideout menus (SlideoutMenu component) for detail panels and side content

**Generic Styling:**
- DON'T add shadows, borders, and backgrounds to every container "just in case"
- DO use visual hierarchy through typography, spacing, and strategic borders

### UI Copy Accuracy (CRITICAL)

SmartPockets is a **financial tracking and organization tool** - it does NOT control external financial systems. Never write UI copy, tooltips, or confirmations that imply the app can:

- **Lock/freeze actual credit cards** - Our "lock" feature is for internal organization only. Users must contact their card issuer to actually freeze a card.
- **Enable/disable AutoPay** - Our toggle tracks whether the user has AutoPay enabled elsewhere. It does NOT set up automatic payments.
- **Make payments** - We track payment due dates but don't process payments.
- **Change credit limits, APRs, or account settings** - We display this data but can't modify it.

**Bad Examples:**
- ❌ "Lock card to prevent all new transactions"
- ❌ "Enable AutoPay to avoid late fees"
- ❌ "This will temporarily prevent all new transactions"

**Good Examples:**
- ✅ "Mark as locked" (internal organization)
- ✅ "AutoPay" label with no misleading tooltip
- ✅ Component comments explaining the feature is for tracking, not control

When adding financial features, always clarify in code comments that the feature tracks user-reported status rather than controlling external systems.

### When You Can't Find a UntitledUI Component:

**STOP and ask me:**

> "I need a [description of UI pattern] component. Does UntitledUI have something like [specific component type]? If so, can you paste the component code or point me to it?"

Do NOT improvise. I will provide the correct UntitledUI component.

### Reference Paths:

- UntitledUI components: `/components/`
- Design tokens: `tailwind.config.js` and `/styles/`

## Git Workflow (CRITICAL)

### Atomic Commits - ALWAYS FOLLOW

**Commit after EVERY logical unit of work.** Each commit should be:

- ONE logical change (one component, one fix, one test)
- In working state (tests pass, no type errors)
- Describable in one sentence
- Safely revertable without side effects

### Commit Format

```
<type>(<scope>): <description under 50 chars>

[optional body]

Refs: #issue

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests
- `refactor`: Code restructuring
- `style`: Formatting
- `chore`: Maintenance

### Commit Frequency (IMPORTANT)

Commit immediately after each:

- Single feature component added
- Single bug fix completed
- Test suite written for specific function
- Refactoring of single concern

### Workflow Pattern

1. Implement ONE logical unit
2. Verify changes work
3. Stage relevant files: `git add <files>`
4. Commit immediately with descriptive message
5. Repeat for next unit
6. Push when feature complete

## Email Infrastructure Status

**Roadmap:** `/docs/email-infrastructure-roadmap.md`

### Current Status: Core Migration Complete

The email infrastructure has been migrated from **Inngest + Resend SDK** to the unified **Convex Resend Component** (`@convex-dev/resend`). Inngest has been removed as a dependency.

### Email Files

**Templates (`packages/email/emails/`):**
- Authentication (4): `simple-verification.tsx`, `simple-invite.tsx`, `password-reset.tsx`, `magic-link.tsx`
- Billing (10): `receipt.tsx`, `payment-failed.tsx`, `payment-expiring.tsx`, `subscription-created/upgraded/downgraded/cancelled.tsx`, `trial-starting/ending/ended.tsx`
- Welcome/Demo (8): `simple-welcome-01/02.tsx`, `image-welcome.tsx`, `video-welcome-01/02/03.tsx`, `mockup-01/02.tsx`

**Backend (`packages/backend/convex/email/`):**
- `resend.ts` - Resend component client and config
- `templates.ts` - React Email template renderer (Node.js action)
- `send.ts` - Core sending functions (`sendTemplatedEmail`, `sendHtmlEmail`, `sendTextEmail`)
- `clerk.ts` - Clerk webhook email handler (routes slugs to templates)
- `events.ts` - Delivery status event handler

## Plaid Integration (Credit Cards)

> **📦 Workspace Package:** The `@crowdevelopment/convex-plaid` component lives in `packages/convex-plaid/` as a local workspace package (not pulled from npm). This enables local development without publish cycles.
>
> **After making changes:** Run `cd packages/convex-plaid && bun run build`
>
> **To publish to npm:** Sync changes to the [original repo](https://github.com/EricJamesCrow/convex-plaid), bump version, publish.

### Architecture Overview

The Plaid integration uses `@crowdevelopment/convex-plaid` component with a denormalized data model:

**Plaid Component Tables** (managed by component):
- `plaid:plaidItems` - Bank connections
- `plaid:plaidAccounts` - All bank accounts
- `plaid:plaidTransactions` - Transaction history
- `plaid:plaidCreditCardLiabilities` - APRs, payment info
- `plaid:plaidRecurringStreams` - Recurring patterns
- `plaid:plaidMerchantEnrichments` - Merchant logos/data

**Native Convex Table** (denormalized):
- `creditCards` - Merged account + liability data for fast queries

### Data Flow

1. User connects bank via Plaid Link
2. `exchangePublicToken` → creates plaidItem
3. `fetchAccounts` → creates plaidAccounts
4. `syncTransactions` → creates plaidTransactions
5. `fetchLiabilities` → creates plaidCreditCardLiabilities
6. `syncCreditCardsAction` → **denormalizes** into creditCards table

### Key Files

| File | Purpose |
|------|---------|
| `packages/backend/convex/plaidComponent.ts` | Plaid component wrapper, sync orchestration |
| `packages/backend/convex/creditCards/actions.ts` | `syncCreditCardsAction` - denormalization |
| `packages/backend/convex/creditCards/queries.ts` | Card queries with ownership verification |
| `packages/backend/convex/creditCards/mutations.ts` | Card CRUD, internal sync mutations |
| `packages/backend/convex/transactions/queries.ts` | Transaction queries (separate from cards) |
| `packages/backend/convex/transactions/helpers.ts` | Merchant enrichment utility |
| `packages/backend/convex/crons.ts` | Daily sync scheduler (2 AM UTC) |
| `packages/backend/convex/http.ts` | Plaid webhook handlers |

### Sync Triggers

- **Onboarding**: After Plaid Link connection (`onboardNewConnectionAction`)
- **Webhooks**: `TRANSACTIONS`, `DEFAULT_UPDATE`, `LIABILITIES_UPDATE`
- **Daily Cron**: 2 AM UTC via `syncAllActiveItemsInternal` → `syncPlaidItemInternal`
- **Manual**: Settings > Institutions refresh

### Card ↔ Transactions Relationship

Cards and transactions are **queried separately** (good for future transactions page):
- `creditCards.accountId` links to `plaid:plaidTransactions.accountId`
- Card detail page fetches card first, then transactions on demand
- Transactions can be queried independently of any card

### Daily Sync Flow (Fan-out Pattern)

```
crons.ts → syncAllActiveItemsInternal
          ↓
  scheduler.runAfter(0, syncPlaidItemInternal) × N items
          ↓
  Per item: transactions → liabilities → recurring → credit cards
```

This pattern avoids action time limits as the number of connected institutions grows.

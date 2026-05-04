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

## Linear + Graphite Work Tracking

Linear is the source of truth for implementation work. Before meaningful code or documentation changes, search Linear for an existing issue that matches the task. If one exists, use it. If none exists, create a lightweight issue in the SmartPockets project. Do not create duplicates, and confirm the Linear issue ID before opening a branch or making changes.

A Linear issue is required for features, bug fixes, refactors, tests, infrastructure, UI changes, data/model changes, documentation changes, and any multi-step investigation that may produce a branch or PR. A Linear issue is not required for read-only exploration, conceptual questions, or tiny checks with no code changes.

When creating a new issue, keep it short and use:

```md
## Goal
What should be true when this is done?

## Done when
- [ ]
- [ ]

## Verify
-

## Notes
Created from AI coding session.
```

The Linear issue ID must appear in:
- Branch name: `<issue-id>-short-description` (for example, `crowdev-123-add-empty-state`)
- PR title: `<ISSUE-ID> Short description`
- PR body: use `Fixes <ISSUE-ID>` only when the PR fully completes the issue; use `Refs <ISSUE-ID>` when the PR is partial, exploratory, documentation-only, or has follow-up work.

Post a Linear comment when:
- Starting work: intended approach, key assumptions, and files likely to change.
- Blocked: what is blocked, why, and what input or decision is needed.
- Opening a PR: Graphite PR link, summary of changes, verification performed, known risks, and follow-up work.

If an issue or PR reasonably blocks verification, merge, or deployment of another issue, update Linear before continuing: add the blocker relationship (`blocks` / `blocked by`) and comment on both issues with the evidence and the affected PR links. Do not leave blockers only in chat, PR comments, or local notes.

When starting or resuming work on a sub-issue, check its parent issue. If the parent is still To-do or Backlog while child work is active, move the parent to In Progress and leave a short comment naming the active child issue. Never move a parent issue to Done manually.

Never manually mark a Linear issue as Done. PR automation handles status transitions on PR open and merge. Do not merge PRs unless explicitly instructed. Prefer small, reviewable PRs and run verification before opening a PR when possible. If verification cannot be run, say why.

For reliable linking across Linear, GitHub, and Graphite:
- Use the Linear issue's generated branch name when available.
- Include the issue ID in the branch name, PR title, and PR body.
- Use `Refs <ISSUE-ID>` for non-closing links and `Fixes <ISSUE-ID>` only for complete fixes.
- Configure Linear's GitHub integration and commit-linking webhook for magic-word commit links.
- Configure GitHub autolinks for the `CROWDEV-` prefix so issue IDs render as links in GitHub and Graphite.
- Use Graphite's Linear integration as a secondary check so related Linear issues appear in the Graphite PR sidebar.

Do not create new Linear projects, labels, statuses, automations, or views without approval. Do not introduce new dependencies without approval.

When finishing any code-changing task, unless the user explicitly says not to:
- Stage only the files changed for the task.
- Commit with the Linear issue ID in the commit subject.
- Track the branch in Graphite if needed.
- Submit a draft Graphite PR.
- Update the PR title/body with the Linear issue, summary, verification, risks, and preview/check status.
- Post the PR handoff comment on the Linear issue.
- If any step is blocked, do not silently stop; report the exact blocker and the command/output.

When finishing, summarize the Linear issue used or created, branch name, Graphite PR link, what changed, verification performed, and remaining risks or follow-ups.

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
| `cd packages/backend && bunx convex dev` | Keep dev deployment in sync continuously (auto-pushes on save) |
| `cd packages/backend && bunx convex dev --once` | **One-shot push of backend functions to dev deployment** — run this after editing any file in `packages/backend/convex/` if you don't have `bun dev:backend` running |
| `cd packages/backend && bunx convex deploy` | Deploy to production (use judgment — typically only via merge to main) |
| `cd packages/convex-plaid && bun run build` | Rebuild local Plaid component after changes |

### Backend changes must be deployed before testing

Any edit under `packages/backend/convex/` (schema, queries, mutations, actions, agent tools, http actions) is **not visible to the running app or Vercel previews until the function bundle is pushed to the dev deployment**. The Vercel preview's `NEXT_PUBLIC_CONVEX_URL` points at `dev:canny-turtle-982`, so the new functions must be deployed there before the preview can use them.

Symptoms of forgetting this step:
- `Could not find public function for '<module>:<name>'. Did you forget to run \`npx convex dev\`?` errors in the browser console.
- Tools, mutations, or queries returning stale results because the old version is still serving.
- Schema fields referenced by new code being missing at runtime (`undefined` reads, `validator failed` errors, etc.).

**The workflow:** finish editing → run `cd packages/backend && bunx convex dev --once` → THEN test in the preview / report to the user. Or keep `bun dev:backend` (which runs `bunx convex dev` in watch mode) running in a separate terminal so deploys happen automatically on save.

For sub-agents implementing backend work: this is part of the verification step, not optional. A "DONE" report on backend work that hasn't been deployed is a false positive — the user will hit `Could not find public function` errors as soon as they test.

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
| Branch without Linear issue ID | Search/create Linear issue first, then use the issue ID in the branch name |
| Push to main without PR | Create a Linear-linked feature branch, open PR via Graphite |
| Showing `github.com/.../pull/<N>` URLs in user-facing output | Always use the Graphite URL — never show GitHub PR links unless the user explicitly asks |

### Sub-Agent Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Dispatching parallel sub-agents into the shared worktree | Pass `isolation: "worktree"` to every parallel Agent call so each one gets its own checkout |
| Assuming sub-agents inherit `.env.local` and `node_modules` from the parent | Brief them to bootstrap: `cp <parent-worktree>/apps/app/.env.local apps/app/.env.local && bun install` before any backend deploy or app build |
| One sub-agent running `git branch -f` or `git symbolic-ref HEAD ...` to "recover" | That's a sign two agents collided in one worktree — abort and re-dispatch with isolation instead of patching corruption |
| Letting parallel sub-agents stack PRs off the same parent without telling them which parent commit | Name the explicit parent SHA / Graphite branch in each prompt so their stacks don't overlap |
| Asking a sub-agent to "audit X" without naming surfaces | Specify every surface to check by name. "Audit amount-bearing fields" missed model-emitted markdown and the external MCP path; "Audit React tool-result components + agent-emitted markdown/prose + external MCP outputs + email templates + spend chart axes" doesn't. |
| Trusting a sub-agent's "audit done" report without verification | Read the actual files. Spec compliance reviewer subagents exist for exactly this — dispatch one, or do the spot-check yourself before declaring done. |

When you need to fan out to two or more sub-agents at the same time, **always** pass `isolation: "worktree"` on every parallel `Agent` tool call. Sharing one worktree across parallel agents is unsafe: they will race on `git checkout`, force-move branches with `git branch -f`, stash files into `/tmp`, and overwrite each other's edits. We have already spent multiple sessions recovering from this with `git symbolic-ref HEAD ...` — the recovery is not worth the avoidable risk.

A solo sub-agent running by itself can use the parent worktree (and benefit from the existing `node_modules` cache). The rule only kicks in once a second concurrent agent enters the picture.

**Worktree bootstrap recipe** — include this in the prompt of every isolated sub-agent that needs to run the app, deploy backend, or open Plaid/Clerk-authenticated flows:

```bash
# from the freshly created worktree
cp <PARENT_WORKTREE>/apps/app/.env.local apps/app/.env.local
cp <PARENT_WORKTREE>/packages/backend/.env.local packages/backend/.env.local 2>/dev/null || true
bun install
```

The cached `node_modules` from the parent worktree is NOT shared — each worktree gets its own. Skipping `bun install` will surface as missing-module errors at typecheck or build time.

When you want all the parallel sub-agents to land on the same eventual stack, give each one an explicit `parent commit SHA` or `Graphite branch name` to branch from. Don't leave them to guess; otherwise they'll each fork off `main` and their stacks will collide at consolidation time.

#### Audit scope discipline

When you ask a sub-agent (or yourself) to "audit X for issue Y", **enumerate every surface in scope by name** before any code reads happen. Vague audits miss surfaces.

Pattern that has failed twice in this codebase:

1. CROWDEV-348/CROWDEV-349 (search merchants / get plaid health raw-text dumps): the original fix patched only `searchMerchants` because the audit was scoped to "tool-result components", and `getPlaidHealth` was overlooked despite having the same JSON-dump bug.
2. CROWDEV-366/CROWDEV-368/CROWDEV-369 (Plaid sign convention): the original fix patched only React tool-result components because the audit was scoped to "where amounts are displayed in the UI". It missed (a) model-emitted markdown tables, (b) model-emitted prose, (c) merchant aggregation totals in `searchMerchants`, (d) the external MCP `MCPTransaction` payload. Each gap took its own follow-up PR.

Pattern that works:

> "Audit every surface where the user (or an external client) might see a `<value>`. The surfaces are: React components rendering it, system prompt rules guiding the model's text output, tool output schemas the model echoes verbatim, external MCP tool payloads, email templates, raw `convex/_generated` action returns. For each surface, document whether it's correct, needs a fix, or is intentionally out-of-scope (with reasoning)."

The reviewer (you, or a `spec-reviewer` subagent) should not accept "audit done" without a per-surface enumeration in the audit report.

### Graphite PR Links

SmartPockets uses Graphite as the primary review surface. When referring to a PR in any user-facing output — chat responses, summaries, status updates, Linear comments, tables — **always** use the Graphite link. **Never include `github.com/.../pull/<N>` URLs** unless the user explicitly asks for the GitHub link.

Use the Graphite URL printed by `gt submit`. If a command (e.g., `gh pr view`, `gh pr checks`, `gh pr list`) returns only a GitHub PR number or URL, convert it to this repo's Graphite format before showing it:

```
https://app.graphite.com/github/pr/EricJamesCrow/smartpockets/<PR_NUMBER>
```

Do not present Graphite and GitHub links side by side. Graphite is the canonical user-facing link; GitHub URLs are for tooling use only (`gh pr` commands consume them, but they should not appear in messages, summaries, or Linear comments).

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

Generated Vercel preview URLs are for build/check verification. They are not Clerk auth return targets.

### Shared Preview Domain Manual Testing

For auth smoke tests, SmartPockets uses stable shared preview domains:

| Domain | Project |
|--------|---------|
| `preview.smartpockets.com` | `smartpockets-web` / `apps/web` |
| `app.preview.smartpockets.com` | `smartpockets-app` / `apps/app` |

At the end of an implementation, ask: "Do you want me to point the shared preview domains at this branch so you can manually test the changes?"

If the user says yes:
- Identify the current implementation branch from `git branch --show-current`, Graphite metadata, or Vercel deployment metadata.
- Find or create a fresh successful preview deployment for each affected project.
- Before changing anything, report what branch/deployment each shared domain currently points to. These domains are shared singletons and changing them can interrupt someone else's manual test session.
- Prefer Vercel branch-domain assignment for Git Integration projects by updating the project domain `gitBranch`.
- If branch-domain assignment is unavailable or inappropriate, use `vercel alias set <deployment-url> <domain> --scope crow-commerce`.
- Never change production domains. Never change DNS records. Only update Vercel project domain/alias mappings.
- After updating, verify both domains resolve to the expected project, branch/deployment, and commit SHA.
- Smoke sign-in from `preview.smartpockets.com` and confirm post-login lands on `app.preview.smartpockets.com`, not a generated Vercel branch URL.

### Clerk Preview Environment

Vercel Preview deployments must not use production Clerk keys or production Convex.

Use non-production values for the Vercel **Preview** environment:

| Variable | Preview Value |
|----------|---------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk development key (`pk_test_...`) |
| `CLERK_SECRET_KEY` | Clerk development key (`sk_test_...`) |
| `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` | Dev Clerk issuer/FAPI domain (`https://<dev-clerk-domain>.clerk.accounts.dev`) |
| `NEXT_PUBLIC_APP_ORIGIN` or `NEXT_PUBLIC_APP_URL` | `https://app.preview.smartpockets.com` |
| `NEXT_PUBLIC_MARKETING_URL` | `https://preview.smartpockets.com` |
| `NEXT_PUBLIC_CONVEX_URL` | Dev/staging Convex URL |
| `CONVEX_DEPLOYMENT` | `dev:<deployment>` or unset, never `prod:*` |

The browser error `Clerk: Production Keys are only allowed for domain "smartpockets.com"` means a preview origin is using production Clerk keys. Fix the Vercel Preview environment variables and redeploy the branch.

Only share production Clerk settings/data with a preview if the preview is intentionally hosted on an approved `smartpockets.com` subdomain. The default Graphite/Vercel preview workflow should use Clerk development keys and non-production Convex data.

Preview auth should use the shared `https://preview.smartpockets.com` auth host and force post-login redirects to the configured stable app origin. Do not build custom app-side `redirect_url` values from generated or shared preview URLs, do not add Clerk satellite props unless the Clerk instance is explicitly configured and smoke-tested for those domains, and do not use generated `smartpockets-app-*.vercel.app` URLs as post-login destinations.

## Agent Tool Output Patterns

Tool outputs are read by both the React frontend (rendering the structured tool result) and the LLM (which often quotes values from those outputs verbatim in markdown tables, prose summaries, and follow-up reasoning). The model is not great at arithmetic and worse at remembering convention overrides under semantic priors. Design tool outputs so the model can copy values verbatim, never compute or reason about them.

### Pre-format every value the model echoes

If the model is going to render a tool-output value into user-facing text, **the tool's output payload should already contain the exact string that should appear in the user's message**. Don't ask the model to format, sign-flip, currency-convert, or otherwise massage a number it sees in a row.

The CROWDEV-329 polish round demonstrated this the hard way. We added `displayAmount: number` (Plaid sign flipped) to `AgentTransactionRow` and updated system prompt rule #10 to instruct the model to use it instead of `amount`. Haiku correctly used `displayAmount` for 9 of 10 rows in a typical query — but for the row with the strongest "purchase" semantic prior (eBay refund, `merchantName: "eBay"` + `category: "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES"`), the model overrode the explicit field and rendered the Plaid sign anyway, calling a refund a "purchase" in the prose summary.

The fix that actually held was to give the model a pre-formatted string field (`amountFormatted: "+$550.47"`) that it copies verbatim, plus a `direction: "inflow" | "outflow"` field for verb selection. The model can't get the formatting wrong because there's no formatting step. See `packages/backend/convex/agent/tools/read/listTransactions.ts` `AgentTransactionRow` for the canonical shape.

### Convention checklist when designing a new tool output

When a new tool returns values the model will echo back to the user, include all of:

- **`<value>`** — the canonical value (e.g., raw number in canonical units; raw enum). Used by the frontend, by aggregation arithmetic, by other tools.
- **`<value>Formatted: string`** — the pre-formatted user-facing string, ready to copy verbatim. The system prompt rule for that tool should say "copy verbatim, never compute".
- **`<value>Direction` / `<value>Label`** — when the value's interpretation is ambiguous (sign, status, severity), provide an explicit categorical label so the model picks the right verb / phrasing without inferring from the value itself.
- **JSDoc on the row schema** spelling out which field is for which audience (frontend / model verbatim / model arithmetic).

### What this means for system prompt rules

The system prompt should state the verbatim-copy rule explicitly with hard examples and anti-examples. Soft hints ("prefer `<field>` when displaying") get overridden by semantic priors under sufficient confusion. Hard rules ("**copy `amountFormatted` VERBATIM. Do not compute it. Do not adjust based on merchant name, category, or prior beliefs about whether it 'looks like' a purchase**") survive.

When the convention applies to multiple tools (`amount` semantics across listTransactions / getTransactionDetail / searchMerchants), document the rule once in the system prompt and reference it from each tool's registry description so the model sees the convention at tool-discovery time too.

### When NOT to pre-format

- **Pure aggregation tools** where the output value's only role is feeding another computation (no user-facing display). Keep these in canonical units.
- **High-cardinality fields** where every distinct value needs its own format (e.g., currency-localised dates) — pre-formatting balloons payload size. Use a system prompt directive instead.
- **Trivial cases the model never gets wrong** (booleans, simple counts). Don't add ceremony unless real failures show up.

The tipping point is: did the model ever, in real testing, render this value wrong? If yes, pre-format. If no, leave it.

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

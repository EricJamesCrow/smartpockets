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
- When a PR is explicitly requested/submitted, PR title: `<ISSUE-ID> Short description`
- When a PR is explicitly requested/submitted, PR body: use `Fixes <ISSUE-ID>` only when the PR fully completes the issue; use `Refs <ISSUE-ID>` when the PR is partial, exploratory, documentation-only, or has follow-up work.

Post a Linear comment when:
- Starting work: intended approach, key assumptions, and files likely to change.
- Blocked: what is blocked, why, and what input or decision is needed.
- Explicitly opening a PR: Graphite PR link, summary of changes, verification performed, known risks, and follow-up work.

If an issue or PR reasonably blocks verification, merge, or deployment of another issue, update Linear before continuing: add the blocker relationship (`blocks` / `blocked by`) and comment on both issues with the evidence and the affected PR links. Do not leave blockers only in chat, PR comments, or local notes.

When starting or resuming work on a sub-issue, check its parent issue. If the parent is still To-do or Backlog while child work is active, move the parent to In Progress and leave a short comment naming the active child issue. Never move a parent issue to Done manually.

### Icebox and Deferred Work

The Backlog category has two statuses with different semantics:
- **Backlog** — queued for future work. Eligible for agent pickup when batching.
- **Icebox** — explicitly parked. Not picked up unless the user names the issue by ID. Use for issues we want to keep visible for tracking but aren't actively scheduling.

When listing issues for batch implementation, "what should I work on next" prompts, or any "find me something to work on" flow, **exclude Icebox status**. Treat it like Linear's own Icebox convention — issues live there because we've decided not to schedule them, not because they're forgotten.

For the narrower case where an active issue (Todo / In Progress / In Review) is blocked by an external dependency (vendor reply, customer decision, third-party API), apply the **`on-hold`** label instead of moving the issue back to Backlog/Icebox. The label preserves workflow position while signaling pause; agents must exclude `on-hold` from batch pickup the same way as Icebox.

To unpark an issue, move it from Icebox to Backlog/Todo, or remove the `on-hold` label.

Keep Linear state in sync with reality. The default path is `Fixes <ISSUE-ID>` in the PR body so the GitHub-Linear automation moves the issue to Done on merge — prefer that over manual updates. But when automation didn't fire (a `Refs` magic word was used, an issue bundled multiple PRs, the integration was offline, etc.) and the work is verifiably shipped to `main`, manually move the issue to Done with a closing comment that cites the merged commit SHA + PR link. Don't mark Done speculatively or for partial work; only when the shipped state on `main` matches the issue's acceptance criteria.

Do not merge PRs unless explicitly instructed. Prefer small, reviewable PRs and run verification before opening a PR when possible. If verification cannot be run, say why.

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
- Run or report the appropriate local verification.
- Stop before Graphite submission. Do not run `gt submit`, open a draft PR, push only to trigger Vercel, or post the PR handoff Linear comment unless the user explicitly asks to submit/open a PR.
- If any step is blocked, do not silently stop; report the exact blocker and the command/output.

When finishing local-only work, summarize the Linear issue used or created, branch name, local commit(s), files changed, verification performed, and remaining risks or follow-ups. Explicitly state `No PR submitted`.

When the user explicitly asks to submit/open a PR, then:
- Track the branch in Graphite if needed.
- Submit a draft Graphite PR.
- Update the PR title/body with the Linear issue, summary, verification, risks, and preview/check status.
- Verify PR checks and preview status before handoff when possible.
- Post the PR handoff comment on the Linear issue.
- Include the Graphite PR link and Vercel preview/deployment URL only after the PR actually exists.

## Investigation Discipline (Before Asking the User)

Before asking the user any clarifying question, exhaust the read-only paths that can answer it yourself. The user pays a cost (interrupt, context switch) for every question, and most questions about external state are one tool call away. Asking before investigating wastes their time and signals you didn't try.

Order of operations:

1. **Check the codebase** — `Read`, `grep`, `find`. Most "what does X look like / where is Y configured / what value does Z have" questions live in the repo.
2. **Check the CLI or MCP server that owns the system you're asking about.** Before asking about external state, find the authoritative tool. Quick reference:

| System | Read path |
|--------|-----------|
| Vercel env vars / project config / deployments / domains | `npx vercel env ls <env>`, `npx vercel env pull <file> --environment=<env>` (then grep), `npx vercel inspect <url>`, `npx vercel project ls`, `npx vercel domains ls` |
| Convex schema / functions / data / logs / env | Convex MCP — `mcp__convex__tables`, `mcp__convex__functionSpec`, `mcp__convex__data`, `mcp__convex__logs`, `mcp__convex__envGet`, `mcp__convex__envList` |
| Linear issues, comments, sub-issue state | Linear MCP |
| Clerk users, orgs, roles, sessions | Clerk MCP |
| Plaid sandbox state / production diagnostics | Plaid Sandbox MCP / Plaid Dashboard MCP |
| Graphite stacks, PR linkage, branches | Graphite MCP (`mcp__graphite__run_gt_cmd`) or `gt` / `gh` CLIs |
| GitHub PRs, checks, comments, releases | `gh pr view`, `gh pr checks`, `gh api ...` |
| Library / framework / API docs | Context7 MCP — `mcp__plugin_context7_context7__query-docs` |
| Browser-side debugging (dev server, preview) | Chrome DevTools MCP / Playwright MCP |

3. **Then ask only what's left.** When you do ask, cite the value you couldn't find and where you already looked so the user doesn't redo your work. "I checked Vercel preview env and `CONVEX_DEPLOYMENT=dev:foo`, but the matching Plaid env isn't set there — is it on the Convex side?" beats "what Plaid env do previews use?"

Secret hygiene when pulling secret-bearing data (e.g. `vercel env pull`): write to a temp file outside the repo (`/tmp/...`), grep only the non-secret keys you need, and `rm` the file in the same command. Never paste secret values into chat. Deployment names, project slugs, and public URLs are not secrets — pasting those is fine.

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
| Package Manager | bun | See root `package.json#packageManager` |
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
| `cd packages/backend && bunx convex dev --once` | **One-shot push of backend functions to a normal dev deployment** — run this after editing any file in `packages/backend/convex/` if you don't have `bun dev:backend` running |
| `cd packages/backend && bunx convex deploy --preview-name main --yes` | **One-shot push when `CONVEX_DEPLOY_KEY` is a preview deploy key** — verify the printed Convex URL matches `NEXT_PUBLIC_CONVEX_URL` before testing |
| `cd packages/backend && bunx convex deploy` | Deploy to production (use judgment — typically only via merge to main) |
| `cd packages/convex-plaid && bun run build` | Rebuild local Plaid component after changes |

### Backend changes must be deployed before testing

Any edit under `packages/backend/convex/` (schema, queries, mutations, actions, agent tools, http actions) is **not visible to the running app or Vercel previews until the function bundle is pushed to the dev deployment**. The Vercel preview's `NEXT_PUBLIC_CONVEX_URL` points at `dev:canny-turtle-982`, so the new functions must be deployed there before the preview can use them.

Symptoms of forgetting this step:
- `Could not find public function for '<module>:<name>'. Did you forget to run \`npx convex dev\`?` errors in the browser console.
- Tools, mutations, or queries returning stale results because the old version is still serving.
- Schema fields referenced by new code being missing at runtime (`undefined` reads, `validator failed` errors, etc.).

**The workflow:** finish editing → push the function bundle → THEN test in the preview / report to the user. For a normal dev deployment, run `cd packages/backend && bunx convex dev --once` or keep `bun dev:backend` running in watch mode. If `CONVEX_DEPLOY_KEY` is a `preview:` key, `convex dev --once` will fail; run `cd packages/backend && bunx convex deploy --preview-name main --yes` and verify the printed deployment URL matches `NEXT_PUBLIC_CONVEX_URL`.

For sub-agents implementing backend work: this is part of the verification step, not optional. A "DONE" report on backend work that hasn't been deployed is a false positive — the user will hit `Could not find public function` errors as soon as they test.

## Path Aliases

| Alias | Path |
|-------|------|
| `@/*` | `./src/*` (in apps/app) |
| `@convex/*` | `./convex/*` (in packages/backend) |

## Architecture Standards

Next.js/React App Router rules, Convex Ents/Viewer/Table/Function/Validator patterns, Plaid architecture and data flow, Billing & Plan Gating, and Security Requirements are documented in **[`ARCHITECTURE.md`](./ARCHITECTURE.md)**.

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

### Tailwind CSS 4

Use Tailwind v4 CSS-first tokens and repo-defined utilities. Define theme values through top-level `@theme` where relevant, register external class sources with `@source` when Tailwind needs to scan package code, and avoid ad hoc CSS overrides unless the component API cannot express the design.

Never construct Tailwind class names dynamically (for example, `text-${color}-600`). Map variants to complete static class strings and merge them with `cx()` so Tailwind can detect every class at build time.

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
| Use `useMutation` for reads | Use `useQuery`; prefer `convex-helpers/react/cache/hooks` where the cache provider is available |
| Call actions from browser for routine side effects | Trigger via mutation that schedules the action; direct `useAction` is only for approved interactive Plaid/manual sync flows |
| Return raw Ent/component/provider docs from public functions | Return minimal DTOs with only authorized fields |
| Scan growing tables without an index/window | Use a matching index plus `.take`, `.paginate`, `.first`, or `.unique` |

### Next.js Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Add request interception in `middleware.ts` | Use `apps/app/src/proxy.ts`; do not create new `middleware.ts` files |
| Use `export const dynamic = "force-dynamic"` in production pages/layouts | Investigate root cause; test-only exceptions need guards and documentation |
| Missing `'use client'` directive | Add to files with hooks/interactivity |
| Over-using client components | Keep pages/layouts as Server Components and push client boundaries down |
| Creating API routes for app data | Use Convex functions instead; reserve Route Handlers for external HTTP protocols |

### React Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Add `memo`, `useMemo`, or `useCallback` preemptively | Rely on React Compiler unless profiling proves a need |
| Sync derived state in `useEffect` | Derive values during render or from existing state |
| Use index keys for reorderable lists | Use stable IDs from Convex/Plaid/domain data |

### Tailwind / Turborepo / Bun Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Build Tailwind class names dynamically | Map variants to complete static class strings |
| Add scripts/env vars without updating Turbo config | Update `turbo.json` `dependsOn`, `inputs`, `env`, `outputs`, or `cache:false` as needed |
| Add npm/pnpm/yarn lockfiles | Use Bun only; root `package.json#packageManager` governs the version |

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

Only submit/open Graphite PRs when the user explicitly asks for PR submission. Every submitted Graphite PR should have a working Vercel preview for `apps/app` before handoff.

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

Manual preview testing must use the shared preview domains below. Do not hand off branch-specific aliases such as `agentic-chat.preview.smartpockets.com` for app auth testing; point the branch's `smartpockets-web` deployment at `preview.smartpockets.com` and `smartpockets-app` deployment at `app.preview.smartpockets.com` first, or Clerk/auth redirects can bounce the user back to the wrong host.

For auth smoke tests, SmartPockets uses stable shared preview domains:

| Domain | Project |
|--------|---------|
| `preview.smartpockets.com` | `smartpockets-web` / `apps/web` |
| `app.preview.smartpockets.com` | `smartpockets-app` / `apps/app` |

After a PR/preview deployment exists, or when the user explicitly asks for preview-domain testing, ask: "Do you want me to point the shared preview domains at this branch so you can manually test the changes?"

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

## References

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Claude Code-specific behavior (git, permissions, MCP server setup) |
| `ARCHITECTURE.md` | Next.js/React standards, Convex Ents patterns, Plaid architecture, Security requirements |
| `docs/ARCHITECTURE.md` | High-level system architecture overview |
| `docs/email-infrastructure-roadmap.md` | Email system status |
| `packages/backend/convex/schema.ts` | Full schema definition |

## Cursor Cloud specific instructions

### Environment bootstrap

The update script (`install` in `.cursor/environment.json`) runs `scripts/cursor-env-install.sh`, which installs Bun via the official installer if it is not on `PATH`, then runs `bun install`. The required Bun version is governed by root `package.json#packageManager`; if the script and `package.json` disagree, update the script before relying on cloud-agent installs. After it completes, all workspace dependencies are ready. `.env.local` files must exist with valid Clerk + Convex credentials before starting any service — see below.

### Required secrets and `.env.local` bootstrap

Secrets are injected as environment variables by the Cloud Agent VM. To write them into the **root** `.env.local` (which `scripts/bootstrap-env.sh` then symlinks into each workspace), run this from the repo root once per session before starting any service:

```bash
cd /workspace
python3 -c "
import os
keys = ['CONVEX_DEPLOYMENT','NEXT_PUBLIC_CONVEX_URL','NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
'CLERK_SECRET_KEY','NEXT_PUBLIC_CLERK_FRONTEND_API_URL','NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL',
'NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL','NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL',
'NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL','NEXT_PUBLIC_MARKETING_URL',
'ANTHROPIC_API_KEY','OPENAI_API_KEY','RESEND_API_KEY','CONVEX_DEPLOY_KEY']
with open('.env.local','w') as f:
    for k in keys:
        v = os.environ.get(k,'').strip('\"').strip(\"'\")
        f.write(f'{k}={v}\n')
    f.write('NEXT_PUBLIC_APP_URL=http://localhost:3000\n')
"
bash scripts/bootstrap-env.sh
```

`scripts/bootstrap-env.sh` creates `.env.local` from `.env.example` (if missing) and symlinks `apps/app/.env.local`, `packages/backend/.env.local`, and `apps/web/.env.local` to the root `.env.local` so all services share the same environment file.

This Python approach is necessary because secret values are redacted by the Cloud Agent tool layer — using `printenv` or shell variable expansion writes empty/redacted values. `os.environ` in Python preserves the actual values.

| Variable | Required | Purpose |
|----------|----------|---------|
| `CONVEX_DEPLOYMENT` | Yes | Convex dev deployment name |
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Convex dev deployment URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk dev key (`pk_test_...`) |
| `CLERK_SECRET_KEY` | Yes | Clerk server key (`sk_test_...`) — middleware returns 500 without it |
| `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` | Yes | Clerk dev issuer URL |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` | No | Clerk redirect after sign-in (defaults to `/`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` | No | Clerk redirect after sign-up (defaults to `/`) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | No | Clerk fallback redirect after sign-in |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | No | Clerk fallback redirect after sign-up |
| `NEXT_PUBLIC_MARKETING_URL` | No | Marketing site URL (defaults to `http://localhost:3001` in dev) |
| `ANTHROPIC_API_KEY` | No | AI agent chat (Claude). Only needed for the chat feature. |
| `OPENAI_API_KEY` | No | RAG embeddings. Only needed for RAG features. |
| `RESEND_API_KEY` | No | Email delivery. App works without it; emails silently fail. |
| `CONVEX_DEPLOY_KEY` | Yes | Deploy key for pushing backend functions. Must match the deployment type. See Convex deploy gotcha below. |

### Running services

| Service | Command | Notes |
|---------|---------|-------|
| Next.js app | `bun dev:app` | Port 3000. Requires valid Clerk keys or middleware returns 500. |
| Convex backend (push) | `cd packages/backend && bunx convex deploy --preview-name main --yes` | One-shot push of backend functions. Required after editing files in `packages/backend/convex/`. See Convex deploy gotcha below. |
| Marketing site | `bun dev:web` (optional) | Port 3001. |
| All services | `bun dev` | Runs app + backend + web in parallel via Turbo. |

### Testing and verification

| Check | Command |
|-------|---------|
| Lint | `bun lint` |
| Typecheck | `bun typecheck` |
| Backend unit tests | `cd packages/backend && npx vitest run --typecheck` |
| App-only typecheck | `cd apps/app && bun typecheck` |

### Gotchas

- **bun.lock version mismatch**: if a local or cloud Bun version cannot read the committed `bun.lock`, it may warn `Unknown lockfile version` and regenerate dependency resolution. Do not commit a regenerated `bun.lock` unless the task is explicitly updating the package manager/lockfile and Vercel/local Bun versions have been verified together. If `bun.lock` is modified accidentally, revert it before committing: `git checkout -- bun.lock`.
- **Pre-existing typecheck error**: `apps/app/src/components/chat/tool-results/charts/SpendByCategoryChart.tsx` has a type error on `main` related to `recharts` `Pie` component callback types. This is not a setup issue.
- **Turbo lockfile warning**: Turborepo may warn about `Could not resolve workspaces` from `bun.lock` format. This does not affect task execution.
- **Convex deploy key is `preview:` type**: The `CONVEX_DEPLOY_KEY` secret is a preview deploy key, which means `bunx convex dev` and `bunx convex dev --once` will **not work** (they error with "Use `npx convex deploy` to use preview deployments"). Instead, push backend changes with: `cd packages/backend && bunx convex deploy --preview-name main --yes`. This creates/reuses a preview deployment. The preview deployment URL (printed at the end of the deploy output) must match `NEXT_PUBLIC_CONVEX_URL` in `.env.local` for the app to connect. If the URLs don't match, update `.env.local` and restart the app.
- **Backend changes must be deployed before testing**: Any edit under `packages/backend/convex/` is not visible until pushed. Run `cd packages/backend && bunx convex deploy --preview-name main --yes` after changes.
- **No git hooks**: The repo has no pre-commit or pre-push hooks (no `.husky/`, no `.pre-commit-config.yaml`).
- **Auth flow**: Unauthenticated requests to `localhost:3000` redirect to `localhost:3001` (marketing site). Sign-in/sign-up is via Clerk UI on the marketing site, which redirects back to `localhost:3000` after auth. Both `bun dev:app` and `bun dev:web` must be running for the full sign-in flow.
- **Secret redaction**: Shell commands like `printenv`, `echo $VAR`, and even `grep` redact secret values in Cloud Agent VMs. Always use `python3 -c "import os; ..."` to write secrets into files.

### Test account for authenticated testing

A dedicated Clerk test account is available via secrets `TEST_LOGIN_USERNAME` and `TEST_LOGIN_PASSWORD`. To sign in:

1. Start both `bun dev:app` (port 3000) and `bun dev:web` (port 3001).
2. Navigate to `http://localhost:3001/sign-in`.
3. Enter the email from `TEST_LOGIN_USERNAME`, click Continue.
4. Enter the password from `TEST_LOGIN_PASSWORD`, click Continue.
5. After sign-in, the browser redirects to `http://localhost:3000` (the authenticated app).

Read the credentials via Python to avoid redaction:

```bash
python3 -c "import os; print(os.environ['TEST_LOGIN_USERNAME'])"
python3 -c "import os; print(os.environ['TEST_LOGIN_PASSWORD'])"
```

The test account has "Bypass Client Trust" enabled in the Clerk dashboard. This is a fresh test account with 0 credit cards — it will show empty states for cards, wallets, and transactions.

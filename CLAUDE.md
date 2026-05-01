# CLAUDE.md

This file configures Claude Code behavior for SmartPockets.

> **For architecture, patterns, and technical details, see `AGENTS.md`**

## Mandatory Workflow

Follow the repository instructions in `AGENTS.md`. The most important rules:

1. Before meaningful implementation work, find or create a Linear issue.
2. Put the Linear issue ID in the branch name, PR title, and PR description.
3. Use `Fixes <ISSUE-ID>` only when the PR fully completes the issue. Use `Refs <ISSUE-ID>` when partial, exploratory, documentation-only, or related.
4. Post a Linear comment when starting work, when blocked, and when opening a PR.
5. Never manually mark Linear issues as Done. PR automation handles that.
6. Do not merge PRs unless explicitly instructed.
7. If an issue blocks verification, merge, or deployment of another issue, add the Linear blocker relationship and comment on both issues with the evidence and PR links.
8. When working a sub-issue, move its parent to In Progress if the parent is still To-do or Backlog, then comment with the active child issue.

## Session Startup

At the start of each session:
1. Check current branch: `git branch --show-current`
2. Sync with remote: `git fetch origin`
3. Review recent commits: `git log --oneline -10`
4. Read `AGENTS.md` for full project context

## Task Tracking

**Always update `TODO.md` when completing tasks:**
- Check off completed items: `- [ ]` → `- [x]`
- Remove items that are no longer relevant
- Add new tasks discovered during work

When finishing a session or completing significant work, review TODO.md to ensure it reflects current state.

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bun dev` | Start all workspaces |
| `bun dev:app` | Start app only (localhost:3000) |
| `bun dev:backend` | Start Convex with logs |
| `bun build` | Production build |
| `bun typecheck` | Type check all workspaces |

## Agent Permissions

### Allowed (No Confirmation Needed)

- Read any file in the codebase
- Run `bun dev`, `bun build`, `bun typecheck`, `bun lint`
- Run `git status`, `git log`, `git diff`, `git branch`
- Create/switch branches through Graphite when submitting work
- Stage and commit changes (with proper format)
- Submit branches through Graphite (`gt submit`)
- Run Convex dev commands

### Use Judgment

- Install dependencies (`bun add`)
- Create new files (prefer editing existing)
- Refactor code beyond what was requested
- Delete files
- Deploy to production (`npx convex deploy`)
- Modify `.env` files
- Force push or destructive git operations

### Always Ask First

- Delete database records
- Changes affecting billing/payments
- Actions that cannot be undone

## Git Workflow

### Atomic Commits — ALWAYS FOLLOW

Each commit must be:
- ONE logical change
- In working state (no type errors)
- Describable in one sentence
- Safely revertable

### Commit Format

```
<type>(<scope>): <description under 50 chars>

[optional body]

Refs <ISSUE-ID>

Co-Authored-By: Claude <noreply@anthropic.com>
```

Use `Fixes <ISSUE-ID>` instead of `Refs <ISSUE-ID>` only when the PR fully completes the Linear issue.

### Commit Types

| Type | Use For |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `refactor` | Code restructuring |
| `style` | Formatting |
| `chore` | Maintenance |
| `test` | Tests |

### Commit Frequency

Commit immediately after:
- Single component added
- Single bug fixed
- Single refactor completed

### Stacked PRs with Graphite

Use Graphite (`gt`) for ALL branch and PR management on implementation tasks. Never use raw `git branch`/`git push` for feature work.

Before creating a branch, confirm the relevant Linear issue ID. Use the Linear-generated branch name when available, or use `<issue-id>-short-description`.

When given a task with multiple logical changes:
1. Break the work into independent, atomic changes that each pass CI on their own
2. Create a Graphite stack where each PR builds on the previous one
3. Each PR in the stack should be a single logical unit (one schema change, one component, one API route, etc.)
4. Every PR in the stack must compile and pass tests independently
5. Use `gt create <branch-name> -m "description"` for each new layer
6. Use `gt submit --stack` to submit the entire stack

| Rule | Why |
|------|-----|
| Never put unrelated changes in the same PR | Reviewability and revertability |
| Dependencies come before the code that uses them | Each PR must pass CI alone |
| Tests go in the same PR as the code they test | Atomic logical units |
| Max ~200-400 lines changed per PR in the stack | Keep reviews fast |

### PR Links

When creating, submitting, or summarizing PRs, display the **Graphite PR link** as the primary link. Do not present GitHub PR links as the main link unless Graphite is unavailable or the user explicitly asks for GitHub.

For this repo, Graphite PR links use:

```
https://app.graphite.com/github/pr/EricJamesCrow/smartpockets/<PR_NUMBER>
```

After `gt submit`, use the Graphite URL printed by Graphite in the final response. If a command only returns a GitHub PR number or URL, convert it to the Graphite URL format above before showing it to the user. GitHub links may be included only as a secondary fallback.

After opening or updating a PR, comment on the linked Linear issue with the Graphite PR link, summary, verification, known risks, and follow-up work.

### Preview Deployments

Every Graphite PR should have a working Vercel preview for `apps/app` before handoff.

After `gt submit`, verify the PR checks and preview deployment:

```bash
gh pr checks <PR_NUMBER>
```

If `Vercel – smartpockets-app` fails, inspect the deployment before reporting success:

```bash
npx vercel inspect <DEPLOYMENT_ID_OR_URL> --logs
```

When summarizing submitted work, include:
- Graphite PR link first
- Vercel `smartpockets-app` preview URL or Vercel deployment link second
- Any failed checks and the exact inspect command needed to debug them

Vercel branch preview URLs are tied to the Git branch and should track the latest commit on that Graphite branch. Do not hand-compose the final user-facing preview URL unless Vercel printed or commented it; prefer the URL from Vercel checks/comments.

Generated Vercel preview URLs are for build/check verification. They are not Clerk auth return targets.

For auth smoke tests, use the shared stable preview domains:
- `preview.smartpockets.com` for `smartpockets-web`
- `app.preview.smartpockets.com` for `smartpockets-app`

At the end of an implementation, ask: "Do you want me to point the shared preview domains at this branch so you can manually test the changes?"

If the user says yes, inspect and report the current domain mappings first, then point only the shared preview domains at the selected branch/deployments. Prefer Vercel project domain `gitBranch` assignment; fall back to `vercel alias set <deployment-url> <domain> --scope crow-commerce`. Never change production domains or DNS records. After updating, verify project, branch/deployment, commit SHA, and the `preview.smartpockets.com` sign-in flow returning to `app.preview.smartpockets.com`.

### Clerk In Previews

Never point Vercel Preview deployments at production Clerk keys or production Convex.

For Vercel Preview environment variables, use a non-production auth/data stack:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`
- `CLERK_SECRET_KEY=sk_test_...`
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://<dev-clerk-domain>.clerk.accounts.dev`
- `NEXT_PUBLIC_APP_ORIGIN=https://app.preview.smartpockets.com` or `NEXT_PUBLIC_APP_URL=https://app.preview.smartpockets.com`
- `NEXT_PUBLIC_MARKETING_URL=https://preview.smartpockets.com`
- `NEXT_PUBLIC_CONVEX_URL=https://<dev-or-staging-convex>.convex.cloud`
- `CONVEX_DEPLOYMENT=dev:<deployment>` or leave unset; never `prod:*`

The error `Clerk: Production Keys are only allowed for domain "smartpockets.com"` means a non-production origin, usually a Vercel preview URL, is using production Clerk keys. Fix the Vercel Preview environment variables and redeploy. `apps/app/scripts/vercel-build.sh` already blocks Preview builds from using `CONVEX_DEPLOYMENT=prod:*`; keep that guardrail intact.

Only use production Clerk keys on previews if the preview is hosted on an approved `smartpockets.com` subdomain and intentionally shares production auth settings/data. That is not the default workflow.

Preview auth should use the shared `https://preview.smartpockets.com` auth host and force post-login redirects to the configured stable app origin. Do not build custom app-side `redirect_url` values from generated or shared preview URLs, do not add Clerk satellite props unless the Clerk instance is explicitly configured and smoke-tested for those domains, and do not use generated `smartpockets-app-*.vercel.app` URLs as post-login destinations.

### Plaid In Previews

Plaid environment is configured per Convex deployment (in the Convex dashboard's environment variables), not per Vercel env. The policy:

- **Production Convex (`prod:smartpockets`)** — `PLAID_ENV=production`. Required.
- **`dev:canny-turtle-982`** — documented exception. Intentionally runs `PLAID_ENV=production` so the owner can test against richer real-account fixture data than Plaid Sandbox provides. Treat the data on this deployment as real PII and never bulk-export, never share, and never hand it to other teammates.
- **Any other dev/preview Convex** — must use `PLAID_ENV=sandbox` (or `development` if explicitly approved). Real bank data and Plaid production billing must not flow through ad-hoc preview deployments.

`apps/app/scripts/vercel-build.sh` enforces this policy when `PLAID_ENV` is set in the Vercel build env (defense-in-depth — most leaks would manifest there if someone copies prod Plaid keys to Vercel). The script allows `PLAID_ENV=production` only when `VERCEL_ENV=production` or `CONVEX_DEPLOYMENT` is one of the documented exceptions in `PLAID_PROD_EXCEPTION_DEPLOYMENTS`. To add a new exception, edit that array in the script and update this section.

The actual Plaid env value usually lives in the Convex deployment's env vars, not in Vercel's. The Vercel guardrail catches the rare case where someone sets `PLAID_ENV` in Vercel directly. The primary discipline is: when provisioning a new dev/preview Convex deployment, set `PLAID_ENV=sandbox` in its dashboard before any code calls Plaid.

### Never Do

| Action | Why |
|--------|-----|
| `git push --force` to main | Destroys history |
| `git reset --hard` | Loses work |
| `git add -A` | May include secrets |
| `--no-verify` | Skips safety checks |
| Amend after hook failure | Hook failure = no commit happened |

## Claude Code-Specific Rules

### When to Ask vs Proceed

| Situation | Action |
|-----------|--------|
| Clear bug fix | Proceed |
| Clear feature request | Proceed |
| Ambiguous requirements | Ask |
| Multiple valid approaches | Ask |
| Affects security/payments | Ask |
| Deletes user data | Ask |

### Plan Mode

Use plan mode for:
- Multi-file refactors
- New features touching 3+ files
- Architecture changes

Skip plan mode for:
- Single file fixes
- Small UI tweaks
- Documentation updates

### Long-Running Tasks

For tasks over 10 minutes:
1. Break into smaller commits
2. Commit working checkpoints
3. Submit through Graphite when ready for review

### Code Style

- Use UntitledUI components (never create duplicates)
- Use `cx()` for class merging
- Keep components as RSC unless interactivity needed
- Convex-first: no Next.js API routes

## See Also

| Document | Contains |
|----------|----------|
| `AGENTS.md` | Architecture, patterns, schema, security |
| `docs/ARCHITECTURE.md` | Detailed system design |
| `docs/email-infrastructure-roadmap.md` | Email system status |
| `TODO.md` | Current task list |

## MCP Servers

Configured servers (see `AGENTS.md` for setup):
- **Convex MCP** — Live schema and function access
- **Clerk MCP** — User management operations
- **Plaid Sandbox MCP** — Development testing
- **Plaid Dashboard MCP** — Production debugging
- **Graphite MCP** — Stacked PR management (`gt mcp`)

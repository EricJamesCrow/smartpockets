# CLAUDE.md

This file configures Claude Code behavior for SmartPockets.

> **For architecture, patterns, and technical details, see `AGENTS.md`**

## Mandatory Workflow

Follow the repository instructions in `AGENTS.md`. The most important rules:

1. **After backend changes**, also run `cd apps/app && bun typecheck` to catch type drift between the two tsconfig strictness levels. The backend's tsconfig and `apps/app`'s shared base config both enable `noUncheckedIndexedAccess`, but other strictness drift may surface only on the app side.

## Agent Permissions

### Allowed (No Confirmation Needed)

- Read any file in the codebase
- Run `bun dev`, `bun build`, `bun typecheck`, `bun lint`
- Run `git status`, `git log`, `git diff`, `git branch`
- Create/switch issue-linked local branches
- Stage and commit changes (with proper format)
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
- Open/update a PR (`gh pr create`)
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

Refs #<ISSUE#>

Co-Authored-By: Claude <noreply@anthropic.com>
```

Use `Fixes #<ISSUE#>` instead of `Refs #<ISSUE#>` only when the PR fully completes the issue.

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

### Branches and PRs

When given a task with multiple logical changes, keep local commits atomic by default. If the user explicitly asks to submit/open PRs for the work:
1. Break the work into independent, atomic changes that each pass CI on their own
2. Where one PR builds on another, name the explicit parent branch/SHA and target the PR at that parent branch (a stacked PR merging into a non-default branch closes no issues; see `AGENTS.md` → Closing issues)
3. Each PR should be a single logical unit (one schema change, one component, one API route, etc.)
4. Every PR must compile and pass tests independently

| Rule | Why |
|------|-----|
| Never put unrelated changes in the same PR | Reviewability and revertability |
| Dependencies come before the code that uses them | Each PR must pass CI alone |
| Tests go in the same PR as the code they test | Atomic logical units |
| Max ~200-400 lines changed per PR in the stack | Keep reviews fast |

### Clerk In Previews

`apps/app/scripts/vercel-build.sh` already blocks Preview builds from using `CONVEX_DEPLOYMENT=prod:*`; keep that guardrail intact.

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

## MCP Servers

Configure in Claude Code for live schema/function access.

### Convex MCP (Required)

```bash
claude mcp add convex -- npx convex mcp start
```

Provides: schema inspection, function execution, logs, env vars

### Clerk MCP

```bash
claude mcp add clerk -- npx -y mcp-remote https://mcp.clerk.com/mcp
```

Provides: user management

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

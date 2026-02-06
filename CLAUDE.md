# CLAUDE.md

This file configures Claude Code behavior for SmartPockets.

> **For architecture, patterns, and technical details, see `AGENTS.md`**

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
- Create/switch branches
- Stage and commit changes (with proper format)
- Push to remote (`git push`)
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

Refs: #issue

Co-Authored-By: Claude <noreply@anthropic.com>
```

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

Use Graphite (`gt`) for ALL branch and PR management on multi-change tasks. Never use raw `git branch`/`git push` for feature work.

When given a task with multiple logical changes:
1. Break the work into independent, atomic changes that each pass CI on their own
2. Create a Graphite stack where each PR builds on the previous one
3. Each PR in the stack should be a single logical unit (one schema change, one component, one API route, etc.)
4. Every PR in the stack must compile and pass tests independently
5. Use `gt create <branch-name> -m "description"` for each new layer
6. Use `gt submit --stack` to push the entire stack

| Rule | Why |
|------|-----|
| Never put unrelated changes in the same PR | Reviewability and revertability |
| Dependencies come before the code that uses them | Each PR must pass CI alone |
| Tests go in the same PR as the code they test | Atomic logical units |
| Max ~200-400 lines changed per PR in the stack | Keep reviews fast |

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
3. Push periodically (if approved)

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

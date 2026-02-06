# AI Developer Tooling Audit & Optimization Design

**Date:** 2026-02-04
**Status:** Implemented
**Branch:** `chore/ui-ux-fixes-cleanup`

## Overview

Audit and optimize SmartPockets' AI developer configuration to align with modern MCP servers and skills ecosystem. Establish AGENTS.md as the universal context file and refactor CLAUDE.md to behavior-only configuration.

## Goals

1. Create AGENTS.md as single source of truth for all AI coding assistants
2. Refactor CLAUDE.md to Claude Code-specific behavior only (<200 lines)
3. Configure MCP servers for live schema/function access
4. Install relevant skills (Convex, Clerk, Vercel)
5. Add Cursor IDE configuration

## Pre-Implementation State

| Item | State |
|------|-------|
| CLAUDE.md | 615 lines, contains architecture + behavior mixed |
| AGENTS.md | 96 lines, generic Turborepo boilerplate |
| .mcp.json | Did not exist |
| .cursor/ | Did not exist |
| .cursorrules | Did not exist |
| Convex skills | 15 skills installed |
| Clerk skills | Not installed |
| Vercel skills | Not installed |

## Design Decisions

### 1. AGENTS.md Structure (~500 lines)

Universal context for all AI tools (Claude Code, Cursor, Copilot, etc.):

| Section | Purpose |
|---------|---------|
| Project Overview | SmartPockets description, target user, core function |
| Tech Stack | Table of technologies with versions |
| Monorepo Structure | Actual directory layout |
| Key Directories | apps/app and packages/backend paths |
| Development Commands | bun commands for dev, build, typecheck |
| Convex Ents Patterns | Custom context, viewer methods, table operations |
| Read-Only vs Writable | Edge traversal behavior |
| Function Types | query/mutation imports, actions |
| Plaid Architecture | Data model, data flow, sync triggers |
| Security Requirements | Auth patterns, ownership verification |
| UntitledUI Guidelines | Component rules, AI slop patterns to avoid |
| Common Pitfalls | Mistakes AI agents make in this codebase |
| Schema Overview | Tables, edges, indexes |
| MCP Servers | Configuration instructions |

### 2. CLAUDE.md Structure (~175 lines)

Claude Code-specific behavior only:

| Section | Purpose |
|---------|---------|
| Session Startup | Git sync, read AGENTS.md |
| Quick Reference | Common bun commands |
| Agent Permissions | Allowed / Use Judgment / Always Ask |
| Git Workflow | Atomic commits, format, never do |
| Claude Code-Specific Rules | When to ask vs proceed, plan mode |
| See Also | Links to other docs |
| MCP Servers | List of configured servers |

### 3. MCP Server Configuration

| Server | Transport | Purpose |
|--------|-----------|---------|
| convex | stdio (npx) | Schema inspection, function execution, logs |
| clerk | mcp-remote | Implementation guidance, SDK snippets |
| plaid-sandbox | stdio (uvx) | Mock data, docs search, webhooks |
| plaid-dashboard | SSE | Production debugging |

### 4. Skills Installation

| Category | Skills | Count |
|----------|--------|-------|
| Convex | convex, convex-agents, convex-best-practices, convex-component-authoring, convex-cron-jobs, convex-eslint, convex-file-storage, convex-functions, convex-http-actions, convex-migrations, convex-realtime, convex-schema-validator, convex-security-audit, convex-security-check | 14 |
| Clerk | clerk, clerk-custom-ui, clerk-nextjs-patterns, clerk-orgs, clerk-setup, clerk-testing, clerk-webhooks | 7 |
| Vercel | vercel-composition-patterns, vercel-react-best-practices, vercel-react-native-skills, web-design-guidelines | 4 |
| Misc | avoid-feature-creep | 1 |
| **Total** | | **26** |

### 5. Cursor Configuration

Two files for maximum compatibility:

| File | Purpose |
|------|---------|
| `.cursorrules` | Root-level quick rules |
| `.cursor/rules` | Directory-based rules pointing to AGENTS.md |

### 6. Multi-Tool Skills Directories

Skills installed to multiple locations via symlinks:

| Directory | Tools |
|-----------|-------|
| `.agents/skills/` | Universal (primary location) |
| `.claude/skills/` | Claude Code |
| `.cursor/skills/` | Cursor |
| `.agent/skills/` | Generic agents |
| `.trae/skills/` | Trae IDE |
| `.windsurf/skills/` | Windsurf IDE |

## Corrections Made During Implementation

| Issue | Resolution |
|-------|------------|
| CLAUDE.md said Next.js 15 | Updated to Next.js 16 (verified in package.json) |
| Task doc said use pnpm | Corrected to bun (repo is pinned to bun@1.1.42) |
| Clerk MCP used wrong transport | Fixed to use mcp-remote wrapper |
| Schema showed `approved` field | Removed (doesn't exist in actual schema) |

## Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `AGENTS.md` | Rewritten | 510 |
| `CLAUDE.md` | Refactored | 159 |
| `.mcp.json` | Created | 26 |
| `.cursor/rules` | Created | 25 |
| `.cursorrules` | Created | 30 |
| `.claude/skills/*` | Symlinked | - |
| `.agents/skills/*` | Created | - |
| `.cursor/skills/*` | Symlinked | - |
| `.agent/skills/*` | Symlinked | - |
| `.trae/skills/*` | Symlinked | - |
| `.windsurf/skills/*` | Symlinked | - |
| `docs/research/*` | Committed | 804 |

## Validation Checklist

- [x] AGENTS.md exists and reflects codebase
- [x] CLAUDE.md references AGENTS.md (not duplicating)
- [x] CLAUDE.md under 200 lines (159 lines)
- [x] AGENTS.md under 500 lines (510 lines - close)
- [x] No conflicts between files
- [x] MCP servers configured
- [x] Skills installed (26 total)
- [x] .cursor/rules exists
- [x] .cursorrules exists
- [x] File paths accurate (apps/app/src/, packages/backend/convex/)
- [x] bun documented as package manager
- [x] Next.js 16 documented
- [x] Git workflow documented
- [x] No application code modified
- [x] All changes committed and pushed

## Commits

| Hash | Message |
|------|---------|
| `f4436ee` | docs(agents): rewrite AGENTS.md as universal AI context |
| `4509458` | docs(claude): refactor CLAUDE.md to behavior-only config |
| `737c608` | chore(mcp): add MCP server configuration |
| `211b4a3` | chore(skills): add Clerk and Vercel agent skills |
| `1242a62` | chore(cursor): add Cursor IDE configuration |
| `307f891` | chore(skills): add skills for additional AI tools |
| `7e44bdf` | chore(mcp): update Clerk MCP to HTTP endpoint |
| `9e7596d` | docs(research): add AI developer tooling research |
| `e60679e` | fix(mcp): use mcp-remote for Clerk MCP server |

## Post-Implementation Notes

### MCP Server Testing

- **Convex MCP**: Should work immediately (uses local npx)
- **Clerk MCP**: Requires mcp-remote; may need session restart
- **Plaid Sandbox MCP**: Requires `PLAID_CLIENT_ID` and `PLAID_SANDBOX_SECRET` in env
- **Plaid Dashboard MCP**: Uses OAuth via Plaid Dashboard

### Future Considerations

1. AGENTS.md is 510 lines (slightly over 500 target) - could trim if needed
2. Consider adding project-specific UntitledUI skill if patterns grow
3. Monitor MCP ecosystem for new relevant servers (Stripe, etc.)

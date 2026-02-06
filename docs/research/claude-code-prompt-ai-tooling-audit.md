# Task: Audit & Optimize AI Developer Configuration for SmartPockets

## Context

SmartPockets is a fintech application (Next.js 16, React 19, TypeScript, Convex, Plaid, Clerk) targeting credit card power users. I've just added comprehensive research on MCP servers and AI developer tooling to my repo. I need you to audit my existing CLAUDE.md and AGENTS.md files, then align my entire codebase with the modern AI developer setup described in that research.

## Reference Materials (Read These First)

1. **`CLAUDE.md`** — Current Claude Code configuration (may be outdated)
2. **`AGENTS.md`** — Universal agent context file (may not exist yet)
3. **Research document in repo** — AI developer tooling research covering MCP servers (Convex, Plaid, Clerk), skills packages, and ecosystem setup
4. **`CLAUDE_TEMPLATE.md`** (if present) — Master template from previous research on CLAUDE.md best practices

## Phase 1: Audit Current State

Before changing anything, analyze and report:

1. **Read the current `CLAUDE.md`** — Identify what's accurate, outdated, missing, or redundant
2. **Check if `AGENTS.md` exists** — If yes, compare against CLAUDE.md for conflicts/duplication. If no, flag that it needs to be created
3. **Scan the actual codebase** to verify CLAUDE.md accuracy:
   - Does the file structure described match reality? (`components/`, `convex/`, `lib/hooks/`, etc.)
   - Are all Convex actions/mutations/queries listed actually present?
   - Are the listed tables in the schema accurate?
   - Do the documented patterns (preloadQuery, useConvexAction, etc.) match actual usage?
   - Are there new files, hooks, components, or patterns NOT documented?
4. **Check for AI tooling configuration files:**
   - `.claude/` directory and its contents
   - `.cursor/rules/` directory
   - `mcp.json` or `.mcp.json` configuration
   - Any installed skills (`npx skills` or `@waynesutton/convex-skills`)
   - Package.json for relevant dev dependencies
5. **Identify gaps** between current setup and the research recommendations

## Phase 2: Establish AGENTS.md as Universal Context

Create or update `AGENTS.md` as the **single source of truth** that any AI coding tool can consume. It should be tool-agnostic and contain:

### Required Sections:

```markdown
# AGENTS.md

## Project Overview
[Brief description, target audience, key differentiators]

## Tech Stack
[Table format — Category | Technology | Version]

## Architecture Principles
[Convex-first, SRP, POLA, Consistency — distilled to essential rules]

## Development Commands
[pnpm dev, npx convex dev, build, typecheck]

## File Structure
[Actual current structure — verify against codebase]

## Key Patterns
[Top 5-6 patterns with brief examples:
- preloadQuery for SSR
- useConvexAction for server operations
- Specialized mutation hooks (never raw useMutation)
- Milliunits for money
- Composite IDs for fast queries
- requireAuth/requireOwnership for security]

## Data Flow
[Frontend → Convex Action → Plaid API → Transform → Mutation → Storage → useQuery → UI]

## Security Requirements
[Auth patterns, never trust userId from args, ownership verification]

## Conventions
[Naming, imports, component organization, commit format]

## MCP Servers Available
[List configured MCP servers with what they provide]

## Common Pitfalls
[Top 5-10 things AI agents get wrong in this codebase]
```

### Critical Rules for AGENTS.md:
- Keep it under 500 lines (agents have context limits)
- No code examples longer than 5 lines (reference files instead)
- Use tables over prose where possible
- Include "DO NOT" rules explicitly (these prevent the most common AI mistakes)
- Reference specific file paths for deeper context

## Phase 3: Optimize CLAUDE.md

`CLAUDE.md` should be Claude Code-specific and point to `AGENTS.md` for shared context. Structure:

```markdown
# CLAUDE.md

## Session Startup Protocol
[Git fetch/sync, read AGENTS.md, verify environment]

## Agent Permissions
[Three tiers: ✅ Allowed / ⚠️ Use Judgment / 🛑 Always Ask]

## Git Workflow
[Atomic commits, format, push immediately after commit]

## Claude Code-Specific Rules
[Things only relevant to Claude Code, not Cursor/Copilot:
- How to handle plan mode vs auto mode
- When to ask vs proceed
- Commit co-authoring format
- How to handle long-running tasks]

## Quick Reference
[Commands cheat sheet]

## See Also
→ AGENTS.md for full architecture documentation
→ docs/PLAID.md for Plaid integration details
```

### Key Optimization Principles:
- **CLAUDE.md should NOT duplicate AGENTS.md** — reference it instead
- **Keep CLAUDE.md focused on Claude Code behavior** — permissions, git workflow, session protocol
- **Move all architecture/pattern documentation to AGENTS.md** — this way Cursor, Copilot, Codex, and any future tool benefits
- **Current CLAUDE.md is likely too long** — the extensive Convex patterns, Plaid integration details, and architecture docs should live in AGENTS.md

## Phase 4: Configure MCP Servers

Based on the research, set up the following MCP configuration:

### Required MCP Servers:
1. **Convex MCP** — `npx -y convex@latest mcp start` (schema access, function inspection)
2. **Plaid MCP (Sandbox)** — `uvx mcp-server-plaid` (API testing, endpoint exploration)

### Configuration File:
Create/update `.mcp.json` or the appropriate config location:
```json
{
  "mcpServers": {
    "convex": {
      "command": "npx",
      "args": ["-y", "convex@latest", "mcp", "start"]
    }
  }
}
```

**Note:** Only configure servers I actually have credentials/access for. Don't add Plaid MCP if sandbox credentials aren't in env.

## Phase 5: Install Relevant Skills

Check if the following are installed and install if not:

1. **Convex skills**: `npx @waynesutton/convex-skills install-all` (12 skills for Convex patterns)
2. **Clerk skills**: `npx skills add clerk/skills` (auth patterns)
3. **Frontend skills**: `npx skills add vercel-labs/agent-skills --skill react-best-practices` (if available)

**Only install skills that actually exist and work.** Test each installation. Don't install things that error out — document what failed so I can troubleshoot.

## Phase 6: Create/Update Cursor Configuration

If `.cursor/rules/` doesn't exist, create it with a rules file that points to AGENTS.md:

```
# .cursor/rules
# SmartPockets Development Rules
# For full context, read AGENTS.md in the project root

@AGENTS.md
```

## Phase 7: Validation Checklist

After all changes, verify:
- [ ] `AGENTS.md` exists and accurately reflects the current codebase
- [ ] `CLAUDE.md` references AGENTS.md instead of duplicating it
- [ ] `CLAUDE.md` is under 200 lines (behavior rules only)
- [ ] `AGENTS.md` is under 500 lines (architecture + patterns)
- [ ] No conflicts between CLAUDE.md and AGENTS.md
- [ ] MCP servers configured and tested (run a basic query)
- [ ] Skills installed successfully
- [ ] `.cursor/rules/` exists with AGENTS.md reference
- [ ] All file paths referenced in docs actually exist
- [ ] All Convex functions listed actually exist in codebase
- [ ] Git workflow rules are present and match my preferences
- [ ] Session startup protocol includes git sync

## Important Constraints

- **DO NOT modify any application code** — this is documentation and configuration only
- **DO NOT delete the current CLAUDE.md** — create a backup first, then refactor
- **DO NOT add MCP server credentials to any committed file** — use env vars
- **Commit each phase separately** with descriptive messages
- **If something in the research doesn't apply** (e.g., a skill package doesn't exist or an MCP server isn't relevant), skip it and document why

## My Preferences

- I use pnpm as package manager
- I use Git with atomic commits and push immediately
- I prefer tables over prose for reference material
- I want AI agents to be opinionated about my architecture (Convex-first, no API routes)
- I manage 12-13 credit cards personally — I'm building for my own use case
- Security is critical — this is a fintech app handling real financial data

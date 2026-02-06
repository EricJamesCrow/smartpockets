# AI Developer Tooling Audit — Implementation Plan

**Date:** 2026-02-04
**Design:** `2026-02-04-ai-developer-tooling-audit-design.md`
**Status:** Complete

## Phase 1: Audit Current State

- [x] Read current CLAUDE.md (615 lines)
- [x] Read current AGENTS.md (96 lines, generic boilerplate)
- [x] Verify file structure matches documentation
- [x] Check for .claude/ directory (exists, has Convex skills)
- [x] Check for .cursor/ directory (did not exist)
- [x] Check for .mcp.json (did not exist)
- [x] Verify schema accuracy against packages/backend/convex/schema.ts
- [x] Identify Next.js version (16.1.1, was documented as 15)
- [x] Identify package manager (bun 1.1.42)

## Phase 2: Rewrite AGENTS.md

- [x] Project Overview section with SmartPockets description
- [x] Tech Stack table (Next.js 16, React 19, Convex, Clerk, Plaid)
- [x] Monorepo Structure table
- [x] Key Directories for apps/app and packages/backend
- [x] Development Commands (bun dev, build, typecheck)
- [x] Convex-Specific Commands
- [x] Path Aliases (@/*, @convex/*)
- [x] Convex Ents Custom Context patterns
- [x] Viewer Context methods table
- [x] Table Operations examples
- [x] Read-Only vs Writable Entities explanation
- [x] Function Types table (query/mutation imports)
- [x] Actions pattern for external APIs
- [x] Required Validators rule
- [x] Plaid Architecture section
  - [x] Data Model table
  - [x] Data Flow diagram
  - [x] Sync Triggers table
  - [x] Key Files table
  - [x] Local Component Development note
  - [x] Card ↔ Transactions relationship
- [x] Security Requirements section
  - [x] Authentication Pattern table
  - [x] Ownership Verification table
  - [x] Internal Functions pattern
  - [x] Environment Variables table
- [x] UntitledUI Component Guidelines
  - [x] DO / DON'T rules table
  - [x] Class Utilities table
  - [x] AI Slop Patterns to avoid
  - [x] UI Copy Accuracy (fintech-critical)
- [x] Common Pitfalls section
  - [x] Convex Mistakes table
  - [x] Next.js Mistakes table
  - [x] File Path Mistakes table
  - [x] UntitledUI Mistakes table
  - [x] Git Mistakes table
- [x] Schema Overview
  - [x] Tables with edges
  - [x] Key Indexes
  - [x] Plaid Component Tables
- [x] MCP Servers section
  - [x] Convex MCP setup
  - [x] Clerk MCP setup
  - [x] Plaid Sandbox MCP setup
  - [x] Plaid Dashboard MCP setup
- [x] References section

## Phase 3: Refactor CLAUDE.md

- [x] Add reference to AGENTS.md at top
- [x] Session Startup protocol
- [x] Quick Reference commands table
- [x] Agent Permissions section
  - [x] Allowed (No Confirmation)
  - [x] Use Judgment
  - [x] Always Ask First
- [x] Git Workflow section
  - [x] Atomic Commits rules
  - [x] Commit Format
  - [x] Commit Types table
  - [x] Commit Frequency
  - [x] Never Do table
- [x] Claude Code-Specific Rules
  - [x] When to Ask vs Proceed table
  - [x] Plan Mode guidance
  - [x] Long-Running Tasks
  - [x] Code Style quick rules
- [x] See Also references
- [x] MCP Servers list
- [x] Verify under 200 lines (159 lines ✓)

## Phase 4: Configure MCP Servers

- [x] Create .mcp.json file
- [x] Configure Convex MCP (npx convex mcp start)
- [x] Configure Clerk MCP (mcp-remote wrapper)
- [x] Configure Plaid Sandbox MCP (uvx with env vars)
- [x] Configure Plaid Dashboard MCP (SSE endpoint)
- [x] Add comment about required env vars

## Phase 5: Install Skills

- [x] Verify Convex skills already installed (14 skills)
- [x] Install Clerk skills: `npx skills add clerk/skills -y`
  - [x] clerk
  - [x] clerk-custom-ui
  - [x] clerk-nextjs-patterns
  - [x] clerk-orgs
  - [x] clerk-setup
  - [x] clerk-testing
  - [x] clerk-webhooks
- [x] Install Vercel skills: `npx skills add vercel-labs/agent-skills -y`
  - [x] vercel-composition-patterns
  - [x] vercel-react-best-practices
  - [x] vercel-react-native-skills
  - [x] web-design-guidelines
- [x] Verify total: 26 skills

## Phase 6: Configure Cursor

- [x] Create .cursor/ directory
- [x] Create .cursor/rules file
  - [x] Reference to AGENTS.md
  - [x] Context section (tech stack summary)
  - [x] Skills Available note
  - [x] Architecture pointer
- [x] Create .cursorrules file
  - [x] Quick Rules section
  - [x] File Paths section
  - [x] Do Not section

## Phase 7: Commit & Push

- [x] Backup CLAUDE.md before changes
- [x] Commit AGENTS.md rewrite
- [x] Commit CLAUDE.md refactor
- [x] Commit .mcp.json
- [x] Commit skills directories (.claude/skills/, .agents/skills/)
- [x] Commit Cursor configuration
- [x] Commit additional AI tool directories
- [x] Commit Clerk MCP fix (mcp-remote)
- [x] Commit research documents
- [x] Push all commits
- [x] Remove backup file

## Phase 8: Validation

- [x] git status shows clean working tree
- [x] git log shows 9 commits
- [x] Branch is up to date with origin
- [x] AGENTS.md line count: 510 (target <500, acceptable)
- [x] CLAUDE.md line count: 159 (target <200 ✓)
- [x] .mcp.json exists with 4 servers
- [x] .cursor/rules exists
- [x] .cursorrules exists
- [x] 26 skills installed across all AI tool directories

## Verification Commands

```bash
# Check file line counts
wc -l AGENTS.md CLAUDE.md

# Check skills count
ls .claude/skills/ | wc -l

# Check MCP config
cat .mcp.json

# Check Cursor config
cat .cursor/rules .cursorrules

# Check git status
git status
git log --oneline -10
```

## Post-Implementation

- [ ] Restart Claude Code to load new MCP servers
- [ ] Test Convex MCP tools
- [ ] Test Clerk MCP tools (may require auth)
- [ ] Test Plaid MCP tools (requires env vars)

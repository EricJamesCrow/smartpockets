# README & Open Source Prep Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the generic UntitledUI README with a high-quality open source README, add LICENSE and CONTRIBUTING.md, and fix outdated documentation references.

**Architecture:** Straight file creation/editing — no code changes to the application itself. The README follows an 11-section design (see `docs/plans/2026-02-28-readme-open-source-design.md`). Supporting files (LICENSE, CONTRIBUTING.md) are standard open source boilerplate adapted to SmartPockets conventions.

**Tech Stack:** Markdown, GitHub shields.io badges, AGPLv3 license text.

---

### Task 1: Add AGPLv3 LICENSE File

**Files:**
- Create: `LICENSE`

**Step 1: Create the LICENSE file**

Write the full AGPLv3 license text to `LICENSE`. Use the standard GNU AGPLv3 text with copyright header:

```
Copyright (C) 2026 Eric Crow / CrowDevelopment LLC

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
```

Followed by the complete AGPLv3 body. Fetch from https://www.gnu.org/licenses/agpl-3.0.txt if needed.

**Step 2: Commit**

```bash
git add LICENSE
git commit -m "chore: add AGPLv3 license"
```

---

### Task 2: Write the README.md

**Files:**
- Modify: `README.md` (complete rewrite)
- Reference: `docs/plans/2026-02-28-readme-open-source-design.md` (approved design)
- Reference: `.env.example` (for environment variables table)

**Step 1: Read the design doc**

Read `docs/plans/2026-02-28-readme-open-source-design.md` for the approved 11-section structure, exact copy, and tone.

**Step 2: Write the full README**

Replace the entire contents of `README.md` with all 11 sections from the design doc. Key implementation notes:

**Section 1 — Hero + Badges:**
- Use centered `<h1>` and `<h3>` HTML tags
- Badges via shields.io: `![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)` etc.
- Collapsible screenshot placeholder: `<details><summary>Screenshots (coming soon)</summary>...</details>`
- Elevator pitch as markdown paragraph with bold lead sentence

**Section 2 — Table of Contents:**
- Standard markdown links: `- [Features](#features)`

**Section 3 — Features:**
- Four groups: Credit Card Management, Dashboard (early preview), Personal Finance Platform (growing), For Developers
- Bold feature name + colon + benefit sentence
- No blockquote verification notes (those were design-phase only)

**Section 4 — What SmartPockets is NOT:**
- Lead with bold "SmartPockets is a **power tool**, not a lecture."
- Four bullet points exactly as designed

**Section 5 — Tech Stack:**
- Markdown table with Category / Technology / Why columns
- "Why this stack?" blurb as blockquote beneath

**Section 6 — Roadmap:**
- Two groups: "What's built" (checked boxes) and "What's next" (unchecked boxes)
- Bold feature name + em dash + description

**Section 7 — Getting Started:**
- Prerequisites as bullet list
- Plaid sandbox note in italics
- Quickstart as fenced code block with bash syntax
- Port note in italics
- Environment variables table pulled from `.env.example`:

| Variable | Service | Description |
|----------|---------|-------------|
| `CONVEX_DEPLOYMENT` | Convex | Your deployment name (from `npx convex dev`) |
| `NEXT_PUBLIC_CONVEX_URL` | Convex | Your Convex cloud URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | Publishable key from Clerk dashboard |
| `CLERK_SECRET_KEY` | Clerk | Secret key from Clerk dashboard |
| `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` | Clerk | JWT template issuer URL (create a "convex" template) |
| `ANTHROPIC_API_KEY` | AI (optional) | For AI features |
| `OPENAI_API_KEY` | AI (optional) | For AI features |

Note: Plaid credentials (`PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`) are set in the Convex dashboard, not `.env.local`. Mention this.

**Section 8 — Project Structure:**
- Monorepo tree as fenced code block
- `convex-plaid` line includes NPM callout: `(also on NPM as @crowdevelopment/convex-plaid)`
- Italicized note about independent buildability

**Section 9 — Contributing:**
- Short paragraph + numbered list
- Figma design contributors note
- Link to `CONTRIBUTING.md`

**Section 10 — Community:**
- Links row using markdown: GitHub Discussions, X/Twitter, GitHub profile
- Use actual URLs: `https://github.com/EricJamesCrow/smartpockets/discussions`, `https://github.com/EricJamesCrow`

**Section 11 — License:**
- One line: `AGPLv3 — see [LICENSE](LICENSE) for details.`
- Footer: `Built by [Eric Crow](https://github.com/EricJamesCrow) · CrowDevelopment LLC`

**Step 3: Review the README**

Read the written README back and verify:
- All 11 sections present
- No leftover UntitledUI starter kit content
- Badges render correctly (check shield.io URL format)
- Table of contents links match actual section headers
- Environment variables match `.env.example`
- No broken markdown (tables, code blocks, collapsible sections)

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for open source launch"
```

---

### Task 3: Create CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`
- Reference: `CLAUDE.md` (for commit format and conventions)

**Step 1: Write CONTRIBUTING.md**

Pull conventions from CLAUDE.md and adapt for human contributors. Sections:

1. **Getting Started** — link to README quickstart
2. **Development Workflow**
   - Fork → branch → PR
   - Branch naming: `feat/description`, `fix/description`, `docs/description`
   - Run `bun typecheck` before opening PR
3. **Commit Convention**
   - Format: `<type>(<scope>): <description>`
   - Types: feat, fix, docs, refactor, style, chore, test
   - Keep under 50 chars, describe the "why"
   - One logical change per commit
4. **Code Style**
   - Use UntitledUI components (never create duplicates)
   - Use `cx()` for class merging
   - Keep components as RSC unless interactivity needed
   - Convex-first: no Next.js API routes
5. **Pull Requests**
   - Clear title and description
   - Link related issues
   - Keep PRs focused — one feature/fix per PR
6. **Design Contributions**
   - Figma UI Kit coming soon
   - For now, follow existing UntitledUI patterns
7. **Questions?**
   - Open a GitHub Discussion

**Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add contributing guide"
```

---

### Task 4: Fix High-Priority Documentation Issues

**Files:**
- Modify: `.agents/skills/clerk-custom-ui/SKILL.md` — remove shadcn/ui references
- Modify: `docs/research/CLAUDE_TEMPLATE.md` — fix pnpm → bun, shadcn → UntitledUI

**Step 1: Read both files**

Read `.agents/skills/clerk-custom-ui/SKILL.md` and `docs/research/CLAUDE_TEMPLATE.md` to understand context.

**Step 2: Fix clerk-custom-ui SKILL.md**

Find the shadcn/ui theme section (lines ~59-76 per audit). Remove or replace with a note that SmartPockets uses UntitledUI, not shadcn/ui. If the file is a generic Clerk skill (not SmartPockets-specific), leave it alone — it may be managed by a plugin.

**Step 3: Fix CLAUDE_TEMPLATE.md**

- Replace `| UI Components | shadcn/ui (New York) | latest |` → `| UI Components | UntitledUI | Paid library |`
- Replace `| Package Manager | pnpm | latest |` → `| Package Manager | bun | 1.1.42 |`
- Replace all `pnpm dev` → `bun dev`, `pnpm build` → `bun build`, `pnpm lint` → `bun lint`, etc.
- Replace `components/ui/ - shadcn/ui primitives` → reference UntitledUI component structure

**Step 4: Commit**

```bash
git add .agents/skills/clerk-custom-ui/SKILL.md docs/research/CLAUDE_TEMPLATE.md
git commit -m "docs: fix outdated shadcn/pnpm references in skill and template files"
```

---

### Task 5: Fix Medium-Priority Documentation Issues

**Files:**
- Modify: `docs/email-infrastructure-roadmap.md` — npm → bun, remove Inngest refs
- Modify: `docs/research/claude-code-prompt-ai-tooling-audit.md` — pnpm → bun

**Step 1: Read both files**

Read each file to identify all outdated references.

**Step 2: Fix email-infrastructure-roadmap.md**

- Replace `npm run dev --workspace=packages/email` → `bun run dev --workspace=packages/email`
- Replace `npm run email:dev` → `bun run email:dev`
- Any `npm install` → `bun add`
- Flag or remove Inngest references that no longer apply (migration is complete)

**Step 3: Fix claude-code-prompt-ai-tooling-audit.md**

- Replace "I use pnpm as package manager" → "I use bun as package manager"
- Replace `pnpm dev` references → `bun dev`

**Step 4: Commit**

```bash
git add docs/email-infrastructure-roadmap.md docs/research/claude-code-prompt-ai-tooling-audit.md
git commit -m "docs: fix outdated npm/pnpm references in email and audit docs"
```

---

### Task 6: Push All Changes

**Step 1: Verify all commits**

```bash
git log --oneline -6
```

Expected: 5 new commits (LICENSE, README, CONTRIBUTING, high-priority docs, medium-priority docs).

**Step 2: Push**

```bash
git push origin main
```

---

## Summary

| Task | What | Files | Commit |
|------|------|-------|--------|
| 1 | AGPLv3 LICENSE | `LICENSE` | `chore: add AGPLv3 license` |
| 2 | Full README rewrite | `README.md` | `docs: rewrite README for open source launch` |
| 3 | Contributing guide | `CONTRIBUTING.md` | `docs: add contributing guide` |
| 4 | Fix shadcn/pnpm in skills + template | 2 files | `docs: fix outdated shadcn/pnpm references...` |
| 5 | Fix npm/pnpm in email + audit docs | 2 files | `docs: fix outdated npm/pnpm references...` |
| 6 | Push everything | — | — |

**Total: 6 tasks, 5 commits, ~7 files touched.**

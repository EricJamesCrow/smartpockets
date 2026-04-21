# SmartPockets Agentic Home Page: Obra Superpowers Master Prompt

> **Author intent:** Pivot the SmartPockets home page into an agentic AI chat surface backed by Convex Agents, with generative UI for tables, cards, and charts, full Plaid coverage via the existing `@crowdevelopment/convex-plaid` component, and an extended email kit built on the existing `@convex-dev/resend` foundation. Preserve all current screens (Accounts, Transactions, Credit Card Details) as secondary navigation. Ship a working alpha in days, not months, by feeding this brief into Obra Superpowers, producing parallelizable per-workstream plans, and handing each plan to the right agent (Claude Code for structural reasoning, Codex for autonomous execution).

---

## 0. How Obra Superpowers Should Consume This Brief

This brief is the input to a four-phase Obra pipeline. Run these phases in order.

### Phase 0: Existing-State Audit (run first, always)

Before Obra writes any new specs, Workstream W0 must run. W0 produces `specs/W0-existing-state-audit.md`: a by-file, by-feature inventory of what is already built in the SmartPockets monorepo. Every subsequent spec references this document and must not re-specify anything already implemented. Missing this phase is the single biggest failure mode because the original prompt assumed a greenfield; the actual codebase is further along than described here, and specifying work that already exists wastes days of agent time.

### Phase 1: `/brainstorm` per workstream

Feed this master brief plus `specs/W0-existing-state-audit.md` to Obra. Run `/brainstorm` once per workstream (W1 through W7). Each brainstorm produces `specs/W{N}-{slug}.brainstorm.md`: open-ended exploration of approaches, risks, alternatives, and edge cases scoped to that workstream.

### Phase 2: `/plan` per workstream

For each workstream, feed the workstream section of this brief plus its brainstorm output to `/plan`. Each plan produces three files: `specs/W{N}-{slug}.md` (the authoritative spec), `specs/W{N}-{slug}.plan.md` (task-by-task implementation plan with the Plan Handoff Header from Section 7), and `specs/W{N}-{slug}.research.md` (external and local research with citations).

### Phase 3: `/execute` with handoff

The `specs/W{N}-{slug}.plan.md` file is the unit of parallel work. Each plan is self-contained enough that opening a fresh Claude Code or Codex session, pointing it at the plan file, and saying "execute this plan" is sufficient. No in-context project tour is required because the Plan Handoff Header contains every bit of context the agent needs.

### Writing constraints for every output

No em-dashes anywhere, in any spec, plan, research doc, PR description, commit message, or email copy. Use colons, parentheses, semicolons, or fresh sentences. This repo enforces the convention and Eric checks for it in review.

Every spec, plan, and research file must match the existing SmartPockets discipline: Linear milestones and issues (M3 Agentic Home is new, to be created), Graphite stacked PRs via `gt create` and `gt submit --stack`, atomic conventional commits (`feat(scope): short`), CodeRabbit as the mandatory review bot, CLAUDE.md and AGENTS.md as the governance surfaces, TODO.md as the running task list.

---

## 1. Project Context (Authoritative)

### Product

SmartPockets is an open source personal finance app built on the Cal.com model: free self-hosting under AGPLv3 plus a paid hosted tier. The repo is `github.com/EricJamesCrow/smartpockets`. Users link bank and credit card accounts via Plaid, see balances, APRs, deferred interest promotions, installment plans, and transactions. The current UI is a conventional multi-page app with Accounts, Transactions, and a statement-styled Credit Card Detail screen. The target audience is dual: credit card power users who manage 10 to 30+ cards, and general consumers seeking household financial collaboration. The competitive moat is manual-input data (promo terms, benefit usage, free trial deadlines) that Plaid cannot capture.

### Stack (verified against the repo, not the original draft)

| Category | Technology | Version / Notes |
|---|---|---|
| Framework | Next.js App Router | 16 |
| UI runtime | React | 19.1.1 (with React Compiler Babel plugin) |
| Backend | Convex + Convex Ents | convex 1.31.x, convex-ents 0.16.0 |
| Auth | Clerk | @clerk/nextjs 6.36+, Clerk Billing for subscriptions |
| Bank data | Plaid | plaid 41.0.0 via `@crowdevelopment/convex-plaid` workspace package |
| Email | React Email + Resend via `@convex-dev/resend` | @convex-dev/resend 0.2.1, @react-email/components 0.4.0, resend 6.5.2 |
| UI library | UntitledUI (paid, local files) | Components live in `packages/ui/`; icons in `@untitledui/icons` |
| Styling | Tailwind CSS | 4.x |
| Package manager | **bun** | pinned to 1.1.42 (NOT pnpm) |
| Monorepo | Turborepo | 2.7.x |
| Charts | Recharts | 3.1.x |
| Forms | react-aria + react-aria-components | latest |
| Schema validation | Zod | 4.1.x |

### Deployment (corrected)

Vercel hosts both `apps/app` (authenticated app, `app.smartpockets.com`) and `apps/web` (marketing, `www.smartpockets.com`). Convex is a managed backend, not self-hosted. There is no Railway. Plaid credentials and Clerk webhook secrets live in the Convex dashboard env vars, never in `.env.local`.

### Repo layout (verified)

```
smartpockets/
├── apps/
│   ├── app/                # Main application (Next.js 16). Dev: localhost:3000
│   └── web/                # Marketing site. Dev: localhost:3001
├── packages/
│   ├── backend/            # Convex backend (schema, functions, webhooks, crons)
│   │   └── convex/         # All Convex functions live here
│   ├── ui/                 # Shared UntitledUI wrapper components (@repo/ui)
│   ├── email/              # React Email templates (@repo/email). 22 templates exist.
│   └── convex-plaid/       # Local Plaid component. Also published as @crowdevelopment/convex-plaid@0.7.3
├── tooling/
│   └── typescript/         # Shared TS configs
└── docs/                   # Architecture notes and plans. See docs/email-infrastructure-roadmap.md
```

Path aliases: `@/*` maps to `./src/*` in `apps/app`. `@convex/*` maps to `./convex/*` in `packages/backend`. Hooks live in `apps/app/src/hooks/`, not `lib/hooks/`. The cx utility is at `@/utils/cx`.

### Convex Ents conventions (strict, enforced by AGENTS.md)

This matters for every spec that touches Convex code:

1. Import `query` and `mutation` from `./functions`, **never** from `./_generated/server`. Internal variants (`internalQuery`, `internalMutation`, `action`, `internalAction`) still come from `./_generated/server`.
2. Always include both argument validators and return validators on every public function.
3. Derive `userId` from `ctx.viewerX()` or `ctx.viewer`, **never** accept it from function args.
4. Edge traversals return read-only entities. For mutations, re-fetch via `ctx.table().getX(id)`.
5. Use cached `useQuery` from `convex-helpers/react/cache/hooks` in the client, not the default `useQuery`.
6. Call Plaid or other external APIs only from actions, not queries or mutations.
7. Trigger actions via scheduled mutations, not directly from the browser.

### Current Plaid integration state (the prompt must respect what exists)

The `@crowdevelopment/convex-plaid` workspace component at version 0.7.3 already implements: JWE encryption at rest for access tokens, webhook signature verification, circuit breaker on Plaid calls, item lifecycle (link, exchange, remove, re-consent), full transactions sync (initial and incremental), accounts, balances, and a rich liabilities surface. The denormalized `creditCards` table is populated by `syncCreditCardsAction` in `packages/backend/convex/creditCards/actions.ts`. Daily cron runs at 02:00 UTC via `syncAllActiveItemsInternal`.

Liabilities coverage in the denormalized table already includes: APR breakdown per type (purchase, cash advance, balance transfer, special), balance subject to APR, interest charge amount, deferred interest promotions with expiration date and accrued interest, installment plans (`plaidInstallmentPlans` or similar), minimum payment, last statement balance, last payment amount and date, next payment due date. There are existing client components `AprBreakdown.tsx`, `PromoTracker.tsx` that render this data today. The W4 workstream below is a targeted gap analysis and extension, not a from-zero build. W0's job is to enumerate what exists in precise detail so W4 does not re-specify it.

### Current email infrastructure state (the prompt must respect what exists)

The `@convex-dev/resend` component (0.2.1) is wired up. The `@repo/email` workspace contains 22 branded React Email templates with SmartPockets green palette, logo fallback, and responsive layouts. The Resend domain `mail.smartpockets.com` is configured, DNS pending verification in dev. `EMAIL_DOMAIN` and `RESEND_API_KEY` are set in Convex dev env vars. The previous Inngest integration has been removed in dev (still pending in prod). `docs/email-infrastructure-roadmap.md` is the canonical status doc.

W7's job is therefore: audit the 22 existing templates, identify which ones map to the seven MVP agentic emails in Section 11 below, draft new templates only for gaps, and wire the new send triggers to existing scheduled functions. W7 is not starting from scratch.

### Monorepo tooling reality

Bun 1.1.42 is the package manager. Commands that matter:

| Command | Purpose |
|---|---|
| `bun dev` | All workspaces in parallel, filtered to exclude `@crowdevelopment/convex-plaid` |
| `bun dev:app` | App only, localhost:3000 |
| `bun dev:web` | Marketing only, localhost:3001 |
| `bun dev:backend` | Convex dev with tail logs |
| `bun dev:email` | React Email preview, localhost:3003 |
| `bun build` | Full workspace build |
| `bun typecheck` | Workspace TS check |
| `bun lint` | Workspace lint |
| `cd packages/convex-plaid && bun run build` | Rebuild the local Plaid component after source changes |

### Linear milestones

M0 Foundation, M1 Credit Cards, M2 Transactions exist. Obra must create **M3 Agentic Home** and seven sub-projects mapping one-to-one to W1 through W7. W0 is a single-project audit milestone that must close before any W1 to W7 work begins.

### MCP servers (already configured in the repo, agents should use them)

Every plan handed to Claude Code or Codex assumes these MCPs are available in the local environment:

| Server | Purpose |
|---|---|
| Convex MCP (`npx convex mcp start`) | Live schema, function execution, logs, env var reads |
| Clerk MCP (`npx -y @clerk/agent-toolkit -p local-mcp`) | User and org operations |
| Plaid Sandbox MCP (`uvx mcp-server-plaid ...`) | Mock data generation, webhook simulation |
| Plaid Dashboard MCP | Live Plaid item diagnostics |
| Graphite MCP (`gt mcp`) | Stacked PR creation, navigation, submission |

Agents running an execution plan must verify these MCPs are available before starting, and the Plan Handoff Header lists which MCPs are required per plan.

---

## 2. North Star Vision

Open `app.smartpockets.com` and the home is a single agentic chat surface. The user can:

1. **Query anything about their finances in natural language.** "What did I spend on groceries last month?" "Which card has the earliest deferred interest expiration?" "Show me every Doordash charge in the last 90 days." The agent responds with generative UI: live data tables, statement cards, charts, timelines, comparison grids. Never plain text alone when structured data would serve the user better.

2. **Mutate their data via natural language.** "Recategorize all Amazon transactions as Shopping." "Mark my Chase Sapphire as my primary card." "Delete the duplicate charges from March 12." "Remind me 30 days before my Citi deferred interest promo expires." The agent proposes the change with a preview, the user confirms, the mutation executes, the audit log records it, undo is available for a configurable window.

3. **Have the agent proactively surface important events.** Deferred interest expiration countdowns, unusual spend anomalies, subscription detection, cashflow forecasts, statement closing dates, credit utilization spikes. These flow into chat as system-initiated messages and power the email system (W7).

The existing Accounts, Transactions, and Credit Card Details screens remain accessible in the sidebar as secondary navigation, for users who prefer a dense traditional UI or for operations the agent does not yet cover. They are **not** deprecated in the MVP; they are demoted from primary to secondary.

---

## 3. MVP Scope

### In scope for MVP

- Agentic chat at route `/` inside `apps/app/src/app/(app)/`
- Generative UI for: transactions table, accounts summary, credit card statement card, spend by category chart, spend over time chart, deferred interest timeline, single transaction detail card, proposal confirm card
- Agent read-path tools covering every current screen's data
- Agent write-path tools for single and bulk transaction edits, card metadata, reminders, manual promo entry
- Plaid component extended to close gaps identified in W0 and W4
- Email kit delivering the seven MVP templates below, built on the existing `@convex-dev/resend` foundation
- Undo window of 10 minutes per mutation
- Audit log of every mutation with reversal payload
- Rate limiting and per-user monthly token budget with graceful degradation

### Explicitly out of scope for MVP (followups)

Voice input/output. Multi-user shared accounts beyond Clerk Organizations we already support. Mobile native app. Investment trade execution. Bill pay. Plaid Signal, Plaid Income, Plaid Assets. LLM fine-tuning. Full conversation history search UI (history is stored, search surface is deferred).

### Must not regress

Clerk auth flows. Existing Convex schema. Plaid component security properties. Existing Accounts, Transactions, Credit Card Detail routes at their current paths. The `@crowdevelopment/convex-plaid` npm publish pipeline.

---

## 4. Architecture Overview (Five Layers)

Every spec respects this partition:

1. **Chat UI layer** (Next.js, `apps/app`, Untitled UI AI chatbot template ported in). Renders messages, streams tool invocations, dispatches tool results to the generative UI registry, handles confirmation cards for mutations. Uses `useChat` from the Vercel AI SDK or current canonical hook (W1 confirms the version at spec time).

2. **Agent orchestration layer** (`@convex-dev/agent` inside `packages/backend/convex/agent/`). Owns the thread, tool registry, system prompt, retrieval context, token budget, streaming. Each user turn flows through a Convex HTTP action that creates or retrieves a thread, runs the agent, and streams tool calls plus results back to the UI.

3. **Tool layer** (Convex queries, mutations, actions in `packages/backend/convex/agent/tools/`). Each tool is a typed Convex function with a Zod schema, an auth check via `ctx.viewerX()`, and a rate limit bucket. Partitioned into read tools, propose tools (read-only mutation previews), execute tools (actual writes), and compound tools (long-running actions).

4. **Plaid integration layer** (`@crowdevelopment/convex-plaid`, extended in W4). All Plaid API calls, token lifecycle, webhook handlers, sync state machines, and normalization into Convex tables. Exposes a clean internal API to the tool layer via `plaidComponent.ts` wrappers.

5. **Email and notification layer** (`@convex-dev/resend` plus `@repo/email` plus scheduled functions in `packages/backend/convex/crons.ts` and `packages/backend/convex/notifications/`). Evaluates triggers, enqueues sends, respects preferences, honors idempotency.

### Cross-cutting decisions every spec must address

- Identity propagation from Clerk into the Convex HTTP action into the Agent into tools. Use `ctx.viewerX()` inside tools, which the Clerk-Convex integration makes available.
- System prompt versioning. Store in `packages/backend/convex/agent/system.ts` with a `PROMPT_VERSION` const and a `prompt_versions` Ents table that records which version ran on which thread.
- Token budgets: per-user monthly cap, per-thread cap, per-tool-call cap. Enforced in the Agent wrapper.
- Mutation confirmation state machine: `proposed` → `awaiting_confirmation` → (`confirmed` → `executed` | `cancelled` | `timed_out`). Survives page reloads.
- Undo window: executed mutations write a reversal payload to the audit log with a 10-minute TTL on undo eligibility.

---

## 5. External Dependencies the Agent Must Know About

Two critical source directories live **outside** the monorepo. Any plan touching W1 or W3 must either port components in, or instruct the agent on how to reference them.

| Path | What it is | How to use |
|---|---|---|
| `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui` | Untitled UI's AI chatbot template (reference implementation) | Port relevant components into `packages/ui/` (or `apps/app/src/components/chat/`) as new wrapper components. Do not vendor the whole template; extract the parts SmartPockets uses. |
| `/Users/itsjusteric/CrowDevelopment/Templates/untitledui` | Full Untitled UI component library (paid, licensed) | Reference for components that are not yet in `packages/ui/`. When W1 or W3 needs a new primitive, pull the implementation from here and adapt it to SmartPockets' conventions. |

The Plan Handoff Header of any W1 or W3 plan must explicitly note which external paths the executing agent needs read access to. Claude Code in particular handles this cleanly because it respects `--add-dir` or similar flags; Codex agents may need the files copied into the repo first.

---

## 6. Agent Delegation Framework

Eric runs both Claude Code and Codex. Plans pick the right tool per task. The rules below mirror the empirical patterns from Eric's prior deep research (summarized: Claude Code is the architect, Codex is the executor).

### When to pick Claude Code

- Multi-file architectural reasoning (new Convex schema, new agent tool contracts, new component APIs crossing 3+ files)
- New-feature scaffolding where the shape is still fluid
- Code review of Codex output before merge
- Work that benefits from a 1M-token context window (large refactors, reading a whole directory at once)
- Interactive pair programming in Plan Mode
- Anything touching `ctx.viewerX()`, Clerk-Convex identity flow, or auth-sensitive mutations
- Anything involving webhook signature verification, JWE encryption, circuit breaker, or other security-critical paths

### When to pick Codex

- Well-specified execution of a Claude Code plan (the plan says exactly what to do, Codex implements)
- Test writing and test-running loops (unit tests, Convex test harness, Vitest for `packages/convex-plaid`)
- Boilerplate generation (new Ents schema table with CRUD, new React Email template, new tool scaffold following an existing pattern)
- Long-running autonomous work where Eric walks away (bulk UI component extraction, large file renames)
- PR review (practitioners rate Codex highest for this)
- Parallel work across independent branches in separate git worktrees

### Plan-level tagging

Every task in every `specs/W{N}-{slug}.plan.md` must carry a recommended agent tag:

```
- [ ] Task: Implement propose_bulk_transaction_update mutation handler
  Recommended agent: **Codex** (well-specified CRUD, tests included in scope)
  Rationale: Plan fully specifies input/output schema, test cases enumerated, no auth ambiguity.
```

Or:

```
- [ ] Task: Design the Convex Agent system prompt and tool registry contract
  Recommended agent: **Claude Code** (architectural reasoning, multi-file, cross-cutting)
  Rationale: Touches agent orchestration, UI rendering protocol, and tool auth layer; benefits from multi-file context.
```

### Session-level tagging

Each `specs/W{N}-{slug}.plan.md` header also declares a primary agent for the workstream, so when Eric opens a worktree, the filename tells him which tool to launch:

- W0 Existing-State Audit: Claude Code (deep read across the repo)
- W1 Chat UI: Claude Code for scaffolding, Codex for component extraction once patterns are set
- W2 Agent backend: Claude Code (tool contracts and system prompt are architectural)
- W3 Generative UI protocol: Claude Code for the protocol, Codex for the component set once the dispatcher is in place
- W4 Plaid extension: Claude Code for the gap analysis and schema changes, Codex for webhook handler boilerplate
- W5 Mutation tools: Claude Code for the proposal pattern, Codex for the per-tool implementation once the base wrapper exists
- W6 Intelligence features: mixed; Claude Code designs algorithms, Codex ships scheduled functions
- W7 Email system: Codex-heavy (templates are well-specified once copy is drafted); Claude Code reviews the send pipeline

### Cost discipline

Planning, architecture discussion, and spec writing happen in Claude.ai (Max plan) or Obra Superpowers' /brainstorm and /plan commands, not in Claude Code. Execution (the actual implementation work) is the only time agents consume paid terminal tokens. This keeps the multi-day run affordable.

---

## 7. Plan Handoff Protocol

Every `specs/W{N}-{slug}.plan.md` opens with a Plan Handoff Header. The header is the contract between the planning phase and the execution phase. When Eric opens a fresh Claude Code or Codex session in a worktree, points it at the plan file, and says "execute this plan," the header tells the agent everything it needs.

### Required header format

```markdown
# W{N}: {Workstream title}

## Plan Handoff Header

| Field | Value |
|---|---|
| Linear milestone | M3 Agentic Home |
| Linear sub-project | W{N} {slug} |
| Linear issues | LIN-XXX, LIN-YYY (create up-front, one per task) |
| Recommended primary agent | Claude Code / Codex |
| Required MCP servers | Convex, Clerk, Graphite (+ any others) |
| Required read access | /Users/itsjusteric/CrowDevelopment/Templates/... (if applicable) |
| Prerequisite plans (must be merged) | W{M}, W{K} |
| Branch | feat/agentic-home/W{N}-{slug} |
| Graphite stack parent | feat/agentic-home/W{M}-{slug} (or main if W{N} is root) |
| Worktree directory | ~/Developer/smartpockets-W{N}-{slug} |
| Estimated PRs in stack | X |
| Review bot | CodeRabbit (mandatory pass) |
| Rollback plan | How to revert this plan if something goes wrong |
| Acceptance checklist | See bottom of this file |

## Context bootstrap (for fresh agent sessions)

Before starting, the agent must:
1. Read `AGENTS.md` and `CLAUDE.md` in the repo root.
2. Read `specs/W0-existing-state-audit.md` for current codebase state.
3. Read `specs/W{N}-{slug}.md` for the authoritative spec.
4. Read this file (`specs/W{N}-{slug}.plan.md`) top to bottom.
5. Read `specs/W{N}-{slug}.research.md` for research findings.
6. Run `git fetch origin` and confirm the worktree is on the correct branch.
7. Verify required MCP servers respond.
```

The rest of the plan is the task list, each task carrying a recommended-agent tag (Section 6), acceptance criteria, test steps, and an explicit Graphite command sequence.

### Task format inside the plan

```markdown
### Task W{N}.{task_id}: {short title}

**Recommended agent:** Claude Code / Codex
**Rationale:** ...
**Linear issue:** LIN-XXX

**Scope:**
- File(s) touched: ...
- Acceptance: ...

**Steps:**
1. ...
2. ...

**Test:**
- `bun typecheck` passes
- New unit test at path X covers case Y
- Manual smoke test: ...

**Commit:**
```bash
gt create feat/agentic-home/W{N}-{task_id} -m "feat(agent): propose bulk transaction update"
```

**Acceptance checklist:**
- [ ] Typecheck passes
- [ ] Tests pass
- [ ] CodeRabbit clean
- [ ] Reviewed by Claude Code (if implemented by Codex) or Codex (if implemented by Claude Code)
```

The cross-review step in the acceptance checklist implements Pattern 2 from Eric's prior research (Claude builds, Codex reviews, or vice versa) without adding a separate spec.

---

## 8. Workstream Briefs

### W0: Existing-State Audit and Foundation (NEW, MANDATORY FIRST)

**Goal.** Produce `specs/W0-existing-state-audit.md`: a precise, by-file, by-feature inventory of everything relevant to W1 through W7 that is already built. No new code. No speculation. Every subsequent workstream cites this document.

**Recommended primary agent.** Claude Code (multi-file read, synthesis).

**Inputs.** The entire SmartPockets repo at `/Users/itsjusteric/Developer/smartpockets`.

**Audit targets (enumerate each with file paths and summaries):**

1. **Convex schema.** Every Ents table, every index, every edge. Current schema diff from what W4 and W5 will add.
2. **`@crowdevelopment/convex-plaid` component.** Every exported function, every webhook handler, every Plaid API endpoint consumed, every table owned. Identify explicit gaps for W4.
3. **Credit card denormalization.** `packages/backend/convex/creditCards/` every mutation, query, action. What data shapes already render in `AprBreakdown.tsx`, `PromoTracker.tsx`, and the statement-style detail card.
4. **Transactions code.** Every query and component that touches `plaid:plaidTransactions`. What filters, sorts, and views exist.
5. **Email infrastructure.** `packages/email/emails/` all 22 templates with names and purposes. `@convex-dev/resend` wiring. Current trigger events. The `docs/email-infrastructure-roadmap.md` status.
6. **Scheduled functions.** `packages/backend/convex/crons.ts` current cadences and handlers.
7. **Webhook handlers.** `packages/backend/convex/http.ts` current routes.
8. **Auth and identity.** How `ctx.viewerX()` is wired, Clerk JWT template, Convex integration version.
9. **Routing.** `apps/app/src/app/(app)/` current routes. What lives at `/`, `/accounts`, `/cards`, `/cards/[id]`, `/transactions`, `/settings/*`. What's in `apps/web`.
10. **UntitledUI components in `packages/ui/`.** What's wrapped, what's not, what the existing chat template would need that is missing.
11. **AI dependencies.** Whether `@convex-dev/agent`, `ai` (Vercel AI SDK), `@convex-dev/rag` are installed. Current versions of anything AI-adjacent.
12. **TODO.md state.** Which items are completed, which are blocked, which are out of scope for M3.

**Deliverable:** `specs/W0-existing-state-audit.md` plus a gap matrix at the top of the file showing, per workstream W1 to W7, what's done, what's partial, and what's new.

---

### W1: Agentic Chat Home Page (UI layer)

**Goal.** Replace the current `/` route in `apps/app/src/app/(app)/` with the agentic chat surface, consuming a ported version of the Untitled UI AI chatbot template as the base component kit. Preserve all other routes.

**Recommended primary agent.** Claude Code for scaffolding and protocol integration; Codex for component extraction once the pattern is set.

**Inputs.** Untitled UI AI chatbot template at `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui`. Full Untitled UI library at `/Users/itsjusteric/CrowDevelopment/Templates/untitledui`. Existing `apps/app` shell (sidebar, top nav, Clerk user menu). Existing `/` content (to be relocated).

**Target state.**

- New `/` renders the chat surface. Prior home content moves to `/overview` (or similar; W0 and the spec decide together). All deep links redirect.
- AI SDK version confirmed at spec time. `useChat` (or the canonical successor hook) wired to a Convex HTTP action at `/api/agent/chat` (actually a Convex HTTP endpoint, not a Next.js route, per Convex-first policy).
- Messages stream. Tool calls render with per-tool loading placeholders. Tool results transition to their generative UI component via the W3 dispatcher.
- Mutation proposals render as a dedicated generative UI card with explicit Confirm and Cancel buttons. The chat input is never the confirmation surface.
- Thread list sidebar, new-thread button, thread rename, thread delete (soft). Threads persist in Convex, scoped to `ctx.viewerX()`.
- Sidebar preserves links to Accounts, Transactions, Credit Card Details; the sidebar highlights Home on the chat surface.
- Keyboard: Cmd+K for new thread, Cmd+/ for thread switcher, Enter to send, Shift+Enter for newline, Escape to cancel a proposal.
- Mobile responsive (the chatbot template handles most of this; validate against the SmartPockets shell).
- Error UX: tool failure (inline error row), rate limit hit (banner), token budget exhausted (banner with upgrade hint), Plaid re-consent required (modal that links to settings).
- Accessibility: keyboard navigation of generative UI, screen reader friendly streaming content, focus management after proposal confirmation.

**Questions the spec must answer.**

1. Exact file tree before and after, including every moved file.
2. AI SDK version, hook name, streaming protocol.
3. How tool-call streaming works: placeholder rendering, transition to final component, error transitions.
4. Confirmation card contract: what `ProposalConfirmCard` receives, how Confirm and Cancel propagate to the agent.
5. Keyboard shortcut map and how it avoids conflicts with UntitledUI components.
6. How deep links to old home content redirect.
7. Integration with existing Clerk user menu and theme provider.
8. SSR/RSC split: the chat page is a client component; what wraps it as RSC.

**Deliverables.** Spec, plan, research, plus a before/after file tree and a streaming UX state machine diagram.

---

### W2: Convex Agent Backend (orchestration)

**Goal.** Stand up `@convex-dev/agent`. Deliver thread management, system prompt, tool registry, auth propagation, token budgets, streaming, and cost visibility.

**Recommended primary agent.** Claude Code (architectural, multi-file, auth-sensitive).

**Inputs.** Existing Convex deployment. Clerk integration. `ctx.viewerX()`. Existing schema.

**Target state.**

- `@convex-dev/agent` installed at a version confirmed by W2 research. Configured in `packages/backend/convex/agent/config.ts`.
- One thread per chat, persisted in a new `agentThreads` Ents table, scoped to user via edge to `users`.
- Messages table `agentMessages` with a `toolCallsJson` column. Tool-call outputs are stored for replay and audit.
- Proposals table `agentProposals` with the state machine from Section 4. TTL via scheduled cleanup.
- System prompt versioned in code at `packages/backend/convex/agent/system.ts` with `PROMPT_VERSION` const. `promptVersions` Ents table records which version ran on which thread.
- Retrieval context sent on each turn: user account list, card count, active promo count, open proposals. Lives in the prompt prefix, not RAG, for latency.
- Decision on Convex RAG (`@convex-dev/rag`): MVP or followup. If MVP, transaction descriptions and merchants are the index. Spec justifies.
- Token budgets: monthly per-user cap, thread cap, tool-call cap. Enforced in the tool wrapper. Graceful degradation UX.
- Conversation summary compaction when thread exceeds a threshold (use whatever the current `@convex-dev/agent` primitive is).
- Model: `claude-sonnet-4-20250514` default (already in `.env.example` as `AI_DEFAULT_MODEL`). Fallback to Haiku for classification subtasks.
- Cost observability: per-user monthly spend logged to `agentUsage` Ents table; admin query.

**Canonical MVP tool registry (spec confirms exact names and schemas):**

Read tools: `list_accounts`, `get_account_detail`, `list_transactions`, `get_transaction_detail`, `list_credit_cards`, `get_credit_card_detail`, `list_deferred_interest_promos`, `list_installment_plans`, `get_spend_by_category`, `get_spend_over_time`, `get_upcoming_statements`, `list_reminders`, `search_merchants`.

Propose tools: `propose_transaction_update`, `propose_bulk_transaction_update`, `propose_credit_card_metadata_update`, `propose_manual_promo`, `propose_reminder_create`, `propose_reminder_delete`.

Execute / cancel: `execute_confirmed_proposal`, `cancel_proposal`.

Plaid: `trigger_plaid_resync`.

Questions the spec must answer include: exact Convex Agent version, Clerk identity propagation verification inside agent tool calls, full system prompt draft, token budget numbers, RAG decision, thread persistence schema, streaming protocol between the Agent and the HTTP action, circuit breaker behavior when the LLM provider is down, model selection config.

**Deliverables.** Spec, plan, research. Agent config file draft. Full tool registry table with schemas. System prompt draft. Token budget policy doc. Schema additions for `agentThreads`, `agentMessages`, `agentProposals`, `agentUsage`, `promptVersions`.

---

### W3: Generative UI Protocol and Component Library

**Goal.** Define how tool results become rendered React components inside chat. Build the MVP component set.

**Recommended primary agent.** Claude Code for the protocol, Codex for the component set once the dispatcher is stable.

**Inputs.** `packages/ui/` existing components, `AprBreakdown.tsx`, `PromoTracker.tsx`, the statement-style card, the existing transactions table patterns (from W0 audit), Recharts 3.x.

**Target state.**

- Each tool output schema maps to exactly one React component via a registry at `apps/app/src/components/chat/tool-results/index.ts`.
- A `ToolResultRenderer` dispatcher takes `(toolName, result, streamingState)` and renders the matching component with a skeleton when `streamingState === 'loading'`.
- Every generative component is interactive: tables are sortable and filterable, rows are clickable (drill-in calls `sendPrompt(structuredPrompt)` which triggers a new agent turn), cards have actions (Edit, Add Note, Set Reminder) that feed back to the agent as a new user turn.
- Components use **reactive Convex queries** with `useQuery` cached hooks from `convex-helpers`, not just the static tool payload, so the UI stays live if data changes elsewhere. The tool result carries the ID-set to query over.
- Components inherit Untitled UI tokens and work in light and dark mode.

**MVP component set.**

- `TransactionsTable`
- `TransactionDetailCard`
- `AccountsSummary`
- `CreditCardStatementCard` (reuse existing statement-style card; wrap to accept a card ID and render live)
- `SpendByCategoryChart`
- `SpendOverTimeChart`
- `DeferredInterestTimeline`
- `InstallmentPlansList`
- `RemindersList`
- `ProposalConfirmCard` with diff visualization
- `RawTextMessage` fallback

**Questions the spec must answer.** Where the registry lives. How drill-ins call `sendPrompt`. How `ProposalConfirmCard` renders the diff (before/after columns, highlighted deltas). Server vs client component split. Theming verification.

**Deliverables.** Spec, plan, research. Component-to-tool mapping table. Storybook or preview harness for every component.

---

### W4: Plaid Component Gap Closure

**Goal.** Targeted extension of `@crowdevelopment/convex-plaid` to close gaps identified by W0 for the MVP's full-coverage ask.

**Recommended primary agent.** Claude Code for gap analysis and schema changes, Codex for webhook handler boilerplate once patterns are set.

**Inputs.** `packages/convex-plaid/` at 0.7.3, W0 gap matrix, Plaid API reference.

**Target state.**

- **Gap analysis first.** W0 gives the baseline. W4's research doc confirms or refines per every Plaid product and webhook type.
- **Liabilities detail: verify full coverage.** If W0 confirms everything is already in place, W4 is lighter and focuses on webhook completeness.
- **Webhook surface completeness.** Verify handlers exist for every webhook Plaid sends: `TRANSACTIONS_SYNC_UPDATES_AVAILABLE`, `DEFAULT_UPDATE`, `HISTORICAL_UPDATE`, `INITIAL_UPDATE`, `LIABILITIES_DEFAULT_UPDATE`, `ITEM_ERROR`, `PENDING_EXPIRATION`, `USER_PERMISSION_REVOKED`, `NEW_ACCOUNTS_AVAILABLE`, `WEBHOOK_UPDATE_ACKNOWLEDGED`. Investments webhooks (`HOLDINGS_DEFAULT_UPDATE`, `INVESTMENTS_TRANSACTIONS_DEFAULT_UPDATE`) only if W4 decides investments are in MVP.
- **Investments coverage decision.** MVP or followup. If MVP, holdings and investment transactions. Spec justifies.
- **Identity coverage** for display name consistency. Small lift.
- **Item lifecycle resilience.** Confirm re-consent (`ITEM_LOGIN_REQUIRED`, `PENDING_EXPIRATION`), update mode, item removal with cascade are all covered.
- **Institution metadata caching** audit. Add if missing.
- **Sync state machine** exposed to UI via a Convex query: `syncing | ready | error | re-consent-required` per item.
- **Error taxonomy.** Every Plaid error code maps to a user-facing message and a recommended next action.
- **Published package decision.** Spec recommends either continuing with `workspace:*` consumption (current) or migrating to npm consumption with a `workspace:*` dev override. Rationale required.
- **Test fixture strategy.** Plaid Sandbox usage, recorded webhook payloads, `convex-test` harness.

**Questions the spec must answer.** Full coverage matrix. Full webhook handler matrix. Sync state machine states and transitions. Re-consent UX. Backward compatibility plan. Test plan.

**Deliverables.** Spec, plan, research. Gap analysis table. Schema diff. Webhook handler registry. Migration plan if any change is breaking.

---

### W5: Mutation and Bulk Edit Tools

**Goal.** Build the write-path tool set with propose, confirm, execute, audit, and undo.

**Recommended primary agent.** Claude Code for the base pattern, Codex for per-tool implementation.

**Inputs.** W2 tool registry skeleton, W3 `ProposalConfirmCard`, existing card and transaction mutations.

**Target state.**

- Every write tool follows the `propose → execute_confirmed_proposal → undo` pattern.
- Bulk proposals include affected count, sample of first 5 and last 5 rows, per-row diff, total scope.
- Chunked execution for large bulk proposals via a Convex action that fans out to internal mutations of 500 rows each.
- `auditLog` Ents table: userId, threadId, proposalId, toolName, inputArgsJson, affectedIdsJson, executedAt, reversalPayloadJson, reversedAt (nullable).
- Undo: `execute_confirmed_proposal` returns a reversal token; `undo_mutation(reversalToken)` within 10 minutes applies the reversal.
- Stricter rate limits on write tools than read tools.
- First-turn rule: in a new thread, the agent cannot call a write tool without having made at least one read call (prevents adversarial cold-start prompts from executing mutations).

**Supported mutation types at MVP.**

Transactions: category, subcategory, tags, notes, split into multiple, merge duplicates, soft delete.
Credit cards: nickname, primary flag, custom APR override (already exists per W0; wrap it as a tool), manual promo entry/edit.
Reminders: CRUD.
Plaid item: trigger manual re-sync; remove item (hard; double confirmation).

**Questions the spec must answer.** Exact proposal schema. Audit log schema. Reversal payload format per mutation type. TTL numbers. Idempotency keys. Concurrency (what if the same proposal is confirmed twice). Authorization (same user, same thread). Cascade rules. Optimistic UI behavior.

**Deliverables.** Spec, plan, research. Write tool base wrapper. Audit log schema and queries. Undo implementation with per-mutation reversal builders. Test plan covering concurrency, idempotency, adversarial inputs.

---

### W6: Intelligence Features

**Goal.** Proactive and analytical capabilities: promo countdowns, statement reminders, anomaly detection, subscription detection, cashflow forecasting.

**Recommended primary agent.** Mixed. Claude Code designs the algorithms; Codex ships the scheduled functions.

**Inputs.** W4 liabilities data, W2 tool registry, W7 email fan-out.

**Target state.**

- **Promo countdown tracker.** Daily cron computes `daysToExpiration` for every active promo, writes to `promoCountdowns` denormalized table. `list_deferred_interest_promos` reads this. Emails fire at 30, 14, 7, 1 days.
- **Statement closing reminders.** Daily cron; fires at 3 and 1 days before closing.
- **Anomaly detection.** MVP heuristic: transaction > 3x 90-day rolling average for that merchant, or new merchant > configurable threshold. Writes to `anomalies` table. Agent surfaces proactively on next user turn. Email digest includes.
- **Subscription detection.** Identify recurring charges (same merchant fuzzy match, same amount +/- tolerance, similar interval, 3+ occurrences). Flag as likely subscription. User confirms or dismisses via the agent.
- **Cashflow forecast (lightweight MVP).** Next 30 days projected net cash from: known statement due dates, detected subscriptions, average income and spend. Good enough for "do I have enough to cover my Amex bill due the 22nd."

**Questions the spec must answer.** Promo expiration field of record (Plaid liabilities fallback logic). Anomaly thresholds and false-positive mitigation. Subscription algorithm (fuzzy merchant normalization, interval tolerance). Forecast horizon and method. Which features are agent-surfaced vs email-only vs both. Scheduled function cadences and batching for cost.

**Deliverables.** Spec, plan, research. Intelligence feature catalog. Scheduled function plan. Denormalized tables for fast agent reads.

---

### W7: Email System Extension

**Goal.** Extend the existing `@convex-dev/resend` plus React Email foundation with the MVP agentic-home email set. The audit from W0 is the baseline; W7 fills gaps, does not rebuild.

**Recommended primary agent.** Codex-heavy. Claude Code reviews the send pipeline changes.

**Inputs.** `packages/email/emails/` 22 existing templates. `@convex-dev/resend` wiring. `docs/email-infrastructure-roadmap.md`. Clerk user email via Clerk-Convex integration. W6 trigger events.

**Target state.**

- **Template set for MVP (new or adapted).**
  - Welcome (on first Clerk user creation or first Plaid item link)
  - Weekly digest (every Sunday: top spend, anomalies, upcoming bills, promo countdowns, free trials expiring)
  - Deferred interest promo expiration warning (30, 14, 7, 1 day variants)
  - Statement closing reminder (3, 1 day variants)
  - Anomaly alert (immediate, batched within a 15-minute window)
  - Plaid re-consent required (immediate)
  - Item error persistent (24 hours of failure)
- **Preferences.** `notificationPreferences` Ents table: one boolean per template type plus master unsubscribe. Preferences page at `/settings/notifications`. One-click unsubscribe in every email (RFC 8058 if Resend supports it; CAN-SPAM minimum always).
- **Send pipeline.** Scheduled or triggered action enqueues a send; a dedicated Convex action calls the Resend API; success and failure log to `emailEvents` table; retries with exponential backoff max 3; idempotency via content hash key.
- **Dev mode.** Route sends to a fixed test address or to a Convex table instead of hitting Resend.
- **Copy quality.** All drafted and reviewed. Plain, direct, useful. No marketing tone. No em-dashes.
- **Observability.** Open and click tracking if Resend supports it. Bounce and complaint handling.
- **Remaining TODO.md email items.** Production env vars migration, Inngest cleanup in prod, logo hosting and `logoUrl` in `email-config.ts`, webhook secret setup, end-to-end tests for each template.

**Questions the spec must answer.** Full audit of existing 22 templates (reconciled with W0). Template list confirmation. Copy drafts. Preferences schema and UI. Send pipeline diagram. Idempotency strategy. Unsubscribe compliance. Bounce and complaint handling.

**Deliverables.** Spec, plan, research. Template catalog reconciled with existing 22. Preferences implementation plan. Send pipeline diff. Dev-mode testing doc. Draft every new template body as `packages/email/emails/drafts/{name}.draft.md` for Eric to review before Codex codes them.

---

## 9. Research Tasks

Obra must run these in the W0/Phase 0 sweep. Each finding appears in the corresponding workstream's research file with sources.

1. **`@convex-dev/agent` current API.** Version, supported models, streaming semantics, tool definition format, thread persistence primitives, context window management. Sources: Convex docs, `convex-dev/agent` GitHub.
2. **`@convex-dev/rag` maturity.** Latency, cost, whether MVP-worthy. Sources: Convex docs.
3. **Vercel AI SDK current stable.** Canonical pattern for tool-call-driven React rendering, streaming tool results, per-tool-name component dispatch. Sources: AI SDK docs.
4. **Plaid product and webhook inventory.** Full endpoint list and payload shapes. Sources: Plaid API reference.
5. **Plaid liabilities deferred interest fields.** Exact `/liabilities/get` schema for credit cards including APR variants and deferred interest indicators. Reconcile against what the current `@crowdevelopment/convex-plaid` stores. Sources: Plaid liabilities docs plus Sandbox inspection.
6. **Untitled UI AI chatbot template inventory.** Open `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui`, enumerate top-level components, AI SDK integration points, styling assumptions.
7. **Existing SmartPockets email foundation.** Enumerate `packages/email/emails/` 22 templates, trigger points, `@convex-dev/resend` version and API surface.
8. **Clerk-Convex identity in agent tool calls.** Confirm `ctx.viewerX()` works inside `@convex-dev/agent` tool handlers. Sources: Clerk docs, Convex docs, Clerk-Convex integration docs.
9. **Convex workflow component.** `@convex-dev/workflow` for long-running mutation orchestration (bulk transactions, Plaid resync). Sources: Convex docs.
10. **AI cost benchmarks.** Per-conversation token cost at MVP scope on `claude-sonnet-4-20250514`. Sources: Anthropic pricing.
11. **Resend list-unsubscribe and bounce handling.** Confirm current capability and migration path if upgrade needed. Sources: Resend docs.

---

## 10. Deliverables Index

Per workstream:

- `specs/W{N}-{slug}.md` (spec)
- `specs/W{N}-{slug}.plan.md` (task breakdown with Plan Handoff Header)
- `specs/W{N}-{slug}.research.md` (findings with citations)
- `specs/W{N}-{slug}.brainstorm.md` (from `/brainstorm` phase; archived but retained)

Cross-cutting:

- `specs/00-architecture.md` (overall architecture, cross-workstream decisions)
- `specs/00-parallelization.md` (dependency graph, execution plan, worktree setup script)
- `specs/00-mvp-acceptance.md` (Section 13 turned into a checklist)
- `specs/00-agent-delegation.md` (Section 6 as a quick-reference for anyone picking up a plan)
- `specs/W0-existing-state-audit.md` (mandatory Phase 0 output)

Every spec ends with a "Questions This Spec Answered" section that matches one-to-one to the workstream's "Questions the spec must answer" list in this brief.

---

## 11. Parallel Execution Plan

### Dependency graph

- **W0** blocks everything.
- **W4** and **W2** are the backbone. W4 research and W2 research can run in parallel once W0 is done.
- **W1** depends on W2's HTTP action contract and W3's registry contract.
- **W3** depends on W2's tool registry shape.
- **W5** depends on W4's schema and W2's tool registry.
- **W6** depends on W4's liabilities data and W7's email triggers.
- **W7** depends on W6 for trigger events; the email foundation audit piece is self-contained.

### Recommended execution phases

| Phase | Parallel tracks |
|---|---|
| 0 (audit) | W0 (Claude Code, solo) |
| 1 (research) | W2, W4, W7 email audit, plus research Task batch |
| 2 (specs, round 1) | `00-architecture.md`, W1, W2, W3, W4 specs |
| 3 (specs, round 2) | W5, W6, W7 specs + `00-parallelization.md`, `00-mvp-acceptance.md`, `00-agent-delegation.md` |
| 4 (implementation) | Parallel worktrees via Graphite stacked PRs |

### Implementation-phase track map

| Track | Workstream | Primary agent | Depends on |
|---|---|---|---|
| A | W4 schema and webhook gap closure | Claude Code + Codex | W0 |
| B | W2 agent scaffolding and tool registry | Claude Code | W0 |
| C | W1 route plus W3 component shells | Claude Code + Codex | B (contract) |
| D | W5 mutation tools | Claude Code (pattern) + Codex (per-tool) | A, B |
| E | W6 intelligence scheduled functions | Claude Code + Codex | A |
| F | W7 email templates and pipeline | Codex + Claude Code (review) | E (triggers), self-contained audit |

Each track is a Linear sub-project under M3 Agentic Home. Each track is a Graphite stack anchored at `main`. Within a track, every PR is ~200 to 400 lines changed.

### Worktree setup (Obra generates `specs/00-worktree-setup.md` as a runnable script)

```bash
# From ~/Developer/smartpockets on main, up to date with origin/main

# W0 audit (single worktree)
git worktree add ~/Developer/smartpockets-W0-audit -b feat/agentic-home/W0-existing-state-audit

# Track A (Plaid gaps)
git worktree add ~/Developer/smartpockets-W4-plaid -b feat/agentic-home/W4-plaid-gap-closure

# Track B (Agent backend)
git worktree add ~/Developer/smartpockets-W2-agent -b feat/agentic-home/W2-agent-backend

# Track C (UI + generative UI)
git worktree add ~/Developer/smartpockets-W1-chat -b feat/agentic-home/W1-chat-home
git worktree add ~/Developer/smartpockets-W3-genui -b feat/agentic-home/W3-generative-ui

# Track D (Mutations)
git worktree add ~/Developer/smartpockets-W5-mutations -b feat/agentic-home/W5-mutations

# Track E (Intelligence)
git worktree add ~/Developer/smartpockets-W6-intel -b feat/agentic-home/W6-intelligence

# Track F (Email)
git worktree add ~/Developer/smartpockets-W7-email -b feat/agentic-home/W7-email

# Each worktree: bun install, then start the right agent
# Track A: cd ~/Developer/smartpockets-W4-plaid && claude
# Track D: cd ~/Developer/smartpockets-W5-mutations && codex
# etc.
```

Each worktree gets its own `.env.local` (symlinked or copied from the main checkout). For Convex, use **Convex Agent Mode** (`CONVEX_AGENT_MODE=anonymous`) in any worktree that Codex runs in, to provision a fresh backend that does not collide with the main dev deployment.

### Cross-review rule

When Claude Code lands a PR, queue Codex as the code reviewer. When Codex lands a PR, queue Claude Code as the reviewer. CodeRabbit reviews everything. A PR is not mergeable until: typecheck passes, tests pass, cross-agent review is clean, CodeRabbit is clean, Eric approves.

---

## 12. MVP Acceptance Criteria

The MVP is shippable when:

1. Navigating to `/` loads the agentic chat surface. Previous home content is at its new route with deep-link redirects.
2. A new user links a Plaid item and within 60 seconds the agent can answer "what accounts do I have" accurately.
3. The agent can render every MVP generative UI component from W3 in response to an appropriately phrased user query.
4. The agent can propose, preview, and execute every mutation type in W5, with undo functional within 10 minutes.
5. The audit log contains a row for every executed mutation with a reversal payload.
6. The daily scheduled function writes promo countdowns; `list_deferred_interest_promos` returns accurate days-to-expiration.
7. All seven MVP emails from W7 render, send in dev, respect per-user preferences, honor unsubscribe.
8. Rate limits and token budgets trigger graceful degradation (load test verifies).
9. Plaid security properties preserved: JWE at rest, webhook verification, circuit breaker engages under simulated outage.
10. CodeRabbit passes on every PR. Graphite stack lands cleanly. Linear M3 milestone closes.
11. Existing Accounts, Transactions, Credit Card Details routes still load and match pre-pivot behavior.
12. `bun typecheck` passes across all workspaces.
13. `bun build` succeeds for both `apps/app` and `apps/web`.

---

## 13. Guardrails and Non-Goals

- Do not migrate away from Convex, Clerk, or Plaid.
- Do not replace Untitled UI; extend it by porting the chatbot template.
- Do not rewrite the existing credit card statement card; wrap it in `CreditCardStatementCard`.
- Do not rebuild the email foundation; extend it. All new templates live alongside the existing 22 in `packages/email/emails/`.
- Do not remove the `@crowdevelopment/convex-plaid` npm publish pipeline.
- Do not fine-tune a model; use the Anthropic API via AI SDK.
- Do not add voice, mobile native, bill pay, trade execution, Plaid Signal/Income/Assets in MVP.
- Do not regress any existing test.
- Do not introduce a Next.js API route; Convex HTTP actions only.
- Do not accept `userId` in function args; always derive from `ctx.viewerX()`.
- Do not import `query` or `mutation` from `./_generated/server`; use `./functions`.
- Do not use `export const dynamic = "force-dynamic"`; investigate root cause.
- Do not use raw `git push` for feature work; use Graphite `gt submit --stack`.
- Do not introduce em-dashes anywhere, in any output: specs, plans, code comments, email copy, PR descriptions, commit messages.

---

## 14. Appendix A: Standalone Email Workstream Prompt (W7, self-contained)

Use this seed if you want to hand W7 to its own Obra session independently.

> **Task.** Extend the SmartPockets email system with seven MVP templates for the agentic home pivot. SmartPockets is a Next.js 16 + Convex + Clerk + Plaid fintech app. The email foundation already exists: `@convex-dev/resend` 0.2.1 is wired up, `packages/email/emails/` contains 22 branded React Email templates, Resend domain `mail.smartpockets.com` is configured. Clerk owns user email addresses via the Clerk-Convex integration. Convex scheduled functions produce trigger events for promo countdowns, statement closings, anomalies, Plaid re-consent, and weekly digests.
>
> **Deliverables.**
>
> 1. Reconciliation audit of the 22 existing templates against the seven MVP asks: Welcome, Weekly Digest, Deferred Interest Warning (30/14/7/1 day), Statement Closing Reminder (3/1 day), Anomaly Alert, Plaid Re-Consent Required, Item Error Persistent.
> 2. For each gap, a draft template body at `packages/email/emails/drafts/{name}.draft.md` with subject and body in plain direct language, no em-dashes, no marketing tone.
> 3. A `notificationPreferences` Ents table (one boolean per template plus master unsubscribe) and a preferences page at `/settings/notifications`.
> 4. Send pipeline spec: scheduled or triggered action enqueues a send, a dedicated Convex action calls Resend, success and failure logged to `emailEvents`, retries with exponential backoff max 3, idempotency via content hash key, dev mode routes to a fixed test address or log table.
> 5. Unsubscribe compliance (RFC 8058 one-click list-unsubscribe if Resend supports it; CAN-SPAM minimum always).
> 6. Observability: open and click tracking, send success and failure logging, bounce and complaint handling.
> 7. Test plan: template rendering unit tests, send pipeline integration tests with mock provider in CI, manual QA checklist.
>
> **Constraints.**
>
> - Do not replace `@convex-dev/resend`; extend it.
> - Clerk is the source of truth for user emails.
> - All triggers come from Convex scheduled functions or webhook handlers.
> - No em-dashes anywhere.
> - Follow repo conventions: bun, Turborepo, TypeScript strict, Graphite stacked PRs, CodeRabbit review, one Linear issue per task, conventional commits.
> - Recommended primary agent: Codex (well-specified template and pipeline work). Claude Code reviews.
>
> **Output.** `specs/W7-email.md`, `specs/W7-email.plan.md`, `specs/W7-email.research.md`, and a draft file per new template for Eric to review before Codex codes them.

---

## 15. Appendix B: One-Paragraph TL;DR for Obra

> Pivot SmartPockets' home to an agentic chat surface backed by `@convex-dev/agent`, with generative UI rendering tables, cards, and charts inline. Port Untitled UI's AI chatbot template as the UI base. Targeted extension of `@crowdevelopment/convex-plaid` 0.7.3 to close gaps in liabilities coverage, webhook handling, and investment data. Write-path tools with propose/confirm/execute, audit, and 10-minute undo. Intelligence features (promo countdowns, anomalies, subscription detection, statement reminders, lightweight cashflow forecast). Extend the existing `@convex-dev/resend` + 22-template foundation with seven MVP emails plus preferences. Preserve Clerk auth, existing routes, and all current Plaid security. Produce `specs/W0-existing-state-audit.md` first, then one spec/plan/research set per W1-W7. Every plan includes a Plan Handoff Header, a per-task recommended agent tag (Claude Code or Codex), and the Graphite branch name. Execute via seven parallel git worktrees with cross-agent review. Stack is bun + Turborepo + Next.js 16 + Convex Ents + Clerk + Plaid + UntitledUI + Tailwind 4 + React 19. No em-dashes anywhere.

---

## 16. Appendix C: Post-MVP Alpha-Launch Backlog (for the Next Obra Run)

Once M3 Agentic Home closes, a follow-up Obra run should generate plans for the remaining alpha-launch items from `TODO.md`. Scope is out of this brief but listed here for completeness:

- Subdomain routing: `www.smartpockets.com` marketing vs `app.smartpockets.com` app, Clerk auth handoff between domains.
- Clerk Pro feature wiring audit: confirm MFA, billing, organizations are all plumbed correctly; apply SmartPockets branding to auth screens.
- Newsletter wiring on the marketing site (midday-repo pattern research, provider selection, signup flow, delivery test).
- PostHog integration via the `analytics-sdk` package for alpha user feedback.
- Pricing page, Clerk Billing alpha pricing setup (~$5/month), end-to-end signup-to-subscription test.
- Self-hosting guide (Docker setup, deployment docs).
- Dashboard polish: metrics cards, spending breakdown, alert system, swipeable card carousel (Amex-style).
- Figma UI Kit publication.

These are independent of the M3 agentic pivot and can run in parallel as an M4 or post-alpha milestone.

---

## 17. Appendix D: What Obra Should Produce as Its First Response

When Eric pastes this brief into Obra and runs `/brainstorm`, the expected first artifact is a short plan document, not a direct implementation dump. The plan document should:

1. Confirm Obra has read the brief.
2. List the seven workstreams plus W0.
3. Note the dependency graph and suggest which workstreams to spec first.
4. List the research tasks and which MCP servers or external paths are required.
5. Ask Eric to confirm Phase 0 should start (W0 audit in a fresh worktree) before specs are written.

After confirmation, Obra proceeds workstream by workstream per the phases in Section 0. Each workstream's `/plan` output includes the Plan Handoff Header so that opening a fresh Claude Code or Codex session in the relevant worktree and pointing it at the plan file is all Eric needs to do to resume work, even days later.

---

**End of master prompt.**

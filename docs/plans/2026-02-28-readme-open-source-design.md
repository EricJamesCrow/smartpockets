# SmartPockets README & Open Source Positioning Design

**Date:** 2026-02-28
**Status:** Approved

## Context

SmartPockets is preparing to open source. The current README is a generic UntitledUI starter kit placeholder. This design defines the structure, tone, and content for a high-quality README modeled after [Agilo Fashion Starter](https://github.com/Agilo/fashion-starter) with narrative elements inspired by Cal.com/Documenso.

### Key Decisions

- **Audience:** Developers first, end users secondary
- **Positioning:** Both a usable product AND a reference implementation (Cal.com model)
- **License:** AGPLv3 (requires modified hosted versions to share changes)
- **Visuals:** No screenshots/video yet — placeholder for later
- **Figma UI Kit:** Mentioned as "coming soon" in roadmap and badges
- **Reframing:** SmartPockets is an open source personal finance platform, not a churning tracker. Credit card management is the differentiating foundation, not the ceiling.

---

## README Structure (11 Sections)

### 1. Hero + Badges + Elevator Pitch

**Title:** Centered `<h1>SmartPockets</h1>`

**Tagline:** "Open source personal finance for people who care where their data goes."

**Badges row:**
- AGPLv3 license (shield.io)
- Built with Next.js 16 (shield.io)
- Powered by Convex (shield.io)
- Figma UI Kit — coming soon (shield.io)

**Screenshot/video:** Collapsible `<details>` block with placeholder for dashboard screenshots when available.

**Elevator pitch (3 sentences):**
> **Personal finance apps are either expensive, unreliable, or selling your data to advertisers.** SmartPockets is an open source alternative to Monarch, YNAB, and Quicken — built by a credit card power user managing 12+ cards who needed something better. Built on the most detailed credit card management available, growing into a full personal finance platform you actually own.

### 2. Table of Contents

Links to all major sections:
- Features
- What SmartPockets is NOT
- Tech Stack
- Roadmap
- Getting Started
- Project Structure
- Contributing
- Community
- License

### 3. Features

Bold header + one-sentence benefit. Grouped by maturity:

**Credit Card Management**
- **Real-Time Balance Sync**: Connect your banks via Plaid and see every card's balance, APR, payment due date, and credit utilization — updated automatically.
- **Wallet Organization**: Group cards into custom wallets (e.g., "Daily Drivers", "Travel Cards", "Business") with drag-and-drop ordering.
- **Card Detail Pages**: Full transaction history, key metrics, lock/autopay tracking, and utilization progress for every card.

> Note: Verify drag-and-drop, pin, lock/autopay toggles are fully functional before publishing. If partially implemented, move to "What's next."

**Dashboard** *(early preview)*
- **At-a-Glance Metrics**: Total balances, available credit, overdue payments, and spending breakdown — all from real bank data.
- **Upcoming Payments**: Never miss a due date. See what's coming across all your cards in one view.
- **Smart Alerts**: Get flagged when payments are overdue or credit utilization is high.

**Personal Finance Platform** *(growing)*
- **Transaction Browsing**: Filter, search, and view transactions across all connected accounts.
- **Transactional Emails**: 22 branded email templates for account events, billing, and onboarding.
- **Budgeting & Tax Categories**: Coming soon — split transactions, categorize for taxes, track spending by merchant.

**For Developers**
- **100% Convex-Native**: Zero Next.js API routes. Every query, mutation, and action runs on Convex with real-time subscriptions.
- **Plaid Integration Patterns**: Production-grade Plaid component with denormalized data model, webhook handlers, cron sync, and error recovery.
- **Type-Safe Everything**: Full argument and return validators on every function, viewer-context authentication, and typed schema with relationships.
- **Figma UI Kit** *(coming soon)*: Full design system artifact — code AND design, not just code.

### 4. What SmartPockets is NOT

> SmartPockets is a **power tool**, not a lecture.
>
> - **Not a debt shaming app.** No guilt trips about your spending. You're an adult.
> - **Not a data broker.** Your financial data stays yours. No selling to advertisers, no "anonymized" aggregation.
> - **Not a bank.** SmartPockets tracks and organizes your finances — it doesn't hold your money, process payments, or freeze your cards.
> - **Not a $99/year subscription trap.** Open source and self-hostable. The hosted version covers real API costs, not artificial feature gates.

### 5. Tech Stack

Table format:

| Category | Technology | Why |
|----------|-----------|-----|
| Framework | Next.js 16 (App Router) | React Server Components, streaming, latest React 19 |
| Backend | Convex | Real-time database, no API routes needed, automatic caching |
| Auth | Clerk | Managed auth with billing, orgs, MFA out of the box |
| Banking | Plaid | Real bank connections, transaction sync, liability data |
| UI Components | UntitledUI | Production-grade React component library |
| Styling | Tailwind CSS 4 | Utility-first, zero runtime CSS |
| Email | React Email + Resend | Component-based email templates with reliable delivery |
| Monorepo | Turborepo + Bun | Fast builds, workspace isolation, native bundling |

**"Why this stack?" blurb:**
> Every piece is chosen for developer experience without sacrificing production quality. Convex eliminates the entire API layer. Clerk handles auth so you don't roll your own. Plaid is the industry standard for bank connections. The result is a fintech app with surprisingly little boilerplate.

### 6. Roadmap

Checkboxes (Fashion Starter style):

**What's built:**
- [x] Credit Card Management — Real-time Plaid sync, card detail pages, APR tracking, lock/autopay flags, credit utilization
- [x] Wallet Organization — Custom groups, drag-and-drop ordering, pin favorites
- [x] Transaction Browsing — Filter and search across all connected accounts
- [x] Authentication — Clerk with MFA, billing hooks, user sync
- [x] Transactional Emails — 22 branded templates via React Email + Resend
- [x] Marketing Site — Landing page, privacy policy, terms & conditions
- [x] Daily Sync — Cron-based Plaid sync with webhook support

**What's next:**
- [ ] Dashboard Polish — Refine metrics, spending breakdown, and alert system
- [ ] Figma UI Kit — Full design system artifact for customization
- [ ] Landing Page Redesign — Updated copy reflecting the personal finance platform positioning
- [ ] Budgeting — Split transactions, spending categories, monthly budgets
- [ ] Tax Categories — Tag transactions for tax prep, export summaries
- [ ] Export Transactions — CSV/PDF statement downloads matching bank statement fields
- [ ] Self-Hosting Guide — Docker setup and deployment docs
- [ ] Hosted Version — Managed deployment with Plaid costs included
- [ ] Swipeable Card Carousel — Amex-style horizontal card navigation

### 7. Getting Started

**Prerequisites:**
- Node.js 18+
- Bun 1.1+
- A Convex account (free tier works)
- A Clerk account (free tier works)
- Plaid API keys (sandbox for development)

Note: *Plaid sandbox keys give you test data with no bank connections required — you can develop the full app without linking real accounts.*

**Quickstart:**
```bash
git clone https://github.com/EricJamesCrow/smartpockets.git
cd smartpockets
bun install
cp .env.example .env.local
# Fill in your Convex, Clerk, and Plaid credentials
bun dev
```

Note: *This starts the app at `localhost:3000`, the marketing site at `localhost:3001`, and the Convex backend with live logs.*

**Environment Variables:**
Table listing required env vars with descriptions, grouped by service (Convex, Clerk, Plaid, Resend). Pull from `.env.example`.

### 8. Project Structure

```
smartpockets/
├── apps/
│   ├── app/          # Main application (Next.js 16)
│   └── web/          # Marketing site
├── packages/
│   ├── backend/      # Convex backend (schema, functions, webhooks)
│   ├── ui/           # Shared UI components (UntitledUI)
│   ├── email/        # React Email templates
│   └── convex-plaid/ # Plaid integration component (also on NPM as @crowdevelopment/convex-plaid)
├── tooling/
│   └── typescript/   # Shared TS configs
└── docs/             # Architecture notes and plans
```

*Each package is independently buildable. The app and backend can be developed in isolation — `bun dev:app` for just the frontend, `bun dev:backend` for just Convex.*

### 9. Contributing

> We welcome contributions! Whether it's a bug fix, new feature, or documentation improvement.
>
> 1. Fork the repo
> 2. Create a feature branch
> 3. Make your changes
> 4. Open a pull request
>
> Design contributions welcome too — see our Figma UI Kit (coming soon) for the design system.
>
> Please read our [Contributing Guide](CONTRIBUTING.md) for details on code style, commit conventions, and the development workflow.

### 10. Community

Brief links row:
- GitHub Discussions (for questions and ideas)
- X/Twitter (for updates)
- GitHub profile link

### 11. License

```
AGPLv3 — see LICENSE for details.

Built by Eric Crow · CrowDevelopment LLC
```

---

## Side Tasks (Discovered During Design)

### Documentation Audit Checklist

**High priority (fix before open sourcing):**
- [ ] `README.md` — complete rewrite (this design)
- [ ] `.agents/skills/clerk-custom-ui/SKILL.md` — references shadcn/ui theme, should reference UntitledUI
- [ ] `docs/research/CLAUDE_TEMPLATE.md` — pnpm as package manager, shadcn/ui as component library

**Medium priority:**
- [ ] `docs/email-infrastructure-roadmap.md` — npm commands, some Inngest references
- [ ] `docs/research/claude-code-prompt-ai-tooling-audit.md` — pnpm references

**Low priority (archived, leave alone):**
- [ ] `docs/archive/plans/*.md` — 10+ files with npm instead of bun (historical, not active guidance)

### Feature Verification Before Publishing

- [ ] Verify wallet drag-and-drop ordering works end-to-end
- [ ] Verify wallet pin/unpin works
- [ ] Verify credit card lock toggle is functional
- [ ] Verify credit card autopay toggle is functional
- [ ] If any are broken, move to "What's next" in roadmap

### Additional Files Needed

- [ ] `CONTRIBUTING.md` — commit format, branch naming, PR template (pull from CLAUDE.md conventions)
- [ ] `LICENSE` — AGPLv3 full text
- [ ] Community links — set up GitHub Discussions if not already enabled

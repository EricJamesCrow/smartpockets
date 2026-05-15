<h1 align="center">SmartPockets</h1>
<h3 align="center">Open source personal finance for people who care where their data goes.</h3>

<p align="center">

![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black)
![Powered by Convex](https://img.shields.io/badge/Powered_by-Convex-ff6600)
![Figma UI Kit](https://img.shields.io/badge/Figma_UI_Kit-Coming_Soon-lightgrey)

</p>

<details>
<summary>Screenshots (coming soon)</summary>
<p>Dashboard, credit card management, and wallet views will be added here.</p>
</details>

**Personal finance apps are either expensive, unreliable, or selling your data to advertisers.** SmartPockets is an open source alternative to Monarch, YNAB, and Quicken — built by a credit card power user managing 12+ cards who needed something better. Built on the most detailed credit card management available, growing into a full personal finance platform you actually own.

## Table of Contents

- [Features](#features)
- [What SmartPockets is NOT](#what-smartpockets-is-not)
- [Tech Stack](#tech-stack)
- [Roadmap](#roadmap)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Community](#community)
- [License](#license)

## Features

**Credit Card Management**

- **Real-Time Balance Sync**: Connect your banks via Plaid and see every card's balance, APR, payment due date, and credit utilization — updated automatically.
- **Wallet Organization**: Group cards into custom wallets (e.g., "Daily Drivers", "Travel Cards", "Business") with drag-and-drop ordering.
- **Card Detail Pages**: Full transaction history, key metrics, lock/autopay tracking, and utilization progress for every card.

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

## What SmartPockets is NOT

SmartPockets is a **power tool**, not a lecture.

- **Not a debt shaming app.** No guilt trips about your spending. You're an adult.
- **Not a data broker.** Your financial data stays yours. No selling to advertisers, no "anonymized" aggregation.
- **Not a bank.** SmartPockets tracks and organizes your finances — it doesn't hold your money, process payments, or freeze your cards.
- **Not a $99/year subscription trap.** Open source and self-hostable. The hosted version covers real API costs, not artificial feature gates.

## Tech Stack

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

> **Why this stack?** Every piece is chosen for developer experience without sacrificing production quality. Convex eliminates the entire API layer. Clerk handles auth so you don't roll your own. Plaid is the industry standard for bank connections. The result is a fintech app with surprisingly little boilerplate.

## Roadmap

**What's built:**

- [x] **Credit Card Management** — Real-time Plaid sync, card detail pages, APR tracking, lock/autopay flags, credit utilization
- [x] **Wallet Organization** — Custom groups, drag-and-drop ordering, pin favorites
- [x] **Transaction Browsing** — Filter and search across all connected accounts
- [x] **Authentication** — Clerk with MFA, billing hooks, user sync
- [x] **Transactional Emails** — 22 branded templates via React Email + Resend
- [x] **Marketing Site** — Landing page, privacy policy, terms & conditions
- [x] **Daily Sync** — Cron-based Plaid sync with webhook support

**What's next:**

- [ ] **Dashboard Polish** — Refine metrics, spending breakdown, and alert system
- [ ] **Figma UI Kit** — Full design system artifact for customization
- [ ] **Landing Page Redesign** — Updated copy reflecting the personal finance platform positioning
- [ ] **Budgeting** — Split transactions, spending categories, monthly budgets
- [ ] **Tax Categories** — Tag transactions for tax prep, export summaries
- [ ] **Export Transactions** — CSV/PDF statement downloads matching bank statement fields
- [ ] **Self-Hosting Guide** — Docker setup and deployment docs
- [ ] **Hosted Version** — Managed deployment with Plaid costs included
- [ ] **Swipeable Card Carousel** — Amex-style horizontal card navigation

## Getting Started

**Prerequisites**

- Node.js 18+
- Bun 1.3+
- A Convex account (free tier works)
- A Clerk account (free tier works)
- Plaid API keys (sandbox for development)

*Plaid sandbox keys give you test data with no bank connections required — you can develop the full app without linking real accounts.*

**Quickstart**

```bash
git clone https://github.com/EricJamesCrow/smartpockets.git
cd smartpockets
bun install
cp .env.example .env.local
# Fill in your Convex, Clerk, and Plaid credentials
bun dev
```

*This starts the app at `localhost:3000`, the marketing site at `localhost:3001`, and the Convex backend with live logs.*

**Environment Variables**

| Variable | Service | Description |
|----------|---------|-------------|
| `CONVEX_DEPLOYMENT` | Convex | Your deployment name (from `npx convex dev`) |
| `NEXT_PUBLIC_CONVEX_URL` | Convex | Your Convex cloud URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | Publishable key from Clerk dashboard |
| `CLERK_SECRET_KEY` | Clerk | Secret key from Clerk dashboard |
| `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` | Clerk | JWT template issuer URL (create a "convex" template) |
| `ANTHROPIC_API_KEY` | AI | Optional — for AI-powered features |
| `OPENAI_API_KEY` | AI | Optional — for AI-powered features |

*Plaid credentials (`PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`) and Clerk webhook secrets are set in the [Convex dashboard](https://dashboard.convex.dev), not in `.env.local`. See `.env.example` for full details.*

## Project Structure

```
smartpockets/
├── apps/
│   ├── app/          # Main application (Next.js 16)
│   └── web/          # Marketing site
├── packages/
│   ├── backend/      # Convex backend (schema, functions, webhooks)
│   ├── ui/           # Shared UI components (UntitledUI)
│   ├── email/        # React Email templates
│   └── convex-plaid/ # Plaid integration (also on NPM as @crowdevelopment/convex-plaid)
├── tooling/
│   └── typescript/   # Shared TS configs
└── docs/             # Architecture notes and plans
```

*Each package is independently buildable. The app and backend can be developed in isolation — `bun dev:app` for just the frontend, `bun dev:backend` for just Convex.*

## Contributing

We welcome contributions! Whether it's a bug fix, new feature, or documentation improvement.

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Open a pull request

Design contributions welcome too — see our Figma UI Kit (coming soon) for the design system.

Please read our [Contributing Guide](CONTRIBUTING.md) for details on code style, commit conventions, and the development workflow.

## Community

- [GitHub Discussions](https://github.com/EricJamesCrow/smartpockets/discussions) — Questions, ideas, and general chat
- [X / Twitter](https://x.com/EricJamesCrow) — Updates and announcements
- [GitHub Issues](https://github.com/EricJamesCrow/smartpockets/issues) — Bug reports and feature requests

## License

[AGPLv3](LICENSE) — free to use, modify, and self-host. If you host a modified version, you must share your changes.

---

Built by [Eric Crow](https://github.com/EricJamesCrow) · CrowDevelopment LLC

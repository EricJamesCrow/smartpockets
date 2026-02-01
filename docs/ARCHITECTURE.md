# Architecture Overview

This document provides a high-level overview of the SmartPockets application architecture.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 App Router + React 19 |
| **Database** | Convex with Ents ORM |
| **Auth** | Clerk (users, orgs, billing sync) |
| **UI** | UntitledUI components + Tailwind CSS v4 |
| **Banking** | Plaid via `@crowdevelopment/convex-plaid` |
| **AI** | OpenAI gpt-4o-mini via `@convex-dev/agent` |
| **Email** | Resend (migration to `@convex-dev/resend` pending) |

## Directory Structure

```
├── apps/app/                    # Next.js application
│   └── src/
│       ├── app/                 # App Router pages
│       ├── components/          # UI components
│       ├── features/            # Feature modules (institutions, etc.)
│       ├── hooks/               # Custom React hooks
│       ├── lib/                 # Utilities, MCP tools
│       └── types/               # TypeScript types
├── packages/
│   ├── backend/                 # Convex backend
│   │   └── convex/
│   │       ├── ai/              # AI chat (agent, threads, messages)
│   │       ├── creditCards/     # Credit card queries/mutations
│   │       ├── transactions/    # Transaction queries
│   │       ├── items/           # Plaid items management
│   │       └── ...              # Other modules
│   └── email/                   # React Email templates
├── convex/                      # Root Convex (generated types only)
└── docs/                        # Project documentation
```

## Core Systems

### 1. Authentication & Authorization

- **Clerk** handles authentication and user management
- Users sync to Convex via webhooks (`http.ts`)
- **4 roles**: owner, admin, member, viewer
- **Permission types**: read, write, delete, manage, share
- Permission flow: `User → Member(role) → Organization → Project → Chat`

### 2. Plaid Integration (Credit Cards)

Uses `@crowdevelopment/convex-plaid` component with denormalized data:

**Component Tables** (managed by Plaid component):
- `plaid:plaidItems` - Bank connections
- `plaid:plaidAccounts` - Account balances
- `plaid:plaidTransactions` - Transaction history
- `plaid:plaidCreditCardLiabilities` - APRs, payments

**App Table** (denormalized):
- `creditCards` - Merged account + liability data

**Data Flow**:
1. Plaid Link → `exchangePublicToken` → plaidItem
2. `fetchAccounts` → plaidAccounts
3. `syncTransactions` → plaidTransactions
4. `fetchLiabilities` → plaidCreditCardLiabilities
5. `syncCreditCardsAction` → creditCards (denormalized)

**Sync Triggers**: Onboarding, webhooks, daily cron (2 AM UTC), manual refresh

### 3. AI Chat

Uses `@convex-dev/agent` component:

- **Model**: OpenAI gpt-4o-mini
- **Tools**: 11 tools (getProfile, listProjects, createOrganization, etc.)
- **Real-time**: `useUIMessages` + `useSmoothText` hooks
- **Token tracking**: Automatic via `usageHandler`

**Key Files**:
- `convex/ai/agent.ts` - Agent definition
- `convex/ai/tools.ts` - Tool definitions
- `convex/ai/chat.ts` - Chat actions (send, regenerate, delete)
- `src/components/chat/` - UI components

### 4. Email Infrastructure

**Status**: Core migration complete - using `@convex-dev/resend` component

**Key Files** (`packages/backend/convex/email/`):
- `resend.ts` - Resend component client
- `templates.ts` - React Email template renderer
- `send.ts` - Core sending functions
- `clerk.ts` - Clerk webhook handler
- `events.ts` - Delivery status events

**Remaining**: Optional convenience wrappers, Resend webhook config, testing (see roadmap)

## Data Model (Convex Ents)

### Core Entities

```
users ──┬── members ──── organizations
        │                     │
        │                     ├── projects ──── chats ──── messages
        │                     │      │
        └── shares ───────────┘      │
                                     │
creditCards ────────────────────────(standalone, linked via userId)
```

### Key Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User profiles (Clerk sync) | `externalId`, `name` |
| `organizations` | Org hierarchy | `slug`, `name` |
| `members` | Org membership | `organizationId`, `userId`, `roleId` |
| `roles` | Permission definitions | `name`, `permissions[]` |
| `projects` | User projects | `organizationId`, `ownerId` |
| `creditCards` | Denormalized card data | `userId`, `accountId`, balances, APRs |
| `chatThreads` | AI chat threads | `threadId`, `entityType`, `entityId` |

## API Patterns

### Convex Functions

```typescript
// Public with auth - use custom functions
import { query, mutation } from "./functions";

// Internal - use generated functions
import { internalQuery, internalMutation } from "./_generated/server";

// Actions - for external APIs
import { action, internalAction } from "./_generated/server";
```

### Frontend Queries

- **Preferred**: `useQuery` from `convex-helpers/react/cache/hooks`
- **Hybrid**: `preloadQuery` (server) + `usePreloadedQuery` (client)
- **Static**: `fetchQuery` in server components

## Settings Feature Status

| Section | Status |
|---------|--------|
| Password | ✅ Complete |
| Profile | ✅ Complete |
| Email | ✅ Complete |
| Notifications | ✅ Complete |
| Appearance | ✅ Complete |
| Integrations | ✅ Complete |
| Billing | ✅ Complete |
| Institutions | ✅ Complete (Plaid management) |
| Team | ⏳ Pending (Clerk Organizations) |

## Pending Work

1. **AI Chat Security Hardening** - Auth guards on all chat operations (see `docs/plans/2025-01-16-ai-chat-security-hardening.md`)
2. **Email Polish** - Optional convenience wrappers, Resend webhook config, end-to-end testing
3. **Settings Team Page** - Clerk Organizations integration
4. **Merchant Logos** - Plaid enrichment investigation

## Related Documentation

- `CLAUDE.md` - Development guidelines and detailed patterns
- `docs/email-infrastructure-roadmap.md` - Email migration roadmap
- `docs/SETTINGS_ROADMAP.md` - Settings feature roadmap
- `docs/plans/` - Active implementation plans
- `docs/archive/` - Completed plans and roadmaps

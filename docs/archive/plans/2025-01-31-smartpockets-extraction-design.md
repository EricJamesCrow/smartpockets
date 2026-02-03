# SmartPockets Extraction Design

> Extract fintech features from ai-chatbot-untitledui into a standalone SmartPockets repository.

## Overview

| Attribute | Value |
|-----------|-------|
| Source | `/home/itsjusteric/Developer/untitledui/ai-chatbot-untitledui` |
| Target | `/home/itsjusteric/Developer/smartpockets` |
| Git History | Fresh start (no history copied) |
| Structure | Keep monorepo (apps/, packages/, tooling/) |

## What Gets Removed

### Pages (Frontend)

| Route | Reason |
|-------|--------|
| `/chat` | AI chatbot feature |
| `/chat/[threadId]` | AI chatbot feature |
| `/chat/history` | AI chatbot feature |
| `/projects` | Project management feature |
| `/images` | Demo/placeholder page |
| `/dashboard/billing` | Redundant (use `/settings/billing`) |
| `/settings/integrations` | Placeholder data (Linear, Slack, etc.) |

### Components

| Directory | Files | Reason |
|-----------|-------|--------|
| `apps/app/src/components/chat/` | 25 files | AI chatbot UI |

**Chat components to delete:**
- `AttachmentPreview.tsx`
- `ChatActionMenu.tsx`
- `ChatContainer.tsx`
- `ChatErrorBoundary.tsx`
- `ChatHome.tsx`
- `ChatView.tsx`
- `DeleteChatModal.tsx`
- `MarkdownContent.tsx`
- `MessageActionMinimal.tsx`
- `MessageActions.tsx`
- `MessageBubble.tsx`
- `MessageFailedState.tsx`
- `MessageFileDisplay.tsx`
- `MessageInput.tsx`
- `MessageList.tsx`
- `ModelSelector.tsx`
- `ResearchMode.tsx`
- `ResearchProgress.tsx`
- `SourceCard.tsx`
- `ToolCallDisplay.tsx`
- `VoiceRecorder.tsx`
- `thread-item.tsx`

### Backend (Convex)

| Path | Reason |
|------|--------|
| `packages/backend/convex/ai/` | Entire directory (21 files) - AI agent, chat, research |
| `packages/backend/convex/projects.ts` | Project CRUD |
| `packages/backend/convex/shares.ts` | Project sharing (only used by projects) |
| `packages/backend/convex/analytics.ts` | AI token usage tracking |

**AI directory contents to delete:**
- `agent.ts` - OpenAI agent definition
- `auth.ts` - Thread access control
- `chat.ts` - Chat actions (send, stream, regenerate)
- `documents.ts` - Document ingestion
- `documentsQueries.ts` - Document queries
- `files.ts` - File upload handling
- `filesActions.ts` - File actions
- `filesInternal.ts` - Internal file mutations
- `messages.ts` - Message queries
- `models.ts` - Model selection
- `research.ts` - Research actions
- `researchAgent.ts` - Deep research agent
- `researchAnalytics.ts` - Research usage tracking
- `researchInternal.ts` - Internal research functions
- `researchInternalMutations.ts` - Research mutations
- `researchQueries.ts` - Research queries
- `threads.ts` - Thread management
- `tools.ts` - Agent tool definitions
- `transcribe.ts` - Audio transcription

### Schema Tables to Remove

```typescript
// Remove from packages/backend/convex/schema.ts:

chatThreads        // AI chat thread metadata
userFiles          // AI file upload tracking
tokenUsage         // AI token consumption
searchUsage        // Research API usage
researchJobs       // Deep research job tracking
projects           // Project management
shares             // Project sharing
```

### Dependencies to Remove

```json
// Remove from root package.json:
{
  "@ai-sdk/openai": "...",
  "@convex-dev/agent": "...",
  "react-markdown": "...",
  "rehype-raw": "...",
  "remark-gfm": "..."
}
```

### Config to Update

| File | Change |
|------|--------|
| `packages/backend/convex/convex.config.ts` | Remove agent component registration |
| Sidebar component | Remove chat/projects navigation items |

---

## What Gets Kept

### Pages (Frontend)

| Route | Purpose |
|-------|---------|
| `/` | Landing/redirect |
| `/dashboard` | Main dashboard |
| `/credit-cards` | Credit card list |
| `/credit-cards/[cardId]` | Card details |
| `/transactions` | Transaction history |
| `/wallets` | Wallet organization |
| `/settings` | Profile settings |
| `/settings/email` | Email management (Clerk) |
| `/settings/password` | Password management (Clerk) |
| `/settings/notifications` | Notification preferences (Convex) |
| `/settings/appearance` | Theme settings (Convex) |
| `/settings/billing` | Subscription management (Clerk Billing) |
| `/settings/team` | Organization management (Clerk Orgs) |
| `/settings/team/members` | Member management |
| `/settings/team/invitations` | Invitation management |
| `/settings/institutions` | Plaid connections |
| `/settings/institutions/[itemId]` | Institution details |

### Backend (Convex)

| File/Directory | Purpose |
|----------------|---------|
| `creditCards/` | Card queries, mutations, sync actions |
| `transactions/` | Transaction queries and helpers |
| `wallets/` | Wallet CRUD and card organization |
| `items/` | Plaid item management |
| `plaidComponent.ts` | Plaid integration wrapper |
| `crons.ts` | Daily sync scheduler |
| `http.ts` | Webhooks (Clerk + Plaid) |
| `organizations.ts` | Org CRUD |
| `members.ts` | Membership management |
| `users.ts` | User management |
| `userPreferences.ts` | User settings |
| `functions.ts` | Custom context (viewer) |
| `permissions.ts` | Access control helpers |
| `types.ts` | TypeScript types |
| `email/` | Email sending |
| `lib/` | Shared utilities |
| `schema.ts` | Database schema (trimmed) |

### Schema Tables Kept

```typescript
// Keep in packages/backend/convex/schema.ts:

users              // User accounts (Clerk sync)
organizations      // Org management
members            // Org membership
roles              // Permission roles
creditCards        // Credit card data (Plaid)
wallets            // Card organization
walletCards        // Wallet-card junction
userPreferences    // User settings
paymentAttempts    // Payment tracking
```

### Apps & Packages

| Directory | Purpose |
|-----------|---------|
| `apps/app/` | Main Next.js dashboard |
| `apps/web/` | Marketing site |
| `packages/backend/` | Convex functions |
| `packages/email/` | React Email templates |
| `packages/ui/` | Shared UI components |
| `packages/analytics/` | Analytics (if used) |
| `tooling/` | Build configuration |

---

## Extraction Steps

### Step 1: Create Target Directory

```bash
mkdir -p /home/itsjusteric/Developer/smartpockets
```

### Step 2: Copy Structure (Exclude Unwanted)

Copy the following, excluding `node_modules`, `.git`, `.worktrees`, and lockfiles:

```
├── apps/
│   ├── app/
│   └── web/
├── packages/
│   ├── backend/
│   ├── email/
│   ├── ui/
│   └── analytics/
├── tooling/
├── docs/
├── package.json
├── turbo.json
├── tsconfig.json
├── vercel.json
└── README.md
```

### Step 3: Delete Removed Features

**Frontend deletions:**
```bash
rm -rf apps/app/src/app/(app)/chat
rm -rf apps/app/src/app/(app)/projects
rm -rf apps/app/src/app/(app)/images
rm -rf apps/app/src/app/(app)/dashboard/billing
rm -rf apps/app/src/app/(app)/settings/integrations
rm -rf apps/app/src/components/chat
```

**Backend deletions:**
```bash
rm -rf packages/backend/convex/ai
rm packages/backend/convex/projects.ts
rm packages/backend/convex/shares.ts
rm packages/backend/convex/analytics.ts
```

### Step 4: Clean Schema

Edit `packages/backend/convex/schema.ts`:

1. Remove `chatThreads` table definition
2. Remove `userFiles` table definition
3. Remove `tokenUsage` table definition
4. Remove `searchUsage` table definition
5. Remove `researchJobs` table definition
6. Remove `projects` table definition
7. Remove `shares` table definition
8. Remove `ownedProjects` edge from `users`
9. Remove `shares` edge from `users`
10. Remove `userFiles` edge from `users`
11. Remove `projects` edge from `organizations`
12. Remove `shares` edge from `projects` (if projects still referenced)

### Step 5: Update Convex Config

Edit `packages/backend/convex/convex.config.ts`:

```typescript
// BEFORE:
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";

const app = defineApp();
app.use(agent);
export default app;

// AFTER:
import { defineApp } from "convex/server";

const app = defineApp();
export default app;
```

### Step 6: Update Navigation

Edit sidebar component to remove:
- Chat nav item and any thread children
- Projects nav item
- Any references to removed routes

### Step 7: Clean Dependencies

Edit root `package.json`:

```bash
# Remove AI-related packages
bun remove @ai-sdk/openai @convex-dev/agent react-markdown rehype-raw remark-gfm
```

### Step 8: Fix Import Errors

Search for and fix any broken imports referencing:
- `@/components/chat/*`
- `api.ai.*`
- `api.projects.*`
- `api.shares.*`
- `api.analytics.*`

### Step 9: Rename & Rebrand

Update package names in:
- Root `package.json`: `"name": "smartpockets"`
- `apps/app/package.json`: `"name": "@smartpockets/app"`
- `apps/web/package.json`: `"name": "@smartpockets/web"`
- `packages/backend/package.json`: `"name": "@smartpockets/backend"`
- `packages/email/package.json`: `"name": "@smartpockets/email"`
- `packages/ui/package.json`: `"name": "@smartpockets/ui"`

Update `turbo.json` pipeline references if needed.

### Step 10: Initialize Git

```bash
cd /home/itsjusteric/Developer/smartpockets
git init
git add .
git commit -m "Initial commit: SmartPockets fintech app

Extracted from ai-chatbot-untitledui with focus on:
- Credit card management (Plaid integration)
- Transaction tracking
- Wallet organization
- User/org settings

Removed: AI chatbot, projects, integrations placeholder

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Step 11: Verify Build

```bash
bun install
bun run build
bun run typecheck
```

---

## Post-Extraction Verification

### Checklist

- [ ] All pages load without errors
- [ ] Credit cards list displays
- [ ] Card details page works
- [ ] Transactions page works
- [ ] Wallets page works
- [ ] Settings pages all functional
- [ ] Plaid Link flow works
- [ ] No console errors about missing modules
- [ ] TypeScript builds without errors
- [ ] No dead imports or unused dependencies

### Files to Spot-Check for Broken Imports

| File | Look For |
|------|----------|
| Sidebar/navigation component | Chat/projects links |
| Layout components | Chat-related providers |
| `http.ts` | AI webhook handlers |
| `crons.ts` | AI-related scheduled jobs |

---

## Notes

- **Organizations kept**: The org/member/role infrastructure stays for potential future team features (shared household accounts, etc.)
- **Clerk Billing**: Experimental but functional - keep for subscription management
- **Plaid integration**: Core feature, fully retained with all sync logic
- **Email templates**: All retained in `packages/email/`

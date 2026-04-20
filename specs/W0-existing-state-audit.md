# W0: SmartPockets Existing-State Audit

**Milestone:** M3 Agentic Home (to be created)
**Workstream:** W0 Phase 0 (this doc)
**Author:** Claude (read-only audit)
**Date:** 2026-04-20
**Scope:** Authoritative inventory of the SmartPockets monorepo state. Every subsequent workstream (W1 through W7) cites this file rather than re-specifying what already exists.
**Source of truth:** `/Users/itsjusteric/Developer/smartpockets` (this audit was run from worktree `ecstatic-rubin-6ce8c9`). File paths below are repo-root-relative.
**Writing convention:** No em-dashes, per repo rule.

---

## 0. Executive summary

SmartPockets is materially further along than the original master brief describes. The Plaid integration, credit card denormalisation, scheduled sync pipeline, email infrastructure, and core route set are in place and working. The agentic surface (W1, W2, W3) is greenfield: zero lines of agent, AI SDK, Anthropic SDK, or chat UI code exist today.

Three findings drive the rest of the document:

1. **No AI / agent dependencies are installed anywhere.** Not `@convex-dev/agent`, not `@convex-dev/rag`, not `@convex-dev/workflow`, not `ai` (Vercel AI SDK), not `@ai-sdk/anthropic`, not `@anthropic-ai/sdk`. The only `@convex-dev/*` package present is `@convex-dev/resend`. Section 6 details.
2. **`docs/ARCHITECTURE.md` is stale and claims features that do not exist.** It states `@convex-dev/agent` is wired with OpenAI gpt-4o-mini and eleven tools, references tables (`projects`, `chats`, `messages`, `chatThreads`) that are not in the schema, and names `docs/plans/2025-01-16-ai-chat-security-hardening.md` which is not present. Do not use it as an oracle. Section 16 and 19 detail.
3. **The Plaid integration is broader and more active than the master brief implies.** 8 webhook codes are actively dispatched to internal actions (brief says 5), 11 Convex tables are owned by the component (brief did not enumerate), the denormalisation action merges liability and account data into a 80+ field `creditCards` Ents table, and both mortgage and student-loan liabilities are already stored. Section 7, 8, 9 detail.

The rest of the brief's assumptions hold in outline: bun 1.1.42, Turborepo, Next.js 16 + React 19.1.1, Clerk, UntitledUI, `@crowdevelopment/convex-plaid` 0.7.3 at `packages/convex-plaid/` consumed as `workspace:*`, 22 React Email templates in `packages/email/emails/`, `@convex-dev/resend` 0.2.1 wired.

---

## 1. Gap matrix (W1 through W7)

| Workstream | Already done | Partial / exists but needs extension | New build required |
|---|---|---|---|
| **W1 Chat UI** | Shell at `apps/app/src/app/(app)/layout.tsx`: Clerk auth, Convex bootstrap, `DashboardSidebar`. Theme provider. UntitledUI `command-menu` primitive. | Current `/` is a dashboard composed of 7 components; must be relocated (to `/overview` or similar) without losing the dashboard. Sidebar needs a "Home" chat entry. | Everything chat-specific. Port `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/` primitives into `packages/ui/` or `apps/app/src/components/chat/`. Thread list, message stream, tool-result dispatcher, proposal confirm card, keyboard map. |
| **W2 Agent backend** | `packages/backend/convex/functions.ts` wrapper pattern provides `ctx.viewerX()` and `ctx.table` that tools will consume. Clerk-Convex auth propagates cleanly. | None. | Install `@convex-dev/agent`. New Ents tables: `agentThreads`, `agentMessages`, `agentProposals`, `agentUsage`, `promptVersions`. Tool registry, system prompt, token budget, streaming endpoint. |
| **W3 Generative UI** | Rich credit-card detail components already render APRs (`AprBreakdown`), promos (`PromoTracker`), installments (part of `PromoTracker`), statements (`StatementClosingBanner`), ISB (`InterestSavingBalance`), YTD fees/interest (`FeesInterestYtd`). Recharts 3.x installed. | Statement-card variants live on the detail page, not as an agent-consumable component. No registry or dispatcher. No spend-over-time or category-breakdown chart. | Registry at `apps/app/src/components/chat/tool-results/index.ts`, `ToolResultRenderer`, `ProposalConfirmCard` with diff view, `TransactionsTable` (agent view), `SpendByCategoryChart`, `SpendOverTimeChart`, `DeferredInterestTimeline`. |
| **W4 Plaid gap closure** | `@crowdevelopment/convex-plaid` 0.7.3 with 11 component tables; full transactions/liabilities/recurring/accounts sync; JWE at rest; ES256 JWT verification; body-hash dedup; circuit breaker; re-consent tokens; cursor pagination; optimistic locking; fan-out per-item daily sync. 8 webhook codes handled in SmartPockets' `http.ts`. Mortgage and student-loan liability tables populated. | Re-consent: component supports it (status moves to `needs_reauth`, `createUpdateLinkToken` / `completeReauth` exist), but no UI prompt exists. Investments: component README lists it as "NOT Yet Implemented". Per-item sync-state query: callers read `plaidItems.status` directly. | Webhook handlers for: `TRANSACTIONS:DEFAULT_UPDATE`, `ITEM:LOGIN_REPAIRED`, `ITEM:NEW_ACCOUNTS_AVAILABLE`. Investments tables and action (if MVP). Re-consent prompt UI. Optional: dedicated per-item sync-state query helper. |
| **W5 Mutation tools** | Write surface on `creditCards` is rich: lock, autopay, displayName, `userOverrides` (accountName, officialName, company, APRs, providerDashboardUrl), per-APR override, soft delete, hard delete. `transactionOverlays` table supports `userCategory`, `userDate`, `userMerchantName`, `notes`, `isReviewed`, `isHidden`. `promoRates` CRUD with expiration override. `installmentPlans` CRUD. | None of the existing mutations implement a propose/confirm/execute or audit log pattern. | `agentProposals` state machine, `auditLog` Ents table with per-mutation reversal builders, undo action, rate limits per tool, first-turn-read-before-write rule, chunked execution for bulk ops. |
| **W6 Intelligence** | `plaidRecurringStreams` with `MATURE | EARLY_DETECTION | TOMBSTONED` + inflow/outflow; `getSubscriptionsSummary`, `getActiveSubscriptions`, `getRecurringIncome` queries. Daily `generateDailySnapshots` cron populates `statementSnapshots` for cards whose closing day matches today. | None cover promo countdowns, anomaly detection, cashflow forecasting. | `promoCountdowns` denormalised table and daily cron; anomaly detection heuristic; subscription-confirmation flow via agent; 30-day cashflow forecast job. |
| **W7 Email** | 22 React Email templates at `packages/email/emails/`. `@convex-dev/resend` 0.2.1 wired in `packages/backend/convex/email/{resend,send,templates,clerk,events}.ts`. `testMode: false`. 3 internal send actions. Clerk email slugs route through `handleClerkEmail` to 4 of the 22 templates (`verification`, `password-reset`, `magic-link`, `invite`). Branding config with `unsubscribe` / `preferences` link slots. | `logoUrl: ""` in `email-config.ts` (line 54) with TODO. `mail.smartpockets.com` DNS pending (TODO.md line 39). Prod env vars and `RESEND_WEBHOOK_SECRET` not set (TODO.md lines 42, 46). Only 4 of 22 templates actively triggered. | 7 MVP templates (Welcome, Weekly Digest, Promo Warning 30/14/7/1, Statement Reminder 3/1, Anomaly Alert, Re-Consent, Persistent Item Error). `notificationPreferences` Ents table. Preferences page. RFC 8058 list-unsubscribe. Bounce and complaint handling. |

---

## 2. Convex Ents schema

Source: [packages/backend/convex/schema.ts](packages/backend/convex/schema.ts) (263 lines). Uses `defineEntSchema` / `defineEnt` / `getEntDefinitions` from `convex-ents`. `schemaValidation: false`.

### 2.1 Tables (13 total)

| Table | File:line | Notes |
|---|---|---|
| `users` | [schema.ts:8](packages/backend/convex/schema.ts:8) | Fields: `name`, `connectedAccounts[]`. Unique field: `externalId` (Clerk ID). Edges: `members`, `creditCards`, `wallets`, `statementSnapshots`, `promoRates`, `installmentPlans`, `transactionOverlays`. |
| `organizations` | [schema.ts:30](packages/backend/convex/schema.ts:30) | Fields: `name`. Unique: `slug`. Edges: `members`, `roles`. |
| `members` | [schema.ts:37](packages/backend/convex/schema.ts:37) | Edges: `organization`, `user`, `role`. Index `orgUser` on `[organizationId, userId]`. |
| `roles` | [schema.ts:39](packages/backend/convex/schema.ts:39) | Fields: `name`, `permissions[]`. Edges: `organization`, `members`. Index `byOrgAndName`. |
| `paymentAttempts` | [schema.ts:48](packages/backend/convex/schema.ts:48) | Legacy raw schema via `paymentAttemptSchemaValidator`. Indexes: `byPaymentId`, `byUserId`, `byPayerUserId`. |
| `creditCards` | [schema.ts:54](packages/backend/convex/schema.ts:54) | The denormalised table (80+ fields). Full breakdown in Section 9. Edges: `user`, `walletCards`, `statementSnapshots`, `promoRates`, `installmentPlans`. Indexes: `by_accountId`, `by_plaidItemId`, `by_user_active`, `by_user_overdue`, `by_closingDay_active`. |
| `statementSnapshots` | [schema.ts:153](packages/backend/convex/schema.ts:153) | Fields: `statementDate`, `previousBalance`, `paymentsAndCredits`, `newPurchases`, `fees`, `interestCharged`, `newBalance`, `minimumPaymentDue`, `dueDate`, `source: "manual"|"inferred"`. Edges: `user`, `creditCard`. Index `by_card_date`. |
| `promoRates` | [schema.ts:169](packages/backend/convex/schema.ts:169) | Fields include `aprPercentage`, `originalBalance`, `remainingBalance`, `startDate`, `expirationDate`, `isDeferredInterest`, `accruedDeferredInterest`, `monthlyMinimumPayment`, `isActive`. Has `userOverrides.expirationDate`, `isManual` for user-entered promos. Edges: `user`, `creditCard`. |
| `installmentPlans` | [schema.ts:192](packages/backend/convex/schema.ts:192) | Fields include `startDate`, `originalPrincipal`, `remainingPrincipal`, `totalPayments`, `remainingPayments`, `monthlyPrincipal`, `monthlyFee`, `aprPercentage`, `isActive`. Edges: `user`, `creditCard`. |
| `wallets` | [schema.ts:208](packages/backend/convex/schema.ts:208) | Fields: `name`, `color`, `icon`, `isPinned`, `sortOrder`, `pinnedSortOrder`. Edges: `user`, `walletCards`. Indexes: `by_user_sortOrder`, `by_user_pinned`. |
| `walletCards` | [schema.ts:221](packages/backend/convex/schema.ts:221) | Join table. Fields: `sortOrder`, `addedAt`. Edges: `wallet`, `creditCard`. Index `by_wallet_sortOrder`. |
| `userPreferences` | [schema.ts:230](packages/backend/convex/schema.ts:230) | Legacy-db shape (not Ents-only). Fields: `userId` (raw id ref), `appearance.{theme, brandColor, transparentSidebar, language, bannerAppearance}`. Index `byUserId`. |
| `transactionOverlays` | [schema.ts:244](packages/backend/convex/schema.ts:244) | User-side overlay on top of `plaid:plaidTransactions`. Fields: `plaidTransactionId`, `isReviewed`, `reviewedAt`, `isHidden`, `notes`, `userCategory`, `userDate`, `userMerchantName`. Edges: `user`. Indexes: `by_plaidTransactionId`, `by_user_and_transaction`. |

No `.searchIndex` or `.vectorIndex` exists anywhere. If W2 decides RAG is MVP, search/vector indexes need to be added.

### 2.2 Legacy `db` exposure

Two tables bypass the Ents-only API and are exposed via a raw `ctx.db`:

- `userPreferences`
- `paymentAttempts`

This is enforced in the `functions.ts` wrapper (see Section 3). All other tables go through `ctx.table(...)`.

### 2.3 Tables that the master brief implies exist but do NOT

- `plaidInstallmentPlans`: not a table. Installment plans are the SmartPockets-owned `installmentPlans` Ents table ([schema.ts:192](packages/backend/convex/schema.ts:192)), not part of the Plaid component.
- `accounts`: not a table. Native account data lives inside the Plaid component's `plaidAccounts` table.
- `promoCountdowns`: not a table. W6 will add it.
- `agentThreads`, `agentMessages`, `agentProposals`, `agentUsage`, `promptVersions`, `auditLog`, `notificationPreferences`, `emailEvents`, `anomalies`: none exist. All are W2, W5, W6, W7 additions.

---

## 3. Custom `functions.ts` wrapper

Source: [packages/backend/convex/functions.ts](packages/backend/convex/functions.ts) (79 lines). Uses `convex-helpers/server/customFunctions`.

Key shape (verbatim contract every workstream relies on):

```ts
export const query = customQuery(baseQuery, customCtx(queryCtx));
export const internalQuery = customQuery(baseInternalQuery, customCtx(queryCtx));
export const mutation = customMutation(baseMutation, customCtx(mutationCtx));
export const internalMutation = customMutation(baseInternalMutation, customCtx(mutationCtx));
```

`queryCtx` / `mutationCtx` ([functions.ts:22-70](packages/backend/convex/functions.ts:22)) augment the base Convex context with:

- `ctx.table`: Ents table factory from `convex-ents`.
- `ctx.viewer`: nullable Ents `users` entity, resolved by `await table("users").get("externalId", identity.subject)` where `identity` is `await baseCtx.auth.getUserIdentity()`.
- `ctx.viewerX()`: throws `"Authentication required"` if `viewer` is null.
- `ctx.db`: narrowed to `Pick<DataModel, "userPreferences" | "paymentAttempts">`. Any other raw table access via `ctx.db` will fail TypeScript.

**Rule enforced:** Every Convex `query` and `mutation` in the repo imports from `./functions`, not `./_generated/server`. `internalQuery` and `internalMutation` from `./functions` are also available for internal functions that still need `viewer` (rare; most internals skip to `./_generated/server` as noted in AGENTS.md Table 6.1). `action` and `internalAction` always come from `./_generated/server`.

This contract is the foundation of every W2, W5, and W6 tool handler.

---

## 4. Auth and Clerk-Convex integration

Source: [packages/backend/convex/auth.config.ts](packages/backend/convex/auth.config.ts) (14 lines).

```ts
providers: [{ domain: clerkDomain, applicationID: "convex" }]
```

No custom JWT template config in the repo. The Clerk Convex integration relies on the default JWT template that Clerk documents. Identity propagation: `baseCtx.auth.getUserIdentity()` returns Clerk identity; `identity.subject` is the Clerk user ID; that ID is looked up against `users.externalId` in Convex to resolve the viewer.

### 4.1 Clerk package versions

From [apps/app/package.json](apps/app/package.json):

- `@clerk/nextjs`: `^6.36.5`
- `@clerk/backend`: `^2.24.0`
- `@clerk/themes`: `^2.4.40`
- `@clerk/types`: `^4.101.14`

### 4.2 Clerk webhook handler

[packages/backend/convex/http.ts:11-74](packages/backend/convex/http.ts:11) at path `/clerk-users-webhook`:

- `user.created` and `user.updated` route to `internal.users.upsertFromClerk`.
- `user.deleted` routes to `internal.users.deleteFromClerk`.
- `paymentAttempt.updated` routes through `transformWebhookData` to `internal.paymentAttempts.savePaymentAttempt`.
- `email.created` routes to `internal.email.clerk.handleClerkEmail` (Section 14.4).
- Svix signature verification via `CLERK_WEBHOOK_SECRET` ([http.ts:60-74](packages/backend/convex/http.ts:60)).

---

## 5. Scheduled functions

Source: [packages/backend/convex/crons.ts](packages/backend/convex/crons.ts) (29 lines).

| Cron name | Schedule | Handler | Purpose |
|---|---|---|---|
| Daily Plaid Sync | `{ hourUTC: 2, minuteUTC: 0 }` | `internal.plaidComponent.syncAllActiveItemsInternal` | Fans out to per-item `syncPlaidItemInternal` via `ctx.scheduler.runAfter(0, ...)`. Each per-item run: accounts, transactions, liabilities, recurring streams, credit-card denormalisation. See [plaidComponent.ts:475-581](packages/backend/convex/plaidComponent.ts:475). |
| Generate Statement Snapshots | `{ hourUTC: 6, minuteUTC: 0 }` | `internal.statementSnapshots.actions.generateDailySnapshots` | For every card whose `statementClosingDay` matches today, creates an inferred snapshot from current balances. Idempotent. Runs after Plaid sync so balances are fresh. |

No other crons exist today. No cron for pruning Plaid `webhookLogs` / `syncLogs` (component README at [packages/convex-plaid/CLAUDE.md:763-768](packages/convex-plaid/CLAUDE.md:763) recommends hourly pruning; not configured in the host app).

---

## 6. HTTP and webhook handlers

Source: [packages/backend/convex/http.ts](packages/backend/convex/http.ts) (309 lines).

| Route | Method | Auth | File:line | Purpose |
|---|---|---|---|---|
| `/clerk-users-webhook` | POST | Svix | [http.ts:11-58](packages/backend/convex/http.ts:11) | Clerk user, payment attempt, and email events. |
| `/health` | GET | none | [http.ts:80-95](packages/backend/convex/http.ts:80) | Returns `{status, timestamp}`. |
| `/webhooks-plaid` | POST | ES256 JWT + SHA-256 body hash + 5-minute window; skipped if `shouldSkipVerification()` (sandbox bypass at [http.ts:123-147](packages/backend/convex/http.ts:123)) | [http.ts:112-306](packages/backend/convex/http.ts:112) | Plaid events. Dispatch detail in Section 8. |

No Resend webhook route is wired yet (`RESEND_WEBHOOK_SECRET` is a pending TODO, see Section 15).

---

## 7. AI and agent dependency inventory

Every host package checked. Conclusion: there is no agent or AI tooling installed in this repo.

### 7.1 Absent (not installed anywhere)

- `@convex-dev/agent`
- `@convex-dev/rag`
- `@convex-dev/workflow`
- `ai` (Vercel AI SDK)
- `@ai-sdk/anthropic`
- `@ai-sdk/react`
- `@anthropic-ai/sdk`
- `anthropic`
- `openai`

Grep confirms: zero hits for `useChat`, `streamText`, `generateText`, `createAgent`, `defineAgent`, `createThread`, `ToolCall`, `ToolResult` anywhere in the repo.

### 7.2 Present AI-adjacent

| Package | Version | Location |
|---|---|---|
| `@convex-dev/resend` | `^0.2.1` | [packages/backend/package.json:21](packages/backend/package.json:21) |

That is the only `@convex-dev/*` component in the entire monorepo.

### 7.3 Convex versions in use

From the three `package.json` files:

- Root [package.json](package.json) `convex: ^1.31.7`, `convex-ents: ^0.16.0`, `convex-helpers: ^0.1.106`.
- `packages/backend` [package.json:28-30](packages/backend/package.json:28) `convex: ^1.31.4`, `convex-ents: ^0.16.0`, `convex-helpers: ^0.1.106`.
- `apps/app` [package.json:28-29](apps/app/package.json:28) `convex: ^1.31.4`, `convex-helpers: ^0.1.106`.

Small version drift between root and subpackages (1.31.7 vs 1.31.4). Not M3-blocking but worth flagging.

---

## 8. `@crowdevelopment/convex-plaid` 0.7.3 surface

Source: [packages/convex-plaid/package.json](packages/convex-plaid/package.json).

Name: `@crowdevelopment/convex-plaid`. Version `0.7.3`. Publishes to npm. Consumed as `workspace:*` by both `apps/app` and `packages/backend`. MIT. Type module. Repository https://github.com/EricJamesCrow/convex-plaid.git. Peer deps: `convex ^1.29.0`, `react ^18 || ^19` (optional), `react-plaid-link ^3.0.0` (optional). Runtime deps include `jose ^6.0.0`, `plaid ^41.0.0`.

Exports: `.` (Plaid class), `./helpers` (auth helpers `requireAuth`, `requireOwnership`, `requireItemOwnership`, `requireAccountOwnership`), `./react` (`usePlaidLink`, `useUpdatePlaidLink`), `./convex.config` (component registration), `./test`.

### 8.1 Host-app wiring

- Component registered: [packages/backend/convex/convex.config.ts:3,7](packages/backend/convex/convex.config.ts:3) `app.use(plaid)`. Also `app.use(resend)`. Nothing else.
- Client instance: [packages/backend/convex/plaidComponent.ts:30-44](packages/backend/convex/plaidComponent.ts:30). Lazy singleton; reads `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, `ENCRYPTION_KEY` from `process.env` inside Convex runtime.
- Webhook handler in SmartPockets' own [http.ts:112-306](packages/backend/convex/http.ts:112) does NOT call the component's `registerRoutes()`; the dispatcher is hand-rolled (Section 8.4).

### 8.2 Plaid class methods (host app wrappers)

Wrappers in [packages/backend/convex/plaidComponent.ts](packages/backend/convex/plaidComponent.ts):

| Export | Type | Purpose | Line |
|---|---|---|---|
| `createLinkTokenAction` | action | Plaid Link token; defaults products to `["transactions", "liabilities"]`; webhook URL derives from `CONVEX_SITE_URL`. | [:55](packages/backend/convex/plaidComponent.ts:55) |
| `exchangePublicTokenAction` | action | Exchange public token, create plaidItem. | [:80](packages/backend/convex/plaidComponent.ts:80) |
| `fetchAccountsAction` | action | Fetch and store `plaidAccounts`. | [:102](packages/backend/convex/plaidComponent.ts:102) |
| `syncTransactionsAction` | action | Cursor-based incremental sync. | [:117](packages/backend/convex/plaidComponent.ts:117) |
| `fetchLiabilitiesAction` | action | Credit cards, mortgages, student loans. | [:141](packages/backend/convex/plaidComponent.ts:141) |
| `createUpdateLinkTokenAction` | action | Re-auth Link token. | [:162](packages/backend/convex/plaidComponent.ts:162) |
| `completeReauthAction` | action | Mark item active again. | [:177](packages/backend/convex/plaidComponent.ts:177) |
| `togglePlaidItemActive` | mutation | Pause/resume sync. | [:197](packages/backend/convex/plaidComponent.ts:197) |
| `setPlaidItemActive` | mutation | Force state. | [:211](packages/backend/convex/plaidComponent.ts:211) |
| `onboardNewConnectionAction` | action | Orchestrator: exchange, accounts, transactions, liabilities, credit-card denormalisation. | [:239](packages/backend/convex/plaidComponent.ts:239) |
| `fetchRecurringStreamsAction` | action | Manual refresh. | [:427](packages/backend/convex/plaidComponent.ts:427) |
| `syncTransactionsInternal` | internalAction | Webhook/cron entry for transactions. | [:333](packages/backend/convex/plaidComponent.ts:333) |
| `fetchLiabilitiesInternal` | internalAction | Webhook/cron entry for liabilities. | [:349](packages/backend/convex/plaidComponent.ts:349) |
| `fetchAccountsInternal` | internalAction | Balance refresh. | [:366](packages/backend/convex/plaidComponent.ts:366) |
| `refreshAccountsAndSyncCreditCardsInternal` | internalAction | Chained accounts-refresh then denormalise. | [:385](packages/backend/convex/plaidComponent.ts:385) |
| `fetchRecurringStreamsInternal` | internalAction | Cron/webhook entry for recurring streams. | [:449](packages/backend/convex/plaidComponent.ts:449) |
| `syncPlaidItemInternal` | internalAction | Per-item fan-out step. | [:475](packages/backend/convex/plaidComponent.ts:475) |
| `syncAllActiveItemsInternal` | internalAction | Daily cron root; fans out. | [:562](packages/backend/convex/plaidComponent.ts:562) |
| `markNeedsReauthInternal` | internalMutation | Sets item inactive with reason. | [:590](packages/backend/convex/plaidComponent.ts:590) |
| `setItemErrorInternal` | internalMutation | Same shape, different semantics (error vs reauth). | [:614](packages/backend/convex/plaidComponent.ts:614) |
| `deactivateItemInternal` | internalMutation | Deactivate for permission revoke / disconnect. | [:639](packages/backend/convex/plaidComponent.ts:639) |
| `getAccountsByPlaidItemId` | query | Per-item accounts. | [:667](packages/backend/convex/plaidComponent.ts:667) |
| `getAccountsByUserId` | query | Per-user accounts. | [:700](packages/backend/convex/plaidComponent.ts:700) |
| `getLiabilitiesByUserId` | query | Per-user liabilities. | [:733](packages/backend/convex/plaidComponent.ts:733) |
| `getPlaidConfig` | helper | Exports env config for webhook registration. | [:775](packages/backend/convex/plaidComponent.ts:775) |

**Note:** Recurring streams are NOT fetched during `onboardNewConnectionAction` (see [:239](packages/backend/convex/plaidComponent.ts:239)). They sync only via webhook (`TRANSACTIONS:RECURRING_TRANSACTIONS_UPDATE`), manual call, or daily cron.

### 8.3 Component-owned tables (11)

Source: [packages/convex-plaid/src/component/schema.ts](packages/convex-plaid/src/component/schema.ts) (512 lines). All monetary fields stored in **MILLIUNITS** (amount × 1000) to avoid float drift. IDs crossing the component boundary are strings, not `v.id()`.

| Table | File:line | Purpose |
|---|---|---|
| `plaidItems` | [schema.ts:22](packages/convex-plaid/src/component/schema.ts:22) | Connection metadata. JWE-encrypted `accessToken`, `cursor` for `/transactions/sync`, `institutionId`, `institutionName`, `products[]`, `status` (pending, syncing, active, error, needs_reauth, deleting), error fields, reauth fields, disconnect fields, `syncVersion` optimistic lock, circuit breaker state. Indexes: `by_user`, `by_item_id`, `by_status`. |
| `plaidAccounts` | [schema.ts:80](packages/convex-plaid/src/component/schema.ts:80) | Accounts per item. `type`, `subtype`, `mask`, `balances.{available, current, limit, isoCurrencyCode}`. Indexes: `by_plaid_item`, `by_account_id`, `by_user`. |
| `plaidTransactions` | [schema.ts:107](packages/convex-plaid/src/component/schema.ts:107) | Full transaction row: `amount` (milliunits), `date`, `name`, `merchantName`, `pending`, `categoryPrimary`, `categoryDetailed`, `paymentChannel`, `merchantId` FK to enrichments, `enrichmentData.{counterpartyName, counterpartyType, counterpartyEntityId, counterpartyConfidence, counterpartyLogoUrl, counterpartyWebsite, counterpartyPhoneNumber, enrichedAt}`. Indexes: `by_account`, `by_transaction_id`, `by_date` (on `[userId, date]`), `by_plaid_item`, `by_merchant`. |
| `plaidCreditCardLiabilities` | [schema.ts:163](packages/convex-plaid/src/component/schema.ts:163) | `aprs[].{aprPercentage, aprType, balanceSubjectToApr, interestChargeAmount}`, `isOverdue`, `lastPaymentAmount`, `lastPaymentDate`, `lastStatementBalance`, `lastStatementIssueDate`, `minimumPaymentAmount`, `nextPaymentDueDate`. Indexes: `by_account`, `by_plaid_item`, `by_user`. |
| `plaidRecurringStreams` | [schema.ts:208](packages/convex-plaid/src/component/schema.ts:208) | Status enum `MATURE | EARLY_DETECTION | TOMBSTONED`, type `inflow | outflow`, frequency string, `averageAmount`, `lastAmount`, dates, `predictedNextDate`. Indexes: `by_user`, `by_stream_id`, `by_plaid_item`, `by_status` on `[userId, status, isActive]`. |
| `plaidMortgageLiabilities` | [schema.ts:256](packages/convex-plaid/src/component/schema.ts:256) | Loan term, maturity, interest rate, payments, PMI flags, property address. Populated by `fetchLiabilitiesAction`. |
| `plaidStudentLoanLiabilities` | [schema.ts:317](packages/convex-plaid/src/component/schema.ts:317) | Loan name, guarantor, disbursement dates, repayment plan, loan status, servicer address. |
| `merchantEnrichments` | [schema.ts:393](packages/convex-plaid/src/component/schema.ts:393) | Cached per-merchant enrichment (entity ID, logo, categories, website, phone, confidence). Shared across users. |
| `webhookLogs` | [schema.ts:418](packages/convex-plaid/src/component/schema.ts:418) | 24-hour dedup via `bodyHash`. Indexes: `by_body_hash`, `by_received_at`, `by_item`, `by_status`. |
| `syncLogs` | [schema.ts:448](packages/convex-plaid/src/component/schema.ts:448) | Per-sync audit: type, trigger, status, duration, per-count result, errors. Indexes: `by_plaid_item`, `by_user`, `by_status`, `by_started_at`, `by_trigger`. |
| `plaidInstitutions` | [schema.ts:502](packages/convex-plaid/src/component/schema.ts:502) | Cached institution metadata (name, logo base64, primaryColor hex, url). 24-hour TTL by `lastFetched`. |

### 8.4 Security surfaces (verified)

- JWE A256GCM at rest for `plaidItems.accessToken`. `jose ^6.0.0`. Invalid tokens throw `TokenDecryptionError`.
- ES256 JWT signature verification of `Plaid-Verification` header. 5-minute `iat` window. Body-hash constant-time comparison. 24-hour body-hash dedup in `webhookLogs`. Key cache 24 hours with auto-refresh on rotation.
- Circuit breaker state machine (`closed`, `open`, `half_open`) persisted on `plaidItems`. Threshold 5 consecutive failures, `openDurationMs` 5 minutes, success threshold 2.
- Optimistic locking for transaction sync via `syncVersion` and `syncStartedAt` fields.
- Sandbox signature bypass via `shouldSkipVerification()` ([lib/plaidWebhookVerification.ts](packages/backend/convex/lib/plaidWebhookVerification.ts), used at [http.ts:123](packages/backend/convex/http.ts:123)).

### 8.5 Plaid API endpoints consumed

From the component README, confirmed against `src/component/actions.ts` structure:

| Endpoint | Purpose |
|---|---|
| `/link/token/create` | Link init + update mode |
| `/item/public_token/exchange` | Exchange for access token |
| `/item/get` | Fetch item metadata |
| `/institutions/get_by_id` | Institution logo / metadata |
| `/accounts/get` | Balances |
| `/transactions/sync` | Cursor-based incremental sync |
| `/liabilities/get` | Credit cards, mortgages, student loans |
| `/transactions/recurring/get` | Subscription detection |
| `/transactions/enrich` | Merchant enrichment |
| `/transactions/refresh` | Manual historical sync |
| `/webhook_verification_key/get` | JWT public key |

---

## 9. Plaid webhook coverage matrix

Source: [packages/backend/convex/http.ts:186-289](packages/backend/convex/http.ts:186). (Note: SmartPockets handles Plaid webhooks in its own `http.ts`, NOT via the component's `registerRoutes()`. The component's `registerRoutes()` exists at [packages/convex-plaid/src/client/index.ts:630](packages/convex-plaid/src/client/index.ts:630) but is unused.)

| Webhook type | Code | Status | SmartPockets handler | Plaid component support |
|---|---|---|---|---|
| `TRANSACTIONS` | `SYNC_UPDATES_AVAILABLE` | **HANDLED** | [http.ts:188-202](packages/backend/convex/http.ts:188): schedules `syncTransactionsInternal` + `refreshAccountsAndSyncCreditCardsInternal` (500 ms offset) | Yes |
| `TRANSACTIONS` | `INITIAL_UPDATE` | **INFORMATIONAL (no-op)** | [http.ts:203-205](packages/backend/convex/http.ts:203): log only, initial sync runs during onboarding | Yes |
| `TRANSACTIONS` | `HISTORICAL_UPDATE` | **INFORMATIONAL (no-op)** | [http.ts:203-205](packages/backend/convex/http.ts:203): same branch as INITIAL_UPDATE | No |
| `TRANSACTIONS` | `RECURRING_TRANSACTIONS_UPDATE` | **HANDLED** | [http.ts:206-212](packages/backend/convex/http.ts:206): schedules `fetchRecurringStreamsInternal` | Yes |
| `TRANSACTIONS` | `DEFAULT_UPDATE` | **NOT HANDLED** | no branch | No |
| `LIABILITIES` | `DEFAULT_UPDATE` | **HANDLED** | [http.ts:216-229](packages/backend/convex/http.ts:216): schedules `fetchLiabilitiesInternal` + `refreshAccountsAndSyncCreditCardsInternal` | Yes |
| `ITEM` | `ERROR` | **HANDLED** | [http.ts:233-252](packages/backend/convex/http.ts:233): special case `ITEM_LOGIN_REQUIRED` to `markNeedsReauthInternal`, other codes to `setItemErrorInternal` | Yes |
| `ITEM` | `PENDING_EXPIRATION` | **HANDLED** | [http.ts:253-261](packages/backend/convex/http.ts:253): `markNeedsReauthInternal` with expiration-date reason | Yes |
| `ITEM` | `USER_PERMISSION_REVOKED` | **HANDLED** | [http.ts:262-269](packages/backend/convex/http.ts:262): `deactivateItemInternal` | Yes |
| `ITEM` | `PENDING_DISCONNECT` | **HANDLED** | [http.ts:270-277](packages/backend/convex/http.ts:270): `deactivateItemInternal` | No (bonus coverage beyond component) |
| `ITEM` | `WEBHOOK_UPDATE_ACKNOWLEDGED` | **LOGGED** | [http.ts:278-280](packages/backend/convex/http.ts:278): log only | No |
| `ITEM` | `LOGIN_REPAIRED` | **NOT HANDLED** | no branch | No |
| `ITEM` | `NEW_ACCOUNTS_AVAILABLE` | **NOT HANDLED** | no branch | No |
| `HOLDINGS` | `DEFAULT_UPDATE` | **NOT HANDLED** | no branch | No (investments not implemented) |
| `INVESTMENTS_TRANSACTIONS` | `DEFAULT_UPDATE` | **NOT HANDLED** | no branch | No (investments not implemented) |
| `AUTH` | any | **NOT HANDLED** | no branch | No |
| `IDENTITY` | any | **NOT HANDLED** | no branch | No |

Summary: 8 actively dispatched codes, 2 informational log-only (`INITIAL_UPDATE`, `HISTORICAL_UPDATE`), 1 acknowledged log-only (`WEBHOOK_UPDATE_ACKNOWLEDGED`), 6+ not handled. Previous summary in the master brief undercounts coverage by looking at the component's unused `registerRoutes()`.

---

## 10. Credit card denormalisation

### 10.1 `creditCards` Ents table

[packages/backend/convex/schema.ts:54-150](packages/backend/convex/schema.ts:54). Non-exhaustive field list (full contents at the source):

- **Identifiers:** `plaidItemId?`, `accountId` (unique per card).
- **Account metadata:** `accountName`, `officialName?`, `mask?`, `accountType?`, `accountSubtype?`.
- **Balances:** `currentBalance?`, `availableCredit?`, `creditLimit?`, `isoCurrencyCode?`. NOTE: The comment at [:66](packages/backend/convex/schema.ts:66) claims "milliunits for precision" but the denormalisation action divides by 1000 (see 10.2); actual stored values are dollars. Flag the comment as misleading.
- **APR array:** `aprs[].{aprPercentage, aprType, balanceSubjectToApr?, interestChargeAmount?}`.
- **Payment status:** `isOverdue`, `lastPaymentAmount?`, `lastPaymentDate?`, `lastStatementBalance?`, `lastStatementIssueDate?`, `minimumPaymentAmount?`, `nextPaymentDueDate?`.
- **Display:** `displayName`, `company?`, `brand?` (visa | mastercard | amex | discover | other), `lastFour?`.
- **Sync tracking:** `syncStatus?` (synced | syncing | error | stale), `lastSyncError?`, `syncAttempts?`, `lastSyncedAt?`, `lastSeenAt?`.
- **User preferences:** `isLocked`, `lockedAt?`, `isAutoPay`, `autoPayEnabledAt?`.
- **Statement / issuer config:** `statementClosingDay?`, `payOverTimeEnabled?`, `payOverTimeLimit?`, `payOverTimeApr?`.
- **`userOverrides`** object: `officialName?`, `accountName?`, `company?`, `aprs?: [{ index, aprPercentage?, balanceSubjectToApr?, interestChargeAmount? }]`, `providerDashboardUrl?`.
- **Soft-delete:** `isActive`.

Edges: `user`, `walletCards`, `statementSnapshots`, `promoRates`, `installmentPlans`.

### 10.2 Denormalisation flow

`syncCreditCardsAction` ([packages/backend/convex/creditCards/actions.ts](packages/backend/convex/creditCards/actions.ts)) and its internal twin `syncCreditCardsInternal`:

1. Auth: reads `userId` from `ctx.auth.getUserIdentity()`; verifies the Plaid item belongs to the user.
2. Queries `components.plaid.public.getAccountsByItem` filtered to `type = credit && subtype = credit card`.
3. Queries `components.plaid.public.getLiabilitiesByItem` for the matching accounts.
4. Merges into the denormalised row: account fields (name, mask, balances), liability fields (APRs, payments, statement info), computed fields (`displayName`, `company` from `plaidItem.institutionName`, `brand` by heuristic), and converts milliunits to dollars by dividing by 1000.
5. Writes via `internal.creditCards.mutations.bulkUpsertCreditCardsInternal` with per-card fallback on error.
6. Returns `{ synced, errors }`.

### 10.3 Card mutations (write surface for W5)

[packages/backend/convex/creditCards/mutations.ts](packages/backend/convex/creditCards/mutations.ts):

Public: `toggleLock`, `toggleAutoPay`, `updateDisplayName`, `create` (manual entry), `update`, `setOverride`, `setAprOverride`, `clearOverride`, `clearAprOverride`, `remove` (soft), `hardDelete`.

Internal: `bulkUpsertCreditCardsInternal`, `upsertCreditCardInternal`, `updateSyncErrorInternal`.

### 10.4 Card queries

[packages/backend/convex/creditCards/queries.ts](packages/backend/convex/creditCards/queries.ts):

- `list` (filters by `plaidItem.isActive` under the hood).
- `get`.
- `getStats`: `{ totalBalance, totalAvailableCredit, totalCreditLimit, overdueCount, lockedCount, averageUtilization, cardCount }`.
- `computeInterestSavingBalance(creditCardId)`: `{ interestSavingBalance, currentBalance, totalProtectedBalances, totalProtectedPayments, hasPromos }`. Integrates `promoRates` and `installmentPlans`.
- `computeYtdFeesInterest(creditCardId)`: `{ totalFees, totalInterest, year }`. Reads every `plaidTransaction` for the card and filters by year in memory (flagged by the Plaid audit as a query-performance concern if card history grows).

### 10.5 `promoRates` and `installmentPlans` (SmartPockets-owned)

- `promoRates` CRUD: [packages/backend/convex/promoRates/{mutations,queries}.ts](packages/backend/convex/promoRates/queries.ts). Supports manual user-created promos (`isManual: true`) and Plaid-synced with user expiration override.
- `installmentPlans` CRUD: [packages/backend/convex/installmentPlans/{mutations,queries}.ts](packages/backend/convex/installmentPlans/queries.ts).

These two tables are NOT in the Plaid component. They are managed by SmartPockets; this is the key mismatch with the master brief.

---

## 11. Transactions code

### 11.1 `plaidTransactions` (Plaid-component-owned)

Shape already covered in Section 8.3. Cursor-based sync. Indexes: `by_account`, `by_transaction_id`, `by_date` on `[userId, date]`, `by_plaid_item`, `by_merchant`.

### 11.2 `transactionOverlays` (SmartPockets-owned)

[packages/backend/convex/transactionOverlays/](packages/backend/convex/transactionOverlays/index.ts) contains `index.ts`, `mutations.ts`, `queries.ts`. Overlay fields: `isReviewed`, `reviewedAt`, `isHidden`, `notes`, `userCategory`, `userDate`, `userMerchantName`. The overlay is the pre-existing primitive that W5 agent mutations should read/write (category rename, hide, note, merchant rename, mark reviewed).

### 11.3 Transactions queries

[packages/backend/convex/transactions/](packages/backend/convex/transactions/queries.ts) has `index.ts`, `helpers.ts`, `queries.ts`. Queries include:

- `getByUser`
- `getByAccount`
- `getByCategory`
- `getByDateRange`
- `getByMerchant`
- `getTransactionsAndStreamsByAccountId` (combines `plaidTransactions` with `plaidRecurringStreams` for detail UI)

No bulk-update mutation exists today on the transaction surface. W5 will add proposal and execute wrappers that build on `transactionOverlays`.

### 11.4 Dashboard route uses these

[apps/app/src/app/(app)/dashboard/components/RecentTransactions.tsx](apps/app/src/app/(app)/dashboard/components/RecentTransactions.tsx) consumes `transactions/` queries. Full dashboard composition in Section 12.

---

## 12. App routing (apps/app)

Source: Glob of [apps/app/src/app/(app)/**](apps/app/src/app/(app)).

### 12.1 Route tree (authoritative)

```
apps/app/src/app/
├── layout.tsx                              (root: ClerkProvider, Convex client, theme, toaster)
├── (app)/
│   ├── layout.tsx                          (client; bootstraps Convex viewer via api.users.ensureCurrentUser)
│   ├── page.tsx                            (/) dashboard composed of 7 subcomponents
│   ├── dashboard/
│   │   └── components/
│   │       ├── AlertBanner.tsx
│   │       ├── ConnectedBanks.tsx
│   │       ├── HeroMetrics.tsx
│   │       ├── RecentTransactions.tsx
│   │       ├── SpendingBreakdown.tsx
│   │       ├── UpcomingPayments.tsx
│   │       └── YourCards.tsx
│   ├── credit-cards/
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   ├── page.tsx                        (/credit-cards)
│   │   └── [cardId]/
│   │       ├── loading.tsx
│   │       ├── not-found.tsx
│   │       └── page.tsx                    (/credit-cards/[cardId])
│   ├── wallets/
│   │   └── page.tsx                        (/wallets)
│   ├── transactions/
│   │   ├── loading.tsx
│   │   └── page.tsx                        (/transactions)
│   └── settings/
│       ├── layout.tsx
│       ├── page.tsx                        (/settings)
│       ├── appearance/page.tsx
│       ├── billing/
│       │   ├── billing-content.tsx
│       │   └── page.tsx
│       ├── email/page.tsx
│       ├── institutions/
│       │   ├── page.tsx
│       │   └── [itemId]/
│       │       ├── institution-detail-content.tsx
│       │       └── page.tsx
│       ├── password/page.tsx
│       └── team/
│           ├── layout.tsx
│           ├── page.tsx
│           ├── invitations/page.tsx
│           └── members/page.tsx
├── sign-in/[[...sign-in]]/page.tsx
└── sign-up/[[...sign-up]]/page.tsx
```

### 12.2 `(app)/layout.tsx`

[apps/app/src/app/(app)/layout.tsx](apps/app/src/app/(app)/layout.tsx) (78 lines). Client component:

- `useConvexAuth()` plus `useQuery(api.users.current, ...)` plus `useMutation(api.users.ensureCurrentUser)`.
- Bootstrap retry (2 s delay) if the initial `ensureCurrentUser` call fails.
- Renders `<DashboardSidebar />` (from `@/components/application/dashboard-sidebar`) plus children when `viewer !== null`.
- Renders a "Setting up your account" fallback when Clerk is authenticated but Convex `viewer` is `null`.

### 12.3 `(app)/page.tsx` (the current `/`)

[apps/app/src/app/(app)/page.tsx](apps/app/src/app/(app)/page.tsx) (40 lines). Client component. Renders the dashboard in a responsive grid:

```
AlertBanner
HeroMetrics
┌ UpcomingPayments  ┐  ┌ YourCards         ┐
│ ConnectedBanks    │  │ SpendingBreakdown │
└───────────────────┘  └───────────────────┘
RecentTransactions
```

**W1 relocation task is non-trivial:** `/` is a real dashboard composing 7 live-query components, not a placeholder. Everything under `dashboard/components/` must move with the relocation.

### 12.4 Marketing routes (apps/web)

[apps/web/src/app/(marketing)/](apps/web/src/app/(marketing)/page.tsx) has `page.tsx` (landing), `layout.tsx` (Header + Footer), `privacy/page.tsx`, `terms/page.tsx`, `about/page.tsx`. Plus `sign-in/[[...sign-in]]` and `sign-up/[[...sign-up]]` catch-alls.

Landing page at [apps/web/src/app/(marketing)/page.tsx](apps/web/src/app/(marketing)/page.tsx):

- Five sections: `HeroCardMockup11`, `IconsAndMockup07`, `FeaturesIconCards01`, `NewsletterCardVertical`, `CTACardVerticalBrand`.
- **Two newsletter signup forms** (hero at lines 32-63, CTA section at lines 319-350). Both submit to `console.log("Form data:", data)`. No backend integration.
- No `/pricing` route. Removed per TODO.md line 12.

---

## 13. `packages/ui` UntitledUI inventory

Glob result: every component under `packages/ui/src/components/untitledui/`. Grouped:

**Base** ([packages/ui/src/components/untitledui/base/](packages/ui/src/components/untitledui/base/)): avatar (3 variants), badges (2 variants), buttons (4 variants: button, close, social, app-store), button-group, checkbox, dropdown, file-upload-trigger, form, input, input-group, input-icon, label, popover, radio, select, slider, switch/toggle, text-area, tooltip.

**Application** ([packages/ui/src/components/untitledui/application/](packages/ui/src/components/untitledui/application/)): app-navigation (sidebar slim / simple / dual-tier, header nav, mobile header, nav items, featured cards), breadcrumbs, carousel, charts, command-menu (multiple variants), content-divider, date-picker, empty-state, file-upload, loading-indicator, messaging, metrics, modals (signup, 2FA, new-project, payment-method, file-upload, user-invite, verification-code, appearance-settings, input-field), notifications, toaster (Sonner), pagination (multiple variants), section-headers / labels / footers, slideout-menus, table, tabs / settings-tabs.

**Foundations**: featured-icon, logo, payment-icons, social-icons.

**Shared assets**: background-patterns, credit-card mockup, illustrations.

**Conclusions that matter for W1 and W3:**

- Zero chat primitives exist (`ChatInput`, `ChatMessage`, `MessageList`, `ThreadList`, `ToolResult`). These must be ported or built.
- Command-menu primitives exist, which W1 can use for the thread switcher / slash-command.
- `charts-base.tsx` wraps Recharts 3.x, which W3 can use for `SpendByCategoryChart` and `SpendOverTimeChart`.
- `tailwind.tsx`, `cx()` at [packages/ui/src/utils/index.ts](packages/ui/src/utils/index.ts). Subpackages reuse via `@repo/ui/untitledui/...`.

---

## 14. Credit-card UI components

Source: Glob of [apps/app/src/components/credit-cards/**](apps/app/src/components/credit-cards/).

### 14.1 Top-level (26 files)

| Component | File | Notes |
|---|---|---|
| `AutoPayToggle` | [AutoPayToggle.tsx](apps/app/src/components/credit-cards/AutoPayToggle.tsx) | Internal tracker toggle (not real autopay). |
| `CardDetailsTab` | [CardDetailsTab.tsx](apps/app/src/components/credit-cards/CardDetailsTab.tsx) | Composes detail page content. |
| `CardEmptyState` | [CardEmptyState.tsx](apps/app/src/components/credit-cards/CardEmptyState.tsx) | No-cards state. |
| `CardVisualWrapper` | [CardVisualWrapper.tsx](apps/app/src/components/credit-cards/CardVisualWrapper.tsx) | Wraps layout variants. |
| `CreditCardBack` | [CreditCardBack.tsx](apps/app/src/components/credit-cards/CreditCardBack.tsx) | CVV face. |
| `CreditCardDetailContent` | [CreditCardDetailContent.tsx](apps/app/src/components/credit-cards/CreditCardDetailContent.tsx) | Detail-page shell (takes `cardId`). |
| `CreditCardExtendedDetails` | [CreditCardExtendedDetails.tsx](apps/app/src/components/credit-cards/CreditCardExtendedDetails.tsx) | APRs, payment info, balances (pairs with `AprBreakdown`). |
| `CreditCardGridItem` | [CreditCardGridItem.tsx](apps/app/src/components/credit-cards/CreditCardGridItem.tsx) | Tile for list. |
| `CreditCardStatusBadge` | [CreditCardStatusBadge.tsx](apps/app/src/components/credit-cards/CreditCardStatusBadge.tsx) | Overdue / locked / etc. |
| `CreditCardVisual` | [CreditCardVisual.tsx](apps/app/src/components/credit-cards/CreditCardVisual.tsx) | Card front face. |
| `CreditCardsContent` | [CreditCardsContent.tsx](apps/app/src/components/credit-cards/CreditCardsContent.tsx) | List page content. |
| `CreditCardsFilterBar` | [CreditCardsFilterBar.tsx](apps/app/src/components/credit-cards/CreditCardsFilterBar.tsx) | Sort / filter UI. |
| `CreditCardsHeader` | [CreditCardsHeader.tsx](apps/app/src/components/credit-cards/CreditCardsHeader.tsx) | List-page header. |
| `FlippableCreditCard` | [FlippableCreditCard.tsx](apps/app/src/components/credit-cards/FlippableCreditCard.tsx) | Flip animation. |
| `KeyMetrics` | [KeyMetrics.tsx](apps/app/src/components/credit-cards/KeyMetrics.tsx) | Per-card stat row. |
| `LockCardButton` | [LockCardButton.tsx](apps/app/src/components/credit-cards/LockCardButton.tsx) | |
| `MerchantLogo` | [MerchantLogo.tsx](apps/app/src/components/credit-cards/MerchantLogo.tsx) | |
| `PaymentDueBadge` | [PaymentDueBadge.tsx](apps/app/src/components/credit-cards/PaymentDueBadge.tsx) | |
| `TransactionFilters` | [TransactionFilters.tsx](apps/app/src/components/credit-cards/TransactionFilters.tsx) | Filter bar for card-scoped transactions. |
| `TransactionTableHeader` | [TransactionTableHeader.tsx](apps/app/src/components/credit-cards/TransactionTableHeader.tsx) | |
| `TransactionTableRow` | [TransactionTableRow.tsx](apps/app/src/components/credit-cards/TransactionTableRow.tsx) | W3 can borrow the row structure. |
| `TransactionsSection` | [TransactionsSection.tsx](apps/app/src/components/credit-cards/TransactionsSection.tsx) | Card-scoped transactions section. |
| `UntitledCardGridItem` | [UntitledCardGridItem.tsx](apps/app/src/components/credit-cards/UntitledCardGridItem.tsx) | |
| `UntitledCardVisual` | [UntitledCardVisual.tsx](apps/app/src/components/credit-cards/UntitledCardVisual.tsx) | |
| `UntitledCreditCard` | [UntitledCreditCard.tsx](apps/app/src/components/credit-cards/UntitledCreditCard.tsx) | Placeholder card. |
| `UtilizationProgress` | [UtilizationProgress.tsx](apps/app/src/components/credit-cards/UtilizationProgress.tsx) | |

### 14.2 `details/` subfolder (8 files) <-- Important for W3

All of these are real components and usable as W3 generative-UI outputs:

- [details/AprBreakdown.tsx](apps/app/src/components/credit-cards/details/AprBreakdown.tsx) (**CONFIRMED EXISTS**, contrary to master-brief assumptions; renders the APR table with all three standard rows plus weighted average per TODO.md line 108).
- [details/BalanceReconciliation.tsx](apps/app/src/components/credit-cards/details/BalanceReconciliation.tsx)
- [details/FeesInterestYtd.tsx](apps/app/src/components/credit-cards/details/FeesInterestYtd.tsx)
- [details/InlineEditableField.tsx](apps/app/src/components/credit-cards/details/InlineEditableField.tsx) (Figma-style double-click-to-edit; the primitive behind user overrides)
- [details/InterestSavingBalance.tsx](apps/app/src/components/credit-cards/details/InterestSavingBalance.tsx) (ISB logic)
- [details/PayOverTimeSection.tsx](apps/app/src/components/credit-cards/details/PayOverTimeSection.tsx)
- [details/PromoTracker.tsx](apps/app/src/components/credit-cards/details/PromoTracker.tsx) (promos + installment plans; urgency colour coding; manual-promo form)
- [details/StatementClosingBanner.tsx](apps/app/src/components/credit-cards/details/StatementClosingBanner.tsx)

### 14.3 `primitives/` subfolder (6 files)

Card-layout primitives used by `CardVisualWrapper`:

- `apple-card-layout.tsx`
- `bank-logos.tsx`
- `chase-card-layout.tsx`
- `configured-credit-card.tsx`
- `credit-card-primitives.tsx`
- `standard-card-layout.tsx`

---

## 15. Email infrastructure

### 15.1 Templates (22)

All at [packages/email/emails/](packages/email/emails/). Flat (no nesting):

- `image-welcome.tsx`
- `magic-link.tsx`
- `mockup-01.tsx`
- `mockup-02.tsx`
- `password-reset.tsx`
- `payment-expiring.tsx`
- `payment-failed.tsx`
- `receipt.tsx`
- `simple-invite.tsx`
- `simple-verification.tsx`
- `simple-welcome-01.tsx`
- `simple-welcome-02.tsx`
- `subscription-cancelled.tsx`
- `subscription-created.tsx`
- `subscription-downgraded.tsx`
- `subscription-upgraded.tsx`
- `trial-ended.tsx`
- `trial-ending.tsx`
- `trial-starting.tsx`
- `video-welcome-01.tsx`
- `video-welcome-02.tsx`
- `video-welcome-03.tsx`

### 15.2 Config and theme

- [packages/email/emails/_config/email-config.ts](packages/email/emails/_config/email-config.ts) (86 lines). Defines `EmailBrandConfig` and `defaultEmailConfig`. Social link: `twitter`. Legal links: `terms`, `privacy`. Has optional `unsubscribe` and `preferences` slots on the type ([:38-39](packages/email/emails/_config/email-config.ts:38)) but not populated today. **`logoUrl: ""`** at [:54](packages/email/emails/_config/email-config.ts:54) with TODO comment.
- `_theme/colors.ts`, `_theme/theme-colors.ts`, `_theme/theme.ts`. SmartPockets green palette applied.
- `utils/cx.ts` for class merging inside templates.

### 15.3 Resend wiring

- [packages/backend/convex/email/resend.ts](packages/backend/convex/email/resend.ts) (41 lines). Initialises `new Resend(components.resend, { testMode: false, onEmailEvent: internal.email.events.handleEmailEvent })`. Provides `EMAIL_CONFIG.from.{default, support, billing}` derived from `APP_NAME` and `EMAIL_DOMAIN` env vars.
- [packages/backend/convex/email/send.ts](packages/backend/convex/email/send.ts) (159 lines). Three internal actions: `sendTemplatedEmail`, `sendHtmlEmail`, `sendTextEmail`.
- [packages/backend/convex/email/templates.ts](packages/backend/convex/email/templates.ts) renders React Email templates to HTML (Node action).
- [packages/backend/convex/email/events.ts](packages/backend/convex/email/events.ts) handles Resend email events (delivered, bounced, complained, etc.).
- [packages/backend/convex/email/clerk.ts](packages/backend/convex/email/clerk.ts) (190 lines). Maps Clerk email slugs to 4 templates: `verification`, `password-reset`, `magic-link`, `invite`. Supported slugs: `verification_code`, `reset_password_link`, `magic_link`, `magic_link_sign_in`, `magic_link_sign_up`, `magic_link_verify_email`, `organization_invitation`.

### 15.4 Trigger coverage today

Only the Clerk webhook fires SmartPockets emails. No SmartPockets application-level emails (welcome on Plaid link, weekly digest, promo reminders, etc.) are triggered today. Of the 22 templates, only 4 are actively hit.

### 15.5 Production status

Per TODO.md (Section 17):

- `[x]` `mail.smartpockets.com` registered in Resend
- `[ ]` DNS verification pending
- `[x]` Dev Convex env has `EMAIL_DOMAIN`, `RESEND_API_KEY`, stale `INNGEST_EVENT_KEY` removed
- `[ ]` Prod Convex env vars not set
- `[ ]` Prod `INNGEST_EVENT_KEY` still present
- `[ ]` Logo not hosted; `logoUrl` empty
- `[ ]` `RESEND_WEBHOOK_SECRET` not configured; no `/resend-webhook` HTTP route exists yet
- `[ ]` End-to-end tests for each template pending

---

## 16. TODO.md status

Source: [TODO.md](TODO.md) (279 lines). No M3 / Agentic Home entries exist; the pivot is new.

### 16.1 Sections (summary)

1. **Landing Page & Brand Identity:** done (incl. copy cleanup, legal pages, alpha badge, favicons).
2. **Marketing to App Architecture:**
   - `[x]` Landing page moved to `apps/web`
   - `[ ]` Subdomain routing config
   - `[ ]` Clerk auth handoff between domains
   - `[ ]` Remove marketing components from `apps/app`
   - `[x]` Vercel deployment config
3. **App UI Refresh:** all `[ ]`; aesthetic refresh pending.
4. **Transactional Emails:** see Section 15.5.
5. **Clerk Pro Setup:** all `[ ]`.
6. **Newsletter Setup:** all `[ ]`; landing-page form is disconnected.
7. **Blog:** `[ ]` optional.
8. **Alpha UX Polish:** all `[ ]`; PostHog integration pending.
9. **Pricing & Payments:** all `[ ]`.
10. **Open Source Prep:** mostly `[x]`; Figma UI Kit, Self-hosting guide, GitHub Discussions, Hosted version pending.
11. **Credit Cards Feature / Enhanced Details Tab:** most items `[x]`; pending `[ ]` installment plan create/edit form, swipeable card carousel, export transactions research.
12. **Editable Card Details:** done except `[ ]` extend override pattern to transactions, `[ ]` manual installment plan creation.
13. **UI/UX Fixes & Cleanup:** logo and settings done; dashboard aesthetic pending.
14. **Technical Debt:** `[ ]` UntitledUI migration audit, `[ ]` `@untitledui/icons` migration, `[ ]` Plaid production fix.
15. **Multi-Profile / Organizations Architecture:** all `[ ]`; deep research session required.

### 16.2 Blockers relevant to M3

- Subdomain routing / Clerk handoff (Section 2 of TODO)
- Email production env + logo hosting + Resend webhook
- Plaid production fix (Technical Debt)

None are M3-blocking per se, but the email pipeline gaps affect W7 roll-out.

---

## 17. Docs inventory

### 17.1 Directory structure

Source: Glob of [docs/](docs/).

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (177 lines, **OUTDATED**)
- [docs/convex-deploy-guardrails.md](docs/convex-deploy-guardrails.md)
- [docs/archive/](docs/archive/) (many archived plans and roadmaps)
  - `email-infrastructure-roadmap.md` (the email roadmap the master brief references)
  - `SETTINGS_ROADMAP.md`
  - `CLAUDE_TEMPLATE.md`
  - `AI Developer Tooling for your Fintech stack.md`
  - `claude-code-prompt-ai-tooling-audit.md`
  - `resend-email-implementation-roadmap.md`
  - `convex-resend-migration-roadmap.md`
  - `credit-cards-cron-plan.md`
  - `plans/` with 25+ historical design and implementation plans dated 2025-01 through 2026-03
- [docs/plans/](docs/plans/) (current active plans, 2026-03-04):
  - `2026-03-04-react-compiler-design.md`
  - `2026-03-04-react-compiler-implementation.md`
  - `2026-03-04-transaction-detail-panel-design.md`
  - `2026-03-04-transaction-detail-panel-implementation.md`
  - `2026-03-04-transaction-panel-enhancements-design.md`
  - `2026-03-04-transaction-panel-enhancements-implementation.md`
- [docs/research/](docs/research/)
  - `Optimal Multi-profile architecture for Smart Pockets.md`
  - `Transaction Management in Copilot and Monarch.md`

### 17.2 ARCHITECTURE.md correctness check

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) contains several claims that contradict the actual code:

- [:7-15](docs/ARCHITECTURE.md:7) "Next.js 15" and "AI | OpenAI gpt-4o-mini via `@convex-dev/agent`" and "Email | Resend (migration to `@convex-dev/resend` pending)". Wrong on all three. Next.js is 16, `@convex-dev/agent` is not installed, and the Resend migration is complete.
- [:30-36](docs/ARCHITECTURE.md:30) Claims `packages/backend/convex/ai/` exists with "agent, threads, messages". It does not; no `ai/` directory in the backend.
- [:73-87](docs/ARCHITECTURE.md:73) "AI Chat" section describes 11 tools, `convex/ai/agent.ts`, `convex/ai/tools.ts`, `convex/ai/chat.ts`, and `src/components/chat/` UI components. None of these exist.
- [:106-127](docs/ARCHITECTURE.md:106) Shows an ER diagram with `projects`, `chats`, `messages`, `chatThreads` tables. None exist in [schema.ts](packages/backend/convex/schema.ts).
- [:164](docs/ARCHITECTURE.md:164) References `docs/plans/2025-01-16-ai-chat-security-hardening.md`. Not present.
- [:174](docs/ARCHITECTURE.md:174) References `docs/SETTINGS_ROADMAP.md`. Only [docs/archive/SETTINGS_ROADMAP.md](docs/archive/SETTINGS_ROADMAP.md) exists.

ARCHITECTURE.md must be rewritten (recommended for a post-M3 cleanup pass, out of W0 scope). W2 and W3 should not treat this file as truth.

### 17.3 AGENTS.md correctness check

[AGENTS.md](AGENTS.md) (518 lines) is largely accurate. Mild gap: the "Schema Overview" table at [:429-440](AGENTS.md:429) omits `statementSnapshots`, `promoRates`, `installmentPlans`, `transactionOverlays`. The custom wrapper contract, security rules, MCP server commands, and git workflow rules are correct and binding for every workstream.

### 17.4 Nested CLAUDE.md files

- [CLAUDE.md](CLAUDE.md) at repo root (188 lines), already in the agent's prompt context.
- [packages/convex-plaid/CLAUDE.md](packages/convex-plaid/CLAUDE.md) (1127 lines). The Plaid component's own guide. Critical for W4. Lists current webhook handlers, tables, security model, error codes, and a "How to Add a New Product" recipe (useful for adding investments).

---

## 18. External template paths

Both exist on the filesystem:

- `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui/`
- `/Users/itsjusteric/CrowDevelopment/Templates/untitledui/`

These are outside the monorepo. Any W1 or W3 plan targeting component ports must list them in the Plan Handoff Header as "Required read access" so the executing agent (Claude Code with `--add-dir`, or Codex via copied files) can reach them.

---

## 19. Tooling

Source: [package.json](package.json).

### 19.1 Package manager and version pin

- `packageManager: "bun@1.1.42"` ([:24](package.json:24)). Pinned. Do NOT assume bun is latest.
- `workspaces: ["packages/*", "apps/*", "tooling/*"]` ([:5-9](package.json:5)).

### 19.2 Scripts

| Script | Command | Notes |
|---|---|---|
| `dev` | `turbo dev --parallel --filter=!@crowdevelopment/convex-plaid` | **Explicitly excludes the Plaid component.** After editing `packages/convex-plaid`, run `cd packages/convex-plaid && bun run build` manually. |
| `dev:app` | `turbo dev --filter=@repo/app` | localhost:3000 |
| `dev:web` | `turbo dev --filter=@repo/web` | localhost:3001 |
| `dev:email` | `turbo dev --filter=@repo/email` | localhost:3003 |
| `dev:backend` | `turbo dev --filter=@repo/backend` | Convex dev with tail logs |
| `build` | `turbo build` | |
| `typecheck` | `turbo typecheck` | |
| `lint` | `turbo lint` | |

### 19.3 Trusted deps

`@clerk/shared`, `@tailwindcss/oxide`, `esbuild`, `lightningcss`, `sharp`.

### 19.4 React Compiler

`babel-plugin-react-compiler: ^1.0.0` at root dev-deps. Recent commits `f4afda9` and `241d343` indicate an active refactor to remove manual memoisation. Any W1 or W3 code must not re-introduce patterns the compiler already handles.

---

## 20. Mismatches vs. the master brief (must shape W1 through W7 specs)

These are the places where the master brief assumes something the codebase does not match. Each entry cites the contradiction so subsequent specs correct course.

1. **`AprBreakdown.tsx` DOES exist** at [apps/app/src/components/credit-cards/details/AprBreakdown.tsx](apps/app/src/components/credit-cards/details/AprBreakdown.tsx). This is the `details/` subfolder pattern the brief missed. W3 should plan to reuse or wrap `AprBreakdown`, `PromoTracker`, `StatementClosingBanner`, `InterestSavingBalance`, `FeesInterestYtd`, `BalanceReconciliation`, `PayOverTimeSection`.
2. **Route is `/credit-cards`, not `/cards` or `/accounts`.** Detail route is `/credit-cards/[cardId]`, not `/cards/[id]`. The brief's Section 8 W1 mention of `/accounts` is wrong; the closest analogue is `/settings/institutions`. W1 must use the actual routes.
3. **`/` is a real dashboard with 7 subcomponents**, not a placeholder. Relocating it requires moving [apps/app/src/app/(app)/dashboard/components/*](apps/app/src/app/(app)/dashboard/) with the route, not just `page.tsx`. W1 must account for this.
4. **`installmentPlans` is SmartPockets-owned**, not a Plaid-component table. The brief's Section 8 W4 "`plaidInstallmentPlans`" reference is wrong. W4 should not propose moving installment plans into the component.
5. **`docs/ARCHITECTURE.md` is stale**; ignore its AI chat section. See Section 17.2 above. Every W1, W2, W3 spec must cite this W0 audit, not ARCHITECTURE.md.
6. **Plaid webhook coverage is 8 HANDLED, not 5.** The brief's prose undercounts by examining the unused `registerRoutes()`. The live handler is in SmartPockets' own [http.ts](packages/backend/convex/http.ts:112). W4 must plan against the correct baseline.
7. **`@convex-dev/agent` is absent.** The brief (and ARCHITECTURE.md) imply it may be present. It is not installed in any package. W2 starts with an install, not an extend.
8. **Email migration is COMPLETE, not pending.** The brief cites `docs/email-infrastructure-roadmap.md` as current; that doc is at [docs/archive/email-infrastructure-roadmap.md](docs/archive/email-infrastructure-roadmap.md) and describes work already done. The still-open email items are in TODO.md sections 4 and 6.
9. **`mail.smartpockets.com` DNS is pending, prod env vars not set, logo not hosted, Resend webhook secret not configured.** W7 must treat these as prerequisites to shipping the seven MVP emails, not as green.
10. **Newsletter signup on the marketing site is fully disconnected** (two forms, both `console.log` only). The brief mentions it in Section 16 post-MVP; W7 research should confirm whether any overlap exists with the MVP transactional email stack or if the newsletter remains strictly out of M3 scope.
11. **Bun is pinned to 1.1.42.** The brief's Section 1 says "bun" without a pin; AGENTS.md Section 17 pins 1.1.42. Agents running commands must respect the pin.
12. **`bun dev` explicitly filters out `@crowdevelopment/convex-plaid`**. After any W4 edit to the component source, the executing agent must run `cd packages/convex-plaid && bun run build`. The brief omits this footgun.
13. **`plaidTransactions` uses MILLIUNITS** (amounts × 1000), but `creditCards` stores dollars after divide-by-1000 in `syncCreditCardsAction`. The comment in [schema.ts:66](packages/backend/convex/schema.ts:66) claims `creditCards` is milliunits; that is misleading. W3 or W5 tools that read both tables must respect both scales.
14. **Recurring streams are NOT fetched during onboarding** ([plaidComponent.ts:239-324](packages/backend/convex/plaidComponent.ts:239) has no `fetchRecurringStreams` step). They populate on webhook or daily cron. W6 should flag that "subscription detection may be delayed up to 24 hours post-link" in the UX.
15. **User cannot "remove" a Plaid item directly yet.** [plaidComponent.ts](packages/backend/convex/plaidComponent.ts) exposes `togglePlaidItemActive` and `setPlaidItemActive` but not a wrapped `deletePlaidItem`. The component's `deletePlaidItem` mutation exists but is not re-exported. W5's "remove item" mutation tool needs to add the wrapper.
16. **`registerRoutes()` at [packages/convex-plaid/src/client/index.ts:630](packages/convex-plaid/src/client/index.ts:630) is unused** in the host app. This is fine (SmartPockets prefers explicit handling) but any W4 plan proposing component-first webhook registration is a change in architecture that would conflict with the in-place handler; flag explicitly.

---

## 21. Questions this audit answered

Per the W0 brief in the master prompt, Section 8 → W0 had 12 audit targets. Each is covered above:

| Target | Section(s) |
|---|---|
| 1. Convex schema | 2 |
| 2. `@crowdevelopment/convex-plaid` component | 7, 8 |
| 3. Credit card denormalisation | 10 |
| 4. Transactions code | 11 |
| 5. Email infrastructure | 15 |
| 6. Scheduled functions | 5 |
| 7. Webhook handlers | 6, 8 |
| 8. Auth and identity | 3, 4 |
| 9. Routing | 12 |
| 10. UntitledUI inventory | 13, 14 |
| 11. AI dependencies | 6 (labelled "7" in this file) |
| 12. TODO.md state | 16 |

Plus the mandatory gap matrix (Section 1) and mismatches section (Section 20).

---

## 22. What is NOT in this audit (out of scope)

- Recommendations. W0 flags; W1 through W7 specs decide.
- Linear issue creation.
- Source-code modifications.
- Spec drafts for W1 through W7.
- MCP Plaid Sandbox runs or webhook simulations.
- Drafts of any new template, tool, or component.

---

**End of W0 audit.**

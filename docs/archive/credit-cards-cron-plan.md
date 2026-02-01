# Credit Cards Sync Plan (No Component Patch)

Goal: restore daily cron sync, recurring streams handling, and correct transaction unit conversion without modifying @crowdevelopment/convex-plaid.

## Scope
- Add a daily cron job to sync transactions, liabilities, credit card denormalization, and recurring streams.
- Expose recurring streams actions in the app Plaid wrapper.
- Handle Plaid webhook updates for recurring streams.
- Convert transaction amounts to dollars in UI mapping.

## Plan

### 1) Daily Cron Job
File: `packages/backend/convex/crons.ts`
- Create a daily cron (2 AM UTC) that triggers sync for all active items.
- Two implementation options:
  - Option A (fan-out): call component internal scheduled action for transactions, then run liabilities + recurring via app internal actions.
  - Option B (host loop): query active items, then sequentially run sync actions in the app (transactions, liabilities, recurring) with try/catch.
- Ensure credit card denormalization runs after liabilities: `creditCards.actions.syncCreditCardsInternal`.
- Wrap recurring streams fetch in try/catch and log failures (insufficient history is common).

### 2) Plaid Wrapper Actions (Recurring Streams)
File: `packages/backend/convex/plaidComponent.ts`
- Add `fetchRecurringStreamsAction` (public action) that calls `getPlaid().fetchRecurringStreams`.
- Add `fetchRecurringStreamsInternal` (internal action) for webhook/cron usage.
- Include optional `trigger` field for logging consistency (manual, webhook, scheduled).

### 3) Webhook Handling
File: `packages/backend/convex/http.ts`
- Handle `TRANSACTIONS / RECURRING_TRANSACTIONS_UPDATE`.
- Schedule `internal.plaidComponent.fetchRecurringStreamsInternal` for that webhook code.
- Preserve existing transaction and liability handling.

### 4) Transaction Amount Conversion
File: `apps/app/src/types/credit-cards.ts`
- In `toTransaction`, convert Plaid milliunits to dollars (divide by 1000).
- Keep `formatDisplayCurrency` usage consistent across UI components.

## Notes
- No changes to `@crowdevelopment/convex-plaid` are required for this plan.
- Liabilities + recurring streams are intentionally not run inside the component cron helpers due to component action constraints and app-specific needs (credit card denormalization).
- If desired later, we can revisit a component patch to make scheduledActions handle liabilities/recurring directly.

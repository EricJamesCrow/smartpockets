# Enhanced Credit Card Details Tab — Statement-Styled Redesign

**Date:** 2026-03-03
**Branch:** `enhanced-credit-card-details-tab`
**Status:** Design approved, pending implementation

## Goal

Transform the Details tab into a statement-inspired layout that surfaces financial data most consumer fintech apps hide — APR breakdowns, promo rate tracking, installment plans, balance reconciliation, and interest-saving recommendations. Formatted as clean, interactive UI rather than a PDF reproduction.

## Data Gap Analysis

### What Plaid provides (already integrated)

- APR percentages per type (`purchase_apr`, `cash_apr`, `balance_transfer_apr`)
- Balance subject to each APR and interest charged per type
- Minimum payment, due date, overdue status
- Last payment amount/date, last statement balance/issue date
- Current balance, available credit, credit limit

### What requires new Convex tables + manual user entry

- Statement snapshots (historical balance state per billing cycle)
- Promotional APR rates and expiration dates
- Installment plan breakdowns (Equal Pay, My Chase Plan, etc.)
- Deferred interest amounts
- Statement closing day (per card)
- Pay Over Time settings (Amex-specific)
- YTD fee/interest totals (computable from transaction history)
- Interest Saving Balance (computable from promo balances)

## Schema Additions

### New table: `statementSnapshots`

Archives balance state at each statement closing date.

| Field | Type | Notes |
|-------|------|-------|
| `userId` | `v.id("users")` | Owner |
| `creditCardId` | `v.id("creditCards")` | FK |
| `statementDate` | `v.string()` | ISO date — the closing date |
| `previousBalance` | `v.number()` | Previous statement closing balance |
| `paymentsAndCredits` | `v.number()` | Total payments received in period |
| `newPurchases` | `v.number()` | Total new charges |
| `fees` | `v.number()` | Fees charged |
| `interestCharged` | `v.number()` | Interest charged |
| `newBalance` | `v.number()` | Closing balance |
| `minimumPaymentDue` | `v.number()` | Min payment for this period |
| `dueDate` | `v.string()` | Payment due date |
| `source` | `v.union(v.literal("manual"), v.literal("inferred"))` | How snapshot was created |

**Indexes:** `by_card` on `[creditCardId]`, `by_card_date` on `[creditCardId, statementDate]`

**First snapshot strategy:** Seed from Plaid's `lastStatementBalance` and `lastStatementIssueDate`. Won't have line-item breakdown, but anchors reconciliation for the next cycle.

**Closing date detection:** A Convex cron checks daily — when a card's `statementClosingDay` passes, it creates a snapshot from current Plaid data.

### New table: `promoRates`

Tracks promotional/intro APR periods per card.

| Field | Type | Notes |
|-------|------|-------|
| `userId` | `v.id("users")` | Owner |
| `creditCardId` | `v.id("creditCards")` | FK |
| `description` | `v.string()` | User label: "0% Balance Transfer" |
| `aprPercentage` | `v.number()` | The promo rate (usually 0) |
| `originalBalance` | `v.number()` | Original qualified amount |
| `remainingBalance` | `v.number()` | Current remaining balance |
| `startDate` | `v.string()` | When promo started |
| `expirationDate` | `v.string()` | When promo expires |
| `isDeferredInterest` | `v.boolean()` | Accrued interest if not paid by expiration |
| `accruedDeferredInterest` | `v.optional(v.number())` | Deferred interest amount |
| `monthlyMinimumPayment` | `v.optional(v.number())` | Required monthly promo payment |
| `isActive` | `v.boolean()` | Soft delete / expired flag |

**Index:** `by_card` on `[creditCardId]`

### New table: `installmentPlans`

Tracks Equal Pay / My Chase Plan / Pay It Plan It type installments.

| Field | Type | Notes |
|-------|------|-------|
| `userId` | `v.id("users")` | Owner |
| `creditCardId` | `v.id("creditCards")` | FK |
| `description` | `v.string()` | Merchant or plan name |
| `startDate` | `v.string()` | When plan started |
| `originalPrincipal` | `v.number()` | Total original amount |
| `remainingPrincipal` | `v.number()` | Current remaining |
| `totalPayments` | `v.number()` | Total installments |
| `remainingPayments` | `v.number()` | Payments left |
| `monthlyPrincipal` | `v.number()` | Principal per month |
| `monthlyFee` | `v.number()` | Fee per month |
| `aprPercentage` | `v.number()` | APR on this plan |
| `isActive` | `v.boolean()` | |

**Index:** `by_card` on `[creditCardId]`

### Fields added to existing `creditCards` table

| Field | Type | Notes |
|-------|------|-------|
| `statementClosingDay` | `v.optional(v.number())` | Day of month (1-31) |
| `payOverTimeEnabled` | `v.optional(v.boolean())` | Amex Pay Over Time |
| `payOverTimeLimit` | `v.optional(v.number())` | Amex POT limit |
| `payOverTimeApr` | `v.optional(v.number())` | Amex POT APR |

## Component Architecture

```
CardDetailsTab.tsx (orchestrator)
├── StatementClosingBanner.tsx       — Prominent CTA when statementClosingDay is null
├── BalanceReconciliation.tsx        — Section 1: ledger waterfall
│   └── WaterfallChart.tsx           — Future: pure presentation bridge chart
├── AprBreakdown.tsx                 — Section 2: color-coded APR table
│   └── AprRow.tsx                   — Individual rate row
├── PromoTracker.tsx                 — Section 3: promo rates + installment plans
│   ├── PromoRateCard.tsx            — Single promo with countdown/progress bar
│   ├── InstallmentPlanCard.tsx      — Single installment plan row
│   └── AddPromoButton.tsx           — Inline CTA to add new promo
├── InterestSavingBalance.tsx        — Section 4: smart recommendation
├── FeesInterestYtd.tsx              — Section 5: compact YTD summary
├── PayOverTimeSection.tsx           — Section 6: Amex-specific (conditional)
└── AccountDetails.tsx               — Existing account info (moved to bottom)
```

### Data flow

- `CardDetailsTab` receives `ExtendedCreditCardData` as a prop (unchanged)
- Additional queries inside the tab:
  - `api.promoRates.queries.listByCard` — active promos
  - `api.installmentPlans.queries.listByCard` — active plans
  - `api.statementSnapshots.queries.getLatest` — most recent + previous snapshot
  - `api.creditCards.queries.computeInterestSavingBalance` — reactive computed
  - `api.creditCards.queries.computeYtdFeesInterest` — uses index on `[accountId, date]`, filters by year

### Key design decisions

- **`BalanceReconciliation` accepts a `statementDate` prop** (defaults to latest). Future-proofs for a statement period selector dropdown without code changes.
- **`WaterfallChart` is pure presentation** — receives pre-computed values, does no data fetching. Built after the numeric ledger is proven.
- **`computeYtdFeesInterest` uses an index** on `[accountId, date]` filtered by year, not a full table scan. Handles 1000+ transactions efficiently.
- **Inline editing has per-field-type validators** — number validation for APR fields, date validation for expiration dates, reject invalid input before firing mutations.

## Visual Design

All sections use the existing card pattern: `rounded-xl border border-secondary bg-primary`.

### Section 1: Balance Reconciliation
- Each ledger line: label left, amount right, `tabular-nums` monospace
- Payment lines in `text-utility-success-700` (green), charges/fees/interest in `text-utility-error-700` (red)
- Horizontal rule before total: `border-t-2 border-secondary`
- Total line: `font-semibold text-primary`
- Empty state: dashed-border card with "Set your statement closing date to enable balance tracking"

### Section 2: APR Breakdown
- Headline metric: "Weighted Average APR: X.XX%" above the table
- Color-coded left border per row: green (0% promo), amber (standard), red (cash advance/penalty)
- Variable rate `(v)` as a tooltip-triggering badge
- Columns: APR type | percentage | balance subject | interest charged

### Section 3: Promo Tracker
- Each promo is a mini-card within the section
- Progress bar: time elapsed vs remaining, color gradient green -> yellow -> orange -> red
- Countdown text: "4 months remaining"
- Deferred interest warning: `bg-utility-error-50` banner with accrued amount
- Installment plans: table-style rows within the same section
- "Add promotional rate" CTA: dashed border, `+` icon, `text-tertiary`

### Section 4: Interest Saving Balance
- Compact single card
- Formula inline: `New Balance - Promo Balances + Promo Min Payments = ISB`
- ISB amount as hero number (same styling as KeyMetrics values)
- Subtitle: "Pay this amount to avoid interest on next month's purchases"

### Section 5: Fees & Interest YTD
- Compact 2-column row (same pattern as Payment History)
- Left: "Total Fees: $X.XX", Right: "Total Interest: $X.XX"
- Year label: "2026 Year-to-Date"

### Section 6: Pay Over Time (conditional)
- Only rendered when `payOverTimeEnabled` is true
- Key-value list: POT limit, available limit, APR, setting status

### Statement Closing Date Banner
- Rendered at top of Details tab when `statementClosingDay` is null
- Subtle but prominent: `bg-utility-brand-50 border border-utility-brand-200 rounded-xl`
- Message: "Set your statement closing date to unlock balance tracking and smart recommendations"
- Inline date picker or number input

## Progressive Disclosure

| Section | Visibility |
|---------|-----------|
| Statement Closing Banner | Only when `statementClosingDay` is null |
| Balance Reconciliation | Always (empty state if no snapshots) |
| APR Breakdown | Always (uses Plaid data) |
| Promo Tracker | Only when promos or installment plans exist (with add CTA always visible) |
| Interest Saving Balance | Always (falls back to "pay full balance" if no promos) |
| Fees & Interest YTD | Always |
| Pay Over Time | Only when `payOverTimeEnabled` is true |
| Account Details | Always (moved to bottom) |

## Empty State & Onboarding UX

When a user first visits the Details tab on a newly linked card:

1. **Statement Closing Banner** appears at top — most prominent CTA
2. **APR Breakdown** populated from Plaid data — immediate value
3. **Balance Reconciliation** shows empty state with "Set closing date" message
4. **Promo Tracker** shows "Add promotional APR" ghost card
5. **Interest Saving Balance** shows "Pay $X (full balance) to avoid interest"
6. **Account Details** populated from Plaid data

The goal: the tab looks useful immediately (APR data exists), and progressively reveals more power as the user enriches their data.

## Computed Queries (Convex)

### `computeInterestSavingBalance`

```
interestSavingBalance = currentBalance - sum(activePromoBalances) + sum(activePromoMinPayments)
```

If no promos exist, ISB equals the current balance (pay in full to avoid interest).

### `computeYtdFeesInterest`

Queries transactions for the current card where:
- `accountId` matches and `date >= "YYYY-01-01"` (current year start)
- Filters by category: fees (annual fee, late fee, etc.) and interest charges
- Uses index on `[accountId, date]` for efficient range queries
- Returns `{ totalFees: number, totalInterest: number }`

## Implementation Order

Build incrementally, each step is a shippable PR:

1. **Schema + migrations** — Add tables, add fields to `creditCards`, deploy
2. **CRUD mutations** — Create/update/delete for promoRates, installmentPlans, statementSnapshots
3. **Computed queries** — `computeInterestSavingBalance`, `computeYtdFeesInterest`
4. **APR Breakdown component** — Enhanced version of existing APR section (mostly UI, uses existing data)
5. **Balance Reconciliation component** — Ledger view + empty state
6. **Promo Tracker component** — Promo cards + installment plans + add flows
7. **Interest Saving Balance component** — Computed display
8. **Fees & Interest YTD component** — Compact summary
9. **Pay Over Time section** — Conditional Amex section
10. **Statement snapshot cron** — Automated snapshot creation
11. **WaterfallChart** — Visual bridge chart (last, after all data flows are proven)

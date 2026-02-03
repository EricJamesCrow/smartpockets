# Transactions Page Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unified transactions page aggregating all transactions across every connected card/bank with source identification.

**Architecture:** New `/transactions` route with paginated table, expandable filters, and slideout detail drawer. Backend query joins Plaid transactions with credit card metadata to attach source info.

**Tech Stack:** Convex queries, React, UntitledUI components (SlideoutMenu, Badge, Dropdown)

---

## Page Structure & Layout

**Route:** `/transactions`

```
┌─────────────────────────────────────────────────────────┐
│ Header: "Transactions"                                  │
│ Subtext: "All transactions across your accounts"        │
├─────────────────────────────────────────────────────────┤
│ [Search input...........................] [Filters ▼]   │
├─────────────────────────────────────────────────────────┤
│ Expanded filters (when open):                           │
│ Date range | Category | Source | Status | Amount range  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Transaction Table                                      │
│  ─────────────────────────────────────────────────────  │
│  Date | Merchant | Category | Source | Status | Amount  │
│  ─────────────────────────────────────────────────────  │
│  ...rows...                                             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Showing 1-50 of 1,234    [← Prev] [1] [2] [3] [Next →]  │
└─────────────────────────────────────────────────────────┘
```

**Navigation:** Add "Transactions" to sidebar under Credit Cards section.

---

## Source Column Design

**Visual Structure:**
```
┌──────────────────────┐
│ [Bank Logo 40x40]    │
│ Card Display Name    │
│ •••• 4242            │
└──────────────────────┘
```

- Bank/institution logo (40x40px) - Chase, Wells Fargo, Apple, etc.
- Card display name below logo
- Last 4 digits in muted text
- Fallback: First letter avatar if no logo available

---

## Table Row Design

**Columns:** Date, Merchant/Description, Category, Source, Status, Amount

**Example Row:**
```
┌────────┬─────────────────┬─────────────┬──────────────────┬─────────┬──────────┐
│ Jan 30 │ Whole Foods     │ Groceries   │ [Chase]          │ Posted  │ -$127.43 │
│ 2025   │ Market          │             │ Sapphire Reserve │         │          │
│        │                 │             │ •••• 4242        │         │          │
└────────┴─────────────────┴─────────────┴──────────────────┴─────────┴──────────┘
```

**Status Badge:**
- "Posted" = subtle gray badge
- "Pending" = yellow/warning badge

**Amount:**
- Negative amounts (charges) in default text color
- Positive amounts (refunds/credits) in green

---

## Expandable Filters

**Default state:** Search input visible, "Filters" button collapsed

**Expanded state (on click):**
```
┌─────────────────────────────────────────────────────────────────┐
│ Date Range        Category         Source          Status       │
│ ┌───────────┐    ┌───────────┐    ┌───────────┐   ┌──────────┐ │
│ │ Last 30 ▼ │    │ All     ▼ │    │ All cards▼│   │ All    ▼ │ │
│ └───────────┘    └───────────┘    └───────────┘   └──────────┘ │
│                                                                 │
│ Amount Range                                    [Clear Filters] │
│ ┌─────────┐  to  ┌─────────┐                                   │
│ │ Min $   │      │ Max $   │                                   │
│ └─────────┘      └─────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Filter Options:**
- **Date Range:** Last 7 days, Last 30 days, Last 90 days, This year, Custom
- **Category:** Dropdown with Plaid categories (Groceries, Entertainment, Shopping, etc.)
- **Source:** Multi-select of user's cards (shows card name + last 4)
- **Status:** All, Posted, Pending
- **Amount Range:** Min/max dollar inputs

---

## Transaction Detail Drawer

**Trigger:** Click on any table row

**Slideout content:**
```
┌─────────────────────────────────────┐
│ [×]                     Transaction │
├─────────────────────────────────────┤
│                                     │
│  Whole Foods Market                 │
│  ─────────────────────────────────  │
│  $127.43                            │
│  Posted · Jan 30, 2025              │
│                                     │
│  Category                           │
│  🛒 Groceries                       │
│                                     │
│  Source                             │
│  [Chase Logo]                       │
│  Chase Sapphire Reserve •••• 4242   │
│  → View card details                │
│                                     │
│  Location (if available)            │
│  123 Main St, San Francisco, CA     │
│                                     │
└─────────────────────────────────────┘
```

---

## Backend Data Flow

**New Query:** `transactions/queries.ts` → `listAllForUser`

```
1. Get user's active Plaid items
   └─► components.plaid.public.getItemsByUser

2. Get all accounts for those items
   └─► components.plaid.public.getAccountsByItem (×N)

3. Get transactions for each account
   └─► components.plaid.public.getTransactionsByAccount

4. Join with creditCards table to get card metadata
   └─► creditCards.accountId ↔ transaction.accountId

5. Attach source info to each transaction:
   {
     ...transaction,
     source: {
       institutionName: "Chase",
       cardDisplayName: "Sapphire Reserve",
       lastFour: "4242",
       brand: "visa"
     }
   }

6. Apply filters (date, category, source, status, amount)

7. Sort by date descending, paginate
```

**Query Arguments:**
- `page`, `pageSize` - pagination
- `searchQuery` - merchant name search
- `dateFrom`, `dateTo` - date range filter
- `category` - category filter
- `cardIds` - filter by specific cards (array)
- `status` - "all" | "posted" | "pending"
- `amountMin`, `amountMax` - amount range filter

**Return Type:**
```typescript
{
  items: Array<{
    // Transaction fields
    _id: string;
    transactionId: string;
    date: string;
    name: string;
    merchantName?: string;
    amount: number;
    pending: boolean;
    categoryPrimary?: string;
    categoryDetailed?: string;
    location?: { ... };
    // Source info
    source: {
      institutionName: string;
      cardId: Id<"creditCards">;
      cardDisplayName: string;
      lastFour?: string;
      brand?: "visa" | "mastercard" | "amex" | "discover" | "other";
    };
  }>;
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
```

---

## Files to Create

**Backend:**
```
packages/backend/convex/transactions/
└── queries.ts          # Add listAllForUser query
```

**Frontend:**
```
apps/app/src/app/(app)/transactions/
├── page.tsx            # Route page
└── loading.tsx         # Loading skeleton

apps/app/src/components/transactions/
├── TransactionsContent.tsx      # Main page content orchestrator
├── TransactionsHeader.tsx       # Header with title/subtitle
├── TransactionsTable.tsx        # Table container with columns
├── TransactionsTableRow.tsx     # Individual row component
├── TransactionsFilters.tsx      # Expandable filter panel
├── TransactionsSearch.tsx       # Search input component
├── TransactionsPagination.tsx   # Pagination controls
├── TransactionSourceCell.tsx    # Bank logo + card name cell
└── TransactionDetailDrawer.tsx  # Slideout detail view
```

**Sidebar Update:**
```
apps/app/src/components/application/dashboard-sidebar.tsx
└── Add "Transactions" nav item
```

---

## Reusable Components

Already exist, will reuse:
- `SlideoutMenu` - UntitledUI slideout for detail drawer
- Bank logos from `primitives/bank-logos.tsx` (Chase, Apple, etc.)
- `Badge` - UntitledUI badge for status
- Transaction helpers from `transactions/helpers.ts`
- `MerchantLogo` component (if merchant enrichment available)

---

## Data Loading Strategy

**Pagination:** 50 items per page with next/prev controls

- Server-side filtering and pagination
- All filters applied in query before pagination
- Total count returned for "Showing X-Y of Z" display

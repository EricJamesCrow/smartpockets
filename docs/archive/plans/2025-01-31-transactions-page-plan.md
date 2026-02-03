# Transactions Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a unified transactions page that aggregates all transactions across connected cards/banks with source identification.

**Architecture:** New `/transactions` route with paginated table, expandable filters, and slideout detail drawer. Backend query joins Plaid transactions with credit card metadata to attach source info (institution name, card name, last 4).

**Tech Stack:** Convex queries, React, UntitledUI components (Table, SlideoutMenu, Badge, Select, Input, Button)

---

## Task 1: Backend Query - listAllForUser

**Files:**
- Modify: `packages/backend/convex/transactions/queries.ts`
- Modify: `packages/backend/convex/transactions/index.ts`

**Step 1: Add the listAllForUser query**

Add this query to `packages/backend/convex/transactions/queries.ts`:

```typescript
/**
 * List all transactions for the current user across all accounts
 *
 * Aggregates transactions from all connected cards/banks with source info.
 * Supports filtering, search, and pagination.
 *
 * @returns Paginated transactions with source card/institution info
 */
export const listAllForUser = query({
  args: {
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    searchQuery: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(v.string()), // "all" | "posted" | "pending"
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    cardIds: v.optional(v.array(v.id("creditCards"))),
    amountMin: v.optional(v.number()),
    amountMax: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const userId = viewer.externalId;

    // 1. Get user's active Plaid items
    const userItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId,
    });
    const activeItems = userItems.filter((item) => item.isActive !== false);

    // 2. Get user's credit cards to build accountId -> card lookup
    const creditCards = await ctx
      .table("creditCards", "by_user_active", (q) =>
        q.eq("userId", viewer._id).eq("isActive", true)
      )
      .map((card) => card.doc());

    // Build accountId -> card info lookup
    const accountToCard = new Map<
      string,
      {
        cardId: string;
        displayName: string;
        lastFour?: string;
        brand?: string;
        institutionName?: string;
      }
    >();

    for (const card of creditCards) {
      // Find the institution name from Plaid items
      const plaidItem = activeItems.find((item) => item._id === card.plaidItemId);
      accountToCard.set(card.accountId, {
        cardId: card._id,
        displayName: card.displayName,
        lastFour: card.lastFour,
        brand: card.brand,
        institutionName: plaidItem?.institutionName ?? "Unknown",
      });
    }

    // 3. Get all accounts for active items
    const allAccountIds: string[] = [];
    for (const item of activeItems) {
      const accounts = await ctx.runQuery(
        components.plaid.public.getAccountsByItem,
        { plaidItemId: item._id }
      );
      for (const acc of accounts) {
        allAccountIds.push(acc.accountId);
      }
    }

    // 4. Get transactions for each account
    const merchantCache = new Map<string, MerchantEnrichmentResult>();
    let allTransactions: Array<{
      _id?: string;
      transactionId: string;
      accountId: string;
      amount: number;
      date: string;
      name: string;
      merchantName?: string;
      pending: boolean;
      categoryPrimary?: string;
      categoryDetailed?: string;
      merchantEnrichment?: MerchantEnrichmentResult | null;
      source: {
        cardId: string;
        displayName: string;
        lastFour?: string;
        brand?: string;
        institutionName: string;
      };
    }> = [];

    for (const accountId of allAccountIds) {
      // Skip if we don't have card info for this account (might be non-credit account)
      const cardInfo = accountToCard.get(accountId);
      if (!cardInfo) continue;

      // Apply cardIds filter if specified
      if (args.cardIds && args.cardIds.length > 0) {
        if (!args.cardIds.some((id) => id === cardInfo.cardId)) continue;
      }

      const rawTransactions = await ctx.runQuery(
        components.plaid.public.getTransactionsByAccount,
        { accountId }
      );

      // Enrich and attach source info
      for (const tx of rawTransactions) {
        const enriched = await enrichTransactionWithMerchant(ctx, tx, merchantCache);
        allTransactions.push({
          ...enriched,
          source: {
            cardId: cardInfo.cardId,
            displayName: cardInfo.displayName,
            lastFour: cardInfo.lastFour,
            brand: cardInfo.brand,
            institutionName: cardInfo.institutionName ?? "Unknown",
          },
        });
      }
    }

    // 5. Apply filters
    // Search filter
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      allTransactions = allTransactions.filter(
        (tx) =>
          tx.name.toLowerCase().includes(query) ||
          tx.merchantName?.toLowerCase().includes(query) ||
          tx.source.displayName.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (args.category && args.category !== "all") {
      allTransactions = allTransactions.filter(
        (tx) =>
          tx.categoryPrimary === args.category ||
          tx.categoryDetailed === args.category
      );
    }

    // Status filter
    if (args.status && args.status !== "all") {
      const isPending = args.status === "pending";
      allTransactions = allTransactions.filter((tx) => tx.pending === isPending);
    }

    // Date range filter
    if (args.dateFrom || args.dateTo) {
      allTransactions = allTransactions.filter((tx) => {
        const txDate = new Date(tx.date);
        if (args.dateFrom && txDate < new Date(args.dateFrom)) return false;
        if (args.dateTo && txDate > new Date(args.dateTo)) return false;
        return true;
      });
    }

    // Amount range filter
    if (args.amountMin !== undefined || args.amountMax !== undefined) {
      allTransactions = allTransactions.filter((tx) => {
        const amount = Math.abs(tx.amount);
        if (args.amountMin !== undefined && amount < args.amountMin) return false;
        if (args.amountMax !== undefined && amount > args.amountMax) return false;
        return true;
      });
    }

    // 6. Sort by date descending
    allTransactions.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    // 7. Paginate
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 50;
    const totalCount = allTransactions.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const items = allTransactions.slice(startIndex, startIndex + pageSize);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  },
});
```

**Step 2: Export the new query**

In `packages/backend/convex/transactions/index.ts`, ensure `listAllForUser` is exported:

```typescript
export {
  getTransactionsAndStreamsByAccountId,
  getTransactionsByAccountId,
  listAllForUser,
} from "./queries";
```

**Step 3: Verify build**

Run: `cd packages/backend && npx convex dev --once`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/backend/convex/transactions/queries.ts packages/backend/convex/transactions/index.ts
git commit -m "feat(transactions): add listAllForUser query for aggregated transactions

Fetches all transactions across user's connected accounts with source
info (institution name, card name, last 4). Supports filtering by
search, category, status, date range, card, and amount."
```

---

## Task 2: Page Route & Loading Skeleton

**Files:**
- Create: `apps/app/src/app/(app)/transactions/page.tsx`
- Create: `apps/app/src/app/(app)/transactions/loading.tsx`

**Step 1: Create the page route**

Create `apps/app/src/app/(app)/transactions/page.tsx`:

```tsx
import { TransactionsContent } from "@/components/transactions/TransactionsContent";

export default function TransactionsPage() {
  return <TransactionsContent />;
}
```

**Step 2: Create loading skeleton**

Create `apps/app/src/app/(app)/transactions/loading.tsx`:

```tsx
export default function TransactionsLoading() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header skeleton */}
      <div className="border-b border-secondary px-6 py-4">
        <div className="h-7 w-40 animate-pulse rounded bg-secondary" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-secondary/60" />
      </div>

      {/* Search and filters skeleton */}
      <div className="flex items-center gap-4 border-b border-secondary px-6 py-4">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-secondary" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-secondary" />
      </div>

      {/* Table skeleton */}
      <div className="flex-1 p-6">
        <div className="rounded-xl border border-secondary">
          {/* Header row */}
          <div className="flex items-center gap-4 border-b border-secondary bg-secondary/30 px-4 py-3">
            {[80, 200, 100, 160, 80, 100].map((width, i) => (
              <div
                key={i}
                style={{ width }}
                className="h-4 animate-pulse rounded bg-secondary"
              />
            ))}
          </div>
          {/* Data rows */}
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-secondary px-4 py-4 last:border-b-0"
            >
              <div className="h-4 w-20 animate-pulse rounded bg-secondary/60" />
              <div className="flex items-center gap-3 flex-1">
                <div className="h-8 w-8 animate-pulse rounded-full bg-secondary/60" />
                <div className="h-4 w-32 animate-pulse rounded bg-secondary/60" />
              </div>
              <div className="h-5 w-20 animate-pulse rounded-full bg-secondary/60" />
              <div className="flex flex-col items-center gap-1">
                <div className="h-8 w-8 animate-pulse rounded bg-secondary/60" />
                <div className="h-3 w-16 animate-pulse rounded bg-secondary/60" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-full bg-secondary/60" />
              <div className="h-4 w-20 animate-pulse rounded bg-secondary/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Verify the route loads**

Run: `npm run dev`
Navigate to: `http://localhost:3000/transactions`
Expected: Loading skeleton displays (will error on content since component doesn't exist yet)

**Step 4: Commit**

```bash
git add apps/app/src/app/\(app\)/transactions/
git commit -m "feat(transactions): add page route and loading skeleton"
```

---

## Task 3: Sidebar Navigation Item

**Files:**
- Modify: `apps/app/src/components/application/dashboard-sidebar.tsx`

**Step 1: Add Transactions nav item**

In `dashboard-sidebar.tsx`, find the `navItemsSimple` array (around line 90-108) and add a Transactions item after Credit Cards:

```tsx
// First, add the import at the top with other icons:
import { Receipt } from "@untitledui/icons";

// Then in navItemsSimple array, after Credit Cards:
{
    label: "Transactions",
    href: "/transactions",
    icon: Receipt,
},
```

The array should now look like:
```tsx
const navItemsSimple: NavItemType[] = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: BarChartSquare02,
    },
    // ... other items ...
    {
        label: "Credit Cards",
        href: "/credit-cards",
        icon: CreditCard01,
    },
    {
        label: "Transactions",
        href: "/transactions",
        icon: Receipt,
    },
    {
        label: "Wallets",
        href: "/wallets",
        icon: Wallet01,
    },
];
```

**Step 2: Add to command menu**

Find the CommandMenu section and add a Transactions item:

```tsx
<CommandMenu.Item id="transactions" label="Transactions" type="icon" icon={Receipt} />
```

**Step 3: Verify sidebar shows Transactions**

Run: `npm run dev`
Expected: "Transactions" appears in sidebar between Credit Cards and Wallets

**Step 4: Commit**

```bash
git add apps/app/src/components/application/dashboard-sidebar.tsx
git commit -m "feat(transactions): add sidebar navigation item"
```

---

## Task 4: TransactionsHeader Component

**Files:**
- Create: `apps/app/src/components/transactions/TransactionsHeader.tsx`

**Step 1: Create the header component**

Create `apps/app/src/components/transactions/TransactionsHeader.tsx`:

```tsx
"use client";

interface TransactionsHeaderProps {
  totalCount?: number;
}

/**
 * Header for the transactions page
 */
export function TransactionsHeader({ totalCount }: TransactionsHeaderProps) {
  return (
    <div className="border-b border-secondary px-6 py-4">
      <h1 className="text-display-xs font-semibold text-primary">
        Transactions
      </h1>
      <p className="text-sm text-tertiary">
        {totalCount !== undefined
          ? `${totalCount.toLocaleString()} transactions across all accounts`
          : "All transactions across your accounts"}
      </p>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/app/src/components/transactions/TransactionsHeader.tsx
git commit -m "feat(transactions): add TransactionsHeader component"
```

---

## Task 5: TransactionSourceCell Component

**Files:**
- Create: `apps/app/src/components/transactions/TransactionSourceCell.tsx`

**Step 1: Create the source cell component**

Create `apps/app/src/components/transactions/TransactionSourceCell.tsx`:

```tsx
"use client";

import { Avatar } from "@repo/ui/untitledui/base/avatar/avatar";
import { ChaseMark } from "@/components/credit-cards/primitives/bank-logos";

interface TransactionSourceCellProps {
  institutionName: string;
  cardDisplayName: string;
  lastFour?: string;
  brand?: string;
}

/**
 * Renders the Source column cell with bank logo + card name
 */
export function TransactionSourceCell({
  institutionName,
  cardDisplayName,
  lastFour,
}: TransactionSourceCellProps) {
  // Get institution logo component
  const InstitutionLogo = getInstitutionLogo(institutionName);

  return (
    <div className="flex items-center gap-3">
      {/* Institution Logo */}
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
        {InstitutionLogo ? (
          <InstitutionLogo className="h-6 w-6 text-primary" />
        ) : (
          <Avatar
            size="sm"
            initials={institutionName.charAt(0).toUpperCase()}
          />
        )}
      </div>

      {/* Card Info */}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-primary line-clamp-1">
          {cardDisplayName}
        </span>
        {lastFour && (
          <span className="text-xs text-tertiary">
            •••• {lastFour}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Get the logo component for an institution
 */
function getInstitutionLogo(institutionName: string) {
  const name = institutionName.toLowerCase();

  if (name.includes("chase")) {
    return ChaseMark;
  }

  // Add more institutions as needed:
  // if (name.includes("wells fargo")) return WellsFargoLogo;
  // if (name.includes("bank of america")) return BofALogo;
  // if (name.includes("apple")) return AppleLogo;

  return null;
}
```

**Step 2: Commit**

```bash
git add apps/app/src/components/transactions/TransactionSourceCell.tsx
git commit -m "feat(transactions): add TransactionSourceCell component"
```

---

## Task 6: TransactionsFilters Component (Expandable)

**Files:**
- Create: `apps/app/src/components/transactions/TransactionsFilters.tsx`

**Step 1: Create the expandable filters component**

Create `apps/app/src/components/transactions/TransactionsFilters.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { Key } from "react";
import type { DateValue } from "react-aria-components";
import type { RangeValue } from "@react-types/shared";
import type { Id } from "@convex/_generated/dataModel";
import { SearchMd, FilterLines, ChevronDown, ChevronUp, X } from "@untitledui/icons";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { Select } from "@repo/ui/untitledui/base/select/select";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { DateRangePicker } from "@repo/ui/untitledui/application/date-picker/date-range-picker";
import { TRANSACTION_CATEGORIES } from "@/types/credit-cards";
import { motion, AnimatePresence } from "motion/react";

const categoryItems = [
  { id: "all", label: "All Categories" },
  ...TRANSACTION_CATEGORIES.map((cat) => ({ id: cat, label: cat })),
];

const statusItems = [
  { id: "all", label: "All Status" },
  { id: "posted", label: "Posted" },
  { id: "pending", label: "Pending" },
];

const dateRangePresets = [
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
  { id: "year", label: "This year" },
  { id: "custom", label: "Custom" },
];

export interface TransactionsFiltersState {
  searchQuery: string;
  category: string;
  status: string;
  dateRange: RangeValue<DateValue> | null;
  cardIds: Id<"creditCards">[];
  amountMin?: number;
  amountMax?: number;
}

export const defaultTransactionsFilters: TransactionsFiltersState = {
  searchQuery: "",
  category: "all",
  status: "all",
  dateRange: null,
  cardIds: [],
  amountMin: undefined,
  amountMax: undefined,
};

interface CardOption {
  id: Id<"creditCards">;
  label: string;
  lastFour?: string;
}

interface TransactionsFiltersProps {
  filters: TransactionsFiltersState;
  onFiltersChange: (filters: TransactionsFiltersState) => void;
  cardOptions: CardOption[];
}

/**
 * Search and expandable filters for transactions page
 */
export function TransactionsFilters({
  filters,
  onFiltersChange,
  cardOptions,
}: TransactionsFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchQuery: value });
  };

  const handleCategoryChange = (key: Key | null) => {
    if (key !== null) {
      onFiltersChange({ ...filters, category: key as string });
    }
  };

  const handleStatusChange = (key: Key | null) => {
    if (key !== null) {
      onFiltersChange({ ...filters, status: key as string });
    }
  };

  const handleDateRangeChange = (range: RangeValue<DateValue> | null) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  const handleCardChange = (key: Key | null) => {
    if (key === null || key === "all") {
      onFiltersChange({ ...filters, cardIds: [] });
    } else {
      onFiltersChange({ ...filters, cardIds: [key as Id<"creditCards">] });
    }
  };

  const handleAmountMinChange = (value: string) => {
    const num = value ? parseFloat(value) : undefined;
    onFiltersChange({ ...filters, amountMin: num });
  };

  const handleAmountMaxChange = (value: string) => {
    const num = value ? parseFloat(value) : undefined;
    onFiltersChange({ ...filters, amountMax: num });
  };

  const handleClearFilters = () => {
    onFiltersChange(defaultTransactionsFilters);
  };

  const hasActiveFilters =
    filters.category !== "all" ||
    filters.status !== "all" ||
    filters.dateRange !== null ||
    filters.cardIds.length > 0 ||
    filters.amountMin !== undefined ||
    filters.amountMax !== undefined;

  const cardSelectItems = [
    { id: "all", label: "All Cards" },
    ...cardOptions.map((c) => ({
      id: c.id,
      label: c.lastFour ? `${c.label} •••• ${c.lastFour}` : c.label,
    })),
  ];

  return (
    <div className="border-b border-secondary">
      {/* Search and Filter Toggle Row */}
      <div className="flex items-center gap-3 px-6 py-4">
        {/* Search */}
        <div className="w-full max-w-xs">
          <Input
            placeholder="Search transactions..."
            icon={SearchMd}
            size="sm"
            value={filters.searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        {/* Filter Toggle Button */}
        <Button
          color={hasActiveFilters ? "primary" : "secondary"}
          size="sm"
          iconLeading={FilterLines}
          iconTrailing={isExpanded ? ChevronUp : ChevronDown}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          Filters
          {hasActiveFilters && (
            <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">
              {[
                filters.category !== "all",
                filters.status !== "all",
                filters.dateRange !== null,
                filters.cardIds.length > 0,
                filters.amountMin !== undefined || filters.amountMax !== undefined,
              ].filter(Boolean).length}
            </span>
          )}
        </Button>
      </div>

      {/* Expandable Filter Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-4 border-t border-secondary bg-secondary/20 px-6 py-4 md:grid-cols-3 lg:grid-cols-6">
              {/* Date Range */}
              <div className="col-span-2 md:col-span-1 lg:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-tertiary">
                  Date Range
                </label>
                <DateRangePicker
                  value={filters.dateRange}
                  onChange={handleDateRangeChange}
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-tertiary">
                  Category
                </label>
                <Select
                  items={categoryItems}
                  selectedKey={filters.category}
                  onSelectionChange={handleCategoryChange}
                  placeholder="All"
                  size="sm"
                >
                  {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                </Select>
              </div>

              {/* Source (Card) */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-tertiary">
                  Source
                </label>
                <Select
                  items={cardSelectItems}
                  selectedKey={filters.cardIds[0] ?? "all"}
                  onSelectionChange={handleCardChange}
                  placeholder="All Cards"
                  size="sm"
                >
                  {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                </Select>
              </div>

              {/* Status */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-tertiary">
                  Status
                </label>
                <Select
                  items={statusItems}
                  selectedKey={filters.status}
                  onSelectionChange={handleStatusChange}
                  placeholder="All"
                  size="sm"
                >
                  {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                </Select>
              </div>

              {/* Amount Range */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-tertiary">
                  Amount
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    size="sm"
                    value={filters.amountMin?.toString() ?? ""}
                    onChange={handleAmountMinChange}
                  />
                  <span className="text-tertiary">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    size="sm"
                    value={filters.amountMax?.toString() ?? ""}
                    onChange={handleAmountMaxChange}
                  />
                </div>
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex justify-end border-t border-secondary bg-secondary/20 px-6 py-2">
                <Button
                  color="link"
                  size="sm"
                  iconLeading={X}
                  onClick={handleClearFilters}
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/app/src/components/transactions/TransactionsFilters.tsx
git commit -m "feat(transactions): add expandable TransactionsFilters component"
```

---

## Task 7: TransactionsTable and Row Components

**Files:**
- Create: `apps/app/src/components/transactions/TransactionsTable.tsx`
- Create: `apps/app/src/components/transactions/TransactionsTableRow.tsx`

**Step 1: Create TransactionsTable**

Create `apps/app/src/components/transactions/TransactionsTable.tsx`:

```tsx
"use client";

import type { SortDescriptor } from "react-aria-components";
import { TableBody as AriaTableBody } from "react-aria-components";
import { Table, TableColumn } from "@repo/ui/untitledui/application/table/table";
import { TransactionsTableRow, type AggregatedTransaction } from "./TransactionsTableRow";

interface TransactionsTableProps {
  transactions: AggregatedTransaction[];
  sortDescriptor: SortDescriptor;
  onSortChange: (descriptor: SortDescriptor) => void;
  onSelectTransaction: (transaction: AggregatedTransaction) => void;
  isLoading?: boolean;
}

/**
 * Transactions table with sortable columns
 */
export function TransactionsTable({
  transactions,
  sortDescriptor,
  onSortChange,
  onSelectTransaction,
  isLoading,
}: TransactionsTableProps) {
  if (isLoading) {
    return <TransactionsTableSkeleton />;
  }

  return (
    <Table
      aria-label="Transactions"
      sortDescriptor={sortDescriptor}
      onSortChange={onSortChange}
      size="sm"
    >
      <Table.Header>
        <TableColumn id="date" allowsSorting className="w-[100px]">
          Date
        </TableColumn>
        <TableColumn id="merchant" allowsSorting>
          Merchant
        </TableColumn>
        <TableColumn id="category" allowsSorting className="w-[120px]">
          Category
        </TableColumn>
        <TableColumn id="source" className="w-[180px]">
          Source
        </TableColumn>
        <TableColumn id="status" className="w-[100px]">
          Status
        </TableColumn>
        <TableColumn id="amount" allowsSorting className="w-[120px] text-right">
          Amount
        </TableColumn>
      </Table.Header>

      <AriaTableBody
        items={transactions}
        renderEmptyState={() => (
          <div className="py-12 text-center text-tertiary">
            No transactions found
          </div>
        )}
      >
        {(transaction) => (
          <TransactionsTableRow
            key={transaction.transactionId}
            transaction={transaction}
            onSelect={onSelectTransaction}
          />
        )}
      </AriaTableBody>
    </Table>
  );
}

function TransactionsTableSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-secondary bg-secondary/30 px-4 py-3">
        {[80, 200, 100, 160, 80, 100].map((width, i) => (
          <div
            key={i}
            style={{ width }}
            className="h-4 rounded bg-secondary"
          />
        ))}
      </div>
      {/* Rows */}
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-secondary px-4 py-4 last:border-b-0"
        >
          <div className="h-4 w-20 rounded bg-secondary/60" />
          <div className="flex items-center gap-3 flex-1">
            <div className="h-8 w-8 rounded-full bg-secondary/60" />
            <div className="h-4 w-32 rounded bg-secondary/60" />
          </div>
          <div className="h-5 w-20 rounded-full bg-secondary/60" />
          <div className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded bg-secondary/60" />
            <div className="h-3 w-16 rounded bg-secondary/60" />
          </div>
          <div className="h-5 w-16 rounded-full bg-secondary/60" />
          <div className="h-4 w-20 rounded bg-secondary/60" />
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Create TransactionsTableRow**

Create `apps/app/src/components/transactions/TransactionsTableRow.tsx`:

```tsx
"use client";

import { Table } from "@repo/ui/untitledui/application/table/table";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { Avatar } from "@repo/ui/untitledui/base/avatar/avatar";
import { TransactionSourceCell } from "./TransactionSourceCell";
import { MerchantLogo } from "@/components/credit-cards/MerchantLogo";
import {
  formatTransactionDate,
  formatDisplayCurrency,
  getCategoryBadgeColor,
  type TransactionCategory,
} from "@/types/credit-cards";

export interface AggregatedTransaction {
  _id?: string;
  transactionId: string;
  accountId: string;
  amount: number;
  date: string;
  name: string;
  merchantName?: string;
  pending: boolean;
  categoryPrimary?: string;
  categoryDetailed?: string;
  merchantEnrichment?: {
    merchantName: string;
    logoUrl?: string;
    categoryPrimary?: string;
    categoryIconUrl?: string;
    confidenceLevel: string;
  } | null;
  source: {
    cardId: string;
    displayName: string;
    lastFour?: string;
    brand?: string;
    institutionName: string;
  };
}

interface TransactionsTableRowProps {
  transaction: AggregatedTransaction;
  onSelect: (transaction: AggregatedTransaction) => void;
}

/**
 * Map Plaid category to our TransactionCategory
 */
function mapCategory(category?: string): TransactionCategory {
  if (!category) return "Other";

  const categoryUpper = category.toUpperCase();
  const mapping: Record<string, TransactionCategory> = {
    FOOD_AND_DRINK: "Dining",
    TRAVEL: "Travel",
    TRANSPORTATION: "Transportation",
    ENTERTAINMENT: "Entertainment",
    GENERAL_MERCHANDISE: "Shopping",
    GENERAL_SERVICES: "Other",
    HOME_IMPROVEMENT: "Shopping",
    MEDICAL: "Healthcare",
    PERSONAL_CARE: "Healthcare",
    RENT_AND_UTILITIES: "Utilities",
    TRANSFER_IN: "Transfers",
    TRANSFER_OUT: "Transfers",
    LOAN_PAYMENTS: "Payments",
    BANK_FEES: "Fees",
    INCOME: "Income",
  };

  return mapping[categoryUpper] ?? "Other";
}

/**
 * Single transaction row for the aggregated transactions table
 */
export function TransactionsTableRow({
  transaction,
  onSelect,
}: TransactionsTableRowProps) {
  const merchantName =
    transaction.merchantEnrichment?.merchantName ??
    transaction.merchantName ??
    transaction.name;

  const category = mapCategory(transaction.categoryPrimary);
  const status = transaction.pending ? "Pending" : "Posted";

  // Amount display: negative for charges, positive for refunds
  const displayAmount = Math.abs(transaction.amount) / 1000; // Convert from milliunits
  const isRefund = transaction.amount < 0;

  return (
    <Table.Row
      id={transaction.transactionId}
      className="cursor-pointer"
      onAction={() => onSelect(transaction)}
    >
      {/* Date */}
      <Table.Cell className="text-sm text-secondary tabular-nums">
        {formatTransactionDate(transaction.date)}
      </Table.Cell>

      {/* Merchant */}
      <Table.Cell>
        <div className="flex items-center gap-3">
          {transaction.merchantEnrichment?.logoUrl ? (
            <MerchantLogo
              logoUrl={transaction.merchantEnrichment.logoUrl}
              merchantName={merchantName}
              size="sm"
            />
          ) : (
            <Avatar
              size="sm"
              initials={merchantName.charAt(0).toUpperCase()}
            />
          )}
          <span className="text-sm font-medium text-primary line-clamp-1">
            {merchantName}
          </span>
        </div>
      </Table.Cell>

      {/* Category */}
      <Table.Cell>
        <Badge color={getCategoryBadgeColor(category)} size="sm">
          {category}
        </Badge>
      </Table.Cell>

      {/* Source */}
      <Table.Cell>
        <TransactionSourceCell
          institutionName={transaction.source.institutionName}
          cardDisplayName={transaction.source.displayName}
          lastFour={transaction.source.lastFour}
          brand={transaction.source.brand}
        />
      </Table.Cell>

      {/* Status */}
      <Table.Cell>
        <Badge
          color={status === "Posted" ? "gray" : "warning"}
          size="sm"
        >
          {status}
        </Badge>
      </Table.Cell>

      {/* Amount */}
      <Table.Cell className="text-right">
        <span
          className={`text-sm font-medium tabular-nums ${
            isRefund ? "text-utility-success-600" : "text-primary"
          }`}
        >
          {isRefund ? "+" : "-"}
          {formatDisplayCurrency(displayAmount)}
        </span>
      </Table.Cell>
    </Table.Row>
  );
}
```

**Step 3: Commit**

```bash
git add apps/app/src/components/transactions/TransactionsTable.tsx apps/app/src/components/transactions/TransactionsTableRow.tsx
git commit -m "feat(transactions): add TransactionsTable and TableRow components"
```

---

## Task 8: TransactionsPagination Component

**Files:**
- Create: `apps/app/src/components/transactions/TransactionsPagination.tsx`

**Step 1: Create pagination component**

Create `apps/app/src/components/transactions/TransactionsPagination.tsx`:

```tsx
"use client";

import { ChevronLeft, ChevronRight } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";

interface TransactionsPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/**
 * Pagination controls for transactions table
 */
export function TransactionsPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
}: TransactionsPaginationProps) {
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    const showPages = 5;

    if (totalPages <= showPages) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (page > 3) {
        pages.push("...");
      }

      // Show pages around current
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-secondary px-6 py-4">
      {/* Showing X-Y of Z */}
      <p className="text-sm text-tertiary">
        Showing {startItem.toLocaleString()}-{endItem.toLocaleString()} of{" "}
        {totalCount.toLocaleString()}
      </p>

      {/* Page Controls */}
      <div className="flex items-center gap-2">
        {/* Previous */}
        <Button
          color="secondary"
          size="sm"
          iconLeading={ChevronLeft}
          isDisabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((pageNum, idx) =>
            pageNum === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-tertiary">
                ...
              </span>
            ) : (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[32px] rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  pageNum === page
                    ? "bg-brand-primary text-white"
                    : "text-tertiary hover:bg-secondary hover:text-primary"
                }`}
              >
                {pageNum}
              </button>
            )
          )}
        </div>

        {/* Next */}
        <Button
          color="secondary"
          size="sm"
          iconTrailing={ChevronRight}
          isDisabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/app/src/components/transactions/TransactionsPagination.tsx
git commit -m "feat(transactions): add TransactionsPagination component"
```

---

## Task 9: TransactionDetailDrawer Component

**Files:**
- Create: `apps/app/src/components/transactions/TransactionDetailDrawer.tsx`

**Step 1: Create the detail drawer**

Create `apps/app/src/components/transactions/TransactionDetailDrawer.tsx`:

```tsx
"use client";

import Link from "next/link";
import { DialogTrigger } from "react-aria-components";
import { ArrowRight } from "@untitledui/icons";
import { SlideoutMenu } from "@repo/ui/untitledui/application/slideout-menus/slideout-menu";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { MerchantLogo } from "@/components/credit-cards/MerchantLogo";
import { TransactionSourceCell } from "./TransactionSourceCell";
import type { AggregatedTransaction } from "./TransactionsTableRow";
import {
  formatDisplayCurrency,
  formatTransactionDateFull,
  getCategoryBadgeColor,
  type TransactionCategory,
} from "@/types/credit-cards";

interface TransactionDetailDrawerProps {
  transaction: AggregatedTransaction | null;
  onClose: () => void;
}

function mapCategory(category?: string): TransactionCategory {
  if (!category) return "Other";
  const categoryUpper = category.toUpperCase();
  const mapping: Record<string, TransactionCategory> = {
    FOOD_AND_DRINK: "Dining",
    TRAVEL: "Travel",
    TRANSPORTATION: "Transportation",
    ENTERTAINMENT: "Entertainment",
    GENERAL_MERCHANDISE: "Shopping",
    GENERAL_SERVICES: "Other",
    HOME_IMPROVEMENT: "Shopping",
    MEDICAL: "Healthcare",
    PERSONAL_CARE: "Healthcare",
    RENT_AND_UTILITIES: "Utilities",
    TRANSFER_IN: "Transfers",
    TRANSFER_OUT: "Transfers",
    LOAN_PAYMENTS: "Payments",
    BANK_FEES: "Fees",
    INCOME: "Income",
  };
  return mapping[categoryUpper] ?? "Other";
}

/**
 * Transaction detail slideout drawer for the aggregated transactions page
 */
export function TransactionDetailDrawer({
  transaction,
  onClose,
}: TransactionDetailDrawerProps) {
  if (!transaction) return null;

  const merchantName =
    transaction.merchantEnrichment?.merchantName ??
    transaction.merchantName ??
    transaction.name;

  const category = mapCategory(transaction.categoryPrimary);
  const status = transaction.pending ? "Pending" : "Posted";
  const displayAmount = Math.abs(transaction.amount) / 1000;
  const isRefund = transaction.amount < 0;

  return (
    <DialogTrigger isOpen={transaction !== null} onOpenChange={(open) => !open && onClose()}>
      <SlideoutMenu>
        {({ close }) => (
          <>
            <SlideoutMenu.Header onClose={close}>
              <div className="pr-10">
                <h2 className="text-lg font-semibold text-primary">
                  Transaction Details
                </h2>
                <p className="mt-0.5 text-sm text-tertiary">
                  {formatTransactionDateFull(transaction.date)}
                </p>
              </div>
            </SlideoutMenu.Header>

            <SlideoutMenu.Content>
              <div className="flex flex-col gap-6 py-2">
                {/* Merchant Info */}
                <div className="flex items-center gap-4 border-b border-secondary pb-6">
                  <MerchantLogo
                    logoUrl={transaction.merchantEnrichment?.logoUrl}
                    merchantName={merchantName}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-primary truncate">
                      {merchantName}
                    </h3>
                    <Badge
                      type="pill-color"
                      size="sm"
                      color={getCategoryBadgeColor(category)}
                      className="mt-1"
                    >
                      {category}
                    </Badge>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between border-b border-secondary pb-6">
                  <span className="text-sm font-medium text-tertiary">Amount</span>
                  <span
                    className={`text-2xl font-bold tabular-nums ${
                      isRefund ? "text-utility-success-600" : "text-primary"
                    }`}
                  >
                    {isRefund ? "+" : "-"}
                    {formatDisplayCurrency(displayAmount)}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-0">
                  <DetailRow label="Status">
                    <Badge
                      type="pill-color"
                      size="sm"
                      color={status === "Pending" ? "warning" : "gray"}
                    >
                      {status}
                    </Badge>
                  </DetailRow>

                  <DetailRow label="Date">
                    <span className="text-sm font-medium text-primary">
                      {formatTransactionDateFull(transaction.date)}
                    </span>
                  </DetailRow>

                  <DetailRow label="Category">
                    <Badge
                      type="pill-color"
                      size="sm"
                      color={getCategoryBadgeColor(category)}
                    >
                      {category}
                    </Badge>
                  </DetailRow>
                </div>

                {/* Source Card */}
                <div className="space-y-3 border-t border-secondary pt-6">
                  <span className="text-sm font-medium text-tertiary">Source</span>
                  <div className="flex items-center justify-between">
                    <TransactionSourceCell
                      institutionName={transaction.source.institutionName}
                      cardDisplayName={transaction.source.displayName}
                      lastFour={transaction.source.lastFour}
                      brand={transaction.source.brand}
                    />
                    <Link href={`/credit-cards/${transaction.source.cardId}`}>
                      <Button
                        color="link"
                        size="sm"
                        iconTrailing={ArrowRight}
                      >
                        View card
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Description if different from merchant name */}
                {transaction.name !== merchantName && (
                  <div className="space-y-2 border-t border-secondary pt-6">
                    <span className="text-sm font-medium text-tertiary">
                      Original Description
                    </span>
                    <p className="text-sm text-secondary">
                      {transaction.name}
                    </p>
                  </div>
                )}
              </div>
            </SlideoutMenu.Content>
          </>
        )}
      </SlideoutMenu>
    </DialogTrigger>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-secondary last:border-b-0">
      <span className="text-sm font-medium text-tertiary">{label}</span>
      {children}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/app/src/components/transactions/TransactionDetailDrawer.tsx
git commit -m "feat(transactions): add TransactionDetailDrawer component"
```

---

## Task 10: TransactionsContent Main Component

**Files:**
- Create: `apps/app/src/components/transactions/TransactionsContent.tsx`
- Create: `apps/app/src/components/transactions/index.ts`

**Step 1: Create the main content component**

Create `apps/app/src/components/transactions/TransactionsContent.tsx`:

```tsx
"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { SortDescriptor } from "react-aria-components";
import { TransactionsHeader } from "./TransactionsHeader";
import {
  TransactionsFilters,
  defaultTransactionsFilters,
  type TransactionsFiltersState,
} from "./TransactionsFilters";
import { TransactionsTable } from "./TransactionsTable";
import { TransactionsPagination } from "./TransactionsPagination";
import { TransactionDetailDrawer } from "./TransactionDetailDrawer";
import type { AggregatedTransaction } from "./TransactionsTableRow";

const PAGE_SIZE = 50;

/**
 * Main content component for the /transactions page
 */
export function TransactionsContent() {
  // Filter state
  const [filters, setFilters] = useState<TransactionsFiltersState>(
    defaultTransactionsFilters
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Sort state
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "date",
    direction: "descending",
  });

  // Selected transaction for detail drawer
  const [selectedTransaction, setSelectedTransaction] =
    useState<AggregatedTransaction | null>(null);

  // Build query args from filter state
  const queryArgs = useMemo(() => {
    const args: {
      page: number;
      pageSize: number;
      searchQuery?: string;
      category?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      cardIds?: string[];
      amountMin?: number;
      amountMax?: number;
    } = {
      page: currentPage,
      pageSize: PAGE_SIZE,
    };

    if (filters.searchQuery) {
      args.searchQuery = filters.searchQuery;
    }
    if (filters.category !== "all") {
      args.category = filters.category;
    }
    if (filters.status !== "all") {
      args.status = filters.status;
    }
    if (filters.dateRange?.start && filters.dateRange?.end) {
      args.dateFrom = filters.dateRange.start.toString();
      args.dateTo = filters.dateRange.end.toString();
    }
    if (filters.cardIds.length > 0) {
      args.cardIds = filters.cardIds;
    }
    if (filters.amountMin !== undefined) {
      args.amountMin = filters.amountMin * 1000; // Convert to milliunits
    }
    if (filters.amountMax !== undefined) {
      args.amountMax = filters.amountMax * 1000; // Convert to milliunits
    }

    return args;
  }, [filters, currentPage]);

  // Fetch transactions
  const transactionsResult = useQuery(
    api.transactions.queries.listAllForUser,
    queryArgs
  );

  // Fetch user's cards for filter dropdown
  const creditCards = useQuery(api.creditCards.queries.list, {});

  // Card options for filter
  const cardOptions = useMemo(() => {
    if (!creditCards) return [];
    return creditCards.map((card) => ({
      id: card._id,
      label: card.displayName,
      lastFour: card.lastFour,
    }));
  }, [creditCards]);

  // Apply client-side sorting (server already sorts by date desc)
  const sortedTransactions = useMemo(() => {
    if (!transactionsResult?.items) return [];

    const items = [...transactionsResult.items];
    const column = sortDescriptor.column as string;
    const direction = sortDescriptor.direction;

    // Only sort if not default (date descending)
    if (column === "date" && direction === "descending") {
      return items;
    }

    items.sort((a, b) => {
      let comparison = 0;

      switch (column) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "merchant":
          const merchantA = a.merchantEnrichment?.merchantName ?? a.merchantName ?? a.name;
          const merchantB = b.merchantEnrichment?.merchantName ?? b.merchantName ?? b.name;
          comparison = merchantA.localeCompare(merchantB);
          break;
        case "category":
          comparison = (a.categoryPrimary ?? "").localeCompare(b.categoryPrimary ?? "");
          break;
        case "amount":
          comparison = Math.abs(a.amount) - Math.abs(b.amount);
          break;
        default:
          comparison = 0;
      }

      return direction === "descending" ? -comparison : comparison;
    });

    return items;
  }, [transactionsResult?.items, sortDescriptor]);

  // Handle filter changes - reset to page 1
  const handleFiltersChange = useCallback((newFilters: TransactionsFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // Handle sort changes
  const handleSortChange = useCallback((descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
  }, []);

  // Handle page changes
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const isLoading = transactionsResult === undefined;

  return (
    <div className="flex flex-1 flex-col">
      <TransactionsHeader totalCount={transactionsResult?.pagination.totalCount} />

      <TransactionsFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        cardOptions={cardOptions}
      />

      <div className="flex-1 overflow-auto">
        <TransactionsTable
          transactions={sortedTransactions as AggregatedTransaction[]}
          sortDescriptor={sortDescriptor}
          onSortChange={handleSortChange}
          onSelectTransaction={setSelectedTransaction}
          isLoading={isLoading}
        />
      </div>

      {transactionsResult && (
        <TransactionsPagination
          page={transactionsResult.pagination.page}
          totalPages={transactionsResult.pagination.totalPages}
          totalCount={transactionsResult.pagination.totalCount}
          pageSize={transactionsResult.pagination.pageSize}
          onPageChange={handlePageChange}
        />
      )}

      <TransactionDetailDrawer
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}
```

**Step 2: Create index.ts for exports**

Create `apps/app/src/components/transactions/index.ts`:

```typescript
export { TransactionsContent } from "./TransactionsContent";
export { TransactionsHeader } from "./TransactionsHeader";
export { TransactionsFilters, defaultTransactionsFilters } from "./TransactionsFilters";
export type { TransactionsFiltersState } from "./TransactionsFilters";
export { TransactionsTable } from "./TransactionsTable";
export { TransactionsTableRow } from "./TransactionsTableRow";
export type { AggregatedTransaction } from "./TransactionsTableRow";
export { TransactionsPagination } from "./TransactionsPagination";
export { TransactionSourceCell } from "./TransactionSourceCell";
export { TransactionDetailDrawer } from "./TransactionDetailDrawer";
```

**Step 3: Verify the page loads**

Run: `npm run dev`
Navigate to: `http://localhost:3000/transactions`
Expected: Page loads with transactions table, filters work, pagination works, clicking row opens drawer

**Step 4: Commit**

```bash
git add apps/app/src/components/transactions/
git commit -m "feat(transactions): add TransactionsContent main component and exports"
```

---

## Task 11: Final Testing & Polish

**Files:**
- All transaction components

**Step 1: Test all functionality**

1. Navigate to `/transactions`
2. Verify table loads with transactions from all cards
3. Test search filter - search for a merchant name
4. Test expandable filters - click "Filters" button
5. Test category filter
6. Test status filter (Posted/Pending)
7. Test source filter (select specific card)
8. Test date range filter
9. Test pagination - navigate pages
10. Test row click - verify drawer opens with correct data
11. Test "View card" link in drawer - navigates to card detail

**Step 2: Verify sidebar navigation**

1. Click "Transactions" in sidebar
2. Verify it navigates to `/transactions`
3. Verify active state shows correctly

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(transactions): complete transactions page implementation

- Aggregated transactions view across all connected accounts
- Source column with bank logo and card name
- Expandable filters (search, date, category, source, status, amount)
- Paginated table with 50 items per page
- Transaction detail slideout drawer
- Sidebar navigation integration"
```

---

## Summary

| Task | Component | Status |
|------|-----------|--------|
| 1 | Backend listAllForUser query | |
| 2 | Page route & loading skeleton | |
| 3 | Sidebar navigation item | |
| 4 | TransactionsHeader | |
| 5 | TransactionSourceCell | |
| 6 | TransactionsFilters (expandable) | |
| 7 | TransactionsTable & TableRow | |
| 8 | TransactionsPagination | |
| 9 | TransactionDetailDrawer | |
| 10 | TransactionsContent (main) | |
| 11 | Final testing & polish | |

Total: 11 tasks

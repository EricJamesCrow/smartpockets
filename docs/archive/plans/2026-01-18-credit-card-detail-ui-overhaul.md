# Credit Card Detail Page UI Overhaul Implementation Plan

> **Status:** ✅ COMPLETED (2026-01-18)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Match the credit card detail page layout to SmartPockets reference, adding improved header, key metrics row with vertical dividers, proper UntitledUI Table component with sorting/pagination, and a simple AutoPay toggle.

**Architecture:** Refactor `CreditCardDetailContent.tsx` to use a new modular structure: updated header with payment due info, standalone `KeyMetrics` component with vertical dividers, refactored `TransactionsSection` using UntitledUI `Table` component with proper sorting/filtering/pagination, and a new `AutoPayToggle` component.

**Tech Stack:** Next.js 15, React 19, UntitledUI components, React Aria (SortDescriptor), Convex, Motion React

---

## Task 1: Update Page Header with Card Subtitle and Payment Due

**Files:**
- Modify: `apps/app/src/components/credit-cards/CreditCardDetailContent.tsx:139-157`

**Step 1: Update header section with new layout**

Replace the breadcrumb header section to include:
- Title: Card name (larger)
- Subtitle line: `{accountType} • {brand} •••• {lastFour}`
- Right side: Payment due date with badge

```tsx
{/* Header with Card Info and Payment Due */}
<div className="border-b border-secondary bg-primary px-4 py-4 lg:px-6">
  <div className="flex items-center justify-between">
    {/* Left: Breadcrumbs */}
    <Breadcrumbs divider="chevron">
      <Breadcrumbs.Item href="/credit-cards" icon={CreditCard02} onClick={handleBack}>
        Credit Cards
      </Breadcrumbs.Item>
      <Breadcrumbs.Item>
        {card.cardName}
      </Breadcrumbs.Item>
    </Breadcrumbs>

    {/* Right: Status Badges */}
    <div className="flex items-center gap-3">
      <CreditCardStatusBadge
        isLocked={card.isLocked}
        isActive={card.isActive}
        isOverdue={card.isOverdue}
      />
    </div>
  </div>

  {/* Card Title and Subtitle */}
  <div className="mt-4 flex items-start justify-between">
    <div>
      <h1 className="text-2xl font-bold text-primary lg:text-3xl">
        {card.cardName}
      </h1>
      <p className="mt-1 text-sm text-tertiary">
        CREDIT • {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} •••• {card.lastFour}
      </p>
    </div>

    {/* Payment Due Info */}
    <div className="flex flex-col items-end gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-tertiary">
        Payment Due
      </span>
      <span className="text-base font-semibold text-primary">
        {card.nextPaymentDueDate ? formatDueDate(card.nextPaymentDueDate) : "--"}
      </span>
      <PaymentDueBadge
        nextPaymentDueDate={card.nextPaymentDueDate}
        isOverdue={card.isOverdue}
      />
    </div>
  </div>
</div>
```

**Step 2: Add formatDueDate import**

Add to imports at top of file:

```tsx
import {
  formatDisplayCurrency,
  formatApr,
  formatDueDate,  // Add this
  getUtilizationLevel,
  toExtendedCreditCard,
} from "@/types/credit-cards";
```

**Step 3: Run type check**

Run: `cd apps/app && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/app/src/components/credit-cards/CreditCardDetailContent.tsx
git commit -m "$(cat <<'EOF'
feat(credit-cards): update detail page header with card subtitle and payment due

- Add card type/brand/last4 subtitle line
- Move payment due date with badge to header right side
- Match SmartPockets layout structure

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create KeyMetrics Component

**Files:**
- Create: `apps/app/src/components/credit-cards/KeyMetrics.tsx`

**Step 1: Create the KeyMetrics component**

```tsx
"use client";

import { useMemo } from "react";
import { cx } from "@repo/ui/utils";
import {
  formatDisplayCurrency,
  formatApr,
  formatPercentage,
  formatDueDate,
  getUtilizationColor,
} from "@/types/credit-cards";
import type { ExtendedCreditCardData, Transaction } from "@/types/credit-cards";

interface KeyMetricsProps {
  card: ExtendedCreditCardData;
  transactions?: Transaction[];
}

/**
 * Key Metrics Row - 4-column horizontal layout with vertical dividers
 * Matches SmartPockets design pattern
 */
export function KeyMetrics({ card, transactions = [] }: KeyMetricsProps) {
  // Calculate pending charges total
  const pendingTotal = useMemo(() => {
    return transactions
      .filter((txn) => txn.status === "Pending")
      .reduce((sum, txn) => sum + txn.amount, 0);
  }, [transactions]);

  const pendingCount = useMemo(() => {
    return transactions.filter((txn) => txn.status === "Pending").length;
  }, [transactions]);

  // Calculate available credit percentage
  const availablePercent =
    card.creditLimit && card.availableCredit
      ? Math.round((card.availableCredit / card.creditLimit) * 100)
      : null;

  // Calculate recommended payment (statement balance or current balance)
  const recommendedPayment = card.lastStatementBalance ?? card.currentBalance ?? 0;

  return (
    <div className="border-y border-secondary bg-primary">
      <div className="px-4 py-4 lg:px-6">
        {/* Key Metrics - 4 columns with vertical dividers on lg+ */}
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:flex lg:flex-row lg:gap-0">
          {/* Current Balance */}
          <div className="flex flex-1 flex-col gap-1 lg:pr-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-tertiary">Current Balance</p>
              {card.utilization !== null && (
                <span className={cx("text-sm font-medium", getUtilizationColor(card.utilization))}>
                  {formatPercentage(card.utilization, 0)}
                </span>
              )}
            </div>
            <p className="text-xl font-semibold text-primary tabular-nums lg:text-2xl">
              {formatDisplayCurrency(card.currentBalance)}
            </p>
            <div className="flex flex-col gap-0.5 text-xs text-tertiary">
              <span>of {formatDisplayCurrency(card.creditLimit)}</span>
              {pendingTotal > 0 && (
                <span className="font-medium text-utility-warning-600">
                  {formatDisplayCurrency(pendingTotal)} pending ({pendingCount}{" "}
                  {pendingCount === 1 ? "charge" : "charges"})
                </span>
              )}
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="hidden w-px self-stretch bg-secondary lg:block" />

          {/* Minimum Payment */}
          <div className="flex flex-1 flex-col gap-1 lg:px-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-tertiary">Minimum Payment</p>
              <span className="text-xs text-tertiary">
                Due {card.nextPaymentDueDate ? formatDueDate(card.nextPaymentDueDate) : "--"}
              </span>
            </div>
            <p className="text-xl font-semibold text-primary tabular-nums lg:text-2xl">
              {formatDisplayCurrency(card.minimumPaymentAmount)}
            </p>
            <p className="text-xs text-tertiary">
              Recommended: {formatDisplayCurrency(recommendedPayment)}
            </p>
          </div>

          {/* Vertical Divider */}
          <div className="hidden w-px self-stretch bg-secondary lg:block" />

          {/* APR (Purchase) */}
          <div className="flex flex-1 flex-col gap-1 lg:px-6">
            <p className="text-sm font-medium text-tertiary">APR (Purchase)</p>
            <p className="text-xl font-semibold text-primary tabular-nums lg:text-2xl">
              {formatApr(card.apr)}
            </p>
            <p className="text-xs text-tertiary">Annual Percentage Rate</p>
          </div>

          {/* Vertical Divider */}
          <div className="hidden w-px self-stretch bg-secondary lg:block" />

          {/* Available Credit */}
          <div className="flex flex-1 flex-col gap-1 lg:pl-6">
            <p className="text-sm font-medium text-tertiary">Available Credit</p>
            <p className="text-xl font-semibold text-primary tabular-nums lg:text-2xl">
              {formatDisplayCurrency(card.availableCredit)}
            </p>
            <p className="text-xs text-tertiary">
              {availablePercent !== null ? `${availablePercent}% of limit` : "--"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Run type check**

Run: `cd apps/app && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/app/src/components/credit-cards/KeyMetrics.tsx
git commit -m "$(cat <<'EOF'
feat(credit-cards): add KeyMetrics component with 4-column layout

- 4 metrics: Current Balance, Minimum Payment, APR, Available Credit
- Vertical dividers between columns on desktop
- Pending charges indicator
- Recommended payment amount
- Matches SmartPockets design pattern

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create AutoPayToggle Component

**Files:**
- Create: `apps/app/src/components/credit-cards/AutoPayToggle.tsx`

**Step 1: Create simple AutoPayToggle component**

```tsx
"use client";

import { useState } from "react";
import { Switch } from "@repo/ui/untitledui/base/switch/switch";
import { Tooltip, TooltipTrigger } from "@repo/ui/untitledui/base/tooltip/tooltip";
import { HelpCircle } from "@untitledui/icons";
import { cx } from "@repo/ui/utils";

interface AutoPayToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Simple AutoPay toggle with tooltip
 *
 * Note: This is a UI-only component. The backend autopay detection
 * and persistence (autoPaySettings table) is not yet implemented.
 * Currently stores state locally.
 */
export function AutoPayToggle({
  enabled,
  onToggle,
  isLoading = false,
  className,
}: AutoPayToggleProps) {
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <span className="text-sm font-medium text-tertiary">AutoPay</span>
      <Switch
        isSelected={enabled}
        onChange={onToggle}
        isDisabled={isLoading}
        size="sm"
      />
      <Tooltip
        title="AutoPay automatically pays your bill each month. Enable to avoid late fees."
        placement="top"
      >
        <TooltipTrigger className="cursor-pointer text-tertiary transition hover:text-secondary">
          <HelpCircle className="size-4" />
        </TooltipTrigger>
      </Tooltip>
    </div>
  );
}

/**
 * Hook to manage AutoPay state
 *
 * TODO: Replace with Convex mutation when autoPaySettings table is added
 */
export function useAutoPay(accountId: string) {
  // For now, use local state. In the future, this will use Convex
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggle = async (newState: boolean) => {
    setIsLoading(true);
    try {
      // TODO: Call Convex mutation here
      // await toggleAutoPay({ accountId, enabled: newState });
      setEnabled(newState);
    } finally {
      setIsLoading(false);
    }
  };

  return { enabled, isLoading, toggle };
}
```

**Step 2: Run type check**

Run: `cd apps/app && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/app/src/components/credit-cards/AutoPayToggle.tsx
git commit -m "$(cat <<'EOF'
feat(credit-cards): add AutoPayToggle component with local state

- Simple toggle UI with tooltip explanation
- Local state management (backend not yet implemented)
- Prepared for future Convex integration

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create TransactionTableHeader Component with Sorting

**Files:**
- Create: `apps/app/src/components/credit-cards/TransactionTableHeader.tsx`

**Step 1: Create sortable table header component**

```tsx
"use client";

import type { SortDescriptor } from "react-aria-components";
import { Table } from "@repo/ui/untitledui/application/table/table";

export type TransactionSortColumn = "date" | "merchant" | "category" | "amount" | "status";

interface TransactionTableHeaderProps {
  sortDescriptor: SortDescriptor;
  onSortChange: (descriptor: SortDescriptor) => void;
}

/**
 * Transaction table header with sortable columns
 * Uses UntitledUI Table.Header with react-aria sorting
 */
export function TransactionTableHeader({
  sortDescriptor,
  onSortChange,
}: TransactionTableHeaderProps) {
  return (
    <Table.Header>
      <Table.Head
        id="date"
        allowsSorting
        label="Date"
        className="w-[100px]"
      />
      <Table.Head
        id="merchant"
        allowsSorting
        label="Merchant"
        className="min-w-[200px]"
      />
      <Table.Head
        id="category"
        allowsSorting
        label="Category"
        className="w-[140px]"
      />
      <Table.Head
        id="amount"
        allowsSorting
        label="Amount"
        className="w-[100px] text-right"
      />
      <Table.Head
        id="status"
        allowsSorting
        label="Status"
        className="w-[100px]"
      />
      <Table.Head
        id="notes"
        label="Notes"
        className="min-w-[150px]"
      />
    </Table.Header>
  );
}
```

**Step 2: Run type check**

Run: `cd apps/app && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/app/src/components/credit-cards/TransactionTableHeader.tsx
git commit -m "$(cat <<'EOF'
feat(credit-cards): add TransactionTableHeader with sortable columns

- Uses UntitledUI Table.Header component
- Sortable: date, merchant, category, amount, status
- Non-sortable: notes

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Create TransactionTableRow Component

**Files:**
- Create: `apps/app/src/components/credit-cards/TransactionTableRow.tsx`

**Step 1: Create table row component using UntitledUI Table**

```tsx
"use client";

import { Table } from "@repo/ui/untitledui/application/table/table";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { Avatar } from "@repo/ui/untitledui/base/avatar/avatar";
import { cx } from "@repo/ui/utils";
import { MerchantLogo } from "./MerchantLogo";
import {
  formatTransactionDate,
  formatDisplayCurrency,
  getCategoryBadgeColor,
  type Transaction,
} from "@/types/credit-cards";

interface TransactionTableRowProps {
  transaction: Transaction;
  onSelect: (transaction: Transaction) => void;
}

/**
 * Single transaction row using UntitledUI Table.Row
 */
export function TransactionTableRow({ transaction, onSelect }: TransactionTableRowProps) {
  return (
    <Table.Row
      id={transaction.id}
      className="cursor-pointer"
      onAction={() => onSelect(transaction)}
    >
      {/* Date */}
      <Table.Cell className="text-sm text-secondary tabular-nums">
        {formatTransactionDate(transaction.date)}
      </Table.Cell>

      {/* Merchant with Avatar/Logo */}
      <Table.Cell>
        <div className="flex items-center gap-3">
          {transaction.merchantEnrichment?.logoUrl ? (
            <MerchantLogo
              logoUrl={transaction.merchantEnrichment.logoUrl}
              merchantName={transaction.merchant}
              size="sm"
            />
          ) : (
            <Avatar
              size="sm"
              initials={transaction.merchant.charAt(0).toUpperCase()}
              color="gray"
            />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-primary">
              {transaction.merchant}
            </span>
            {transaction.isRecurring && (
              <span className="text-xs text-tertiary">
                {transaction.recurringFrequency}
              </span>
            )}
          </div>
        </div>
      </Table.Cell>

      {/* Category */}
      <Table.Cell>
        <Badge color={getCategoryBadgeColor(transaction.category)} size="sm">
          {transaction.category}
        </Badge>
      </Table.Cell>

      {/* Amount */}
      <Table.Cell className="text-right">
        <span className="text-sm font-medium text-primary tabular-nums">
          {formatDisplayCurrency(transaction.amount)}
        </span>
      </Table.Cell>

      {/* Status */}
      <Table.Cell>
        <Badge
          color={transaction.status === "Posted" ? "success" : "warning"}
          size="sm"
        >
          {transaction.status}
        </Badge>
      </Table.Cell>

      {/* Notes/Description */}
      <Table.Cell>
        <span className="text-sm text-tertiary line-clamp-1">
          {transaction.description || "--"}
        </span>
      </Table.Cell>
    </Table.Row>
  );
}
```

**Step 2: Run type check**

Run: `cd apps/app && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/app/src/components/credit-cards/TransactionTableRow.tsx
git commit -m "$(cat <<'EOF'
feat(credit-cards): add TransactionTableRow using UntitledUI Table

- Uses Table.Row and Table.Cell components
- Merchant logo/avatar with fallback
- Category and status badges
- Clickable row with onAction

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Create TransactionFilters Component

**Files:**
- Create: `apps/app/src/components/credit-cards/TransactionFilters.tsx`

**Step 1: Create filter bar component with date range picker**

```tsx
"use client";

import { useState } from "react";
import { getLocalTimeZone, today, parseDate } from "@internationalized/date";
import type { DateValue, RangeValue } from "react-aria-components";
import { SearchMd, Download01 } from "@untitledui/icons";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { Select } from "@repo/ui/untitledui/base/select/select";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { DateRangePicker } from "@repo/ui/untitledui/application/date-picker/date-range-picker";
import { TRANSACTION_CATEGORIES, type TransactionCategory } from "@/types/credit-cards";

const categoryItems = [
  { id: "all", label: "All Categories" },
  ...TRANSACTION_CATEGORIES.map((cat) => ({ id: cat, label: cat })),
];

const statusItems = [
  { id: "all", label: "All Status" },
  { id: "Posted", label: "Posted" },
  { id: "Pending", label: "Pending" },
];

export interface TransactionFiltersState {
  searchQuery: string;
  category: string;
  status: string;
  dateRange: RangeValue<DateValue> | null;
}

interface TransactionFiltersProps {
  filters: TransactionFiltersState;
  onFiltersChange: (filters: TransactionFiltersState) => void;
  onExport?: () => void;
}

/**
 * Transaction filter bar with search, dropdowns, and date range picker
 * Positioned ABOVE the table per SmartPockets design
 */
export function TransactionFilters({
  filters,
  onFiltersChange,
  onExport,
}: TransactionFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchQuery: value });
  };

  const handleCategoryChange = (key: React.Key) => {
    onFiltersChange({ ...filters, category: key as string });
  };

  const handleStatusChange = (key: React.Key) => {
    onFiltersChange({ ...filters, status: key as string });
  };

  const handleDateRangeChange = (range: RangeValue<DateValue> | null) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
      {/* Left: Search and Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Search */}
        <div className="w-full lg:w-[240px]">
          <Input
            placeholder="Search transactions..."
            icon={SearchMd}
            size="sm"
            value={filters.searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        {/* Category Filter */}
        <div className="w-full lg:w-[160px]">
          <Select
            items={categoryItems}
            selectedKey={filters.category}
            onSelectionChange={handleCategoryChange}
            placeholder="Category"
            size="sm"
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        </div>

        {/* Status Filter */}
        <div className="w-full lg:w-[120px]">
          <Select
            items={statusItems}
            selectedKey={filters.status}
            onSelectionChange={handleStatusChange}
            placeholder="Status"
            size="sm"
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
        </div>

        {/* Date Range Picker */}
        <div className="w-full lg:w-auto">
          <DateRangePicker
            value={filters.dateRange}
            onChange={handleDateRangeChange}
          />
        </div>
      </div>

      {/* Right: Export Button */}
      {onExport && (
        <Button
          color="secondary"
          size="sm"
          iconLeading={Download01}
          onClick={onExport}
        >
          Export
        </Button>
      )}
    </div>
  );
}

/**
 * Default filter state
 */
export const defaultTransactionFilters: TransactionFiltersState = {
  searchQuery: "",
  category: "all",
  status: "all",
  dateRange: null,
};
```

**Step 2: Run type check**

Run: `cd apps/app && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/app/src/components/credit-cards/TransactionFilters.tsx
git commit -m "$(cat <<'EOF'
feat(credit-cards): add TransactionFilters with date range picker

- Search input with icon
- Category and status dropdowns
- UntitledUI DateRangePicker with presets
- Export button (optional)
- Responsive layout

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Refactor TransactionsSection with UntitledUI Table and Pagination

**Files:**
- Modify: `apps/app/src/components/credit-cards/TransactionsSection.tsx`

**Step 1: Rewrite TransactionsSection to use UntitledUI components**

Replace the entire file contents with:

```tsx
"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { getLocalTimeZone } from "@internationalized/date";
import type { SortDescriptor } from "react-aria-components";
import { motion } from "motion/react";
import { TableBody as AriaTableBody } from "react-aria-components";
import { Table, TableCard } from "@repo/ui/untitledui/application/table/table";
import { PaginationCardMinimal } from "@repo/ui/untitledui/application/pagination/pagination";
import { TransactionFilters, defaultTransactionFilters, type TransactionFiltersState } from "./TransactionFilters";
import { TransactionTableHeader, type TransactionSortColumn } from "./TransactionTableHeader";
import { TransactionTableRow } from "./TransactionTableRow";
import { TransactionDetailDrawer } from "./TransactionDetailDrawer";
import {
  toTransaction,
  type Transaction,
  type PlaidTransactionItem,
} from "@/types/credit-cards";

interface TransactionsSectionProps {
  cardId: Id<"creditCards">;
  accountId: string;
}

const ITEMS_PER_PAGE = 10;

/**
 * Transactions section with UntitledUI Table, sorting, filtering, and pagination
 */
export function TransactionsSection({ cardId, accountId }: TransactionsSectionProps) {
  // Filter state
  const [filters, setFilters] = useState<TransactionFiltersState>(defaultTransactionFilters);

  // Sort state
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "date",
    direction: "descending",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Selected transaction for detail drawer
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Fetch transactions from Convex
  const txResult = useQuery(
    api.transactions.queries.getTransactionsAndStreamsByAccountId,
    accountId ? { accountId } : "skip"
  );

  // Convert Plaid transactions to our format
  const allTransactions = useMemo(() => {
    if (!txResult?.items) return [];
    return txResult.items.map((tx) =>
      toTransaction(tx as PlaidTransactionItem, cardId as string)
    );
  }, [txResult, cardId]);

  // Loading state
  const isLoading = accountId && txResult === undefined;

  // Apply filters
  const filteredTransactions = useMemo(() => {
    let result = [...allTransactions];

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (txn) =>
          txn.merchant.toLowerCase().includes(query) ||
          txn.description?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (filters.category !== "all") {
      result = result.filter((txn) => txn.category === filters.category);
    }

    // Status filter
    if (filters.status !== "all") {
      result = result.filter((txn) => txn.status === filters.status);
    }

    // Date range filter
    if (filters.dateRange?.start && filters.dateRange?.end) {
      const startDate = filters.dateRange.start.toDate(getLocalTimeZone());
      const endDate = filters.dateRange.end.toDate(getLocalTimeZone());
      result = result.filter((txn) => {
        const txnDate = new Date(txn.date);
        return txnDate >= startDate && txnDate <= endDate;
      });
    }

    return result;
  }, [allTransactions, filters]);

  // Apply sorting
  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    const column = sortDescriptor.column as TransactionSortColumn;
    const direction = sortDescriptor.direction;

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (column) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "merchant":
          comparison = a.merchant.localeCompare(b.merchant);
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }

      return direction === "descending" ? -comparison : comparison;
    });

    return sorted;
  }, [filteredTransactions, sortDescriptor]);

  // Apply pagination
  const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedTransactions, currentPage]);

  // Reset to page 1 when filters change
  const handleFiltersChange = useCallback((newFilters: TransactionFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    setCurrentPage(1);
  }, []);

  // Handle export (placeholder)
  const handleExport = useCallback(() => {
    // TODO: Implement CSV export
    console.log("Export transactions", sortedTransactions);
  }, [sortedTransactions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
    >
      <TableCard.Root size="sm">
        <TableCard.Header
          title="Recent Transactions"
          description={`Showing ${paginatedTransactions.length} of ${sortedTransactions.length} transactions`}
        />

        {/* Filters - Above the table */}
        <TransactionFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onExport={handleExport}
        />

        {/* Table */}
        <Table
          aria-label="Transactions"
          sortDescriptor={sortDescriptor}
          onSortChange={handleSortChange}
          size="sm"
        >
          <TransactionTableHeader
            sortDescriptor={sortDescriptor}
            onSortChange={handleSortChange}
          />

          <AriaTableBody
            items={paginatedTransactions}
            renderEmptyState={() => (
              <div className="py-12 text-center text-tertiary">
                No transactions found
              </div>
            )}
          >
            {(transaction) => (
              <TransactionTableRow
                key={transaction.id}
                transaction={transaction}
                onSelect={setSelectedTransaction}
              />
            )}
          </AriaTableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <PaginationCardMinimal
            page={currentPage}
            total={totalPages}
            align="center"
            onPageChange={setCurrentPage}
          />
        )}
      </TableCard.Root>

      {/* Transaction Detail Drawer */}
      <TransactionDetailDrawer
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </motion.div>
  );
}
```

**Step 2: Run type check**

Run: `cd apps/app && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/app/src/components/credit-cards/TransactionsSection.tsx
git commit -m "$(cat <<'EOF'
refactor(credit-cards): rewrite TransactionsSection with UntitledUI Table

- Use TableCard.Root with header
- TransactionFilters above table
- Sortable columns via SortDescriptor
- Client-side pagination with PaginationCardMinimal
- Export button (placeholder)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Update CreditCardDetailContent to Use New Components

**Files:**
- Modify: `apps/app/src/components/credit-cards/CreditCardDetailContent.tsx`

**Step 1: Import new components and refactor layout**

Update imports and refactor the main content area:

```tsx
// Add to imports
import { KeyMetrics } from "./KeyMetrics";
import { AutoPayToggle, useAutoPay } from "./AutoPayToggle";
```

**Step 2: Replace the main content section**

Replace the content between the header and TransactionsSection with:

```tsx
{/* Content */}
<div className="flex-1 overflow-y-auto">
  {/* Card Visual - Centered */}
  <div className="flex justify-center px-4 py-6 lg:px-6">
    <CardVisualWrapper card={card} size="lg" />
  </div>

  {/* Key Metrics Row */}
  <KeyMetrics card={card} />

  {/* AutoPay Toggle - Below key metrics */}
  <div className="flex items-center justify-between border-b border-secondary px-4 py-3 lg:px-6">
    <AutoPayToggle
      enabled={autoPay.enabled}
      onToggle={autoPay.toggle}
      isLoading={autoPay.isLoading}
    />
  </div>

  {/* Transactions Section */}
  <div className="px-4 py-6 lg:px-6">
    <TransactionsSection cardId={cardId} accountId={card.accountId} />
  </div>
</div>
```

**Step 3: Add useAutoPay hook call**

After the `toExtendedCreditCard` conversion, add:

```tsx
// AutoPay state
const autoPay = useAutoPay(card?.accountId ?? "");
```

**Step 4: Remove old sections**

Remove these sections from the current file:
- The inline Key Metrics Row with MetricItem components
- The Utilization Section
- The Payment Info section

Keep only:
- Header with breadcrumbs
- Card Visual
- KeyMetrics component
- AutoPayToggle
- TransactionsSection

**Step 5: Run type check**

Run: `cd apps/app && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add apps/app/src/components/credit-cards/CreditCardDetailContent.tsx
git commit -m "$(cat <<'EOF'
refactor(credit-cards): integrate KeyMetrics and AutoPayToggle into detail page

- Use new KeyMetrics component with vertical dividers
- Add AutoPayToggle below metrics
- Remove old inline metric sections
- Streamlined layout matching SmartPockets

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Clean Up Unused Components

**Files:**
- Modify: `apps/app/src/components/credit-cards/CreditCardDetailContent.tsx` (remove MetricItem)
- Delete tabs if no longer used: Check if `tabs/OverviewTab.tsx` is still referenced

**Step 1: Remove MetricItem helper component**

Remove the MetricItem component and its interface from the bottom of CreditCardDetailContent.tsx since we now use KeyMetrics.

**Step 2: Verify no broken imports**

Run: `cd apps/app && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit cleanup**

```bash
git add apps/app/src/components/credit-cards/CreditCardDetailContent.tsx
git commit -m "$(cat <<'EOF'
chore(credit-cards): remove unused MetricItem helper component

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Test the Implementation

**Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts without errors

**Step 2: Manual testing checklist**

Navigate to `/credit-cards/[cardId]` and verify:
- [ ] Header shows card name, subtitle (type • brand •••• last4), and payment due
- [ ] Key metrics row shows 4 columns with vertical dividers on desktop
- [ ] AutoPay toggle appears and can be toggled
- [ ] Transactions table loads with data
- [ ] Table columns are sortable (click headers)
- [ ] Search filter works
- [ ] Category dropdown filter works
- [ ] Status dropdown filter works
- [ ] Date range picker works
- [ ] Pagination appears and navigates correctly
- [ ] Clicking a transaction opens the detail drawer

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 4: Commit any fixes needed**

If any issues found, fix and commit individually.

---

## Task 11: Final Review and Documentation

**Step 1: Update CLAUDE.md if needed**

If any new patterns or conventions were introduced, document them.

**Step 2: Create summary commit**

```bash
git log --oneline -10
```

Review all commits from this implementation are in order.

---

## Summary of Changes

| Component | Status | Description |
|-----------|--------|-------------|
| Page Header | Updated | Card subtitle + payment due right-aligned |
| KeyMetrics | New | 4-column layout with vertical dividers |
| AutoPayToggle | New | Simple toggle with tooltip (local state) |
| TransactionFilters | New | Search, category, status, date range picker |
| TransactionTableHeader | New | Sortable column headers |
| TransactionTableRow | New | UntitledUI Table.Row with badges/avatars |
| TransactionsSection | Refactored | Full rewrite with UntitledUI Table + pagination |
| CreditCardDetailContent | Updated | Integrated new components |

## Not Implemented (Per Spec)

- Insights Tab
- Spending Chart
- Rewards Tab
- Analytics/trends components
- AutoPay backend (Convex schema + mutations)

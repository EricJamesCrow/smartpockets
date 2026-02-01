"use client";

import { useState } from "react";
import type { SortDescriptor } from "react-aria-components";
import { Table } from "@repo/ui/untitledui/application/table/table";
import { TableBody } from "react-aria-components";
import { TransactionsTableRow, type AggregatedTransaction } from "./TransactionsTableRow";

interface TransactionsTableProps {
  transactions: AggregatedTransaction[];
  onSelectTransaction: (transaction: AggregatedTransaction) => void;
  isLoading?: boolean;
}

/**
 * Transaction table component with sortable columns
 *
 * Columns: Date, Merchant, Category, Source, Status, Amount
 */
export function TransactionsTable({
  transactions,
  onSelectTransaction,
  isLoading = false,
}: TransactionsTableProps) {
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "date",
    direction: "descending",
  });

  // Sort transactions based on current sort descriptor
  const sortedTransactions = [...transactions]
    .sort((a, b) => {
      const { column, direction } = sortDescriptor;
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
          const catA = a.categoryPrimary ?? "";
          const catB = b.categoryPrimary ?? "";
          comparison = catA.localeCompare(catB);
          break;
        case "amount":
          comparison = Math.abs(a.amount) - Math.abs(b.amount);
          break;
        default:
          break;
      }

      return direction === "descending" ? -comparison : comparison;
    })
    // Add id property for React Aria TableBody
    .map((tx) => ({ ...tx, id: tx.transactionId }));

  if (isLoading) {
    return <TransactionsTableSkeleton />;
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-primary">No transactions found</p>
        <p className="mt-1 text-sm text-tertiary">
          Try adjusting your filters or connect a credit card to see transactions.
        </p>
      </div>
    );
  }

  return (
    <Table
      aria-label="Transactions"
      sortDescriptor={sortDescriptor}
      onSortChange={setSortDescriptor}
      selectionMode="none"
    >
      <Table.Header>
        <Table.Head id="date" allowsSorting>
          Date
        </Table.Head>
        <Table.Head id="merchant" allowsSorting>
          Merchant
        </Table.Head>
        <Table.Head id="category" allowsSorting>
          Category
        </Table.Head>
        <Table.Head id="source">
          Source
        </Table.Head>
        <Table.Head id="status">
          Status
        </Table.Head>
        <Table.Head id="amount" allowsSorting className="text-right">
          Amount
        </Table.Head>
      </Table.Header>

      <TableBody items={sortedTransactions}>
        {(transaction) => (
          <TransactionsTableRow
            key={transaction.transactionId}
            transaction={transaction}
            onSelect={onSelectTransaction}
          />
        )}
      </TableBody>
    </Table>
  );
}

/**
 * Skeleton loading state for the transactions table
 */
function TransactionsTableSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="flex h-11 items-center gap-6 border-b border-secondary bg-secondary px-6">
        {[80, 160, 100, 160, 80, 100].map((width, i) => (
          <div
            key={i}
            className="h-3 rounded bg-tertiary/30"
            style={{ width }}
          />
        ))}
      </div>

      {/* Row skeletons */}
      {[...Array(8)].map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex h-18 items-center gap-6 border-b border-secondary px-6"
        >
          {/* Date */}
          <div className="h-4 w-16 rounded bg-tertiary/20" />

          {/* Merchant (with avatar) */}
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-tertiary/30" />
            <div className="h-4 w-32 rounded bg-tertiary/20" />
          </div>

          {/* Category */}
          <div className="h-5 w-20 rounded-full bg-tertiary/20" />

          {/* Source */}
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-tertiary/30" />
            <div className="flex flex-col gap-1">
              <div className="h-3 w-24 rounded bg-tertiary/20" />
              <div className="h-2 w-12 rounded bg-tertiary/10" />
            </div>
          </div>

          {/* Status */}
          <div className="h-5 w-16 rounded-full bg-tertiary/20" />

          {/* Amount */}
          <div className="ml-auto h-4 w-20 rounded bg-tertiary/20" />
        </div>
      ))}
    </div>
  );
}

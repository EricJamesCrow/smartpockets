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
  parseLocalDate,
  type Transaction,
  type PlaidTransactionItem,
} from "@/types/credit-cards";

type FilterMode = "all" | "transactions" | "subscriptions";

interface TransactionsSectionProps {
  cardId: Id<"creditCards">;
  accountId: string;
  /** Filter mode: "all" shows everything, "transactions" shows non-recurring, "subscriptions" shows recurring only */
  filterMode?: FilterMode;
}

const ITEMS_PER_PAGE = 10;

/**
 * Transactions section with UntitledUI Table, sorting, filtering, and pagination
 */
export function TransactionsSection({ cardId, accountId, filterMode = "all" }: TransactionsSectionProps) {
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

    // Filter by mode (recurring vs non-recurring)
    if (filterMode === "transactions") {
      result = result.filter((txn) => !txn.isRecurring);
    } else if (filterMode === "subscriptions") {
      result = result.filter((txn) => txn.isRecurring);
    }

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
        const txnDate = parseLocalDate(txn.date);
        return txnDate >= startDate && txnDate <= endDate;
      });
    }

    return result;
  }, [allTransactions, filters, filterMode]);

  // Apply sorting
  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    const column = sortDescriptor.column as TransactionSortColumn;
    const direction = sortDescriptor.direction;

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (column) {
        case "date":
          comparison = parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime();
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

  // Export handler - stub for future CSV export feature
  const handleExport = useCallback(() => {
    // CSV export will be implemented when file download utilities are added
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
    >
      <TableCard.Root size="sm">
        <TableCard.Header
          title={
            filterMode === "subscriptions"
              ? "Recurring Subscriptions"
              : filterMode === "transactions"
                ? "Transactions"
                : "Recent Transactions"
          }
          description={`Showing ${paginatedTransactions.length} of ${sortedTransactions.length} ${filterMode === "subscriptions" ? "subscriptions" : "transactions"}`}
        />

        {/* Filters - Above the table */}
        <TransactionFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onExport={handleExport}
        />

        {/* Table */}
        {isLoading ? (
          <div className="animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center gap-4 border-b border-secondary bg-secondary px-4 py-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-3 w-20 rounded bg-tertiary/30" />
              ))}
            </div>
            {/* Row skeletons */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-secondary px-4 py-3">
                <div className="h-4 w-20 rounded bg-tertiary/20" />
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-8 w-8 rounded-full bg-tertiary/20" />
                  <div className="h-4 w-32 rounded bg-tertiary/20" />
                </div>
                <div className="h-5 w-20 rounded-full bg-tertiary/20" />
                <div className="h-4 w-16 rounded bg-tertiary/30" />
                <div className="h-5 w-16 rounded-full bg-tertiary/20" />
                <div className="h-4 w-24 rounded bg-tertiary/20" />
              </div>
            ))}
          </div>
        ) : (
          <Table
            aria-label="Transactions"
            sortDescriptor={sortDescriptor}
            onSortChange={handleSortChange}
            size="sm"
          >
            <TransactionTableHeader />

            <AriaTableBody
              items={paginatedTransactions}
              renderEmptyState={() => (
                <div className="py-12 text-center text-tertiary">
                  {filterMode === "subscriptions"
                    ? "No recurring subscriptions found"
                    : filterMode === "transactions"
                      ? "No transactions found"
                      : "No transactions found"}
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
        )}

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

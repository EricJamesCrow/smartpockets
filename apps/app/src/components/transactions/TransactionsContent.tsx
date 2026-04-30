"use client";

import { useState, useMemo } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { getLocalTimeZone } from "@internationalized/date";
import { api } from "@convex/_generated/api";
import { TransactionsHeader } from "./TransactionsHeader";
import {
  TransactionsFilters,
  defaultTransactionsFilters,
  type TransactionsFiltersState,
} from "./TransactionsFilters";
import { TransactionsTable } from "./TransactionsTable";
import { TransactionsPagination } from "./TransactionsPagination";
import { TransactionDetailPanel, type DetailPanelTransaction } from "./TransactionDetailPanel";
import type { AggregatedTransaction } from "./TransactionsTableRow";
import { mapPlaidCategory } from "@/utils/transaction-helpers";

const PAGE_SIZE = 50;

/**
 * Main content component for the Transactions page
 *
 * Orchestrates:
 * - Fetching all transactions across user's credit cards
 * - Filter state management
 * - Pagination
 * - Transaction detail drawer
 */
export function TransactionsContent() {
  const { isAuthenticated } = useConvexAuth();

  // Filter state
  const [filters, setFilters] = useState<TransactionsFiltersState>(
    defaultTransactionsFilters
  );
  const [currentPage, setCurrentPage] = useState(1);

  // Selected transaction for detail drawer
  const [selectedTransaction, setSelectedTransaction] =
    useState<DetailPanelTransaction | null>(null);

  // Convert date range to ISO strings for the query
  const dateFrom = filters.dateRange?.start
    ? filters.dateRange.start.toDate(getLocalTimeZone()).toISOString().split("T")[0]
    : undefined;
  const dateTo = filters.dateRange?.end
    ? filters.dateRange.end.toDate(getLocalTimeZone()).toISOString().split("T")[0]
    : undefined;

  // Skip Convex queries until auth is ready — calling them unauthenticated
  // raises "Authentication required" and blanks the route.
  const transactionsData = useQuery(
    api.transactions.queries.listAllForUser,
    isAuthenticated
      ? {
          page: currentPage,
          pageSize: PAGE_SIZE,
          searchQuery: filters.searchQuery || undefined,
          category: filters.category !== "all" ? filters.category : undefined,
          status: filters.status !== "all" ? filters.status : undefined,
          dateFrom,
          dateTo,
          cardIds: filters.cardIds.length > 0 ? filters.cardIds : undefined,
          amountMin: filters.amountMin,
          amountMax: filters.amountMax,
        }
      : "skip"
  );

  // Fetch user's credit cards for the source filter dropdown
  const creditCards = useQuery(
    api.creditCards.queries.list,
    isAuthenticated ? {} : "skip"
  );

  // Build card options for filter dropdown
  const cardOptions = useMemo(() => {
    if (!creditCards) return [];
    return creditCards.map((card) => ({
      id: card._id,
      label: card.displayName,
      lastFour: card.lastFour,
    }));
  }, [creditCards]);

  // Reset to page 1 when filters change
  const handleFiltersChange = (newFilters: TransactionsFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSelectTransaction = (transaction: AggregatedTransaction) => {
    const merchantName =
      transaction.merchantEnrichment?.merchantName ??
      transaction.merchantName ??
      transaction.name;

    setSelectedTransaction({
      transactionId: transaction.transactionId,
      date: transaction.date,
      datetime: transaction.datetime,
      name: transaction.name,
      merchantName,
      amount: transaction.amount,
      isoCurrencyCode: transaction.isoCurrencyCode,
      pending: transaction.pending,
      categoryPrimary: transaction.categoryPrimary,
      category: mapPlaidCategory(transaction.categoryPrimary),
      merchantEnrichment: transaction.merchantEnrichment,
      sourceInfo: transaction.sourceInfo,
    });
  };

  const handleCloseDrawer = () => {
    setSelectedTransaction(null);
  };

  const isLoading = transactionsData === undefined;
  const transactions = transactionsData?.items ?? [];
  const pagination = transactionsData?.pagination;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <TransactionsHeader totalCount={pagination?.totalCount} />

      {/* Filters */}
      <TransactionsFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        cardOptions={cardOptions}
      />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <TransactionsTable
          transactions={transactions}
          onSelectTransaction={handleSelectTransaction}
          isLoading={isLoading}
        />
      </div>

      {/* Pagination */}
      {pagination && pagination.totalCount > 0 && (
        <TransactionsPagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalCount={pagination.totalCount}
          pageSize={pagination.pageSize}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Transaction Detail Panel */}
      <TransactionDetailPanel
        transaction={selectedTransaction}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}

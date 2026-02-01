"use client";

import { Table } from "@repo/ui/untitledui/application/table/table";

export type TransactionSortColumn = "date" | "merchant" | "category" | "amount" | "status";

/**
 * Transaction table header with sortable columns
 * Uses UntitledUI Table.Header with react-aria sorting
 */
export function TransactionTableHeader() {
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
        isRowHeader
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

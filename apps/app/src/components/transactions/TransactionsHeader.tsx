"use client";

interface TransactionsHeaderProps {
  totalCount?: number;
}

/**
 * Header component for the Transactions page
 *
 * Displays the page title and transaction count summary.
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

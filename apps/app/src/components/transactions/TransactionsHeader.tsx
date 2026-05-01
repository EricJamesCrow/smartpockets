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
    <div className="border-b border-secondary px-6 py-5 dark:border-[var(--sp-moss-line)]">
      <p className="sp-kicker tracking-[0.24em] text-tertiary dark:text-stone-500">
        <span className="mr-2 inline-block h-1 w-1 -translate-y-0.5 rounded-full bg-[var(--sp-moss-mint)]" />
        Section
      </p>
      <h1 className="mt-1.5 text-display-xs font-medium leading-tight tracking-[-0.02em] text-primary">
        <em className="font-[family-name:var(--font-fraunces)] font-medium italic text-stone-300 dark:text-stone-300">
          Transactions
        </em>
      </h1>
      <p className="mt-1 text-sm text-tertiary">
        {totalCount !== undefined
          ? `${totalCount.toLocaleString()} transactions across all accounts`
          : "All transactions across your accounts"}
      </p>
    </div>
  );
}

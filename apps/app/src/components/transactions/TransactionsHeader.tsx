"use client";

interface TransactionsHeaderProps {
  totalCount?: number;
}

/**
 * Header component for the Transactions page
 *
 * Apothecary-styled — JetBrains Mono section label, Source Serif 4 italic
 * accent on a single keyword in the headline.
 */
export function TransactionsHeader({ totalCount }: TransactionsHeaderProps) {
  return (
    <div className="border-b border-secondary px-6 py-5">
      <div className="flex items-center gap-3">
        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.22em] uppercase text-text-brand-primary">
          02
        </span>
        <span className="h-px w-10 bg-gradient-to-r from-[var(--apothecary-hairline-strong)] via-[var(--apothecary-champagne-line)] to-transparent" />
        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.22em] uppercase text-text-brand-tertiary">
          Ledger
        </span>
      </div>
      <h1 className="mt-2 font-[family-name:var(--font-geist)] text-display-xs font-medium tracking-[-0.02em] text-primary">
        <span className="font-[family-name:var(--font-source-serif)] italic font-light text-text-brand-primary">
          Every
        </span>{" "}
        transaction
      </h1>
      <p className="mt-1.5 font-[family-name:var(--font-geist)] text-sm text-tertiary">
        {totalCount !== undefined
          ? `${totalCount.toLocaleString()} transactions across all accounts`
          : "All transactions across your accounts"}
      </p>
    </div>
  );
}

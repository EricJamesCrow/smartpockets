"use client";

interface TransactionsHeaderProps {
  totalCount?: number;
}

/**
 * Header component for the Transactions page.
 *
 * 2B variant: condensed display title + monospace eyebrow with live pulse-dot
 * showing transaction count as a tabular figure.
 */
export function TransactionsHeader({ totalCount }: TransactionsHeaderProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-white/[0.06] px-6 py-5">
      <span className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-500">
        <span className="size-1.5 animate-pulse rounded-full bg-brand-400 shadow-[0_0_10px_rgba(60,203,127,0.7)]" />
        LEDGER / FEED
      </span>
      <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold uppercase leading-[0.95] tracking-tight text-zinc-50 lg:text-[34px]">
        Transactions
      </h1>
      <p className="text-sm text-zinc-400">
        {totalCount !== undefined ? (
          <>
            <span className="font-mono tabular-nums text-zinc-200">
              {totalCount.toLocaleString()}
            </span>{" "}
            transactions across all accounts
          </>
        ) : (
          "All transactions across your accounts"
        )}
      </p>
    </div>
  );
}

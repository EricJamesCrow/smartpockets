/**
 * Loading skeleton for Transactions page
 *
 * Displays:
 * - Header skeleton (title + subtitle)
 * - Search bar and filter button skeleton
 * - Table skeleton with header row and 10 data rows
 * - Columns: Date, Merchant (with avatar), Category, Source, Status, Amount
 */
export default function TransactionsLoading() {
  return (
    <div className="flex h-full flex-col animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b border-secondary px-6 py-4">
        <div>
          <div className="h-7 w-36 rounded bg-tertiary/30" />
          <div className="mt-2 h-4 w-72 rounded bg-tertiary/20" />
        </div>
      </div>

      {/* Search & Filter Bar Skeleton */}
      <div className="border-b border-secondary px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          {/* Search input skeleton */}
          <div className="h-9 w-64 rounded-lg bg-tertiary/20" />
          {/* Filter button skeleton */}
          <div className="h-9 w-24 rounded-lg bg-tertiary/20" />
          {/* Spacer */}
          <div className="flex-1" />
          {/* Results count skeleton */}
          <div className="h-4 w-32 rounded bg-tertiary/20" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="flex-1 overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center gap-4 border-b border-secondary bg-tertiary px-4 py-3 md:px-6">
          <div className="h-3 w-[80px] rounded bg-tertiary/30" />
          <div className="h-3 w-[200px] rounded bg-tertiary/30" />
          <div className="h-3 w-[100px] rounded bg-tertiary/30" />
          <div className="h-3 w-[120px] rounded bg-tertiary/30" />
          <div className="h-3 w-[80px] rounded bg-tertiary/30" />
          <div className="ml-auto h-3 w-[100px] rounded bg-tertiary/30" />
        </div>

        {/* Table Rows */}
        <div className="overflow-y-auto">
          {[...Array(10)].map((_, i) => (
            <TransactionRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Transaction row skeleton
 */
function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-secondary px-4 py-3 md:px-6">
      {/* Date column - 80px */}
      <div className="h-4 w-[80px] rounded bg-tertiary/20" />

      {/* Merchant column - 200px with avatar */}
      <div className="flex w-[200px] items-center gap-3">
        <div className="h-8 w-8 shrink-0 rounded-full bg-tertiary/20" />
        <div className="h-4 w-32 rounded bg-tertiary/20" />
      </div>

      {/* Category badge - 100px */}
      <div className="h-5 w-[100px] rounded-full bg-tertiary/20" />

      {/* Source column - 120px with icon */}
      <div className="flex w-[120px] items-center gap-2">
        <div className="h-4 w-4 rounded bg-tertiary/20" />
        <div className="h-4 w-20 rounded bg-tertiary/20" />
      </div>

      {/* Status badge - 80px */}
      <div className="h-5 w-[80px] rounded-full bg-tertiary/20" />

      {/* Amount column - right aligned */}
      <div className="ml-auto h-4 w-[100px] rounded bg-tertiary/30" />
    </div>
  );
}

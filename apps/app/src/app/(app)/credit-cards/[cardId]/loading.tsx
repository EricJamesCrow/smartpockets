/**
 * Loading skeleton for Credit Card detail page
 *
 * Displays:
 * - Header with back button and title skeleton
 * - Card visual skeleton (centered)
 * - Key metrics grid skeleton (4 cards)
 * - Utilization section skeleton
 * - Payment info skeleton
 * - Transactions section skeleton
 */
export default function CardDetailLoading() {
  return (
    <div className="flex h-full flex-col animate-pulse">
      {/* Header Skeleton */}
      <div className="border-b border-secondary bg-primary px-4 py-4 lg:px-6">
        <div className="flex items-center gap-4">
          {/* Back button skeleton */}
          <div className="h-9 w-32 rounded-lg bg-tertiary/20" />

          <div className="flex flex-1 items-center justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="h-6 w-48 rounded bg-tertiary/30" />
              <div className="h-4 w-24 rounded bg-tertiary/20" />
            </div>

            {/* Status badge skeleton */}
            <div className="h-6 w-20 rounded-full bg-tertiary/20" />
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
        <div className="flex flex-col gap-6">
          {/* Card Visual Skeleton */}
          <div className="flex justify-center py-4">
            <div className="aspect-[1.586/1] w-80 rounded-xl bg-gradient-to-br from-tertiary/30 to-tertiary/10" />
          </div>

          {/* Key Metrics Grid Skeleton */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>

          {/* Utilization Section Skeleton */}
          <div className="rounded-xl border border-secondary bg-primary p-4 lg:p-6">
            <div className="mb-4 h-4 w-32 rounded bg-tertiary/30" />
            <div className="space-y-3">
              <div className="h-3 w-full rounded-full bg-tertiary/20" />
              <div className="flex justify-between">
                <div className="h-3 w-24 rounded bg-tertiary/20" />
                <div className="h-3 w-8 rounded bg-tertiary/20" />
              </div>
            </div>
            <div className="mt-4 h-4 w-3/4 rounded bg-tertiary/20" />
          </div>

          {/* Payment Info Skeleton */}
          <div className="rounded-xl border border-secondary bg-primary p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 rounded bg-tertiary/30" />
              <div className="h-6 w-24 rounded-full bg-tertiary/20" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="h-3 w-28 rounded bg-tertiary/20" />
                <div className="h-6 w-20 rounded bg-tertiary/30" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-32 rounded bg-tertiary/20" />
                <div className="h-6 w-24 rounded bg-tertiary/30" />
              </div>
            </div>
          </div>

          {/* Transactions Section Skeleton */}
          <div className="rounded-xl border border-secondary bg-primary">
            {/* Header */}
            <div className="border-b border-secondary px-4 py-4 lg:px-6">
              <div className="h-5 w-40 rounded bg-tertiary/30" />
              <div className="mt-2 h-4 w-48 rounded bg-tertiary/20" />
            </div>

            {/* Filters */}
            <div className="flex gap-4 border-b border-secondary px-4 py-4 lg:px-6">
              <div className="h-9 w-64 rounded-lg bg-tertiary/20" />
              <div className="h-9 w-40 rounded-lg bg-tertiary/20" />
              <div className="h-9 w-32 rounded-lg bg-tertiary/20" />
            </div>

            {/* Table Header */}
            <div className="flex items-center gap-4 border-b border-secondary bg-tertiary px-4 py-3">
              <div className="h-3 w-16 rounded bg-tertiary/30" />
              <div className="h-3 w-24 rounded bg-tertiary/30" />
              <div className="h-3 w-20 rounded bg-tertiary/30" />
              <div className="h-3 w-16 rounded bg-tertiary/30" />
              <div className="h-3 w-14 rounded bg-tertiary/30" />
              <div className="h-3 w-20 rounded bg-tertiary/30" />
            </div>

            {/* Transaction Rows */}
            {[...Array(5)].map((_, i) => (
              <TransactionRowSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Metric card skeleton
 */
function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border border-secondary bg-primary p-4">
      <div className="h-3 w-20 rounded bg-tertiary/20" />
      <div className="mt-2 h-6 w-24 rounded bg-tertiary/30" />
    </div>
  );
}

/**
 * Transaction row skeleton
 */
function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-secondary px-4 py-3">
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
  );
}

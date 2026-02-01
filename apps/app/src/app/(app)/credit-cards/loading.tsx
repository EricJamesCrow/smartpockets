/**
 * Loading skeleton for Credit Cards list page
 *
 * Displays:
 * - Header skeleton (title + subtitle)
 * - Filter bar skeleton (select placeholders)
 * - Card grid skeleton (6 placeholder cards)
 */
export default function CreditCardsLoading() {
  return (
    <div className="flex h-full flex-col animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b border-secondary px-6 py-4">
        <div>
          <div className="h-7 w-40 rounded bg-tertiary/30" />
          <div className="mt-2 h-4 w-64 rounded bg-tertiary/20" />
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="border-b border-secondary px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter buttons skeleton */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-9 w-28 rounded-lg bg-tertiary/20" />
            <div className="h-9 w-28 rounded-lg bg-tertiary/20" />
            <div className="h-9 w-32 rounded-lg bg-tertiary/20" />
            <div className="h-9 w-32 rounded-lg bg-tertiary/20" />
          </div>

          {/* Separator */}
          <div className="hidden h-6 w-px bg-secondary md:block" />

          {/* Sort skeleton */}
          <div className="h-9 w-36 rounded-lg bg-tertiary/20" />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="h-4 w-16 rounded bg-tertiary/20" />
            <div className="h-6 w-px bg-secondary" />
            <div className="h-4 w-12 rounded bg-tertiary/20" />
            <div className="h-5 w-9 rounded-full bg-tertiary/20" />
          </div>
        </div>
      </div>

      {/* Card Grid Skeleton */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-wrap gap-4">
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Individual card skeleton
 */
function CardSkeleton() {
  return (
    <div className="w-[340px] rounded-xl border border-secondary bg-primary p-4">
      {/* Card visual skeleton */}
      <div className="mb-4 aspect-[1.586/1] rounded-lg bg-gradient-to-br from-tertiary/30 to-tertiary/10" />

      {/* Card name & company */}
      <div className="mb-3 space-y-1.5">
        <div className="h-5 w-3/4 rounded bg-tertiary/30" />
        <div className="h-4 w-1/3 rounded bg-tertiary/20" />
      </div>

      {/* Utilization bar */}
      <div className="mb-3 space-y-2">
        <div className="h-2 w-full rounded-full bg-tertiary/20" />
        <div className="flex justify-between">
          <div className="h-3 w-20 rounded bg-tertiary/20" />
          <div className="h-3 w-8 rounded bg-tertiary/20" />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between border-t border-secondary pt-3">
        <div className="space-y-1">
          <div className="h-3 w-16 rounded bg-tertiary/20" />
          <div className="h-5 w-24 rounded bg-tertiary/30" />
        </div>
        <div className="h-6 w-24 rounded-full bg-tertiary/20" />
      </div>
    </div>
  );
}

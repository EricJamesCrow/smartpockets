"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { cx } from "@repo/ui/utils";

function formatCurrency(amount: number): string {
  // Amounts are in milliunits
  return (amount / 1000).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function HeroMetrics() {
  const { isAuthenticated } = useConvexAuth();
  const metrics = useQuery(
    api.dashboard.queries.getHeroMetrics,
    isAuthenticated ? {} : "skip"
  );

  if (!metrics) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl bg-secondary"
          />
        ))}
      </div>
    );
  }

  const utilizationColor =
    metrics.utilizationPercent < 30
      ? "text-success-600"
      : metrics.utilizationPercent < 50
        ? "text-warning-600"
        : "text-error-600";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Minimum Due */}
      <div className="rounded-xl border border-primary bg-primary p-5">
        <p className="text-display-sm font-semibold text-primary">
          {formatCurrency(metrics.minimumDue)}
        </p>
        <p className="text-sm font-medium text-secondary">Minimum Due</p>
        <p className="mt-1 text-sm text-tertiary">
          {metrics.minimumDueCardCount} card
          {metrics.minimumDueCardCount !== 1 ? "s" : ""} this month
        </p>
      </div>

      {/* Total Balance */}
      <div className="rounded-xl border border-primary bg-primary p-5">
        <p className="text-display-sm font-semibold text-primary">
          {formatCurrency(metrics.totalBalance)}
        </p>
        <p className="text-sm font-medium text-secondary">Total Balance</p>
        <p className="mt-1 text-sm text-tertiary">
          across {metrics.totalCardCount} card
          {metrics.totalCardCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Utilization */}
      <div className="rounded-xl border border-primary bg-primary p-5">
        <p className={cx("text-display-sm font-semibold", utilizationColor)}>
          {metrics.utilizationPercent.toFixed(0)}%
        </p>
        <p className="text-sm font-medium text-secondary">Utilization</p>
        <p className="mt-1 text-sm text-tertiary">
          {metrics.cardsOverThreshold > 0 ? (
            <span className="text-warning-600">
              {metrics.cardsOverThreshold} card
              {metrics.cardsOverThreshold !== 1 ? "s" : ""} over{" "}
              {metrics.utilizationThreshold}%
            </span>
          ) : (
            "All cards healthy"
          )}
        </p>
      </div>
    </div>
  );
}

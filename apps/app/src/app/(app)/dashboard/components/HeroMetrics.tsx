"use client";

import { api } from "@convex/_generated/api";
import { cx } from "@repo/ui/utils";
import { useConvexAuth, useQuery } from "convex/react";
import { formatMoneyFromDollars } from "@/utils/money";

function formatCurrency(amount: number): string {
    return formatMoneyFromDollars(amount, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

export function HeroMetrics() {
    const { isAuthenticated } = useConvexAuth();
    const metrics = useQuery(api.dashboard.queries.getHeroMetrics, isAuthenticated ? {} : "skip");

    if (!metrics) {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-secondary h-28 animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    const utilizationColor = metrics.utilizationPercent < 30 ? "text-success-600" : metrics.utilizationPercent < 50 ? "text-warning-600" : "text-error-600";

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Minimum Due */}
            <div className="border-primary bg-primary rounded-xl border p-5">
                <p className="text-display-sm text-primary font-semibold">{formatCurrency(metrics.minimumDue)}</p>
                <p className="text-secondary text-sm font-medium">Minimum Due</p>
                <p className="text-tertiary mt-1 text-sm">
                    {metrics.minimumDueCardCount} card
                    {metrics.minimumDueCardCount !== 1 ? "s" : ""} this month
                </p>
            </div>

            {/* Total Balance */}
            <div className="border-primary bg-primary rounded-xl border p-5">
                <p className="text-display-sm text-primary font-semibold">{formatCurrency(metrics.totalBalance)}</p>
                <p className="text-secondary text-sm font-medium">Total Balance</p>
                <p className="text-tertiary mt-1 text-sm">
                    across {metrics.totalCardCount} card
                    {metrics.totalCardCount !== 1 ? "s" : ""}
                </p>
            </div>

            {/* Utilization */}
            <div className="border-primary bg-primary rounded-xl border p-5">
                <p className={cx("text-display-sm font-semibold", utilizationColor)}>{metrics.utilizationPercent.toFixed(0)}%</p>
                <p className="text-secondary text-sm font-medium">Utilization</p>
                <p className="text-tertiary mt-1 text-sm">
                    {metrics.cardsOverThreshold > 0 ? (
                        <span className="text-warning-600">
                            {metrics.cardsOverThreshold} card
                            {metrics.cardsOverThreshold !== 1 ? "s" : ""} over {metrics.utilizationThreshold}%
                        </span>
                    ) : (
                        "All cards healthy"
                    )}
                </p>
            </div>
        </div>
    );
}

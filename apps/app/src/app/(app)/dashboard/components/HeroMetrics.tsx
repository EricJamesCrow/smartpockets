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
            <div className="grid grid-cols-1 gap-px overflow-hidden border border-white/[0.06] bg-white/[0.04] sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 animate-pulse bg-[#0a0d10]" />
                ))}
            </div>
        );
    }

    const utilizationColor = metrics.utilizationPercent < 30 ? "text-success-500" : metrics.utilizationPercent < 50 ? "text-warning-500" : "text-error-500";

    return (
        <div className="grid grid-cols-1 gap-px overflow-hidden border border-white/[0.06] bg-white/[0.04] sm:grid-cols-3">
            {/* Minimum Due */}
            <CockpitMetric
                eyebrow="MIN / DUE"
                value={formatCurrency(metrics.minimumDue)}
                label="Minimum Due"
                hint={`${metrics.minimumDueCardCount} card${metrics.minimumDueCardCount !== 1 ? "s" : ""} this month`}
            />

            {/* Total Balance */}
            <CockpitMetric
                eyebrow="BAL / TOTAL"
                value={formatCurrency(metrics.totalBalance)}
                label="Total Balance"
                hint={`across ${metrics.totalCardCount} card${metrics.totalCardCount !== 1 ? "s" : ""}`}
            />

            {/* Utilization */}
            <CockpitMetric
                eyebrow="UTIL / AVG"
                value={`${metrics.utilizationPercent.toFixed(0)}%`}
                valueClassName={utilizationColor}
                label="Utilization"
                hint={
                    metrics.cardsOverThreshold > 0 ? (
                        <span className="text-warning-500">
                            {metrics.cardsOverThreshold} card
                            {metrics.cardsOverThreshold !== 1 ? "s" : ""} over {metrics.utilizationThreshold}%
                        </span>
                    ) : (
                        "All cards healthy"
                    )
                }
            />
        </div>
    );
}

function CockpitMetric({
    eyebrow,
    value,
    valueClassName,
    label,
    hint,
}: {
    eyebrow: string;
    value: string;
    valueClassName?: string;
    label: string;
    hint: React.ReactNode;
}) {
    return (
        <div className="bg-[#06090b] p-5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-500">
                {eyebrow}
            </span>
            <p
                className={cx(
                    "mt-3 font-[family-name:var(--font-jetbrains-mono)] text-[32px] font-medium leading-none text-zinc-50 tabular-nums",
                    valueClassName,
                )}
            >
                {value}
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-300">{label}</p>
            <p className="mt-1 font-mono text-[11px] tabular-nums text-zinc-500">{hint}</p>
        </div>
    );
}

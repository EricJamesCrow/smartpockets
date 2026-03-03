"use client";

import { cx } from "@repo/ui/utils";

type Apr = {
  aprPercentage: number;
  aprType: string;
  balanceSubjectToApr?: number | null;
  interestChargeAmount?: number | null;
};

function getAprColor(apr: Apr) {
  if (apr.aprPercentage === 0) {
    return { border: "border-l-utility-success-500", text: "text-utility-success-700" };
  }
  if (apr.aprType?.includes("cash")) {
    return { border: "border-l-utility-error-500", text: "text-utility-error-700" };
  }
  return { border: "border-l-utility-warning-500", text: "text-utility-warning-700" };
}

function formatAprType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\bapr\b/i, "")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function computeWeightedAverageApr(aprs: Apr[]): number | null {
  const withBalance = aprs.filter(
    (a) => a.balanceSubjectToApr && a.balanceSubjectToApr > 0,
  );
  if (withBalance.length === 0) return null;
  const totalBalance = withBalance.reduce(
    (sum, a) => sum + (a.balanceSubjectToApr ?? 0),
    0,
  );
  if (totalBalance === 0) return null;
  const weightedSum = withBalance.reduce(
    (sum, a) => sum + a.aprPercentage * (a.balanceSubjectToApr ?? 0),
    0,
  );
  return Math.round((weightedSum / totalBalance) * 100) / 100;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface AprBreakdownProps {
  aprs: Apr[] | undefined;
}

export function AprBreakdown({ aprs }: AprBreakdownProps) {
  if (!aprs || aprs.length === 0) {
    return (
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">
          APR Breakdown
        </h3>
        <div className="rounded-xl border border-dashed border-secondary bg-primary p-6 text-center text-sm text-tertiary">
          No APR information available
        </div>
      </section>
    );
  }

  const weightedAvg = computeWeightedAverageApr(aprs);

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-primary">APR Breakdown</h3>
        {weightedAvg !== null && (
          <p className="text-sm text-tertiary">
            Weighted Avg:{" "}
            <span className="font-semibold tabular-nums text-primary">
              {weightedAvg.toFixed(2)}%
            </span>
          </p>
        )}
      </div>
      <div className="rounded-xl border border-secondary bg-primary">
        {/* Header row */}
        <div className="grid grid-cols-4 gap-4 border-b border-secondary px-4 py-2.5">
          <span className="text-xs font-medium text-tertiary">Balance Type</span>
          <span className="text-right text-xs font-medium text-tertiary">APR</span>
          <span className="text-right text-xs font-medium text-tertiary">Balance Subject</span>
          <span className="text-right text-xs font-medium text-tertiary">Interest Charged</span>
        </div>
        {/* Data rows */}
        <div className="divide-y divide-secondary">
          {aprs.map((apr, i) => {
            const color = getAprColor(apr);
            return (
              <div
                key={`${apr.aprType}-${i}`}
                className={cx(
                  "grid grid-cols-4 gap-4 border-l-2 px-4 py-3",
                  color.border,
                )}
              >
                <span className="text-sm text-primary">
                  {formatAprType(apr.aprType)}
                </span>
                <span className={cx("text-right text-sm font-medium tabular-nums", color.text)}>
                  {apr.aprPercentage.toFixed(2)}%
                  {apr.aprPercentage > 0 && (
                    <span
                      className="ml-1 cursor-help text-xs text-tertiary"
                      title="Variable rate — tracks the Prime Rate"
                    >
                      (v)
                    </span>
                  )}
                </span>
                <span className="text-right text-sm tabular-nums text-primary">
                  {apr.balanceSubjectToApr != null
                    ? `$${formatCurrency(apr.balanceSubjectToApr)}`
                    : "—"}
                </span>
                <span className="text-right text-sm tabular-nums text-primary">
                  {apr.interestChargeAmount != null
                    ? `$${formatCurrency(apr.interestChargeAmount)}`
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

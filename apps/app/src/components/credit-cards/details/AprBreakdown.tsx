"use client";

import { formatDisplayCurrency } from "@/types/credit-cards";
import { cx } from "@repo/ui/utils";

type Apr = {
  aprPercentage: number | null;
  aprType: string;
  balanceSubjectToApr?: number | null;
  interestChargeAmount?: number | null;
};

const APR_DISPLAY_NAMES: Record<string, string> = {
  purchase_apr: "Purchase",
  cash_apr: "Cash Advance",
  balance_transfer_apr: "Balance Transfer",
};

const STANDARD_APR_TYPES = ["purchase_apr", "cash_apr", "balance_transfer_apr"];

function getAprColor(apr: Apr) {
  if (apr.aprPercentage == null) {
    return { border: "border-l-secondary", text: "text-tertiary" };
  }
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
    (sum, a) => sum + (a.aprPercentage ?? 0) * (a.balanceSubjectToApr ?? 0),
    0,
  );
  return Math.round((weightedSum / totalBalance) * 100) / 100;
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

  // Ensure all 3 standard APR types always appear
  const normalizedAprs = STANDARD_APR_TYPES.map((standardType) => {
    const existing = aprs.find((a) => a.aprType === standardType);
    return existing ?? {
      aprType: standardType,
      aprPercentage: null,
      balanceSubjectToApr: 0,
      interestChargeAmount: 0,
    };
  });
  const extraAprs = aprs.filter((a) => !STANDARD_APR_TYPES.includes(a.aprType));
  const allAprs = [...normalizedAprs, ...extraAprs];

  const weightedAvg = computeWeightedAverageApr(aprs);

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-primary">APR Breakdown</h3>
        {weightedAvg !== null && (
          <p className="text-sm text-tertiary">
            Effective APR:{" "}
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
          {allAprs.map((apr, i) => {
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
                  {APR_DISPLAY_NAMES[apr.aprType] ?? formatAprType(apr.aprType)}
                </span>
                <span className={cx("text-right text-sm font-medium tabular-nums", color.text)}>
                  {apr.aprPercentage != null ? `${apr.aprPercentage.toFixed(2)}%` : "—"}
                  {apr.aprPercentage != null && apr.aprPercentage > 0 && (apr.aprType?.includes("purchase") || apr.aprType?.includes("cash") || apr.aprType?.includes("balance_transfer")) && (
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
                    ? formatDisplayCurrency(apr.balanceSubjectToApr)
                    : "—"}
                </span>
                <span className="text-right text-sm tabular-nums text-primary">
                  {apr.interestChargeAmount != null
                    ? formatDisplayCurrency(apr.interestChargeAmount)
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

"use client";

import { useMemo } from "react";
import { cx } from "@repo/ui/utils";
import {
  formatDisplayCurrency,
  formatApr,
  formatPercentage,
  formatDueDate,
  getUtilizationColor,
} from "@/types/credit-cards";
import type { ExtendedCreditCardData, Transaction } from "@/types/credit-cards";
interface KeyMetricsProps {
  card: ExtendedCreditCardData;
  transactions?: Transaction[];
}

/**
 * Key Metrics Row - 4-column horizontal layout with vertical dividers
 * Matches SmartPockets design pattern
 */
export function KeyMetrics({ card, transactions = [] }: KeyMetricsProps) {
  // Calculate pending charges total
  const pendingTotal = useMemo(() => {
    return transactions
      .filter((txn) => txn.status === "Pending")
      .reduce((sum, txn) => sum + txn.amount, 0);
  }, [transactions]);

  const pendingCount = useMemo(() => {
    return transactions.filter((txn) => txn.status === "Pending").length;
  }, [transactions]);

  // Calculate available credit percentage
  const availablePercent =
    card.creditLimit && card.availableCredit
      ? Math.round((card.availableCredit / card.creditLimit) * 100)
      : null;

  // Calculate recommended payment (statement balance or current balance)
  const recommendedPayment = card.lastStatementBalance ?? card.currentBalance ?? 0;

  return (
    <div className="border-y border-secondary bg-primary">
      <div className="px-4 py-4 lg:px-6">
        {/* Key Metrics - 4 columns with vertical dividers on lg+ */}
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:flex lg:flex-row lg:gap-0">
          {/* Current Balance */}
          <div className="flex flex-1 flex-col gap-1 lg:pr-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-tertiary">Current Balance</p>
              {card.utilization !== null && (
                <span className={cx("text-sm font-medium", getUtilizationColor(card.utilization))}>
                  {formatPercentage(card.utilization, 0)}
                </span>
              )}
            </div>
            <p className="text-xl font-semibold text-primary tabular-nums lg:text-2xl">
              {formatDisplayCurrency(card.currentBalance)}
            </p>
            <div className="flex flex-col gap-0.5 text-xs text-tertiary">
              <span>of {formatDisplayCurrency(card.creditLimit)}</span>
              {pendingTotal > 0 && (
                <span className="font-medium text-utility-warning-600">
                  {formatDisplayCurrency(pendingTotal)} pending ({pendingCount}{" "}
                  {pendingCount === 1 ? "charge" : "charges"})
                </span>
              )}
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="hidden w-px self-stretch bg-tertiary/40 lg:block" />

          {/* Minimum Payment */}
          <div className="flex flex-1 flex-col gap-1 lg:px-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-tertiary">Minimum Payment</p>
              <span className="text-xs text-tertiary">
                Due {card.nextPaymentDueDate ? formatDueDate(card.nextPaymentDueDate) : "--"}
              </span>
            </div>
            <p className="text-xl font-semibold text-primary tabular-nums lg:text-2xl">
              {formatDisplayCurrency(card.minimumPaymentAmount)}
            </p>
            <p className="text-xs text-tertiary">
              Recommended: {formatDisplayCurrency(recommendedPayment)}
            </p>
          </div>

          {/* Vertical Divider */}
          <div className="hidden w-px self-stretch bg-tertiary/40 lg:block" />

          {/* APR (Purchase) */}
          <div className="flex flex-1 flex-col gap-1 lg:px-6">
            <p className="text-sm font-medium text-tertiary">APR (Purchase)</p>
            <p className="text-xl font-semibold text-primary tabular-nums lg:text-2xl">
              {formatApr(card.apr)}
            </p>
            <p className="text-xs text-tertiary">Annual Percentage Rate</p>
          </div>

          {/* Vertical Divider */}
          <div className="hidden w-px self-stretch bg-tertiary/40 lg:block" />

          {/* Available Credit */}
          <div className="flex flex-1 flex-col gap-1 lg:pl-6">
            <p className="text-sm font-medium text-tertiary">Available Credit</p>
            <p className="text-xl font-semibold text-primary tabular-nums lg:text-2xl">
              {formatDisplayCurrency(card.availableCredit)}
            </p>
            <p className="text-xs text-tertiary">
              {availablePercent !== null ? `${availablePercent}% of limit` : "--"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

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
  const pendingTotal = transactions
    .filter((txn) => txn.status === "Pending")
    .reduce((sum, txn) => sum + txn.amount, 0);

  const pendingCount = transactions.filter((txn) => txn.status === "Pending").length;

  // Calculate available credit percentage
  const availablePercent =
    card.creditLimit && card.availableCredit
      ? Math.round((card.availableCredit / card.creditLimit) * 100)
      : null;

  // Calculate recommended payment (statement balance or current balance)
  const recommendedPayment = card.lastStatementBalance ?? card.currentBalance ?? 0;

  return (
    <div className="border-y border-secondary bg-primary dark:border-white/[0.06]">
      <div className="px-4 py-5 lg:px-6">
        {/* Key Metrics - 4 columns with vertical dividers on lg+ */}
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:flex lg:flex-row lg:gap-0">
          {/* Current Balance */}
          <div className="flex flex-1 flex-col gap-1.5 lg:pr-6">
            <div className="flex items-center justify-between">
              <p className="font-[family-name:var(--font-geist-mono)] text-[0.65rem] uppercase tracking-[0.22em] text-tertiary dark:text-stone-500">
                <em className="font-[family-name:var(--font-fraunces)] italic font-medium normal-case tracking-normal text-stone-300 dark:text-stone-300">Current</em>{" "}
                Balance
              </p>
              {card.utilization !== null && (
                <span className={cx("font-[family-name:var(--font-geist-mono)] text-xs font-semibold tabular-nums", getUtilizationColor(card.utilization))}>
                  {formatPercentage(card.utilization, 0)}
                </span>
              )}
            </div>
            <p className="text-xl font-semibold text-primary tabular-nums lg:text-[1.65rem]">
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
          <div className="hidden w-px self-stretch border-l border-secondary lg:block dark:border-white/[0.06]" />

          {/* Minimum Payment */}
          <div className="flex flex-1 flex-col gap-1.5 lg:px-6">
            <div className="flex items-center justify-between">
              <p className="font-[family-name:var(--font-geist-mono)] text-[0.65rem] uppercase tracking-[0.22em] text-tertiary dark:text-stone-500">
                <em className="font-[family-name:var(--font-fraunces)] italic font-medium normal-case tracking-normal text-stone-300 dark:text-stone-300">Minimum</em>{" "}
                Payment
              </p>
              <span className="font-[family-name:var(--font-geist-mono)] text-[0.6rem] uppercase tracking-[0.18em] text-tertiary dark:text-stone-500">
                Due {card.nextPaymentDueDate ? formatDueDate(card.nextPaymentDueDate) : "--"}
              </span>
            </div>
            <p className="text-xl font-semibold text-primary tabular-nums lg:text-[1.65rem]">
              {formatDisplayCurrency(card.minimumPaymentAmount)}
            </p>
            <p className="text-xs text-tertiary">
              Recommended: {formatDisplayCurrency(recommendedPayment)}
            </p>
          </div>

          {/* Vertical Divider */}
          <div className="hidden w-px self-stretch border-l border-secondary lg:block dark:border-white/[0.06]" />

          {/* APR (Purchase) */}
          <div className="flex flex-1 flex-col gap-1.5 lg:px-6">
            <p className="font-[family-name:var(--font-geist-mono)] text-[0.65rem] uppercase tracking-[0.22em] text-tertiary dark:text-stone-500">
              <em className="font-[family-name:var(--font-fraunces)] italic font-medium normal-case tracking-normal text-stone-300 dark:text-stone-300">APR</em>{" "}
              (purchase)
            </p>
            <p className="text-xl font-semibold text-primary tabular-nums lg:text-[1.65rem]">
              {formatApr(card.apr)}
            </p>
            <p className="text-xs text-tertiary">Annual Percentage Rate</p>
          </div>

          {/* Vertical Divider */}
          <div className="hidden w-px self-stretch border-l border-secondary lg:block dark:border-white/[0.06]" />

          {/* Available Credit */}
          <div className="flex flex-1 flex-col gap-1.5 lg:pl-6">
            <p className="font-[family-name:var(--font-geist-mono)] text-[0.65rem] uppercase tracking-[0.22em] text-tertiary dark:text-stone-500">
              <em className="font-[family-name:var(--font-fraunces)] italic font-medium normal-case tracking-normal text-stone-300 dark:text-stone-300">Available</em>{" "}
              Credit
            </p>
            <p className="text-xl font-semibold text-primary tabular-nums lg:text-[1.65rem]">
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

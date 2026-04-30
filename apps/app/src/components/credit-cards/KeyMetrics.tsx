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
 * Key Metrics Row — apothecary moss + champagne styling.
 *
 * Labels are JetBrains Mono uppercase, values are mono tabular numerals
 * matching the marketing site's data ledger.
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
    <div className="border-y border-[var(--apothecary-hairline)] bg-primary">
      <div className="px-4 py-5 lg:px-6">
        {/* Key Metrics - 4 columns with vertical hairline dividers on lg+ */}
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:flex lg:flex-row lg:gap-0">
          {/* Current Balance */}
          <div className="flex flex-1 flex-col gap-1 lg:pr-6">
            <div className="flex items-center justify-between">
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.22em] uppercase text-text-brand-tertiary">
                Current Balance
              </p>
              {card.utilization !== null && (
                <span
                  className={cx(
                    "font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-medium tabular-nums",
                    getUtilizationColor(card.utilization),
                  )}
                >
                  {formatPercentage(card.utilization, 0)}
                </span>
              )}
            </div>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-xl font-medium tabular-nums text-primary lg:text-2xl">
              {formatDisplayCurrency(card.currentBalance)}
            </p>
            <div className="flex flex-col gap-0.5 text-xs text-tertiary">
              <span className="tabular-nums">
                of {formatDisplayCurrency(card.creditLimit)}
              </span>
              {pendingTotal > 0 && (
                <span className="font-medium text-utility-warning-600">
                  {formatDisplayCurrency(pendingTotal)} pending ({pendingCount}{" "}
                  {pendingCount === 1 ? "charge" : "charges"})
                </span>
              )}
            </div>
          </div>

          {/* Vertical hairline */}
          <div className="hidden w-px self-stretch border-l border-[var(--apothecary-hairline)] lg:block" />

          {/* Minimum Payment */}
          <div className="flex flex-1 flex-col gap-1 lg:px-6">
            <div className="flex items-center justify-between">
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.22em] uppercase text-text-brand-tertiary">
                Minimum Payment
              </p>
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tabular-nums uppercase tracking-[0.18em] text-tertiary">
                Due {card.nextPaymentDueDate ? formatDueDate(card.nextPaymentDueDate) : "--"}
              </span>
            </div>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-xl font-medium tabular-nums text-primary lg:text-2xl">
              {formatDisplayCurrency(card.minimumPaymentAmount)}
            </p>
            <p className="text-xs text-tertiary tabular-nums">
              Recommended: {formatDisplayCurrency(recommendedPayment)}
            </p>
          </div>

          {/* Vertical hairline */}
          <div className="hidden w-px self-stretch border-l border-[var(--apothecary-hairline)] lg:block" />

          {/* APR (Purchase) */}
          <div className="flex flex-1 flex-col gap-1 lg:px-6">
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.22em] uppercase text-text-brand-tertiary">
              APR (Purchase)
            </p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-xl font-medium tabular-nums text-primary lg:text-2xl">
              {formatApr(card.apr)}
            </p>
            <p className="text-xs text-tertiary">Annual Percentage Rate</p>
          </div>

          {/* Vertical hairline */}
          <div className="hidden w-px self-stretch border-l border-[var(--apothecary-hairline)] lg:block" />

          {/* Available Credit */}
          <div className="flex flex-1 flex-col gap-1 lg:pl-6">
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.22em] uppercase text-text-brand-tertiary">
              Available Credit
            </p>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-xl font-medium tabular-nums text-primary lg:text-2xl">
              {formatDisplayCurrency(card.availableCredit)}
            </p>
            <p className="text-xs text-tertiary tabular-nums">
              {availablePercent !== null ? `${availablePercent}% of limit` : "--"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

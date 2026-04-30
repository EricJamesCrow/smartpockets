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
 * Cockpit-style key metrics row. Each cell is a square readout pane with a
 * monospace eyebrow label and a JetBrains Mono numeral. Negative deltas use
 * the rose accent, brand-green is reserved for live deltas only.
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
    <div className="border-y border-white/[0.06] bg-[#0a0d10]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Current Balance */}
        <KeyMetricPane
          eyebrow="CURRENT BALANCE"
          right={
            card.utilization !== null ? (
              <span className={cx("font-mono text-[11px] tabular-nums", getUtilizationColor(card.utilization))}>
                {formatPercentage(card.utilization, 0)}
              </span>
            ) : null
          }
          value={formatDisplayCurrency(card.currentBalance)}
          subtitle={
            <div className="flex flex-col gap-0.5">
              <span>of {formatDisplayCurrency(card.creditLimit)}</span>
              {pendingTotal > 0 && (
                <span className="font-mono text-[11px] tabular-nums text-utility-warning-600">
                  {formatDisplayCurrency(pendingTotal)} pending ({pendingCount} {pendingCount === 1 ? "charge" : "charges"})
                </span>
              )}
            </div>
          }
        />

        {/* Minimum Payment */}
        <KeyMetricPane
          eyebrow="MINIMUM PAYMENT"
          right={
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-500">
              DUE {card.nextPaymentDueDate ? formatDueDate(card.nextPaymentDueDate) : "--"}
            </span>
          }
          value={formatDisplayCurrency(card.minimumPaymentAmount)}
          subtitle={<span>Recommended: {formatDisplayCurrency(recommendedPayment)}</span>}
        />

        {/* APR (Purchase) */}
        <KeyMetricPane
          eyebrow="APR / PURCHASE"
          value={formatApr(card.apr)}
          subtitle={<span>Annual Percentage Rate</span>}
        />

        {/* Available Credit */}
        <KeyMetricPane
          eyebrow="AVAILABLE CREDIT"
          value={formatDisplayCurrency(card.availableCredit)}
          subtitle={<span>{availablePercent !== null ? `${availablePercent}% of limit` : "--"}</span>}
        />
      </div>
    </div>
  );
}

interface KeyMetricPaneProps {
  eyebrow: string;
  value: string;
  subtitle: React.ReactNode;
  right?: React.ReactNode;
}

function KeyMetricPane({ eyebrow, value, subtitle, right }: KeyMetricPaneProps) {
  return (
    <div className="relative flex flex-col gap-2 border-white/[0.06] px-5 py-4 sm:[&:not(:nth-child(2n+1))]:border-l lg:[&:not(:first-child)]:border-l">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-500">
          {eyebrow}
        </span>
        {right}
      </div>
      <p className="font-[family-name:var(--font-jetbrains-mono)] text-[24px] font-medium leading-none text-zinc-50 tabular-nums">
        {value}
      </p>
      <div className="font-mono text-[11px] tabular-nums text-zinc-500">{subtitle}</div>
    </div>
  );
}

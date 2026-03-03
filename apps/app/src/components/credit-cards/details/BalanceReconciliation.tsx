"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";
import { cx } from "@/lib/cx";

interface BalanceReconciliationProps {
  creditCardId: Id<"creditCards">;
  statementDate?: string;
  statementClosingDay?: number | null;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function BalanceReconciliation({
  creditCardId,
  statementDate,
  statementClosingDay,
}: BalanceReconciliationProps) {
  const latestSnapshots = useQuery(
    api.statementSnapshots.queries.getLatest,
    { creditCardId },
  );

  const specificSnapshot = useQuery(
    api.statementSnapshots.queries.getByDate,
    statementDate ? { creditCardId, statementDate } : "skip",
  );

  const snapshot = statementDate ? specificSnapshot : latestSnapshots?.current;

  if (statementClosingDay == null) {
    return (
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">Account Summary</h3>
        <div className="rounded-xl border border-dashed border-secondary bg-primary p-6 text-center">
          <p className="text-sm text-tertiary">
            Set your statement closing date to enable balance tracking
          </p>
        </div>
      </section>
    );
  }

  if (!snapshot) {
    return (
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">Account Summary</h3>
        <div className="rounded-xl border border-dashed border-secondary bg-primary p-6 text-center">
          <p className="text-sm text-tertiary">
            Your first statement snapshot will be generated after your next
            closing date (day {statementClosingDay})
          </p>
        </div>
      </section>
    );
  }

  const lines = [
    { label: "Previous Statement Balance", amount: snapshot.previousBalance, type: "neutral" as const },
    { label: "Payments & Credits", amount: -snapshot.paymentsAndCredits, type: "credit" as const },
    { label: "New Purchases", amount: snapshot.newPurchases, type: "debit" as const },
    { label: "Fees", amount: snapshot.fees, type: "debit" as const },
    { label: "Interest Charged", amount: snapshot.interestCharged, type: "debit" as const },
  ];

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-primary">Account Summary</h3>
        <p className="text-xs text-tertiary">Statement: {snapshot.statementDate}</p>
      </div>
      <div className="rounded-xl border border-secondary bg-primary">
        <div className="divide-y divide-secondary">
          {lines.map((line) => (
            <div key={line.label} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-tertiary">{line.label}</span>
              <span
                className={cx(
                  "text-sm font-medium tabular-nums",
                  line.type === "credit" && "text-utility-success-700",
                  line.type === "debit" && line.amount > 0 && "text-utility-error-700",
                  (line.type === "neutral" || line.amount === 0) && "text-primary",
                )}
              >
                {line.type === "credit" && line.amount !== 0 && "-"}
                {line.type === "debit" && line.amount > 0 && "+"}$
                {formatCurrency(Math.abs(line.amount))}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t-2 border-secondary px-4 py-3">
          <span className="text-sm font-semibold text-primary">New Statement Balance</span>
          <span className="text-sm font-semibold tabular-nums text-primary">
            ${formatCurrency(snapshot.newBalance)}
          </span>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { formatDisplayCurrency } from "@/types/credit-cards";

interface InterestSavingBalanceProps {
  creditCardId: Id<"creditCards">;
  purchaseAprPercentage?: number | null;
  payOverTimeEnabled?: boolean;
}

function getDescription(purchaseAprPercentage: number | null | undefined, hasPromos: boolean): string {
  if (purchaseAprPercentage === 0) {
    if (hasPromos) {
      return "Your purchase APR is 0% \u2014 pay at least required promo and installment amounts to stay on track";
    }
    return "Your purchase APR is 0% \u2014 no interest accruing on new purchases";
  }
  if (hasPromos) {
    return "Pay this amount to avoid interest on next month\u2019s purchases while keeping promotional balances intact";
  }
  return "Pay in full to avoid interest charges";
}

export function InterestSavingBalance({ creditCardId, purchaseAprPercentage, payOverTimeEnabled }: InterestSavingBalanceProps) {
  const data = useQuery(api.creditCards.queries.computeInterestSavingBalance, { creditCardId });

  if (!data) return null;

  // Zero balance short-circuit — no nag needed
  if (data.currentBalance === 0) {
    return (
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">Interest Saving Balance</h3>
        <div className="rounded-xl border border-secondary bg-primary p-4">
          <p className="text-2xl font-semibold tabular-nums text-primary">
            {formatDisplayCurrency(0)}
          </p>
          <p className="mt-1 text-xs text-tertiary">No balance — you're all clear</p>
        </div>
      </section>
    );
  }

  // POT enabled but no plan data entered — ISB would be misleading
  if (payOverTimeEnabled && !data.hasPromos) {
    return (
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">Interest Saving Balance</h3>
        <div className="rounded-xl border border-dashed border-utility-brand-200 bg-utility-brand-50 p-4">
          <p className="text-2xl font-semibold text-primary">—</p>
          <p className="mt-1 text-xs text-utility-brand-700">
            Enter your Pay Over Time plans below to see your accurate interest saving balance
          </p>
        </div>
      </section>
    );
  }

  const isZeroPurchaseApr = purchaseAprPercentage === 0;
  const displayedAmount = isZeroPurchaseApr && data.hasPromos
    ? data.totalProtectedPayments
    : data.interestSavingBalance;

  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold text-primary">Interest Saving Balance</h3>
      <div className="rounded-xl border border-secondary bg-primary p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-primary">
              {formatDisplayCurrency(displayedAmount)}
            </p>
            <p className="mt-1 text-xs text-tertiary">
              {getDescription(purchaseAprPercentage, data.hasPromos)}
            </p>
          </div>
        </div>

        {data.hasPromos && (
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-secondary pt-3 text-xs text-tertiary">
            <div>
              <p className="tabular-nums font-medium text-primary">{formatDisplayCurrency(data.currentBalance)}</p>
              <p>Current Balance</p>
            </div>
            <div>
              <p className="tabular-nums font-medium text-primary">{formatDisplayCurrency(data.totalProtectedBalances)}</p>
              <p>Protected Balances</p>
            </div>
            <div>
              <p className="tabular-nums font-medium text-primary">{formatDisplayCurrency(data.totalProtectedPayments)}</p>
              <p>Required Payments</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

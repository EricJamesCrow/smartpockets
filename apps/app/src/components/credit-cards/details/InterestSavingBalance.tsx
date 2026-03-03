"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { formatDisplayCurrency } from "@/types/credit-cards";

interface InterestSavingBalanceProps {
  creditCardId: Id<"creditCards">;
  purchaseAprPercentage?: number | null;
}

function getDescription(purchaseAprPercentage: number | null | undefined, hasPromos: boolean): string {
  if (purchaseAprPercentage === 0) {
    return "Your purchases are at 0% APR \u2014 no interest accruing on new purchases";
  }
  if (hasPromos) {
    return "Pay this amount to avoid interest on next month\u2019s purchases while keeping promotional balances intact";
  }
  return "Pay in full to avoid interest charges";
}

export function InterestSavingBalance({ creditCardId, purchaseAprPercentage }: InterestSavingBalanceProps) {
  const data = useQuery(api.creditCards.queries.computeInterestSavingBalance, { creditCardId });

  if (!data) return null;

  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold text-primary">Interest Saving Balance</h3>
      <div className="rounded-xl border border-secondary bg-primary p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-primary">
              {formatDisplayCurrency(data.interestSavingBalance)}
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

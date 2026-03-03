"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface FeesInterestYtdProps {
  creditCardId: Id<"creditCards">;
}

export function FeesInterestYtd({ creditCardId }: FeesInterestYtdProps) {
  const data = useQuery(api.creditCards.queries.computeYtdFeesInterest, { creditCardId });

  if (!data) return null;

  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold text-primary">{data.year} Year-to-Date</h3>
      <div className="rounded-xl border border-secondary bg-primary">
        <div className="grid grid-cols-1 divide-y divide-secondary sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="p-4">
            <p className="text-xs text-tertiary">Total Fees</p>
            <p className="text-lg font-semibold tabular-nums text-primary">${formatCurrency(data.totalFees)}</p>
          </div>
          <div className="p-4">
            <p className="text-xs text-tertiary">Total Interest</p>
            <p className="text-lg font-semibold tabular-nums text-primary">${formatCurrency(data.totalInterest)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

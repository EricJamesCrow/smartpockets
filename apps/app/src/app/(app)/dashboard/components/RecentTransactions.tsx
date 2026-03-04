// apps/app/src/app/(app)/dashboard/components/RecentTransactions.tsx
"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import { parseLocalDate } from "@/types/credit-cards";

function formatCurrency(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
  return amount >= 0 ? `-${formatted}` : `+${formatted}`;
}

function groupByDate<T extends { date: string }>(
  transactions: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const tx of transactions) {
    const txDate = parseLocalDate(tx.date);

    let label: string;
    if (txDate.getTime() === today.getTime()) {
      label = "Today";
    } else if (txDate.getTime() === yesterday.getTime()) {
      label = "Yesterday";
    } else {
      label = txDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }

    const group = groups.get(label);
    if (group) {
      group.push(tx);
    } else {
      groups.set(label, [tx]);
    }
  }

  return groups;
}

export function RecentTransactions() {
  const { isAuthenticated } = useConvexAuth();
  const transactions = useQuery(
    api.dashboard.queries.getRecentTransactions,
    isAuthenticated ? { limit: 10 } : "skip"
  );

  if (!transactions) {
    return (
      <div className="rounded-xl border border-primary bg-primary p-5">
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Recent Transactions
        </h3>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  const grouped = groupByDate(transactions);

  return (
    <div className="rounded-xl border border-primary bg-primary p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">
          Recent Transactions
        </h3>
        <Link
          href="/transactions"
          className="text-sm font-medium text-brand-secondary hover:underline"
        >
          View all →
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-tertiary">No recent transactions</p>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([date, txs]) => (
            <div key={date}>
              <p className="mb-2 text-xs font-medium text-tertiary">{date}</p>
              <div className="space-y-1">
                {txs.map((tx) => (
                  <div
                    key={tx.transactionId}
                    className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-secondary"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-primary">
                        {tx.merchantName}
                        {tx.pending && (
                          <span className="ml-2 text-xs text-tertiary">
                            Pending
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-tertiary">
                        {tx.cardName} ••••{tx.cardLastFour}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-medium ${tx.amount >= 0 ? "text-primary" : "text-success-600"}`}
                    >
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

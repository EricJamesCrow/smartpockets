// apps/app/src/app/(app)/dashboard/components/UpcomingPayments.tsx
"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Check } from "@untitledui/icons";
import { cx } from "@repo/ui/utils";
import Link from "next/link";

function formatCurrency(amount: number): string {
  return (amount / 1000).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDueDate(dueDate: string, daysUntilDue: number): string {
  if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} days overdue`;
  if (daysUntilDue === 0) return "TODAY";
  if (daysUntilDue === 1) return "Tomorrow";
  if (daysUntilDue <= 7) return `in ${daysUntilDue} days`;
  return new Date(dueDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getDotColor(payment: {
  isOverdue: boolean;
  isPaid: boolean;
  daysUntilDue: number;
}): string {
  if (payment.isPaid) return "bg-success-500";
  if (payment.isOverdue) return "bg-error-500";
  if (payment.daysUntilDue <= 3) return "bg-warning-500";
  if (payment.daysUntilDue <= 7) return "bg-warning-300";
  return "bg-gray-300";
}

export function UpcomingPayments() {
  const { isAuthenticated } = useConvexAuth();
  const payments = useQuery(
    api.dashboard.queries.getUpcomingPayments,
    isAuthenticated ? {} : "skip"
  );

  if (!payments) {
    return (
      <div className="rounded-xl border border-primary bg-primary p-5">
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Upcoming Payments
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  const unpaid = payments.filter((p) => !p.isPaid);
  const paid = payments.filter((p) => p.isPaid);

  return (
    <div className="rounded-xl border border-primary bg-primary p-5">
      <h3 className="mb-4 text-lg font-semibold text-primary">
        Upcoming Payments
      </h3>

      {unpaid.length === 0 && paid.length === 0 ? (
        <p className="text-sm text-tertiary">No upcoming payments</p>
      ) : (
        <div className="space-y-2">
          {unpaid.map((payment) => (
            <Link
              key={payment.cardId}
              href={`/credit-cards/${payment.cardId}`}
              className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-secondary"
            >
              <div className="flex items-center gap-3">
                <div className={cx("size-2 rounded-full", getDotColor(payment))} />
                <div>
                  <p className="text-sm font-medium text-primary">
                    {payment.cardName}
                    {payment.isAutoPay && (
                      <span className="ml-2 text-xs text-tertiary">Auto</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-primary">
                  {formatCurrency(payment.minimumPayment)}
                </p>
                <p
                  className={cx(
                    "text-xs",
                    payment.isOverdue ? "text-error-600" : "text-tertiary"
                  )}
                >
                  {formatDueDate(payment.dueDate, payment.daysUntilDue)}
                </p>
              </div>
            </Link>
          ))}

          {paid.length > 0 && (
            <>
              <div className="my-3 flex items-center gap-2 text-xs text-tertiary">
                <div className="h-px flex-1 bg-border-secondary" />
                <span>Paid this cycle</span>
                <div className="h-px flex-1 bg-border-secondary" />
              </div>
              {paid.slice(0, 3).map((payment) => (
                <Link
                  key={payment.cardId}
                  href={`/credit-cards/${payment.cardId}`}
                  className="flex items-center justify-between rounded-lg px-2 py-2 opacity-60 hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <Check className="size-4 text-success-500" />
                    <p className="text-sm text-primary">{payment.cardName}</p>
                  </div>
                  <p className="text-sm text-tertiary">
                    {formatCurrency(payment.minimumPayment)}
                  </p>
                </Link>
              ))}
            </>
          )}
        </div>
      )}

      <Link
        href="/credit-cards"
        className="mt-4 block text-center text-sm font-medium text-brand-secondary hover:underline"
      >
        View all payments →
      </Link>
    </div>
  );
}

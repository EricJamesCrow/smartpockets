// apps/app/src/app/(app)/dashboard/components/YourCards.tsx
"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Lock01 } from "@untitledui/icons";
import { cx } from "@repo/ui/utils";
import Link from "next/link";
import {
  VisaIcon,
  MastercardIcon,
  AmexIcon,
  DiscoverIcon,
} from "@repo/ui/untitledui/foundations/payment-icons";
import { parseLocalDate } from "@/types/credit-cards";

function formatCurrency(amount: number): string {
  return (amount / 1000).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function CardLogo({ brand }: { brand?: string }) {
  switch (brand) {
    case "visa":
      return <VisaIcon className="h-6 w-auto" />;
    case "mastercard":
      return <MastercardIcon className="h-6 w-auto" />;
    case "amex":
      return <AmexIcon className="h-6 w-auto" />;
    case "discover":
      return <DiscoverIcon className="h-6 w-auto" />;
    default:
      return <div className="h-6 w-10 rounded bg-gray-200" />;
  }
}

export function YourCards() {
  const { isAuthenticated } = useConvexAuth();
  const cards = useQuery(
    api.creditCards.queries.list,
    isAuthenticated ? {} : "skip"
  );

  if (!cards) {
    return (
      <div className="rounded-xl border border-primary bg-primary p-5">
        <h3 className="mb-4 text-lg font-semibold text-primary">Your Cards</h3>
        <div className="flex gap-4 overflow-x-auto">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 w-44 shrink-0 animate-pulse rounded-xl bg-secondary"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary bg-primary p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">Your Cards</h3>
        <Link
          href="/credit-cards"
          className="text-sm font-medium text-brand-secondary hover:underline"
        >
          View all →
        </Link>
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-tertiary">No cards connected</p>
      ) : (
        <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2">
          {cards.map((card) => {
            const utilization =
              card.creditLimit && card.creditLimit > 0
                ? ((card.currentBalance ?? 0) / card.creditLimit) * 100
                : 0;
            const utilizationColor =
              utilization < 30
                ? "bg-success-500"
                : utilization < 50
                  ? "bg-warning-500"
                  : "bg-error-500";

            return (
              <Link
                key={card._id}
                href={`/credit-cards/${card._id}`}
                className="w-44 shrink-0 rounded-xl border border-primary p-4 hover:border-brand-primary"
              >
                <div className="mb-3 flex items-center justify-between">
                  <CardLogo brand={card.brand} />
                  {card.isLocked && (
                    <Lock01 className="size-4 text-tertiary" />
                  )}
                </div>
                <p className="truncate text-sm font-medium text-primary">
                  {card.displayName}
                </p>
                <p className="mt-2 text-lg font-semibold text-primary">
                  {formatCurrency(card.currentBalance ?? 0)}
                </p>

                {/* Utilization bar */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-tertiary">
                      {utilization.toFixed(0)}%
                    </span>
                    {utilization > 30 && (
                      <span className="text-warning-600">⚠</span>
                    )}
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200">
                    <div
                      className={cx("h-full rounded-full", utilizationColor)}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Payment status */}
                <p className="mt-2 text-xs text-tertiary">
                  {card.nextPaymentDueDate
                    ? `Due ${parseLocalDate(card.nextPaymentDueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : card.isAutoPay
                      ? "✓ AutoPay"
                      : "No due date"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

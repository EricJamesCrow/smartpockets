"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { formatDisplayCurrency } from "@/types/credit-cards";
import { cx } from "@/utils/cx";
import { InlineEditableField } from "./InlineEditableField";

function getMonthsRemaining(expirationDate: string): number {
  const now = new Date();
  const expiry = new Date(expirationDate);
  const months =
    (expiry.getFullYear() - now.getFullYear()) * 12 +
    (expiry.getMonth() - now.getMonth());
  return Math.max(0, months);
}

function getUrgencyColor(monthsRemaining: number): string {
  if (monthsRemaining <= 1) return "bg-utility-error-500";
  if (monthsRemaining <= 3) return "bg-utility-orange-500";
  if (monthsRemaining <= 6) return "bg-utility-warning-500";
  return "bg-utility-success-500";
}

function getProgressPercentage(startDate: string, expirationDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(expirationDate).getTime();
  const now = Date.now();
  if (now >= end) return 100;
  if (now <= start) return 0;
  return Math.round(((now - start) / (end - start)) * 100);
}

interface PromoTrackerProps {
  creditCardId: Id<"creditCards">;
}

export function PromoTracker({ creditCardId }: PromoTrackerProps) {
  const promos = useQuery(api.promoRates.queries.listByCard, { creditCardId });
  const installments = useQuery(api.installmentPlans.queries.listByCard, { creditCardId });
  const setExpirationOverride = useMutation(api.promoRates.mutations.setExpirationOverride);
  const clearExpirationOverride = useMutation(api.promoRates.mutations.clearExpirationOverride);

  if (promos === undefined || installments === undefined) return null;

  const hasPromos = promos.length > 0;
  const hasInstallments = installments.length > 0;

  if (!hasPromos && !hasInstallments) {
    return (
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">Promotional Financing</h3>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-secondary bg-primary p-6 text-sm text-tertiary cursor-not-allowed opacity-60"
        >
          <span className="text-lg">+</span>
          Add promotional APR or installment plan
        </button>
      </section>
    );
  }

  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold text-primary">Promotional Financing</h3>
      <div className="space-y-3">
        {promos?.map((promo) => {
          const effectiveExpiration = promo.userOverrides?.expirationDate ?? promo.expirationDate;
          const monthsLeft = getMonthsRemaining(effectiveExpiration);
          const progress = getProgressPercentage(promo.startDate, effectiveExpiration);
          const urgencyColor = getUrgencyColor(monthsLeft);

          return (
            <div key={promo._id} className="rounded-xl border border-secondary bg-primary">
              <div className="p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {promo.description}
                      {promo.isManual && (
                        <span className="ml-2 rounded-full bg-utility-brand-50 px-2 py-0.5 text-xs font-medium text-utility-brand-700">
                          Manual
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-tertiary">
                      {promo.aprPercentage}% APR &middot; Expires{" "}
                      <InlineEditableField
                        value={promo.userOverrides?.expirationDate ?? promo.expirationDate}
                        plaidValue={promo.expirationDate}
                        isOverridden={promo.userOverrides?.expirationDate != null}
                        type="date"
                        onSave={async (v) => {
                          await setExpirationOverride({ promoRateId: promo._id, expirationDate: String(v) });
                        }}
                        onRevert={async () => {
                          await clearExpirationOverride({ promoRateId: promo._id });
                        }}
                        className="inline"
                      />
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-primary">
                    {formatDisplayCurrency(promo.remainingBalance)}
                  </span>
                </div>

                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cx("h-full rounded-full transition-all", urgencyColor)}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-tertiary">
                  {monthsLeft > 0
                    ? `${monthsLeft} month${monthsLeft !== 1 ? "s" : ""} remaining`
                    : "Expired"}
                </p>

                {promo.isDeferredInterest &&
                  promo.accruedDeferredInterest != null &&
                  promo.accruedDeferredInterest > 0 && (
                    <div className="mt-3 rounded-lg bg-utility-error-50 px-3 py-2 text-xs text-utility-error-700">
                      Deferred interest accrued: {formatDisplayCurrency(promo.accruedDeferredInterest)}.
                      Pay remaining balance by expiration to avoid this charge.
                    </div>
                  )}

                {promo.monthlyMinimumPayment != null && (
                  <p className="mt-2 text-xs text-tertiary">
                    Monthly minimum: {formatDisplayCurrency(promo.monthlyMinimumPayment)}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {hasInstallments && (
          <div className="rounded-xl border border-secondary bg-primary">
            <div className="border-b border-secondary px-4 py-2.5">
              <span className="text-xs font-medium text-tertiary">Installment Plans</span>
            </div>
            <div className="divide-y divide-secondary">
              {installments?.map((plan) => (
                <div key={plan._id} className="px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary">{plan.description}</p>
                      <p className="text-xs text-tertiary">
                        {plan.remainingPayments} of {plan.totalPayments} payments remaining
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-primary">
                        {formatDisplayCurrency(plan.monthlyPrincipal + plan.monthlyFee)}
                        <span className="text-xs font-normal text-tertiary">/mo</span>
                      </p>
                      <p className="text-xs tabular-nums text-tertiary">
                        {formatDisplayCurrency(plan.remainingPrincipal)} remaining
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          disabled
          title="Coming soon"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-secondary bg-primary p-4 text-sm text-tertiary cursor-not-allowed opacity-60"
        >
          <span className="text-lg">+</span>
          Add promotional rate or plan
        </button>
      </div>
    </section>
  );
}

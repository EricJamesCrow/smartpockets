"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { addPromoSchema, type AddPromoFormValues } from "@/lib/validations";
import { formatDisplayCurrency, parseLocalDate } from "@/types/credit-cards";
import { cx } from "@/utils/cx";
import { InlineEditableField } from "./InlineEditableField";

function getMonthsRemaining(expirationDate: string): number {
  const now = new Date();
  const expiry = parseLocalDate(expirationDate);
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
  const start = parseLocalDate(startDate).getTime();
  const end = parseLocalDate(expirationDate).getTime();
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
  const createPromo = useMutation(api.promoRates.mutations.create);
  const [showAddForm, setShowAddForm] = useState(false);

  if (promos === undefined || installments === undefined) return null;

  const hasPromos = promos.length > 0;
  const hasInstallments = installments.length > 0;

  const addPromoToggle = showAddForm ? (
    <AddPromoForm
      onSave={async (data) => {
        await createPromo({ ...data, creditCardId, isManual: true });
        setShowAddForm(false);
      }}
      onCancel={() => setShowAddForm(false)}
    />
  ) : (
    <button
      type="button"
      onClick={() => setShowAddForm(true)}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-secondary bg-primary p-6 text-sm text-tertiary transition-colors hover:border-utility-brand-300 hover:text-utility-brand-700"
    >
      <span className="text-lg">+</span>
      Add promotional APR or installment plan
    </button>
  );

  if (!hasPromos && !hasInstallments) {
    return (
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">Promotional Financing</h3>
        {addPromoToggle}
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

        {addPromoToggle}
      </div>
    </section>
  );
}

function AddPromoForm({
  onSave,
  onCancel,
}: {
  onSave: (data: {
    description: string;
    aprPercentage: number;
    originalBalance: number;
    remainingBalance: number;
    startDate: string;
    expirationDate: string;
    isDeferredInterest: boolean;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<AddPromoFormValues>({
    resolver: zodResolver(addPromoSchema),
    defaultValues: {
      description: "",
      aprPercentage: undefined as unknown as number,
      balance: undefined as unknown as number,
      startDate: "",
      expirationDate: "",
      isDeferredInterest: false,
    },
  });

  const onSubmit = async (data: AddPromoFormValues) => {
    try {
      await onSave({
        description: data.description,
        aprPercentage: data.aprPercentage,
        originalBalance: data.balance,
        remainingBalance: data.balance,
        startDate: data.startDate,
        expirationDate: data.expirationDate,
        isDeferredInterest: data.isDeferredInterest,
      });
    } catch {
      setError("root", { message: "Failed to create promo rate. Please try again." });
    }
  };

  const inputClassName = "w-full rounded-lg border border-secondary px-3 py-1.5 text-sm text-primary placeholder:text-tertiary focus:border-utility-brand-500 focus:outline-none focus:ring-1 focus:ring-utility-brand-500";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-secondary bg-primary p-4 space-y-3">
      <h4 className="text-sm font-medium text-primary">Add Promotional Rate</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-tertiary">Description</label>
          <input type="text" {...register("description")} placeholder="e.g. 0% Intro APR" className={inputClassName} />
          {errors.description && <p className="mt-1 text-xs text-utility-error-700">{errors.description.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs text-tertiary">APR %</label>
          <input type="number" step="0.01" {...register("aprPercentage", { valueAsNumber: true })} placeholder="0.00" className={cx(inputClassName, "tabular-nums")} />
          {errors.aprPercentage && <p className="mt-1 text-xs text-utility-error-700">{errors.aprPercentage.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs text-tertiary">Balance</label>
          <input type="number" step="0.01" {...register("balance", { valueAsNumber: true })} placeholder="0.00" className={cx(inputClassName, "tabular-nums")} />
          {errors.balance && <p className="mt-1 text-xs text-utility-error-700">{errors.balance.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs text-tertiary">Start Date</label>
          <input type="date" {...register("startDate")} className={inputClassName} />
          {errors.startDate && <p className="mt-1 text-xs text-utility-error-700">{errors.startDate.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs text-tertiary">Expiration Date</label>
          <input type="date" {...register("expirationDate")} className={inputClassName} />
          {errors.expirationDate && <p className="mt-1 text-xs text-utility-error-700">{errors.expirationDate.message}</p>}
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-xs text-tertiary">
            <input type="checkbox" {...register("isDeferredInterest")} className="rounded border-secondary" />
            Deferred interest
          </label>
        </div>
      </div>
      {errors.root && <p className="text-xs text-utility-error-700">{errors.root.message}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm text-tertiary hover:text-primary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="rounded-lg bg-utility-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-utility-brand-700 disabled:opacity-50">{isSubmitting ? "Saving..." : "Add"}</button>
      </div>
    </form>
  );
}

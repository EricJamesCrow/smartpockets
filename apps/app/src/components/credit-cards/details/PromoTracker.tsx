"use client";

import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDisplayCurrency, parseLocalDate } from "@/types/credit-cards";
import { cx } from "@/utils/cx";
import { dollarsToMilliunits } from "@/utils/money";
import { InlineEditableField } from "./InlineEditableField";

function getMonthsRemaining(expirationDate: string): number {
    const now = new Date();
    const expiry = parseLocalDate(expirationDate);
    const months = (expiry.getFullYear() - now.getFullYear()) * 12 + (expiry.getMonth() - now.getMonth());
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
            className="border-secondary bg-primary text-tertiary hover:border-utility-brand-300 hover:text-utility-brand-700 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-sm transition-colors"
        >
            <span className="text-lg">+</span>
            Add promotional APR or installment plan
        </button>
    );

    if (!hasPromos && !hasInstallments) {
        return (
            <section>
                <h3 className="text-primary mb-4 text-lg font-semibold">Promotional Financing</h3>
                {addPromoToggle}
            </section>
        );
    }

    return (
        <section>
            <h3 className="text-primary mb-4 text-lg font-semibold">Promotional Financing</h3>
            <div className="space-y-3">
                {promos?.map((promo) => {
                    const effectiveExpiration = promo.userOverrides?.expirationDate ?? promo.expirationDate;
                    const monthsLeft = getMonthsRemaining(effectiveExpiration);
                    const progress = getProgressPercentage(promo.startDate, effectiveExpiration);
                    const urgencyColor = getUrgencyColor(monthsLeft);

                    return (
                        <div key={promo._id} className="border-secondary bg-primary rounded-xl border">
                            <div className="p-4">
                                <div className="mb-3 flex items-start justify-between">
                                    <div>
                                        <p className="text-primary text-sm font-medium">
                                            {promo.description}
                                            {promo.isManual && (
                                                <span className="bg-utility-brand-50 text-utility-brand-700 ml-2 rounded-full px-2 py-0.5 text-xs font-medium">
                                                    Manual
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-tertiary text-xs">
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
                                    <span className="text-primary text-sm font-semibold tabular-nums">{formatDisplayCurrency(promo.remainingBalance)}</span>
                                </div>

                                <div className="bg-secondary mb-2 h-1.5 overflow-hidden rounded-full">
                                    <div className={cx("h-full rounded-full transition-all", urgencyColor)} style={{ width: `${progress}%` }} />
                                </div>
                                <p className="text-tertiary text-xs">
                                    {monthsLeft > 0 ? `${monthsLeft} month${monthsLeft !== 1 ? "s" : ""} remaining` : "Expired"}
                                </p>

                                {promo.isDeferredInterest && promo.accruedDeferredInterest != null && promo.accruedDeferredInterest > 0 && (
                                    <div className="bg-utility-error-50 text-utility-error-700 mt-3 rounded-lg px-3 py-2 text-xs">
                                        Deferred interest accrued: {formatDisplayCurrency(promo.accruedDeferredInterest)}. Pay remaining balance by expiration
                                        to avoid this charge.
                                    </div>
                                )}

                                {promo.monthlyMinimumPayment != null && (
                                    <p className="text-tertiary mt-2 text-xs">Monthly minimum: {formatDisplayCurrency(promo.monthlyMinimumPayment)}</p>
                                )}
                            </div>
                        </div>
                    );
                })}

                {hasInstallments && (
                    <div className="border-secondary bg-primary rounded-xl border">
                        <div className="border-secondary border-b px-4 py-2.5">
                            <span className="text-tertiary text-xs font-medium">Installment Plans</span>
                        </div>
                        <div className="divide-secondary divide-y">
                            {installments?.map((plan) => (
                                <div key={plan._id} className="px-4 py-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-primary text-sm font-medium">{plan.description}</p>
                                            <p className="text-tertiary text-xs">
                                                {plan.remainingPayments} of {plan.totalPayments} payments remaining
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-primary text-sm font-semibold tabular-nums">
                                                {formatDisplayCurrency(plan.monthlyPrincipal + plan.monthlyFee)}
                                                <span className="text-tertiary text-xs font-normal">/mo</span>
                                            </p>
                                            <p className="text-tertiary text-xs tabular-nums">{formatDisplayCurrency(plan.remainingPrincipal)} remaining</p>
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
    const [description, setDescription] = useState("");
    const [aprPercentage, setAprPercentage] = useState("");
    const [balance, setBalance] = useState("");
    const [startDate, setStartDate] = useState("");
    const [expirationDate, setExpirationDate] = useState("");
    const [isDeferredInterest, setIsDeferredInterest] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedDescription = description.trim();
        if (!trimmedDescription || !aprPercentage || !balance || !startDate || !expirationDate) {
            setError("All fields are required.");
            return;
        }
        const aprNum = parseFloat(aprPercentage);
        const balanceNum = parseFloat(balance);
        if (aprNum < 0) {
            setError("APR cannot be negative.");
            return;
        }
        if (balanceNum <= 0) {
            setError("Balance must be greater than zero.");
            return;
        }
        if (expirationDate <= startDate) {
            setError("Expiration date must be after start date.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await onSave({
                description: trimmedDescription,
                aprPercentage: aprNum,
                originalBalance: dollarsToMilliunits(balanceNum),
                remainingBalance: dollarsToMilliunits(balanceNum),
                startDate,
                expirationDate,
                isDeferredInterest,
            });
        } catch {
            setError("Failed to create promo rate. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="border-secondary bg-primary space-y-3 rounded-xl border p-4">
            <h4 className="text-primary text-sm font-medium">Add Promotional Rate</h4>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-tertiary mb-1 block text-xs">Description</label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. 0% Intro APR"
                        className="border-secondary text-primary placeholder:text-tertiary focus:border-utility-brand-500 focus:ring-utility-brand-500 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1"
                    />
                </div>
                <div>
                    <label className="text-tertiary mb-1 block text-xs">APR %</label>
                    <input
                        type="number"
                        step="0.01"
                        value={aprPercentage}
                        onChange={(e) => setAprPercentage(e.target.value)}
                        placeholder="0.00"
                        className="border-secondary text-primary placeholder:text-tertiary focus:border-utility-brand-500 focus:ring-utility-brand-500 w-full rounded-lg border px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1"
                    />
                </div>
                <div>
                    <label className="text-tertiary mb-1 block text-xs">Balance</label>
                    <input
                        type="number"
                        step="0.01"
                        value={balance}
                        onChange={(e) => setBalance(e.target.value)}
                        placeholder="0.00"
                        className="border-secondary text-primary placeholder:text-tertiary focus:border-utility-brand-500 focus:ring-utility-brand-500 w-full rounded-lg border px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1"
                    />
                </div>
                <div>
                    <label className="text-tertiary mb-1 block text-xs">Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border-secondary text-primary focus:border-utility-brand-500 focus:ring-utility-brand-500 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1"
                    />
                </div>
                <div>
                    <label className="text-tertiary mb-1 block text-xs">Expiration Date</label>
                    <input
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        className="border-secondary text-primary focus:border-utility-brand-500 focus:ring-utility-brand-500 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1"
                    />
                </div>
                <div className="flex items-end">
                    <label className="text-tertiary flex items-center gap-2 text-xs">
                        <input
                            type="checkbox"
                            checked={isDeferredInterest}
                            onChange={(e) => setIsDeferredInterest(e.target.checked)}
                            className="border-secondary rounded"
                        />
                        Deferred interest
                    </label>
                </div>
            </div>
            {error && <p className="text-utility-error-700 text-xs">{error}</p>}
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="text-tertiary hover:text-primary rounded-lg px-3 py-1.5 text-sm">
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="bg-utility-brand-600 hover:bg-utility-brand-700 rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Add"}
                </button>
            </div>
        </form>
    );
}

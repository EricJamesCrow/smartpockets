// apps/app/src/app/(app)/dashboard/components/UpcomingPayments.tsx
"use client";

import { api } from "@convex/_generated/api";
import { cx } from "@repo/ui/utils";
import { Check } from "@untitledui/icons";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { parseLocalDate } from "@/types/credit-cards";
import { formatMoneyFromDollars } from "@/utils/money";

// apps/app/src/app/(app)/dashboard/components/UpcomingPayments.tsx

function formatCurrency(amount: number): string {
    return formatMoneyFromDollars(amount, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

function formatDueDate(dueDate: string, daysUntilDue: number): string {
    if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} days overdue`;
    if (daysUntilDue === 0) return "TODAY";
    if (daysUntilDue === 1) return "Tomorrow";
    if (daysUntilDue <= 7) return `in ${daysUntilDue} days`;
    return parseLocalDate(dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

function getDotColor(payment: { isOverdue: boolean; isPaid: boolean; daysUntilDue: number }): string {
    if (payment.isPaid) return "bg-success-500";
    if (payment.isOverdue) return "bg-error-500";
    if (payment.daysUntilDue <= 3) return "bg-warning-500";
    if (payment.daysUntilDue <= 7) return "bg-warning-300";
    return "bg-gray-300";
}

export function UpcomingPayments() {
    const { isAuthenticated } = useConvexAuth();
    const payments = useQuery(api.dashboard.queries.getUpcomingPayments, isAuthenticated ? {} : "skip");

    if (!payments) {
        return (
            <div className="border-primary bg-primary rounded-xl border p-5">
                <h3 className="text-primary mb-4 text-lg font-semibold">Upcoming Payments</h3>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-secondary h-12 animate-pulse rounded" />
                    ))}
                </div>
            </div>
        );
    }

    const unpaid = payments.filter((p) => !p.isPaid);
    const paid = payments.filter((p) => p.isPaid);

    return (
        <div className="border-primary bg-primary rounded-xl border p-5">
            <h3 className="text-primary mb-4 text-lg font-semibold">Upcoming Payments</h3>

            {unpaid.length === 0 && paid.length === 0 ? (
                <p className="text-tertiary text-sm">No upcoming payments</p>
            ) : (
                <div className="space-y-2">
                    {unpaid.map((payment) => (
                        <Link
                            key={payment.cardId}
                            href={`/credit-cards/${payment.cardId}`}
                            className="hover:bg-secondary flex items-center justify-between rounded-lg px-2 py-2"
                        >
                            <div className="flex items-center gap-3">
                                <div className={cx("size-2 rounded-full", getDotColor(payment))} />
                                <div>
                                    <p className="text-primary text-sm font-medium">
                                        {payment.cardName}
                                        {payment.isAutoPay && <span className="text-tertiary ml-2 text-xs">Auto</span>}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-primary text-sm font-medium">{formatCurrency(payment.minimumPayment)}</p>
                                <p className={cx("text-xs", payment.isOverdue ? "text-error-600" : "text-tertiary")}>
                                    {formatDueDate(payment.dueDate, payment.daysUntilDue)}
                                </p>
                            </div>
                        </Link>
                    ))}

                    {paid.length > 0 && (
                        <>
                            <div className="text-tertiary my-3 flex items-center gap-2 text-xs">
                                <div className="bg-border-secondary h-px flex-1" />
                                <span>Paid this cycle</span>
                                <div className="bg-border-secondary h-px flex-1" />
                            </div>
                            {paid.slice(0, 3).map((payment) => (
                                <Link
                                    key={payment.cardId}
                                    href={`/credit-cards/${payment.cardId}`}
                                    className="hover:bg-secondary flex items-center justify-between rounded-lg px-2 py-2 opacity-60"
                                >
                                    <div className="flex items-center gap-3">
                                        <Check className="text-success-500 size-4" />
                                        <p className="text-primary text-sm">{payment.cardName}</p>
                                    </div>
                                    <p className="text-tertiary text-sm">{formatCurrency(payment.minimumPayment)}</p>
                                </Link>
                            ))}
                        </>
                    )}
                </div>
            )}

            <Link href="/credit-cards" className="text-brand-secondary mt-4 block text-center text-sm font-medium hover:underline">
                View all payments →
            </Link>
        </div>
    );
}

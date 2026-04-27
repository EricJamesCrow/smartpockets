"use client";

import { formatMoneyFromDollars } from "@/utils/money";

interface PayOverTimeSectionProps {
    payOverTimeEnabled?: boolean;
    payOverTimeLimit?: number;
    payOverTimeApr?: number;
    availableCredit?: number;
}

export function PayOverTimeSection({ payOverTimeEnabled, payOverTimeLimit, payOverTimeApr, availableCredit }: PayOverTimeSectionProps) {
    if (!payOverTimeEnabled) return null;

    const rows = [
        { label: "Pay Over Time Limit", value: payOverTimeLimit != null ? formatMoneyFromDollars(payOverTimeLimit) : "—" },
        { label: "Available Pay Over Time", value: availableCredit != null ? formatMoneyFromDollars(availableCredit) : "—" },
        { label: "Pay Over Time APR", value: payOverTimeApr != null ? `${payOverTimeApr.toFixed(2)}% (v)` : "—" },
        { label: "Setting", value: "ON" },
    ];

    return (
        <section>
            <h3 className="text-primary mb-4 text-lg font-semibold">Pay Over Time</h3>
            <div className="border-secondary bg-primary rounded-xl border">
                <dl className="divide-secondary divide-y">
                    {rows.map((row) => (
                        <div key={row.label} className="flex items-center justify-between px-4 py-3">
                            <dt className="text-tertiary text-sm">{row.label}</dt>
                            <dd className="text-primary text-sm font-medium">{row.value}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
}

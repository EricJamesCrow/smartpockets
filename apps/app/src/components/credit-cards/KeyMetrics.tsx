"use client";

import { cx } from "@repo/ui/utils";
import { formatApr, formatDisplayCurrency, formatDueDate, formatPercentage, getUtilizationColor } from "@/types/credit-cards";
import type { ExtendedCreditCardData, Transaction } from "@/types/credit-cards";

interface KeyMetricsProps {
    card: ExtendedCreditCardData;
    transactions?: Transaction[];
}

/**
 * Key Metrics Row - 4-column horizontal layout with vertical dividers
 * Matches SmartPockets design pattern
 */
export function KeyMetrics({ card, transactions = [] }: KeyMetricsProps) {
    // Calculate pending charges total
    const pendingTotal = transactions.filter((txn) => txn.status === "Pending").reduce((sum, txn) => sum + txn.amount, 0);

    const pendingCount = transactions.filter((txn) => txn.status === "Pending").length;

    // Calculate available credit percentage
    const availablePercent = card.creditLimit && card.availableCredit ? Math.round((card.availableCredit / card.creditLimit) * 100) : null;

    return (
        <div className="border-secondary bg-primary border-y dark:border-[var(--sp-moss-line)]">
            <div className="px-4 py-5 lg:px-6">
                {/* Key Metrics - 4 columns with vertical dividers on lg+ */}
                <div className="gap-4 sm:grid-cols-2 lg:flex lg:flex-row lg:gap-0 grid grid-cols-1 items-stretch">
                    {/* Current Balance */}
                    <div className="gap-1.5 lg:pr-6 flex flex-1 flex-col">
                        <div className="flex items-center justify-between">
                            <p className="sp-kicker text-tertiary dark:text-stone-500">
                                <em className="font-medium tracking-normal font-[family-name:var(--font-fraunces)] text-[var(--sp-fraunces-accent)] normal-case italic">
                                    Current
                                </em>{" "}
                                Balance
                            </p>
                            {card.utilization !== null && (
                                <span
                                    className={cx(
                                        "text-xs font-semibold font-[family-name:var(--font-geist-mono)] tabular-nums",
                                        getUtilizationColor(card.utilization),
                                    )}
                                >
                                    {formatPercentage(card.utilization, 0)}
                                </span>
                            )}
                        </div>
                        <p className="text-xl font-semibold text-primary lg:text-[1.65rem] tabular-nums">{formatDisplayCurrency(card.currentBalance)}</p>
                        <div className="gap-0.5 text-xs text-tertiary flex flex-col">
                            <span>of {formatDisplayCurrency(card.creditLimit)}</span>
                            {pendingTotal > 0 && (
                                <span className="font-medium text-utility-warning-600">
                                    {formatDisplayCurrency(pendingTotal)} pending ({pendingCount} {pendingCount === 1 ? "charge" : "charges"})
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Vertical Divider */}
                    <div className="border-secondary lg:block hidden w-px self-stretch border-l dark:border-[var(--sp-moss-line)]" />

                    {/* Minimum Payment */}
                    <div className="gap-1.5 lg:px-6 flex flex-1 flex-col">
                        <div className="flex items-center justify-between">
                            <p className="sp-kicker text-tertiary dark:text-stone-500">
                                <em className="font-medium tracking-normal font-[family-name:var(--font-fraunces)] text-[var(--sp-fraunces-accent)] normal-case italic">
                                    Minimum
                                </em>{" "}
                                Payment
                            </p>
                            <span className="text-tertiary dark:text-stone-500 font-[family-name:var(--font-geist-mono)] text-[0.6rem] tracking-[0.18em] uppercase">
                                Due {card.nextPaymentDueDate ? formatDueDate(card.nextPaymentDueDate) : "--"}
                            </span>
                        </div>
                        <p className="text-xl font-semibold text-primary lg:text-[1.65rem] tabular-nums">{formatDisplayCurrency(card.minimumPaymentAmount)}</p>
                    </div>

                    {/* Vertical Divider */}
                    <div className="border-secondary lg:block hidden w-px self-stretch border-l dark:border-[var(--sp-moss-line)]" />

                    {/* APR (Purchase) */}
                    <div className="gap-1.5 lg:px-6 flex flex-1 flex-col">
                        <p className="sp-kicker text-tertiary dark:text-stone-500">
                            <em className="font-medium tracking-normal font-[family-name:var(--font-fraunces)] text-[var(--sp-fraunces-accent)] normal-case italic">
                                APR
                            </em>{" "}
                            (purchase)
                        </p>
                        <p className="text-xl font-semibold text-primary lg:text-[1.65rem] tabular-nums">{formatApr(card.apr)}</p>
                        <p className="text-xs text-tertiary">Annual Percentage Rate</p>
                    </div>

                    {/* Vertical Divider */}
                    <div className="border-secondary lg:block hidden w-px self-stretch border-l dark:border-[var(--sp-moss-line)]" />

                    {/* Available Credit */}
                    <div className="gap-1.5 lg:pl-6 flex flex-1 flex-col">
                        <p className="sp-kicker text-tertiary dark:text-stone-500">
                            <em className="font-medium tracking-normal font-[family-name:var(--font-fraunces)] text-[var(--sp-fraunces-accent)] normal-case italic">
                                Available
                            </em>{" "}
                            Credit
                        </p>
                        <p className="text-xl font-semibold text-primary lg:text-[1.65rem] tabular-nums">{formatDisplayCurrency(card.availableCredit)}</p>
                        <p className="text-xs text-tertiary">{availablePercent !== null ? `${availablePercent}% of limit` : "--"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

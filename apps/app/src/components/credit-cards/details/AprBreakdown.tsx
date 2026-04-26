"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { cx } from "@/utils/cx";
import { dollarsToMilliunits, formatMoneyFromDollars, milliunitsToDollarsOrUndefined } from "@/utils/money";
import { InlineEditableField } from "./InlineEditableField";

type Apr = {
    aprPercentage: number | null;
    aprType: string;
    balanceSubjectToApr?: number | null;
    interestChargeAmount?: number | null;
};

const APR_DISPLAY_NAMES: Record<string, string> = {
    purchase_apr: "Purchase",
    cash_apr: "Cash Advance",
    balance_transfer_apr: "Balance Transfer",
};

const STANDARD_APR_TYPES = ["purchase_apr", "cash_apr", "balance_transfer_apr"];

type AprColor = { border: string; text: string };

function getAprColor(apr: Apr): AprColor {
    if (apr.aprPercentage == null) {
        return { border: "border-l-secondary", text: "text-tertiary" };
    }
    if (apr.aprPercentage === 0) {
        return { border: "border-l-utility-success-500", text: "text-utility-success-700" };
    }
    if (apr.aprType.includes("cash")) {
        return { border: "border-l-utility-error-500", text: "text-utility-error-700" };
    }
    return { border: "border-l-utility-warning-500", text: "text-utility-warning-700" };
}

function formatAprType(type: string): string {
    return type
        .replace(/_/g, " ")
        .replace(/\bapr\b/i, "")
        .trim()
        .replace(/^\w/, (c) => c.toUpperCase());
}

function computeWeightedAverageApr(aprs: Apr[]): number | null {
    const withBalance = aprs.filter((a) => a.balanceSubjectToApr && a.balanceSubjectToApr > 0);
    if (withBalance.length === 0) return null;
    const totalBalance = withBalance.reduce((sum, a) => sum + (a.balanceSubjectToApr ?? 0), 0);
    if (totalBalance === 0) return null;
    const weightedSum = withBalance.reduce((sum, a) => sum + (a.aprPercentage ?? 0) * (a.balanceSubjectToApr ?? 0), 0);
    return Math.round((weightedSum / totalBalance) * 100) / 100;
}

interface AprBreakdownProps {
    aprs: Apr[] | undefined;
    cardId: Id<"creditCards">;
    aprOverrides?: Array<{
        index: number;
        aprPercentage?: number;
        balanceSubjectToApr?: number;
        interestChargeAmount?: number;
    }>;
}

export function AprBreakdown({ aprs, cardId, aprOverrides }: AprBreakdownProps) {
    const setAprOverride = useMutation(api.creditCards.mutations.setAprOverride);
    const clearAprOverride = useMutation(api.creditCards.mutations.clearAprOverride);
    if (!aprs) {
        return (
            <section>
                <h3 className="text-primary mb-4 text-lg font-semibold">APR Breakdown</h3>
                <div className="border-secondary bg-primary text-tertiary rounded-xl border border-dashed p-6 text-center text-sm">
                    No APR information available
                </div>
            </section>
        );
    }

    // Ensure all 3 standard APR types always appear
    const normalizedAprs = STANDARD_APR_TYPES.map((standardType) => {
        const existing = aprs.find((a) => a.aprType === standardType);
        return (
            existing ?? {
                aprType: standardType,
                aprPercentage: null,
                balanceSubjectToApr: 0,
                interestChargeAmount: 0,
            }
        );
    });
    const extraAprs = aprs.filter((a) => !STANDARD_APR_TYPES.includes(a.aprType));
    const allAprs = [...normalizedAprs, ...extraAprs];

    const weightedAvg = computeWeightedAverageApr(aprs);

    return (
        <section>
            <div className="mb-4 flex items-baseline justify-between">
                <h3 className="text-primary text-lg font-semibold">APR Breakdown</h3>
                {weightedAvg !== null && (
                    <p className="text-tertiary text-sm">
                        Effective APR: <span className="text-primary font-semibold tabular-nums">{weightedAvg.toFixed(2)}%</span>
                    </p>
                )}
            </div>
            <div className="border-secondary bg-primary rounded-xl border">
                {/* Header row */}
                <div className="border-secondary grid grid-cols-4 gap-4 border-b px-4 py-2.5">
                    <span className="text-tertiary text-xs font-medium">Balance Type</span>
                    <span className="text-tertiary text-right text-xs font-medium">APR</span>
                    <span className="text-tertiary text-right text-xs font-medium">Balance Subject</span>
                    <span className="text-tertiary text-right text-xs font-medium">Interest Charged</span>
                </div>
                {/* Data rows */}
                <div className="divide-secondary divide-y">
                    {allAprs.map((apr, i) => {
                        const color = getAprColor(apr);
                        const override = aprOverrides?.find((o) => o.index === i);

                        const resolvedApr = override?.aprPercentage ?? apr.aprPercentage;
                        const resolvedBalance = override?.balanceSubjectToApr ?? apr.balanceSubjectToApr;
                        const resolvedInterest = override?.interestChargeAmount ?? apr.interestChargeAmount;

                        return (
                            <div key={`${apr.aprType}-${i}`} className={cx("grid grid-cols-4 gap-4 border-l-2 px-4 py-3", color.border)}>
                                <span className="text-primary text-sm">{APR_DISPLAY_NAMES[apr.aprType] ?? formatAprType(apr.aprType)}</span>
                                <div className="text-right">
                                    <InlineEditableField
                                        value={resolvedApr}
                                        plaidValue={apr.aprPercentage}
                                        isOverridden={override?.aprPercentage != null}
                                        type="percentage"
                                        onSave={async (v) => {
                                            await setAprOverride({ cardId, aprIndex: i, field: "aprPercentage", value: v as number });
                                        }}
                                        onRevert={async () => {
                                            await clearAprOverride({ cardId, aprIndex: i, field: "aprPercentage" });
                                        }}
                                        formatDisplay={(v) => (v != null ? `${Number(v).toFixed(2)}%` : "—")}
                                        className="justify-end"
                                    />
                                </div>
                                <div className="text-right">
                                    <InlineEditableField
                                        value={milliunitsToDollarsOrUndefined(resolvedBalance)}
                                        plaidValue={milliunitsToDollarsOrUndefined(apr.balanceSubjectToApr)}
                                        isOverridden={override?.balanceSubjectToApr != null}
                                        type="currency"
                                        onSave={async (v) => {
                                            await setAprOverride({ cardId, aprIndex: i, field: "balanceSubjectToApr", value: dollarsToMilliunits(Number(v)) });
                                        }}
                                        onRevert={async () => {
                                            await clearAprOverride({ cardId, aprIndex: i, field: "balanceSubjectToApr" });
                                        }}
                                        formatDisplay={(v) => (v != null ? formatMoneyFromDollars(Number(v)) : "—")}
                                        className="justify-end"
                                    />
                                </div>
                                <div className="text-right">
                                    <InlineEditableField
                                        value={milliunitsToDollarsOrUndefined(resolvedInterest)}
                                        plaidValue={milliunitsToDollarsOrUndefined(apr.interestChargeAmount)}
                                        isOverridden={override?.interestChargeAmount != null}
                                        type="currency"
                                        onSave={async (v) => {
                                            await setAprOverride({ cardId, aprIndex: i, field: "interestChargeAmount", value: dollarsToMilliunits(Number(v)) });
                                        }}
                                        onRevert={async () => {
                                            await clearAprOverride({ cardId, aprIndex: i, field: "interestChargeAmount" });
                                        }}
                                        formatDisplay={(v) => (v != null ? formatMoneyFromDollars(Number(v)) : "—")}
                                        className="justify-end"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

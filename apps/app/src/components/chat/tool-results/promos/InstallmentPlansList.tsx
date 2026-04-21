"use client";

import { useState } from "react";

import type { Id } from "@convex/_generated/dataModel";

import { ToolCardShell } from "../shared/ToolCardShell";
import { useLiveInstallmentPlans } from "../shared/liveRowsHooks";
import { useToolHintSend } from "../shared/useToolHintSend";
import type { ToolOutput, ToolResultComponentProps } from "../types";
import { InstallmentPlansListSkeleton } from "./InstallmentPlansListSkeleton";

type PlanPreview = {
    id: string;
    cardId: Id<"creditCards">;
    cardName?: string;
    merchantName: string;
    totalAmount: number;
    monthlyPayment: number;
    totalPayments: number;
    remainingPayments: number;
    startDate: string;
    endDate: string;
};

type Preview = {
    plans?: PlanPreview[];
    summary?: string;
};

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function InstallmentPlansList(
    props: ToolResultComponentProps<unknown, ToolOutput<Preview>>,
) {
    const { output, state } = props;
    const live = useLiveInstallmentPlans(output?.ids ?? []);
    const hint = useToolHintSend();
    const [expanded, setExpanded] = useState<string | null>(null);

    if (state === "input-streaming" || !output) {
        return <InstallmentPlansListSkeleton />;
    }

    const plans: PlanPreview[] = live
        ? live.map((p) => ({
              id: p._id,
              cardId: p.creditCardId,
              merchantName: p.merchantName,
              totalAmount: p.totalAmount,
              monthlyPayment: p.monthlyPayment,
              totalPayments: p.totalPayments,
              remainingPayments: p.remainingPayments,
              startDate: p.startDate,
              endDate: p.endDate,
          }))
        : output.preview.plans ?? [];

    if (plans.length === 0) {
        return (
            <ToolCardShell title={output.preview.summary ?? "Installment plans"}>
                <p className="text-sm text-tertiary">No active installment plans.</p>
            </ToolCardShell>
        );
    }

    return (
        <ToolCardShell
            title={output.preview.summary ?? "Installment plans"}
            subtitle={`${plans.length} active plan${plans.length === 1 ? "" : "s"}`}
        >
            <ul className="divide-y divide-secondary">
                {plans.map((plan) => {
                    const isExpanded = expanded === plan.id;
                    const paidPayments = plan.totalPayments - plan.remainingPayments;
                    const remainingOwed = plan.monthlyPayment * plan.remainingPayments;
                    return (
                        <li key={plan.id} className="py-2">
                            <button
                                type="button"
                                onClick={() => setExpanded(isExpanded ? null : plan.id)}
                                className="flex w-full items-center justify-between gap-3 text-left"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-primary">
                                        {plan.merchantName}
                                    </p>
                                    <p className="text-xs text-tertiary">
                                        {paidPayments} of {plan.totalPayments} payments made
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-sm tabular-nums text-primary">
                                        {formatCurrency(plan.monthlyPayment)} / mo
                                    </p>
                                    <p className="text-xs text-tertiary">
                                        {formatCurrency(remainingOwed)} left
                                    </p>
                                </div>
                            </button>
                            {isExpanded && (
                                <dl className="mt-2 grid grid-cols-2 gap-y-1 rounded-md bg-secondary/30 p-3 text-xs">
                                    <dt className="text-tertiary">Total financed</dt>
                                    <dd className="text-right tabular-nums text-primary">
                                        {formatCurrency(plan.totalAmount)}
                                    </dd>
                                    <dt className="text-tertiary">Payments remaining</dt>
                                    <dd className="text-right tabular-nums text-primary">
                                        {plan.remainingPayments}
                                    </dd>
                                    <dt className="text-tertiary">Start</dt>
                                    <dd className="text-right text-primary">{plan.startDate}</dd>
                                    <dt className="text-tertiary">End</dt>
                                    <dd className="text-right text-primary">{plan.endDate}</dd>
                                    <div className="col-span-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void hint.openCard(plan.cardId);
                                            }}
                                            className="text-xs font-medium text-utility-brand-700 hover:underline"
                                        >
                                            Open card
                                        </button>
                                    </div>
                                </dl>
                            )}
                        </li>
                    );
                })}
            </ul>
        </ToolCardShell>
    );
}

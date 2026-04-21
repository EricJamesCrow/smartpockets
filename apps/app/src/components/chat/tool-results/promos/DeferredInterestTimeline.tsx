"use client";

import type { Id } from "@convex/_generated/dataModel";

import { cx } from "@/utils/cx";

import { ToolCardShell } from "../shared/ToolCardShell";
import { useLivePromoRates } from "../shared/liveRowsHooks";
import { useToolHintSend } from "../shared/useToolHintSend";
import type { ToolOutput, ToolResultComponentProps } from "../types";
import { DeferredInterestTimelineSkeleton } from "./DeferredInterestTimelineSkeleton";

type PromoPreview = {
    id: string;
    cardId: Id<"creditCards">;
    cardName?: string;
    kind: string;
    apr: number;
    startDate: string;
    endDate: string;
    balance?: number;
    note?: string;
};

type Preview = {
    promos?: PromoPreview[];
    summary?: string;
};

// TODO: extract helper in promo-tracker cleanup PR — see
// apps/app/src/components/credit-cards/details/PromoTracker.tsx:20 for the
// original definition.
function getUrgencyClasses(monthsRemaining: number): { marker: string; ring: string } {
    if (monthsRemaining <= 1) return { marker: "bg-utility-error-500", ring: "ring-utility-error-200" };
    if (monthsRemaining <= 3) return { marker: "bg-utility-orange-500", ring: "ring-utility-orange-200" };
    if (monthsRemaining <= 6) return { marker: "bg-utility-warning-500", ring: "ring-utility-warning-200" };
    return { marker: "bg-utility-success-500", ring: "ring-utility-success-200" };
}

function monthsRemaining(endDate: string): number {
    const [y, m, d] = endDate.split("-").map(Number);
    if (!y || !m || !d) return 0;
    const end = new Date(y, m - 1, d).getTime();
    const now = Date.now();
    if (now >= end) return 0;
    const diffMs = end - now;
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30)));
}

function daysRemaining(endDate: string): number {
    const [y, m, d] = endDate.split("-").map(Number);
    if (!y || !m || !d) return 0;
    const end = new Date(y, m - 1, d).getTime();
    const now = Date.now();
    if (now >= end) return 0;
    return Math.max(0, Math.round((end - now) / (1000 * 60 * 60 * 24)));
}

function formatDate(s: string): string {
    const [y, m, d] = s.split("-").map(Number);
    if (!y || !m || !d) return s;
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DeferredInterestTimeline(
    props: ToolResultComponentProps<unknown, ToolOutput<Preview>>,
) {
    const { output, state } = props;
    const live = useLivePromoRates(output?.ids ?? []);
    const hint = useToolHintSend();

    if (state === "input-streaming" || !output) {
        return <DeferredInterestTimelineSkeleton />;
    }

    const promos: PromoPreview[] = live
        ? live.map((p) => ({
              id: p._id,
              cardId: p.creditCardId,
              kind: p.kind,
              apr: p.apr,
              startDate: p.startDate,
              endDate: p.endDate,
              balance: p.balance ?? undefined,
              note: p.note ?? undefined,
          }))
        : output.preview.promos ?? [];

    if (promos.length === 0) {
        return (
            <ToolCardShell
                title={output.preview.summary ?? "Deferred-interest promos"}
                action={
                    <button
                        type="button"
                        onClick={() => {
                            // Without a card selected we cannot target a manual promo; skip the
                            // action on the empty state. Users can trigger it from a card row.
                        }}
                        className="hidden"
                    />
                }
            >
                <p className="text-sm text-tertiary">No deferred-interest promos on your cards right now.</p>
            </ToolCardShell>
        );
    }

    const firstCard = promos[0]?.cardId;

    return (
        <ToolCardShell
            title={output.preview.summary ?? "Deferred-interest promos"}
            subtitle={`${promos.length} active promo${promos.length === 1 ? "" : "s"}`}
            action={
                firstCard ? (
                    <button
                        type="button"
                        onClick={() => {
                            void hint.addManualPromo(firstCard);
                        }}
                        className="rounded-md border border-secondary px-2 py-1 text-xs font-medium text-secondary hover:bg-secondary/50"
                    >
                        Add manual promo
                    </button>
                ) : null
            }
        >
            <ul className="space-y-3">
                {promos.map((promo) => {
                    const months = monthsRemaining(promo.endDate);
                    const days = daysRemaining(promo.endDate);
                    const { marker, ring } = getUrgencyClasses(months);
                    return (
                        <li key={promo.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    void hint.openCard(promo.cardId);
                                }}
                                className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-secondary/40"
                            >
                                <span
                                    className={cx(
                                        "h-3 w-3 shrink-0 rounded-full ring-4",
                                        marker,
                                        ring,
                                    )}
                                    aria-hidden
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-primary">
                                        {promo.cardName ?? promo.kind}
                                    </p>
                                    <p className="text-xs text-tertiary">
                                        {promo.apr.toFixed(2)}% APR / ends {formatDate(promo.endDate)}
                                    </p>
                                </div>
                                <span className="shrink-0 text-xs tabular-nums text-secondary">
                                    {days <= 60 ? `${days} days` : `${months} mo`}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </ToolCardShell>
    );
}

"use client";

import type { Id } from "@convex/_generated/dataModel";

import { ToolCardShell } from "../shared/ToolCardShell";
import { useLiveCreditCards, type CreditCardRow } from "../shared/liveRowsHooks";
import { useToolHintSend } from "../shared/useToolHintSend";
import type { ToolOutput, ToolResultComponentProps } from "../types";
import { CreditCardStatementCardSkeleton } from "./CreditCardStatementCardSkeleton";

type Preview = {
    summary?: string;
};

function formatCurrency(amount: number | null | undefined): string {
    if (amount == null) return "-";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatClosingDay(day?: number | null): string {
    if (day == null) return "Closing day unknown";
    const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
    return `Closes on the ${day}${suffix}`;
}

function utilization(row: CreditCardRow): number | null {
    if (row.currentBalance == null || row.creditLimit == null || row.creditLimit <= 0) return null;
    return (row.currentBalance / row.creditLimit) * 100;
}

type OpenCard = (id: Id<"creditCards">) => void;

function ListView({ cards, onOpen }: { cards: CreditCardRow[]; onOpen: OpenCard }) {
    return (
        <ToolCardShell title={`${cards.length} cards`}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {cards.map((card) => (
                    <button
                        key={card._id}
                        type="button"
                        onClick={() => onOpen(card._id)}
                        className="flex flex-col items-start rounded-lg border border-secondary p-3 text-left transition-colors hover:bg-secondary/40"
                    >
                        <span className="text-sm font-semibold text-primary">{card.displayName}</span>
                        {card.mask && (
                            <span className="text-xs text-tertiary">...{card.mask}</span>
                        )}
                        <span className="mt-2 text-sm tabular-nums text-primary">
                            {formatCurrency(card.currentBalance)}
                        </span>
                        {card.creditLimit != null && (
                            <span className="text-xs text-tertiary tabular-nums">
                                / {formatCurrency(card.creditLimit)} limit
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </ToolCardShell>
    );
}

function UpcomingStrip({ cards, onOpen }: { cards: CreditCardRow[]; onOpen: OpenCard }) {
    return (
        <ToolCardShell title="Upcoming statements">
            <ul className="divide-y divide-secondary">
                {cards.map((card) => (
                    <li key={card._id} className="flex items-center justify-between gap-3 py-2">
                        <button
                            type="button"
                            onClick={() => onOpen(card._id)}
                            className="min-w-0 flex-1 text-left text-sm text-primary hover:underline"
                        >
                            <span className="font-medium">{card.displayName}</span>
                            {card.mask && <span className="ml-2 text-tertiary">...{card.mask}</span>}
                        </button>
                        <span className="shrink-0 text-xs text-tertiary">{formatClosingDay(card.statementClosingDay)}</span>
                        {card.nextPaymentDueDate && (
                            <span className="shrink-0 text-xs tabular-nums text-primary">
                                Due {card.nextPaymentDueDate}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </ToolCardShell>
    );
}

function SingleStatement({ card, onOpen }: { card: CreditCardRow; onOpen: OpenCard }) {
    const pct = utilization(card);
    return (
        <ToolCardShell
            title={card.displayName}
            subtitle={[card.company, card.mask ? `...${card.mask}` : null].filter(Boolean).join(" ")}
            action={
                <button
                    type="button"
                    onClick={() => onOpen(card._id)}
                    className="rounded-md border border-secondary px-2 py-1 text-xs font-medium text-secondary hover:bg-secondary/50"
                >
                    Open card
                </button>
            }
        >
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-tertiary">Current balance</dt>
                <dd className="text-right font-semibold tabular-nums text-primary">
                    {formatCurrency(card.currentBalance)}
                </dd>
                <dt className="text-tertiary">Available credit</dt>
                <dd className="text-right tabular-nums text-primary">{formatCurrency(card.availableCredit)}</dd>
                <dt className="text-tertiary">Credit limit</dt>
                <dd className="text-right tabular-nums text-primary">{formatCurrency(card.creditLimit)}</dd>
                {pct != null && (
                    <>
                        <dt className="text-tertiary">Utilization</dt>
                        <dd className="text-right tabular-nums text-primary">{pct.toFixed(0)}%</dd>
                    </>
                )}
                {card.nextPaymentDueDate && (
                    <>
                        <dt className="text-tertiary">Next payment due</dt>
                        <dd className="text-right tabular-nums text-primary">{card.nextPaymentDueDate}</dd>
                    </>
                )}
                {card.isOverdue && (
                    <>
                        <dt className="text-utility-error-700">Status</dt>
                        <dd className="text-right text-utility-error-700">Overdue</dd>
                    </>
                )}
            </dl>
        </ToolCardShell>
    );
}

export function CreditCardStatementCard(
    props: ToolResultComponentProps<unknown, ToolOutput<Preview>>,
) {
    const { output, state, toolName } = props;
    const cards = useLiveCreditCards((output?.ids ?? []) as Array<Id<"creditCards">>);
    const hint = useToolHintSend();
    const openCard: OpenCard = (id) => {
        void hint.openCard(id);
    };

    if (state === "input-streaming" || !output) {
        return <CreditCardStatementCardSkeleton />;
    }

    if (output.ids.length === 0) {
        return (
            <ToolCardShell title="Credit cards">
                <p className="text-sm text-tertiary">No cards connected.</p>
            </ToolCardShell>
        );
    }

    if (cards === undefined) {
        return <CreditCardStatementCardSkeleton />;
    }

    if (toolName === "get_upcoming_statements") {
        return <UpcomingStrip cards={cards} onOpen={openCard} />;
    }
    if (toolName === "list_credit_cards" || cards.length > 1) {
        return <ListView cards={cards} onOpen={openCard} />;
    }
    const single = cards[0];
    if (!single) {
        return (
            <ToolCardShell title="Credit card">
                <p className="text-sm text-tertiary">Card not found.</p>
            </ToolCardShell>
        );
    }
    return <SingleStatement card={single} onOpen={openCard} />;
}

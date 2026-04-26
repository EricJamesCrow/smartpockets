"use client";

import type { Id } from "@convex/_generated/dataModel";
import { formatMoneyFromMilliunits } from "@/utils/money";
import { ToolCardShell } from "../shared/ToolCardShell";
import { type CreditCardRow, useLiveCreditCards } from "../shared/liveRowsHooks";
import { useToolHintSend } from "../shared/useToolHintSend";
import type { ToolOutput, ToolResultComponentProps } from "../types";
import { CreditCardStatementCardSkeleton } from "./CreditCardStatementCardSkeleton";

type Preview = {
    summary?: string;
};

function formatCurrency(amount: number | null | undefined): string {
    return formatMoneyFromMilliunits(amount, { nullDisplay: "-" });
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
                        className="border-secondary hover:bg-secondary/40 flex flex-col items-start rounded-lg border p-3 text-left transition-colors"
                    >
                        <span className="text-primary text-sm font-semibold">{card.displayName}</span>
                        {card.mask && <span className="text-tertiary text-xs">...{card.mask}</span>}
                        <span className="text-primary mt-2 text-sm tabular-nums">{formatCurrency(card.currentBalance)}</span>
                        {card.creditLimit != null && <span className="text-tertiary text-xs tabular-nums">/ {formatCurrency(card.creditLimit)} limit</span>}
                    </button>
                ))}
            </div>
        </ToolCardShell>
    );
}

function UpcomingStrip({ cards, onOpen }: { cards: CreditCardRow[]; onOpen: OpenCard }) {
    return (
        <ToolCardShell title="Upcoming statements">
            <ul className="divide-secondary divide-y">
                {cards.map((card) => (
                    <li key={card._id} className="flex items-center justify-between gap-3 py-2">
                        <button type="button" onClick={() => onOpen(card._id)} className="text-primary min-w-0 flex-1 text-left text-sm hover:underline">
                            <span className="font-medium">{card.displayName}</span>
                            {card.mask && <span className="text-tertiary ml-2">...{card.mask}</span>}
                        </button>
                        <span className="text-tertiary shrink-0 text-xs">{formatClosingDay(card.statementClosingDay)}</span>
                        {card.nextPaymentDueDate && <span className="text-primary shrink-0 text-xs tabular-nums">Due {card.nextPaymentDueDate}</span>}
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
                    className="border-secondary text-secondary hover:bg-secondary/50 rounded-md border px-2 py-1 text-xs font-medium"
                >
                    Open card
                </button>
            }
        >
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-tertiary">Current balance</dt>
                <dd className="text-primary text-right font-semibold tabular-nums">{formatCurrency(card.currentBalance)}</dd>
                <dt className="text-tertiary">Available credit</dt>
                <dd className="text-primary text-right tabular-nums">{formatCurrency(card.availableCredit)}</dd>
                <dt className="text-tertiary">Credit limit</dt>
                <dd className="text-primary text-right tabular-nums">{formatCurrency(card.creditLimit)}</dd>
                {pct != null && (
                    <>
                        <dt className="text-tertiary">Utilization</dt>
                        <dd className="text-primary text-right tabular-nums">{pct.toFixed(0)}%</dd>
                    </>
                )}
                {card.nextPaymentDueDate && (
                    <>
                        <dt className="text-tertiary">Next payment due</dt>
                        <dd className="text-primary text-right tabular-nums">{card.nextPaymentDueDate}</dd>
                    </>
                )}
                {card.isOverdue && (
                    <>
                        <dt className="text-utility-error-700">Status</dt>
                        <dd className="text-utility-error-700 text-right">Overdue</dd>
                    </>
                )}
            </dl>
        </ToolCardShell>
    );
}

export function CreditCardStatementCard(props: ToolResultComponentProps<unknown, ToolOutput<Preview>>) {
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
                <p className="text-tertiary text-sm">No cards connected.</p>
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
                <p className="text-tertiary text-sm">Card not found.</p>
            </ToolCardShell>
        );
    }
    return <SingleStatement card={single} onOpen={openCard} />;
}

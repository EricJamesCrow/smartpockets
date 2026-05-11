"use client";

import type { Id } from "@convex/_generated/dataModel";
import { Table } from "@repo/ui/untitledui/application/table/table";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { CreditCardStatusBadge } from "@/components/credit-cards/CreditCardStatusBadge";
import { PaymentDueBadge } from "@/components/credit-cards/PaymentDueBadge";
import { UtilizationBar } from "@/components/credit-cards/UtilizationProgress";
import { InstitutionLogo } from "@/features/institutions";
import {
    calculateUtilization,
    formatApr,
    formatDisplayCurrency,
    formatDueDate,
    formatPercentage,
    getPurchaseApr,
} from "@/types/credit-cards";
import { ToolCardShell } from "../shared/ToolCardShell";
import { type CreditCardRow, useLiveCreditCards } from "../shared/liveRowsHooks";
import { useToolHintSend } from "../shared/useToolHintSend";
import type { ToolOutput, ToolResultComponentProps } from "../types";
import { CreditCardStatementCardSkeleton } from "./CreditCardStatementCardSkeleton";

type Preview = {
    summary?: string;
};

type OpenCard = (id: Id<"creditCards">) => void;

function formatClosingDay(day?: number | null): string {
    if (day == null) return "Closing day unknown";
    const suffix =
        day % 10 === 1 && day !== 11
            ? "st"
            : day % 10 === 2 && day !== 12
              ? "nd"
              : day % 10 === 3 && day !== 13
                ? "rd"
                : "th";
    return `Closes ${day}${suffix}`;
}

function brandLabel(brand: CreditCardRow["brand"]): string | null {
    switch (brand) {
        case "visa":
            return "Visa";
        case "mastercard":
            return "Mastercard";
        case "amex":
            return "Amex";
        case "discover":
            return "Discover";
        default:
            return null;
    }
}

function CardIdentityCell({ card }: { card: CreditCardRow }) {
    const brand = brandLabel(card.brand);
    return (
        <div className="flex items-center gap-2.5">
            <InstitutionLogo
                institutionName={card.institutionName ?? card.company}
                logoBase64={card.institutionLogoBase64}
                primaryColor={card.institutionPrimaryColor}
                size="sm"
            />
            <div className="min-w-0">
                <p className="truncate text-sm font-medium text-primary">{card.displayName}</p>
                <p className="truncate text-xs text-tertiary">
                    {card.mask ? `•••• ${card.mask}` : "No mask"}
                    {brand ? ` · ${brand}` : ""}
                </p>
            </div>
        </div>
    );
}

function StatusCell({ card }: { card: CreditCardRow }) {
    // Prefer the most actionable signal: payment due (with calendar context)
    // when we have a date, else fall back to the lifecycle status badge.
    if (card.nextPaymentDueDate || card.isOverdue) {
        return (
            <PaymentDueBadge
                nextPaymentDueDate={card.nextPaymentDueDate ?? null}
                isOverdue={card.isOverdue ?? false}
                minimumPaymentAmount={card.minimumPaymentAmount ?? null}
                size="sm"
                showIcon={false}
            />
        );
    }
    return (
        <CreditCardStatusBadge
            isLocked={card.isLocked ?? false}
            isActive={card.isActive ?? true}
            isOverdue={card.isOverdue ?? false}
            size="sm"
        />
    );
}

function LimitCell({ card }: { card: CreditCardRow }) {
    const utilization = calculateUtilization(card.currentBalance ?? null, card.creditLimit ?? null);
    return (
        <div className="flex min-w-[7rem] flex-col gap-1">
            <span className="text-sm tabular-nums text-primary">
                {formatDisplayCurrency(card.creditLimit ?? null)}
            </span>
            {utilization != null && (
                <div className="flex items-center gap-1.5">
                    <UtilizationBar utilization={utilization} className="w-16" />
                    <span className="text-xs tabular-nums text-tertiary">
                        {formatPercentage(utilization, 0)}
                    </span>
                </div>
            )}
        </div>
    );
}

function ListView({ cards, onOpen }: { cards: CreditCardRow[]; onOpen: OpenCard }) {
    const totalBalance = cards.reduce((sum, c) => sum + (c.currentBalance ?? 0), 0);
    const totalLimit = cards.reduce((sum, c) => sum + (c.creditLimit ?? 0), 0);
    const totalUtilization = calculateUtilization(totalBalance, totalLimit > 0 ? totalLimit : null);
    const items = cards.map((card) => ({ ...card, id: card._id }));

    const subtitle =
        totalUtilization != null
            ? `${cards.length} card${cards.length === 1 ? "" : "s"} · ${formatDisplayCurrency(totalBalance)} of ${formatDisplayCurrency(totalLimit)} (${formatPercentage(totalUtilization, 0)})`
            : `${cards.length} card${cards.length === 1 ? "" : "s"} · ${formatDisplayCurrency(totalBalance)} total balance`;

    return (
        <ToolCardShell
            title="Credit cards"
            subtitle={subtitle}
            // Widen beyond the default 640px max so the 5-column table fits
            // (Card / Balance / Available / Limit + utilization / Status).
            className="max-w-[820px]!"
        >
            <Table aria-label="Credit cards" selectionMode="none" size="sm" className="text-sm">
                <Table.Header bordered={false} className="bg-transparent! h-auto!">
                    <Table.Head id="card" isRowHeader className="text-tertiary text-left text-xs font-medium uppercase py-2 pr-2 px-0!">
                        Card
                    </Table.Head>
                    <Table.Head id="balance" className="text-tertiary text-right text-xs font-medium uppercase py-2 pr-2 px-0! [&>div]:justify-end">
                        Balance
                    </Table.Head>
                    <Table.Head id="available" className="text-tertiary text-right text-xs font-medium uppercase py-2 pr-2 px-0! [&>div]:justify-end">
                        Available
                    </Table.Head>
                    <Table.Head id="limit" className="text-tertiary text-left text-xs font-medium uppercase py-2 pr-2 px-0!">
                        Limit
                    </Table.Head>
                    <Table.Head id="status" className="text-tertiary text-left text-xs font-medium uppercase py-2 px-0!">
                        Status
                    </Table.Head>
                </Table.Header>
                <Table.Body items={items}>
                    {(card) => (
                        <Table.Row
                            id={card._id}
                            onAction={() => onOpen(card._id)}
                            className="hover:bg-secondary/40 has-[:focus-visible]:bg-secondary/60 cursor-pointer h-auto!"
                        >
                            <Table.Cell className="py-2.5 pr-2 px-0!">
                                <CardIdentityCell card={card} />
                            </Table.Cell>
                            <Table.Cell className="py-2.5 pr-2 px-0! text-right tabular-nums font-medium text-primary">
                                {formatDisplayCurrency(card.currentBalance ?? null)}
                            </Table.Cell>
                            <Table.Cell className="py-2.5 pr-2 px-0! text-right tabular-nums text-secondary">
                                {formatDisplayCurrency(card.availableCredit ?? null)}
                            </Table.Cell>
                            <Table.Cell className="py-2.5 pr-2 px-0!">
                                <LimitCell card={card} />
                            </Table.Cell>
                            <Table.Cell className="py-2.5 px-0!">
                                <StatusCell card={card} />
                            </Table.Cell>
                        </Table.Row>
                    )}
                </Table.Body>
            </Table>
        </ToolCardShell>
    );
}

function UpcomingStrip({ cards, onOpen }: { cards: CreditCardRow[]; onOpen: OpenCard }) {
    return (
        <ToolCardShell title="Upcoming statements">
            <ul className="divide-y divide-secondary">
                {cards.map((card) => (
                    <li key={card._id}>
                        <button
                            type="button"
                            onClick={() => onOpen(card._id)}
                            className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-secondary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                        >
                            <InstitutionLogo
                                institutionName={card.institutionName ?? card.company}
                                logoBase64={card.institutionLogoBase64}
                                primaryColor={card.institutionPrimaryColor}
                                size="sm"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-primary">{card.displayName}</p>
                                <p className="truncate text-xs text-tertiary">
                                    {card.mask ? `•••• ${card.mask}` : "No mask"} · {formatClosingDay(card.statementClosingDay)}
                                </p>
                            </div>
                            {card.nextPaymentDueDate ? (
                                <PaymentDueBadge
                                    nextPaymentDueDate={card.nextPaymentDueDate}
                                    isOverdue={card.isOverdue ?? false}
                                    minimumPaymentAmount={card.minimumPaymentAmount ?? null}
                                    size="sm"
                                />
                            ) : (
                                <Badge color="gray" size="sm">
                                    No due date
                                </Badge>
                            )}
                        </button>
                    </li>
                ))}
            </ul>
        </ToolCardShell>
    );
}

function SingleStatement({ card, onOpen }: { card: CreditCardRow; onOpen: OpenCard }) {
    const utilization = calculateUtilization(card.currentBalance ?? null, card.creditLimit ?? null);
    const apr = getPurchaseApr(card.aprs ?? undefined);
    const brand = brandLabel(card.brand);

    return (
        <ToolCardShell
            title={card.displayName}
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
            <header className="mb-4 flex items-center gap-3">
                <InstitutionLogo
                    institutionName={card.institutionName ?? card.company}
                    logoBase64={card.institutionLogoBase64}
                    primaryColor={card.institutionPrimaryColor}
                    size="md"
                />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary">
                        {card.institutionName ?? card.company ?? "Issuer"}
                    </p>
                    <p className="text-xs text-tertiary">
                        {card.mask ? `•••• ${card.mask}` : "No mask"}
                        {brand ? ` · ${brand}` : ""}
                    </p>
                </div>
                <StatusCell card={card} />
            </header>

            <div className="rounded-lg border border-secondary bg-secondary/30 p-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                        <p className="text-xs text-tertiary">Current balance</p>
                        <p className="mt-0.5 text-base font-semibold tabular-nums text-primary">
                            {formatDisplayCurrency(card.currentBalance ?? null)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-tertiary">Available credit</p>
                        <p className="mt-0.5 text-base font-semibold tabular-nums text-primary">
                            {formatDisplayCurrency(card.availableCredit ?? null)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-tertiary">Credit limit</p>
                        <p className="mt-0.5 text-sm tabular-nums text-primary">
                            {formatDisplayCurrency(card.creditLimit ?? null)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-tertiary">Utilization</p>
                        <p className="mt-0.5 text-sm tabular-nums text-primary">
                            {utilization != null ? formatPercentage(utilization, 0) : "-"}
                        </p>
                    </div>
                </div>
                {utilization != null && <UtilizationBar utilization={utilization} className="mt-3" />}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-tertiary">Statement balance</dt>
                <dd className="text-right tabular-nums text-primary">
                    {formatDisplayCurrency(card.lastStatementBalance ?? null)}
                </dd>
                <dt className="text-tertiary">Minimum payment</dt>
                <dd className="text-right tabular-nums text-primary">
                    {formatDisplayCurrency(card.minimumPaymentAmount ?? null)}
                </dd>
                {card.nextPaymentDueDate && (
                    <>
                        <dt className="text-tertiary">Next payment due</dt>
                        <dd className="text-right tabular-nums text-primary">
                            {formatDueDate(card.nextPaymentDueDate)}
                        </dd>
                    </>
                )}
                <dt className="text-tertiary">Purchase APR</dt>
                <dd className="text-right tabular-nums text-primary">{formatApr(apr)}</dd>
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

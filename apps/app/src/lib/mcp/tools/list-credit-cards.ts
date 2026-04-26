// apps/app/src/lib/mcp/tools/list-credit-cards.ts
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { formatMoneyFromDollars, milliunitsToDollarsOrNull } from "@/utils/money";
import type { MCPCreditCard, MCPToolResponse } from "../types";

/**
 * List all active credit cards for the authenticated user.
 */
export async function listCreditCards(token: string): Promise<MCPToolResponse<MCPCreditCard[]>> {
    // Fetch cards from Convex with token for authentication
    const cards = await fetchQuery(api.creditCards.queries.list, {}, { token });

    const mappedCards: MCPCreditCard[] = cards.map((card) => {
        const currentBalance = milliunitsToDollarsOrNull(card.currentBalance) ?? 0;
        const creditLimit = milliunitsToDollarsOrNull(card.creditLimit);

        return {
            id: card._id,
            accountId: card.accountId,
            displayName: card.displayName,
            company: card.company ?? null,
            brand: card.brand ?? "other",
            lastFour: card.lastFour ?? null,

            currentBalance,
            availableCredit: milliunitsToDollarsOrNull(card.availableCredit),
            creditLimit,
            utilization: creditLimit ? (currentBalance / creditLimit) * 100 : null,

            minimumPaymentAmount: milliunitsToDollarsOrNull(card.minimumPaymentAmount),
            nextPaymentDueDate: card.nextPaymentDueDate ?? null,
            isOverdue: card.isOverdue,

            lastStatementBalance: milliunitsToDollarsOrNull(card.lastStatementBalance),
            lastStatementIssueDate: card.lastStatementIssueDate ?? null,
            lastPaymentAmount: milliunitsToDollarsOrNull(card.lastPaymentAmount),
            lastPaymentDate: card.lastPaymentDate ?? null,

            aprs: (card.aprs ?? []).map((apr) => ({
                aprPercentage: apr.aprPercentage,
                aprType: apr.aprType,
                balanceSubjectToApr: milliunitsToDollarsOrNull(apr.balanceSubjectToApr),
                interestChargeAmount: milliunitsToDollarsOrNull(apr.interestChargeAmount),
            })),

            isLocked: card.isLocked,
            syncStatus: card.syncStatus ?? "synced",
            lastSyncedAt: card.lastSyncedAt ?? null,
        };
    });

    // Generate AI-friendly summary
    const totalBalance = mappedCards.reduce((sum, c) => sum + c.currentBalance, 0);
    const avgUtilization =
        mappedCards.length > 0
            ? mappedCards.filter((c) => c.utilization !== null).reduce((sum, c) => sum + (c.utilization ?? 0), 0) /
              mappedCards.filter((c) => c.utilization !== null).length
            : 0;
    const overdueCount = mappedCards.filter((c) => c.isOverdue).length;

    let summary = `You have ${mappedCards.length} credit card${mappedCards.length !== 1 ? "s" : ""}`;
    if (mappedCards.length > 0) {
        summary += ` with a total balance of ${formatMoneyFromDollars(totalBalance)}`;
        if (avgUtilization > 0) {
            summary += ` and ${avgUtilization.toFixed(1)}% average utilization`;
        }
        if (overdueCount > 0) {
            summary += `. ${overdueCount} card${overdueCount !== 1 ? "s are" : " is"} overdue`;
        }
    }
    summary += ".";

    return {
        data: mappedCards,
        summary,
    };
}

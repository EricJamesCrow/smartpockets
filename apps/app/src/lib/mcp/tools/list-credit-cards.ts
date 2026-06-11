// apps/app/src/lib/mcp/tools/list-credit-cards.ts
import { formatMoneyFromDollars, milliunitsToDollarsOrNull } from "@/utils/money";
import { callMcpBridge, type BridgeCard } from "../bridge-client";
import type { MCPCreditCard, MCPToolResponse } from "../types";

export function mapBridgeCard(card: BridgeCard): MCPCreditCard {
    const currentBalance = card.currentBalance ?? 0;
    const creditLimit = card.creditLimit ?? null;

    return {
        id: card._id,
        accountId: card.accountId,
        displayName: card.displayName,
        company: card.company ?? null,
        brand: card.brand ?? "other",
        lastFour: card.lastFour ?? null,

        currentBalance,
        availableCredit: card.availableCredit ?? null,
        creditLimit,
        utilization: creditLimit ? (currentBalance / creditLimit) * 100 : null,

        minimumPaymentAmount: card.minimumPaymentAmount ?? null,
        nextPaymentDueDate: card.nextPaymentDueDate ?? null,
        isOverdue: card.isOverdue ?? false,

        lastStatementBalance: card.lastStatementBalance ?? null,
        lastStatementIssueDate: card.lastStatementIssueDate ?? null,
        lastPaymentAmount: card.lastPaymentAmount ?? null,
        lastPaymentDate: card.lastPaymentDate ?? null,

        aprs: (card.aprs ?? []).map((apr) => ({
            aprPercentage: apr.aprPercentage,
            aprType: apr.aprType,
            balanceSubjectToApr: milliunitsToDollarsOrNull(apr.balanceSubjectToApr ?? undefined),
            interestChargeAmount: milliunitsToDollarsOrNull(apr.interestChargeAmount ?? undefined),
        })),

        isLocked: card.isLocked ?? false,
        syncStatus: card.syncStatus ?? "synced",
        lastSyncedAt: card.lastSyncedAt ?? null,
    };
}

/**
 * List all active credit cards for the OAuth-authenticated user.
 */
export async function listCreditCards(externalId: string): Promise<MCPToolResponse<MCPCreditCard[]>> {
    const result = await callMcpBridge<BridgeCard[]>("list_credit_cards", {}, externalId);
    if (!result.ok) {
        return { data: [], summary: `Unable to list cards (${result.error}).` };
    }

    const mappedCards = result.data.map(mapBridgeCard);

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

// apps/app/src/lib/mcp/tools/get-credit-card.ts
import { formatMoneyFromDollars } from "@/utils/money";
import { callMcpBridge, type BridgeCard } from "../bridge-client";
import type { MCPCreditCard, MCPToolResponse } from "../types";
import { mapBridgeCard } from "./list-credit-cards";

/**
 * Get details for a single credit card owned by the OAuth-authenticated user.
 */
export async function getCreditCard(externalId: string, cardId: string): Promise<MCPToolResponse<MCPCreditCard | null>> {
    const result = await callMcpBridge<BridgeCard | null>("get_credit_card", { cardId }, externalId);
    if (!result.ok || !result.data) {
        return {
            data: null,
            summary: "Card not found.",
        };
    }

    const mappedCard = mapBridgeCard(result.data);

    // Generate summary
    const name = mappedCard.displayName || mappedCard.company || "Card";
    let summary = `${name} (${mappedCard.brand}, •••${mappedCard.lastFour}): `;
    summary += `${formatMoneyFromDollars(mappedCard.currentBalance)} balance`;

    if (mappedCard.creditLimit) {
        summary += ` of ${formatMoneyFromDollars(mappedCard.creditLimit)} limit`;
        summary += ` (${mappedCard.utilization?.toFixed(1)}% utilized)`;
    }

    if (mappedCard.isOverdue) {
        summary += ". OVERDUE";
    } else if (mappedCard.nextPaymentDueDate) {
        summary += `. Next payment due: ${mappedCard.nextPaymentDueDate}`;
    }

    return {
        data: mappedCard,
        summary,
    };
}

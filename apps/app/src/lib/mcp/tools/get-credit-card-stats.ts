// apps/app/src/lib/mcp/tools/get-credit-card-stats.ts
import { formatMoneyFromDollars } from "@/utils/money";
import { callMcpBridge, type BridgeStats } from "../bridge-client";
import type { MCPCreditCardStats, MCPToolResponse } from "../types";

/**
 * Get aggregated statistics across all credit cards for the
 * OAuth-authenticated user.
 */
export async function getCreditCardStats(externalId: string): Promise<MCPToolResponse<MCPCreditCardStats>> {
    const result = await callMcpBridge<BridgeStats>("get_credit_card_stats", {}, externalId);
    if (!result.ok) {
        const empty: MCPCreditCardStats = {
            totalBalance: 0,
            totalAvailableCredit: 0,
            totalCreditLimit: 0,
            averageUtilization: 0,
            overdueCount: 0,
            lockedCount: 0,
            cardCount: 0,
            narrative: `Unable to load stats (${result.error}).`,
        };
        return { data: empty, summary: empty.narrative };
    }
    const stats = result.data;

    const mappedStats: MCPCreditCardStats = {
        totalBalance: stats.totalBalance,
        totalAvailableCredit: stats.totalAvailableCredit,
        totalCreditLimit: stats.totalCreditLimit,
        averageUtilization: stats.averageUtilization,
        overdueCount: stats.overdueCount,
        lockedCount: stats.lockedCount,
        cardCount: stats.cardCount,
        narrative: "",
    };

    // Generate narrative
    let narrative = `Total balance: ${formatMoneyFromDollars(mappedStats.totalBalance)}`;
    narrative += ` across ${mappedStats.cardCount} card${mappedStats.cardCount !== 1 ? "s" : ""}.`;

    if (mappedStats.totalCreditLimit > 0) {
        narrative += ` Total credit limit: ${formatMoneyFromDollars(mappedStats.totalCreditLimit)}.`;
        narrative += ` Average utilization: ${mappedStats.averageUtilization.toFixed(1)}%.`;
    }

    if (mappedStats.overdueCount > 0) {
        narrative += ` WARNING: ${mappedStats.overdueCount} card${mappedStats.overdueCount !== 1 ? "s are" : " is"} overdue.`;
    }

    mappedStats.narrative = narrative;

    return {
        data: mappedStats,
        summary: narrative,
    };
}

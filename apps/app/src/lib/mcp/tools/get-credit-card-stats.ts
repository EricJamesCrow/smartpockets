// apps/app/src/lib/mcp/tools/get-credit-card-stats.ts
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { formatMoneyFromDollars, milliunitsToDollars } from "@/utils/money";
import type { MCPCreditCardStats, MCPToolResponse } from "../types";

/**
 * Get aggregated statistics across all credit cards.
 */
export async function getCreditCardStats(token: string): Promise<MCPToolResponse<MCPCreditCardStats>> {
    const stats = await fetchQuery(api.creditCards.queries.getStats, {}, { token });

    const mappedStats: MCPCreditCardStats = {
        totalBalance: milliunitsToDollars(stats.totalBalance),
        totalAvailableCredit: milliunitsToDollars(stats.totalAvailableCredit),
        totalCreditLimit: milliunitsToDollars(stats.totalCreditLimit),
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

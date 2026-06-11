// apps/app/src/lib/mcp/tools/list-transactions.ts
import { parseLocalDate } from "@/types/credit-cards";
import { formatMoneyFromDollars, milliunitsToDollars } from "@/utils/money";
import { callMcpBridge, type BridgeCard, type BridgeTransaction } from "../bridge-client";
import type { MCPToolResponse, MCPTransaction } from "../types";

/**
 * List recent transactions for a credit card owned by the
 * OAuth-authenticated user.
 */
export async function listTransactions(
    externalId: string,
    cardId: string,
    startDate?: string,
    endDate?: string,
): Promise<MCPToolResponse<MCPTransaction[]>> {
    // Default to last 30 days (use local-midnight to match parseLocalDate on tx.date)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = endDate ? parseLocalDate(endDate) : today;
    const start = startDate ? parseLocalDate(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // One bridge call returns the ownership-checked card plus its transactions.
    const result = await callMcpBridge<{ card: BridgeCard; transactions: BridgeTransaction[] } | null>(
        "list_transactions",
        { cardId },
        externalId,
    );

    if (!result.ok || !result.data) {
        return {
            data: [],
            summary: "Card not found.",
        };
    }

    // Filter by date range and map to MCP format. Each transaction carries
    // Plaid-convention (`amount`), human-convention (`displayAmount`), a
    // verbatim `amountFormatted`, and `direction` so external MCP clients can
    // echo amounts without reasoning through Plaid's inverted sign rule. See
    // MCPTransaction docstring in `../types.ts`.
    const mappedTransactions: MCPTransaction[] = result.data.transactions
        .filter((tx) => {
            const txDate = parseLocalDate(tx.date);
            return txDate >= start && txDate <= end;
        })
        .map((tx) => {
            const amount = milliunitsToDollars(tx.amount);
            const displayAmount = amount === 0 ? 0 : -amount;
            return {
                id: tx._id,
                date: tx.date,
                merchant: tx.merchantName ?? tx.name ?? "Unknown",
                amount,
                displayAmount,
                amountFormatted: formatHumanAmount(displayAmount),
                direction: displayAmount >= 0 ? "inflow" : "outflow",
                category: tx.categoryPrimary ?? null,
                pending: tx.pending ?? false,
            };
        });

    // Generate summary. We sum on the Plaid-convention `amount` so filters
    // line up with the in-app aggregation tools' "spend = positive Plaid"
    // contract; the visible labels translate to user-facing language
    // ("Total spent" / "Credits/refunds") so the summary itself doesn't
    // expose the sign convention to end users.
    const totalSpent = mappedTransactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
    const totalCredits = mappedTransactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    let summary = `${mappedTransactions.length} transaction${mappedTransactions.length !== 1 ? "s" : ""}`;
    summary += ` from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}.`;
    summary += ` Total spent: ${formatMoneyFromDollars(totalSpent)}.`;
    if (totalCredits > 0) {
        summary += ` Credits/refunds: ${formatMoneyFromDollars(totalCredits)}.`;
    }

    return {
        data: mappedTransactions,
        summary,
    };
}

function formatHumanAmount(displayAmount: number): string {
    const sign = displayAmount < 0 ? "-" : "+";
    return `${sign}${formatMoneyFromDollars(Math.abs(displayAmount))}`;
}

// apps/app/src/lib/mcp/tools/list-transactions.ts

import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { MCPTransaction, MCPToolResponse } from "../types";

/**
 * List recent transactions for a credit card.
 */
export async function listTransactions(
  token: string,
  cardId: string,
  startDate?: string,
  endDate?: string
): Promise<MCPToolResponse<MCPTransaction[]>> {
  // Default to last 30 days
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  // First get the card to find the accountId
  const card = await fetchQuery(
    api.creditCards.queries.get,
    { cardId: cardId as Id<"creditCards"> },
    { token }
  );

  if (!card) {
    return {
      data: [],
      summary: "Card not found.",
    };
  }

  // Fetch transactions for this account using the correct query name
  const transactions = await fetchQuery(
    api.transactions.queries.getTransactionsByAccountId,
    { accountId: card.accountId },
    { token }
  );

  // Filter by date range and map to MCP format
  const mappedTransactions: MCPTransaction[] = transactions
    .filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= start && txDate <= end;
    })
    .map((tx) => ({
      id: tx._id,
      date: tx.date,
      merchant: tx.merchantName ?? tx.name ?? "Unknown",
      amount: tx.amount,
      category: tx.categoryPrimary ?? null,
      pending: tx.pending ?? false,
    }));

  // Generate summary
  const totalSpent = mappedTransactions
    .filter((tx) => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalCredits = mappedTransactions
    .filter((tx) => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  let summary = `${mappedTransactions.length} transaction${mappedTransactions.length !== 1 ? "s" : ""}`;
  summary += ` from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}.`;
  summary += ` Total spent: $${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`;
  if (totalCredits > 0) {
    summary += ` Credits/refunds: $${totalCredits.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`;
  }

  return {
    data: mappedTransactions,
    summary,
  };
}

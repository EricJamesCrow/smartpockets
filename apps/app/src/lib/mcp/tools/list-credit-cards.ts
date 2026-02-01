// apps/app/src/lib/mcp/tools/list-credit-cards.ts

import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { MCPCreditCard, MCPToolResponse } from "../types";

/**
 * List all active credit cards for the authenticated user.
 */
export async function listCreditCards(
  token: string
): Promise<MCPToolResponse<MCPCreditCard[]>> {
  // Fetch cards from Convex with token for authentication
  const cards = await fetchQuery(
    api.creditCards.queries.list,
    {},
    { token }
  );

  const mappedCards: MCPCreditCard[] = cards.map((card) => ({
    id: card._id,
    accountId: card.accountId,
    displayName: card.displayName,
    company: card.company ?? null,
    brand: card.brand ?? "other",
    lastFour: card.lastFour ?? null,

    currentBalance: card.currentBalance ?? 0,
    availableCredit: card.availableCredit ?? null,
    creditLimit: card.creditLimit ?? null,
    utilization: card.creditLimit
      ? ((card.currentBalance ?? 0) / card.creditLimit) * 100
      : null,

    minimumPaymentAmount: card.minimumPaymentAmount ?? null,
    nextPaymentDueDate: card.nextPaymentDueDate ?? null,
    isOverdue: card.isOverdue,

    lastStatementBalance: card.lastStatementBalance ?? null,
    lastStatementIssueDate: card.lastStatementIssueDate ?? null,
    lastPaymentAmount: card.lastPaymentAmount ?? null,
    lastPaymentDate: card.lastPaymentDate ?? null,

    aprs: (card.aprs ?? []).map((apr) => ({
      aprPercentage: apr.aprPercentage,
      aprType: apr.aprType,
      balanceSubjectToApr: apr.balanceSubjectToApr ?? null,
      interestChargeAmount: apr.interestChargeAmount ?? null,
    })),

    isLocked: card.isLocked,
    syncStatus: card.syncStatus ?? "synced",
    lastSyncedAt: card.lastSyncedAt ?? null,
  }));

  // Generate AI-friendly summary
  const totalBalance = mappedCards.reduce((sum, c) => sum + c.currentBalance, 0);
  const avgUtilization = mappedCards.length > 0
    ? mappedCards
        .filter((c) => c.utilization !== null)
        .reduce((sum, c) => sum + (c.utilization ?? 0), 0) /
        mappedCards.filter((c) => c.utilization !== null).length
    : 0;
  const overdueCount = mappedCards.filter((c) => c.isOverdue).length;

  let summary = `You have ${mappedCards.length} credit card${mappedCards.length !== 1 ? "s" : ""}`;
  if (mappedCards.length > 0) {
    summary += ` with a total balance of $${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
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

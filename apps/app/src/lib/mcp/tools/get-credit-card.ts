// apps/app/src/lib/mcp/tools/get-credit-card.ts

import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { MCPCreditCard, MCPToolResponse } from "../types";

/**
 * Get details for a single credit card.
 */
export async function getCreditCard(
  token: string,
  cardId: string
): Promise<MCPToolResponse<MCPCreditCard | null>> {
  const card = await fetchQuery(
    api.creditCards.queries.get,
    { cardId: cardId as Id<"creditCards"> },
    { token }
  );

  if (!card) {
    return {
      data: null,
      summary: "Card not found.",
    };
  }

  const mappedCard: MCPCreditCard = {
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
  };

  // Generate summary
  const name = mappedCard.displayName || mappedCard.company || "Card";
  let summary = `${name} (${mappedCard.brand}, •••${mappedCard.lastFour}): `;
  summary += `$${mappedCard.currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} balance`;

  if (mappedCard.creditLimit) {
    summary += ` of $${mappedCard.creditLimit.toLocaleString("en-US", { minimumFractionDigits: 2 })} limit`;
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

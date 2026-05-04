// apps/app/src/lib/mcp/types.ts

/**
 * Authentication result with token for Convex passthrough
 */
export interface MCPAuthResult {
    userContext: MCPUserContext;
    token: string;
}

/**
 * User context extracted from Clerk token
 */
export interface MCPUserContext {
    userId: string;
    clerkUserId: string;
}

/**
 * Credit card data returned by MCP tools
 */
export interface MCPCreditCard {
    id: string;
    accountId: string;
    displayName: string;
    company: string | null;
    brand: "visa" | "mastercard" | "amex" | "discover" | "other";
    lastFour: string | null;

    // Balances passed to external model/tool callers in display dollars.
    currentBalance: number;
    availableCredit: number | null;
    creditLimit: number | null;
    utilization: number | null;

    // Payment info
    minimumPaymentAmount: number | null;
    nextPaymentDueDate: string | null;
    isOverdue: boolean;

    // Last statement
    lastStatementBalance: number | null;
    lastStatementIssueDate: string | null;
    lastPaymentAmount: number | null;
    lastPaymentDate: string | null;

    // APRs
    aprs: Array<{
        aprPercentage: number;
        aprType: string;
        balanceSubjectToApr: number | null;
        interestChargeAmount: number | null;
    }>;

    // Status
    isLocked: boolean;
    syncStatus: "synced" | "syncing" | "error" | "stale";
    lastSyncedAt: number | null;
}

/**
 * Aggregated stats across all credit cards
 */
export interface MCPCreditCardStats {
    totalBalance: number;
    totalAvailableCredit: number;
    totalCreditLimit: number;
    averageUtilization: number;
    overdueCount: number;
    lockedCount: number;
    cardCount: number;
    narrative: string;
}

/**
 * Transaction data sent to external MCP clients (Claude Desktop etc.).
 *
 * **Two amount fields, two conventions:**
 * - `amount` — Plaid convention: positive = outflow (purchase, payment,
 *   transfer out), negative = inflow (refund, income, deposit). Useful
 *   for filtering/arithmetic that mirrors the in-app aggregation tools.
 * - `displayAmount` — human convention: positive = money in (refund,
 *   income, transfers in), negative = money out (purchases, payments,
 *   transfers out). External clients should use this when echoing the
 *   amount back to the end user.
 */
export interface MCPTransaction {
    id: string;
    date: string;
    merchant: string;
    /** Plaid convention: positive = outflow, negative = inflow (dollars). */
    amount: number;
    /** Human convention: positive = money in, negative = money out (dollars). Use this in user-facing text. */
    displayAmount: number;
    category: string | null;
    pending: boolean;
}

/**
 * Tool response wrapper with AI-friendly summary
 */
export interface MCPToolResponse<T> {
    data: T;
    summary: string;
}

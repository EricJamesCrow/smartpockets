# Credit Cards MCP Server Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP server embedded in the Next.js app that allows AI assistants to query credit card data with Clerk authentication.

**Architecture:** HTTP POST endpoint at `/api/mcp` handles MCP protocol messages. Clerk tokens authenticate requests and are passed through to Convex queries. Four read-only tools query existing Convex functions for credit card data and transactions.

**Tech Stack:** `@modelcontextprotocol/sdk`, Next.js API routes, Clerk token verification, Convex queries with token passthrough

---

## Task 1: Install MCP SDK

**Files:**
- Modify: `apps/app/package.json`

**Step 1: Add MCP SDK dependency**

```bash
cd apps/app && bun add @modelcontextprotocol/sdk
```

**Step 2: Verify installation**

```bash
bun pm ls | grep modelcontextprotocol
```

Expected: `@modelcontextprotocol/sdk` listed

**Step 3: Commit**

```bash
git add apps/app/package.json bun.lockb
git commit -m "feat(mcp): add @modelcontextprotocol/sdk dependency

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create MCP Types

**Files:**
- Create: `apps/app/src/lib/mcp/types.ts`

**Step 1: Create types file**

Note: Types are aligned with actual Convex query return types:
- `displayName` is required (string) in Convex, but we expose as nullable for MCP flexibility
- `brand` is optional in Convex schema
- `syncStatus` is optional in Convex schema

```typescript
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

  // Balances (in dollars)
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
 * Transaction data
 */
export interface MCPTransaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
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
```

**Step 2: Commit**

```bash
git add apps/app/src/lib/mcp/types.ts
git commit -m "feat(mcp): add MCP type definitions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create Auth Helper

**Files:**
- Create: `apps/app/src/lib/mcp/auth.ts`

**Step 1: Create auth verification helper**

Note: Returns both user context AND the raw token for Convex query passthrough.

```typescript
// apps/app/src/lib/mcp/auth.ts

import { clerkClient } from "@clerk/nextjs/server";
import type { MCPAuthResult } from "./types";

/**
 * Verify a Clerk session token and extract user context.
 * Returns both user context and the raw token for Convex passthrough.
 *
 * @param authHeader - The Authorization header value (Bearer <token>)
 * @returns Auth result with user context and token if valid, null if invalid
 */
export async function verifyMCPToken(
  authHeader: string | null
): Promise<MCPAuthResult | null> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const client = await clerkClient();
    const { sub: clerkUserId } = await client.verifyToken(token);

    if (!clerkUserId) {
      return null;
    }

    // Return both user context and raw token for Convex queries
    return {
      userContext: {
        userId: clerkUserId,
        clerkUserId,
      },
      token,
    };
  } catch (error) {
    console.error("[MCP Auth] Token verification failed:", error);
    return null;
  }
}
```

**Step 2: Commit**

```bash
git add apps/app/src/lib/mcp/auth.ts
git commit -m "feat(mcp): add Clerk token verification helper

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create list-credit-cards Tool

**Files:**
- Create: `apps/app/src/lib/mcp/tools/list-credit-cards.ts`

**Step 1: Create the tool**

Note: Accepts token parameter and passes it to fetchQuery for Convex authentication.

```typescript
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
```

**Step 2: Commit**

```bash
git add apps/app/src/lib/mcp/tools/list-credit-cards.ts
git commit -m "feat(mcp): add list-credit-cards tool

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create get-credit-card Tool

**Files:**
- Create: `apps/app/src/lib/mcp/tools/get-credit-card.ts`

**Step 1: Create the tool**

```typescript
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
```

**Step 2: Commit**

```bash
git add apps/app/src/lib/mcp/tools/get-credit-card.ts
git commit -m "feat(mcp): add get-credit-card tool

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create get-credit-card-stats Tool

**Files:**
- Create: `apps/app/src/lib/mcp/tools/get-credit-card-stats.ts`

**Step 1: Create the tool**

```typescript
// apps/app/src/lib/mcp/tools/get-credit-card-stats.ts

import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { MCPCreditCardStats, MCPToolResponse } from "../types";

/**
 * Get aggregated statistics across all credit cards.
 */
export async function getCreditCardStats(
  token: string
): Promise<MCPToolResponse<MCPCreditCardStats>> {
  const stats = await fetchQuery(
    api.creditCards.queries.getStats,
    {},
    { token }
  );

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
  let narrative = `Total balance: $${mappedStats.totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  narrative += ` across ${mappedStats.cardCount} card${mappedStats.cardCount !== 1 ? "s" : ""}.`;

  if (mappedStats.totalCreditLimit > 0) {
    narrative += ` Total credit limit: $${mappedStats.totalCreditLimit.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`;
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
```

**Step 2: Commit**

```bash
git add apps/app/src/lib/mcp/tools/get-credit-card-stats.ts
git commit -m "feat(mcp): add get-credit-card-stats tool

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Create list-transactions Tool

**Files:**
- Create: `apps/app/src/lib/mcp/tools/list-transactions.ts`

**Step 1: Create the tool**

Note: Uses `getTransactionsByAccountId` query (not `listByAccount` which doesn't exist).

```typescript
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
```

**Step 2: Commit**

```bash
git add apps/app/src/lib/mcp/tools/list-transactions.ts
git commit -m "feat(mcp): add list-transactions tool

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Create Tools Index

**Files:**
- Create: `apps/app/src/lib/mcp/tools/index.ts`

**Step 1: Create index file**

```typescript
// apps/app/src/lib/mcp/tools/index.ts

export { listCreditCards } from "./list-credit-cards";
export { getCreditCard } from "./get-credit-card";
export { getCreditCardStats } from "./get-credit-card-stats";
export { listTransactions } from "./list-transactions";
```

**Step 2: Commit**

```bash
git add apps/app/src/lib/mcp/tools/index.ts
git commit -m "feat(mcp): add tools index export

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Create MCP Server

**Files:**
- Create: `apps/app/src/lib/mcp/server.ts`

**Step 1: Create MCP server setup**

Note: Tool handlers now receive token parameter for Convex authentication.

```typescript
// apps/app/src/lib/mcp/server.ts

import {
  listCreditCards,
  getCreditCard,
  getCreditCardStats,
  listTransactions,
} from "./tools";

/**
 * Tool definitions for the MCP server.
 */
const TOOLS = [
  {
    name: "list_credit_cards",
    description: "List all active credit cards with balances, limits, APRs, and payment information.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_credit_card",
    description: "Get detailed information about a specific credit card including APRs, payment dates, and status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        cardId: {
          type: "string",
          description: "The credit card ID",
        },
      },
      required: ["cardId"],
    },
  },
  {
    name: "get_credit_card_stats",
    description: "Get aggregated statistics across all credit cards: total balance, utilization, overdue count.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "list_transactions",
    description: "List recent transactions for a credit card. Defaults to last 30 days.",
    inputSchema: {
      type: "object" as const,
      properties: {
        cardId: {
          type: "string",
          description: "The credit card ID",
        },
        startDate: {
          type: "string",
          description: "Start date (YYYY-MM-DD). Defaults to 30 days ago.",
        },
        endDate: {
          type: "string",
          description: "End date (YYYY-MM-DD). Defaults to today.",
        },
      },
      required: ["cardId"],
    },
  },
];

/**
 * Handle a tool call and return the result.
 * Token is passed through to Convex queries for authentication.
 */
export async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  token: string
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    let result: unknown;

    switch (toolName) {
      case "list_credit_cards":
        result = await listCreditCards(token);
        break;

      case "get_credit_card":
        result = await getCreditCard(token, args.cardId as string);
        break;

      case "get_credit_card_stats":
        result = await getCreditCardStats(token);
        break;

      case "list_transactions":
        result = await listTransactions(
          token,
          args.cardId as string,
          args.startDate as string | undefined,
          args.endDate as string | undefined
        );
        break;

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: message }),
        },
      ],
    };
  }
}

/**
 * Get the list of available tools.
 */
export function getTools() {
  return TOOLS;
}
```

**Step 2: Commit**

```bash
git add apps/app/src/lib/mcp/server.ts
git commit -m "feat(mcp): add MCP server with tool registration

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Create MCP API Route

**Files:**
- Create: `apps/app/src/app/api/mcp/route.ts`

**Step 1: Create the API route**

Note: Extracts token from auth result and passes it to tool handlers.

```typescript
// apps/app/src/app/api/mcp/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyMCPToken } from "@/lib/mcp/auth";
import { handleToolCall, getTools } from "@/lib/mcp/server";

/**
 * MCP Protocol Handler
 *
 * Handles MCP JSON-RPC requests over HTTP POST.
 * Requires Bearer token authentication via Clerk.
 */
export async function POST(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get("authorization");
  const authResult = await verifyMCPToken(authHeader);

  if (!authResult) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "Authentication required. Provide a valid Bearer token.",
        },
        id: null,
      },
      { status: 401 }
    );
  }

  // Parse JSON-RPC request
  let body: {
    jsonrpc: string;
    method: string;
    params?: Record<string, unknown>;
    id?: string | number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32700,
          message: "Parse error: Invalid JSON",
        },
        id: null,
      },
      { status: 400 }
    );
  }

  const { method, params, id } = body;

  try {
    // Handle MCP methods
    switch (method) {
      case "initialize": {
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "credit-cards-mcp",
              version: "1.0.0",
            },
          },
          id,
        });
      }

      case "tools/list": {
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            tools: getTools(),
          },
          id,
        });
      }

      case "tools/call": {
        const { name, arguments: args } = params as {
          name: string;
          arguments?: Record<string, unknown>;
        };

        // Pass the token through for Convex authentication
        const result = await handleToolCall(name, args ?? {}, authResult.token);

        return NextResponse.json({
          jsonrpc: "2.0",
          result,
          id,
        });
      }

      default: {
        return NextResponse.json({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
          id,
        });
      }
    }
  } catch (error) {
    console.error("[MCP] Error handling request:", error);
    return NextResponse.json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
      },
      id,
    });
  }
}

/**
 * GET handler for health check / discovery
 */
export async function GET() {
  return NextResponse.json({
    name: "credit-cards-mcp",
    version: "1.0.0",
    description: "MCP server for querying credit card data",
    tools: getTools().map((t) => t.name),
  });
}
```

**Step 2: Commit**

```bash
git add apps/app/src/app/api/mcp/route.ts
git commit -m "feat(mcp): add /api/mcp endpoint with JSON-RPC handler

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Verify Build

**Step 1: Run typecheck on app package**

```bash
cd apps/app && bun run typecheck
```

Expected: No new errors (pre-existing email errors may appear)

**Step 2: Run build**

```bash
cd apps/app && bun run build
```

Expected: Build succeeds

**Step 3: Commit any fixes if needed**

If there are type errors, fix them and commit:

```bash
git add -A
git commit -m "fix(mcp): resolve type errors

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Test MCP Endpoint Locally

**Step 1: Start dev server**

```bash
bun run dev:app
```

**Step 2: Test health endpoint**

```bash
curl http://localhost:3000/api/mcp
```

Expected: JSON with server info and tool list

**Step 3: Test initialize (without auth - should fail)**

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1}'
```

Expected: 401 with "Authentication required" error

---

## Task 13: Update Documentation

**Files:**
- Modify: `docs/plans/2025-01-17-credit-cards-mcp-server-design.md`

**Step 1: Add implementation status**

Add to the top of the design doc:

```markdown
**Status:** Implemented (2025-01-17)
```

**Step 2: Commit**

```bash
git add docs/plans/2025-01-17-credit-cards-mcp-server-design.md
git commit -m "docs(mcp): mark design as implemented

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

After completing all tasks, you will have:

1. MCP SDK installed
2. Type definitions for all MCP responses (aligned with Convex schema)
3. Clerk token verification helper (returns token for passthrough)
4. Four read-only tools with token-authenticated Convex queries:
   - `list_credit_cards` - All cards with full data
   - `get_credit_card` - Single card details
   - `get_credit_card_stats` - Aggregated stats
   - `list_transactions` - Recent transactions (uses `getTransactionsByAccountId`)
5. MCP server with tool registration
6. `/api/mcp` endpoint handling JSON-RPC protocol with token passthrough
7. Working local endpoint (auth testing requires Clerk token)

**Key fixes from original plan:**
- Auth helper returns both user context AND raw token
- All tools accept token parameter and pass to `fetchQuery`
- Transaction query uses correct name: `getTransactionsByAccountId`
- Types aligned with actual Convex return values
- `MCPCreditCardStats` includes `lockedCount` field

**Next steps (not in this plan):**
- Add token generation UI to settings page
- Deploy and test with Claude Desktop
- Add more tools as needed

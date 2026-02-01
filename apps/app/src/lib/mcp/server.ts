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

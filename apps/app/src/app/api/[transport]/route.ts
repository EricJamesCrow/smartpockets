// apps/app/src/app/api/[transport]/route.ts
//
// SmartPockets MCP server (CROWDEV-54) — streamable HTTP at /api/mcp.
//
// Built on mcp-handler (official MCP TS SDK transport for Next.js) with
// Clerk as the OAuth 2.1 authorization server. Stock clients connect via:
//   claude mcp add --transport http smartpockets <origin>/api/mcp
// and complete the OAuth flow in the browser (dynamic client registration
// must be enabled on the Clerk instance). See docs/mcp.md and
// docs/decisions/0001-mcp-server-oauth-rebuild.md.
import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { auth } from "@clerk/nextjs/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { checkMCPToolCallRateLimit } from "@/lib/mcp/rate-limit";
import { getCreditCard, getCreditCardStats, listCreditCards, listTransactions } from "@/lib/mcp/tools";

/** Rate-limit guard shared by every tool call (CROWDEV-460 token bucket). */
function assertWithinRateLimit(authInfo: { token: string; extra?: Record<string, unknown> }) {
    const userId = String(authInfo.extra?.userId ?? "");
    const limit = checkMCPToolCallRateLimit({ userId, token: authInfo.token });
    if (!limit.ok) {
        throw new Error(`rate_limited: retry in ${limit.retryAfterSeconds}s`);
    }
    return userId;
}

function toolResult(payload: unknown) {
    return {
        content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    };
}

const handler = createMcpHandler(
    (server) => {
        server.registerTool(
            "list_credit_cards",
            {
                title: "List credit cards",
                description:
                    "List all active credit cards with balances, limits, APRs, and payment information for the authorized user.",
                inputSchema: {},
            },
            async (_args, extra) => {
                const userId = assertWithinRateLimit(extra.authInfo!);
                return toolResult(await listCreditCards(userId));
            },
        );

        server.registerTool(
            "get_credit_card",
            {
                title: "Get credit card",
                description:
                    "Get detailed information about a specific credit card including APRs, payment dates, and status.",
                inputSchema: {
                    cardId: z.string().describe("The credit card ID (from list_credit_cards)"),
                },
            },
            async ({ cardId }, extra) => {
                const userId = assertWithinRateLimit(extra.authInfo!);
                return toolResult(await getCreditCard(userId, cardId));
            },
        );

        server.registerTool(
            "get_credit_card_stats",
            {
                title: "Get credit card stats",
                description:
                    "Get aggregated statistics across all credit cards: total balance, utilization, overdue count.",
                inputSchema: {},
            },
            async (_args, extra) => {
                const userId = assertWithinRateLimit(extra.authInfo!);
                return toolResult(await getCreditCardStats(userId));
            },
        );

        server.registerTool(
            "list_transactions",
            {
                title: "List transactions",
                description:
                    "List transactions for a credit card within a date range (defaults to the last 30 days). " +
                    "Amounts include amountFormatted (copy verbatim) and direction (inflow/outflow).",
                inputSchema: {
                    cardId: z.string().describe("The credit card ID (from list_credit_cards)"),
                    startDate: z.string().optional().describe("Start date YYYY-MM-DD (inclusive)"),
                    endDate: z.string().optional().describe("End date YYYY-MM-DD (inclusive)"),
                },
            },
            async ({ cardId, startDate, endDate }, extra) => {
                const userId = assertWithinRateLimit(extra.authInfo!);
                return toolResult(await listTransactions(userId, cardId, startDate, endDate));
            },
        );
    },
    {
        serverInfo: {
            name: "smartpockets",
            version: "2.0.0",
        },
        capabilities: {
            tools: {},
        },
    },
    {
        basePath: "/api",
        maxDuration: 60,
        verboseLogs: false,
    },
);

const authHandler = withMcpAuth(
    handler,
    async (_req, token) => {
        if (!token) return undefined;
        const clerkAuth = await auth({ acceptsToken: "oauth_token" });
        return verifyClerkToken(clerkAuth, token);
    },
    {
        required: true,
        resourceMetadataPath: "/.well-known/oauth-protected-resource/api/mcp",
    },
);

export { authHandler as GET, authHandler as POST };
export const maxDuration = 60;

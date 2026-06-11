/**
 * MCP bridge dispatcher (CROWDEV-54).
 *
 * The external MCP server (apps/app /api/mcp) authenticates clients via
 * Clerk OAuth, then calls the /mcp-tools HTTP action (http.ts) with a shared
 * secret. That action invokes this internal query, which resolves the user by
 * Clerk externalId and dispatches to the SAME ownership-scoped helpers that
 * back the public app queries — one implementation, two protocol surfaces.
 *
 * SECURITY: internal-only. The userId here is trusted because the caller
 * (the Next.js MCP route) established it from a verified Clerk OAuth token,
 * and the HTTP action verified MCP_BRIDGE_SECRET before dispatching.
 */
import { v } from "convex/values";
import { internalQuery } from "../functions";
import { getCardStatsForUser, getOwnedCard, listOwnedCards } from "../creditCards/shared";
import { getAccountTransactionsForUser } from "../transactions/queries";
import type { Id } from "../_generated/dataModel";

export const MCP_READ_TOOLS = [
    "list_credit_cards",
    "get_credit_card",
    "get_credit_card_stats",
    "list_transactions",
] as const;

export const runReadTool = internalQuery({
    args: {
        externalId: v.string(),
        tool: v.string(),
        args: v.any(),
    },
    returns: v.any(),
    handler: async (ctx, { externalId, tool, args }) => {
        const user = await ctx.table("users").get("externalId", externalId);
        if (!user) {
            return { ok: false as const, error: "unknown_user" };
        }

        switch (tool) {
            case "list_credit_cards": {
                const includeInactive = args?.includeInactive === true;
                const cards = await listOwnedCards(ctx, user, includeInactive);
                return { ok: true as const, data: cards };
            }
            case "get_credit_card": {
                if (typeof args?.cardId !== "string" || args.cardId.length === 0) {
                    return { ok: false as const, error: "invalid_args", detail: "cardId is required" };
                }
                const card = await getOwnedCard(ctx, user, args.cardId as Id<"creditCards">).catch(() => null);
                return { ok: true as const, data: card };
            }
            case "get_credit_card_stats": {
                const stats = await getCardStatsForUser(ctx, user);
                return { ok: true as const, data: stats };
            }
            case "list_transactions": {
                if (typeof args?.cardId !== "string" || args.cardId.length === 0) {
                    return { ok: false as const, error: "invalid_args", detail: "cardId is required" };
                }
                const card = await getOwnedCard(ctx, user, args.cardId as Id<"creditCards">).catch(() => null);
                if (!card) {
                    return { ok: true as const, data: null };
                }
                const transactions = await getAccountTransactionsForUser(ctx, user, card.accountId);
                return { ok: true as const, data: { card, transactions } };
            }
            default:
                return { ok: false as const, error: "unknown_tool" };
        }
    },
});

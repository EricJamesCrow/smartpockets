/**
 * Credit card read logic shared between the public app queries
 * (creditCards/queries.ts, viewer-scoped) and the external MCP bridge
 * (mcp/bridge.ts, user resolved by Clerk externalId).
 *
 * Every helper takes the owning user explicitly so callers decide how
 * identity was established; the helpers themselves never trust caller args
 * beyond that user.
 */
import { components } from "../_generated/api";
import type { Ent, QueryCtx } from "../types";
import type { Id } from "../_generated/dataModel";

type User = Ent<"users">;

/** Plaid item ids on active (non-paused) connections owned by the user. */
async function activePlaidItemIds(ctx: QueryCtx, user: User): Promise<Set<string>> {
    const userItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
        userId: user.externalId,
    });
    return new Set(userItems.filter((item) => item.isActive !== false).map((item) => item._id));
}

/**
 * List the user's credit cards (active by default), excluding cards whose
 * Plaid connection is paused. Manual cards (no plaidItemId) always included.
 */
export async function listOwnedCards(ctx: QueryCtx, user: User, includeInactive = false) {
    const activeItemIds = await activePlaidItemIds(ctx, user);
    const filterByActivePlaidItem = (card: { plaidItemId?: string }) =>
        !card.plaidItemId || activeItemIds.has(card.plaidItemId);

    if (includeInactive) {
        const cards = await ctx
            .table("creditCards", "by_user_active", (q) => q.eq("userId", user._id))
            .map((card) => card.doc());
        return cards.filter(filterByActivePlaidItem);
    }

    const cards = await ctx
        .table("creditCards", "by_user_active", (q) => q.eq("userId", user._id).eq("isActive", true))
        .map((card) => card.doc());
    return cards.filter(filterByActivePlaidItem);
}

/**
 * Fetch one card iff it belongs to the user and its Plaid connection (when
 * Plaid-backed) is not paused. Returns null otherwise — never throws on
 * foreign ids so callers can't probe existence.
 */
export async function getOwnedCard(ctx: QueryCtx, user: User, cardId: Id<"creditCards">) {
    const card = await ctx.table("creditCards").get(cardId);

    if (!card || card.userId !== user._id) {
        return null;
    }

    if (card.plaidItemId) {
        const activeItemIds = await activePlaidItemIds(ctx, user);
        if (!activeItemIds.has(card.plaidItemId)) {
            return null; // Card's Plaid item is paused
        }
    }

    return card.doc();
}

/** Aggregate stats across the user's active cards. */
export async function getCardStatsForUser(ctx: QueryCtx, user: User) {
    const cards = await listOwnedCards(ctx, user, false);

    const stats = {
        totalBalance: 0,
        totalAvailableCredit: 0,
        totalCreditLimit: 0,
        overdueCount: 0,
        lockedCount: 0,
        cardCount: cards.length,
    };

    for (const card of cards) {
        stats.totalBalance += card.currentBalance ?? 0;
        stats.totalAvailableCredit += card.availableCredit ?? 0;
        stats.totalCreditLimit += card.creditLimit ?? 0;
        if (card.isOverdue) stats.overdueCount++;
        if (card.isLocked) stats.lockedCount++;
    }

    const averageUtilization = stats.totalCreditLimit > 0 ? (stats.totalBalance / stats.totalCreditLimit) * 100 : 0;

    return {
        ...stats,
        averageUtilization: Math.round(averageUtilization * 100) / 100,
    };
}

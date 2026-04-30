import { v } from "convex/values";
import { components } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { query } from "../functions";
import { formatMoneyFromDollars } from "../money";

/**
 * Get critical alerts for banner display
 */
export const getAlerts = query({
    args: {},
    returns: v.array(
        v.object({
            id: v.string(),
            type: v.union(v.literal("overdue"), v.literal("due_soon"), v.literal("sync_error"), v.literal("reauth_needed")),
            severity: v.union(v.literal("critical"), v.literal("warning"), v.literal("info")),
            title: v.string(),
            description: v.string(),
            cardId: v.optional(v.id("creditCards")),
            plaidItemId: v.optional(v.string()),
            actionLabel: v.optional(v.string()),
            actionHref: v.optional(v.string()),
        }),
    ),
    async handler(ctx) {
        const viewer = ctx.viewerX();
        const alerts: Array<{
            id: string;
            type: "overdue" | "due_soon" | "sync_error" | "reauth_needed";
            severity: "critical" | "warning" | "info";
            title: string;
            description: string;
            cardId?: Id<"creditCards">;
            plaidItemId?: string;
            actionLabel?: string;
            actionHref?: string;
        }> = [];

        // Get Plaid items for sync status
        const userItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
            userId: viewer.externalId,
        });

        // Check for reauth/sync errors
        for (const item of userItems) {
            if (item.status === "needs_reauth" || item.status === "error") {
                alerts.push({
                    id: `item-${item._id}`,
                    type: item.status === "needs_reauth" ? "reauth_needed" : "sync_error",
                    severity: "warning",
                    title: `${item.institutionName || "Bank"} needs attention`,
                    description: item.status === "needs_reauth" ? "Please re-authenticate your connection" : "Sync failed. We'll retry automatically.",
                    plaidItemId: item._id,
                    actionLabel: item.status === "needs_reauth" ? "Reconnect" : undefined,
                    actionHref: item.status === "needs_reauth" ? `/settings/institutions/${item._id}` : undefined,
                });
            }
        }

        const activeItemIds = new Set(userItems.filter((item) => item.isActive !== false).map((item) => item._id));

        // Get credit cards
        const allCards = await ctx.table("creditCards", "by_user_active", (q) => q.eq("userId", viewer._id).eq("isActive", true)).map((card) => card.doc());

        const cards = allCards.filter((card) => !card.plaidItemId || activeItemIds.has(card.plaidItemId));

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        for (const card of cards) {
            // Check overdue
            if (card.isOverdue) {
                const daysOverdue = card.nextPaymentDueDate
                    ? Math.abs(Math.ceil((now.getTime() - new Date(card.nextPaymentDueDate).getTime()) / (1000 * 60 * 60 * 24)))
                    : 0;
                alerts.push({
                    id: `card-overdue-${card._id}`,
                    type: "overdue",
                    severity: "critical",
                    title: `${card.displayName} is overdue`,
                    description: `${daysOverdue} days past due. Minimum payment: ${formatMoneyFromDollars(card.minimumPaymentAmount ?? 0)}`,
                    cardId: card._id,
                    actionLabel: "View Card",
                    actionHref: `/credit-cards/${card._id}`,
                });
                continue;
            }

            // Check due within 48 hours
            if (card.nextPaymentDueDate) {
                const dueDate = new Date(card.nextPaymentDueDate);
                const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                if (hoursUntilDue > 0 && hoursUntilDue <= 48) {
                    alerts.push({
                        id: `card-due-soon-${card._id}`,
                        type: "due_soon",
                        severity: "warning",
                        title: `${card.displayName} due soon`,
                        description: `Due in ${Math.ceil(hoursUntilDue / 24)} day${Math.ceil(hoursUntilDue / 24) === 1 ? "" : "s"}. Minimum: ${formatMoneyFromDollars(card.minimumPaymentAmount ?? 0)}`,
                        cardId: card._id,
                        actionLabel: "View Card",
                        actionHref: `/credit-cards/${card._id}`,
                    });
                }
            }
        }

        // Sort: critical first, then warning, then info
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return alerts;
    },
});

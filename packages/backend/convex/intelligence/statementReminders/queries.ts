import { v } from "convex/values";
import { query } from "../../functions";

export const listForViewer = query({
    args: { maxDaysToClose: v.optional(v.number()) },
    returns: v.array(
        v.object({
            statementReminderId: v.id("statementReminders"),
            creditCardId: v.id("creditCards"),
            creditCardName: v.string(),
            statementClosingDate: v.string(),
            daysToClose: v.number(),
            nextPaymentDueDate: v.optional(v.string()),
            minimumPaymentAmount: v.optional(v.number()),
            lastStatementBalance: v.optional(v.number()),
        }),
    ),
    handler: async (ctx, { maxDaysToClose = 7 }) => {
        const viewer = ctx.viewerX();
        const rows = await ctx
            .table("statementReminders", "by_user_daysToClose", (q) =>
                q.eq("userId", viewer._id),
            );

        const result: Array<{
            statementReminderId: (typeof rows)[number]["_id"];
            creditCardId: (typeof rows)[number]["creditCardId"];
            creditCardName: string;
            statementClosingDate: string;
            daysToClose: number;
            nextPaymentDueDate?: string;
            minimumPaymentAmount?: number;
            lastStatementBalance?: number;
        }> = [];

        for (const row of rows) {
            if (row.daysToClose > maxDaysToClose) continue;
            const card = await ctx.table("creditCards").get(row.creditCardId);
            if (!card) continue;
            result.push({
                statementReminderId: row._id,
                creditCardId: row.creditCardId,
                creditCardName: card.displayName,
                statementClosingDate: row.statementClosingDate,
                daysToClose: row.daysToClose,
                nextPaymentDueDate: row.nextPaymentDueDate,
                minimumPaymentAmount: row.minimumPaymentAmount,
                lastStatementBalance: row.lastStatementBalance,
            });
        }
        return result;
    },
});

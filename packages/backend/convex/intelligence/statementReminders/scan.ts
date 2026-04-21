import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internalMutation, internalQuery } from "../../functions";
import { internal } from "../../_generated/api";
import { daysBetween, todayUtcYmd } from "../promoCountdowns/helpers";
import { nextOccurrenceOfDayInMonth } from "./helpers";

const MAX_DAYS_TO_CLOSE = 7;

export const scanAllInternal = internalAction({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        const userIds = await ctx.runQuery(
            internal.intelligence.statementReminders.scan
                .listUserIdsWithActiveCardsInternal,
            {},
        );
        for (const userId of userIds) {
            await ctx.scheduler.runAfter(
                0,
                internal.intelligence.statementReminders.scan
                    .scanForUserInternal,
                { userId },
            );
        }
        return null;
    },
});

export const listUserIdsWithActiveCardsInternal = internalQuery({
    args: {},
    returns: v.array(v.id("users")),
    handler: async (ctx) => {
        const cards = await ctx
            .table("creditCards")
            .filter((q) => q.eq(q.field("isActive"), true));
        const seen = new Set<string>();
        const result: Array<(typeof cards)[number]["userId"]> = [];
        for (const card of cards) {
            const key = card.userId as unknown as string;
            if (seen.has(key)) continue;
            seen.add(key);
            result.push(card.userId);
        }
        return result;
    },
});

export const scanForUserInternal = internalMutation({
    args: { userId: v.id("users") },
    returns: v.null(),
    handler: async (ctx, { userId }) => {
        const cards = await ctx
            .table("creditCards", "by_user_active", (q) =>
                q.eq("userId", userId).eq("isActive", true),
            );

        const today = todayUtcYmd();
        const keptCardIds = new Set<string>();

        for (const card of cards) {
            if (card.statementClosingDay == null) continue;
            const statementClosingDate = nextOccurrenceOfDayInMonth(
                card.statementClosingDay,
                today,
            );
            const daysToClose = daysBetween(today, statementClosingDate);
            if (daysToClose < 0 || daysToClose > MAX_DAYS_TO_CLOSE) continue;

            keptCardIds.add(card._id as unknown as string);

            const existing = await ctx
                .table("statementReminders", "by_creditCardId", (q) =>
                    q.eq("creditCardId", card._id),
                )
                .first();

            const fields = {
                creditCardId: card._id,
                userId: card.userId,
                statementClosingDate,
                daysToClose,
                nextPaymentDueDate: card.nextPaymentDueDate,
                minimumPaymentAmount: card.minimumPaymentAmount,
                lastStatementBalance: card.lastStatementBalance,
                lastRefreshedAt: Date.now(),
            };

            if (existing) {
                await existing.patch(fields);
            } else {
                await ctx.table("statementReminders").insert(fields);
            }
        }

        // Cleanup: delete reminders for cards now inactive, missing a
        // closing day, or outside the 7-day horizon.
        const existingReminders = await ctx
            .table("statementReminders", "by_user_daysToClose", (q) =>
                q.eq("userId", userId),
            );
        for (const reminder of existingReminders) {
            if (!keptCardIds.has(reminder.creditCardId as unknown as string)) {
                await reminder.delete();
            }
        }

        return null;
    },
});

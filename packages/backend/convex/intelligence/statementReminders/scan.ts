import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internalMutation, internalQuery } from "../../functions";
import { internal } from "../../_generated/api";
import { daysBetween, todayUtcYmd } from "../promoCountdowns/helpers";
import { nextOccurrenceOfDayInMonth } from "./helpers";

const MAX_DAYS_TO_CLOSE = 7;
const DISPATCH_CADENCES = [3, 1] as const;

function displayDollarsToCents(amountDollars: number | undefined): number {
    if (amountDollars == null) return 0;
    return Math.round(amountDollars * 100);
}

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
        // Group per cadence for W7 dispatch consolidation per contracts §7 /
        // specs/W6-intelligence.md §7: one dispatch call per user per cadence,
        // statements[] payload.
        const dispatchGroups = new Map<
            (typeof DISPATCH_CADENCES)[number],
            Array<{
                cardId: string;
                cardName: string;
                closingDate: string;
                projectedBalanceCents: number;
                minimumDueCents: number;
                dueDate: string;
            }>
        >();

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
                // creditCards liability values are display dollars after
                // denormalization; statementReminders preserves that unit.
                minimumPaymentAmount: card.minimumPaymentAmount,
                lastStatementBalance: card.lastStatementBalance,
                lastRefreshedAt: Date.now(),
            };

            if (existing) {
                await existing.patch(fields);
            } else {
                await ctx.table("statementReminders").insert(fields);
            }

            if ((DISPATCH_CADENCES as readonly number[]).includes(daysToClose)) {
                const cadence = daysToClose as (typeof DISPATCH_CADENCES)[number];
                const group = dispatchGroups.get(cadence) ?? [];
                group.push({
                    cardId: card._id as unknown as string,
                    cardName: card.displayName,
                    closingDate: statementClosingDate,
                    projectedBalanceCents: displayDollarsToCents(
                        card.lastStatementBalance,
                    ),
                    minimumDueCents: displayDollarsToCents(card.minimumPaymentAmount),
                    dueDate: card.nextPaymentDueDate ?? statementClosingDate,
                });
                dispatchGroups.set(cadence, group);
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

        // Dispatch to W7: one consolidated call per cadence (3d, 1d) with all
        // matching cards for this user. W7's dispatchStatementReminder derives
        // the idempotency key from (userId, "statement-closing", cadence,
        // cardIds, dateBucket), so repeated scans on the same UTC day are safe.
        for (const cadence of DISPATCH_CADENCES) {
            const statements = dispatchGroups.get(cadence);
            if (!statements || statements.length === 0) continue;
            await ctx.scheduler.runAfter(
                0,
                internal.email.dispatch.dispatchStatementReminder,
                { userId, cadence, statements },
            );
        }

        return null;
    },
});

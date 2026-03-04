/**
 * Statement Snapshot Actions
 *
 * Internal actions for automated statement snapshot generation.
 * The daily cron triggers generateDailySnapshots which creates
 * inferred snapshots for cards whose closing day matches today.
 */

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Generate daily statement snapshots
 *
 * Runs daily at 6 AM UTC (after the 2 AM Plaid sync so balances are fresh).
 * Finds all active credit cards whose statementClosingDay matches today's
 * day of month and creates an inferred snapshot for each.
 *
 * Idempotent — createInferredInternal checks for existing snapshots
 * on the same date before inserting.
 */
export const generateDailySnapshots = internalAction({
  handler: async (ctx) => {
    const today = new Date();
    const dayOfMonth = today.getDate();

    const cards = await ctx.runQuery(
      internal.statementSnapshots.internalQueries.getCardsWithClosingDay,
      { closingDay: dayOfMonth },
    );

    console.log(
      `📸 Statement snapshots: day ${dayOfMonth}, found ${cards.length} card(s) with matching closing day`,
    );

    let successCount = 0;
    let failureCount = 0;
    const statementDate = today.toISOString().split("T")[0];

    for (const card of cards) {
      try {
        await ctx.runMutation(
          internal.statementSnapshots.mutations.createInferredInternal,
          {
            creditCardId: card._id,
            statementDate,
            newBalance: card.currentBalance ?? 0,
            minimumPaymentDue: card.minimumPaymentAmount ?? 0,
            dueDate: card.nextPaymentDueDate ?? statementDate,
          },
        );
        successCount++;
      } catch (error) {
        failureCount++;
        console.error(`❌ Failed to create snapshot for card ${card._id}:`, error);
      }
    }

    console.log(`✅ Statement snapshots: ${successCount} created, ${failureCount} failed`);
  },
});

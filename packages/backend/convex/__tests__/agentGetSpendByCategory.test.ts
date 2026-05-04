/**
 * Regression tests for CROWDEV-346:
 *   `get_spend_by_category` agent tool was a W2.11 stub that always returned
 *   { ids: [], preview: { categories: [] } }, regardless of args. The user-
 *   facing SpendByCategoryChart rendered empty even when /transactions showed
 *   spend on the same day.
 *
 *   This test pins the now-real implementation to:
 *     - aggregate by `categoryPrimary` honoring user-edited `userCategory`
 *     - default to the last 30 days when no window is supplied
 *     - exclude hidden transactions
 *     - reject cross-user account spoofing
 *     - exclude refunds/income (negative amounts)
 *     - sort buckets descending and fold tail into "Other"
 */

import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { components, internal } from "../_generated/api";
import plaidSchema from "../../../convex-plaid/src/component/schema";

const modules = import.meta.glob("../**/*.ts");
const plaidModules = import.meta.glob("../../../convex-plaid/src/component/**/*.ts");

function setup() {
    const t = convexTest(schema, modules);
    t.registerComponent("plaid", plaidSchema as any, plaidModules);
    return t;
}

async function seedUser(t: any, externalId: string): Promise<string> {
    return await t.run(async (ctx: any) => {
        return await ctx.db.insert("users", {
            externalId,
            email: `${externalId}@example.test`,
        });
    });
}

async function seedPlaidItemAndAccount(
    t: any,
    userId: string,
    suffix = "",
): Promise<{ plaidItemId: string; accountId: string }> {
    const plaidItemId = (await t.mutation((components as any).plaid.private.createPlaidItem, {
        userId,
        itemId: `plaid_item_${userId}${suffix}`,
        accessToken: `access_token_${userId}${suffix}`,
        institutionId: "ins_test",
        institutionName: "Test Bank",
        products: ["transactions"],
        isActive: true,
        status: "active",
    })) as string;

    const accountId = `account_${userId}${suffix}`;
    await t.mutation((components as any).plaid.private.bulkUpsertAccounts, {
        userId,
        plaidItemId,
        accounts: [
            {
                accountId,
                name: "Test Checking",
                officialName: "Test Bank Checking",
                mask: "1234",
                type: "depository",
                subtype: "checking",
                balances: { current: 50_000, isoCurrencyCode: "USD" },
            },
        ],
    });

    return { plaidItemId, accountId };
}

async function seedTransactions(
    t: any,
    userId: string,
    plaidItemId: string,
    txns: Array<{
        transactionId: string;
        accountId: string;
        date: string;
        name: string;
        amount: number; // milliunits
        categoryPrimary?: string;
        pending?: boolean;
    }>,
) {
    await t.mutation((components as any).plaid.private.bulkUpsertTransactions, {
        userId,
        plaidItemId,
        added: txns.map((tx) => ({
            transactionId: tx.transactionId,
            accountId: tx.accountId,
            amount: tx.amount,
            isoCurrencyCode: "USD",
            date: tx.date,
            name: tx.name,
            categoryPrimary: tx.categoryPrimary,
            pending: tx.pending ?? false,
        })),
        modified: [],
        removed: [],
    });
}

const TODAY = new Date().toISOString().slice(0, 10);

describe("get_spend_by_category agent tool (CROWDEV-346)", () => {
    it("aggregates spend by categoryPrimary and sorts buckets descending", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sbc_a");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sbc_a");
        await seedTransactions(t, "user_sbc_a", plaidItemId, [
            { transactionId: "tx_food1", accountId, date: TODAY, name: "Whole Foods", amount: 50_000, categoryPrimary: "Food and Drink" },
            { transactionId: "tx_food2", accountId, date: TODAY, name: "Trader Joe's", amount: 30_000, categoryPrimary: "Food and Drink" },
            { transactionId: "tx_travel", accountId, date: TODAY, name: "Delta", amount: 100_000, categoryPrimary: "Travel" },
            { transactionId: "tx_misc", accountId, date: TODAY, name: "Random", amount: 10_000 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.getSpendByCategory.getSpendByCategory,
            { userId },
        )) as {
            ids: string[];
            preview: { buckets: Array<{ category: string; amount: number }>; totalAmount: number; summary: string };
            window: { from: string; to: string };
        };

        // Bug regression: previously this returned []. Now we expect
        // categories sorted by spend descending (in dollars).
        expect(out.preview.buckets).toEqual([
            { category: "Travel", amount: 100 },
            { category: "Food and Drink", amount: 80 },
            { category: "Uncategorized", amount: 10 },
        ]);
        expect(out.preview.totalAmount).toBe(190);
        expect(out.ids).toHaveLength(4);
        expect(out.window.to).toBe(TODAY);
    });

    it("honors explicit dateFrom/dateTo window and excludes out-of-window txs", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sbc_b");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sbc_b");
        await seedTransactions(t, "user_sbc_b", plaidItemId, [
            { transactionId: "tx_in", accountId, date: "2026-04-15", name: "In", amount: 25_000, categoryPrimary: "Shopping" },
            { transactionId: "tx_out", accountId, date: "2026-03-10", name: "Out", amount: 50_000, categoryPrimary: "Shopping" },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.getSpendByCategory.getSpendByCategory,
            { userId, dateFrom: "2026-04-01", dateTo: "2026-04-30" },
        )) as { preview: { buckets: Array<{ category: string; amount: number }>; totalAmount: number }; window: { from: string; to: string } };

        expect(out.preview.buckets).toEqual([{ category: "Shopping", amount: 25 }]);
        expect(out.preview.totalAmount).toBe(25);
        expect(out.window).toEqual({ from: "2026-04-01", to: "2026-04-30" });
    });

    it("excludes hidden-overlay transactions", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sbc_c");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sbc_c");
        await seedTransactions(t, "user_sbc_c", plaidItemId, [
            { transactionId: "tx_v", accountId, date: TODAY, name: "Visible", amount: 30_000, categoryPrimary: "Food and Drink" },
            { transactionId: "tx_h", accountId, date: TODAY, name: "Hidden", amount: 70_000, categoryPrimary: "Food and Drink" },
        ]);
        await t.run(async (ctx: any) => {
            await ctx.db.insert("transactionOverlays", {
                userId,
                plaidTransactionId: "tx_h",
                isHidden: true,
            });
        });

        const out = (await t.query(
            (internal as any).agent.tools.read.getSpendByCategory.getSpendByCategory,
            { userId },
        )) as { preview: { buckets: Array<{ category: string; amount: number }>; totalAmount: number }; ids: string[] };

        expect(out.preview.buckets).toEqual([{ category: "Food and Drink", amount: 30 }]);
        expect(out.preview.totalAmount).toBe(30);
        expect(out.ids).toEqual(["tx_v"]);
    });

    it("re-buckets transactions by user-edited userCategory overlay", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sbc_d");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sbc_d");
        await seedTransactions(t, "user_sbc_d", plaidItemId, [
            { transactionId: "tx_recat", accountId, date: TODAY, name: "Mystery", amount: 40_000, categoryPrimary: "Food and Drink" },
        ]);
        await t.run(async (ctx: any) => {
            await ctx.db.insert("transactionOverlays", {
                userId,
                plaidTransactionId: "tx_recat",
                userCategory: "Travel",
            });
        });

        const out = (await t.query(
            (internal as any).agent.tools.read.getSpendByCategory.getSpendByCategory,
            { userId },
        )) as { preview: { buckets: Array<{ category: string; amount: number }> } };

        // Overlay must override the upstream Plaid category.
        expect(out.preview.buckets).toEqual([{ category: "Travel", amount: 40 }]);
    });

    it("returns empty buckets for an empty window without crashing", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sbc_e");
        await seedPlaidItemAndAccount(t, "user_sbc_e");
        // No transactions seeded.

        const out = (await t.query(
            (internal as any).agent.tools.read.getSpendByCategory.getSpendByCategory,
            { userId, dateFrom: "2026-04-01", dateTo: "2026-04-30" },
        )) as { ids: string[]; preview: { buckets: unknown[]; totalAmount: number; summary: string } };

        expect(out.ids).toEqual([]);
        expect(out.preview.buckets).toEqual([]);
        expect(out.preview.totalAmount).toBe(0);
        expect(out.preview.summary).toMatch(/no spending/i);
    });

    it("excludes refunds/income (negative amounts) from spend totals", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sbc_f");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sbc_f");
        await seedTransactions(t, "user_sbc_f", plaidItemId, [
            { transactionId: "tx_buy", accountId, date: TODAY, name: "Buy", amount: 50_000, categoryPrimary: "Shopping" },
            { transactionId: "tx_refund", accountId, date: TODAY, name: "Refund", amount: -20_000, categoryPrimary: "Shopping" },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.getSpendByCategory.getSpendByCategory,
            { userId },
        )) as { preview: { buckets: Array<{ category: string; amount: number }>; totalAmount: number }; ids: string[] };

        // Only the positive purchase shows up; the refund is excluded from
        // spend (separately, the user's net change isn't a spend metric).
        expect(out.preview.buckets).toEqual([{ category: "Shopping", amount: 50 }]);
        expect(out.preview.totalAmount).toBe(50);
        expect(out.ids).toEqual(["tx_buy"]);
    });

    it("does not leak transactions from another user's account", async () => {
        const t = setup();
        const aId = await seedUser(t, "user_sbc_g");
        const bId = await seedUser(t, "user_sbc_h");

        const otherUserAccount = await seedPlaidItemAndAccount(t, "user_sbc_h");
        await seedTransactions(t, "user_sbc_h", otherUserAccount.plaidItemId, [
            { transactionId: "tx_secret", accountId: otherUserAccount.accountId, date: TODAY, name: "Secret", amount: 99_000, categoryPrimary: "Travel" },
        ]);

        // Viewer (a) has no accounts of their own; ensure they see nothing.
        const out = (await t.query(
            (internal as any).agent.tools.read.getSpendByCategory.getSpendByCategory,
            { userId: aId },
        )) as { ids: string[]; preview: { buckets: unknown[]; summary: string } };

        expect(out.ids).toEqual([]);
        expect(out.preview.buckets).toEqual([]);
        expect(out.preview.summary).toMatch(/no accounts/i);

        // Sanity: bId can see their own.
        const owner = (await t.query(
            (internal as any).agent.tools.read.getSpendByCategory.getSpendByCategory,
            { userId: bId },
        )) as { preview: { buckets: Array<{ category: string }> } };
        expect(owner.preview.buckets.map((b) => b.category)).toEqual(["Travel"]);
    });

    it("folds tail buckets beyond the cap into 'Other'", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sbc_i");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sbc_i");
        // Seed 10 distinct categories (cap is 8). Tail (cats 7..9) folds.
        await seedTransactions(
            t,
            "user_sbc_i",
            plaidItemId,
            Array.from({ length: 10 }, (_, i) => ({
                transactionId: `tx_${i}`,
                accountId,
                date: TODAY,
                name: `cat_${i}`,
                amount: (10 - i) * 1000, // descending amounts so cat_0 is biggest
                categoryPrimary: `cat_${i}`,
            })),
        );

        const out = (await t.query(
            (internal as any).agent.tools.read.getSpendByCategory.getSpendByCategory,
            { userId },
        )) as { preview: { buckets: Array<{ category: string; amount: number }>; totalAmount: number } };

        // 7 head buckets + 1 "Other" = 8 total.
        expect(out.preview.buckets).toHaveLength(8);
        expect(out.preview.buckets[7]!.category).toBe("Other");
        // The "Other" bucket sums the bottom 3 (cat_7 + cat_8 + cat_9) = 3+2+1 = 6 dollars.
        expect(out.preview.buckets[7]!.amount).toBe(6);
        // Total still equals the full sum (1+2+...+10 = 55 dollars).
        expect(out.preview.totalAmount).toBe(55);
    });
});

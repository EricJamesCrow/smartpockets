/**
 * Regression tests for CROWDEV-347:
 *   `get_spend_over_time` agent tool was a W2.11 stub that always returned
 *   { ids: [], preview: { series: [] } }, regardless of args. The user-facing
 *   SpendOverTimeChart rendered empty even when /transactions showed plenty
 *   of spend in the same window.
 *
 *   This test pins the now-real implementation to:
 *     - bucket by day / week / month based on the registry arg
 *     - default to the last 90 days bucketed weekly when args are omitted
 *     - exclude hidden transactions
 *     - reject cross-user account spoofing
 *     - exclude refunds (negative amounts)
 *     - honor user-edited userDate overlays for bucketing
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
    txns: Array<{ transactionId: string; accountId: string; date: string; name: string; amount: number; pending?: boolean }>,
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
            pending: tx.pending ?? false,
        })),
        modified: [],
        removed: [],
    });
}

describe("get_spend_over_time agent tool (CROWDEV-347)", () => {
    it("buckets by day correctly", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sot_a");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sot_a");
        await seedTransactions(t, "user_sot_a", plaidItemId, [
            { transactionId: "tx_d1a", accountId, date: "2026-04-10", name: "A1", amount: 25_000 },
            { transactionId: "tx_d1b", accountId, date: "2026-04-10", name: "A2", amount: 35_000 },
            { transactionId: "tx_d2", accountId, date: "2026-04-11", name: "B", amount: 50_000 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.getSpendOverTime.getSpendOverTime,
            { userId, dateFrom: "2026-04-01", dateTo: "2026-04-30", bucket: "day" },
        )) as {
            ids: string[];
            preview: { buckets: Array<{ from: string; to: string; amount: number }>; totalAmount: number };
            window: { from: string; to: string; granularity: string };
        };

        expect(out.preview.buckets).toEqual([
            { from: "2026-04-10", to: "2026-04-10", amount: 60 },
            { from: "2026-04-11", to: "2026-04-11", amount: 50 },
        ]);
        expect(out.preview.totalAmount).toBe(110);
        expect(out.window.granularity).toBe("day");
    });

    it("buckets by week (Sunday-anchored)", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sot_b");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sot_b");
        // 2026-04-12 is a Sunday; 2026-04-15 is a Wednesday.
        // Both are in the week 2026-04-12..2026-04-18.
        // 2026-04-19 is the next Sunday → its own week 2026-04-19..2026-04-25.
        await seedTransactions(t, "user_sot_b", plaidItemId, [
            { transactionId: "tx_w1a", accountId, date: "2026-04-12", name: "A", amount: 10_000 },
            { transactionId: "tx_w1b", accountId, date: "2026-04-15", name: "B", amount: 20_000 },
            { transactionId: "tx_w2", accountId, date: "2026-04-19", name: "C", amount: 30_000 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.getSpendOverTime.getSpendOverTime,
            { userId, dateFrom: "2026-04-01", dateTo: "2026-04-30", bucket: "week" },
        )) as { preview: { buckets: Array<{ from: string; to: string; amount: number }> } };

        expect(out.preview.buckets).toEqual([
            { from: "2026-04-12", to: "2026-04-18", amount: 30 },
            { from: "2026-04-19", to: "2026-04-25", amount: 30 },
        ]);
    });

    it("buckets by month correctly", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sot_c");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sot_c");
        await seedTransactions(t, "user_sot_c", plaidItemId, [
            { transactionId: "tx_m1a", accountId, date: "2026-03-05", name: "A", amount: 10_000 },
            { transactionId: "tx_m1b", accountId, date: "2026-03-25", name: "B", amount: 40_000 },
            { transactionId: "tx_m2", accountId, date: "2026-04-15", name: "C", amount: 60_000 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.getSpendOverTime.getSpendOverTime,
            { userId, dateFrom: "2026-03-01", dateTo: "2026-04-30", bucket: "month" },
        )) as { preview: { buckets: Array<{ from: string; to: string; amount: number }>; totalAmount: number } };

        expect(out.preview.buckets).toEqual([
            { from: "2026-03-01", to: "2026-03-31", amount: 50 },
            { from: "2026-04-01", to: "2026-04-30", amount: 60 },
        ]);
        expect(out.preview.totalAmount).toBe(110);
    });

    it("excludes hidden-overlay transactions", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sot_d");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sot_d");
        await seedTransactions(t, "user_sot_d", plaidItemId, [
            { transactionId: "tx_v", accountId, date: "2026-04-10", name: "V", amount: 30_000 },
            { transactionId: "tx_h", accountId, date: "2026-04-10", name: "H", amount: 70_000 },
        ]);
        await t.run(async (ctx: any) => {
            await ctx.db.insert("transactionOverlays", {
                userId,
                plaidTransactionId: "tx_h",
                isHidden: true,
            });
        });

        const out = (await t.query(
            (internal as any).agent.tools.read.getSpendOverTime.getSpendOverTime,
            { userId, dateFrom: "2026-04-01", dateTo: "2026-04-30", bucket: "day" },
        )) as { preview: { buckets: Array<{ amount: number }>; totalAmount: number }; ids: string[] };

        expect(out.preview.totalAmount).toBe(30);
        expect(out.ids).toEqual(["tx_v"]);
    });

    it("honors userDate overlay for bucket placement", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sot_e");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sot_e");
        // tx happened on Apr 10, but user moved it to Apr 17 (different week).
        await seedTransactions(t, "user_sot_e", plaidItemId, [
            { transactionId: "tx_moved", accountId, date: "2026-04-10", name: "Moved", amount: 50_000 },
        ]);
        await t.run(async (ctx: any) => {
            await ctx.db.insert("transactionOverlays", {
                userId,
                plaidTransactionId: "tx_moved",
                userDate: "2026-04-17",
            });
        });

        const out = (await t.query(
            (internal as any).agent.tools.read.getSpendOverTime.getSpendOverTime,
            { userId, dateFrom: "2026-04-01", dateTo: "2026-04-30", bucket: "day" },
        )) as { preview: { buckets: Array<{ from: string; amount: number }> } };

        // Bucketed on the overlay date, not the original date.
        expect(out.preview.buckets).toEqual([{ from: "2026-04-17", to: "2026-04-17", amount: 50 }]);
    });

    it("excludes refunds (negative amounts) from spend totals", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sot_f");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sot_f");
        await seedTransactions(t, "user_sot_f", plaidItemId, [
            { transactionId: "tx_buy", accountId, date: "2026-04-10", name: "Buy", amount: 80_000 },
            { transactionId: "tx_refund", accountId, date: "2026-04-10", name: "Refund", amount: -30_000 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.getSpendOverTime.getSpendOverTime,
            { userId, dateFrom: "2026-04-01", dateTo: "2026-04-30", bucket: "day" },
        )) as { preview: { buckets: Array<{ amount: number }>; totalAmount: number }; ids: string[] };

        // Only the spend (positive amount) shows up.
        expect(out.preview.buckets).toEqual([{ from: "2026-04-10", to: "2026-04-10", amount: 80 }]);
        expect(out.preview.totalAmount).toBe(80);
        expect(out.ids).toEqual(["tx_buy"]);
    });

    it("does not leak transactions from another user's account", async () => {
        const t = setup();
        const aId = await seedUser(t, "user_sot_g");
        const bId = await seedUser(t, "user_sot_h");

        const otherUserAccount = await seedPlaidItemAndAccount(t, "user_sot_h");
        await seedTransactions(t, "user_sot_h", otherUserAccount.plaidItemId, [
            { transactionId: "tx_secret", accountId: otherUserAccount.accountId, date: "2026-04-10", name: "Secret", amount: 99_000 },
        ]);

        // Viewer (a) has no accounts; ensure they see nothing.
        const out = (await t.query(
            (internal as any).agent.tools.read.getSpendOverTime.getSpendOverTime,
            { userId: aId, dateFrom: "2026-04-01", dateTo: "2026-04-30", bucket: "day" },
        )) as { ids: string[]; preview: { buckets: unknown[]; summary: string } };

        expect(out.ids).toEqual([]);
        expect(out.preview.buckets).toEqual([]);
        expect(out.preview.summary).toMatch(/no accounts/i);

        // Sanity: bId can see their own.
        const owner = (await t.query(
            (internal as any).agent.tools.read.getSpendOverTime.getSpendOverTime,
            { userId: bId, dateFrom: "2026-04-01", dateTo: "2026-04-30", bucket: "day" },
        )) as { preview: { buckets: Array<{ amount: number }> } };
        expect(owner.preview.buckets).toEqual([{ from: "2026-04-10", to: "2026-04-10", amount: 99 }]);
    });

    it("defaults bucket to week and window to last 90 days when args are omitted", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sot_i");
        await seedPlaidItemAndAccount(t, "user_sot_i");
        // No transactions in window, but the call must not crash and must
        // surface the defaults in the returned window.
        const out = (await t.query(
            (internal as any).agent.tools.read.getSpendOverTime.getSpendOverTime,
            { userId },
        )) as { window: { granularity: string; from: string; to: string }; preview: { buckets: unknown[] } };

        expect(out.window.granularity).toBe("week");
        expect(out.window.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(out.window.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        // From should be ~90 days before to.
        const fromMs = new Date(`${out.window.from}T00:00:00.000Z`).getTime();
        const toMs = new Date(`${out.window.to}T00:00:00.000Z`).getTime();
        const days = (toMs - fromMs) / (24 * 60 * 60 * 1000);
        expect(days).toBeGreaterThanOrEqual(89);
        expect(days).toBeLessThanOrEqual(91);
    });
});

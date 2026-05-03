/**
 * Regression test for CROWDEV-344:
 *   `list_transactions` agent tool returned empty results even when the user
 *   had hundreds of transactions visible on the /transactions page. The tool
 *   was a stub; this test pins the now-real implementation to:
 *     - return ids for the viewer's transactions
 *     - default to most-recent N when no window is supplied
 *     - honor an explicit `limit`
 *     - filter to a single account when accountId is supplied
 *     - reject access to another user's account
 *     - skip transactions the user has hidden via overlay
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

describe("list_transactions agent tool (CROWDEV-344)", () => {
    it("returns the viewer's transactions newest-first when no window is supplied", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_lt_a");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_lt_a");
        await seedTransactions(t, "user_lt_a", plaidItemId, [
            { transactionId: "tx_old", accountId, date: "2026-01-01", name: "Old", amount: 100 },
            { transactionId: "tx_mid", accountId, date: "2026-03-15", name: "Mid", amount: 200 },
            { transactionId: "tx_new", accountId, date: "2026-04-19", name: "New", amount: 300 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.listTransactions.listTransactions,
            { userId },
        )) as { ids: string[]; preview: { totalCount: number; summary: string }; window?: unknown };

        // Bug regression: previously this returned []. Now we expect all three,
        // newest first.
        expect(out.ids).toEqual(["tx_new", "tx_mid", "tx_old"]);
        expect(out.preview.totalCount).toBe(3);
        expect(out.window).toBeUndefined();
    });

    it("honors an explicit limit (the 'last ten' use case maps to limit=10)", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_lt_b");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_lt_b");
        const txns = Array.from({ length: 15 }, (_, i) => ({
            transactionId: `tx_${i.toString().padStart(2, "0")}`,
            accountId,
            date: `2026-04-${(i + 1).toString().padStart(2, "0")}`,
            name: `Tx ${i}`,
            amount: 100 + i,
        }));
        await seedTransactions(t, "user_lt_b", plaidItemId, txns);

        const out = (await t.query(
            (internal as any).agent.tools.read.listTransactions.listTransactions,
            { userId, limit: 10 },
        )) as { ids: string[]; preview: { totalCount: number } };

        expect(out.ids).toHaveLength(10);
        // Newest first: tx_14 (Apr 15) ... tx_05 (Apr 6).
        expect(out.ids[0]).toBe("tx_14");
        expect(out.ids[9]).toBe("tx_05");
        expect(out.preview.totalCount).toBe(15);
    });

    it("filters to a single account when accountId is supplied", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_lt_c");
        const a = await seedPlaidItemAndAccount(t, "user_lt_c", "_a");
        const b = await seedPlaidItemAndAccount(t, "user_lt_c", "_b");
        await seedTransactions(t, "user_lt_c", a.plaidItemId, [
            { transactionId: "tx_a1", accountId: a.accountId, date: "2026-04-10", name: "A1", amount: 10 },
        ]);
        await seedTransactions(t, "user_lt_c", b.plaidItemId, [
            { transactionId: "tx_b1", accountId: b.accountId, date: "2026-04-12", name: "B1", amount: 20 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.listTransactions.listTransactions,
            { userId, accountId: a.accountId },
        )) as { ids: string[] };

        expect(out.ids).toEqual(["tx_a1"]);
    });

    it("does not leak transactions from another user's account when accountId is spoofed", async () => {
        const t = setup();
        const aId = await seedUser(t, "user_lt_d");
        const bId = await seedUser(t, "user_lt_e");

        // Give viewer a (the spoofer) their own innocuous account so we
        // exercise the per-accountId ownership check rather than the
        // earlier "no accounts linked" early-return.
        const ownAccount = await seedPlaidItemAndAccount(t, "user_lt_d");
        await seedTransactions(t, "user_lt_d", ownAccount.plaidItemId, [
            { transactionId: "tx_own", accountId: ownAccount.accountId, date: "2026-04-09", name: "Own", amount: 7 },
        ]);

        const otherUserAccount = await seedPlaidItemAndAccount(t, "user_lt_e");
        await seedTransactions(t, "user_lt_e", otherUserAccount.plaidItemId, [
            { transactionId: "tx_secret", accountId: otherUserAccount.accountId, date: "2026-04-15", name: "Secret", amount: 99 },
        ]);

        const spoofed = (await t.query(
            (internal as any).agent.tools.read.listTransactions.listTransactions,
            { userId: aId, accountId: otherUserAccount.accountId },
        )) as { ids: string[]; preview: { summary: string } };

        // The viewer (a) does not own the spoofed accountId; refuse to surface it.
        expect(spoofed.ids).toEqual([]);
        expect(spoofed.preview.summary).toMatch(/not found/i);

        // Without spoofing, viewer sees only their own transactions.
        const own = (await t.query(
            (internal as any).agent.tools.read.listTransactions.listTransactions,
            { userId: aId },
        )) as { ids: string[] };
        expect(own.ids).toEqual(["tx_own"]);

        // Sanity: bId can see their own.
        const owner = (await t.query(
            (internal as any).agent.tools.read.listTransactions.listTransactions,
            { userId: bId },
        )) as { ids: string[] };
        expect(owner.ids).toEqual(["tx_secret"]);
    });

    it("hides transactions the user has marked hidden via overlay", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_lt_f");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_lt_f");
        await seedTransactions(t, "user_lt_f", plaidItemId, [
            { transactionId: "tx_visible", accountId, date: "2026-04-10", name: "Visible", amount: 10 },
            { transactionId: "tx_hidden", accountId, date: "2026-04-11", name: "Hidden", amount: 20 },
        ]);
        await t.run(async (ctx: any) => {
            await ctx.db.insert("transactionOverlays", {
                userId,
                plaidTransactionId: "tx_hidden",
                isHidden: true,
            });
        });

        const out = (await t.query(
            (internal as any).agent.tools.read.listTransactions.listTransactions,
            { userId },
        )) as { ids: string[] };

        expect(out.ids).toEqual(["tx_visible"]);
    });

    it("includes a window in the output when both dateFrom and dateTo are supplied", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_lt_g");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_lt_g");
        await seedTransactions(t, "user_lt_g", plaidItemId, [
            { transactionId: "tx_in", accountId, date: "2026-04-10", name: "In", amount: 10 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.listTransactions.listTransactions,
            { userId, dateFrom: "2026-04-01", dateTo: "2026-04-30" },
        )) as { ids: string[]; window?: { from: string; to: string } };

        expect(out.ids).toEqual(["tx_in"]);
        expect(out.window).toEqual({ from: "2026-04-01", to: "2026-04-30" });
    });
});

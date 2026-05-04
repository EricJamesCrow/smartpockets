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
 *
 * Also covers CROWDEV-365 (this issue):
 *   The tool must embed compact per-row snapshots in `rows` so the agent can
 *   reason about the transactions it returned (merchant, amount, date,
 *   category, mask) without making one `get_transaction_detail` call per ID.
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
        merchantName?: string;
        amount: number;
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
            merchantName: tx.merchantName,
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

    // ===== CROWDEV-365: agent rows snapshot =====

    it("embeds compact per-row snapshots so the agent can reason about results without a follow-up tool call", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_lt_h");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_lt_h");
        // amount in milliunits (= dollars * 1000); seed -12,500 = -$12.50.
        await seedTransactions(t, "user_lt_h", plaidItemId, [
            { transactionId: "tx_ebay", accountId, date: "2026-04-19", name: "EBAY*ABC123", merchantName: "eBay", amount: 12_500 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.listTransactions.listTransactions,
            { userId },
        )) as {
            ids: string[];
            rows: Array<{
                transactionId: string;
                date: string;
                merchantName: string;
                amount: number;
                displayAmount: number;
                amountFormatted: string;
                direction: "inflow" | "outflow";
                pending: boolean;
                accountMask?: string;
            }>;
        };

        expect(out.ids).toEqual(["tx_ebay"]);
        expect(out.rows).toHaveLength(1);
        expect(out.rows[0]).toMatchObject({
            transactionId: "tx_ebay",
            date: "2026-04-19",
            merchantName: "eBay",
            amount: 12.5, // Plaid convention: positive = outflow
            displayAmount: -12.5, // Human convention: negative = money out
            amountFormatted: "-$12.50", // Verbatim copy target for the model
            direction: "outflow",
            pending: false,
            accountMask: "1234", // from seedPlaidItemAndAccount mask
        });
    });

    it("inflows produce positive displayAmount + verbatim amountFormatted + 'inflow' direction (CROWDEV-369)", async () => {
        // Plaid convention: negative amount = inflow (refund / income / deposit).
        // The model must emit positive +$X.XX for inflows in user-facing text,
        // matching what the user sees in TransactionsTable. Even with
        // displayAmount in the row, Haiku has been observed overriding it
        // for rows with a strong "purchase" prior (eBay + General
        // Merchandise category). The verbatim `amountFormatted` string
        // and explicit `direction` label remove any reasoning step the
        // model could fail.
        const t = setup();
        const userId = await seedUser(t, "user_lt_inflow");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_lt_inflow");
        await seedTransactions(t, "user_lt_inflow", plaidItemId, [
            { transactionId: "tx_refund", accountId, date: "2026-05-03", name: "EBAY*REFUND", merchantName: "eBay", amount: -550_470 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.listTransactions.listTransactions,
            { userId },
        )) as { rows: Array<{ amount: number; displayAmount: number; amountFormatted: string; direction: string }> };

        expect(out.rows).toHaveLength(1);
        expect(out.rows[0]?.amount).toBe(-550.47); // Plaid: negative = inflow
        expect(out.rows[0]?.displayAmount).toBe(550.47); // Human: positive = money in
        expect(out.rows[0]?.amountFormatted).toBe("+$550.47"); // Verbatim copy target
        expect(out.rows[0]?.direction).toBe("inflow"); // Verb selector
    });

    it("zero displayAmount renders as +$0.00 with inflow direction (boundary)", async () => {
        // Edge case: a $0.00 transaction should render as +$0.00 (not
        // -$0.00). The `displayAmount >= 0` ternary makes zero an
        // "inflow" direction, which is fine — there's nothing semantic
        // about zero, and it matches IEEE 754 zero handling.
        const t = setup();
        const userId = await seedUser(t, "user_lt_zero");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_lt_zero");
        await seedTransactions(t, "user_lt_zero", plaidItemId, [
            { transactionId: "tx_zero", accountId, date: "2026-05-03", name: "AUTH HOLD", merchantName: "Hotel", amount: 0 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.listTransactions.listTransactions,
            { userId },
        )) as { rows: Array<{ amountFormatted: string; direction: string }> };

        expect(out.rows[0]?.amountFormatted).toBe("+$0.00");
        expect(out.rows[0]?.direction).toBe("inflow");
    });

    it("rows mirror overlay-corrected merchant name, date, and category", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_lt_i");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_lt_i");
        await seedTransactions(t, "user_lt_i", plaidItemId, [
            {
                transactionId: "tx_renamed",
                accountId,
                date: "2026-04-10",
                name: "AMZN MKTP US*A12B3CD",
                merchantName: undefined,
                amount: 7_777,
            },
        ]);
        await t.run(async (ctx: any) => {
            await ctx.db.insert("transactionOverlays", {
                userId,
                plaidTransactionId: "tx_renamed",
                userMerchantName: "Amazon",
                userDate: "2026-04-12",
                userCategoryDetailed: "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES",
            });
        });

        const out = (await t.query(
            (internal as any).agent.tools.read.listTransactions.listTransactions,
            { userId },
        )) as { rows: Array<{ merchantName: string; date: string; category?: string }> };

        expect(out.rows).toHaveLength(1);
        expect(out.rows[0]).toMatchObject({
            merchantName: "Amazon",
            date: "2026-04-12",
            category: "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES",
        });
    });

    it("caps embedded rows at 50 even when more transactions are returned via ids", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_lt_j");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_lt_j");
        // Seed 60 transactions and request limit=60 to force ids to grow
        // beyond the per-snapshot cap.
        const txns = Array.from({ length: 60 }, (_, i) => ({
            transactionId: `tx_${i.toString().padStart(2, "0")}`,
            accountId,
            // Spread dates over Mar 1 → Apr 29 so we have 60 distinct days
            // (2026-03-01 through 2026-04-29 inclusive = 60 days).
            date: (() => {
                const d = new Date(Date.UTC(2026, 2, 1));
                d.setUTCDate(d.getUTCDate() + i);
                return d.toISOString().slice(0, 10);
            })(),
            name: `Tx ${i}`,
            amount: 1_000 + i,
        }));
        await seedTransactions(t, "user_lt_j", plaidItemId, txns);

        const out = (await t.query(
            (internal as any).agent.tools.read.listTransactions.listTransactions,
            { userId, limit: 60 },
        )) as {
            ids: string[];
            rows: Array<{ transactionId: string }>;
            preview: { totalCount: number };
        };

        expect(out.ids).toHaveLength(60);
        expect(out.preview.totalCount).toBe(60);
        // Row cap holds even when ids are larger so the model sees a
        // bounded payload while preview.totalCount preserves the truth.
        expect(out.rows).toHaveLength(50);
    });

    it("returns an empty rows array when the viewer has no accounts linked", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_lt_k");

        const out = (await t.query(
            (internal as any).agent.tools.read.listTransactions.listTransactions,
            { userId },
        )) as { ids: string[]; rows: unknown[] };

        expect(out.ids).toEqual([]);
        expect(out.rows).toEqual([]);
    });
});

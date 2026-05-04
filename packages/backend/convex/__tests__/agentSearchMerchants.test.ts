/**
 * Regression tests for CROWDEV-348:
 *   `search_merchants` agent tool was a W2.11 stub that always returned
 *   { ids: [], preview: { merchants: [] } }. User questions like "Find all
 *   my Amazon charges" rendered empty raw-text payloads.
 *
 *   This test pins the now-real implementation to:
 *     - case-insensitive substring match against merchantName ?? name
 *     - apply transactionOverlays so user-edited merchant names match
 *     - exclude hidden transactions
 *     - reject cross-user account spoofing
 *     - honor optional date window and limit cap
 *
 * Also covers CROWDEV-365 (this issue):
 *   The tool must embed compact per-row snapshots in `rows` so the agent can
 *   answer follow-ups like "give me details for the eBay row" without an
 *   extra `get_transaction_detail` round-trip per ID.
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

const TODAY = new Date().toISOString().slice(0, 10);

describe("search_merchants agent tool (CROWDEV-348)", () => {
    it("matches merchantName case-insensitively (substring)", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sm_a");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sm_a");
        await seedTransactions(t, "user_sm_a", plaidItemId, [
            { transactionId: "tx_a1", accountId, date: TODAY, name: "AMZN MKTP US*A12B3CD", merchantName: "Amazon", amount: 25_000 },
            { transactionId: "tx_a2", accountId, date: TODAY, name: "AMAZON.COM*B45C6DE7", merchantName: "Amazon", amount: 35_000 },
            { transactionId: "tx_other", accountId, date: TODAY, name: "STARBUCKS", merchantName: "Starbucks", amount: 5_000 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.searchMerchants.searchMerchants,
            { userId, query: "amazon" },
        )) as {
            ids: string[];
            preview: { merchants: Array<{ name: string; count: number; totalAmount: number }>; summary: string };
        };

        expect(out.preview.merchants).toEqual([
            expect.objectContaining({ name: "Amazon", count: 2, totalAmount: 60 }),
        ]);
        expect([...out.ids].sort()).toEqual(["tx_a1", "tx_a2"]);
        expect(out.preview.summary).toMatch(/1 merchant matching "amazon"/i);
    });

    it("falls back to `name` when `merchantName` is absent", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sm_b");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sm_b");
        await seedTransactions(t, "user_sm_b", plaidItemId, [
            { transactionId: "tx_named", accountId, date: TODAY, name: "Whole Foods Market", amount: 25_000 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.searchMerchants.searchMerchants,
            { userId, query: "whole foods" },
        )) as { ids: string[]; preview: { merchants: Array<{ name: string }> } };

        expect(out.ids).toEqual(["tx_named"]);
        expect(out.preview.merchants[0]!.name).toBe("Whole Foods Market");
    });

    it("matches user-edited merchant names (overlay applied before search)", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sm_c");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sm_c");
        // Plaid says "AMZN MKTP" but user renamed to "Amazon Subscription".
        await seedTransactions(t, "user_sm_c", plaidItemId, [
            { transactionId: "tx_renamed", accountId, date: TODAY, name: "AMZN MKTP US*X1Y2Z3", amount: 99_000 },
        ]);
        await t.run(async (ctx: any) => {
            await ctx.db.insert("transactionOverlays", {
                userId,
                plaidTransactionId: "tx_renamed",
                userMerchantName: "Amazon Subscription",
            });
        });

        // Search "subscription" — only matches via the overlay; raw Plaid
        // name doesn't contain "subscription".
        const out = (await t.query(
            (internal as any).agent.tools.read.searchMerchants.searchMerchants,
            { userId, query: "subscription" },
        )) as { ids: string[]; preview: { merchants: Array<{ name: string }> } };

        expect(out.ids).toEqual(["tx_renamed"]);
        expect(out.preview.merchants[0]!.name).toBe("Amazon Subscription");
    });

    it("excludes hidden-overlay transactions", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sm_d");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sm_d");
        await seedTransactions(t, "user_sm_d", plaidItemId, [
            { transactionId: "tx_v", accountId, date: TODAY, name: "Visible Amazon", merchantName: "Amazon", amount: 10_000 },
            { transactionId: "tx_h", accountId, date: TODAY, name: "Hidden Amazon", merchantName: "Amazon", amount: 90_000 },
        ]);
        await t.run(async (ctx: any) => {
            await ctx.db.insert("transactionOverlays", {
                userId,
                plaidTransactionId: "tx_h",
                isHidden: true,
            });
        });

        const out = (await t.query(
            (internal as any).agent.tools.read.searchMerchants.searchMerchants,
            { userId, query: "amazon" },
        )) as { ids: string[]; preview: { merchants: Array<{ count: number; totalAmount: number }> } };

        // Only the visible Amazon shows up.
        expect(out.ids).toEqual(["tx_v"]);
        expect(out.preview.merchants[0]!.count).toBe(1);
        expect(out.preview.merchants[0]!.totalAmount).toBe(10);
    });

    it("honors optional date window (defaults excluded)", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sm_e");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sm_e");
        await seedTransactions(t, "user_sm_e", plaidItemId, [
            { transactionId: "tx_in", accountId, date: "2026-04-15", name: "Amazon In", merchantName: "Amazon", amount: 25_000 },
            { transactionId: "tx_out", accountId, date: "2026-03-15", name: "Amazon Out", merchantName: "Amazon", amount: 50_000 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.searchMerchants.searchMerchants,
            { userId, query: "amazon", dateFrom: "2026-04-01", dateTo: "2026-04-30" },
        )) as { ids: string[]; preview: { merchants: Array<{ count: number; totalAmount: number }> } };

        expect(out.ids).toEqual(["tx_in"]);
        expect(out.preview.merchants[0]!.count).toBe(1);
        expect(out.preview.merchants[0]!.totalAmount).toBe(25);
    });

    it("honors limit cap (registry max 50; default 10)", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sm_f");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sm_f");
        // 12 distinct merchants all containing "shop" in their names.
        const txns = Array.from({ length: 12 }, (_, i) => ({
            transactionId: `tx_${i}`,
            accountId,
            date: TODAY,
            name: `Shop ${i}`,
            merchantName: `Shop ${i}`,
            amount: 1_000 * (i + 1),
        }));
        await seedTransactions(t, "user_sm_f", plaidItemId, txns);

        const out = (await t.query(
            (internal as any).agent.tools.read.searchMerchants.searchMerchants,
            { userId, query: "shop", limit: 5 },
        )) as { preview: { merchants: Array<{ name: string }>; summary: string } };

        // 5 returned (limit), but summary says total merchants matching = 12.
        expect(out.preview.merchants).toHaveLength(5);
        expect(out.preview.summary).toMatch(/12 merchants matching "shop"/i);
    });

    it("returns clean empty payload for an empty query", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sm_g");
        await seedPlaidItemAndAccount(t, "user_sm_g");

        const out = (await t.query(
            (internal as any).agent.tools.read.searchMerchants.searchMerchants,
            { userId, query: "   " },
        )) as { ids: string[]; preview: { merchants: unknown[]; summary: string } };

        expect(out.ids).toEqual([]);
        expect(out.preview.merchants).toEqual([]);
        expect(out.preview.summary).toMatch(/empty query/i);
    });

    it("does not leak transactions from another user's account", async () => {
        const t = setup();
        const aId = await seedUser(t, "user_sm_h");
        const bId = await seedUser(t, "user_sm_i");

        const otherUserAccount = await seedPlaidItemAndAccount(t, "user_sm_i");
        await seedTransactions(t, "user_sm_i", otherUserAccount.plaidItemId, [
            { transactionId: "tx_secret", accountId: otherUserAccount.accountId, date: TODAY, name: "Secret Amazon", merchantName: "Amazon", amount: 99_000 },
        ]);

        // Viewer (a) has no accounts; ensure they see nothing.
        const out = (await t.query(
            (internal as any).agent.tools.read.searchMerchants.searchMerchants,
            { userId: aId, query: "amazon" },
        )) as { ids: string[]; preview: { merchants: unknown[]; summary: string } };

        expect(out.ids).toEqual([]);
        expect(out.preview.merchants).toEqual([]);
        expect(out.preview.summary).toMatch(/no accounts/i);

        // Sanity: bId can see their own.
        const owner = (await t.query(
            (internal as any).agent.tools.read.searchMerchants.searchMerchants,
            { userId: bId, query: "amazon" },
        )) as { ids: string[]; preview: { merchants: Array<{ name: string }> } };
        expect(owner.ids).toEqual(["tx_secret"]);
    });

    // ===== CROWDEV-365: agent rows snapshot =====

    it("embeds compact per-row snapshots so the agent can answer 'give me details for the eBay row' without another tool call", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sm_j");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sm_j");
        // amount in milliunits → $42.99 outflow
        await seedTransactions(t, "user_sm_j", plaidItemId, [
            { transactionId: "tx_ebay_a", accountId, date: TODAY, name: "EBAY *ABC123", merchantName: "eBay", amount: 42_990 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.searchMerchants.searchMerchants,
            { userId, query: "ebay" },
        )) as {
            ids: string[];
            rows: Array<{
                transactionId: string;
                merchantName: string;
                amount: number;
                displayAmount: number;
                date: string;
                pending: boolean;
                accountMask?: string;
            }>;
        };

        expect(out.ids).toEqual(["tx_ebay_a"]);
        expect(out.rows).toHaveLength(1);
        expect(out.rows[0]).toMatchObject({
            transactionId: "tx_ebay_a",
            merchantName: "eBay",
            amount: 42.99, // Plaid convention: positive = outflow
            displayAmount: -42.99, // Human convention: negative = money out
            date: TODAY,
            pending: false,
            accountMask: "1234",
        });
    });

    it("rows are sorted newest-first and capped at 50 even when ids exceed the cap", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sm_k");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sm_k");
        // 60 Amazon transactions over 60 distinct days within the default
        // 90-day search window. ids should be 60; rows should cap at 50
        // and start with the newest.
        const txns = Array.from({ length: 60 }, (_, i) => ({
            transactionId: `tx_amzn_${i.toString().padStart(2, "0")}`,
            accountId,
            // i=0 → 59 days ago, i=59 → today
            date: (() => {
                const d = new Date();
                d.setUTCDate(d.getUTCDate() - (59 - i));
                return d.toISOString().slice(0, 10);
            })(),
            name: `Amazon ${i}`,
            merchantName: "Amazon",
            amount: 1_000 + i,
        }));
        await seedTransactions(t, "user_sm_k", plaidItemId, txns);

        const out = (await t.query(
            (internal as any).agent.tools.read.searchMerchants.searchMerchants,
            { userId, query: "amazon" },
        )) as {
            ids: string[];
            rows: Array<{ transactionId: string; date: string }>;
            preview: { merchants: Array<{ count: number }> };
        };

        // All 60 matched ids are surfaced (count is the source of truth).
        expect(out.ids).toHaveLength(60);
        expect(out.preview.merchants[0]!.count).toBe(60);
        // Rows are capped to keep the agent payload small.
        expect(out.rows).toHaveLength(50);
        // Newest first: row[0] should be the most recent (i=59 → today).
        expect(out.rows[0]!.transactionId).toBe("tx_amzn_59");
    });

    it("returns an empty rows array on a zero-match query", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_sm_l");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_sm_l");
        await seedTransactions(t, "user_sm_l", plaidItemId, [
            { transactionId: "tx_sb", accountId, date: TODAY, name: "Starbucks", merchantName: "Starbucks", amount: 5_000 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.searchMerchants.searchMerchants,
            { userId, query: "ebay" },
        )) as { ids: string[]; rows: unknown[] };

        expect(out.ids).toEqual([]);
        expect(out.rows).toEqual([]);
    });
});

/**
 * Regression tests for CROWDEV-365:
 *   `get_transaction_detail` agent tool returned only `{ ids, preview:
 *   { summary } }` — the agent never received the actual transaction data,
 *   so it told users "the API is only returning the IDs and not the full
 *   transaction details." This pins the now-real implementation to embed
 *   a compact `row` snapshot the agent can reason about.
 *
 * Auth boundary, overlay-respecting fields, and the not-found path are
 * also covered to guard against regressions in the trust layer.
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

describe("get_transaction_detail agent tool (CROWDEV-365)", () => {
    it("returns a compact row snapshot the agent can reason about", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_gtd_a");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_gtd_a");
        // amount in milliunits → $42.99 outflow
        await seedTransactions(t, "user_gtd_a", plaidItemId, [
            { transactionId: "tx_ebay", accountId, date: "2026-04-19", name: "EBAY *ABC123", merchantName: "eBay", amount: 42_990 },
        ]);

        const out = (await t.query(
            (internal as any).agent.tools.read.getTransactionDetail.getTransactionDetail,
            { userId, plaidTransactionId: "tx_ebay" },
        )) as {
            ids: string[];
            row: {
                transactionId: string;
                merchantName: string;
                amount: number;
                date: string;
                pending: boolean;
                accountMask?: string;
            } | null;
            preview: { summary: string };
        };

        expect(out.ids).toEqual(["tx_ebay"]);
        expect(out.preview.summary).toMatch(/located/i);
        expect(out.row).toMatchObject({
            transactionId: "tx_ebay",
            merchantName: "eBay",
            amount: 42.99,
            date: "2026-04-19",
            pending: false,
            accountMask: "1234",
        });
    });

    it("includes notes and isReviewed when the user has annotated the transaction", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_gtd_b");
        const { plaidItemId, accountId } = await seedPlaidItemAndAccount(t, "user_gtd_b");
        await seedTransactions(t, "user_gtd_b", plaidItemId, [
            { transactionId: "tx_dinner", accountId, date: "2026-04-15", name: "RESTAURANT XYZ", merchantName: "Restaurant XYZ", amount: 50_000 },
        ]);
        await t.run(async (ctx: any) => {
            await ctx.db.insert("transactionOverlays", {
                userId,
                plaidTransactionId: "tx_dinner",
                notes: "Birthday dinner with Sarah",
                isReviewed: true,
                userMerchantName: "The Restaurant",
            });
        });

        const out = (await t.query(
            (internal as any).agent.tools.read.getTransactionDetail.getTransactionDetail,
            { userId, plaidTransactionId: "tx_dinner" },
        )) as {
            row: {
                merchantName: string;
                notes?: string;
                isReviewed?: boolean;
            } | null;
        };

        expect(out.row).toMatchObject({
            merchantName: "The Restaurant",
            notes: "Birthday dinner with Sarah",
            isReviewed: true,
        });
    });

    it("returns row=null and a not-found summary when the transaction does not exist", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_gtd_c");
        await seedPlaidItemAndAccount(t, "user_gtd_c");

        const out = (await t.query(
            (internal as any).agent.tools.read.getTransactionDetail.getTransactionDetail,
            { userId, plaidTransactionId: "tx_does_not_exist" },
        )) as { ids: string[]; row: unknown; preview: { summary: string } };

        expect(out.ids).toEqual([]);
        expect(out.row).toBeNull();
        expect(out.preview.summary).toMatch(/not found/i);
    });

    it("does not leak another user's transaction even if the id is guessed", async () => {
        const t = setup();
        const aId = await seedUser(t, "user_gtd_d");
        const bId = await seedUser(t, "user_gtd_e");

        // Give viewer a (the spoofer) their own innocuous account so they
        // pass the "no accounts" early-return and exercise the per-account
        // ownership check.
        await seedPlaidItemAndAccount(t, "user_gtd_d");

        const otherUserAccount = await seedPlaidItemAndAccount(t, "user_gtd_e");
        await seedTransactions(t, "user_gtd_e", otherUserAccount.plaidItemId, [
            { transactionId: "tx_secret", accountId: otherUserAccount.accountId, date: "2026-04-01", name: "Secret", amount: 99_000 },
        ]);

        // Viewer (a) tries to drill into b's transaction id.
        const spoofed = (await t.query(
            (internal as any).agent.tools.read.getTransactionDetail.getTransactionDetail,
            { userId: aId, plaidTransactionId: "tx_secret" },
        )) as { ids: string[]; row: unknown; preview: { summary: string } };

        expect(spoofed.ids).toEqual([]);
        expect(spoofed.row).toBeNull();
        expect(spoofed.preview.summary).toMatch(/not found/i);

        // Sanity: bId can fetch their own.
        const owner = (await t.query(
            (internal as any).agent.tools.read.getTransactionDetail.getTransactionDetail,
            { userId: bId, plaidTransactionId: "tx_secret" },
        )) as { ids: string[]; row: { transactionId: string } | null };
        expect(owner.ids).toEqual(["tx_secret"]);
        expect(owner.row?.transactionId).toBe("tx_secret");
    });
});

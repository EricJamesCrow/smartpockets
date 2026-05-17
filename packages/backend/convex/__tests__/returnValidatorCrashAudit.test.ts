import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api, components } from "../_generated/api";
import plaidSchema from "../../../convex-plaid/src/component/schema";

const modules = import.meta.glob("../**/*.ts");
const plaidModules = import.meta.glob(
  "../../../convex-plaid/src/component/**/*.ts",
);

const USER_A_IDENTITY = { subject: "user_test_a", issuer: "test" };
const USER_B_IDENTITY = { subject: "user_test_b", issuer: "test" };

function setup() {
  const t = convexTest(schema, modules);
  t.registerComponent("plaid", plaidSchema as any, plaidModules);
  return t;
}

async function seedUser(
  // biome-ignore lint/suspicious/noExplicitAny: convex-test ctx
  t: any,
  externalId: string,
) {
  return await t.run(async (ctx: any) => {
    return await ctx.db.insert("users", {
      externalId,
      email: `${externalId}@example.test`,
    });
  });
}

async function seedPlaidItem(
  // biome-ignore lint/suspicious/noExplicitAny: convex-test ctx
  t: any,
  userId: string,
) {
  return await t.mutation(
    (components as any).plaid.private.createPlaidItem,
    {
      userId,
      itemId: `plaid_item_${userId}`,
      accessToken: `access_token_${userId}`,
      institutionId: "ins_test",
      institutionName: "Test Bank",
      products: ["transactions", "liabilities"],
      isActive: true,
      status: "active",
    },
  );
}

async function seedPlaidAccount(
  // biome-ignore lint/suspicious/noExplicitAny: convex-test ctx
  t: any,
  userId: string,
  plaidItemId: string,
  accountId = `account_${userId}`,
) {
  return await t.mutation(
    (components as any).plaid.private.bulkUpsertAccounts,
    {
      userId,
      plaidItemId,
      accounts: [
        {
          accountId,
          name: "Test Credit Card",
          officialName: "Test Bank Credit Card",
          mask: "1234",
          type: "credit",
          subtype: "credit card",
          balances: {
            current: 123_450,
            limit: 1_000_000,
            isoCurrencyCode: "USD",
          },
        },
      ],
    },
  );
}

async function seedPlaidTransaction(
  // biome-ignore lint/suspicious/noExplicitAny: convex-test ctx
  t: any,
  userId: string,
  plaidItemId: string,
  accountId: string,
  transactionId = `tx_${userId}`,
) {
  return await t.mutation(
    (components as any).plaid.private.bulkUpsertTransactions,
    {
      userId,
      plaidItemId,
      added: [
        {
          accountId,
          transactionId,
          amount: 12_340,
          isoCurrencyCode: "USD",
          date: "2026-04-28",
          name: "Test Merchant",
          pending: false,
        },
      ],
      modified: [],
      removed: [],
    },
  );
}

async function seedCreditCardForPlaidItem(
  // biome-ignore lint/suspicious/noExplicitAny: convex-test ctx
  t: any,
  userId: any,
  plaidItemId: string,
) {
  return await t.run(async (ctx: any) => {
    return await ctx.db.insert("creditCards", {
      userId,
      plaidItemId,
      accountId: `card_account_${plaidItemId}`,
      accountName: "Test Credit Card",
      displayName: "Test Credit Card",
      isOverdue: false,
      isLocked: false,
      isAutoPay: false,
      isActive: true,
    });
  });
}

describe("strict return-validator crash audit", () => {
  it("serializes Plaid component item rows before returning them to institution pages", async () => {
    const t = setup();
    await seedUser(t, USER_A_IDENTITY.subject);
    await seedPlaidItem(t, USER_A_IDENTITY.subject);

    const rows = await t
      .withIdentity(USER_A_IDENTITY)
      .query(api.items.queries.getItemsForViewer, {});

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: USER_A_IDENTITY.subject,
      itemId: `plaid_item_${USER_A_IDENTITY.subject}`,
      institutionName: "Test Bank",
      products: ["transactions", "liabilities"],
      status: "active",
    });
    expect(rows[0]).not.toHaveProperty("_creationTime");
    expect(rows[0]).not.toHaveProperty("activatedAt");
    expect(rows[0]).not.toHaveProperty("errorCode");
    expect(rows[0]).not.toHaveProperty("newAccountsAvailableAt");
  });

  it("rejects spoofed userId access on the legacy item query", async () => {
    const t = setup();
    await seedUser(t, USER_A_IDENTITY.subject);
    await seedUser(t, USER_B_IDENTITY.subject);
    await seedPlaidItem(t, USER_B_IDENTITY.subject);

    await expect(
      t.withIdentity(USER_A_IDENTITY).query(api.items.queries.getItemsByUserId, {
        userId: USER_B_IDENTITY.subject,
      }),
    ).rejects.toThrow(/Not authorized/);
  });

  it("rejects deleting another user's institution item", async () => {
    const t = setup();
    await seedUser(t, USER_A_IDENTITY.subject);
    const userBId = await seedUser(t, USER_B_IDENTITY.subject);
    const otherItemId = await seedPlaidItem(t, USER_B_IDENTITY.subject);
    await seedCreditCardForPlaidItem(t, userBId, otherItemId);

    await expect(
      t.withIdentity(USER_A_IDENTITY).mutation(api.items.mutations.deletePlaidItem, {
        plaidItemId: otherItemId,
      }),
    ).rejects.toThrow(/Plaid item not found/);

    const remainingCards = await t.run(async (ctx: any) => {
      return await ctx.db
        .query("creditCards")
        .withIndex("by_plaidItemId", (q: any) => q.eq("plaidItemId", otherItemId))
        .collect();
    });
    const item = await t.query((components as any).plaid.public.getItem, {
      plaidItemId: otherItemId,
    });

    expect(remainingCards).toHaveLength(1);
    expect(item).toMatchObject({
      userId: USER_B_IDENTITY.subject,
      status: "active",
    });
  });

  it("allows a viewer to delete their own institution item app data", async () => {
    const t = setup();
    const userAId = await seedUser(t, USER_A_IDENTITY.subject);
    const ownItemId = await seedPlaidItem(t, USER_A_IDENTITY.subject);
    await seedCreditCardForPlaidItem(t, userAId, ownItemId);

    const result = await t
      .withIdentity(USER_A_IDENTITY)
      .mutation(api.items.mutations.deletePlaidItem, {
        plaidItemId: ownItemId,
      });

    const remainingCards = await t.run(async (ctx: any) => {
      return await ctx.db
        .query("creditCards")
        .withIndex("by_plaidItemId", (q: any) => q.eq("plaidItemId", ownItemId))
        .collect();
    });
    const item = await t.query((components as any).plaid.public.getItem, {
      plaidItemId: ownItemId,
    });

    expect(result).toEqual({
      deleted: {
        plaidItem: 1,
        creditCards: 1,
      },
    });
    expect(remainingCards).toHaveLength(0);
    expect(item).toMatchObject({
      userId: USER_A_IDENTITY.subject,
      status: "deleting",
    });
  });

  it("does not return accounts for another user's institution item", async () => {
    const t = setup();
    await seedUser(t, USER_A_IDENTITY.subject);
    await seedUser(t, USER_B_IDENTITY.subject);
    const otherItemId = await seedPlaidItem(t, USER_B_IDENTITY.subject);
    await seedPlaidAccount(t, USER_B_IDENTITY.subject, otherItemId);

    const rows = await t
      .withIdentity(USER_A_IDENTITY)
      .query(api.plaidComponent.getAccountsForViewerItem, {
        plaidItemId: otherItemId,
      });

    expect(rows).toEqual([]);
  });

  it("derives Plaid account lookups from the active viewer", async () => {
    const t = setup();
    await seedUser(t, USER_A_IDENTITY.subject);
    await seedUser(t, USER_B_IDENTITY.subject);
    const viewerItemId = await seedPlaidItem(t, USER_A_IDENTITY.subject);
    const otherItemId = await seedPlaidItem(t, USER_B_IDENTITY.subject);
    await seedPlaidAccount(t, USER_A_IDENTITY.subject, viewerItemId);
    await seedPlaidAccount(t, USER_B_IDENTITY.subject, otherItemId);

    const rows = await t
      .withIdentity(USER_A_IDENTITY)
      .query(api.plaidComponent.getAccountsByUserId, {});

    expect(rows.map((row) => row.accountId)).toEqual([
      `account_${USER_A_IDENTITY.subject}`,
    ]);

    await expect(
      t.withIdentity(USER_A_IDENTITY).query(api.plaidComponent.getAccountsByUserId, {
        userId: USER_B_IDENTITY.subject,
      }),
    ).rejects.toThrow(/Not authorized/);

    await expect(
      t.withIdentity(USER_A_IDENTITY).query(api.plaidComponent.getLiabilitiesByUserId, {
        userId: USER_B_IDENTITY.subject,
      }),
    ).rejects.toThrow(/Not authorized/);
  });

  it("does not return transactions for another user's account", async () => {
    const t = setup();
    await seedUser(t, USER_A_IDENTITY.subject);
    await seedUser(t, USER_B_IDENTITY.subject);
    const otherItemId = await seedPlaidItem(t, USER_B_IDENTITY.subject);
    await seedPlaidAccount(t, USER_B_IDENTITY.subject, otherItemId);
    await seedPlaidTransaction(
      t,
      USER_B_IDENTITY.subject,
      otherItemId,
      `account_${USER_B_IDENTITY.subject}`,
    );

    await expect(
      t.withIdentity(USER_A_IDENTITY).query(api.transactions.queries.getTransactionsByAccountId, {
        accountId: `account_${USER_B_IDENTITY.subject}`,
      }),
    ).rejects.toThrow(/Unauthorized/);
  });

  it("filters same-accountId transaction rows to viewer-owned Plaid items", async () => {
    const t = setup();
    await seedUser(t, USER_A_IDENTITY.subject);
    await seedUser(t, USER_B_IDENTITY.subject);
    const viewerItemId = await seedPlaidItem(t, USER_A_IDENTITY.subject);
    const otherItemId = await seedPlaidItem(t, USER_B_IDENTITY.subject);
    const sharedAccountId = "shared_account";
    await seedPlaidAccount(t, USER_A_IDENTITY.subject, viewerItemId, sharedAccountId);
    await seedPlaidAccount(t, USER_B_IDENTITY.subject, otherItemId, sharedAccountId);
    await seedPlaidTransaction(
      t,
      USER_A_IDENTITY.subject,
      viewerItemId,
      sharedAccountId,
      "tx_viewer",
    );
    await seedPlaidTransaction(
      t,
      USER_B_IDENTITY.subject,
      otherItemId,
      sharedAccountId,
      "tx_other",
    );

    const rows = await t
      .withIdentity(USER_A_IDENTITY)
      .query(api.transactions.queries.getTransactionsByAccountId, {
        accountId: sharedAccountId,
      });

    expect(rows.map((row) => row.transactionId)).toEqual(["tx_viewer"]);
  });

  it("rejects public Plaid sync actions for another user's institution item before calling Plaid", async () => {
    const t = setup();
    await seedUser(t, USER_A_IDENTITY.subject);
    await seedUser(t, USER_B_IDENTITY.subject);
    const otherItemId = await seedPlaidItem(t, USER_B_IDENTITY.subject);

    await expect(
      t.withIdentity(USER_A_IDENTITY).action(api.plaidComponent.fetchAccountsAction, {
        plaidItemId: otherItemId,
      }),
    ).rejects.toThrow(/unauthorized/i);
  });

  it("serializes transaction overlays with extra Ent fields and detailed category", async () => {
    const t = setup();
    const userId = await seedUser(t, USER_A_IDENTITY.subject);
    await t.run(async (ctx: any) => {
      await ctx.db.insert("transactionOverlays", {
        userId,
        plaidTransactionId: "tx_test_1",
        isReviewed: true,
        reviewedAt: 1710000000000,
        isHidden: false,
        notes: "Needs follow-up",
        userCategory: "FOOD_AND_DRINK",
        userCategoryDetailed: "FOOD_AND_DRINK_RESTAURANT",
        userDate: "2026-04-28",
        userMerchantName: "Test Cafe",
        userTime: "12:30",
      });
    });

    const overlay = await t
      .withIdentity(USER_A_IDENTITY)
      .query(api.transactionOverlays.queries.getByTransactionId, {
        plaidTransactionId: "tx_test_1",
      });

    expect(overlay).toEqual({
      plaidTransactionId: "tx_test_1",
      isReviewed: true,
      reviewedAt: 1710000000000,
      isHidden: false,
      notes: "Needs follow-up",
      userCategory: "FOOD_AND_DRINK",
      userCategoryDetailed: "FOOD_AND_DRINK_RESTAURANT",
      userDate: "2026-04-28",
      userMerchantName: "Test Cafe",
      userTime: "12:30",
    });
    expect(overlay).not.toHaveProperty("_id");
    expect(overlay).not.toHaveProperty("_creationTime");
    expect(overlay).not.toHaveProperty("userId");
  });
});

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
) {
  return await t.mutation(
    (components as any).plaid.private.bulkUpsertAccounts,
    {
      userId,
      plaidItemId,
      accounts: [
        {
          accountId: `account_${userId}`,
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

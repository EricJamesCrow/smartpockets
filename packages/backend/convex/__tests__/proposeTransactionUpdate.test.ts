/**
 * W5.5 propose_transaction_update + propose_bulk_transaction_update
 * executor and reversal unit tests (ownership + happy path).
 */

import { describe, expect, it } from "vitest";
import "../agent/tools/propose/proposeTransactionUpdate";
import {
  resolveBulkTransactionIds,
  validateBulkFilter,
} from "../agent/tools/propose/proposeBulkTransactionUpdate";
import {
  getReversalHandler,
  getToolExecutor,
} from "../agent/writeTool";

type Overlay = {
  _id: string;
  userId: string;
  plaidTransactionId: string;
  userCategory?: string;
  userCategoryDetailed?: string;
  userDate?: string;
  userMerchantName?: string;
  userTime?: string;
  notes?: string;
  isHidden?: boolean;
  isReviewed?: boolean;
};

type RawTransaction = {
  transactionId: string;
  accountId: string;
  amount: number;
  date: string;
  name: string;
  merchantName?: string;
  pending: boolean;
  categoryDetailed?: string;
  enrichmentData?: {
    counterpartyName?: string;
  };
};

function makeCtx(opts: {
  viewerId: string;
  overlays: Overlay[];
}) {
  const store = new Map<string, Overlay>(
    opts.overlays.map((o) => [o._id, { ...o }]),
  );
  let nextId = 1000;

  const rowHandle = (id: string) => {
    const proxy = {
      _id: id,
      get userId() {
        return store.get(id)!.userId;
      },
      patch: async (p: Partial<Overlay>) => {
        const prev = store.get(id);
        if (!prev) throw new Error("missing row");
        store.set(id, { ...prev, ...p });
      },
      delete: async () => {
        store.delete(id);
      },
    };
    return proxy;
  };

  const ctx = {
    viewerX: () => ({ _id: opts.viewerId }),
    table: (name: string, _idx?: string, q?: (qb: any) => any) => {
      if (name !== "transactionOverlays") {
        throw new Error("unexpected table " + name);
      }
      if (q) {
        let userId: string | undefined;
        let plaidTransactionId: string | undefined;
        const qb = {
          eq: (field: string, val: any) => {
            if (field === "userId") userId = val;
            if (field === "plaidTransactionId") plaidTransactionId = val;
            return qb;
          },
        };
        q(qb);
        const filtered = Array.from(store.values()).filter(
          (o) =>
            (userId === undefined || o.userId === userId) &&
            (plaidTransactionId === undefined ||
              o.plaidTransactionId === plaidTransactionId),
        );
        return filtered;
      }
      return {
        getX: async (id: string) => {
          if (!store.has(id)) throw new Error("row_missing");
          return rowHandle(id);
        },
        insert: async (doc: Omit<Overlay, "_id">) => {
          const id = "ov_" + nextId++;
          store.set(id, { _id: id, ...doc });
          return id;
        },
      };
    },
    store,
  };
  return ctx;
}

function makeResolverCtx(opts: {
  viewerId: string;
  cards: Array<{
    _id: string;
    userId: string;
    accountId: string;
    isActive: boolean;
  }>;
  overlays: Overlay[];
  rawTransactions: RawTransaction[];
}) {
  const runQueryCalls: Array<Record<string, unknown>> = [];
  return {
    runQueryCalls,
    runQuery: async (_ref: unknown, args: Record<string, unknown>) => {
      runQueryCalls.push(args);
      return opts.rawTransactions.filter(
        (tx) =>
          (typeof args.startDate !== "string" || tx.date >= args.startDate) &&
          (typeof args.endDate !== "string" || tx.date <= args.endDate),
      );
    },
    table: (name: string, _idx?: string, q?: (qb: any) => any) => {
      let userId: string | undefined;
      let isActive: boolean | undefined;
      const qb = {
        eq: (field: string, val: any) => {
          if (field === "userId") userId = val;
          if (field === "isActive") isActive = val;
          return qb;
        },
      };
      q?.(qb);
      if (name === "creditCards") {
        return opts.cards.filter(
          (card) =>
            (userId === undefined || card.userId === userId) &&
            (isActive === undefined || card.isActive === isActive),
        );
      }
      if (name === "transactionOverlays") {
        return opts.overlays.filter(
          (overlay) => userId === undefined || overlay.userId === userId,
        );
      }
      throw new Error("unexpected table " + name);
    },
  };
}

describe("propose_transaction_update executor", () => {
  it("creates a new overlay when none exists", async () => {
    const ctx = makeCtx({ viewerId: "user_1", overlays: [] });
    const exec = getToolExecutor("propose_transaction_update")!;
    const result = await exec(ctx as any, {
      argsJson: JSON.stringify({
        plaidTransactionId: "tx_1",
        patch: { userCategory: "groceries", notes: "w" },
      }),
    });
    expect(result.affectedIds).toEqual(["tx_1"]);
    const payload = result.reversalPayload as any;
    expect(payload.kind).toBe("overlay_patch");
    expect(payload.priorFields.userCategory).toBeUndefined();
    expect(payload.priorUnset).toEqual(["userCategory", "notes"]);
    expect(payload.created).toBe(true);

    const row = Array.from(ctx.store.values())[0];
    expect(row.userCategory).toBe("groceries");
    expect(row.userId).toBe("user_1");
  });

  it("patches an existing overlay and captures prior values", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      overlays: [
        {
          _id: "ov_1",
          userId: "user_1",
          plaidTransactionId: "tx_1",
          userCategory: "old",
        },
      ],
    });
    const exec = getToolExecutor("propose_transaction_update")!;
    const result = await exec(ctx as any, {
      argsJson: JSON.stringify({
        plaidTransactionId: "tx_1",
        patch: { userCategory: "new" },
      }),
    });
    expect((result.reversalPayload as any).priorFields.userCategory).toBe("old");
    expect(ctx.store.get("ov_1")!.userCategory).toBe("new");
  });

  it("patches isReviewed and captures its prior value", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      overlays: [
        {
          _id: "ov_1",
          userId: "user_1",
          plaidTransactionId: "tx_1",
          isReviewed: false,
        },
      ],
    });
    const exec = getToolExecutor("propose_transaction_update")!;
    const result = await exec(ctx as any, {
      argsJson: JSON.stringify({
        plaidTransactionId: "tx_1",
        patch: { isReviewed: true },
      }),
    });
    expect((result.reversalPayload as any).priorFields.isReviewed).toBe(false);
    expect(ctx.store.get("ov_1")!.isReviewed).toBe(true);
  });

  it("reversal restores prior field values", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      overlays: [
        {
          _id: "ov_1",
          userId: "user_1",
          plaidTransactionId: "tx_1",
          userCategory: "new",
        },
      ],
    });
    const reverse = getReversalHandler("propose_transaction_update")!;
    await reverse(ctx as any, {
      reversalPayloadJson: JSON.stringify({
        plaidTransactionId: "tx_1",
        priorFields: { userCategory: "old" },
        created: false,
      }),
    });
    expect(ctx.store.get("ov_1")!.userCategory).toBe("old");
  });

  it("reversal clears fields that were unset before execution", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      overlays: [{ _id: "ov_1", userId: "user_1", plaidTransactionId: "tx_1" }],
    });
    const exec = getToolExecutor("propose_transaction_update")!;
    const result = await exec(ctx as any, {
      argsJson: JSON.stringify({
        plaidTransactionId: "tx_1",
        patch: { userCategory: "groceries" },
      }),
    });
    expect(ctx.store.get("ov_1")!.userCategory).toBe("groceries");

    const reverse = getReversalHandler("propose_transaction_update")!;
    await reverse(ctx as any, {
      reversalPayloadJson: JSON.stringify(result.reversalPayload),
    });
    expect(ctx.store.get("ov_1")!.userCategory).toBeUndefined();
  });

  it("reversal deletes overlays created by execution", async () => {
    const ctx = makeCtx({ viewerId: "user_1", overlays: [] });
    const exec = getToolExecutor("propose_transaction_update")!;
    const result = await exec(ctx as any, {
      argsJson: JSON.stringify({
        plaidTransactionId: "tx_1",
        patch: { userCategory: "groceries" },
      }),
    });
    expect(ctx.store.size).toBe(1);

    const reverse = getReversalHandler("propose_transaction_update")!;
    await reverse(ctx as any, {
      reversalPayloadJson: JSON.stringify(result.reversalPayload),
    });
    expect(ctx.store.size).toBe(0);
  });
});

describe("propose_bulk_transaction_update filter validation", () => {
  it("rejects empty filters", () => {
    expect(() => validateBulkFilter({})).toThrow(/bulk filter has no fields/);
  });

  it("accepts filters resolved from raw Plaid transactions", () => {
    expect(() => validateBulkFilter({ minAmount: 10 })).not.toThrow();
    expect(() => validateBulkFilter({ accountIds: ["acc_1"] })).not.toThrow();
    expect(() => validateBulkFilter({ pending: false })).not.toThrow();
  });
});

describe("propose_bulk_transaction_update executor", () => {
  it("patches all targeted overlays and captures per-row priorFields", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      overlays: [
        { _id: "ov_1", userId: "user_1", plaidTransactionId: "tx_1", userCategory: "a" },
        { _id: "ov_2", userId: "user_1", plaidTransactionId: "tx_2", userCategory: "b" },
      ],
    });
    const exec = getToolExecutor("propose_bulk_transaction_update")!;
    const result = await exec(ctx as any, {
      argsJson: JSON.stringify({
        plaidTransactionIds: ["tx_1", "tx_2"],
        patch: { userCategory: "groceries" },
      }),
    });
    expect(result.affectedIds.length).toBe(2);
    const payload = result.reversalPayload as any;
    expect(payload.kind).toBe("overlay_patch_bulk");
    expect(payload.updates[0].priorFields.userCategory).toBe("a");
    expect(payload.updates[1].priorFields.userCategory).toBe("b");
    expect(ctx.store.get("ov_1")!.userCategory).toBe("groceries");
  });

  it("reversal restores priorFields for each update", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      overlays: [
        { _id: "ov_1", userId: "user_1", plaidTransactionId: "tx_1", userCategory: "groceries" },
      ],
    });
    const reverse = getReversalHandler("propose_bulk_transaction_update")!;
    await reverse(ctx as any, {
      reversalPayloadJson: JSON.stringify({
        updates: [
          {
            plaidTransactionId: "tx_1",
            priorFields: { userCategory: "old" },
          },
        ],
      }),
    });
    expect(ctx.store.get("ov_1")!.userCategory).toBe("old");
  });

  it("bulk executor creates a viewer-owned overlay when none exists for the viewer", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      overlays: [
        { _id: "ov_1", userId: "user_2", plaidTransactionId: "tx_1", userCategory: "a" },
      ],
    });
    const exec = getToolExecutor("propose_bulk_transaction_update")!;
    await expect(
      exec(ctx as any, {
        argsJson: JSON.stringify({
          plaidTransactionIds: ["tx_1"],
          patch: { userCategory: "x" },
        }),
      }),
    ).resolves.toBeDefined();
    expect(ctx.store.get("ov_1")!.userCategory).toBe("a");
    const created = Array.from(ctx.store.values()).find(
      (row) => row.userId === "user_1",
    );
    expect(created?.userCategory).toBe("x");
  });

  it("bulk reversal clears unset fields after JSON round trip", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      overlays: [{ _id: "ov_1", userId: "user_1", plaidTransactionId: "tx_1" }],
    });
    const exec = getToolExecutor("propose_bulk_transaction_update")!;
    const result = await exec(ctx as any, {
      argsJson: JSON.stringify({
        plaidTransactionIds: ["tx_1"],
        patch: { userCategory: "groceries" },
      }),
    });
    expect(ctx.store.get("ov_1")!.userCategory).toBe("groceries");

    const reverse = getReversalHandler("propose_bulk_transaction_update")!;
    await reverse(ctx as any, {
      reversalPayloadJson: JSON.stringify(result.reversalPayload),
    });
    expect(ctx.store.get("ov_1")!.userCategory).toBeUndefined();
  });

  it("bulk reversal deletes overlays created by execution", async () => {
    const ctx = makeCtx({ viewerId: "user_1", overlays: [] });
    const exec = getToolExecutor("propose_bulk_transaction_update")!;
    const result = await exec(ctx as any, {
      argsJson: JSON.stringify({
        plaidTransactionIds: ["tx_1"],
        patch: { userCategory: "groceries" },
      }),
    });
    expect(ctx.store.size).toBe(1);

    const reverse = getReversalHandler("propose_bulk_transaction_update")!;
    await reverse(ctx as any, {
      reversalPayloadJson: JSON.stringify(result.reversalPayload),
    });
    expect(ctx.store.size).toBe(0);
  });
});

describe("propose_bulk_transaction_update resolver", () => {
  it("matches untouched Plaid transactions by merchant and date range", async () => {
    const ctx = makeResolverCtx({
      viewerId: "user_1",
      cards: [
        { _id: "card_1", userId: "user_1", accountId: "acc_1", isActive: true },
      ],
      overlays: [],
      rawTransactions: [
        {
          transactionId: "tx_1",
          accountId: "acc_1",
          amount: 7.25,
          date: "2026-03-15",
          name: "STARBUCKS STORE 123",
          merchantName: "Starbucks",
          pending: false,
          categoryDetailed: "FOOD_AND_DRINK_COFFEE",
        },
      ],
    });

    await expect(
      resolveBulkTransactionIds(
        ctx as any,
        { _id: "user_1", externalId: "clerk_1" },
        {
          dateFrom: "2026-03-01",
          dateTo: "2026-03-31",
          merchantName: "starbucks",
        },
        500,
      ),
    ).resolves.toEqual(["tx_1"]);
    expect(ctx.runQueryCalls[0]).toMatchObject({
      userId: "clerk_1",
    });
    expect(ctx.runQueryCalls[0]).not.toHaveProperty("startDate");
    expect(ctx.runQueryCalls[0]).not.toHaveProperty("endDate");
  });

  it("uses overlay fields as filter overrides before applying raw predicates", async () => {
    const ctx = makeResolverCtx({
      viewerId: "user_1",
      cards: [
        { _id: "card_1", userId: "user_1", accountId: "acc_1", isActive: true },
      ],
      overlays: [
        {
          _id: "ov_1",
          userId: "user_1",
          plaidTransactionId: "tx_1",
          userCategoryDetailed: "COFFEE_SHOPS",
          userDate: "2026-03-20",
          userMerchantName: "Starbucks",
          isHidden: true,
        },
      ],
      rawTransactions: [
        {
          transactionId: "tx_1",
          accountId: "acc_1",
          amount: 7.25,
          date: "2026-02-28",
          name: "SQ *SBUX",
          pending: false,
          categoryDetailed: "GENERAL_MERCHANDISE",
        },
      ],
    });

    await expect(
      resolveBulkTransactionIds(
        ctx as any,
        { _id: "user_1", externalId: "clerk_1" },
        {
          dateFrom: "2026-03-01",
          dateTo: "2026-03-31",
          accountIds: ["acc_1"],
          minAmount: 5,
          maxAmount: 10,
          pending: false,
          merchantName: "starbucks",
          categoryDetailed: ["COFFEE_SHOPS"],
          isHidden: true,
        },
        500,
      ),
    ).resolves.toEqual(["tx_1"]);
  });

  it("applies signed amount, account, and pending filters to raw transactions", async () => {
    const ctx = makeResolverCtx({
      viewerId: "user_1",
      cards: [
        { _id: "card_1", userId: "user_1", accountId: "acc_1", isActive: true },
        { _id: "card_2", userId: "user_1", accountId: "acc_2", isActive: true },
      ],
      overlays: [],
      rawTransactions: [
        {
          transactionId: "tx_debit",
          accountId: "acc_1",
          amount: 12,
          date: "2026-03-15",
          name: "Lunch",
          pending: false,
        },
        {
          transactionId: "tx_credit",
          accountId: "acc_1",
          amount: -12,
          date: "2026-03-16",
          name: "Refund",
          pending: false,
        },
        {
          transactionId: "tx_pending_other_card",
          accountId: "acc_2",
          amount: 14,
          date: "2026-03-17",
          name: "Pending lunch",
          pending: true,
        },
      ],
    });

    await expect(
      resolveBulkTransactionIds(
        ctx as any,
        { _id: "user_1", externalId: "clerk_1" },
        { minAmount: 10 },
        500,
      ),
    ).resolves.toEqual(["tx_debit", "tx_pending_other_card"]);

    await expect(
      resolveBulkTransactionIds(
        ctx as any,
        { _id: "user_1", externalId: "clerk_1" },
        { accountIds: ["acc_2"], pending: true },
        500,
      ),
    ).resolves.toEqual(["tx_pending_other_card"]);
  });

  it("backfills overlay-only matches when raw Plaid data is absent", async () => {
    const ctx = makeResolverCtx({
      viewerId: "user_1",
      cards: [
        { _id: "card_1", userId: "user_1", accountId: "acc_1", isActive: true },
      ],
      overlays: [
        {
          _id: "ov_1",
          userId: "user_1",
          plaidTransactionId: "tx_overlay",
          userMerchantName: "Starbucks",
          userDate: "2026-03-20",
          userCategoryDetailed: "COFFEE_SHOPS",
          isHidden: true,
        },
      ],
      rawTransactions: [],
    });

    await expect(
      resolveBulkTransactionIds(
        ctx as any,
        { _id: "user_1", externalId: "clerk_1" },
        {
          dateFrom: "2026-03-01",
          dateTo: "2026-03-31",
          merchantName: "starbucks",
          categoryDetailed: ["COFFEE_SHOPS"],
          isHidden: true,
        },
        500,
      ),
    ).resolves.toEqual(["tx_overlay"]);
  });

  it("backfills overlay-only matches when no active cards exist", async () => {
    const ctx = makeResolverCtx({
      viewerId: "user_1",
      cards: [],
      overlays: [
        {
          _id: "ov_1",
          userId: "user_1",
          plaidTransactionId: "tx_overlay",
          userMerchantName: "Starbucks",
          userDate: "2026-03-20",
          userCategoryDetailed: "COFFEE_SHOPS",
          isHidden: false,
        },
      ],
      rawTransactions: [
        {
          transactionId: "tx_1",
          accountId: "acc_1",
          amount: 7.25,
          date: "2026-03-20",
          name: "Starbucks",
          pending: false,
        },
      ],
    });

    await expect(
      resolveBulkTransactionIds(
        ctx as any,
        { _id: "user_1", externalId: "clerk_1" },
        {
          dateFrom: "2026-03-01",
          dateTo: "2026-03-31",
          merchantName: "starbucks",
          categoryDetailed: ["COFFEE_SHOPS"],
        },
        500,
      ),
    ).resolves.toEqual(["tx_overlay"]);
    expect(ctx.runQueryCalls).toEqual([]);
  });

  it("does not return raw transactions for accounts without a viewer-owned card", async () => {
    const ctx = makeResolverCtx({
      viewerId: "user_1",
      cards: [
        { _id: "card_1", userId: "user_1", accountId: "acc_1", isActive: true },
      ],
      overlays: [],
      rawTransactions: [
        {
          transactionId: "tx_1",
          accountId: "acc_2",
          amount: 7.25,
          date: "2026-03-15",
          name: "Starbucks",
          pending: false,
        },
      ],
    });

    await expect(
      resolveBulkTransactionIds(
        ctx as any,
        { _id: "user_1", externalId: "clerk_1" },
        { merchantName: "starbucks" },
        500,
      ),
    ).resolves.toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import "../agent/tools/propose/proposeCreditCardMetadataUpdate";
import {
  getReversalHandler,
  getToolExecutor,
} from "../agent/writeTool";

type Card = {
  _id: string;
  userId: string;
  displayName: string;
  company?: string;
  userOverrides?: Record<string, unknown>;
};

function makeCtx(opts: { viewerId: string; cards: Card[] }) {
  const store = new Map<string, Card>(opts.cards.map((c) => [c._id, { ...c }]));
  const rowHandle = (id: string) => ({
    _id: id,
    get userId() {
      return store.get(id)!.userId;
    },
    get displayName() {
      return store.get(id)!.displayName;
    },
    get company() {
      return store.get(id)!.company;
    },
    get userOverrides() {
      return store.get(id)!.userOverrides;
    },
    patch: async (p: Partial<Card>) => {
      const prev = store.get(id)!;
      store.set(id, { ...prev, ...p });
    },
  });
  return {
    viewerX: () => ({ _id: opts.viewerId }),
    table: (name: string) => {
      if (name !== "creditCards") throw new Error("unexpected table " + name);
      return {
        getX: async (id: string) => {
          if (!store.has(id)) throw new Error("row_missing");
          return rowHandle(id);
        },
      };
    },
    store,
  };
}

describe("propose_credit_card_metadata_update executor", () => {
  it("patches displayName and captures priorDisplayName", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      cards: [{ _id: "card_1", userId: "user_1", displayName: "Old Name" }],
    });
    const exec = getToolExecutor("propose_credit_card_metadata_update")!;
    const result = await exec(ctx as any, {
      argsJson: JSON.stringify({
        cardId: "card_1",
        patch: { displayName: "New Name" },
      }),
    });
    const payload = result.reversalPayload as any;
    expect(payload.kind).toBe("card_patch");
    expect(payload.priorDisplayName).toBe("Old Name");
    expect(payload.priorUserOverrides).toBeUndefined();
    expect(ctx.store.get("card_1")!.displayName).toBe("New Name");
  });

  it("snapshots whole userOverrides object", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      cards: [
        {
          _id: "card_1",
          userId: "user_1",
          displayName: "X",
          userOverrides: { company: "Chase", aprs: [{ index: 0, aprPercentage: 22 }] },
        },
      ],
    });
    const exec = getToolExecutor("propose_credit_card_metadata_update")!;
    const result = await exec(ctx as any, {
      argsJson: JSON.stringify({
        cardId: "card_1",
        patch: { userOverrides: { company: "Chase Freedom" } },
      }),
    });
    const payload = result.reversalPayload as any;
    expect(payload.priorUserOverrides).toEqual({
      company: "Chase",
      aprs: [{ index: 0, aprPercentage: 22 }],
    });
    expect(ctx.store.get("card_1")!.userOverrides).toEqual({
      company: "Chase Freedom",
    });
  });

  it("captures prior company for undo", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      cards: [
        {
          _id: "card_1",
          userId: "user_1",
          displayName: "X",
          company: "Chase",
        },
      ],
    });
    const exec = getToolExecutor("propose_credit_card_metadata_update")!;
    const result = await exec(ctx as any, {
      argsJson: JSON.stringify({
        cardId: "card_1",
        patch: { company: "American Express" },
      }),
    });
    const payload = result.reversalPayload as any;
    expect(payload.priorCompany).toBe("Chase");
    expect(payload.companyWasPresent).toBe(true);
    expect(ctx.store.get("card_1")!.company).toBe("American Express");
  });

  it("reversal removes userOverrides when the field was absent before", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      cards: [{ _id: "card_1", userId: "user_1", displayName: "X" }],
    });
    const exec = getToolExecutor("propose_credit_card_metadata_update")!;
    const result = await exec(ctx as any, {
      argsJson: JSON.stringify({
        cardId: "card_1",
        patch: { userOverrides: { company: "Chase" } },
      }),
    });
    const reverse = getReversalHandler("propose_credit_card_metadata_update")!;
    await reverse(ctx as any, {
      reversalPayloadJson: JSON.stringify(result.reversalPayload),
    });
    expect(ctx.store.get("card_1")!.userOverrides).toBeUndefined();
  });

  it("rejects when the card belongs to another user", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      cards: [{ _id: "card_1", userId: "user_2", displayName: "X" }],
    });
    const exec = getToolExecutor("propose_credit_card_metadata_update")!;
    await expect(
      exec(ctx as any, {
        argsJson: JSON.stringify({
          cardId: "card_1",
          patch: { displayName: "Y" },
        }),
      }),
    ).rejects.toThrow(/not_authorized/);
  });

  it("reversal restores prior values", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      cards: [{ _id: "card_1", userId: "user_1", displayName: "New" }],
    });
    const reverse = getReversalHandler("propose_credit_card_metadata_update")!;
    await reverse(ctx as any, {
      reversalPayloadJson: JSON.stringify({
        cardId: "card_1",
        priorDisplayName: "Old",
      }),
    });
    expect(ctx.store.get("card_1")!.displayName).toBe("Old");
  });
});

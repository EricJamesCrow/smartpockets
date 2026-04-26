import { describe, expect, it } from "vitest";
import "../agent/tools/propose/proposeManualPromo";
import { buildPromoAffectedIds, coercePromo } from "../agent/tools/propose/proposeManualPromo";
import { getReversalHandler, getToolExecutor } from "../agent/writeTool";

type Card = { _id: string; userId: string; displayName: string };
type Promo = {
    _id: string;
    userId: string;
    creditCardId: string;
    description: string;
    aprPercentage: number;
    originalBalance: number;
    remainingBalance: number;
    startDate: string;
    expirationDate: string;
    isDeferredInterest: boolean;
    isActive: boolean;
    isManual?: boolean;
};

function makeCtx(opts: { viewerId: string; cards: Card[]; promos: Promo[] }) {
    const cards = new Map<string, Card>(opts.cards.map((c) => [c._id, { ...c }]));
    const promos = new Map<string, Promo>(opts.promos.map((p) => [p._id, { ...p }]));
    let nextId = 1;

    const cardHandle = (id: string) => ({
        _id: id,
        get userId() {
            return cards.get(id)!.userId;
        },
        get displayName() {
            return cards.get(id)!.displayName;
        },
    });

    const promoHandle = (id: string) => ({
        _id: id,
        get userId() {
            return promos.get(id)!.userId;
        },
        get creditCardId() {
            return promos.get(id)!.creditCardId;
        },
        get isManual() {
            return promos.get(id)!.isManual;
        },
        get description() {
            return promos.get(id)!.description;
        },
        get aprPercentage() {
            return promos.get(id)!.aprPercentage;
        },
        get originalBalance() {
            return promos.get(id)!.originalBalance;
        },
        get remainingBalance() {
            return promos.get(id)!.remainingBalance;
        },
        get startDate() {
            return promos.get(id)!.startDate;
        },
        get expirationDate() {
            return promos.get(id)!.expirationDate;
        },
        get isDeferredInterest() {
            return promos.get(id)!.isDeferredInterest;
        },
        get isActive() {
            return promos.get(id)!.isActive;
        },
        patch: async (p: Partial<Promo>) => {
            const prev = promos.get(id)!;
            promos.set(id, { ...prev, ...p });
        },
    });

    return {
        viewerX: () => ({ _id: opts.viewerId }),
        table: (name: string) => {
            if (name === "creditCards") {
                return {
                    getX: async (id: string) => {
                        if (!cards.has(id)) throw new Error("card_missing");
                        return cardHandle(id);
                    },
                };
            }
            if (name === "promoRates") {
                return {
                    get: async (id: string) => (promos.has(id) ? promoHandle(id) : null),
                    getX: async (id: string) => {
                        if (!promos.has(id)) throw new Error("promo_missing");
                        return promoHandle(id);
                    },
                    insert: async (doc: Omit<Promo, "_id">) => {
                        const id = "promo_" + nextId++;
                        promos.set(id, { _id: id, ...doc });
                        return id;
                    },
                };
            }
            throw new Error("unexpected table " + name);
        },
        cards,
        promos,
    };
}

const basePromo = {
    description: "Purchase APR 0%",
    aprPercentage: 0,
    originalBalance: 1000,
    remainingBalance: 900,
    startDate: "2026-01-01",
    expirationDate: "2026-12-31",
    isDeferredInterest: true,
};

describe("propose_manual_promo executor", () => {
    it("uses promo-specific affected ids for create dedupe", () => {
        expect(buildPromoAffectedIds("card_1", basePromo)).toEqual(["new:card_1:2026-01-01:2026-12-31:purchase apr 0%"]);
        expect(
            buildPromoAffectedIds("card_1", {
                ...basePromo,
                description: "Balance Transfer",
            }),
        ).toEqual(["new:card_1:2026-01-01:2026-12-31:balance transfer"]);
        expect(buildPromoAffectedIds("card_1", { ...basePromo, promoRateId: "promo_1" })).toEqual(["promo_1"]);
    });

    it("create inserts a manual promoRate and returns promo_soft_delete reversal", async () => {
        const ctx = makeCtx({
            viewerId: "user_1",
            cards: [{ _id: "card_1", userId: "user_1", displayName: "X" }],
            promos: [],
        });
        const exec = getToolExecutor("propose_manual_promo")!;
        const result = await exec(ctx as any, {
            argsJson: JSON.stringify({ cardId: "card_1", promo: basePromo }),
        });
        expect((result.reversalPayload as any).kind).toBe("promo_soft_delete");
        const [promo] = Array.from(ctx.promos.values());
        expect(promo.isManual).toBe(true);
        expect(promo.isActive).toBe(true);
        expect(promo.userId).toBe("user_1");
    });

    it("update returns promo_restore payload with prior snapshot", async () => {
        const ctx = makeCtx({
            viewerId: "user_1",
            cards: [{ _id: "card_1", userId: "user_1", displayName: "X" }],
            promos: [
                {
                    _id: "promo_1",
                    userId: "user_1",
                    creditCardId: "card_1",
                    description: "old",
                    aprPercentage: 5,
                    originalBalance: 100,
                    remainingBalance: 100,
                    startDate: "2025-01-01",
                    expirationDate: "2025-12-31",
                    isDeferredInterest: false,
                    isActive: true,
                    isManual: true,
                },
            ],
        });
        const exec = getToolExecutor("propose_manual_promo")!;
        const result = await exec(ctx as any, {
            argsJson: JSON.stringify({
                cardId: "card_1",
                promo: { ...basePromo, promoRateId: "promo_1" },
            }),
        });
        const payload = result.reversalPayload as any;
        expect(payload.kind).toBe("promo_restore");
        expect(payload.priorFields.description).toBe("old");
        expect(payload.priorFields.aprPercentage).toBe(5);
        expect(ctx.promos.get("promo_1")!.description).toBe("Purchase APR 0%");
    });

    it("rejects updates to Plaid-synced promos", async () => {
        const ctx = makeCtx({
            viewerId: "user_1",
            cards: [{ _id: "card_1", userId: "user_1", displayName: "X" }],
            promos: [
                {
                    _id: "promo_1",
                    userId: "user_1",
                    creditCardId: "card_1",
                    description: "plaid",
                    aprPercentage: 5,
                    originalBalance: 100,
                    remainingBalance: 100,
                    startDate: "2025-01-01",
                    expirationDate: "2025-12-31",
                    isDeferredInterest: false,
                    isActive: true,
                    isManual: false,
                },
            ],
        });
        const exec = getToolExecutor("propose_manual_promo")!;
        await expect(
            exec(ctx as any, {
                argsJson: JSON.stringify({
                    cardId: "card_1",
                    promo: { ...basePromo, promoRateId: "promo_1" },
                }),
            }),
        ).rejects.toThrow(/not_authorized/);
    });

    it("rejects updates when promoRateId belongs to a different card", async () => {
        const ctx = makeCtx({
            viewerId: "user_1",
            cards: [{ _id: "card_1", userId: "user_1", displayName: "X" }],
            promos: [
                {
                    _id: "promo_1",
                    userId: "user_1",
                    creditCardId: "card_2",
                    description: "old",
                    aprPercentage: 5,
                    originalBalance: 100,
                    remainingBalance: 100,
                    startDate: "2025-01-01",
                    expirationDate: "2025-12-31",
                    isDeferredInterest: false,
                    isActive: true,
                    isManual: true,
                },
            ],
        });
        const exec = getToolExecutor("propose_manual_promo")!;
        await expect(
            exec(ctx as any, {
                argsJson: JSON.stringify({
                    cardId: "card_1",
                    promo: { ...basePromo, promoRateId: "promo_1" },
                }),
            }),
        ).rejects.toThrow(/not_authorized/);
    });

    it("rejects when the target card is owned by another user", async () => {
        const ctx = makeCtx({
            viewerId: "user_1",
            cards: [{ _id: "card_1", userId: "user_2", displayName: "X" }],
            promos: [],
        });
        const exec = getToolExecutor("propose_manual_promo")!;
        await expect(
            exec(ctx as any, {
                argsJson: JSON.stringify({ cardId: "card_1", promo: basePromo }),
            }),
        ).rejects.toThrow(/not_authorized/);
    });

    it("reversal of a create soft-deletes the row", async () => {
        const ctx = makeCtx({
            viewerId: "user_1",
            cards: [],
            promos: [
                {
                    _id: "promo_1",
                    userId: "user_1",
                    creditCardId: "card_1",
                    description: "new",
                    aprPercentage: 0,
                    originalBalance: 100,
                    remainingBalance: 100,
                    startDate: "2026-01-01",
                    expirationDate: "2026-12-31",
                    isDeferredInterest: true,
                    isActive: true,
                    isManual: true,
                },
            ],
        });
        const reverse = getReversalHandler("propose_manual_promo")!;
        await reverse(ctx as any, {
            reversalPayloadJson: JSON.stringify({
                kind: "promo_soft_delete",
                promoRateId: "promo_1",
            }),
        });
        expect(ctx.promos.get("promo_1")!.isActive).toBe(false);
    });
});

describe("manual promo validation", () => {
    it("rejects non-finite and out-of-range financial fields", () => {
        expect(() => coercePromo({ ...basePromo, aprPercentage: Number.NaN })).toThrow(/aprPercentage/);
        expect(() => coercePromo({ ...basePromo, aprPercentage: 101 })).toThrow(/aprPercentage/);
        expect(() => coercePromo({ ...basePromo, originalBalance: 0 })).toThrow(/originalBalance/);
        expect(() => coercePromo({ ...basePromo, remainingBalance: -1 })).toThrow(/remainingBalance/);
        expect(() => coercePromo({ ...basePromo, remainingBalance: 1001 })).toThrow(/remainingBalance/);
    });

    it("rejects invalid manual promo dates and non-boolean flags", () => {
        expect(() => coercePromo({ ...basePromo, startDate: "2026-02-30" })).toThrow(/startDate/);
        expect(() => coercePromo({ ...basePromo, expirationDate: "2025-12-31" })).toThrow(/expirationDate/);
        expect(() => coercePromo({ ...basePromo, isDeferredInterest: "false" })).toThrow(/isDeferredInterest/);
    });

    it("normalizes description and preserves valid zero APR payloads", () => {
        expect(coercePromo({ ...basePromo, description: "  Balance transfer  " })).toMatchObject({
            description: "Balance transfer",
            aprPercentage: 0,
            remainingBalance: 900,
        });
    });
});

import { describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../schema";
import { api } from "../../_generated/api";
import plaidSchema from "../../../../convex-plaid/src/component/schema";

const modules = import.meta.glob("../../**/*.ts");
const plaidModules = import.meta.glob(
    "../../../../convex-plaid/src/component/**/*.ts",
);

function setup() {
    const t = convexTest(schema, modules);
    t.registerComponent("plaid", plaidSchema as any, plaidModules);
    return t;
}

const IDENTITY = { subject: "user_test_abc", issuer: "test" };

async function seedUser(
    // biome-ignore lint/suspicious/noExplicitAny: convex-test ctx
    t: any,
) {
    return await t.run(async (ctx: any) => {
        return await ctx.db.insert("users", {
            externalId: "user_test_abc",
            email: "test@example.com",
        });
    });
}

async function seedSubscription(t: any, userId: string) {
    return await t.run(async (ctx: any) => {
        return await ctx.db.insert("detectedSubscriptions", {
            userId,
            normalizedMerchant: "netflix",
            amountBucket: 15,
            frequency: "monthly",
            averageAmount: 15,
            source: "plaid",
            sampleTransactionIds: [],
            firstSeenDate: "2026-01-01",
            lastSeenDate: "2026-04-01",
            occurrenceCount: 4,
            userStatus: "pending",
            isActive: true,
        });
    });
}

async function seedAnomaly(t: any, userId: string) {
    return await t.run(async (ctx: any) => {
        return await ctx.db.insert("anomalies", {
            userId,
            plaidTransactionId: "txn_1",
            ruleType: "amount_spike_3x",
            score: 1,
            evidenceJson: "{}",
            merchantName: "Starbucks",
            amount: 100,
            transactionDate: "2026-04-20",
            detectedAt: Date.now(),
            userStatus: "pending",
        });
    });
}

async function finishScheduled(t: any) {
    await t.finishAllScheduledFunctions(vi.runAllTimers);
}

describe("subscriptions mutations", () => {
    it("confirm patches userStatus + timestamp", async () => {
        vi.useFakeTimers();
        const t = setup();
        const userId = await seedUser(t);
        const subscriptionId = await seedSubscription(t, userId);
        const asUser = t.withIdentity(IDENTITY);
        try {
            await asUser.mutation(api.intelligence.subscriptions.mutations.confirm, {
                subscriptionId,
            });
            await finishScheduled(t);
            const row = await t.run(async (ctx: any) =>
                ctx.db.get(subscriptionId),
            );
            expect(row.userStatus).toBe("confirmed");
            expect(typeof row.userStatusUpdatedAt).toBe("number");
        } finally {
            vi.useRealTimers();
        }
    });

    it("dismiss patches userStatus to dismissed", async () => {
        vi.useFakeTimers();
        const t = setup();
        const userId = await seedUser(t);
        const subscriptionId = await seedSubscription(t, userId);
        const asUser = t.withIdentity(IDENTITY);
        try {
            await asUser.mutation(api.intelligence.subscriptions.mutations.dismiss, {
                subscriptionId,
            });
            await finishScheduled(t);
            const row = await t.run(async (ctx: any) =>
                ctx.db.get(subscriptionId),
            );
            expect(row.userStatus).toBe("dismissed");
        } finally {
            vi.useRealTimers();
        }
    });

    it("setNickname patches nickname", async () => {
        vi.useFakeTimers();
        const t = setup();
        const userId = await seedUser(t);
        const subscriptionId = await seedSubscription(t, userId);
        const asUser = t.withIdentity(IDENTITY);
        try {
            await asUser.mutation(
                api.intelligence.subscriptions.mutations.setNickname,
                { subscriptionId, nickname: "Family Netflix" },
            );
            await finishScheduled(t);
            const row = await t.run(async (ctx: any) =>
                ctx.db.get(subscriptionId),
            );
            expect(row.nickname).toBe("Family Netflix");
        } finally {
            vi.useRealTimers();
        }
    });

    it("setNickname clears blank nicknames", async () => {
        vi.useFakeTimers();
        const t = setup();
        const userId = await seedUser(t);
        const subscriptionId = await seedSubscription(t, userId);
        const asUser = t.withIdentity(IDENTITY);
        try {
            await asUser.mutation(
                api.intelligence.subscriptions.mutations.setNickname,
                { subscriptionId, nickname: "Family Netflix" },
            );
            await asUser.mutation(
                api.intelligence.subscriptions.mutations.setNickname,
                { subscriptionId, nickname: "   " },
            );
            await finishScheduled(t);
            const row = await t.run(async (ctx: any) =>
                ctx.db.get(subscriptionId),
            );
            expect(row.nickname).toBeUndefined();
        } finally {
            vi.useRealTimers();
        }
    });
});

describe("anomalies mutations", () => {
    it("acknowledge patches userStatus", async () => {
        const t = setup();
        const userId = await seedUser(t);
        const anomalyId = await seedAnomaly(t, userId);
        const asUser = t.withIdentity(IDENTITY);
        await asUser.mutation(
            api.intelligence.anomalies.mutations.acknowledge,
            { anomalyId },
        );
        const row = await t.run(async (ctx: any) => ctx.db.get(anomalyId));
        expect(row.userStatus).toBe("acknowledged");
        expect(typeof row.userStatusUpdatedAt).toBe("number");
    });

    it("dismiss patches userStatus to dismissed_false_positive", async () => {
        const t = setup();
        const userId = await seedUser(t);
        const anomalyId = await seedAnomaly(t, userId);
        const asUser = t.withIdentity(IDENTITY);
        await asUser.mutation(api.intelligence.anomalies.mutations.dismiss, {
            anomalyId,
        });
        const row = await t.run(async (ctx: any) => ctx.db.get(anomalyId));
        expect(row.userStatus).toBe("dismissed_false_positive");
    });
});

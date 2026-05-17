import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";
import { PROMPT_VERSION } from "../agent/system";

const modules = import.meta.glob("../**/*.ts");

function setup() {
    return convexTest(schema, modules);
}

async function seedUserThreadAndMessages(
    t: ReturnType<typeof setup>,
    externalId: string,
    count: number,
): Promise<{ threadId: string }> {
    return await t.run(async (ctx: any) => {
        const userId = await ctx.db.insert("users", {
            externalId,
            email: `${externalId}@example.test`,
        });
        const now = Date.now();
        const threadId = await ctx.db.insert("agentThreads", {
            userId,
            title: undefined,
            isArchived: false,
            lastTurnAt: now,
            promptVersion: PROMPT_VERSION,
            summaryText: undefined,
            summaryUpToMessageId: undefined,
            componentThreadId: `ct_${Math.random().toString(36).slice(2, 14)}`,
            readCallCount: 0,
            cancelledAtTurn: undefined,
            activeRunUserMessageId: undefined,
            activeRunStartedAt: undefined,
            activeRunExpiresAt: undefined,
        });
        for (let i = 0; i < count; i++) {
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: i % 2 === 0 ? "user" : "assistant",
                text: `message ${i}`,
                createdAt: now + i,
                isStreaming: false,
            });
        }
        return { threadId };
    });
}

describe("agent thread pagination (CROWDEV-437)", () => {
    it("returns a bounded reactive latest head in chronological display order", async () => {
        const t = setup();
        const externalId = "user_pagination_head";
        const { threadId } = await seedUserThreadAndMessages(t, externalId, 75);
        const authed = t.withIdentity({ subject: externalId, issuer: "test" });

        const messages = await authed.query(
            api.agent.threads.listLatestMessages,
            { threadId: threadId as any, limit: 100 },
        );

        expect(messages).toHaveLength(50);
        expect((messages as any)[0].text).toBe("message 25");
        expect((messages as any)[49].text).toBe("message 74");
    });

    it("paginates older history newest-first with a server page cap of 50", async () => {
        const t = setup();
        const externalId = "user_pagination_pages";
        const { threadId } = await seedUserThreadAndMessages(t, externalId, 75);
        const authed = t.withIdentity({ subject: externalId, issuer: "test" });

        const firstPage = await authed.query(
            api.agent.threads.listMessagesPage,
            {
                threadId: threadId as any,
                paginationOpts: { numItems: 100, cursor: null },
            },
        );
        expect(firstPage.page).toHaveLength(50);
        expect((firstPage.page as any)[0].text).toBe("message 74");
        expect((firstPage.page as any)[49].text).toBe("message 25");
        expect(firstPage.isDone).toBe(false);

        const secondPage = await authed.query(
            api.agent.threads.listMessagesPage,
            {
                threadId: threadId as any,
                paginationOpts: { numItems: 50, cursor: firstPage.continueCursor },
            },
        );
        expect(secondPage.page).toHaveLength(25);
        expect((secondPage.page as any)[0].text).toBe("message 24");
        expect((secondPage.page as any)[24].text).toBe("message 0");
        expect(secondPage.isDone).toBe(true);
    });
});

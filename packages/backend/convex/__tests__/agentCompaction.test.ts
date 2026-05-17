import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";
import { PROMPT_VERSION } from "../agent/system";

const modules = import.meta.glob("../**/*.ts");

function setup() {
    return convexTest(schema, modules);
}

async function seedUserAndThread(
    t: ReturnType<typeof setup>,
    externalId: string,
): Promise<{ userId: string; threadId: string }> {
    return await t.run(async (ctx: any) => {
        const userId = await ctx.db.insert("users", {
            externalId,
            email: `${externalId}@example.test`,
        });
        const threadId = await ctx.db.insert("agentThreads", {
            userId,
            title: undefined,
            isArchived: false,
            lastTurnAt: Date.now(),
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
        return { userId, threadId };
    });
}

describe("agent compaction (CROWDEV-438)", () => {
    afterEach(() => {
        vi.doUnmock("ai");
        vi.resetModules();
        delete process.env.AGENT_COMPACTION_MESSAGE_THRESHOLD;
        delete process.env.AGENT_COMPACTION_INPUT_TOKEN_THRESHOLD;
    });

    it("summarizes the unsummarized tail and advances the marker cumulatively", async () => {
        const generateText = vi.fn().mockResolvedValue({
            text: "Cumulative summary through tail 1.",
        });
        vi.doMock("ai", () => ({ generateText }));
        process.env.AGENT_COMPACTION_MESSAGE_THRESHOLD = "4";
        process.env.AGENT_COMPACTION_INPUT_TOKEN_THRESHOLD = "999999";

        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_compaction_tail");
        const { expectedMarkerId } = await t.run(async (ctx: any) => {
            const now = Date.now();
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "old prompt",
                createdAt: now,
                isStreaming: false,
            });
            const priorMarker = await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "assistant",
                text: "old reply",
                createdAt: now + 1,
                isStreaming: false,
            });
            const tail0 = await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "tail 0",
                createdAt: now + 2,
                isStreaming: false,
            });
            const tail1 = await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "assistant",
                text: "tail 1",
                createdAt: now + 3,
                isStreaming: false,
            });
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "tail 2",
                createdAt: now + 4,
                isStreaming: false,
            });
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "assistant",
                text: "tail 3",
                createdAt: now + 5,
                isStreaming: false,
            });
            await ctx.db.patch(threadId, {
                summaryText: "Prior summary through old reply.",
                summaryUpToMessageId: priorMarker,
            });
            expect(tail0).toBeTruthy();
            return { expectedMarkerId: tail1 };
        });

        await t.action(
            (internal as any).agent.compaction.maybeCompact,
            { threadId },
        );

        expect(generateText).toHaveBeenCalledTimes(1);
        const call = generateText.mock.calls[0]?.[0] as {
            messages: Array<{ role: string; content: string }>;
        };
        expect(call.messages).toEqual([
            {
                role: "system",
                content: "Previous cumulative summary:\nPrior summary through old reply.",
            },
            { role: "user", content: "tail 0" },
            { role: "assistant", content: "tail 1" },
        ]);

        const thread = await t.run(async (ctx: any) => ctx.db.get(threadId));
        expect(thread?.summaryText).toBe("Cumulative summary through tail 1.");
        expect(thread?.summaryUpToMessageId).toBe(expectedMarkerId);
    });
});

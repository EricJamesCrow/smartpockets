/**
 * CROWDEV-395: regression tests for `editAndResendUserTurn`.
 *
 * The mutation must:
 *   - Replace the target user message's text with the new prompt.
 *   - Set `isStreaming: true` on the target row so the UI's run-in-flight
 *     derivation kicks in.
 *   - Truncate every message in the thread with `createdAt > target` —
 *     assistant text, tool calls, tool results, and any later user/assistant
 *     turns layered on top.
 *   - Bump `agentThreads.lastTurnAt` and clear `cancelledAtTurn`.
 *   - Reject when the target row's role isn't "user".
 *   - Reject when the viewer doesn't own the thread.
 *   - Reject empty / overlong text.
 */

import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";
import { PROMPT_VERSION } from "../agent/system";

const modules = import.meta.glob("../**/*.ts");

const USER_A = { subject: "user_edit_a", issuer: "test" };
const USER_B = { subject: "user_edit_b", issuer: "test" };

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
            lastTurnAt: 1000,
            promptVersion: PROMPT_VERSION,
            summaryText: undefined,
            summaryUpToMessageId: undefined,
            componentThreadId: `ct_${Math.random().toString(36).slice(2, 14)}`,
            readCallCount: 0,
            cancelledAtTurn: 999,
        });
        return { userId, threadId };
    });
}

async function getMessagesAsc(t: ReturnType<typeof setup>, threadId: string) {
    return await t.run(async (ctx: any) => {
        return await ctx.db
            .query("agentMessages")
            .withIndex("by_creation_time")
            .filter((q: any) => q.eq(q.field("agentThreadId"), threadId))
            .collect();
    });
}

async function getThread(t: ReturnType<typeof setup>, threadId: string) {
    return await t.run(async (ctx: any) => {
        return await ctx.db.get(threadId);
    });
}

describe("editAndResendUserTurn (CROWDEV-395)", () => {
    it("replaces text, deletes downstream messages, and reflags isStreaming", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, USER_A.subject);

        const targetUserId = await t.run(async (ctx: any) => {
            const now = Date.now();
            // Original turn: user → assistant (with one tool call).
            const userId = await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "what credit cards do I have?",
                createdAt: now,
                isStreaming: false,
            });
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "tool",
                toolName: "listCreditCards",
                toolResultJson: JSON.stringify({ ok: true, data: { rows: [] } }),
                createdAt: now + 1,
                isStreaming: false,
            });
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "assistant",
                text: "you have 3 cards",
                createdAt: now + 2,
                isStreaming: false,
            });
            // Second turn layered on top.
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "and the limits?",
                createdAt: now + 100,
                isStreaming: false,
            });
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "assistant",
                text: "limit summary",
                createdAt: now + 101,
                isStreaming: false,
            });
            return userId;
        });

        await t
            .withIdentity(USER_A)
            .mutation(api.agent.threads.editAndResendUserTurn, {
                messageId: targetUserId,
                newText: "show me my recent transactions",
            });

        const remaining = await getMessagesAsc(t, threadId);
        expect(remaining).toHaveLength(1);
        expect(remaining[0]?._id).toBe(targetUserId);
        expect(remaining[0]?.role).toBe("user");
        expect(remaining[0]?.text).toBe("show me my recent transactions");
        expect(remaining[0]?.isStreaming).toBe(true);

        // Thread metadata bumped + cancellation flag cleared.
        const thread = await getThread(t, threadId);
        expect(thread?.lastTurnAt).toBeGreaterThan(1000);
        expect(thread?.cancelledAtTurn).toBeUndefined();
    });

    it("rejects editing a message in another user's thread", async () => {
        const t = setup();
        // Set up two distinct users + threads.
        await seedUserAndThread(t, USER_A.subject);
        const { threadId: threadB } = await seedUserAndThread(t, USER_B.subject);

        const targetUserId = await t.run(async (ctx: any) => {
            return await ctx.db.insert("agentMessages", {
                agentThreadId: threadB,
                role: "user",
                text: "user B's secret prompt",
                createdAt: Date.now(),
                isStreaming: false,
            });
        });

        await expect(
            t
                .withIdentity(USER_A)
                .mutation(api.agent.threads.editAndResendUserTurn, {
                    messageId: targetUserId,
                    newText: "spoofed edit attempt",
                }),
        ).rejects.toThrow(/Not authorized/);

        // Original message untouched.
        const messages = await getMessagesAsc(t, threadB);
        expect(messages).toHaveLength(1);
        expect(messages[0]?.text).toBe("user B's secret prompt");
    });

    it("rejects editing a non-user role message", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, USER_A.subject);

        const assistantId = await t.run(async (ctx: any) => {
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "hi",
                createdAt: Date.now(),
                isStreaming: false,
            });
            return await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "assistant",
                text: "hello",
                createdAt: Date.now() + 1,
                isStreaming: false,
            });
        });

        await expect(
            t
                .withIdentity(USER_A)
                .mutation(api.agent.threads.editAndResendUserTurn, {
                    messageId: assistantId,
                    newText: "trying to edit assistant",
                }),
        ).rejects.toThrow(/user messages/);
    });

    it("rejects empty text", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, USER_A.subject);

        const userId = await t.run(async (ctx: any) => {
            return await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "original",
                createdAt: Date.now(),
                isStreaming: false,
            });
        });

        await expect(
            t
                .withIdentity(USER_A)
                .mutation(api.agent.threads.editAndResendUserTurn, {
                    messageId: userId,
                    newText: "   ",
                }),
        ).rejects.toThrow(/empty/);
    });

    it("preserves prior turns whose createdAt is strictly less than the target", async () => {
        // Edit on the SECOND user message: turn 1 (user + assistant) must
        // remain intact; turn 2's assistant + everything later must be deleted.
        const t = setup();
        const { threadId } = await seedUserAndThread(t, USER_A.subject);

        const { secondUserId } = await t.run(async (ctx: any) => {
            const now = Date.now();
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "first prompt",
                createdAt: now,
                isStreaming: false,
            });
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "assistant",
                text: "first reply",
                createdAt: now + 1,
                isStreaming: false,
            });
            const second = await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "second prompt",
                createdAt: now + 100,
                isStreaming: false,
            });
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "assistant",
                text: "second reply",
                createdAt: now + 101,
                isStreaming: false,
            });
            return { secondUserId: second };
        });

        await t
            .withIdentity(USER_A)
            .mutation(api.agent.threads.editAndResendUserTurn, {
                messageId: secondUserId,
                newText: "edited second prompt",
            });

        const messages = await getMessagesAsc(t, threadId);
        expect(messages).toHaveLength(3);
        expect(messages[0]?.role).toBe("user");
        expect(messages[0]?.text).toBe("first prompt");
        expect(messages[1]?.role).toBe("assistant");
        expect(messages[1]?.text).toBe("first reply");
        expect(messages[2]?._id).toBe(secondUserId);
        expect(messages[2]?.text).toBe("edited second prompt");
        expect(messages[2]?.isStreaming).toBe(true);
    });
});

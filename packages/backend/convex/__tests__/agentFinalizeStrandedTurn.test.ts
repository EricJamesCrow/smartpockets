/**
 * CROWDEV-367: regression tests for `finalizeUserTurnIfStranded`.
 *
 * `runAgentTurn` calls this from its `finally` block to clear the
 * user-marker `isStreaming` flag on the error path (provider 5xx, network
 * failure, Zod validation error in `loadForStream` → `standardizePrompt`,
 * invalid model id, etc.) where no assistant row lands. Without this
 * cleanup, the typing indicator + stop button stay visible forever and
 * the next user send doesn't clear the prior row (`appendUserTurn` only
 * clears `cancelledAtTurn`).
 *
 * The mutation must:
 *   - Flip `isStreaming: false` on the most-recent user row when it's
 *     true and no assistant row exists creation-time-after it.
 *   - No-op when an assistant row landed (success path).
 *   - No-op when the flag is already false (abort path — `abortRun`
 *     already flipped it).
 *   - No-op on empty thread / missing user row.
 *   - Be idempotent (safe to call from a finally block on every turn).
 */

import { describe, expect, it } from "vitest";
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

describe("finalizeUserTurnIfStranded (CROWDEV-367)", () => {
    it("flips isStreaming false on a stranded user row when no assistant row landed", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_stranded");

        // Simulate `appendUserTurn`: insert a user row with isStreaming: true.
        // Then `streamText` errors out before any assistant row lands.
        await t.run(async (ctx: any) => {
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "show me my last 10 transactions",
                createdAt: Date.now(),
                isStreaming: true,
            });
        });

        await t.mutation(
            (internal as any).agent.threads.finalizeUserTurnIfStranded,
            { threadId },
        );

        const messages = await getMessagesAsc(t, threadId);
        expect(messages).toHaveLength(1);
        expect(messages[0]?.role).toBe("user");
        expect(messages[0]?.isStreaming).toBe(false);
    });

    it("preserves isStreaming on the success path (assistant row landed after user)", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_success");

        await t.run(async (ctx: any) => {
            const now = Date.now();
            // user-marker row (still flagged true; we never bother flipping
            // it on the success path because the UI is gated by
            // `hasAssistantAfter`).
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "hi",
                createdAt: now,
                isStreaming: true,
            });
            // assistant reply landed
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "assistant",
                text: "hello!",
                createdAt: now + 1,
                isStreaming: false,
            });
        });

        await t.mutation(
            (internal as any).agent.threads.finalizeUserTurnIfStranded,
            { threadId },
        );

        const messages = await getMessagesAsc(t, threadId);
        const userRow = messages.find((m: any) => m.role === "user");
        // Mutation must NOT touch the user row when an assistant row landed
        // — the UI is already showing the run as complete via
        // `hasAssistantAfter`, and patching the flag would be a wasted
        // write that risks racing with future logic that depends on it.
        expect(userRow?.isStreaming).toBe(true);
    });

    it("no-ops when the flag is already false (abort path)", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_aborted");

        // Simulate the post-`abortRun` state: user row's flag already false,
        // and a system tombstone written.
        await t.run(async (ctx: any) => {
            const now = Date.now();
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "long prompt that user cancelled",
                createdAt: now,
                isStreaming: false,
            });
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "system",
                text: "Run stopped by user.",
                createdAt: now + 1,
                isStreaming: false,
            });
        });

        await t.mutation(
            (internal as any).agent.threads.finalizeUserTurnIfStranded,
            { threadId },
        );

        const messages = await getMessagesAsc(t, threadId);
        const userRow = messages.find((m: any) => m.role === "user");
        expect(userRow?.isStreaming).toBe(false); // unchanged
        // Tombstone untouched.
        expect(messages.some((m: any) => m.role === "system" && m.text === "Run stopped by user.")).toBe(true);
    });

    it("no-ops when only system rows exist (no user row to finalize)", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_systemonly");

        await t.run(async (ctx: any) => {
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "system",
                text: "thread initialised",
                createdAt: Date.now(),
                isStreaming: false,
            });
        });

        // Should not throw, should not patch.
        await t.mutation(
            (internal as any).agent.threads.finalizeUserTurnIfStranded,
            { threadId },
        );

        const messages = await getMessagesAsc(t, threadId);
        expect(messages).toHaveLength(1);
        expect(messages[0]?.role).toBe("system");
    });

    it("no-ops on an empty thread", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_empty");

        await t.mutation(
            (internal as any).agent.threads.finalizeUserTurnIfStranded,
            { threadId },
        );

        const messages = await getMessagesAsc(t, threadId);
        expect(messages).toHaveLength(0);
    });

    it("targets only the most-recent user row when older user rows exist with assistant replies between them", async () => {
        // Multi-turn thread: turn 1 succeeded, turn 2 errored mid-stream.
        // Only the turn-2 user row should be flipped; turn 1's row stays
        // however it was (success-path no-touch policy).
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_multiturn");

        await t.run(async (ctx: any) => {
            const now = Date.now();
            // turn 1: user → assistant (success)
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "first prompt",
                createdAt: now,
                isStreaming: true, // success path leaves this true
            });
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "assistant",
                text: "first reply",
                createdAt: now + 1,
                isStreaming: false,
            });
            // turn 2: user → (streamText error, no assistant row)
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "second prompt that errored",
                createdAt: now + 100,
                isStreaming: true,
            });
        });

        await t.mutation(
            (internal as any).agent.threads.finalizeUserTurnIfStranded,
            { threadId },
        );

        const messages = await getMessagesAsc(t, threadId);
        const userRows = messages.filter((m: any) => m.role === "user");
        expect(userRows).toHaveLength(2);
        // Turn 1 untouched (its assistant followup landed)
        expect(userRows[0]?.text).toBe("first prompt");
        expect(userRows[0]?.isStreaming).toBe(true);
        // Turn 2 cleared (no assistant followup)
        expect(userRows[1]?.text).toBe("second prompt that errored");
        expect(userRows[1]?.isStreaming).toBe(false);
    });

    it("is idempotent — second call after first patch is a no-op", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_idempotent");

        await t.run(async (ctx: any) => {
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "hi",
                createdAt: Date.now(),
                isStreaming: true,
            });
        });

        await t.mutation(
            (internal as any).agent.threads.finalizeUserTurnIfStranded,
            { threadId },
        );
        // Second call shouldn't throw or re-patch.
        await t.mutation(
            (internal as any).agent.threads.finalizeUserTurnIfStranded,
            { threadId },
        );

        const messages = await getMessagesAsc(t, threadId);
        expect(messages).toHaveLength(1);
        expect(messages[0]?.isStreaming).toBe(false);
    });
});

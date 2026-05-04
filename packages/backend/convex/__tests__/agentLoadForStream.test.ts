/**
 * Regression tests for CROWDEV-355:
 *   `loadForStream` was reducing every persisted `agentMessages` row to
 *   `{role, content: text ?? ""}`, including `role: "tool"` rows whose
 *   `text` is undefined (the actual data lives on `toolResultJson`). The
 *   Vercel AI SDK v6's `standardizePrompt` Zod-validates the result
 *   against `modelMessageSchema` before any provider call;
 *   `ToolModelMessage` requires `content: Array<ToolResultPart |
 *   ToolApprovalResponse>`, so sending a string failed validation and
 *   `streamText` threw `InvalidPromptError`. `runAgentTurn`'s try/catch
 *   swallowed it, no assistant row persisted, the user-marker
 *   `isStreaming` flag stayed true, and the UI never received a reply on
 *   turn 2+ after any tool call.
 *
 *   These tests pin the fix:
 *     - Filter `tool` rows entirely (we don't store toolCallId for full
 *       reconstruction)
 *     - Filter `assistant` rows with empty/undefined text (tool-call-only
 *       carrier steps from the first onStepFinish)
 *     - Filter `system` rows (tombstones; system prompt is rendered fresh)
 *     - Output passes `modelMessageSchema` validation
 *     - Multi-turn-after-tool-call: turn-2 input is valid even when turn-1
 *       persisted a tool call + tool result
 */

import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";
import { PROMPT_VERSION } from "../agent/system";

// Validate against the exact Zod schema the AI SDK uses internally.
// `standardizePrompt` calls `safeValidateTypes(messages, z.array(modelMessageSchema))`
// before forwarding to the provider; if our `loadForStream` output fails
// this schema, `streamText` would throw `InvalidPromptError` and silently
// kill the next agent turn — which is exactly the bug we're fixing here.
import { modelMessageSchema } from "ai";

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

/**
 * Seed the exact message shape `runAgentTurn` writes after a turn with a
 * tool call (e.g., user asks a question, agent calls `searchMerchants`,
 * agent replies with a prose summary).
 */
async function seedTurnWithToolCall(
    t: ReturnType<typeof setup>,
    threadId: string,
    userText: string,
    assistantSummary: string,
): Promise<void> {
    await t.run(async (ctx: any) => {
        const now = Date.now();
        // 1. user message
        await ctx.db.insert("agentMessages", {
            agentThreadId: threadId,
            role: "user",
            text: userText,
            createdAt: now,
            isStreaming: false,
        });
        // 2. assistant tool-call-carrier row (text undefined, toolCalls populated).
        await ctx.db.insert("agentMessages", {
            agentThreadId: threadId,
            role: "assistant",
            text: undefined,
            toolCallsJson: JSON.stringify([
                {
                    toolCallId: "tc_call_1",
                    toolName: "search_merchants",
                    input: { query: "amazon" },
                },
            ]),
            createdAt: now + 1,
            isStreaming: false,
        });
        // 3. tool result row (text undefined, toolResultJson populated).
        await ctx.db.insert("agentMessages", {
            agentThreadId: threadId,
            role: "tool",
            text: undefined,
            toolName: "search_merchants",
            toolResultJson: JSON.stringify({
                ok: true,
                data: { merchants: [{ name: "Amazon", count: 5, totalAmount: 250 }] },
            }),
            createdAt: now + 2,
            isStreaming: false,
        });
        // 4. final assistant prose response.
        await ctx.db.insert("agentMessages", {
            agentThreadId: threadId,
            role: "assistant",
            text: assistantSummary,
            createdAt: now + 3,
            isStreaming: false,
        });
    });
}

async function seedUserMessage(
    t: ReturnType<typeof setup>,
    threadId: string,
    text: string,
): Promise<void> {
    await t.run(async (ctx: any) => {
        await ctx.db.insert("agentMessages", {
            agentThreadId: threadId,
            role: "user",
            text,
            createdAt: Date.now() + 100,
            isStreaming: true,
        });
    });
}

describe("loadForStream (CROWDEV-355)", () => {
    it("returns valid ModelMessage[] after a tool-using turn (the bug repro)", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_lfs_a");
        await seedTurnWithToolCall(
            t,
            threadId,
            "find all my Amazon charges",
            "You have 5 Amazon charges totalling $250.",
        );
        // Turn 2 — this is the message that previously never got a reply.
        await seedUserMessage(t, threadId, "what about Walmart?");

        const result = (await t.query(
            (internal as any).agent.threads.loadForStream,
            { threadId },
        )) as Array<{ role: string; content: string }>;

        // Must Zod-validate against the AI SDK's ModelMessage schema; this
        // is the exact validation `streamText` runs internally before
        // forwarding to the provider. If this fails, `streamText` would
        // throw InvalidPromptError on the next agent turn and the UI
        // would silently hang.
        for (const m of result) {
            const validation = modelMessageSchema.safeParse(m);
            expect(
                validation.success,
                `ModelMessage validation failed for ${JSON.stringify(m)}`,
            ).toBe(true);
        }

        // No tool rows leak through (would fail Zod validation above, but
        // assert explicitly for clarity).
        expect(result.every((m) => m.role === "user" || m.role === "assistant")).toBe(true);

        // No empty-content rows leak through (would also fail provider
        // validation downstream — Anthropic rejects empty text blocks).
        expect(result.every((m) => typeof m.content === "string" && m.content.length > 0)).toBe(true);
    });

    it("preserves the conversational thread shape: user → assistant → user", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_lfs_b");
        await seedTurnWithToolCall(
            t,
            threadId,
            "find all my Amazon charges",
            "You have 5 Amazon charges totalling $250.",
        );
        await seedUserMessage(t, threadId, "what about Walmart?");

        const result = (await t.query(
            (internal as any).agent.threads.loadForStream,
            { threadId },
        )) as Array<{ role: string; content: string }>;

        // Expected: 3 rows (turn-1 user, turn-1 assistant prose, turn-2 user).
        // Dropped: turn-1 assistant tool-call carrier (empty text), turn-1
        // tool row (invalid role for our string-only output).
        expect(result).toEqual([
            { role: "user", content: "find all my Amazon charges" },
            { role: "assistant", content: "You have 5 Amazon charges totalling $250." },
            { role: "user", content: "what about Walmart?" },
        ]);
    });

    it("filters system tombstone rows (e.g., 'Run stopped by user.')", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_lfs_c");
        await t.run(async (ctx: any) => {
            const now = Date.now();
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "hi",
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
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "actually, please continue",
                createdAt: now + 2,
                isStreaming: true,
            });
        });

        const result = (await t.query(
            (internal as any).agent.threads.loadForStream,
            { threadId },
        )) as Array<{ role: string; content: string }>;

        expect(result).toEqual([
            { role: "user", content: "hi" },
            { role: "user", content: "actually, please continue" },
        ]);
    });

    it("returns an empty array for a brand-new thread (no messages yet)", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_lfs_d");
        const result = await t.query(
            (internal as any).agent.threads.loadForStream,
            { threadId },
        );
        expect(result).toEqual([]);
    });

    it("handles a text-only conversation (no tools) unchanged", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_lfs_e");
        await t.run(async (ctx: any) => {
            const now = Date.now();
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "hello",
                createdAt: now,
                isStreaming: false,
            });
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "assistant",
                text: "Hi! How can I help?",
                createdAt: now + 1,
                isStreaming: false,
            });
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "tell me a joke",
                createdAt: now + 2,
                isStreaming: true,
            });
        });

        const result = (await t.query(
            (internal as any).agent.threads.loadForStream,
            { threadId },
        )) as Array<{ role: string; content: string }>;

        for (const m of result) {
            expect(modelMessageSchema.safeParse(m).success).toBe(true);
        }
        expect(result).toEqual([
            { role: "user", content: "hello" },
            { role: "assistant", content: "Hi! How can I help?" },
            { role: "user", content: "tell me a joke" },
        ]);
    });
});

/**
 * CROWDEV-409: regression tests for the incremental-streaming assistant
 * row lifecycle.
 *
 * The bug: assistant text was only persisted at step-end (via `persistStep`
 * with `isStreaming: false` and the full step text in one shot). The chat
 * UI's `useSmoothText` smooths between text updates and gates on
 * `startStreaming` (the row's `isStreaming` flag) at the moment the bubble
 * mounts — so a row that arrives already-finalized rendered all at once
 * with no smoothing.
 *
 * Fix: three new internal mutations split assistant text persistence into
 * lifecycle stages so the runtime can patch text incrementally as tokens
 * arrive from `streamText`.
 *
 * These tests pin each stage's contract:
 *   - `insertStreamingAssistantRow` — inserts with `isStreaming: true` and
 *     empty text; returns the row id.
 *   - `patchStreamingAssistantText` — patches text without touching the
 *     streaming flag.
 *   - `finalizeStreamingAssistantRow` — flips `isStreaming: false`, sets
 *     the canonical text + usage fields.
 *   - `finalizeStrandedStreamingAssistantRow` — defensive cleanup for the
 *     error/abort path; preserves whatever partial text arrived.
 */

import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api, internal } from "../_generated/api";
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

describe("streaming assistant row lifecycle (CROWDEV-409)", () => {
    it("insertStreamingAssistantRow creates a row with isStreaming:true and empty text", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_stream_a");

        const rowId = await t.mutation(
            (internal as any).agent.threads.insertStreamingAssistantRow,
            { threadId, modelId: "claude-sonnet-test" },
        );

        const row = await t.run(async (ctx: any) => ctx.db.get(rowId));
        expect(row).toBeTruthy();
        expect(row.role).toBe("assistant");
        expect(row.text).toBe("");
        expect(row.isStreaming).toBe(true);
        expect(row.modelId).toBe("claude-sonnet-test");
        // Streaming row carries no tool call / result data.
        expect(row.toolCallsJson).toBeUndefined();
        expect(row.toolResultJson).toBeUndefined();
    });

    it("patchStreamingAssistantText updates text but preserves isStreaming:true", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_stream_b");

        const rowId = await t.mutation(
            (internal as any).agent.threads.insertStreamingAssistantRow,
            { threadId },
        );

        await t.mutation(
            (internal as any).agent.threads.patchStreamingAssistantText,
            { messageId: rowId, text: "Hello, " },
        );
        await t.mutation(
            (internal as any).agent.threads.patchStreamingAssistantText,
            { messageId: rowId, text: "Hello, world!" },
        );

        const row = await t.run(async (ctx: any) => ctx.db.get(rowId));
        expect(row.text).toBe("Hello, world!");
        expect(row.isStreaming).toBe(true);
    });

    it("finalizeStreamingAssistantRow flips isStreaming:false and records usage", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_stream_c");

        const rowId = await t.mutation(
            (internal as any).agent.threads.insertStreamingAssistantRow,
            { threadId, modelId: "claude-sonnet-test" },
        );

        await t.mutation(
            (internal as any).agent.threads.finalizeStreamingAssistantRow,
            {
                messageId: rowId,
                text: "Hello, world!",
                tokensIn: 42,
                tokensOut: 17,
                modelId: "claude-sonnet-test",
            },
        );

        const row = await t.run(async (ctx: any) => ctx.db.get(rowId));
        expect(row.text).toBe("Hello, world!");
        expect(row.isStreaming).toBe(false);
        expect(row.tokensIn).toBe(42);
        expect(row.tokensOut).toBe(17);
        expect(row.modelId).toBe("claude-sonnet-test");
    });

    it("finalizeStrandedStreamingAssistantRow flips isStreaming:false and preserves text", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_stream_d");

        const rowId = await t.mutation(
            (internal as any).agent.threads.insertStreamingAssistantRow,
            { threadId },
        );
        await t.mutation(
            (internal as any).agent.threads.patchStreamingAssistantText,
            { messageId: rowId, text: "Partial reply before stop" },
        );

        await t.mutation(
            (internal as any).agent.threads.finalizeStrandedStreamingAssistantRow,
            { messageId: rowId },
        );

        const row = await t.run(async (ctx: any) => ctx.db.get(rowId));
        expect(row.isStreaming).toBe(false);
        // Partial text MUST be preserved so the user can read what they got.
        expect(row.text).toBe("Partial reply before stop");
    });

    it("finalizeStrandedStreamingAssistantRow is idempotent on already-finalized rows", async () => {
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_stream_e");

        const rowId = await t.mutation(
            (internal as any).agent.threads.insertStreamingAssistantRow,
            { threadId },
        );
        await t.mutation(
            (internal as any).agent.threads.finalizeStreamingAssistantRow,
            {
                messageId: rowId,
                text: "Final reply",
                tokensIn: 1,
                tokensOut: 1,
            },
        );

        // Second call should not throw and should leave the row untouched.
        await t.mutation(
            (internal as any).agent.threads.finalizeStrandedStreamingAssistantRow,
            { messageId: rowId },
        );

        const row = await t.run(async (ctx: any) => ctx.db.get(rowId));
        expect(row.isStreaming).toBe(false);
        expect(row.text).toBe("Final reply");
    });

    it("loadForStream skips assistant rows still in isStreaming:true (stranded after a failed turn)", async () => {
        // Defense for the case where a prior turn errored mid-stream AND the
        // `finally` cleanup also failed (rare but possible). The next turn's
        // `loadForStream` must NOT surface the half-written reply to the model.
        const t = setup();
        const { threadId } = await seedUserAndThread(t, "user_stream_f");

        await t.run(async (ctx: any) => {
            const now = Date.now();
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "hi",
                createdAt: now,
                isStreaming: false,
            });
            // Stranded streaming assistant row from a prior failed turn.
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "assistant",
                text: "I was going to say something but the str",
                createdAt: now + 1,
                isStreaming: true,
            });
            // Subsequent user message (the new turn).
            await ctx.db.insert("agentMessages", {
                agentThreadId: threadId,
                role: "user",
                text: "are you there?",
                createdAt: now + 2,
                isStreaming: true,
            });
        });

        const result = (await t.query(
            (internal as any).agent.threads.loadForStream,
            { threadId },
        )) as Array<{ role: string; content: string }>;

        // The stranded streaming row must be dropped; only the two user rows
        // should reach the model.
        expect(result).toEqual([
            { role: "user", content: "hi" },
            { role: "user", content: "are you there?" },
        ]);
    });

    it("listMessages surfaces the streaming row to the UI before finalization", async () => {
        const t = setup();
        const externalId = "user_stream_g";
        const { threadId } = await seedUserAndThread(t, externalId);

        const rowId = await t.mutation(
            (internal as any).agent.threads.insertStreamingAssistantRow,
            { threadId },
        );
        await t.mutation(
            (internal as any).agent.threads.patchStreamingAssistantText,
            { messageId: rowId, text: "stream..." },
        );

        // listMessages is viewer-scoped (uses `ctx.viewerX()` which looks up
        // the `users` row by `externalId == identity.subject`).
        const authed = t.withIdentity({ subject: externalId, issuer: "test" });
        const messages = await authed.query(
            api.agent.threads.listMessages,
            { threadId: threadId as any },
        );

        expect(Array.isArray(messages)).toBe(true);
        // The streaming row is the only message in the thread; the UI sees
        // it with isStreaming:true and partial text.
        expect(messages).toHaveLength(1);
        expect((messages as any)[0].role).toBe("assistant");
        expect((messages as any)[0].text).toBe("stream...");
        expect((messages as any)[0].isStreaming).toBe(true);
    });
});

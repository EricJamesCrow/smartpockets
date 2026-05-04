/**
 * CROWDEV-351: automatic thread titling tests.
 *
 * Verifies:
 *   1. `setTitleIfUnset` patches `agentThreads.title` when no title is set.
 *   2. `setTitleIfUnset` no-ops when a title is already set (preserves manual
 *      renames or prior auto-titles — also closes the race where a manual
 *      rename lands between the action's read and the action's write).
 *   3. `generateThreadTitle` skips early when the thread already has a title
 *      (no LLM call, no patch).
 *   4. `generateThreadTitle` skips when there is no first user message (e.g.,
 *      thread with no user prompts yet — defensive against scheduling races).
 *   5. `generateThreadTitle` calls the model and patches the title when there
 *      IS a first user message and no existing title (mocked LLM).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";
import plaidSchema from "../../../convex-plaid/src/component/schema";

const modules = import.meta.glob("../**/*.ts");
const plaidModules = import.meta.glob("../../../convex-plaid/src/component/**/*.ts");

function setup() {
    const t = convexTest(schema, modules);
    t.registerComponent("plaid", plaidSchema as any, plaidModules);
    return t;
}

async function seedUser(t: any, externalId = "user_titling"): Promise<string> {
    return await t.run(async (ctx: any) => {
        return await ctx.db.insert("users", {
            externalId,
            email: `${externalId}@example.test`,
        });
    });
}

async function seedThread(
    t: any,
    userId: string,
    opts: { title?: string } = {},
): Promise<string> {
    return await t.run(async (ctx: any) => {
        return await ctx.db.insert("agentThreads", {
            userId,
            title: opts.title,
            isArchived: false,
            lastTurnAt: Date.now(),
            promptVersion: "test_v1",
            componentThreadId: `ct_${Math.random().toString(36).slice(2, 14)}`,
            readCallCount: 0,
        });
    });
}

async function seedMessage(
    t: any,
    threadId: string,
    role: "user" | "assistant" | "system" | "tool",
    text: string,
): Promise<string> {
    return await t.run(async (ctx: any) => {
        return await ctx.db.insert("agentMessages", {
            agentThreadId: threadId,
            role,
            text,
            createdAt: Date.now(),
            isStreaming: false,
        });
    });
}

describe("agent titling — setTitleIfUnset (CROWDEV-351)", () => {
    it("patches title when none is set", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_set_unset_a");
        const threadId = await seedThread(t, userId);

        const wrote = await t.mutation(
            (internal as any).agent.titling.setTitleIfUnset,
            { threadId, title: "Credit card review" },
        );

        expect(wrote).toBe(true);
        const thread = await t.run(async (ctx: any) => ctx.db.get(threadId));
        expect(thread?.title).toBe("Credit card review");
    });

    it("no-ops when a title is already set (preserves prior value)", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_set_unset_b");
        const threadId = await seedThread(t, userId, {
            title: "Manually renamed by user",
        });

        const wrote = await t.mutation(
            (internal as any).agent.titling.setTitleIfUnset,
            { threadId, title: "Auto title attempting overwrite" },
        );

        expect(wrote).toBe(false);
        const thread = await t.run(async (ctx: any) => ctx.db.get(threadId));
        expect(thread?.title).toBe("Manually renamed by user");
    });

    it("rejects empty title strings", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_set_unset_c");
        const threadId = await seedThread(t, userId);

        const wrote = await t.mutation(
            (internal as any).agent.titling.setTitleIfUnset,
            { threadId, title: "   " },
        );

        expect(wrote).toBe(false);
        const thread = await t.run(async (ctx: any) => ctx.db.get(threadId));
        expect(thread?.title).toBeUndefined();
    });

    it("truncates titles longer than 60 chars", async () => {
        const t = setup();
        const userId = await seedUser(t, "user_set_unset_d");
        const threadId = await seedThread(t, userId);
        const longTitle = "A very very very very very long title that goes well past sixty characters";

        await t.mutation(
            (internal as any).agent.titling.setTitleIfUnset,
            { threadId, title: longTitle },
        );

        const thread = await t.run(async (ctx: any) => ctx.db.get(threadId));
        expect(thread?.title?.length).toBeLessThanOrEqual(60);
        expect(thread?.title).toBe(longTitle.slice(0, 60));
    });
});

describe("agent titling — generateThreadTitle (CROWDEV-351)", () => {
    afterEach(() => {
        vi.doUnmock("ai");
        vi.resetModules();
    });

    it("skips early when the thread already has a title (no model call)", async () => {
        // If this calls the model, the test environment has no API key and
        // would either fail or hang. Tracking the mock spy lets us assert the
        // function returned BEFORE calling generateText.
        const generateText = vi.fn().mockResolvedValue({ text: "should not be called" });
        vi.doMock("ai", () => ({ generateText }));

        const t = setup();
        const userId = await seedUser(t, "user_skip_titled");
        const threadId = await seedThread(t, userId, {
            title: "Existing title",
        });
        await seedMessage(t, threadId, "user", "Hello there");

        await t.action(
            (internal as any).agent.titling.generateThreadTitle,
            { threadId },
        );

        expect(generateText).not.toHaveBeenCalled();
        const thread = await t.run(async (ctx: any) => ctx.db.get(threadId));
        expect(thread?.title).toBe("Existing title");
    });

    it("skips when there is no first user message (no model call)", async () => {
        const generateText = vi.fn().mockResolvedValue({ text: "should not be called" });
        vi.doMock("ai", () => ({ generateText }));

        const t = setup();
        const userId = await seedUser(t, "user_skip_no_msg");
        const threadId = await seedThread(t, userId);

        await t.action(
            (internal as any).agent.titling.generateThreadTitle,
            { threadId },
        );

        expect(generateText).not.toHaveBeenCalled();
        const thread = await t.run(async (ctx: any) => ctx.db.get(threadId));
        expect(thread?.title).toBeUndefined();
    });

    it("calls model and patches title when first user message exists and no title set", async () => {
        const generateText = vi.fn().mockResolvedValue({ text: "Credit Card Review" });
        vi.doMock("ai", () => ({ generateText }));

        const t = setup();
        const userId = await seedUser(t, "user_generate_a");
        const threadId = await seedThread(t, userId);
        await seedMessage(t, threadId, "user", "Show me my credit cards");
        await seedMessage(t, threadId, "assistant", "Here are your credit cards: ...");

        await t.action(
            (internal as any).agent.titling.generateThreadTitle,
            { threadId },
        );

        expect(generateText).toHaveBeenCalledTimes(1);
        const thread = await t.run(async (ctx: any) => ctx.db.get(threadId));
        expect(thread?.title).toBe("Credit Card Review");
    });

    it("strips wrapping quotes and trailing periods from model output", async () => {
        const generateText = vi.fn().mockResolvedValue({ text: '"Credit Card Review."' });
        vi.doMock("ai", () => ({ generateText }));

        const t = setup();
        const userId = await seedUser(t, "user_generate_clean");
        const threadId = await seedThread(t, userId);
        await seedMessage(t, threadId, "user", "Show me my credit cards");
        await seedMessage(t, threadId, "assistant", "Here are your credit cards: ...");

        await t.action(
            (internal as any).agent.titling.generateThreadTitle,
            { threadId },
        );

        const thread = await t.run(async (ctx: any) => ctx.db.get(threadId));
        expect(thread?.title).toBe("Credit Card Review");
    });

    it("strips a leading 'Title:' prefix from model output", async () => {
        const generateText = vi.fn().mockResolvedValue({ text: "Title: Spending Trends Q4" });
        vi.doMock("ai", () => ({ generateText }));

        const t = setup();
        const userId = await seedUser(t, "user_generate_prefix");
        const threadId = await seedThread(t, userId);
        await seedMessage(t, threadId, "user", "Show me Q4 spending trends");
        await seedMessage(t, threadId, "assistant", "Here is your Q4 spending: ...");

        await t.action(
            (internal as any).agent.titling.generateThreadTitle,
            { threadId },
        );

        const thread = await t.run(async (ctx: any) => ctx.db.get(threadId));
        expect(thread?.title).toBe("Spending Trends Q4");
    });

    it("swallows model errors silently (best-effort, never breaks chat)", async () => {
        const generateText = vi.fn().mockRejectedValue(new Error("anthropic 503"));
        vi.doMock("ai", () => ({ generateText }));

        const t = setup();
        const userId = await seedUser(t, "user_error_path");
        const threadId = await seedThread(t, userId);
        await seedMessage(t, threadId, "user", "Show me my credit cards");
        await seedMessage(t, threadId, "assistant", "Here are your cards: ...");

        // Must not throw.
        await expect(
            t.action(
                (internal as any).agent.titling.generateThreadTitle,
                { threadId },
            ),
        ).resolves.toBeNull();

        const thread = await t.run(async (ctx: any) => ctx.db.get(threadId));
        expect(thread?.title).toBeUndefined();
    });

    it("does not patch when model returns an empty string", async () => {
        const generateText = vi.fn().mockResolvedValue({ text: "" });
        vi.doMock("ai", () => ({ generateText }));

        const t = setup();
        const userId = await seedUser(t, "user_empty_resp");
        const threadId = await seedThread(t, userId);
        await seedMessage(t, threadId, "user", "Show me my credit cards");
        await seedMessage(t, threadId, "assistant", "Here are your cards: ...");

        await t.action(
            (internal as any).agent.titling.generateThreadTitle,
            { threadId },
        );

        const thread = await t.run(async (ctx: any) => ctx.db.get(threadId));
        expect(thread?.title).toBeUndefined();
    });
});

import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import { PROMPT_VERSION } from "../agent/system";

const modules = import.meta.glob("../**/*.ts");

function setup() {
  return convexTest(schema, modules);
}

async function seedUser(t: ReturnType<typeof setup>, externalId: string): Promise<string> {
  return await t.run(async (ctx: any) => {
    return await ctx.db.insert("users", {
      externalId,
      email: `${externalId}@example.test`,
    });
  });
}

async function seedThread(
  t: ReturnType<typeof setup>,
  userId: string,
  activeRun?: { messageId: string; startedAt: number; expiresAt: number },
): Promise<string> {
  return await t.run(async (ctx: any) => {
    return await ctx.db.insert("agentThreads", {
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
      activeRunUserMessageId: activeRun?.messageId,
      activeRunStartedAt: activeRun?.startedAt,
      activeRunExpiresAt: activeRun?.expiresAt,
    });
  });
}

async function seedMessage(t: ReturnType<typeof setup>, threadId: string, text = "hi"): Promise<string> {
  return await t.run(async (ctx: any) => {
    return await ctx.db.insert("agentMessages", {
      agentThreadId: threadId,
      role: "user",
      text,
      createdAt: Date.now(),
      isStreaming: true,
    });
  });
}

describe("agent thread active-run lifecycle", () => {
  it("rejects a same-thread turn while an active run has not expired", async () => {
    const t = setup();
    const userId = await seedUser(t, "user_concurrency_a");
    const threadId = await seedThread(t, userId);
    const messageId = await seedMessage(t, threadId);
    await t.run(async (ctx: any) => {
      await ctx.db.patch(threadId, {
        activeRunUserMessageId: messageId,
        activeRunStartedAt: Date.now(),
        activeRunExpiresAt: Date.now() + 60_000,
      });
    });

    await expect(
      t.mutation((internal as any).agent.threads.startUserTurnInternal, {
        userId,
        threadId,
        prompt: "second",
      }),
    ).rejects.toThrow(/run_in_progress/);
  });

  it("clears only the matching active run", async () => {
    const t = setup();
    const userId = await seedUser(t, "user_concurrency_b");
    const threadId = await seedThread(t, userId);
    const firstMessageId = await seedMessage(t, threadId, "first");
    const secondMessageId = await seedMessage(t, threadId, "second");
    await t.run(async (ctx: any) => {
      await ctx.db.patch(threadId, {
        activeRunUserMessageId: secondMessageId,
        activeRunStartedAt: Date.now(),
        activeRunExpiresAt: Date.now() + 60_000,
      });
    });

    await t.mutation((internal as any).agent.threads.finishActiveRun, {
      threadId,
      userMessageId: firstMessageId,
    });
    let thread = await t.run(async (ctx: any) => await ctx.db.get(threadId));
    expect(thread.activeRunUserMessageId).toBe(secondMessageId);

    await t.mutation((internal as any).agent.threads.finishActiveRun, {
      threadId,
      userMessageId: secondMessageId,
    });
    thread = await t.run(async (ctx: any) => await ctx.db.get(threadId));
    expect(thread.activeRunUserMessageId).toBeUndefined();
    expect(thread.activeRunStartedAt).toBeUndefined();
    expect(thread.activeRunExpiresAt).toBeUndefined();
  });

  it("reaps expired active runs", async () => {
    const t = setup();
    const userId = await seedUser(t, "user_concurrency_c");
    const threadId = await seedThread(t, userId);
    const messageId = await seedMessage(t, threadId);
    await t.run(async (ctx: any) => {
      await ctx.db.patch(threadId, {
        activeRunUserMessageId: messageId,
        activeRunStartedAt: Date.now() - 120_000,
        activeRunExpiresAt: Date.now() - 60_000,
      });
    });

    const count = await t.mutation((internal as any).agent.threads.reapExpiredActiveRunsInternal, {});
    expect(count).toBe(1);
    const thread = await t.run(async (ctx: any) => await ctx.db.get(threadId));
    expect(thread.activeRunUserMessageId).toBeUndefined();
  });

  it("abortRun leaves the authoritative active-run marker for runtime finalization", async () => {
    const t = setup();
    const externalId = "user_concurrency_d";
    const userId = await seedUser(t, externalId);
    const threadId = await seedThread(t, userId);
    const messageId = await seedMessage(t, threadId);
    await t.run(async (ctx: any) => {
      await ctx.db.patch(threadId, {
        activeRunUserMessageId: messageId,
        activeRunStartedAt: Date.now(),
        activeRunExpiresAt: Date.now() + 60_000,
      });
    });

    await t.withIdentity({ subject: externalId, issuer: "test" }).mutation(api.agent.threads.abortRun, {
      threadId: threadId as any,
    });
    const thread = await t.run(async (ctx: any) => await ctx.db.get(threadId));
    expect(thread.activeRunUserMessageId).toBe(messageId);
    expect(thread.cancelledAtTurn).toEqual(expect.any(Number));
  });
});

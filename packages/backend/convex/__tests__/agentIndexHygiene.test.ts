import { convexTest } from "convex-test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { internal } from "../_generated/api";
import { PROMPT_VERSION } from "../agent/system";
import schema from "../schema";

const __dirname = dirname(fileURLToPath(import.meta.url));
const modules = import.meta.glob("../**/*.ts");

function setup() {
    return convexTest(schema, modules);
}

async function seedUserAndThread(t: ReturnType<typeof setup>, externalId: string): Promise<{ userId: string; threadId: string }> {
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

async function seedProposal(
    t: ReturnType<typeof setup>,
    args: {
        userId: string;
        threadId: string;
        state: string;
        awaitingExpiresAt: number;
        hash: string;
    },
): Promise<string> {
    return await t.run(async (ctx: any) => {
        return await ctx.db.insert("agentProposals", {
            userId: args.userId,
            agentThreadId: args.threadId,
            toolName: "proposeManualPromo",
            argsJson: "{}",
            summaryText: "Proposal summary",
            affectedCount: 1,
            sampleJson: "{}",
            scope: "single",
            state: args.state,
            awaitingExpiresAt: args.awaitingExpiresAt,
            contentHash: args.hash,
        });
    });
}

describe("agent index hygiene (CROWDEV-440/CROWDEV-441)", () => {
    it("declares indexes used by bounded chat follow-up reads", () => {
        const schemaSource = readFileSync(resolve(__dirname, "../schema.ts"), "utf8");
        const threadsSource = readFileSync(resolve(__dirname, "../agent/threads.ts"), "utf8");

        expect(schemaSource).toContain('.index("by_user_archived_lastTurnAt", ["userId", "isArchived", "lastTurnAt"])');
        expect(schemaSource).toContain('.index("by_thread_role_createdAt", ["agentThreadId", "role", "createdAt"])');
        expect(threadsSource).toContain('table("agentThreads", "by_user_archived_lastTurnAt"');
        expect(threadsSource).toContain('table("agentMessages", "by_thread_role_createdAt"');
    });

    it("expires stale awaiting proposals through the state+expiry index", async () => {
        const source = readFileSync(resolve(__dirname, "../agent/proposals.ts"), "utf8");
        expect(source).toContain('table("agentProposals", "by_state_awaitingExpiresAt"');

        const t = setup();
        const { userId, threadId } = await seedUserAndThread(t, "user_expire_stale");
        const now = Date.now();
        const staleAwaiting = await seedProposal(t, {
            userId,
            threadId,
            state: "awaiting_confirmation",
            awaitingExpiresAt: now - 1_000,
            hash: "stale_awaiting",
        });
        const freshAwaiting = await seedProposal(t, {
            userId,
            threadId,
            state: "awaiting_confirmation",
            awaitingExpiresAt: now + 60_000,
            hash: "fresh_awaiting",
        });
        const staleExecuted = await seedProposal(t, {
            userId,
            threadId,
            state: "executed",
            awaitingExpiresAt: now - 1_000,
            hash: "stale_executed",
        });

        await t.mutation((internal as any).agent.proposals.expireStaleInternal, {});

        const state = await t.run(async (ctx: any) => {
            const stale = await ctx.db.get(staleAwaiting);
            const fresh = await ctx.db.get(freshAwaiting);
            const executed = await ctx.db.get(staleExecuted);
            const messages = await ctx.db
                .query("agentMessages")
                .withIndex("by_thread_createdAt", (q: any) => q.eq("agentThreadId", threadId))
                .collect();
            return { stale, fresh, executed, messages };
        });

        expect(state.stale?.state).toBe("timed_out");
        expect(state.fresh?.state).toBe("awaiting_confirmation");
        expect(state.executed?.state).toBe("executed");
        expect(state.messages).toHaveLength(1);
        expect(state.messages[0]?.text).toBe("Proposal timed out (proposeManualPromo).");
    });
});

import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");

function firstOfMonthUtc(n: number): number {
  const d = new Date(n);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

describe("incrementChatMessageCount", () => {
  it("creates then increments the monthly counter", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "T", externalId: "u_inc" }),
    );
    await t.mutation(internal.agent.threads.incrementChatMessageCountForTest, {
      userId,
    });
    await t.mutation(internal.agent.threads.incrementChatMessageCountForTest, {
      userId,
    });
    const count = await t.run(async (ctx: any) => {
      const rows = await ctx.db
        .query("usageCounters")
        .withIndex("by_user_period", (q: any) =>
          q
            .eq("userId", userId)
            .eq("periodStart", firstOfMonthUtc(Date.now())),
        )
        .collect();
      return rows[0]?.chatMessagesUsed ?? 0;
    });
    expect(count).toBe(2);
  });
});

import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");

function firstOfMonthUtc(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

async function seedUserWithMessages(
  t: any,
  plan: "free" | "pro",
  used: number,
) {
  return await t.run(async (ctx: any) => {
    const userId = await ctx.db.insert("users", {
      name: "T",
      externalId: `u_${plan}_${used}`,
      plan,
    });
    await ctx.db.insert("usageCounters", {
      userId,
      periodStart: firstOfMonthUtc(Date.now()),
      chatMessagesUsed: used,
    });
    return userId;
  });
}

describe("checkHeadroom — message cap", () => {
  it("blocks a free user at the 15-message cap", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUserWithMessages(t, "free", 15);
    const r = await t.query(internal.agent.budgets.checkHeadroom, { userId });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("message_cap");
  });

  it("allows a free user below the cap", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUserWithMessages(t, "free", 14);
    const r = await t.query(internal.agent.budgets.checkHeadroom, { userId });
    expect(r.ok).toBe(true);
  });

  it("allows a pro user at 15 (their cap is higher)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUserWithMessages(t, "pro", 15);
    const r = await t.query(internal.agent.budgets.checkHeadroom, { userId });
    expect(r.ok).toBe(true);
  });
});

import { describe, expect, it, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");

async function seedUser(t: any, plan?: "free" | "pro", externalId = "user_a") {
  return await t.run(async (ctx: any) =>
    ctx.db.insert("users", { name: "Test", externalId, plan }),
  );
}

describe("resolveEffectivePlanForUser", () => {
  const OLD = process.env.BILLING_UNLIMITED_USER_IDS;
  afterEach(() => {
    process.env.BILLING_UNLIMITED_USER_IDS = OLD;
  });

  it("absent plan ⇒ free", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, undefined);
    const r = await t.query(internal.billing.plan.resolveEffectivePlanForUser, {
      userId,
    });
    expect(r).toBe("free");
  });

  it("pro plan ⇒ pro", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "pro");
    const r = await t.query(internal.billing.plan.resolveEffectivePlanForUser, {
      userId,
    });
    expect(r).toBe("pro");
  });

  it("allowlisted externalId ⇒ unlimited (regardless of stored plan)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "free", "user_owner");
    process.env.BILLING_UNLIMITED_USER_IDS = "user_owner,user_other";
    const r = await t.query(internal.billing.plan.resolveEffectivePlanForUser, {
      userId,
    });
    expect(r).toBe("unlimited");
  });
});

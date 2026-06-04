import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";
import plaidSchema from "../../../convex-plaid/src/component/schema";

const modules = import.meta.glob("../**/*.ts");
const plaidModules = import.meta.glob(
  "../../../convex-plaid/src/component/**/*.ts",
);

describe("getMyPlanAndUsage", () => {
  it("returns free plan + limits for an authed free user", async () => {
    const t0 = convexTest(schema, modules);
    t0.registerComponent("plaid", plaidSchema as any, plaidModules);
    await t0.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "T", externalId: "user_me", plan: "free" }),
    );
    const t = t0.withIdentity({ subject: "user_me" });
    const r = await t.query(api.billing.queries.getMyPlanAndUsage, {});
    expect(r.plan).toBe("free");
    expect(r.chat.limit).toBe(15);
    expect(r.plaid.limit).toBe(1);
    expect(r.chat.used).toBe(0);
    expect(r.plaid.used).toBe(0);
  });
});

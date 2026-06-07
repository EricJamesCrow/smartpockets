import { describe, expect, it, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");

// Minimal shape of a Clerk Billing subscription event payload: a payer with a
// Clerk user id, plus subscription items each referencing a plan slug + status.
function payload(
  externalId: string,
  items: Array<{ slug: string; status: string }>,
) {
  return {
    payer: { user_id: externalId },
    items: items.map((i) => ({ status: i.status, plan: { slug: i.slug } })),
    status: "active",
  };
}

describe("syncPlanFromClerk", () => {
  const OLD = process.env.CLERK_PRO_PLAN_SLUG;
  afterEach(() => {
    process.env.CLERK_PRO_PLAN_SLUG = OLD;
  });

  it("sets plan=pro when an active item matches the pro slug", async () => {
    process.env.CLERK_PRO_PLAN_SLUG = "pro";
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "T", externalId: "user_p" }),
    );
    await t.mutation(internal.billing.mutations.syncPlanFromClerk, {
      data: payload("user_p", [{ slug: "pro", status: "active" }]),
    });
    const u = await t.run(async (ctx: any) => ctx.db.get(userId));
    expect(u.plan).toBe("pro");
  });

  it("sets plan=free when only the free item is active", async () => {
    process.env.CLERK_PRO_PLAN_SLUG = "pro";
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "T", externalId: "user_f" }),
    );
    await t.mutation(internal.billing.mutations.syncPlanFromClerk, {
      data: payload("user_f", [{ slug: "free_user", status: "active" }]),
    });
    const u = await t.run(async (ctx: any) => ctx.db.get(userId));
    expect(u.plan).toBe("free");
  });

  it("is a no-op when the payer user is unknown", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.billing.mutations.syncPlanFromClerk, {
      data: payload("user_missing", [{ slug: "pro", status: "active" }]),
    });
    expect(true).toBe(true);
  });

  it("fail-safe: a canceled pro item does NOT grant pro", async () => {
    process.env.CLERK_PRO_PLAN_SLUG = "pro";
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "T", externalId: "user_c" }),
    );
    await t.mutation(internal.billing.mutations.syncPlanFromClerk, {
      data: {
        payer: { user_id: "user_c" },
        items: [{ status: "canceled", plan: { slug: "pro" } }],
        status: "canceled",
      },
    });
    const u = await t.run(async (ctx: any) => ctx.db.get(userId));
    expect(u.plan).toBe("free");
  });

  it("fail-safe: a pro item with no status and inactive subscription stays free", async () => {
    process.env.CLERK_PRO_PLAN_SLUG = "pro";
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "T", externalId: "user_e" }),
    );
    await t.mutation(internal.billing.mutations.syncPlanFromClerk, {
      data: {
        payer: { user_id: "user_e" },
        items: [{ plan: { slug: "pro" } }], // no item status
        status: "incomplete",
      },
    });
    const u = await t.run(async (ctx: any) => ctx.db.get(userId));
    expect(u.plan).toBe("free");
  });
});

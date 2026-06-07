import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";
import { planFromSubscription } from "../billing/subscription";

const modules = import.meta.glob("../**/*.ts");

// Shape of clerkClient.billing.getUserBillingSubscription(): a subscription with
// items, each referencing a plan slug + status.
function sub(
  items: Array<{ slug: string; status: string }>,
  status = "active",
) {
  return {
    status,
    subscriptionItems: items.map((i) => ({
      status: i.status,
      plan: { slug: i.slug },
    })),
  };
}

describe("planFromSubscription", () => {
  it("pro when an active pro item exists", () => {
    expect(
      planFromSubscription(sub([{ slug: "pro", status: "active" }]), "pro"),
    ).toBe("pro");
  });

  it("pro for a trialing pro item", () => {
    expect(
      planFromSubscription(sub([{ slug: "pro", status: "trialing" }]), "pro"),
    ).toBe("pro");
  });

  it("free when only the free item is active", () => {
    expect(
      planFromSubscription(
        sub([{ slug: "free_user", status: "active" }]),
        "pro",
      ),
    ).toBe("free");
  });

  it("fail-safe: a canceled pro item ⇒ free", () => {
    expect(
      planFromSubscription(sub([{ slug: "pro", status: "canceled" }]), "pro"),
    ).toBe("free");
  });

  it("fail-safe: empty / unknown shapes ⇒ free", () => {
    expect(planFromSubscription({}, "pro")).toBe("free");
    expect(planFromSubscription(null, "pro")).toBe("free");
    expect(
      planFromSubscription(sub([{ slug: "pro", status: "" }]), "pro"),
    ).toBe("free");
  });
});

describe("writePlan", () => {
  it("writes plan to a known user; no-op for unknown", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "T", externalId: "u_wp" }),
    );
    await t.mutation(internal.billing.mutations.writePlan, {
      externalId: "u_wp",
      plan: "pro",
      subscriptionStatus: "active",
    });
    const u = await t.run(async (ctx: any) => ctx.db.get(userId));
    expect(u.plan).toBe("pro");

    // Unknown externalId ⇒ no throw, no-op.
    await t.mutation(internal.billing.mutations.writePlan, {
      externalId: "missing",
      plan: "pro",
    });
  });
});

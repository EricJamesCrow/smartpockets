import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";
import plaidSchema from "../../../convex-plaid/src/component/schema";

const modules = import.meta.glob("../**/*.ts");
const plaidModules = import.meta.glob(
  "../../../convex-plaid/src/component/**/*.ts",
);

function setup() {
  const t = convexTest(schema, modules);
  t.registerComponent("plaid", plaidSchema as any, plaidModules);
  return t;
}

describe("reservePlaidSlot (atomic connection cap)", () => {
  it("free user: 1 reservation allowed, 2nd blocked, release frees the slot", async () => {
    const t = setup();
    await t.run(async (ctx: any) =>
      ctx.db.insert("users", { name: "T", externalId: "u_res", plan: "free" }),
    );

    const r1 = await t.mutation(internal.billing.plaidLimit.reservePlaidSlot, {
      externalId: "u_res",
    });
    expect(r1.ok).toBe(true);

    // Second concurrent-style reservation is blocked: 0 items + 1 reservation
    // already meets the free cap of 1.
    const r2 = await t.mutation(internal.billing.plaidLimit.reservePlaidSlot, {
      externalId: "u_res",
    });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.code).toBe("plaid_connection_limit");

    // Releasing the first frees the slot.
    if (r1.ok) {
      await t.mutation(internal.billing.plaidLimit.releasePlaidSlot, {
        reservationId: r1.reservationId,
      });
    }
    const r3 = await t.mutation(internal.billing.plaidLimit.reservePlaidSlot, {
      externalId: "u_res",
    });
    expect(r3.ok).toBe(true);
  });

  it("allowlisted (unlimited) user is never blocked", async () => {
    const OLD = process.env.BILLING_UNLIMITED_USER_IDS;
    process.env.BILLING_UNLIMITED_USER_IDS = "u_owner";
    try {
      const t = setup();
      await t.run(async (ctx: any) =>
        ctx.db.insert("users", { name: "T", externalId: "u_owner" }),
      );
      const a = await t.mutation(internal.billing.plaidLimit.reservePlaidSlot, {
        externalId: "u_owner",
      });
      const b = await t.mutation(internal.billing.plaidLimit.reservePlaidSlot, {
        externalId: "u_owner",
      });
      expect(a.ok).toBe(true);
      expect(b.ok).toBe(true);
    } finally {
      process.env.BILLING_UNLIMITED_USER_IDS = OLD;
    }
  });
});

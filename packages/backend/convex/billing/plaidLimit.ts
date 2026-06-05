import { v } from "convex/values";
import { internalQuery, internalMutation } from "../functions";
import { components } from "../_generated/api";
import { effectivePlanFromUser, type EffectivePlan } from "./plan";
import { entitlementsFor } from "./entitlements";

// TTL for a connection-slot reservation. Must exceed the slowest onboarding
// run so a reservation never expires mid-onboard; the action's `finally`
// releases it well before this on the normal path.
const RESERVATION_TTL_MS = 5 * 60 * 1000;

export type PlaidHeadroom =
  | { ok: true }
  | { ok: false; code: "plaid_connection_limit"; limit: number; used: number };

/** Pure: given the effective plan and current active-item count, may they add one? */
export function plaidHeadroomDecision(
  effective: EffectivePlan,
  used: number,
): PlaidHeadroom {
  if (effective === "unlimited") return { ok: true };
  const limit = entitlementsFor(effective).maxPlaidConnections;
  return used >= limit
    ? { ok: false, code: "plaid_connection_limit", limit, used }
    : { ok: true };
}

/** Count a user's non-deleting Plaid items via the component (ctx-flexible). */
export async function countActiveItems(
  ctx: any,
  externalId: string,
): Promise<number> {
  const items = (await ctx.runQuery(components.plaid.public.getItemsByUser, {
    userId: externalId,
  })) as Array<{ status: string }>;
  return items.filter((i) => i.status !== "deleting").length;
}

/**
 * Headroom for adding another Plaid connection, keyed by Clerk externalId
 * (what the Plaid actions hold). Resolves plan from users.plan + owner
 * allowlist; unlimited short-circuits before any count. Query ctx ⇒ has both
 * `ctx.table` and component `ctx.runQuery`.
 */
export const getPlaidHeadroom = internalQuery({
  args: { externalId: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true) }),
    v.object({
      ok: v.literal(false),
      code: v.literal("plaid_connection_limit"),
      limit: v.number(),
      used: v.number(),
    }),
  ),
  handler: async (ctx, { externalId }): Promise<PlaidHeadroom> => {
    const user = await ctx.table("users").get("externalId", externalId);
    const effective = effectivePlanFromUser(user);
    if (effective === "unlimited") return { ok: true };
    const used = await countActiveItems(ctx, externalId);
    return plaidHeadroomDecision(effective, used);
  },
});

/**
 * CROWDEV-646: atomically reserve a connection slot. Convex mutations are
 * serializable and this reads+writes the `plaidConnectionReservations` index
 * range for the user, so two concurrent reservations conflict and run in
 * series — the second sees the first's row and is blocked at the cap. The
 * count = active Plaid items + this user's *unexpired* reservations. Expired
 * reservations are cleaned opportunistically. unlimited (owner) always passes.
 */
export const reservePlaidSlot = internalMutation({
  args: { externalId: v.string() },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      reservationId: v.id("plaidConnectionReservations"),
    }),
    v.object({
      ok: v.literal(false),
      code: v.literal("plaid_connection_limit"),
      limit: v.number(),
      used: v.number(),
    }),
  ),
  handler: async (ctx, { externalId }) => {
    const now = Date.now();
    const reservations = await ctx.table(
      "plaidConnectionReservations",
      "by_externalId",
      (q) => q.eq("externalId", externalId),
    );
    let activeReservations = 0;
    for (const r of reservations) {
      if (r.expiresAt <= now) {
        await (
          await ctx.table("plaidConnectionReservations").getX(r._id)
        ).delete();
      } else {
        activeReservations += 1;
      }
    }

    const user = await ctx.table("users").get("externalId", externalId);
    const effective = effectivePlanFromUser(user);
    const activeItems = await countActiveItems(ctx, externalId);

    if (effective !== "unlimited") {
      const limit = entitlementsFor(effective).maxPlaidConnections;
      const used = activeItems + activeReservations;
      if (used >= limit) {
        return {
          ok: false as const,
          code: "plaid_connection_limit" as const,
          limit,
          used,
        };
      }
    }

    const reservationId = await ctx
      .table("plaidConnectionReservations")
      .insert({ externalId, expiresAt: now + RESERVATION_TTL_MS });
    return { ok: true as const, reservationId };
  },
});

/** Release a previously-reserved connection slot. Idempotent. */
export const releasePlaidSlot = internalMutation({
  args: { reservationId: v.id("plaidConnectionReservations") },
  returns: v.null(),
  handler: async (ctx, { reservationId }) => {
    const existing = await ctx
      .table("plaidConnectionReservations")
      .get(reservationId);
    if (existing) {
      await (
        await ctx.table("plaidConnectionReservations").getX(reservationId)
      ).delete();
    }
    return null;
  },
});

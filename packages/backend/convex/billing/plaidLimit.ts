import { v } from "convex/values";
import { internalQuery } from "../functions";
import { components } from "../_generated/api";
import { effectivePlanFromUser, type EffectivePlan } from "./plan";
import { entitlementsFor } from "./entitlements";

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

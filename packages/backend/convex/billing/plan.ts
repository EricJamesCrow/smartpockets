import { v } from "convex/values";
import { internalQuery } from "../functions";
import type { Id } from "../_generated/dataModel";
import { resolvePlan, type Plan } from "./entitlements";

export type EffectivePlan = Plan | "unlimited";

function allowlist(): Set<string> {
  return new Set(
    (process.env.BILLING_UNLIMITED_USER_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );
}

/**
 * Pure: derive the effective plan from a user doc. Owner allowlist (by Clerk
 * externalId) ⇒ "unlimited"; otherwise normalized users.plan (unknown ⇒ free).
 */
export function effectivePlanFromUser(
  user: { externalId: string; plan?: unknown } | null | undefined,
): EffectivePlan {
  if (!user) return "free";
  if (allowlist().has(user.externalId)) return "unlimited";
  return resolvePlan(user.plan);
}

/**
 * Resolve the effective plan for a Convex user id. `ctx` is typed `any` because
 * this is called from query AND mutation ents contexts (both expose `ctx.table`;
 * actions must NOT call it — they have no DB access, see plaidLimit). Any error
 * ⇒ "free" (least privilege).
 */
export async function resolveEffectivePlan(
  ctx: any,
  userId: Id<"users">,
): Promise<EffectivePlan> {
  try {
    const user = await ctx.table("users").get(userId);
    return effectivePlanFromUser(user);
  } catch {
    return "free";
  }
}

/** Test/diagnostic surface for the resolver. */
export const resolveEffectivePlanForUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.literal("free"), v.literal("pro"), v.literal("unlimited")),
  handler: async (ctx, { userId }) => resolveEffectivePlan(ctx, userId),
});

import { v } from "convex/values";
import { internalMutation } from "../functions";

function proSlug(): string {
  return process.env.CLERK_PRO_PLAN_SLUG ?? "pro";
}

/** True if any subscription item for the pro plan is in an active-ish state. */
function hasActivePro(data: any): boolean {
  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  const target = proSlug();
  return items.some((it) => {
    const slug = it?.plan?.slug ?? it?.plan_slug ?? it?.slug;
    const status = String(it?.status ?? "").toLowerCase();
    const active = status === "active" || status === "trialing" || status === "";
    return slug === target && active;
  });
}

/**
 * Mirror the Clerk Billing subscription payload onto users.plan. Resolves the
 * payer's Clerk user id, then sets plan=pro iff an active pro item exists, else
 * free. Idempotent upsert; unknown payer ⇒ no-op. Unknown shape ⇒ free.
 */
export const syncPlanFromClerk = internalMutation({
  args: { data: v.any() },
  returns: v.null(),
  handler: async (ctx, { data }) => {
    const externalId: string | undefined =
      data?.payer?.user_id ?? data?.user_id ?? data?.payer?.id;
    if (!externalId) return null;

    const user = await ctx.table("users").get("externalId", externalId);
    if (!user) return null; // user webhook may not have landed yet; safe no-op

    const plan = hasActivePro(data) ? "pro" : "free";
    const status = typeof data?.status === "string" ? data.status : undefined;

    const writable = await ctx.table("users").getX(user._id);
    await writable.patch({
      plan,
      subscriptionStatus: status,
      planUpdatedAt: Date.now(),
    });
    return null;
  },
});

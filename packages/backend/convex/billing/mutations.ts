import { v } from "convex/values";
import { internalMutation } from "../functions";

function proSlug(): string {
  return process.env.CLERK_PRO_PLAN_SLUG ?? "pro";
}

function isActiveStatus(s: string): boolean {
  return s === "active" || s === "trialing";
}

/** True if any subscription item for the pro plan is in an active state. */
function hasActivePro(data: any): boolean {
  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  const target = proSlug();
  const subStatus = String(data?.status ?? "").toLowerCase();
  return items.some((it) => {
    const slug = it?.plan?.slug ?? it?.plan_slug ?? it?.slug;
    if (slug !== target) return false;
    const itemStatus = String(it?.status ?? "").toLowerCase();
    // Fail-safe (CROWDEV-330): an explicit non-active item status
    // (canceled/ended/past_due) never grants Pro. An *absent* item status
    // falls back to the subscription's status; a fully-unknown status
    // defaults to NOT active ⇒ free. Empty status must never grant Pro.
    if (itemStatus) return isActiveStatus(itemStatus);
    return isActiveStatus(subStatus);
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

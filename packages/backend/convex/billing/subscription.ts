/**
 * Pure plan resolution from a Clerk BillingSubscription object — the value
 * returned by `clerkClient.billing.getUserBillingSubscription(userId)`. Shape:
 *   { status, subscriptionItems: [{ status, plan: { slug } }, ...] }
 *
 * This is shape-independent of which webhook event triggered the read, so it
 * correctly handles upgrades, downgrades, cancellations, and past-due alike.
 *
 * Fail-safe: only an item whose plan slug matches `proSlug` AND whose status is
 * active/trialing grants Pro. Anything else — canceled, ended, past_due,
 * incomplete, unknown, or empty — resolves to free.
 */
export function planFromSubscription(
  sub: unknown,
  proSlug: string,
): "free" | "pro" {
  const items = isRecord(sub) && Array.isArray(sub.subscriptionItems)
    ? (sub.subscriptionItems as unknown[])
    : [];
  const hasActivePro = items.some((raw) => {
    if (!isRecord(raw)) return false;
    const plan = isRecord(raw.plan) ? raw.plan : undefined;
    const slug = plan && typeof plan.slug === "string" ? plan.slug : undefined;
    const status = String(raw.status ?? "").toLowerCase();
    return slug === proSlug && (status === "active" || status === "trialing");
  });
  return hasActivePro ? "pro" : "free";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

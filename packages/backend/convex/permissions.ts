import { Id } from "./_generated/dataModel";
import { QueryCtx } from "./types";

export type Permission = "read" | "write" | "delete" | "manage" | "share";

/**
 * Check if viewer is a member of org with given permission
 * Note: QueryCtx works for both queries and mutations since MutationCtx extends QueryCtx
 */
export async function viewerHasOrgPermission(
  ctx: QueryCtx,
  orgId: Id<"organizations">,
  permission: Permission
): Promise<boolean> {
  const viewer = ctx.viewer;
  if (!viewer) return false;

  const member = await ctx
    .table("members", "orgUser", (q) =>
      q.eq("organizationId", orgId).eq("userId", viewer._id)
    )
    .unique();

  if (!member) return false;

  const role = await member.edge("role");
  return role.permissions.includes(permission);
}

// =====================================
// Throwing variants (work in both queries and mutations)
// =====================================

/**
 * Throws if viewer doesn't have org permission
 */
export async function viewerHasOrgPermissionX(
  ctx: QueryCtx,
  orgId: Id<"organizations">,
  permission: Permission
): Promise<void> {
  if (!(await viewerHasOrgPermission(ctx, orgId, permission))) {
    throw new Error(`Missing permission: ${permission}`);
  }
}

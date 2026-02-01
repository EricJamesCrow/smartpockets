import { v } from "convex/values";
import { mutation, query } from "./functions";
import { viewerHasOrgPermissionX } from "./permissions";

/**
 * List all members of an organization
 */
export const list = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      _id: v.id("members"),
      _creationTime: v.number(),
      userId: v.id("users"),
      userName: v.string(),
      roleName: v.string(),
      roleId: v.id("roles"),
    })
  ),
  async handler(ctx, { organizationId }) {
    const viewer = ctx.viewer;
    if (!viewer) return [];

    // Check if viewer is a member of this org
    const viewerMember = await ctx
      .table("members", "orgUser", (q) =>
        q.eq("organizationId", organizationId).eq("userId", viewer._id)
      )
      .unique();

    if (!viewerMember) return [];

    const org = await ctx.table("organizations").get(organizationId);
    if (!org) return [];

    const members = await org.edge("members");

    return Promise.all(
      members.map(async (member) => {
        const user = await member.edge("user");
        const role = await member.edge("role");
        return {
          _id: member._id,
          _creationTime: member._creationTime,
          userId: member.userId,
          userName: user.name,
          roleName: role.name,
          roleId: member.roleId,
        };
      })
    );
  },
});

/**
 * Add a member to an organization
 */
export const add = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    roleId: v.id("roles"),
  },
  returns: v.id("members"),
  async handler(ctx, { organizationId, userId, roleId }) {
    await viewerHasOrgPermissionX(ctx, organizationId, "manage");

    // Check if user is already a member
    const existing = await ctx
      .table("members", "orgUser", (q) =>
        q.eq("organizationId", organizationId).eq("userId", userId)
      )
      .unique();

    if (existing) {
      throw new Error("User is already a member of this organization");
    }

    // Verify role belongs to this org
    const role = await ctx.table("roles").getX(roleId);
    if (role.organizationId !== organizationId) {
      throw new Error("Role does not belong to this organization");
    }

    return await ctx.table("members").insert({
      organizationId,
      userId,
      roleId,
    });
  },
});

/**
 * Update a member's role
 */
export const updateRole = mutation({
  args: {
    memberId: v.id("members"),
    roleId: v.id("roles"),
  },
  returns: v.null(),
  async handler(ctx, { memberId, roleId }) {
    const member = await ctx.table("members").getX(memberId);
    await viewerHasOrgPermissionX(ctx, member.organizationId, "manage");

    // Verify role belongs to this org
    const role = await ctx.table("roles").getX(roleId);
    if (role.organizationId !== member.organizationId) {
      throw new Error("Role does not belong to this organization");
    }

    // Prevent demoting the last owner
    const currentRole = await member.edge("role");
    if (currentRole.name === "owner") {
      const ownerRole = await ctx
        .table("roles", "byOrgAndName", (q) =>
          q.eq("organizationId", member.organizationId).eq("name", "owner")
        )
        .unique();

      if (ownerRole) {
        const org = await ctx.table("organizations").getX(member.organizationId);
        const allMembers = await org.edge("members");
        const ownerCount = allMembers.filter(
          (m) => m.roleId === ownerRole._id
        ).length;

        if (ownerCount <= 1 && role.name !== "owner") {
          throw new Error("Cannot demote the last owner");
        }
      }
    }

    await member.patch({ roleId });
    return null;
  },
});

/**
 * Remove a member from an organization
 */
export const remove = mutation({
  args: { memberId: v.id("members") },
  returns: v.null(),
  async handler(ctx, { memberId }) {
    const member = await ctx.table("members").getX(memberId);
    const viewer = ctx.viewerX();

    // Users can remove themselves, or admins can remove others
    if (member.userId !== viewer._id) {
      await viewerHasOrgPermissionX(ctx, member.organizationId, "manage");
    }

    // Prevent removing the last owner
    const role = await member.edge("role");
    if (role.name === "owner") {
      const org = await ctx.table("organizations").getX(member.organizationId);
      const allMembers = await org.edge("members");
      const ownerCount = allMembers.filter((m) => m.roleId === role._id).length;

      if (ownerCount <= 1) {
        throw new Error("Cannot remove the last owner");
      }
    }

    await member.delete();
    return null;
  },
});

/**
 * List available roles for an organization
 */
export const listRoles = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      _id: v.id("roles"),
      name: v.string(),
      permissions: v.array(v.string()),
    })
  ),
  async handler(ctx, { organizationId }) {
    const viewer = ctx.viewer;
    if (!viewer) return [];

    // Check if viewer is a member of this org
    const viewerMember = await ctx
      .table("members", "orgUser", (q) =>
        q.eq("organizationId", organizationId).eq("userId", viewer._id)
      )
      .unique();

    if (!viewerMember) return [];

    const org = await ctx.table("organizations").get(organizationId);
    if (!org) return [];

    const roles = await org.edge("roles");

    return roles.map((role) => ({
      _id: role._id,
      name: role.name,
      permissions: role.permissions,
    }));
  },
});

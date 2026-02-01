import { v } from "convex/values";
import { mutation, query } from "./functions";
import { viewerHasOrgPermissionX } from "./permissions";

/**
 * Create a new organization with the viewer as owner
 */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  returns: v.id("organizations"),
  async handler(ctx, { name, slug }) {
    const viewer = ctx.viewerX();

    // Create org
    const orgId = await ctx.table("organizations").insert({ name, slug });

    // Create default roles for this org
    const ownerRoleId = await ctx.table("roles").insert({
      organizationId: orgId,
      name: "owner",
      permissions: ["read", "write", "delete", "manage", "share"],
    });

    await ctx.table("roles").insert({
      organizationId: orgId,
      name: "admin",
      permissions: ["read", "write", "delete", "share"],
    });

    await ctx.table("roles").insert({
      organizationId: orgId,
      name: "member",
      permissions: ["read", "write"],
    });

    await ctx.table("roles").insert({
      organizationId: orgId,
      name: "viewer",
      permissions: ["read"],
    });

    // Add creator as owner member
    await ctx.table("members").insert({
      organizationId: orgId,
      userId: viewer._id,
      roleId: ownerRoleId,
    });

    return orgId;
  },
});

/**
 * List all organizations the viewer is a member of
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("organizations"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      role: v.string(),
    })
  ),
  async handler(ctx) {
    const viewer = ctx.viewer;
    if (!viewer) return [];

    const members = await viewer.edge("members");
    const orgs = await Promise.all(
      members.map(async (member) => {
        const org = await member.edge("organization");
        const role = await member.edge("role");
        return {
          _id: org._id,
          _creationTime: org._creationTime,
          name: org.name,
          slug: org.slug,
          role: role.name,
        };
      })
    );

    return orgs;
  },
});

/**
 * Get a single organization by ID
 */
export const get = query({
  args: { organizationId: v.id("organizations") },
  returns: v.union(
    v.object({
      _id: v.id("organizations"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
    }),
    v.null()
  ),
  async handler(ctx, { organizationId }) {
    const viewer = ctx.viewer;
    if (!viewer) return null;

    // Check membership
    const member = await ctx
      .table("members", "orgUser", (q) =>
        q.eq("organizationId", organizationId).eq("userId", viewer._id)
      )
      .unique();

    if (!member) return null;

    const org = await ctx.table("organizations").get(organizationId);
    if (!org) return null;

    return {
      _id: org._id,
      _creationTime: org._creationTime,
      name: org.name,
      slug: org.slug,
    };
  },
});

/**
 * Get organization by slug
 */
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("organizations"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
    }),
    v.null()
  ),
  async handler(ctx, { slug }) {
    const viewer = ctx.viewer;
    if (!viewer) return null;

    const org = await ctx.table("organizations").get("slug", slug);
    if (!org) return null;

    // Check membership
    const member = await ctx
      .table("members", "orgUser", (q) =>
        q.eq("organizationId", org._id).eq("userId", viewer._id)
      )
      .unique();

    if (!member) return null;

    return {
      _id: org._id,
      _creationTime: org._creationTime,
      name: org.name,
      slug: org.slug,
    };
  },
});

/**
 * Update organization details
 */
export const update = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  returns: v.null(),
  async handler(ctx, { organizationId, name, slug }) {
    await viewerHasOrgPermissionX(ctx, organizationId, "manage");

    const org = await ctx.table("organizations").getX(organizationId);
    await org.patch({
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
    });

    return null;
  },
});

/**
 * Delete an organization (requires owner permission)
 */
export const remove = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  async handler(ctx, { organizationId }) {
    await viewerHasOrgPermissionX(ctx, organizationId, "manage");

    const org = await ctx.table("organizations").getX(organizationId);

    // Delete all members
    const members = await org.edge("members");
    for (const member of members) {
      const writable = await ctx.table("members").getX(member._id);
      await writable.delete();
    }

    // Delete all roles
    const roles = await org.edge("roles");
    for (const role of roles) {
      const writable = await ctx.table("roles").getX(role._id);
      await writable.delete();
    }

    await org.delete();
    return null;
  },
});

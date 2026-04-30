import { v } from "convex/values";
import { query, mutation } from "./functions";

// Read validator stays permissive so existing rows containing legacy
// transparentSidebar/language/bannerAppearance fields still deserialize.
// The write side (updateAppearance.args) blocks new writes of those fields.
const appearanceValidator = v.optional(
  v.object({
    theme: v.optional(
      v.union(v.literal("system"), v.literal("light"), v.literal("dark"))
    ),
    brandColor: v.optional(v.string()),
    transparentSidebar: v.optional(v.boolean()),
    language: v.optional(v.string()),
    bannerAppearance: v.optional(
      v.union(
        v.literal("default"),
        v.literal("simplified"),
        v.literal("custom")
      )
    ),
  })
);

// Query: Get user preferences
// Note: notifications field kept in validator for legacy data compatibility
export const get = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("userPreferences"),
      _creationTime: v.number(),
      userId: v.id("users"),
      appearance: appearanceValidator,
      notifications: v.optional(v.any()), // Legacy field - no longer used
    })
  ),
  handler: async (ctx) => {
    const viewer = ctx.viewer;
    if (!viewer) return null;

    return await ctx.db
      .query("userPreferences")
      .withIndex("byUserId", (q) => q.eq("userId", viewer._id))
      .unique();
  },
});

// Mutation: Update appearance settings (batch save)
export const updateAppearance = mutation({
  args: {
    theme: v.optional(
      v.union(v.literal("system"), v.literal("light"), v.literal("dark"))
    ),
    brandColor: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("byUserId", (q) => q.eq("userId", viewer._id))
      .unique();

    const appearanceUpdate = Object.fromEntries(
      Object.entries(args).filter(([, val]) => val !== undefined)
    );

    if (!prefs) {
      await ctx.db.insert("userPreferences", {
        userId: viewer._id,
        appearance: appearanceUpdate,
      });
    } else {
      await ctx.db.patch(prefs._id, {
        appearance: {
          ...prefs.appearance,
          ...appearanceUpdate,
        },
      });
    }
    return null;
  },
});

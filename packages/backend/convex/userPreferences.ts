import { v } from "convex/values";
import { query, mutation } from "./functions";

// Shared validators
const notificationChannelValidator = v.optional(
  v.object({
    push: v.optional(v.boolean()),
    email: v.optional(v.boolean()),
    sms: v.optional(v.boolean()),
  })
);

const notificationsValidator = v.optional(
  v.object({
    comments: notificationChannelValidator,
    tags: notificationChannelValidator,
    reminders: notificationChannelValidator,
    moreActivity: notificationChannelValidator,
  })
);

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
export const get = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("userPreferences"),
      _creationTime: v.number(),
      userId: v.id("users"),
      notifications: notificationsValidator,
      appearance: appearanceValidator,
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

// Mutation: Update single notification toggle (for auto-save)
export const updateNotification = mutation({
  args: {
    category: v.union(
      v.literal("comments"),
      v.literal("tags"),
      v.literal("reminders"),
      v.literal("moreActivity")
    ),
    channel: v.union(v.literal("push"), v.literal("email"), v.literal("sms")),
    value: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("byUserId", (q) => q.eq("userId", viewer._id))
      .unique();

    if (!prefs) {
      // Create new preferences
      await ctx.db.insert("userPreferences", {
        userId: viewer._id,
        notifications: {
          [args.category]: {
            [args.channel]: args.value,
          },
        },
      });
    } else {
      // Merge into existing
      const currentNotifications = prefs.notifications ?? {};
      const currentCategory =
        (currentNotifications as Record<string, Record<string, boolean>>)[
          args.category
        ] ?? {};

      await ctx.db.patch(prefs._id, {
        notifications: {
          ...currentNotifications,
          [args.category]: {
            ...currentCategory,
            [args.channel]: args.value,
          },
        },
      });
    }
    return null;
  },
});

// Mutation: Update appearance settings (batch save)
export const updateAppearance = mutation({
  args: {
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

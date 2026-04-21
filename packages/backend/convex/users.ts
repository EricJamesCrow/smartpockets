import { UserJSON } from "@clerk/backend";
import { Validator, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./functions";
import { components } from "./_generated/api";

/**
 * Get the current authenticated user
 */
export const current = query({
    args: {},
    returns: v.union(
        v.object({
            _id: v.id("users"),
            _creationTime: v.number(),
            name: v.string(),
            externalId: v.string(),
            email: v.optional(v.string()),
            connectedAccounts: v.optional(
                v.array(
                    v.object({
                        provider: v.string(),
                        email: v.optional(v.string()),
                        externalId: v.string(),
                    }),
                ),
            ),
        }),
        v.null(),
    ),
    async handler(ctx) {
        const viewer = ctx.viewer;
        if (!viewer) return null;

        return {
            _id: viewer._id,
            _creationTime: viewer._creationTime,
            name: viewer.name,
            externalId: viewer.externalId,
            email: viewer.email,
            connectedAccounts: viewer.connectedAccounts,
        };
    },
});

/**
 * Ensure the authenticated Clerk user has a corresponding Convex user record.
 *
 * This is a safety net for environments where webhook delivery is delayed
 * during initial login.
 */
export const ensureCurrentUser = mutation({
    args: {},
    returns: v.id("users"),
    async handler(ctx) {
        if (ctx.viewer) {
            return ctx.viewer._id;
        }

        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Authentication required");
        }

        const existingUser = await ctx.table("users").get("externalId", identity.subject);
        if (existingUser) {
            return existingUser._id;
        }

        const name = identity.name?.trim() || identity.email?.trim() || "User";

        const userId = await ctx.table("users").insert({
            name,
            externalId: identity.subject,
            connectedAccounts: [],
        });

        return userId;
    },
});

/**
 * Upsert user from Clerk webhook
 * Called by HTTP webhook handler when Clerk sends user.created or user.updated
 */
export const upsertFromClerk = internalMutation({
    args: { data: v.any() as Validator<UserJSON> },
    returns: v.null(),
    async handler(ctx, { data }) {
        const connectedAccounts = (data.external_accounts || []).map((account: any) => ({
            provider: account.provider || account.verification?.strategy || "unknown",
            email: account.email_address,
            externalId: account.id,
        }));

        const primary = (data.email_addresses || []).find(
            (e: any) => e.id === data.primary_email_address_id,
        );
        const primaryEmail: string | undefined = primary?.email_address
            ? String(primary.email_address).toLowerCase()
            : undefined;

        // Look up existing user by Clerk ID
        const existingUser = await ctx.table("users").get("externalId", data.id);

        if (existingUser === null) {
            await ctx.table("users").insert({
                name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || "User",
                externalId: data.id,
                email: primaryEmail,
                connectedAccounts,
            });
        } else {
            await existingUser.patch({
                name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || "User",
                email: primaryEmail,
                connectedAccounts,
            });
        }

        return null;
    },
});

/**
 * Delete user from Clerk webhook
 * Called by HTTP webhook handler when Clerk sends user.deleted
 */
export const deleteFromClerk = internalMutation({
    args: { clerkUserId: v.string() },
    returns: v.null(),
    async handler(ctx, { clerkUserId }) {
        const user = await ctx.table("users").get("externalId", clerkUserId);

        if (user !== null) {
            // Delete all child entities with ref: true edges
            const edgeNames = [
                "members",
                "creditCards",
                "wallets",
                "statementSnapshots",
                "promoRates",
                "installmentPlans",
                "transactionOverlays",
            ] as const;

            for (const edgeName of edgeNames) {
                const children = await user.edge(edgeName);
                for (const child of children) {
                    const writable = await ctx.table(edgeName).getX(child._id);
                    await writable.delete();
                }
            }

            const writableUser = await ctx.table("users").getX(user._id);
            await writableUser.delete();
        } else {
            console.warn(`Can't delete user, there is none for Clerk user ID: ${clerkUserId}`);
        }

        return null;
    },
});

/**
 * Count the user's active Plaid items (not deleting).
 *
 * Used by exchangePublicTokenAction to gate the welcome-onboarding dispatch
 * per contracts §13. A user with `countActivePlaidItems === 1` after a
 * freshly-created item is treated as a first-link-ever case.
 */
export const countActivePlaidItems = internalQuery({
    args: { userId: v.string() },
    returns: v.number(),
    async handler(ctx, { userId }) {
        const items = await ctx.runQuery(components.plaid.public.getItemsByUser, {
            userId,
        });
        return items.filter((i: { status: string }) => i.status !== "deleting").length;
    },
});

/**
 * Search users by name (for sharing UI)
 */
export const search = query({
    args: {
        query: v.string(),
        organizationId: v.optional(v.id("organizations")),
    },
    returns: v.array(
        v.object({
            _id: v.id("users"),
            name: v.string(),
        }),
    ),
    async handler(ctx, { query: searchQuery, organizationId }) {
        const viewer = ctx.viewer;
        if (!viewer) return [];

        // If org is specified, only search within org members
        if (organizationId) {
            const org = await ctx.table("organizations").get(organizationId);
            if (!org) return [];

            const members = await org.edge("members");
            const users = await Promise.all(members.map((m) => m.edge("user")));

            return users
                .filter((u) => u._id !== viewer._id && u.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .slice(0, 10)
                .map((u) => ({
                    _id: u._id,
                    name: u.name,
                }));
        }

        // Otherwise search all users (limited for now)
        // In production, you'd want a search index
        const allUsers = await ctx.table("users");
        return allUsers
            .filter((u) => u._id !== viewer._id && u.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .slice(0, 10)
            .map((u) => ({
                _id: u._id,
                name: u.name,
            }));
    },
});

/**
 * Internal: resolve viewer by Clerk externalId. Used by the agent HTTP action
 * after `ctx.auth.getUserIdentity()` to translate the JWT subject to an
 * `Id<"users">` that propagates through the agent trust boundary.
 */
export const getByExternalId = internalQuery({
    args: { externalId: v.string() },
    returns: v.union(
        v.object({
            _id: v.id("users"),
            _creationTime: v.number(),
            name: v.string(),
            externalId: v.string(),
        }),
        v.null(),
    ),
    handler: async (ctx, { externalId }) => {
        const user = await ctx.table("users").get("externalId", externalId);
        if (!user) return null;
        return {
            _id: user._id,
            _creationTime: user._creationTime,
            name: user.name,
            externalId: user.externalId,
        };
    },
});

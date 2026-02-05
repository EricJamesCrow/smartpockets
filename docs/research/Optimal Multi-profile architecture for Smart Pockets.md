# Optimal multi-profile architecture for SmartPockets

**Profiles should live in Convex; reserve Clerk Organizations exclusively for team collaboration.** This hybrid approach lets you implement unlimited Personal/Business profile isolation entirely in your database while leveraging Clerk Organizations only for the premium multi-user collaboration feature—minimizing authentication costs and maximizing architectural flexibility.

## The core architectural insight

Clerk Organizations are designed for **multi-user team collaboration** (like Slack workspaces), not single-user multi-profile scenarios. Since your Business profiles require full data isolation but are initially single-user, building profiles as a Convex-native data model gives you complete control. Use Clerk Organizations later only when users invite team members—this cleanly separates concerns and aligns features with pricing tiers.

The recommended architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLERK (Authentication Layer)                  │
│  • User identity (userId)                                       │
│  • Organizations (ONLY for premium team collaboration)          │
│  • Team invitations, member management                          │
│  • Role-based access (admin/member/viewer)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONVEX (Data Layer)                          │
│  • Profiles table (userId → many profiles)                      │
│  • All data tables scoped by profileId                          │
│  • Profile isolation, switching, permissions                    │
│  • Plaid connections per-profile                                │
└─────────────────────────────────────────────────────────────────┘
```

## Convex schema design for profile isolation

The key principle: **add `profileId` as a foreign key on every data table** with a corresponding index. This enables complete data isolation while maintaining query performance.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users (synced from Clerk via webhook)
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    tier: v.union(v.literal("free"), v.literal("pro"), v.literal("premium")),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"]),

  // PROFILES - Core multi-profile support
  profiles: defineTable({
    userId: v.id("users"),
    name: v.string(),                    // "Personal", "Acme LLC", etc.
    type: v.union(v.literal("personal"), v.literal("business")),
    isDefault: v.boolean(),
    clerkOrgId: v.optional(v.string()),  // Only set when team collaboration enabled
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_default", ["userId", "isDefault"])
    .index("by_clerk_org", ["clerkOrgId"]),

  // PLAID ITEMS - Per-profile Plaid connections
  plaidItems: defineTable({
    profileId: v.id("profiles"),
    plaidItemId: v.string(),
    institutionId: v.string(),
    institutionName: v.string(),
    accessToken: v.string(),            // Encrypted
    cursor: v.optional(v.string()),
    lastSynced: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("error"), v.literal("pending")),
  })
    .index("by_profile", ["profileId"])
    .index("by_plaid_item_id", ["plaidItemId"]),

  // PLAID ACCOUNTS - Per-profile
  plaidAccounts: defineTable({
    profileId: v.id("profiles"),
    plaidItemId: v.id("plaidItems"),
    plaidAccountId: v.string(),
    name: v.string(),
    mask: v.optional(v.string()),
    type: v.string(),
    subtype: v.optional(v.string()),
    currentBalance: v.optional(v.number()),
    availableBalance: v.optional(v.number()),
    isoCurrencyCode: v.optional(v.string()),
    isHidden: v.boolean(),
  })
    .index("by_profile", ["profileId"])
    .index("by_plaid_item", ["plaidItemId"])
    .index("by_plaid_account_id", ["plaidAccountId"]),

  // PLAID TRANSACTIONS - Per-profile
  plaidTransactions: defineTable({
    profileId: v.id("profiles"),
    plaidAccountId: v.id("plaidAccounts"),
    plaidTransactionId: v.string(),
    amount: v.number(),
    date: v.string(),
    name: v.string(),
    merchantName: v.optional(v.string()),
    category: v.optional(v.array(v.string())),
    pending: v.boolean(),
    isExcluded: v.boolean(),
  })
    .index("by_profile", ["profileId"])
    .index("by_profile_and_date", ["profileId", "date"])
    .index("by_account", ["plaidAccountId"])
    .index("by_plaid_transaction_id", ["plaidTransactionId"]),

  // CREDIT CARDS - Per-profile denormalized view
  creditCards: defineTable({
    profileId: v.id("profiles"),
    plaidAccountId: v.optional(v.id("plaidAccounts")),
    name: v.string(),
    issuer: v.string(),
    network: v.union(v.literal("visa"), v.literal("mastercard"), 
                     v.literal("amex"), v.literal("discover")),
    lastFour: v.optional(v.string()),
    creditLimit: v.optional(v.number()),
    currentBalance: v.optional(v.number()),
    annualFee: v.optional(v.number()),
    rewardsProgram: v.optional(v.string()),
    openedDate: v.optional(v.string()),
    isManual: v.boolean(),
  })
    .index("by_profile", ["profileId"])
    .index("by_profile_and_issuer", ["profileId", "issuer"]),

  // CATEGORIES - Per-profile custom categories
  categories: defineTable({
    profileId: v.id("profiles"),
    name: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    parentId: v.optional(v.id("categories")),
  })
    .index("by_profile", ["profileId"]),
});
```

## Profile access control implementation

Create a reusable helper that verifies the user owns the requested profile:

```typescript
// convex/lib/profileAccess.ts
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");
  return identity;
}

export async function getUser(ctx: QueryCtx | MutationCtx) {
  const identity = await requireAuth(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new ConvexError("User not found");
  return { user, identity };
}

export async function requireProfileAccess(
  ctx: QueryCtx | MutationCtx,
  profileId: Id<"profiles">
) {
  const { user, identity } = await getUser(ctx);
  const profile = await ctx.db.get(profileId);
  
  if (!profile) throw new ConvexError("Profile not found");
  if (profile.userId !== user._id) {
    throw new ConvexError("Access denied: Not your profile");
  }
  
  return { user, profile, identity };
}

export async function getDefaultProfile(ctx: QueryCtx | MutationCtx) {
  const { user } = await getUser(ctx);
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user_and_default", (q) => 
      q.eq("userId", user._id).eq("isDefault", true)
    )
    .first();
  
  if (!profile) throw new ConvexError("No default profile found");
  return profile;
}
```

## Profile-scoped queries pattern

Every query and mutation that accesses financial data should accept a `profileId`:

```typescript
// convex/creditCards.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireProfileAccess } from "./lib/profileAccess";

export const list = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    await requireProfileAccess(ctx, profileId);
    
    return ctx.db
      .query("creditCards")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .collect();
  },
});

export const create = mutation({
  args: {
    profileId: v.id("profiles"),
    name: v.string(),
    issuer: v.string(),
    network: v.union(v.literal("visa"), v.literal("mastercard"), 
                     v.literal("amex"), v.literal("discover")),
    // ... other fields
  },
  handler: async (ctx, args) => {
    const { profile } = await requireProfileAccess(ctx, args.profileId);
    
    return ctx.db.insert("creditCards", {
      profileId: args.profileId,
      name: args.name,
      issuer: args.issuer,
      network: args.network,
      isManual: true,
    });
  },
});
```

## Clerk Organizations capabilities and when to use them

Clerk Organizations are included in the **free tier** with limits:

| Feature | Free | Pro ($25/mo) | +Enhanced Orgs ($100/mo) |
|---------|------|--------------|--------------------------|
| MAOs included | 100 | 100 | 100 |
| Members per org | **5 max** | Unlimited | Unlimited |
| Roles | Admin/Member | Admin/Member | Custom roles |
| Permissions | Basic | Basic | Fine-grained |
| Cost per extra MAO | N/A | $1/MAO | $1/MAO |

**Critical limitation**: Clerk Organizations provide **identity and role context only**, not data isolation. The JWT token includes `orgId` and `orgRole`, but you must implement data filtering yourself.

Use Clerk Organizations **only** for the premium team collaboration tier:

```typescript
// When user upgrades to Premium and creates a team workspace
// 1. Create Clerk Organization via API
// 2. Link it to their existing Convex profile

export const enableTeamForProfile = mutation({
  args: { profileId: v.id("profiles"), clerkOrgId: v.string() },
  handler: async (ctx, { profileId, clerkOrgId }) => {
    const { user, profile } = await requireProfileAccess(ctx, profileId);
    
    // Verify user's tier allows team features
    if (user.tier !== "premium") {
      throw new ConvexError("Premium tier required for team features");
    }
    
    // Link Clerk org to existing profile
    await ctx.db.patch(profileId, { clerkOrgId });
  },
});
```

## Plaid connections must be per-profile

For true business/personal isolation, Plaid Items (bank connections) must be scoped to profiles, not users:

```typescript
// convex/plaid.ts
export const createLinkToken = action({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    // Verify profile access
    await ctx.runQuery(internal.plaid.verifyProfileAccess, { profileId });
    
    const profile = await ctx.runQuery(internal.profiles.get, { profileId });
    const user = await ctx.runQuery(internal.users.get, { userId: profile.userId });
    
    // Create Plaid link token for this specific profile
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: `${user._id}_${profileId}` }, // Unique per profile!
      client_name: "SmartPockets",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
    });
    
    return response.data.link_token;
  },
});

export const exchangeToken = mutation({
  args: { 
    profileId: v.id("profiles"),
    publicToken: v.string(),
    institutionId: v.string(),
    institutionName: v.string(),
  },
  handler: async (ctx, args) => {
    await requireProfileAccess(ctx, args.profileId);
    
    // Exchange happens in action, store in Convex
    const result = await ctx.scheduler.runAfter(0, internal.plaid.exchange, {
      profileId: args.profileId,
      publicToken: args.publicToken,
      institutionId: args.institutionId,
      institutionName: args.institutionName,
    });
    
    return result;
  },
});
```

## Migration strategy for existing userId-scoped data

If you have existing data scoped by `userId`, here's the migration path:

**Step 1: Add optional profileId field**
```typescript
// Update schema to make profileId optional temporarily
plaidItems: defineTable({
  userId: v.optional(v.string()),     // Keep for migration
  profileId: v.optional(v.id("profiles")),  // New field
  // ... existing fields
})
```

**Step 2: Create default profiles for existing users**
```typescript
// convex/migrations/createDefaultProfiles.ts
export const run = internalMutation({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    
    for (const user of users) {
      // Check if default profile exists
      const existing = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      
      if (!existing) {
        await ctx.db.insert("profiles", {
          userId: user._id,
          name: "Personal",
          type: "personal",
          isDefault: true,
          createdAt: Date.now(),
        });
      }
    }
  },
});
```

**Step 3: Backfill profileId on existing records**
```typescript
export const backfillProfileIds = internalMutation({
  handler: async (ctx) => {
    // Process in batches
    const items = await ctx.db
      .query("plaidItems")
      .filter((q) => q.eq(q.field("profileId"), undefined))
      .take(100);
    
    for (const item of items) {
      // Find user's default profile
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", item.userId))
        .first();
      
      if (user) {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user_and_default", (q) => 
            q.eq("userId", user._id).eq("isDefault", true)
          )
          .first();
        
        if (profile) {
          await ctx.db.patch(item._id, { profileId: profile._id });
        }
      }
    }
    
    // Schedule next batch if needed
    if (items.length === 100) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillProfileIds);
    }
  },
});
```

**Step 4: Make profileId required, remove userId**
```typescript
// Final schema after migration complete
plaidItems: defineTable({
  profileId: v.id("profiles"),  // Now required
  // ... rest of fields (userId removed)
}).index("by_profile", ["profileId"])
```

## Convex Ents: evaluation for this use case

**Convex Ents** is an official library providing an ORM-like layer with relationship traversal, rules, and cascading deletes. However, it's in **maintenance mode** (no new features).

| Consideration | Ents | Vanilla Convex |
|---------------|------|----------------|
| Relationship traversal | `user.edge("profiles")` fluent API | Manual index queries |
| Cascading deletes | Built-in | Manual implementation |
| Row-level security | Collocated with schema | Separate helpers |
| Future-proofing | Maintenance mode | Active development |
| Complexity | Additional dependency | Direct control |

**Recommendation for SmartPockets**: Use **vanilla Convex** with the helper patterns shown above. Your relationship model (user → profiles → financial data) is straightforward enough that Ents' fluent API doesn't justify the dependency risk. The `requireProfileAccess` helper provides equivalent security guarantees.

## How fintech apps handle profile isolation

Industry patterns from YNAB, QuickBooks, and Wave inform this architecture:

**YNAB**: Uses "budget files" as the isolation unit—separate, independent data silos per budget. Users can create unlimited budgets, switch between them via dropdown. This maps directly to our profile model.

**QuickBooks**: Uses "company files"—each requires separate subscription for true business isolation. SmartPockets' approach of allowing multiple business profiles in paid tiers is more user-friendly.

**Wave Accounting**: Allows up to **15 business profiles** in one account, each completely isolated with own bank connections, invoices, and reports. This validates our architecture of profile-scoped Plaid connections.

**Key insight**: No major fintech app stores personal and business data in the same tables with just a filter flag. True isolation via foreign key (profileId) is the standard pattern.

## Profile switching UX implementation

Store the active profile in React state or local storage, pass to all Convex queries:

```tsx
// contexts/ProfileContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const profiles = useQuery(api.profiles.list);
  const [activeProfileId, setActiveProfileId] = useState(null);
  
  // Initialize with default profile
  useEffect(() => {
    if (profiles && !activeProfileId) {
      const defaultProfile = profiles.find(p => p.isDefault);
      if (defaultProfile) setActiveProfileId(defaultProfile._id);
    }
  }, [profiles]);
  
  return (
    <ProfileContext.Provider value={{ 
      activeProfileId, 
      setActiveProfileId,
      profiles 
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

// ProfileSwitcher component
export function ProfileSwitcher() {
  const { activeProfileId, setActiveProfileId, profiles } = useProfile();
  
  return (
    <select 
      value={activeProfileId} 
      onChange={(e) => setActiveProfileId(e.target.value)}
    >
      {profiles?.map(profile => (
        <option key={profile._id} value={profile._id}>
          {profile.type === "business" ? "🏢" : "👤"} {profile.name}
        </option>
      ))}
    </select>
  );
}
```

## Pricing tier structure recommendation

Align your pricing with the Clerk cost model and competitive positioning:

| Tier | Price | Profiles | Team | Clerk Cost |
|------|-------|----------|------|------------|
| **Free** | $0 | 1 Personal | ❌ | $0 |
| **Pro** | $8/mo or $79/yr | 3 (incl. 1 Business) | ❌ | ~$0.02/MAU |
| **Premium** | $19/mo or $149/yr | Unlimited | ✅ (5 members) | ~$1/MAO |
| **Business** | $39/mo or $299/yr | Unlimited | ✅ (unlimited) | ~$3-5/MAO |

**Key pricing insights**:
- Personal profiles in Convex cost you nothing in Clerk fees
- Only Premium/Business tiers trigger Clerk Organization costs ($1/MAO)
- YNAB charges $109/year, Monarch $99/year—your Pro tier at $79/year undercuts both with the business profile differentiator
- Team features at $149/year have no direct competitor in personal finance apps

## Clear delineation of responsibilities

| Concern | Clerk | Convex |
|---------|-------|--------|
| User authentication | ✅ | — |
| User identity (userId) | ✅ | Synced via webhook |
| Profile data | — | ✅ Profiles table |
| Profile switching | — | ✅ Client state + queries |
| Data isolation | — | ✅ profileId foreign keys |
| Team invitations | ✅ Orgs (Premium tier) | Links via clerkOrgId |
| Member roles | ✅ Orgs | Enforced in mutations |
| Plaid connections | — | ✅ Per-profile |
| Financial data | — | ✅ All tables |

## Final architecture summary

```
User signs up (Free)
    │
    └──▶ Clerk creates user identity
         │
         └──▶ Webhook syncs to Convex users table
              │
              └──▶ Default "Personal" profile created
                   │
                   └──▶ All data scoped by profileId

User upgrades to Pro
    │
    └──▶ Can create Business profile(s)
         │
         └──▶ Business profile gets own Plaid connections
              │
              └──▶ Complete data isolation via profileId

User upgrades to Premium
    │
    └──▶ Can enable Team on any Business profile
         │
         └──▶ Clerk Organization created
              │
              └──▶ clerkOrgId linked to Convex profile
                   │
                   └──▶ Team members invited via Clerk
                        │
                        └──▶ Members access profile data via orgId in JWT
```

This architecture provides complete data isolation for personal vs. business scenarios, scales efficiently with Clerk's pricing model, and positions team collaboration as a premium differentiator—all while keeping your data model in Convex where you have full control.
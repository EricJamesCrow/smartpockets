# Settings Implementation Roadmap

> Implementation guide for wiring UntitledUI settings pages to Clerk and Convex.

## Overview

| Page | Status | Backend | Phase |
|------|--------|---------|-------|
| Password | ✅ Complete | Clerk | — |
| Profile | ✅ Complete | Clerk | 1 |
| Email | ✅ Complete | Clerk | 1 |
| Notifications | ✅ Complete | Convex | 2 |
| Appearance | ✅ Complete | Convex | 2 |
| Integrations | ✅ Complete | Clerk OAuth | 3 |
| Billing | ✅ Complete | Clerk Billing | 4 |
| Team | Missing | Clerk Organizations | 5 |

**Infrastructure Status:**
- Clerk Provider: ✅ Configured
- Convex Webhook: ✅ `user.created` / `user.updated` synced
- Toast Notifications: ✅ Sonner + IconNotification

---

## Phase 1: Profile & Email (Clerk Core)

### 1.1 Profile Page

**File:** `src/app/settings/page.tsx`

**Clerk APIs:**
```typescript
import { useUser } from "@clerk/nextjs";

const { user } = useUser();

// Update profile fields
await user.update({
  firstName: "John",
  lastName: "Doe",
  unsafeMetadata: {
    bio: "Custom bio text",
    jobTitle: "Software Engineer",
    timezone: "America/New_York"
  }
});

// Avatar management
await user.setProfileImage({ file: imageFile });
await user.deleteProfileImage(); // Remove avatar
```

**Implementation Steps:**
1. Add `useUser()` hook and form state
2. Convert existing form inputs to controlled components
3. Wire avatar FileUploader to `user.setProfileImage()`
4. Add submit handler calling `user.update()`
5. Display success/error toasts using existing pattern

**Error Handling:**
| Error Code | Field | Message |
|------------|-------|---------|
| `form_param_format_invalid` | firstName/lastName | "Name format is invalid" |
| `form_identifier_exists` | username | "Username already taken" |
| Network error | toast | "Failed to update profile" |

---

### 1.2 Email Page (New)

**File:** `src/app/settings/email/page.tsx` (create new)

**Clerk APIs:**
```typescript
const { user } = useUser();

// List emails
user.emailAddresses.map(email => ({
  id: email.id,
  address: email.emailAddress,
  isPrimary: email.id === user.primaryEmailAddressId,
  verified: email.verification.status === "verified"
}));

// Add new email
const newEmail = await user.createEmailAddress({
  email: "new@example.com"
});

// Verify email (sends code)
await newEmail.prepareVerification({ strategy: "email_code" });

// Confirm verification code
await newEmail.attemptVerification({ code: "123456" });

// Set as primary
await user.update({ primaryEmailAddressId: email.id });

// Remove email
await email.destroy();
```

**UI Structure:**
```
Email Settings
├── Current emails list
│   ├── Primary email (with badge)
│   ├── Secondary emails (with "Make primary" action)
│   └── Remove action (for non-primary)
├── Add email section
│   ├── Email input
│   └── "Add email" button
└── Verification modal
    ├── 6-digit code input
    └── Resend code link
```

**Component Requirements:**
- `InputBase` for email input
- `BadgeWithDot` for "Primary" / "Unverified" status
- `Dropdown` for email actions (Make primary, Remove)
- `Modal` for verification code entry
- `Button` with loading state

**Files to Create/Modify:**
- Create: `src/app/settings/email/page.tsx`
- Modify: `src/components/application/tabs/settings-tabs.tsx` (verify route exists)

---

## Phase 2: Preferences (Convex)

### 2.1 Convex Schema Addition

**File:** `convex/schema.ts`

```typescript
userPreferences: defineTable({
  userId: v.id("users"),

  // Notifications
  emailNotifications: v.boolean(),
  pushNotifications: v.boolean(),
  smsNotifications: v.boolean(),
  notifyComments: v.boolean(),
  notifyMentions: v.boolean(),
  notifyUpdates: v.boolean(),
  weeklyDigest: v.boolean(),

  // Appearance
  theme: v.union(
    v.literal("light"),
    v.literal("dark"),
    v.literal("system")
  ),
  brandColor: v.optional(v.string()),
  language: v.optional(v.string()),
}).index("byUserId", ["userId"]),
```

### 2.2 Convex Functions

**File:** `convex/userPreferences.ts`

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  returns: v.union(v.null(), v.object({ /* schema */ })),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", q => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    return await ctx.db
      .query("userPreferences")
      .withIndex("byUserId", q => q.eq("userId", user._id))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    emailNotifications: v.optional(v.boolean()),
    pushNotifications: v.optional(v.boolean()),
    // ... other fields
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkId", q => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("byUserId", q => q.eq("userId", user._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("userPreferences", {
        userId: user._id,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        notifyComments: true,
        notifyMentions: true,
        notifyUpdates: true,
        weeklyDigest: false,
        theme: "system",
        ...args,
      });
    }
    return null;
  },
});
```

### 2.3 Notifications Page

**File:** `src/app/settings/notifications/page.tsx`

**Implementation:**
```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "#cvx/_generated/api";

export default function NotificationsPage() {
  const preferences = useQuery(api.userPreferences.get);
  const updatePreferences = useMutation(api.userPreferences.upsert);

  const handleToggle = async (key: string, value: boolean) => {
    await updatePreferences({ [key]: value });
    toast.custom((t) => (
      <IconNotification
        title="Preferences updated"
        description="Your notification settings have been saved."
        color="success"
        onClose={() => toast.dismiss(t)}
      />
    ));
  };

  return (
    // Wire existing Toggle components to handleToggle
  );
}
```

### 2.4 Appearance Page

**File:** `src/app/settings/appearance/page.tsx`

Same pattern as Notifications - use `useQuery` and `useMutation` with optimistic updates:

```typescript
const updatePreferences = useMutation(api.userPreferences.upsert)
  .withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.userPreferences.get, {});
    if (current) {
      localStore.setQuery(api.userPreferences.get, {}, { ...current, ...args });
    }
  });
```

---

## Phase 3: Integrations (OAuth)

**File:** `src/app/settings/integrations/page.tsx`

### Connected Accounts Section

The Integrations page will show both:
1. **Connected OAuth accounts** (from Clerk)
2. **Available integrations** (connect buttons)

**Clerk APIs:**
```typescript
const { user } = useUser();

// Get connected accounts
user.externalAccounts.map(account => ({
  id: account.id,
  provider: account.provider, // "oauth_google", "oauth_github", etc.
  email: account.emailAddress,
  username: account.username,
  avatarUrl: account.avatarUrl,
}));

// Connect new OAuth provider
const connectOAuth = async (provider: string) => {
  const account = await user.createExternalAccount({
    strategy: `oauth_${provider}`,
    redirectUrl: `${window.location.origin}/settings/integrations`,
  });
  // Redirect to OAuth provider
  window.location.href = account.verification.externalVerificationRedirectURL!;
};

// Disconnect (requires reverification for security)
const disconnectAccount = useReverification(async (account) => {
  await account.destroy();
});
```

**UI Structure:**
```
Integrations
├── Connected Accounts Section
│   └── Cards for each connected provider
│       ├── Provider icon + name
│       ├── Connected email/username
│       └── Disconnect button (with confirmation)
├── Available Integrations (category tabs)
│   └── Integration cards
│       ├── Provider icon + name
│       ├── Description
│       └── Connect button → triggers OAuth flow
```

**OAuth Callback:**
Add callback handling at `src/app/settings/integrations/page.tsx`:
```typescript
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// Handle OAuth callback
useEffect(() => {
  const url = new URL(window.location.href);
  if (url.searchParams.has("__clerk_status")) {
    // Clerk handles the callback automatically
    // Show success/error toast based on result
  }
}, []);
```

**Security Note:** Disconnecting OAuth accounts triggers automatic reverification via `useReverification()` hook.

---

## Phase 4: Billing (Experimental)

**File:** `src/app/settings/billing/page.tsx`

> **Warning:** Clerk Billing is in beta. Pin SDK versions and expect API changes.

**Clerk Billing Hooks:**
```typescript
import {
  usePlans,
  useSubscription,
  useCheckout
} from "@clerk/nextjs/experimental";

function BillingPage() {
  // Get available plans
  const { data: plans, isLoading: plansLoading } = usePlans({ for: "user" });

  // Get current subscription
  const { data: subscription } = useSubscription({ for: "user" });

  // Handle plan selection
  const { checkout, isLoading: checkoutLoading } = useCheckout({
    planId: selectedPlanId,
    planPeriod: "month", // or "year"
    for: "user",
  });

  const handleUpgrade = async (planId: string) => {
    const result = await checkout.start();
    if (result.status === "complete") {
      toast.success("Subscription updated!");
    }
  };

  return (
    <>
      {/* Current Plan Display */}
      <div>
        <h3>Current Plan: {subscription?.plan.name}</h3>
        <p>Status: {subscription?.status}</p>
        <p>Next billing: {subscription?.nextPayment?.date}</p>
      </div>

      {/* Plan Cards */}
      {plans?.map(plan => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isCurrent={plan.id === subscription?.plan.id}
          onSelect={() => handleUpgrade(plan.id)}
        />
      ))}

      {/* Invoice History - from existing UI */}
    </>
  );
}
```

**Feature Gating:**
```typescript
import { Protect, useAuth } from "@clerk/nextjs";

// Check if user has feature
const { has } = useAuth();
const hasPremiumFeature = has?.({ feature: "advanced_analytics" });

// Component-level gating
<Protect plan="premium" fallback={<UpgradePrompt />}>
  <PremiumFeature />
</Protect>
```

---

## Phase 5: Team (Clerk Organizations)

**File:** `src/app/settings/team/page.tsx` (create new)

**Clerk APIs:**
```typescript
import { useOrganization, useOrganizationList } from "@clerk/nextjs";

const { organization, memberships, invitations } = useOrganization({
  memberships: { pageSize: 10 },
  invitations: { pageSize: 10 },
});

// Invite members
await organization.inviteMember({
  emailAddress: "user@example.com",
  role: "org:member", // or "org:admin" or custom role
});

// Change member roles
await membership.update({ role: "org:admin" });

// Remove members
await organization.removeMember("user_123");

// Revoke pending invitations
await invitation.revoke();

// Update organization profile
await organization.update({ name: "New Name", slug: "new-slug" });
await organization.setLogo({ file: logoFile });
```

**Permission Checking:**
```typescript
import { useAuth } from "@clerk/nextjs";

const { has } = useAuth();
const canManageBilling = has({ permission: "org:billing:manage" });
const isAdmin = has({ role: "org:admin" });
```

**UI Structure:**
```
Team Settings
├── Organization Profile Section
│   ├── Organization name input
│   ├── Slug input
│   └── Logo upload with FileUploader
├── Members Tab
│   ├── Members table
│   │   ├── Avatar
│   │   ├── Name & email
│   │   ├── Role badge
│   │   └── Actions dropdown (Change role, Remove)
│   └── Pagination
├── Invitations Tab
│   ├── Invite form (email input + role select)
│   ├── Pending invitations table
│   │   ├── Email
│   │   ├── Role
│   │   ├── Status badge
│   │   └── Revoke action
│   └── Resend invitation action
```

**Component Requirements:**
- `Tabs` for Members / Invitations sections
- `Table` for member and invitation lists
- `Avatar` for member photos
- `Badge` for role display
- `Dropdown` for member actions
- `Modal` for remove confirmation
- `InputBase` + `Select` for invite form
- `FileTrigger` for logo upload
- `Pagination` for large member lists

**Files to Create/Modify:**
- Create: `src/app/settings/team/page.tsx`
- Modify: `src/components/application/tabs/settings-tabs.tsx` (add Team tab)

**Error Handling:**
| Error Code | Message |
|------------|---------|
| `organization_membership_not_found` | "Member not found" |
| `organization_invitation_not_found` | "Invitation not found" |
| `organization_domain_verification_pending` | "Domain verification required" |
| Network error | "Failed to update team settings" |

---

## Convex Schema Summary

```typescript
// convex/schema.ts additions
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Existing users table (already set up)
  users: defineTable({
    clerkId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  }).index("byClerkId", ["clerkId"]),

  // New: User preferences
  userPreferences: defineTable({
    userId: v.id("users"),
    // Notifications
    emailNotifications: v.boolean(),
    pushNotifications: v.boolean(),
    smsNotifications: v.boolean(),
    notifyComments: v.boolean(),
    notifyMentions: v.boolean(),
    notifyUpdates: v.boolean(),
    weeklyDigest: v.boolean(),
    // Appearance
    theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
    brandColor: v.optional(v.string()),
    language: v.optional(v.string()),
  }).index("byUserId", ["userId"]),
});
```

---

## Security Considerations

### Operations Requiring Reverification

| Operation | Automatic? |
|-----------|------------|
| Password change | ✅ Yes |
| Email updates | ✅ Yes |
| Enable/disable MFA | ✅ Yes |
| Unlink OAuth accounts | ✅ Yes |

### Safe for Direct API Calls

- Profile updates (name, avatar, metadata)
- Notification preferences
- Appearance settings
- Session display/revocation
- Adding new emails (verification required separately)

### Never Expose Client-Side

- `CLERK_SECRET_KEY` - backend only
- Sensitive user data not returned by Clerk hooks
- Direct database credentials

---

## Implementation Order

```
Phase 1 (Clerk Core)
├── 1.1 Profile Page
│   ├── Add useUser hook
│   ├── Wire form to user.update()
│   └── Wire avatar to setProfileImage()
└── 1.2 Email Page
    ├── Create page.tsx
    ├── List emails with status badges
    ├── Add email + verification flow
    └── Primary email management

Phase 2 (Convex Preferences) - Can run parallel with Phase 1
├── 2.1 Add schema.ts changes
├── 2.2 Create userPreferences.ts functions
├── 2.3 Wire Notifications page
└── 2.4 Wire Appearance page

Phase 3 (OAuth Integrations) - After Phase 1
└── 3.1 Integrations Page
    ├── Show connected accounts from user.externalAccounts
    ├── Add connect OAuth buttons
    └── Add disconnect with reverification

Phase 4 (Billing) - Independent, experimental
└── 4.1 Billing Page
    ├── Add experimental Clerk Billing hooks
    ├── Wire plan selection
    └── Display subscription status

Phase 5 (Team) - Requires Clerk Organizations
└── 5.1 Team Page
    ├── Create page.tsx with useOrganization hook
    ├── Organization profile section (name, slug, logo)
    ├── Members tab with table + pagination
    ├── Invitations tab with invite form
    └── Add Team tab to settings-tabs.tsx
```

---

## Files Reference

| Feature | Files to Modify/Create |
|---------|----------------------|
| Profile | `src/app/settings/page.tsx` |
| Email | `src/app/settings/email/page.tsx` |
| Notifications | `src/app/settings/notifications/page.tsx` |
| Appearance | `src/app/settings/appearance/page.tsx` |
| Integrations | `src/app/settings/integrations/page.tsx` |
| Billing | `src/app/settings/billing/page.tsx` |
| Team | `src/app/settings/team/page.tsx` (new) |
| Convex Schema | `convex/schema.ts` |
| Convex Functions | `convex/userPreferences.ts` |

---

## Resources

- [Clerk React SDK Docs](https://clerk.com/docs/references/react)
- [Clerk Organizations](https://clerk.com/docs/organizations/overview)
- [Clerk Billing (Beta)](https://clerk.com/docs/billing)
- [Convex + Clerk Integration](https://docs.convex.dev/auth/clerk)
- [UntitledUI Components](https://www.untitledui.com/components)

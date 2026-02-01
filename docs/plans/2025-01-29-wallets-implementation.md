# Wallets Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dedicated /wallets page with pinnable wallets that appear in the sidebar, featuring card stack visuals with hover peek animations.

**Architecture:** New `wallets` and `walletCards` Convex Ents tables. Dedicated /wallets page with grid of wallet cards. Pinned wallets render in dashboard sidebar with accordion expand. Credit cards page accepts wallet query param for filtering.

**Tech Stack:** Convex Ents, React, Framer Motion, UntitledUI components (Dropdown, SlideoutMenu, Toggle)

---

## Phase 1: Backend Schema & Queries

### Task 1.1: Add Schema Tables

**Files:**
- Modify: `packages/backend/convex/schema.ts`

**Step 1: Add wallets table after creditCards definition (around line 244)**

```typescript
    // === WALLETS (credit card organization) ===
    wallets: defineEnt({
      name: v.string(),
      color: v.optional(v.string()),
      icon: v.optional(v.string()),
      isPinned: v.boolean(),
      sortOrder: v.number(),
      pinnedSortOrder: v.number(),
    })
      .edge("user")
      .edges("walletCards", { ref: true })
      .index("by_user_sortOrder", ["userId", "sortOrder"])
      .index("by_user_pinned", ["userId", "isPinned"]),

    walletCards: defineEnt({
      sortOrder: v.number(),
      addedAt: v.number(),
    })
      .edge("wallet")
      .edge("creditCard")
      .index("by_wallet_sortOrder", ["walletId", "sortOrder"])
      .index("by_creditCard", ["creditCardId"]),
```

**Step 2: Add edge to creditCards table**

Find the `creditCards` definition and add after the existing edges:

```typescript
      .edges("walletCards", { ref: true })
```

**Step 3: Run Convex to verify schema**

Run: `cd packages/backend && npx convex dev`
Expected: Schema updates applied, no errors

**Step 4: Commit**

```bash
git add packages/backend/convex/schema.ts
git commit -m "feat(wallets): add wallets and walletCards schema tables"
```

---

### Task 1.2: Create Wallet Queries

**Files:**
- Create: `packages/backend/convex/wallets/queries.ts`
- Create: `packages/backend/convex/wallets/index.ts`

**Step 1: Create queries file**

```typescript
/**
 * Wallet Queries
 *
 * All read operations for wallet data.
 * Uses Convex Ents for type-safe queries with user ownership verification.
 */

import { v } from "convex/values";
import { query } from "../functions";

/**
 * List all wallets for the current user
 *
 * @returns Array of wallets with card counts and stats, sorted by sortOrder
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("wallets"),
      _creationTime: v.number(),
      userId: v.id("users"),
      name: v.string(),
      color: v.optional(v.string()),
      icon: v.optional(v.string()),
      isPinned: v.boolean(),
      sortOrder: v.number(),
      pinnedSortOrder: v.number(),
      cardCount: v.number(),
      // Computed stats
      totalBalance: v.number(),
      totalCreditLimit: v.number(),
      totalAvailableCredit: v.number(),
      averageUtilization: v.number(),
    })
  ),
  async handler(ctx) {
    const viewer = ctx.viewerX();
    const wallets = await ctx
      .table("wallets", "by_user_sortOrder", (q) => q.eq("userId", viewer._id))
      .map(async (wallet) => {
        const walletCards = await ctx
          .table("walletCards", "by_wallet_sortOrder", (q) =>
            q.eq("walletId", wallet._id)
          )
          .map((wc) => wc.doc());

        // Fetch card details for stats
        let totalBalance = 0;
        let totalCreditLimit = 0;
        let totalAvailableCredit = 0;

        for (const wc of walletCards) {
          const card = await ctx.table("creditCards").get(wc.creditCardId);
          if (card) {
            totalBalance += card.currentBalance ?? 0;
            totalCreditLimit += card.creditLimit ?? 0;
            totalAvailableCredit += card.availableCredit ?? 0;
          }
        }

        const averageUtilization =
          totalCreditLimit > 0
            ? Math.round((totalBalance / totalCreditLimit) * 100)
            : 0;

        return {
          ...wallet.doc(),
          cardCount: walletCards.length,
          totalBalance,
          totalCreditLimit,
          totalAvailableCredit,
          averageUtilization,
        };
      });
    return wallets;
  },
});

/**
 * List pinned wallets for sidebar
 *
 * @returns Array of pinned wallets sorted by pinnedSortOrder
 */
export const listPinned = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("wallets"),
      name: v.string(),
      color: v.optional(v.string()),
      icon: v.optional(v.string()),
      pinnedSortOrder: v.number(),
      cardCount: v.number(),
    })
  ),
  async handler(ctx) {
    const viewer = ctx.viewerX();
    const wallets = await ctx
      .table("wallets", "by_user_pinned", (q) =>
        q.eq("userId", viewer._id).eq("isPinned", true)
      )
      .map(async (wallet) => {
        const walletCards = await ctx
          .table("walletCards", "by_wallet_sortOrder", (q) =>
            q.eq("walletId", wallet._id)
          )
          .map((wc) => wc.doc());

        return {
          _id: wallet._id,
          name: wallet.name,
          color: wallet.color,
          icon: wallet.icon,
          pinnedSortOrder: wallet.pinnedSortOrder,
          cardCount: walletCards.length,
        };
      });

    // Sort by pinnedSortOrder
    return wallets.sort((a, b) => a.pinnedSortOrder - b.pinnedSortOrder);
  },
});

/**
 * Get a single wallet with its card IDs
 *
 * @param walletId - The wallet document ID
 * @returns Wallet with cardIds array, or null if not found/not owned
 */
export const getWithCards = query({
  args: {
    walletId: v.id("wallets"),
  },
  returns: v.union(
    v.object({
      wallet: v.object({
        _id: v.id("wallets"),
        _creationTime: v.number(),
        userId: v.id("users"),
        name: v.string(),
        color: v.optional(v.string()),
        icon: v.optional(v.string()),
        isPinned: v.boolean(),
        sortOrder: v.number(),
        pinnedSortOrder: v.number(),
      }),
      cardIds: v.array(v.id("creditCards")),
    }),
    v.null()
  ),
  async handler(ctx, { walletId }) {
    const viewer = ctx.viewerX();
    const wallet = await ctx.table("wallets").get(walletId);

    if (!wallet || wallet.userId !== viewer._id) {
      return null;
    }

    const walletCards = await ctx
      .table("walletCards", "by_wallet_sortOrder", (q) =>
        q.eq("walletId", walletId)
      )
      .map((wc) => wc.creditCardId);

    return {
      wallet: wallet.doc(),
      cardIds: walletCards,
    };
  },
});

/**
 * Get cards in a wallet with full card details (for sidebar expand)
 *
 * @param walletId - The wallet document ID
 * @returns Array of card summaries for sidebar display
 */
export const getWalletCardsSummary = query({
  args: {
    walletId: v.id("wallets"),
  },
  returns: v.array(
    v.object({
      _id: v.id("creditCards"),
      displayName: v.string(),
      brand: v.optional(
        v.union(
          v.literal("visa"),
          v.literal("mastercard"),
          v.literal("amex"),
          v.literal("discover"),
          v.literal("other")
        )
      ),
      lastFour: v.optional(v.string()),
    })
  ),
  async handler(ctx, { walletId }) {
    const viewer = ctx.viewerX();
    const wallet = await ctx.table("wallets").get(walletId);

    if (!wallet || wallet.userId !== viewer._id) {
      return [];
    }

    const walletCards = await ctx
      .table("walletCards", "by_wallet_sortOrder", (q) =>
        q.eq("walletId", walletId)
      )
      .map((wc) => wc.doc());

    const cards = [];
    for (const wc of walletCards) {
      const card = await ctx.table("creditCards").get(wc.creditCardId);
      if (card) {
        cards.push({
          _id: card._id,
          displayName: card.displayName,
          brand: card.brand,
          lastFour: card.lastFour,
        });
      }
    }

    return cards;
  },
});

/**
 * Get cards NOT in a specific wallet (for add cards slideout)
 *
 * @param walletId - The wallet document ID
 * @returns Array of cards not in this wallet
 */
export const getCardsNotInWallet = query({
  args: {
    walletId: v.id("wallets"),
  },
  returns: v.array(
    v.object({
      _id: v.id("creditCards"),
      displayName: v.string(),
      company: v.optional(v.string()),
      brand: v.optional(
        v.union(
          v.literal("visa"),
          v.literal("mastercard"),
          v.literal("amex"),
          v.literal("discover"),
          v.literal("other")
        )
      ),
      lastFour: v.optional(v.string()),
      currentBalance: v.optional(v.number()),
    })
  ),
  async handler(ctx, { walletId }) {
    const viewer = ctx.viewerX();
    const wallet = await ctx.table("wallets").get(walletId);

    if (!wallet || wallet.userId !== viewer._id) {
      return [];
    }

    // Get IDs of cards already in wallet
    const walletCards = await ctx
      .table("walletCards", "by_wallet_sortOrder", (q) =>
        q.eq("walletId", walletId)
      )
      .map((wc) => wc.creditCardId);
    const existingCardIds = new Set(walletCards.map(String));

    // Get all user's cards
    const allCards = await ctx
      .table("creditCards", "by_user_active", (q) =>
        q.eq("userId", viewer._id).eq("isActive", true)
      )
      .map((card) => card.doc());

    // Filter out cards already in wallet
    return allCards
      .filter((card) => !existingCardIds.has(String(card._id)))
      .map((card) => ({
        _id: card._id,
        displayName: card.displayName,
        company: card.company,
        brand: card.brand,
        lastFour: card.lastFour,
        currentBalance: card.currentBalance,
      }));
  },
});
```

**Step 2: Create index file**

```typescript
export * as queries from "./queries";
export * as mutations from "./mutations";
```

**Step 3: Commit**

```bash
git add packages/backend/convex/wallets/
git commit -m "feat(wallets): add wallet queries"
```

---

### Task 1.3: Create Wallet Mutations

**Files:**
- Create: `packages/backend/convex/wallets/mutations.ts`

**Step 1: Create mutations file**

```typescript
/**
 * Wallet Mutations
 *
 * All write operations for wallet data.
 * Uses Convex Ents for type-safe mutations with user ownership verification.
 */

import { v } from "convex/values";
import { mutation } from "../functions";

const MAX_WALLETS = 20;

/**
 * Create a new wallet
 */
export const create = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  returns: v.id("wallets"),
  async handler(ctx, { name, color, icon }) {
    const viewer = ctx.viewerX();

    const existingWallets = await ctx
      .table("wallets", "by_user_sortOrder", (q) => q.eq("userId", viewer._id))
      .map((w) => w.doc());

    if (existingWallets.length >= MAX_WALLETS) {
      throw new Error(`Maximum of ${MAX_WALLETS} wallets allowed`);
    }

    const maxSortOrder = existingWallets.reduce(
      (max, w) => Math.max(max, w.sortOrder),
      -1
    );

    const walletId = await ctx.table("wallets").insert({
      userId: viewer._id,
      name: name.trim(),
      color,
      icon,
      isPinned: false,
      sortOrder: maxSortOrder + 1,
      pinnedSortOrder: 0,
    });

    return walletId;
  },
});

/**
 * Update wallet properties
 */
export const update = mutation({
  args: {
    walletId: v.id("wallets"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  returns: v.null(),
  async handler(ctx, { walletId, name, color, icon }) {
    const viewer = ctx.viewerX();
    const wallet = await ctx.table("wallets").getX(walletId);

    if (wallet.userId !== viewer._id) {
      throw new Error("Not authorized to modify this wallet");
    }

    const updates: { name?: string; color?: string; icon?: string } = {};
    if (name !== undefined) updates.name = name.trim();
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;

    if (Object.keys(updates).length > 0) {
      await wallet.patch(updates);
    }

    return null;
  },
});

/**
 * Toggle wallet pinned status
 */
export const togglePin = mutation({
  args: {
    walletId: v.id("wallets"),
  },
  returns: v.boolean(),
  async handler(ctx, { walletId }) {
    const viewer = ctx.viewerX();
    const wallet = await ctx.table("wallets").getX(walletId);

    if (wallet.userId !== viewer._id) {
      throw new Error("Not authorized to modify this wallet");
    }

    const newPinnedState = !wallet.isPinned;

    if (newPinnedState) {
      // Calculate next pinnedSortOrder
      const pinnedWallets = await ctx
        .table("wallets", "by_user_pinned", (q) =>
          q.eq("userId", viewer._id).eq("isPinned", true)
        )
        .map((w) => w.doc());

      const maxPinnedOrder = pinnedWallets.reduce(
        (max, w) => Math.max(max, w.pinnedSortOrder),
        -1
      );

      await wallet.patch({
        isPinned: true,
        pinnedSortOrder: maxPinnedOrder + 1,
      });
    } else {
      await wallet.patch({ isPinned: false });
    }

    return newPinnedState;
  },
});

/**
 * Delete a wallet
 */
export const remove = mutation({
  args: {
    walletId: v.id("wallets"),
  },
  returns: v.null(),
  async handler(ctx, { walletId }) {
    const viewer = ctx.viewerX();
    const wallet = await ctx.table("wallets").getX(walletId);

    if (wallet.userId !== viewer._id) {
      throw new Error("Not authorized to delete this wallet");
    }

    // Delete all walletCard entries
    const walletCards = await ctx
      .table("walletCards", "by_wallet_sortOrder", (q) =>
        q.eq("walletId", walletId)
      )
      .map((wc) => wc.doc());

    for (const wc of walletCards) {
      const writableWc = await ctx.table("walletCards").getX(wc._id);
      await writableWc.delete();
    }

    await wallet.delete();
    return null;
  },
});

/**
 * Reorder wallets on /wallets page
 */
export const reorder = mutation({
  args: {
    walletIds: v.array(v.id("wallets")),
  },
  returns: v.null(),
  async handler(ctx, { walletIds }) {
    const viewer = ctx.viewerX();

    for (let i = 0; i < walletIds.length; i++) {
      const walletId = walletIds[i]!;
      const wallet = await ctx.table("wallets").getX(walletId);

      if (wallet.userId !== viewer._id) {
        throw new Error("Not authorized to reorder this wallet");
      }

      await wallet.patch({ sortOrder: i });
    }

    return null;
  },
});

/**
 * Reorder pinned wallets in sidebar
 */
export const reorderPinned = mutation({
  args: {
    walletIds: v.array(v.id("wallets")),
  },
  returns: v.null(),
  async handler(ctx, { walletIds }) {
    const viewer = ctx.viewerX();

    for (let i = 0; i < walletIds.length; i++) {
      const walletId = walletIds[i]!;
      const wallet = await ctx.table("wallets").getX(walletId);

      if (wallet.userId !== viewer._id) {
        throw new Error("Not authorized to reorder this wallet");
      }

      await wallet.patch({ pinnedSortOrder: i });
    }

    return null;
  },
});
```

**Step 2: Commit**

```bash
git add packages/backend/convex/wallets/mutations.ts
git commit -m "feat(wallets): add wallet mutations"
```

---

### Task 1.4: Create WalletCards Mutations

**Files:**
- Create: `packages/backend/convex/walletCards/mutations.ts`
- Create: `packages/backend/convex/walletCards/index.ts`

**Step 1: Create mutations file**

```typescript
/**
 * WalletCards Mutations
 *
 * Junction table operations for linking credit cards to wallets.
 */

import { v } from "convex/values";
import { mutation } from "../functions";

/**
 * Add cards to a wallet (idempotent)
 */
export const addCards = mutation({
  args: {
    walletId: v.id("wallets"),
    cardIds: v.array(v.id("creditCards")),
  },
  returns: v.object({
    added: v.number(),
    skipped: v.number(),
  }),
  async handler(ctx, { walletId, cardIds }) {
    const viewer = ctx.viewerX();

    const wallet = await ctx.table("wallets").getX(walletId);
    if (wallet.userId !== viewer._id) {
      throw new Error("Not authorized to modify this wallet");
    }

    const existingWalletCards = await ctx
      .table("walletCards", "by_wallet_sortOrder", (q) =>
        q.eq("walletId", walletId)
      )
      .map((wc) => wc.doc());

    const existingCardIds = new Set(
      existingWalletCards.map((wc) => String(wc.creditCardId))
    );
    const maxSortOrder = existingWalletCards.reduce(
      (max, wc) => Math.max(max, wc.sortOrder),
      -1
    );

    let added = 0;
    let skipped = 0;
    let nextSortOrder = maxSortOrder + 1;

    for (const cardId of cardIds) {
      const card = await ctx.table("creditCards").get(cardId);
      if (!card || card.userId !== viewer._id) {
        skipped++;
        continue;
      }

      if (existingCardIds.has(String(cardId))) {
        skipped++;
        continue;
      }

      await ctx.table("walletCards").insert({
        walletId,
        creditCardId: cardId,
        sortOrder: nextSortOrder++,
        addedAt: Date.now(),
      });
      added++;
    }

    return { added, skipped };
  },
});

/**
 * Remove a card from a wallet
 */
export const removeCard = mutation({
  args: {
    walletId: v.id("wallets"),
    cardId: v.id("creditCards"),
  },
  returns: v.boolean(),
  async handler(ctx, { walletId, cardId }) {
    const viewer = ctx.viewerX();

    const wallet = await ctx.table("wallets").getX(walletId);
    if (wallet.userId !== viewer._id) {
      throw new Error("Not authorized to modify this wallet");
    }

    const walletCards = await ctx
      .table("walletCards", "by_wallet_sortOrder", (q) =>
        q.eq("walletId", walletId)
      )
      .map((wc) => wc.doc());

    const walletCard = walletCards.find(
      (wc) => String(wc.creditCardId) === String(cardId)
    );

    if (!walletCard) {
      return false;
    }

    const writableWc = await ctx.table("walletCards").getX(walletCard._id);
    await writableWc.delete();
    return true;
  },
});
```

**Step 2: Create index file**

```typescript
export * as mutations from "./mutations";
```

**Step 3: Commit**

```bash
git add packages/backend/convex/walletCards/
git commit -m "feat(wallets): add walletCards mutations"
```

---

## Phase 2: /wallets Page

### Task 2.1: Create Wallets Page Route

**Files:**
- Create: `apps/app/src/app/(app)/wallets/page.tsx`
- Create: `apps/app/src/app/(app)/wallets/loading.tsx`

**Step 1: Create page component**

```typescript
import { WalletsContent } from "@/components/wallets/WalletsContent";

export default function WalletsPage() {
  return <WalletsContent />;
}
```

**Step 2: Create loading state**

```typescript
export default function WalletsLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="border-b border-secondary px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 animate-pulse rounded-md bg-tertiary/20" />
          <div className="h-9 w-36 animate-pulse rounded-md bg-tertiary/20" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/3] rounded-xl bg-tertiary/20" />
              <div className="mt-3 h-5 w-24 rounded bg-tertiary/20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/app/src/app/(app)/wallets/
git commit -m "feat(wallets): add /wallets page route"
```

---

### Task 2.2: Create WalletsContent Component

**Files:**
- Create: `apps/app/src/components/wallets/WalletsContent.tsx`

**Step 1: Create the main content component**

```typescript
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Plus, Wallet02 } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Toggle } from "@repo/ui/untitledui/base/toggle/toggle";
import { WalletCard } from "./WalletCard";
import { CreateWalletModal } from "./CreateWalletModal";

export function WalletsContent() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const wallets = useQuery(api.wallets.queries.list, {});
  const isLoading = wallets === undefined;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-secondary px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-primary">Wallets</h1>
          <div className="flex items-center gap-4">
            {/* Details Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-tertiary">Details</span>
              <Toggle
                isSelected={showDetails}
                onChange={setShowDetails}
                size="sm"
              />
            </div>

            {/* Create Button */}
            <Button
              color="primary"
              size="md"
              iconLeading={Plus}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create Wallet
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <WalletsGridSkeleton />
        ) : wallets.length === 0 ? (
          <WalletsEmptyState onCreateClick={() => setIsCreateModalOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {wallets.map((wallet) => (
              <WalletCard
                key={wallet._id}
                wallet={wallet}
                showDetails={showDetails}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateWalletModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

function WalletsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/3] rounded-xl bg-tertiary/20" />
          <div className="mt-3 h-5 w-24 rounded bg-tertiary/20" />
        </div>
      ))}
    </div>
  );
}

interface WalletsEmptyStateProps {
  onCreateClick: () => void;
}

function WalletsEmptyState({ onCreateClick }: WalletsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-tertiary/10 p-4">
        <Wallet02 className="size-8 text-fg-quaternary" />
      </div>
      <h2 className="text-lg font-medium text-primary">No wallets yet</h2>
      <p className="mt-1 max-w-sm text-sm text-tertiary">
        Create your first wallet to organize your credit cards into collections.
      </p>
      <Button
        color="primary"
        size="md"
        iconLeading={Plus}
        onClick={onCreateClick}
        className="mt-6"
      >
        Create Wallet
      </Button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/app/src/components/wallets/WalletsContent.tsx
git commit -m "feat(wallets): add WalletsContent component"
```

---

### Task 2.3: Create WalletCard Component with Hover Animation

**Files:**
- Create: `apps/app/src/components/wallets/WalletCard.tsx`

**Step 1: Create the wallet card with stack visual and hover peek**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { motion } from "motion/react";
import { DotsVertical, Edit03, Trash01, Pin01, PinOff01 } from "@untitledui/icons";
import { Dropdown } from "@repo/ui/untitledui/base/dropdown/dropdown";
import { cx } from "@repo/ui/utils";
import type { Id } from "@convex/_generated/dataModel";

interface WalletData {
  _id: Id<"wallets">;
  name: string;
  color?: string;
  icon?: string;
  isPinned: boolean;
  cardCount: number;
  totalBalance: number;
  totalCreditLimit: number;
  totalAvailableCredit: number;
  averageUtilization: number;
}

interface WalletCardProps {
  wallet: WalletData;
  showDetails: boolean;
}

export function WalletCard({ wallet, showDetails }: WalletCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(wallet.name);

  const togglePin = useMutation(api.wallets.mutations.togglePin);
  const updateWallet = useMutation(api.wallets.mutations.update);
  const removeWallet = useMutation(api.wallets.mutations.remove);

  // Get card previews for hover effect
  const cardPreviews = useQuery(
    api.wallets.queries.getWalletCardsSummary,
    { walletId: wallet._id }
  );

  const handleClick = () => {
    if (!isRenaming) {
      router.push(`/credit-cards?wallet=${wallet._id}`);
    }
  };

  const handleRename = async () => {
    if (newName.trim() && newName.trim() !== wallet.name) {
      await updateWallet({ walletId: wallet._id, name: newName.trim() });
    }
    setIsRenaming(false);
  };

  const handleDelete = async () => {
    if (confirm(`Delete "${wallet.name}"? Cards will not be deleted.`)) {
      await removeWallet({ walletId: wallet._id });
    }
  };

  const handleTogglePin = async () => {
    await togglePin({ walletId: wallet._id });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const utilizationColor =
    wallet.averageUtilization < 30
      ? "text-success-600"
      : wallet.averageUtilization < 70
        ? "text-warning-600"
        : "text-error-600";

  return (
    <div className="group">
      {/* Card Stack Visual */}
      <div
        className="relative cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        {/* Stacked cards container */}
        <div className="relative aspect-[4/3] overflow-visible">
          {/* Background cards (peeking) */}
          {cardPreviews && cardPreviews.length > 0 && (
            <>
              {cardPreviews.slice(0, 3).map((card, index) => (
                <motion.div
                  key={card._id}
                  className="absolute inset-x-0 rounded-xl bg-gradient-to-br from-gray-600 to-gray-800 shadow-md"
                  style={{
                    height: "70%",
                    zIndex: 3 - index,
                  }}
                  initial={{ y: 0 }}
                  animate={{
                    y: isHovered ? -(index + 1) * 24 : -(index + 1) * 4,
                    scale: 1 - index * 0.02,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                    delay: index * 0.05,
                  }}
                >
                  {/* Card brand indicator */}
                  <div className="absolute bottom-3 right-3 text-xs font-medium text-white/60">
                    {card.brand?.toUpperCase()} •••• {card.lastFour}
                  </div>
                </motion.div>
              ))}
            </>
          )}

          {/* Main wallet visual (front) */}
          <motion.div
            className={cx(
              "absolute inset-0 rounded-xl shadow-lg",
              "bg-gradient-to-br",
              wallet.color
                ? ""
                : "from-brand-500 to-brand-700"
            )}
            style={wallet.color ? { background: wallet.color } : undefined}
            animate={{ y: isHovered ? -8 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Wallet icon/emoji */}
            <div className="absolute inset-0 flex items-center justify-center">
              {wallet.icon ? (
                <span className="text-4xl">{wallet.icon}</span>
              ) : (
                <div className="text-white/20 text-6xl font-bold">
                  {wallet.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Card count badge */}
            <div className="absolute bottom-3 left-3 rounded-full bg-black/30 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              {wallet.cardCount} card{wallet.cardCount !== 1 ? "s" : ""}
            </div>

            {/* Pin indicator */}
            {wallet.isPinned && (
              <div className="absolute top-3 right-3">
                <Pin01 className="size-4 text-white/70" />
              </div>
            )}
          </motion.div>
        </div>

        {/* Dropdown menu - positioned outside click area */}
        <div
          className="absolute top-2 right-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Dropdown.Root>
            <Dropdown.DotsButton
              className={cx(
                "rounded-md bg-black/20 p-1 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
              )}
            />
            <Dropdown.Popover>
              <Dropdown.Menu>
                <Dropdown.Item
                  icon={Edit03}
                  label="Rename"
                  onAction={() => setIsRenaming(true)}
                />
                <Dropdown.Item
                  icon={wallet.isPinned ? PinOff01 : Pin01}
                  label={wallet.isPinned ? "Unpin from Sidebar" : "Pin to Sidebar"}
                  onAction={handleTogglePin}
                />
                <Dropdown.Separator />
                <Dropdown.Item
                  icon={Trash01}
                  label="Delete"
                  onAction={handleDelete}
                  className="text-error-600"
                />
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
        </div>
      </div>

      {/* Wallet Name */}
      <div className="mt-3">
        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setNewName(wallet.name);
                setIsRenaming(false);
              }
            }}
            autoFocus
            className="w-full rounded-md border border-primary bg-primary px-2 py-1 text-sm font-medium text-primary outline-none ring-2 ring-brand-500"
          />
        ) : (
          <h3 className="text-sm font-medium text-primary truncate">
            {wallet.name}
          </h3>
        )}
      </div>

      {/* Details (when expanded) */}
      {showDetails && (
        <div className="mt-2 space-y-1 text-xs text-tertiary">
          <div className="flex justify-between">
            <span>Balance</span>
            <span className="font-medium text-secondary">
              {formatCurrency(wallet.totalBalance)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Available</span>
            <span className="font-medium text-secondary">
              {formatCurrency(wallet.totalAvailableCredit)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Utilization</span>
            <span className={cx("font-medium", utilizationColor)}>
              {wallet.averageUtilization}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/app/src/components/wallets/WalletCard.tsx
git commit -m "feat(wallets): add WalletCard with hover peek animation"
```

---

### Task 2.4: Create CreateWalletModal Component

**Files:**
- Create: `apps/app/src/components/wallets/CreateWalletModal.tsx`

**Step 1: Create the modal component**

```typescript
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
} from "react-aria-components";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { cx } from "@repo/ui/utils";

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#64748b", // slate
];

const PRESET_ICONS = ["💳", "🏦", "✈️", "🛒", "🍔", "⛽", "🏠", "💼", "🎮", "📱", "💰", "⭐"];

export function CreateWalletModal({ isOpen, onClose }: CreateWalletModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | undefined>(undefined);
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createWallet = useMutation(api.wallets.mutations.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createWallet({ name: name.trim(), color, icon });
      setName("");
      setColor(undefined);
      setIcon(undefined);
      onClose();
    } catch (error) {
      console.error("Failed to create wallet:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setColor(undefined);
    setIcon(undefined);
    onClose();
  };

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/70"
    >
      <Modal className="w-full max-w-md rounded-xl bg-primary p-6 shadow-xl">
        <Dialog className="outline-none">
          {({ close }) => (
            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-semibold text-primary">
                Create Wallet
              </h2>
              <p className="mt-1 text-sm text-tertiary">
                Organize your credit cards into collections.
              </p>

              {/* Name Input */}
              <div className="mt-6">
                <label
                  htmlFor="wallet-name"
                  className="block text-sm font-medium text-secondary"
                >
                  Name
                </label>
                <input
                  id="wallet-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Travel Cards"
                  className="mt-1.5 w-full rounded-lg border border-primary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary outline-none focus:ring-2 focus:ring-brand-500"
                  autoFocus
                />
              </div>

              {/* Color Picker */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-secondary">
                  Color (optional)
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(color === c ? undefined : c)}
                      className={cx(
                        "size-8 rounded-full transition",
                        color === c && "ring-2 ring-offset-2 ring-brand-500"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Picker */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-secondary">
                  Icon (optional)
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESET_ICONS.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIcon(icon === i ? undefined : i)}
                      className={cx(
                        "flex size-8 items-center justify-center rounded-lg text-lg transition",
                        icon === i
                          ? "bg-brand-100 ring-2 ring-brand-500"
                          : "bg-tertiary/10 hover:bg-tertiary/20"
                      )}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  color="secondary"
                  size="md"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  size="md"
                  isDisabled={!name.trim() || isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Wallet"}
                </Button>
              </div>
            </form>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
```

**Step 2: Commit**

```bash
git add apps/app/src/components/wallets/CreateWalletModal.tsx
git commit -m "feat(wallets): add CreateWalletModal component"
```

---

### Task 2.5: Add Wallets to Sidebar Navigation

**Files:**
- Modify: `apps/app/src/components/application/dashboard-sidebar.tsx`

**Step 1: Add Wallets nav item and import**

Add import at top:

```typescript
import { Wallet02 } from "@untitledui/icons";
```

**Step 2: Add Wallets to navItemsSimple array (after Credit Cards)**

```typescript
    {
        label: "Wallets",
        href: "/wallets",
        icon: Wallet02,
    },
```

**Step 3: Add to commandRoutes**

```typescript
    wallets: "/wallets",
```

**Step 4: Add to CommandMenu section**

```typescript
<CommandMenu.Item id="wallets" label="Wallets" type="icon" icon={Wallet02} />
```

**Step 5: Commit**

```bash
git add apps/app/src/components/application/dashboard-sidebar.tsx
git commit -m "feat(wallets): add Wallets to sidebar navigation"
```

---

## Phase 3: Sidebar Pinned Wallets

### Task 3.1: Create PinnedWalletsSidebar Component

**Files:**
- Create: `apps/app/src/components/wallets/PinnedWalletsSidebar.tsx`

**Step 1: Create the pinned wallets sidebar section**

```typescript
"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Wallet02, CreditCard01 } from "@untitledui/icons";
import { cx } from "@repo/ui/utils";
import type { Id } from "@convex/_generated/dataModel";

export function PinnedWalletsSidebar() {
  const pinnedWallets = useQuery(api.wallets.queries.listPinned, {});

  if (!pinnedWallets || pinnedWallets.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-secondary pt-4">
      <div className="px-3 pb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-quaternary">
          Wallets
        </span>
      </div>
      <div className="space-y-0.5">
        {pinnedWallets.map((wallet) => (
          <PinnedWalletItem key={wallet._id} wallet={wallet} />
        ))}
      </div>
    </div>
  );
}

interface PinnedWallet {
  _id: Id<"wallets">;
  name: string;
  color?: string;
  icon?: string;
  cardCount: number;
}

interface PinnedWalletItemProps {
  wallet: PinnedWallet;
}

function PinnedWalletItem({ wallet }: PinnedWalletItemProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  const cards = useQuery(
    api.wallets.queries.getWalletCardsSummary,
    isExpanded ? { walletId: wallet._id } : "skip"
  );

  const isActive = pathname === `/credit-cards` &&
    new URLSearchParams(window.location.search).get("wallet") === wallet._id;

  const handleWalletClick = () => {
    router.push(`/credit-cards?wallet=${wallet._id}`);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleCardClick = (cardId: Id<"creditCards">) => {
    router.push(`/credit-cards/${cardId}`);
  };

  return (
    <div>
      <div
        className={cx(
          "group flex items-center gap-2 rounded-md px-3 py-2 transition cursor-pointer",
          isActive
            ? "bg-active text-secondary_hover"
            : "text-secondary hover:bg-primary_hover"
        )}
      >
        {/* Expand chevron */}
        <button
          type="button"
          onClick={handleToggleExpand}
          className="p-0.5 -ml-1 rounded hover:bg-primary_hover"
        >
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="size-3.5 text-fg-quaternary" />
          </motion.div>
        </button>

        {/* Wallet info */}
        <button
          type="button"
          onClick={handleWalletClick}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {wallet.color ? (
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: wallet.color }}
            />
          ) : wallet.icon ? (
            <span className="text-sm">{wallet.icon}</span>
          ) : (
            <Wallet02 className="size-4 shrink-0 text-fg-quaternary" />
          )}
          <span className="flex-1 truncate text-sm font-medium">
            {wallet.name}
          </span>
          <span className="shrink-0 text-xs text-quaternary">
            {wallet.cardCount}
          </span>
        </button>
      </div>

      {/* Expanded cards list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-6 space-y-0.5 py-1">
              {cards?.map((card) => (
                <button
                  key={card._id}
                  type="button"
                  onClick={() => handleCardClick(card._id)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-tertiary transition hover:bg-primary_hover hover:text-secondary"
                >
                  <CreditCard01 className="size-3.5 shrink-0 text-fg-quaternary" />
                  <span className="flex-1 truncate">{card.displayName}</span>
                  {card.lastFour && (
                    <span className="text-xs text-quaternary">
                      •••• {card.lastFour}
                    </span>
                  )}
                </button>
              ))}
              {cards?.length === 0 && (
                <p className="px-3 py-1.5 text-xs text-quaternary">
                  No cards in wallet
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/app/src/components/wallets/PinnedWalletsSidebar.tsx
git commit -m "feat(wallets): add PinnedWalletsSidebar component"
```

---

### Task 3.2: Integrate Pinned Wallets into Dashboard Sidebar

**Files:**
- Modify: `apps/app/src/components/application/dashboard-sidebar.tsx`

**Step 1: Import the component**

```typescript
import { PinnedWalletsSidebar } from "@/components/wallets/PinnedWalletsSidebar";
```

**Step 2: Add PinnedWalletsSidebar after the main nav items**

This requires modifying the UntitledUI sidebar components to accept children or using a wrapper. For now, we'll add it as a separate section.

Find the `SidebarSimpleDesktop` usage and add after it (inside the same container):

```typescript
<PinnedWalletsSidebar />
```

Note: This may require adjusting the sidebar structure to accommodate the pinned wallets section. If the UntitledUI components don't support custom sections, we may need to build a custom sidebar or modify the nav items array structure.

**Step 3: Commit**

```bash
git add apps/app/src/components/application/dashboard-sidebar.tsx
git commit -m "feat(wallets): integrate pinned wallets into sidebar"
```

---

## Phase 4: Credit Cards Page Wallet Filtering

### Task 4.1: Add Wallet Filter to CreditCardsContent

**Files:**
- Modify: `apps/app/src/components/credit-cards/CreditCardsContent.tsx`

**Step 1: Add imports**

```typescript
import { useSearchParams } from "next/navigation";
import type { Id } from "@convex/_generated/dataModel";
```

**Step 2: Add wallet filtering logic**

Inside `CreditCardsContentInner`, add after the existing hooks:

```typescript
  const searchParams = useSearchParams();
  const walletIdParam = searchParams.get("wallet");
  const walletId = walletIdParam as Id<"wallets"> | null;

  // Fetch wallet data if filtering by wallet
  const walletData = useQuery(
    api.wallets.queries.getWithCards,
    walletId ? { walletId } : "skip"
  );
```

**Step 3: Filter cards by wallet**

Update the cards filtering logic:

```typescript
  // Convert API data to extended format for UI
  const cards = useMemo(() => {
    if (!cardsData) return [];
    let cardsList = cardsData;

    // Filter by wallet if selected
    if (walletId && walletData) {
      const walletCardIds = new Set(walletData.cardIds.map(String));
      cardsList = cardsData.filter((card) => walletCardIds.has(String(card._id)));
    }

    return cardsList.map((card) => toExtendedCreditCard(card, cardholderName));
  }, [cardsData, cardholderName, walletId, walletData]);
```

**Step 4: Update empty state message**

```typescript
{cards.length === 0
  ? walletId
    ? "This wallet is empty. Add cards to get started."
    : "Connect a bank account to see your credit cards"
  : "Try adjusting your filters"}
```

**Step 5: Commit**

```bash
git add apps/app/src/components/credit-cards/CreditCardsContent.tsx
git commit -m "feat(wallets): add wallet filtering to credit cards page"
```

---

### Task 4.2: Add Wallet Indicator to Filter Bar

**Files:**
- Modify: `apps/app/src/components/credit-cards/CreditCardsFilterBar.tsx`

**Step 1: Add imports**

```typescript
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Wallet02 } from "@untitledui/icons";
import type { Id } from "@convex/_generated/dataModel";
```

**Step 2: Add wallet state**

Inside the component:

```typescript
  const router = useRouter();
  const searchParams = useSearchParams();
  const walletIdParam = searchParams.get("wallet");
  const walletId = walletIdParam as Id<"wallets"> | null;

  const walletData = useQuery(
    api.wallets.queries.getWithCards,
    walletId ? { walletId } : "skip"
  );

  const clearWalletFilter = () => {
    router.push("/credit-cards");
  };
```

**Step 3: Add wallet indicator chip**

Before the filters section, add:

```typescript
{/* Wallet Filter Indicator */}
{walletId && walletData && (
  <div className="flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-2 pr-1 text-sm dark:bg-brand-950">
    <Wallet02 className="size-3.5 text-brand-600 dark:text-brand-400" />
    <span className="font-medium text-brand-700 dark:text-brand-300">
      {walletData.wallet.name}
    </span>
    <button
      type="button"
      onClick={clearWalletFilter}
      className="ml-0.5 rounded-full p-0.5 text-brand-500 transition hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-900"
      aria-label="Clear wallet filter"
    >
      <XClose className="size-3.5" />
    </button>
  </div>
)}
```

**Step 4: Commit**

```bash
git add apps/app/src/components/credit-cards/CreditCardsFilterBar.tsx
git commit -m "feat(wallets): add wallet indicator to filter bar"
```

---

### Task 4.3: Add "Add Cards" Button and Slideout

**Files:**
- Modify: `apps/app/src/components/credit-cards/CreditCardsFilterBar.tsx`
- Create: `apps/app/src/components/wallets/AddCardsSlideout.tsx`

**Step 1: Create AddCardsSlideout component**

```typescript
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SlideoutMenu } from "@repo/ui/untitledui/application/slideout-menus/slideout-menu";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Checkbox } from "@repo/ui/untitledui/base/checkbox/checkbox";
import { CreditCard01 } from "@untitledui/icons";
import { cx } from "@repo/ui/utils";
import type { Id } from "@convex/_generated/dataModel";

interface AddCardsSlideoutProps {
  walletId: Id<"wallets">;
  walletName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AddCardsSlideout({
  walletId,
  walletName,
  isOpen,
  onClose,
}: AddCardsSlideoutProps) {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<Id<"creditCards">>>(
    new Set()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableCards = useQuery(api.wallets.queries.getCardsNotInWallet, {
    walletId,
  });
  const addCards = useMutation(api.walletCards.mutations.addCards);

  const toggleCard = (cardId: Id<"creditCards">) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedCardIds.size === 0) return;

    setIsSubmitting(true);
    try {
      await addCards({
        walletId,
        cardIds: Array.from(selectedCardIds),
      });
      setSelectedCardIds(new Set());
      onClose();
    } catch (error) {
      console.error("Failed to add cards:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedCardIds(new Set());
    onClose();
  };

  const formatCurrency = (cents?: number) => {
    if (cents === undefined) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <SlideoutMenu isOpen={isOpen} onOpenChange={(open) => !open && handleClose()}>
      {({ close }) => (
        <>
          <SlideoutMenu.Header onClose={close}>
            <h2 className="text-lg font-semibold text-primary">
              Add Cards to {walletName}
            </h2>
            <p className="mt-1 text-sm text-tertiary">
              Select cards to add to this wallet.
            </p>
          </SlideoutMenu.Header>

          <SlideoutMenu.Content>
            {!availableCards ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-lg bg-tertiary/20"
                  />
                ))}
              </div>
            ) : availableCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CreditCard01 className="mb-3 size-8 text-fg-quaternary" />
                <p className="text-sm text-tertiary">
                  All your cards are already in this wallet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableCards.map((card) => (
                  <button
                    key={card._id}
                    type="button"
                    onClick={() => toggleCard(card._id)}
                    className={cx(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition",
                      selectedCardIds.has(card._id)
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-950"
                        : "border-secondary hover:border-primary hover:bg-primary_hover"
                    )}
                  >
                    <Checkbox
                      isSelected={selectedCardIds.has(card._id)}
                      onChange={() => toggleCard(card._id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-primary truncate">
                        {card.displayName}
                      </p>
                      <p className="text-xs text-tertiary">
                        {card.company} {card.lastFour && `•••• ${card.lastFour}`}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-secondary">
                      {formatCurrency(card.currentBalance)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </SlideoutMenu.Content>

          <SlideoutMenu.Footer>
            <div className="flex justify-between items-center">
              <span className="text-sm text-tertiary">
                {selectedCardIds.size} card{selectedCardIds.size !== 1 ? "s" : ""}{" "}
                selected
              </span>
              <div className="flex gap-3">
                <Button color="secondary" size="md" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  size="md"
                  onClick={handleSubmit}
                  isDisabled={selectedCardIds.size === 0 || isSubmitting}
                >
                  {isSubmitting ? "Adding..." : "Add to Wallet"}
                </Button>
              </div>
            </div>
          </SlideoutMenu.Footer>
        </>
      )}
    </SlideoutMenu>
  );
}
```

**Step 2: Add button and slideout to CreditCardsFilterBar**

Add state and import:

```typescript
import { useState } from "react";
import { Plus } from "@untitledui/icons";
import { AddCardsSlideout } from "@/components/wallets/AddCardsSlideout";
```

Add state:

```typescript
const [isAddCardsOpen, setIsAddCardsOpen] = useState(false);
```

Add button after wallet indicator (when wallet is selected):

```typescript
{walletId && walletData && (
  <>
    {/* ... existing wallet indicator ... */}
    <Button
      color="secondary"
      size="sm"
      iconLeading={Plus}
      onClick={() => setIsAddCardsOpen(true)}
    >
      Add Cards
    </Button>
    <AddCardsSlideout
      walletId={walletId}
      walletName={walletData.wallet.name}
      isOpen={isAddCardsOpen}
      onClose={() => setIsAddCardsOpen(false)}
    />
  </>
)}
```

**Step 3: Commit**

```bash
git add apps/app/src/components/wallets/AddCardsSlideout.tsx
git add apps/app/src/components/credit-cards/CreditCardsFilterBar.tsx
git commit -m "feat(wallets): add cards slideout for wallet detail view"
```

---

## Phase 5: Final Integration

### Task 5.1: Create Wallets Index Export

**Files:**
- Create: `apps/app/src/components/wallets/index.ts`

```typescript
export { WalletsContent } from "./WalletsContent";
export { WalletCard } from "./WalletCard";
export { CreateWalletModal } from "./CreateWalletModal";
export { PinnedWalletsSidebar } from "./PinnedWalletsSidebar";
export { AddCardsSlideout } from "./AddCardsSlideout";
```

**Commit:**

```bash
git add apps/app/src/components/wallets/index.ts
git commit -m "feat(wallets): add component index exports"
```

---

### Task 5.2: Verify Build and Test

**Step 1: Run TypeScript check**

```bash
cd /Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui && npx tsc --noEmit
```

**Step 2: Run build**

```bash
cd apps/app && npm run build
```

**Step 3: Manual testing checklist**

- [ ] Navigate to /wallets page
- [ ] Create a wallet with name, color, icon
- [ ] Hover over wallet to see card peek animation
- [ ] Click wallet to navigate to filtered /credit-cards
- [ ] Pin a wallet to sidebar
- [ ] Expand pinned wallet in sidebar to see cards
- [ ] Click card in expanded sidebar to go to card detail
- [ ] Use "Add Cards" slideout to add cards to wallet
- [ ] Rename wallet via dropdown
- [ ] Delete wallet via dropdown
- [ ] Verify wallet indicator shows in filter bar
- [ ] Clear wallet filter via X button

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(wallets): complete wallets feature implementation"
```

---

## Summary

**Files Created:**
- `packages/backend/convex/wallets/queries.ts`
- `packages/backend/convex/wallets/mutations.ts`
- `packages/backend/convex/wallets/index.ts`
- `packages/backend/convex/walletCards/mutations.ts`
- `packages/backend/convex/walletCards/index.ts`
- `apps/app/src/app/(app)/wallets/page.tsx`
- `apps/app/src/app/(app)/wallets/loading.tsx`
- `apps/app/src/components/wallets/WalletsContent.tsx`
- `apps/app/src/components/wallets/WalletCard.tsx`
- `apps/app/src/components/wallets/CreateWalletModal.tsx`
- `apps/app/src/components/wallets/PinnedWalletsSidebar.tsx`
- `apps/app/src/components/wallets/AddCardsSlideout.tsx`
- `apps/app/src/components/wallets/index.ts`

**Files Modified:**
- `packages/backend/convex/schema.ts`
- `apps/app/src/components/application/dashboard-sidebar.tsx`
- `apps/app/src/components/credit-cards/CreditCardsContent.tsx`
- `apps/app/src/components/credit-cards/CreditCardsFilterBar.tsx`

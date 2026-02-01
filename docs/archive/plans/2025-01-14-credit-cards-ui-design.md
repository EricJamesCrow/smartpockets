# Credit Cards UI Implementation Design

**Date:** 2025-01-14
**Status:** Ready for Implementation
**Branch:** `feat/credit-cards`

## Objective

Port SmartPockets credit cards UI to UntitledUI, preserving the page transition effect and full transaction functionality with merchant enrichment.

## Reference Repositories

| Repo | Path | Purpose |
|------|------|---------|
| SmartPockets | `/Users/itsjusteric/SmartPockets/smartpockets-app` | Source implementation |
| UntitledUI Reference | `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui-creditcards` | Partial UntitledUI port (use header only) |
| Target | `/Users/itsjusteric/CrowDevelopment/Templates/ai-chatbot-untitledui` | This repo |

---

## File Structure

```
packages/backend/convex/
├── transactions/                    # NEW - Port from SmartPockets
│   ├── queries.ts                   # getTransactionsAndStreamsByAccountId
│   ├── helpers.ts                   # enrichTransactionWithMerchant
│   └── index.ts                     # Barrel export

apps/app/src/
├── app/(app)/credit-cards/
│   ├── layout.tsx                   # SharedLayoutAnimationProvider + LayoutGroup
│   ├── page.tsx                     # List page
│   ├── loading.tsx                  # Skeleton
│   └── [cardId]/
│       ├── page.tsx                 # Detail page
│       ├── loading.tsx              # Detail skeleton
│       └── not-found.tsx            # 404 state
│
├── components/credit-cards/
│   ├── index.ts                     # Barrel export
│   ├── CreditCardsHeader.tsx        # ✅ Use from reference repo (good)
│   ├── CreditCardDetailHeader.tsx   # 🔄 Redesign (match SmartPockets)
│   ├── CreditCardVisual.tsx         # Port card visual
│   ├── CreditCardGridItem.tsx       # Grid item with layoutId
│   ├── CreditCardsContent.tsx       # Grid container
│   ├── KeyMetrics.tsx               # Stats row (4 columns)
│   ├── TransactionsSection.tsx      # Filters + table container
│   ├── TransactionTable.tsx         # Table with virtual scroll
│   ├── TransactionRow.tsx           # Individual row
│   ├── TransactionDetailDrawer.tsx  # Sheet/sidebar
│   └── PaymentDueBadge.tsx          # Due date badge
│
├── lib/
│   └── context/
│       └── shared-layout-animation-context.tsx  # Animation state
│
└── lib/constants/
    └── animations.ts                # Animation timing constants
```

---

## Implementation Phases

### Phase 1: Backend — Transaction Queries
- Port `transactions/queries.ts` with `getTransactionsAndStreamsByAccountId`
- Port `transactions/helpers.ts` with `enrichTransactionWithMerchant`
- Wire up to existing Plaid component (`components.plaid.public.*`)

### Phase 2: Animation Infrastructure
- Port `shared-layout-animation-context.tsx` (manages animation state)
- Port `animations.ts` constants (spring stiffness, damping, durations)
- Create `credit-cards/layout.tsx` with `LayoutGroup` + `AnimatePresence`

### Phase 3: List Page + Transition Checkpoint
- `CreditCardsHeader.tsx` — Use reference repo version (already good)
- `CreditCardVisual.tsx` — Port the dark card with EMV chip, network logo
- `CreditCardGridItem.tsx` — Grid item with `layoutId={card-${id}}` for transitions
- `CreditCardsContent.tsx` — Grid container with responsive columns
- `page.tsx` — Wire up `useQuery(api.creditCards.queries.list)`
- **Minimal detail page shell** — Just enough to verify transition works
- **✓ CHECKPOINT: Verify page transition animation works before continuing**

### Phase 4: Detail Page Header & Stats
- `CreditCardDetailHeader.tsx` — Redesign to match SmartPockets
- `PaymentDueBadge.tsx` — Yellow/warning badge with "Due in X days"
- `KeyMetrics.tsx` — 4-column stats with utilization color coding
- `CardVisual` section — Larger centered card with same `layoutId`

### Phase 5: Transactions
- `TransactionsSection.tsx` — Filters (search, category, status, date range, export)
- `TransactionTable.tsx` — Grid layout with columns
- `TransactionRow.tsx` — Row with merchant logo, category badge, amount
- `TransactionDetailDrawer.tsx` — Sheet with merchant info, amount, actions

### Phase 6: Polish & Loading States
- `loading.tsx` skeletons for list and detail pages
- `not-found.tsx` for invalid card IDs
- Barrel export `index.ts`

---

## Animation System

### Core Mechanism

The page transition uses Framer Motion's **shared layout animation** via `layoutId`. When navigating from grid → detail, elements with matching `layoutId` values animate between their positions.

```
Grid Page                         Detail Page
┌─────────────────────┐          ┌─────────────────────┐
│  ┌───┐  ┌───┐  ┌───┐│          │                     │
│  │ A │  │ B │  │ C ││   ──►    │    ┌───────────┐    │
│  └───┘  └───┘  └───┘│          │    │     B     │    │
│  ┌───┐  ┌───┐       │          │    └───────────┘    │
│  │ D │  │ E │       │          │                     │
└─────────────────────┘          └─────────────────────┘

Card B: layoutId="card-123"       Card B: layoutId="card-123"
        (small, grid position)           (large, centered)
```

### Animation Context

```tsx
// lib/context/shared-layout-animation-context.tsx

interface SharedLayoutAnimationContextType {
  isAnimating: boolean;           // True during transition
  animatingCardId: string | null; // Which card is transitioning
  startAnimation: (cardId: string) => void;
  endAnimation: () => void;
}
```

**Why we need this context:**
1. Fade out non-selected cards — When card B is clicked, cards A/C/D/E fade to 30% opacity
2. Disable hover effects — Prevent jank during transition
3. Disable card flip — If cards have flip interaction, disable during animation
4. Auto-cleanup — Timeout to prevent stuck animation state

### Animation Constants

```tsx
// lib/constants/animations.ts

export const SHARED_LAYOUT_ANIMATIONS = {
  SPRING_STIFFNESS: 300,
  SPRING_DAMPING: 30,
  DURATION: 0.4,
  FADE_OPACITY: 0.3,
  FADE_DURATION: 0.2,
  CLEANUP_TIMEOUT_MS: 1000,
};

export const CARD_GRID_ANIMATIONS = {
  HOVER_SCALE: 1.02,
  HOVER_DURATION: 0.2,
  HOVER_SPRING_STIFFNESS: 400,
  TAP_SCALE: 0.98,
};
```

### Layout Wrapper

```tsx
// app/(app)/credit-cards/layout.tsx

"use client";

import { LayoutGroup, AnimatePresence } from "motion/react";
import { SharedLayoutAnimationProvider } from "@/lib/context/shared-layout-animation-context";

export default function CreditCardsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SharedLayoutAnimationProvider>
      <LayoutGroup>
        <AnimatePresence mode="wait">{children}</AnimatePresence>
      </LayoutGroup>
    </SharedLayoutAnimationProvider>
  );
}
```

---

## Credit Card Visual

The dark card component with EMV chip and network logo.

### Visual Layout

```
┌─────────────────────────────────────────────┐
│                                             │
│   ┌─────┐                                   │
│   │ EMV │   (chip graphic - gold/silver)    │
│   │CHIP │                                   │
│   └─────┘                                   │
│                                             │
│                                             │
│                                             │
│   JOHN DOE                    ┌──────────┐  │
│   (cardholder name)           │  VISA    │  │
│                               │  logo    │  │
│                               └──────────┘  │
└─────────────────────────────────────────────┘
     Dark gradient background with subtle texture
```

### Props

```tsx
interface CreditCardVisualProps {
  cardholderName: string;
  lastFour: string;
  brand: "visa" | "mastercard" | "amex" | "discover" | "other";
  expiryDate?: string;
  company?: string;           // Bank/issuer name
  className?: string;
  size?: "sm" | "md" | "lg";  // Grid vs detail page sizing
}
```

### Size Variants

| Size | Use Case | Max Width |
|------|----------|-----------|
| `sm` | Grid item | `max-w-xs` (~320px) |
| `md` | Default | `max-w-sm` (~384px) |
| `lg` | Detail page hero | `max-w-lg` (~512px) |

### Styling

- Base: `bg-gradient-to-br from-gray-800 via-gray-900 to-black`
- Border: `border border-white/10`
- Network logos: `react-svg-credit-card-payment-icons` package

---

## Detail Page Header

Replaces the poor header from reference repo. Matches SmartPockets design.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   CHASE SAPPHIRE PREFERRED              Payment Due             │
│   Chase • Visa •••• 4532                Jan 15, 2025            │
│                                         ┌─────────────────┐     │
│                                         │ Due in 12 days  │     │
│                                         └─────────────────┘     │
│                                         (yellow/warning badge)  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Props

```tsx
interface CreditCardDetailHeaderProps {
  card: {
    displayName: string;      // "CHASE SAPPHIRE PREFERRED"
    company?: string;         // "Chase"
    brand?: string;           // "visa" → "Visa"
    lastFour?: string;        // "4532"
    nextPaymentDueDate?: string;
    isOverdue: boolean;
  };
}
```

### PaymentDueBadge Logic

```tsx
function getPaymentDueStatus(dueDate: string | undefined, isOverdue: boolean) {
  if (!dueDate) return null;

  if (isOverdue) {
    return { text: "Overdue", variant: "error" };  // Red
  }

  const daysUntil = differenceInDays(new Date(dueDate), new Date());

  if (daysUntil <= 3) {
    return { text: `Due in ${daysUntil} days`, variant: "error" };    // Red
  }
  if (daysUntil <= 7) {
    return { text: `Due in ${daysUntil} days`, variant: "warning" };  // Yellow
  }
  return { text: `Due in ${daysUntil} days`, variant: "default" };    // Gray
}
```

---

## KeyMetrics Component

4-column stats row below the card visual on detail page.

### Layout

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│  Current Balance │  Minimum Payment │  APR (Purchase)  │ Available Credit │
│                  │                  │                  │                  │
│    $6,720.72     │     $130.67      │      0.0%        │     $279.28      │
│   of $7,000.00   │ Rec: $6,710.73   │ Annual Percent.  │   4.0% of limit  │
│                  │                  │      Rate        │                  │
│  ████████████░░  │                  │                  │                  │
│     96.0%        │                  │                  │                  │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

### Props

```tsx
interface KeyMetricsProps {
  currentBalance: number;
  creditLimit: number;
  minimumPayment?: number;
  recommendedPayment?: number;  // Calculated: balance - (limit * 0.01)
  apr?: number;                 // Purchase APR from aprs array
  availableCredit: number;
}
```

### Utilization Color Coding

```tsx
function getUtilizationColor(percentage: number): string {
  if (percentage < 30) return "text-success-600";    // Green - healthy
  if (percentage < 70) return "text-warning-600";    // Yellow - moderate
  return "text-error-600";                           // Red - high utilization
}
```

---

## Transactions

### TransactionsSection Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────┐  ┌────────────┐ ┌──────────┐ ┌────────────────┐ │
│ │ 🔍 Search merchant  │  │ Categories▼│ │ Status ▼ │ │ Date Range   ▼ │ │
│ └─────────────────────┘  └────────────┘ └──────────┘ └────────────────┘ │
│                                                           ┌──────────┐  │
│ Showing 156 of 234 transactions                           │ Export   │  │
│                                                           └──────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│  Date      │  Merchant           │  Category    │  Amount  │  Status   │
├────────────┼─────────────────────┼──────────────┼──────────┼───────────┤
│  Jan 12    │  ☕ Starbucks       │  Food        │  -$5.43  │  Posted   │
│  Jan 11    │  🛒 Amazon          │  Shopping    │  -$34.99 │  Posted   │
│  Jan 10    │  ⛽ Shell           │  Transport   │  -$52.00 │  Pending  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Filter Controls → UntitledUI Mapping

| Filter | UntitledUI Component |
|--------|---------------------|
| Search input | `InputGroup` with search icon |
| Category dropdown | `Select` / `Dropdown` |
| Status dropdown | `Select` / `Dropdown` |
| Date range | `Popover` + `Calendar` |
| Export button | `Button` variant="secondary" |

### TransactionRow Props

```tsx
interface TransactionRowProps {
  transaction: {
    id: string;
    date: string;
    merchant: string;
    merchantEnrichment?: {
      logoUrl?: string;
      merchantName: string;
    };
    category: string;
    amount: number;
    status: "Posted" | "Pending";
    isRecurring?: boolean;
  };
  onClick: () => void;  // Opens drawer
}
```

### TransactionDetailDrawer

Sheet that slides in from right with:
- Merchant avatar (logo or initials fallback)
- Merchant name + category badge
- Large amount display
- Status, Date, Category details
- Notes section
- Actions: Edit Category, Edit Note, Dispute Transaction

---

## Backend — Transaction Queries

### queries.ts

```tsx
export const getTransactionsAndStreamsByAccountId = query({
  args: {
    accountId: v.string(),
    userId: v.string(),
    limit: v.optional(v.number()),        // Default 1000
    searchQuery: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(v.string()),       // "Posted" | "Pending" | "all"
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Get transactions from Plaid component
    const rawTransactions = await ctx.runQuery(
      components.plaid.public.getTransactionsByAccount,
      { accountId: args.accountId }
    );

    // 2. Enrich with merchant logos
    const transactions = await Promise.all(
      rawTransactions.map((tx) => enrichTransactionWithMerchant(ctx, tx, cache))
    );

    // 3. Get recurring streams
    const streams = await ctx.runQuery(
      components.plaid.public.getRecurringStreamsByUser,
      { userId: args.userId }
    );

    // 4. Combine, filter, sort, paginate
    return { items, hasMore, pagination };
  },
});
```

### helpers.ts

```tsx
type MerchantEnrichmentResult = {
  merchantName: string;
  logoUrl?: string;
  categoryPrimary?: string;
  categoryIconUrl?: string;
  confidenceLevel: "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
} | null;

export async function enrichTransactionWithMerchant(
  ctx: QueryCtx,
  transaction: RawTransaction,
  cache: Map<string, MerchantEnrichmentResult>
): Promise<EnrichedTransaction> {
  const merchantKey = transaction.merchantName || transaction.name;

  if (cache.has(merchantKey)) {
    return { ...transaction, merchantEnrichment: cache.get(merchantKey) };
  }

  const enrichment = transaction.enrichmentData ?? null;
  cache.set(merchantKey, enrichment);
  return { ...transaction, merchantEnrichment: enrichment };
}
```

---

## Dependencies

```bash
# Card network logos (Visa, Mastercard, Amex, Discover)
npm install react-svg-credit-card-payment-icons

# Framer Motion (if not already installed)
npm install motion
```

---

## Deliverables Checklist

### Phase 1: Backend
- [ ] `convex/transactions/queries.ts`
- [ ] `convex/transactions/helpers.ts`
- [ ] `convex/transactions/index.ts`
- [ ] Verify query works via Convex dashboard

### Phase 2: Animation Infrastructure
- [ ] `lib/context/shared-layout-animation-context.tsx`
- [ ] `lib/constants/animations.ts`
- [ ] `app/(app)/credit-cards/layout.tsx`

### Phase 3: List Page + Transition Checkpoint
- [ ] `components/credit-cards/CreditCardsHeader.tsx`
- [ ] `components/credit-cards/CreditCardVisual.tsx`
- [ ] `components/credit-cards/CreditCardGridItem.tsx`
- [ ] `components/credit-cards/CreditCardsContent.tsx`
- [ ] `app/(app)/credit-cards/page.tsx`
- [ ] `app/(app)/credit-cards/[cardId]/page.tsx` — Minimal shell
- [ ] **✓ CHECKPOINT: Verify page transition works**

### Phase 4: Detail Page Header & Stats
- [ ] `components/credit-cards/CreditCardDetailHeader.tsx`
- [ ] `components/credit-cards/PaymentDueBadge.tsx`
- [ ] `components/credit-cards/KeyMetrics.tsx`
- [ ] Update `[cardId]/page.tsx` with full layout

### Phase 5: Transactions
- [ ] `components/credit-cards/TransactionsSection.tsx`
- [ ] `components/credit-cards/TransactionTable.tsx`
- [ ] `components/credit-cards/TransactionRow.tsx`
- [ ] `components/credit-cards/TransactionDetailDrawer.tsx`

### Phase 6: Polish
- [ ] `app/(app)/credit-cards/loading.tsx`
- [ ] `app/(app)/credit-cards/[cardId]/loading.tsx`
- [ ] `app/(app)/credit-cards/[cardId]/not-found.tsx`
- [ ] `components/credit-cards/index.ts`

---

## Key Reference Files

| Component | SmartPockets Source |
|-----------|---------------------|
| Card Visual | `src/components/shared/credit-card/` |
| Grid Item | `src/features/credit-cards/components/credit-card-grid-item.tsx` |
| Detail Header | `src/features/credit-cards/components/card-detail-header.tsx` |
| Key Metrics | `src/features/credit-cards/components/key-metrics.tsx` |
| Transactions | `src/features/credit-cards/components/transactions-section.tsx` |
| Animation Context | `src/lib/context/shared-layout-animation-context.tsx` |
| Transaction Query | `convex/transactions/queries.ts` |

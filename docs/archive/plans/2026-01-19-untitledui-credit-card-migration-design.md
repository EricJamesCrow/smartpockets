# UntitledUI Credit Card Migration Design

## Overview

Migrate credit card components from the ported SmartPockets implementation to native UntitledUI credit card components for a consistent UntitledUI aesthetic throughout the application.

## Goals

- Replace SmartPockets credit card visuals with UntitledUI credit card component
- Maintain all surrounding UX features (shared element transitions, extended details panel, lock button)
- Preserve original SmartPockets components in codebase for reference
- Map banks to distinct UntitledUI visual variants

## Non-Goals

- Modifying the UntitledUI credit card component itself
- Changing data models or Convex queries
- Removing original SmartPockets components

---

## Current State

### SmartPockets Components (ported, to be replaced visually)
Location: `apps/app/src/components/credit-cards/`

- Multi-layer architecture: primitives → layouts → feature wrappers
- Bank-specific layouts: Standard, Chase, Apple
- Flip animation with front/back sides
- Features: extended details panel, lock button, shared element transitions

### UntitledUI Component (source)
Location: `packages/ui/src/components/untitledui/shared-assets/credit-card/`

- Single component with 13 visual variants
- Display-only (no flip, single-sided)
- Mathematical scaling system for responsiveness
- Glass/morphism effects

---

## Design

### File Organization

**New files to create:**

```
apps/app/src/components/credit-cards/
├── UntitledCreditCard.tsx          # Wrapper adapting CreditCardData → UntitledUI props
├── untitled-card-config.ts         # Bank → UntitledUI variant mapping
├── UntitledCardGridItem.tsx        # Grid item using UntitledUI card
└── UntitledCardVisual.tsx          # Detail view using UntitledUI card
```

**Files to modify:**

- `CreditCardsContent.tsx` — Import swap to `UntitledCardGridItem`
- `CreditCardDetailContent.tsx` — Import swap to `UntitledCardVisual`
- `KeyMetrics.tsx` — Add full card number display if available

**Files preserved (no changes):**

- All `primitives/` components (original SmartPockets)
- `CreditCardVisual.tsx`, `CreditCardVisualCompact.tsx`
- Convex queries, types, animation constants

---

### Bank → UntitledUI Variant Mapping

| Bank | UntitledUI Variant | Rationale |
|------|-------------------|-----------|
| Apple | `gray-light` | Minimalist white/silver aesthetic |
| Chase | `brand-dark` | Deep blue brand color, premium feel |
| Wells Fargo | `salmon-strip` | Warm red/gold brand colors |
| Citi | `gradient-strip` | Modern blue brand with depth |
| American Express | `gray-strip-vertical` | Premium vertical accent |
| Capital One | `gradient-strip-vertical` | Bold brand with edge |
| Synchrony | `gray-dark` | Neutral partner-brand |
| **Default** | `transparent-gradient` | Eye-catching glass effect fallback |

**Implementation:**

```typescript
// untitled-card-config.ts
import type { CreditCardType } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";

const bankVariantMap: Record<string, CreditCardType> = {
  'apple': 'gray-light',
  'chase': 'brand-dark',
  'wells fargo': 'salmon-strip',
  'citi': 'gradient-strip',
  'american express': 'gray-strip-vertical',
  'capital one': 'gradient-strip-vertical',
  'synchrony': 'gray-dark',
};

export const defaultVariant: CreditCardType = 'transparent-gradient';

export function getUntitledVariant(company: string): CreditCardType {
  const normalized = company.toLowerCase();
  for (const [bank, variant] of Object.entries(bankVariantMap)) {
    if (normalized.includes(bank)) return variant;
  }
  return defaultVariant;
}
```

---

### Component Specifications

#### UntitledCreditCard.tsx

Wrapper component that adapts existing `CreditCardData` to UntitledUI props.

```typescript
import { CreditCard } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";
import { getUntitledVariant } from "./untitled-card-config";
import type { CreditCardData } from "@/types/credit-cards";
import { cx } from "@repo/ui/utils";

interface UntitledCreditCardProps {
  card: CreditCardData;
  className?: string;
  width?: number;
}

export function UntitledCreditCard({ card, className, width }: UntitledCreditCardProps) {
  const variant = getUntitledVariant(card.company);

  return (
    <CreditCard
      company={card.company}
      cardNumber={`•••• •••• •••• ${card.lastFour}`}
      cardHolder={card.cardholderName}
      cardExpiration={card.expiryDate}
      type={variant}
      className={className}
      width={width}
    />
  );
}
```

#### UntitledCardGridItem.tsx

Grid item preserving animations and extended details.

- Wraps `UntitledCreditCard` in `motion.div` with `layoutId={card-${cardId}}`
- Preserves hover/tap scale animations (existing spring config)
- Preserves fade-out behavior during navigation
- Keeps `CardExtendedDetails` panel
- Keeps `LockCardButton` overlay

#### UntitledCardVisual.tsx

Detail view with shared element transition.

- Same `layoutId` for smooth grid → detail transition
- No flip logic (simpler than original)
- Centers card with existing responsive max-widths
- Uses `useSharedLayoutAnimation()` hook

---

### Data Display Changes

**Card front displays:**
- Company name (top left)
- Card number: `•••• •••• •••• {lastFour}`
- Cardholder name
- Expiration date
- Mastercard logo (built into UntitledUI component)

**Removed (was on back):**
- CVV — sensitive, better not displayed
- Magnetic stripe — decorative only

**Full card number:**
- If available, display in `KeyMetrics.tsx` or extended details panel
- More secure than showing on card visual

---

### Features Preserved

| Feature | Status |
|---------|--------|
| Shared element transitions | ✅ Preserved via `layoutId` |
| Hover/tap animations | ✅ Preserved via motion.div |
| Extended details panel | ✅ Preserved (balance, utilization, APR) |
| Lock card button | ✅ Preserved |
| Credit utilization bar | ✅ Preserved |
| Payment due badges | ✅ Preserved |

### Features Removed

| Feature | Reason |
|---------|--------|
| Flip animation | UntitledUI is single-sided |
| Back side view | UntitledUI is single-sided |
| Bank-specific layouts | Replaced by variant system |
| Custom chip/logo SVGs | UntitledUI has built-in styling |

---

## Implementation Order

1. Create `untitled-card-config.ts` with variant mapping
2. Create `UntitledCreditCard.tsx` wrapper component
3. Create `UntitledCardGridItem.tsx` with animations
4. Create `UntitledCardVisual.tsx` for detail view
5. Update `KeyMetrics.tsx` to show full card number if available
6. Swap imports in `CreditCardsContent.tsx`
7. Swap imports in `CreditCardDetailContent.tsx`
8. Test grid view, detail view, transitions, and all interactions

---

## Testing Checklist

- [ ] Grid view renders all cards with correct bank variants
- [ ] Shared element transition works grid → detail
- [ ] Shared element transition works detail → grid (back navigation)
- [ ] Extended details panel expands/collapses correctly
- [ ] Lock card button appears on hover and functions
- [ ] Utilization progress bar displays correctly
- [ ] Payment due badges show correct status
- [ ] Full card number displays in details (if available)
- [ ] Responsive sizing works on mobile/tablet/desktop
- [ ] Original SmartPockets components still importable (preserved)

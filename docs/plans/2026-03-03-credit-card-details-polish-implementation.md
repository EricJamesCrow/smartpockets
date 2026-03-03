# Credit Card Details Page Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the credit card details page with underline tabs, badge-style header, and relocated AutoPay toggle.

**Architecture:** Three independent UI-only changes to `CreditCardDetailContent.tsx` and `KeyMetrics.tsx`. No backend/Convex changes. Each task is a single atomic commit.

**Tech Stack:** React, Tailwind CSS 4, UntitledUI components (`Badge`, `BadgeWithDot`, `Toggle`), Framer Motion

---

### Task 1: Replace grey block tabs with underline-style tabs

**Files:**
- Modify: `apps/app/src/components/credit-cards/CreditCardDetailContent.tsx`

**Step 1: Replace tab imports and markup**

Remove these imports (they are no longer needed for tabs):
```tsx
import { ContentDivider } from "@repo/ui/untitledui/application/content-divider/content-divider";
import { ButtonGroup, ButtonGroupItem } from "@repo/ui/untitledui/base/button-group/button-group";
```

Remove the `import type { Selection } from "react-aria-components";` import.

Replace the `handleTabChange` function (lines 55-59):
```tsx
// Old:
const handleTabChange = (keys: Selection) => {
  if (keys !== "all" && keys.size > 0) {
    const selected = Array.from(keys)[0] as TabId;
    setSelectedTab(selected);
  }
};

// New:
const tabs: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "details", label: "Details" },
  { id: "transactions", label: "Transactions" },
  { id: "subscriptions", label: "Subscriptions" },
];
```

Replace the tab navigation section (lines 229-241):
```tsx
{/* Old: */}
<div className="px-4 pb-4 lg:px-6">
  <ContentDivider type="background-fill">
    <ButtonGroup
      selectedKeys={new Set([selectedTab])}
      onSelectionChange={handleTabChange}
    >
      <ButtonGroupItem id="overview">Overview</ButtonGroupItem>
      <ButtonGroupItem id="details">Details</ButtonGroupItem>
      <ButtonGroupItem id="transactions">Transactions</ButtonGroupItem>
      <ButtonGroupItem id="subscriptions">Subscriptions</ButtonGroupItem>
    </ButtonGroup>
  </ContentDivider>
</div>

{/* New: */}
<div className="border-b border-secondary px-4 lg:px-6">
  <nav className="flex gap-6" aria-label="Card detail tabs">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        onClick={() => setSelectedTab(tab.id)}
        className={cx(
          "relative pb-3 text-sm font-semibold transition-colors",
          selectedTab === tab.id
            ? "text-utility-brand-600"
            : "text-tertiary hover:text-secondary"
        )}
      >
        {tab.label}
        {selectedTab === tab.id && (
          <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-utility-brand-600" />
        )}
      </button>
    ))}
  </nav>
</div>
```

**Step 2: Verify no type errors**

Run: `bun typecheck`
Expected: No errors related to removed imports or changed tab markup.

**Step 3: Visual check**

Run: `bun dev:app`
Navigate to any credit card detail page. Verify:
- Tabs render as transparent text with no grey background
- Active tab ("Overview" by default) shows green text + green bottom border
- Inactive tabs show grey text
- Clicking tabs switches content correctly
- A subtle grey line runs beneath all tabs

**Step 4: Commit**

```
feat(credit-cards): replace block tabs with underline-style tabs

Use transparent tabs with brand green active underline instead of
grey ButtonGroup block styling.
```

---

### Task 2: Replace lock button with clickable lock badge in header

**Files:**
- Modify: `apps/app/src/components/credit-cards/CreditCardDetailContent.tsx`

**Step 1: Update imports**

Remove the `LockCardButton` import:
```tsx
// Remove this line:
import { LockCardButton } from "./LockCardButton";
```

Add `Badge` import (if not already present):
```tsx
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
```

**Step 2: Replace header badges section**

Replace the "Right: Status Badges" section (lines 172-184):
```tsx
{/* Old: */}
<div className="flex items-center gap-3">
  <LockCardButton
    isLocked={card.isLocked}
    onClick={() => toggleLock(cardId, card.isLocked)}
    isLoading={isLocking}
    size="sm"
  />
  <CreditCardStatusBadge
    isLocked={card.isLocked}
    isActive={card.isActive}
    isOverdue={card.isOverdue}
  />
</div>

{/* New: */}
<div className="flex items-center gap-2">
  <button
    type="button"
    onClick={() => toggleLock(cardId, card.isLocked)}
    disabled={isLocking}
    className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
  >
    <Badge
      type="pill-color"
      color={card.isLocked ? "warning" : "gray"}
      size="sm"
    >
      {card.isLocked ? "Lock: On" : "Lock: Off"}
    </Badge>
  </button>
  <CreditCardStatusBadge
    isLocked={card.isLocked}
    isActive={card.isActive}
    isOverdue={card.isOverdue}
  />
</div>
```

**Step 3: Clean up unused imports**

If `useToggleCardLocked` hook is still used (it is — for `toggleLock` and `isLocking`), keep it. Only remove `LockCardButton` import.

**Step 4: Verify no type errors**

Run: `bun typecheck`
Expected: No errors.

**Step 5: Visual check**

Run: `bun dev:app`
Navigate to credit card detail. Verify:
- Two badges appear in header: "Lock: Off" (grey pill) + "Active" (green pill)
- Clicking "Lock: Off" toggles to "Lock: On" (warning/amber pill)
- Clicking again toggles back
- No lock icon button visible

**Step 6: Commit**

```
refactor(credit-cards): replace lock button with clickable lock badge

Show "Lock: Off" / "Lock: On" as a clickable pill badge next to the
Active status badge, matching the Figma design.
```

---

### Task 3: Move AutoPay toggle into Minimum Payment metric

**Files:**
- Modify: `apps/app/src/components/credit-cards/CreditCardDetailContent.tsx`
- Modify: `apps/app/src/components/credit-cards/KeyMetrics.tsx`

**Step 1: Remove AutoPay from header in CreditCardDetailContent.tsx**

Remove the `AutoPayToggle` from the header section. The "Card Title and Subtitle" section (lines 188-218) currently has the AutoPay toggle in the right column next to Payment Due. Remove just the `AutoPayToggle` usage:

```tsx
{/* Old (right side of title row): */}
<div className="flex items-end gap-6">
  <AutoPayToggle
    enabled={autoPay.enabled}
    onToggle={autoPay.toggle}
    isLoading={autoPay.isLoading}
  />
  <div className="flex flex-col items-end gap-1">
    <span className="text-xs font-medium uppercase tracking-wide text-tertiary">
      Payment Due
    </span>
    ...
  </div>
</div>

{/* New (right side of title row): */}
<div className="flex flex-col items-end gap-1">
  <span className="text-xs font-medium uppercase tracking-wide text-tertiary">
    Payment Due
  </span>
  ...
</div>
```

**Step 2: Pass autoPay props to KeyMetrics**

Update the `<KeyMetrics>` usage in the overview tab to pass autoPay state:
```tsx
{/* Old: */}
<KeyMetrics card={card} />

{/* New: */}
<KeyMetrics
  card={card}
  autoPay={autoPay}
/>
```

**Step 3: Update KeyMetrics component to accept and render AutoPay**

In `KeyMetrics.tsx`, update the interface and the Minimum Payment column:

Add to imports:
```tsx
import { AutoPayToggle } from "./AutoPayToggle";
```

Update the interface:
```tsx
interface KeyMetricsProps {
  card: ExtendedCreditCardData;
  transactions?: Transaction[];
  autoPay?: {
    enabled: boolean;
    isLoading: boolean;
    toggle: (enabled: boolean) => void;
  };
}
```

Update the function signature:
```tsx
export function KeyMetrics({ card, transactions = [], autoPay }: KeyMetricsProps) {
```

In the Minimum Payment column, add the AutoPay toggle below the "Recommended" line:
```tsx
{/* Minimum Payment */}
<div className="flex flex-1 flex-col gap-1 lg:px-6">
  <div className="flex items-center justify-between">
    <p className="text-sm font-medium text-tertiary">Minimum Payment</p>
    <span className="text-xs text-tertiary">
      Due {card.nextPaymentDueDate ? formatDueDate(card.nextPaymentDueDate) : "--"}
    </span>
  </div>
  <p className="text-xl font-semibold text-primary tabular-nums lg:text-2xl">
    {formatDisplayCurrency(card.minimumPaymentAmount)}
  </p>
  <p className="text-xs text-tertiary">
    Recommended: {formatDisplayCurrency(recommendedPayment)}
  </p>
  {autoPay && (
    <div className="mt-1">
      <AutoPayToggle
        enabled={autoPay.enabled}
        onToggle={autoPay.toggle}
        isLoading={autoPay.isLoading}
      />
    </div>
  )}
</div>
```

**Step 4: Clean up unused import in CreditCardDetailContent.tsx**

The `AutoPayToggle` import in `CreditCardDetailContent.tsx` can be removed since it's no longer used directly there. Keep the `useAutoPay` import:
```tsx
// Old:
import { AutoPayToggle, useAutoPay } from "./AutoPayToggle";

// New:
import { useAutoPay } from "./AutoPayToggle";
```

**Step 5: Verify no type errors**

Run: `bun typecheck`
Expected: No errors.

**Step 6: Visual check**

Run: `bun dev:app`
Navigate to credit card detail. Verify:
- AutoPay toggle no longer appears in header next to Payment Due
- AutoPay toggle appears beneath the "Recommended: $X" text in the Minimum Payment metric
- Toggle still works (clicking toggles state, persists to Convex)
- Header looks cleaner without the toggle

**Step 7: Commit**

```
refactor(credit-cards): move AutoPay toggle into minimum payment metric

Relocate AutoPay from the header to the KeyMetrics component under
the Minimum Payment column for better logical grouping.
```

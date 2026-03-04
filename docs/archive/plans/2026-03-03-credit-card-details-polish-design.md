# Credit Card Details Page — UI Polish

## Summary

Three focused polish changes to the credit card details (`[cardId]`) page to improve visual consistency and layout cleanliness.

## Changes

### 1. Tab Bar — Underline Style

**Current:** Grey block `ButtonGroup` with `ContentDivider` background fill.

**New:** Transparent underline-style tabs.

- Remove `ContentDivider` wrapper and `ButtonGroup` component
- Replace with custom tab buttons on a transparent background
- Active tab: `text-utility-brand-600` + 2px bottom border in brand green
- Inactive tabs: `text-tertiary`, no underline
- Full-width `border-secondary` line beneath all tabs (active underline overlaps it)
- Same tab IDs: `overview`, `details`, `transactions`, `subscriptions`

**Files:** `CreditCardDetailContent.tsx` (lines 229-241)

### 2. Header — Badge Cleanup

**Current:** `LockCardButton` (icon button with tooltip) + `CreditCardStatusBadge` (BadgeWithDot).

**New:** Two side-by-side badges — clickable lock badge + status badge.

- Remove `LockCardButton` component usage from header
- Add clickable "Lock: Off" / "Lock: On" badge using `Badge` or `BadgeWithDot`
  - `gray` color when unlocked ("Lock: Off")
  - `warning` color when locked ("Lock: On")
  - `onClick` handler calls existing `toggleLock` function
  - `cursor-pointer` styling
- Keep `CreditCardStatusBadge` as-is (green "Active" pill)
- Layout: `[Lock: Off] [Active]` — right-aligned in header

**Files:** `CreditCardDetailContent.tsx` (lines 172-184)

### 3. AutoPay — Relocate to Minimum Payment Metric

**Current:** `AutoPayToggle` sits in the header next to Payment Due info.

**New:** Embedded within the "Minimum Payment" column of `KeyMetrics`.

- Remove `AutoPayToggle` from header section in `CreditCardDetailContent.tsx`
- Add AutoPay toggle/label beneath the "Recommended" line in the Minimum Payment metric
- Small inline toggle with "AutoPay" label
- Pass `autoPay` state down to `KeyMetrics` component

**Files:**
- `CreditCardDetailContent.tsx` — remove AutoPay from header, pass props to KeyMetrics
- `KeyMetrics.tsx` — add AutoPay toggle in Minimum Payment column

## Non-Changes

- No Convex schema or function changes
- No data model changes
- `LockCardButton.tsx` component file remains (may be used elsewhere or cleaned up later)
- All existing functionality preserved (lock toggle, autopay toggle, tab switching)

## Design Tokens

- Brand green: `utility-brand-500` (`rgb(22 179 100)`) / `utility-brand-600` (`rgb(9 146 80)`)
- Active tab text + underline: `text-utility-brand-600`, `border-utility-brand-600`
- Inactive tab text: `text-tertiary`

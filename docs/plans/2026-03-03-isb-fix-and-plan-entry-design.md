# ISB Fix & Installment Plan / Promo Rate Entry

**Date:** 2026-03-03
**Status:** Approved
**Scope:** Fix misleading Interest Saving Balance display + enable installment plan and promo rate entry in PromoTracker

## Problem

The Interest Saving Balance (ISB) computation is:

```
ISB = currentBalance - totalProtectedBalances + totalProtectedPayments
```

When `payOverTimeEnabled` is true but no installment plans or promo rates have been entered, `totalProtectedBalances = 0`, so ISB equals `currentBalance`. This is misleading — for a Chase card with $4,438.53 current balance and Pay Over Time plans totaling ~$4,011.63, the real ISB is $426.90, not $4,438.53.

Plaid does NOT provide an ISB field. The formula is correct; the input data is missing.

## Solution

Two changes:

1. **ISB Guard** — Don't show a misleading number when data is incomplete
2. **Plan Entry** — Enable the "Coming soon" buttons in PromoTracker so users can enter their Pay Over Time / promo data

## Section 1: ISB Guard

Logic (evaluated in order):

1. If `currentBalance === 0` → show `$0.00` (short-circuit, no nag)
2. If `payOverTimeEnabled === true` AND no active promos/installments → show `—` with subtitle: "Enter your Pay Over Time plans below to see your accurate interest saving balance"
3. If promos/installments exist → show computed ISB (formula is correct)
4. If `payOverTimeEnabled` is false/undefined AND no promos → show `currentBalance` as ISB (standard credit card math, this IS correct)

### Edge Cases

- **Stale data** (`payOverTimeEnabled === false` but promos exist): Still compute ISB using them. Plans are real debt — soft-delete via `isActive` is how to remove them, not the POT toggle.
- **Zero-dollar plans**: Filter by `isActive` in queries (already done). Empty arrays = no promos.

## Section 2: Installment Plan Entry Form

Inline form inside PromoTracker, triggered by the "+" button. A toggle at the top selects between **Installment Plan** and **Promo Rate**.

### Installment Plan Fields

| Field | Input | Required | Example |
|-------|-------|----------|---------|
| Description | Text | Yes | "MacBook Pro - My Chase Plan" |
| Original amount | Currency | Yes | $1,200.00 |
| Remaining balance | Currency | Yes | $800.00 |
| Total payments | Number | Yes | 12 |
| Remaining payments | Number | Yes | 8 |
| Monthly payment | Currency | Yes | $100.00 |
| Monthly fee | Currency | Yes | $1.67 |
| APR | Percentage | Yes | 0% |
| Start date | Date | Yes | 2025-09-15 |

Maps 1:1 to existing `installmentPlans.mutations.create`.

### Promo Rate Fields

| Field | Input | Required | Example |
|-------|-------|----------|---------|
| Description | Text | Yes | "Balance Transfer - 0% intro" |
| APR | Percentage | Yes | 0% |
| Original balance | Currency | Yes | $3,000.00 |
| Remaining balance | Currency | Yes | $2,500.00 |
| Start date | Date | Yes | 2025-06-01 |
| Expiration date | Date | Yes | 2026-06-01 |
| Deferred interest? | Toggle | Yes | No |
| Monthly minimum | Currency | No | $25.00 |

Maps 1:1 to existing `promoRates.mutations.create`.

### UX Flow

1. Click "+" → toggle appears (Installment Plan | Promo Rate), form slides down
2. Fill fields → "Save" → mutation called → form collapses → plan appears in list
3. "Cancel" collapses form with no changes

### Validation

- All currency fields >= 0
- Remaining balance <= original amount
- Remaining payments <= total payments
- Expiration date > start date (promo rates)

## Section 3: Edit/Delete for Existing Plans

### Edit

- Each plan row gets a subtle "..." menu or pencil/trash icons (visible on hover, always visible on mobile)
- Clicking edit expands the inline form pre-filled with current values
- Only mutable fields are editable:
  - Installments: `description`, `remainingPrincipal`, `remainingPayments`, `monthlyPrincipal`, `monthlyFee`
  - Promos: `description`, `remainingBalance`, `monthlyMinimumPayment`, `accruedDeferredInterest`
- Start date, original amount, total payments are read-only after creation

### Delete

- Click delete → inline confirmation: "Remove this plan?" with Confirm / Cancel
- Calls existing `remove` mutation (soft-delete via `isActive: false`)
- Plan disappears, ISB recalculates reactively

## Section 4: Component Changes

### Modified

- **`InterestSavingBalance.tsx`** — ISB guard logic
- **`PromoTracker.tsx`** — Enable "+" button, add type toggle, render inline form, add edit/delete affordances

### New

- **`InstallmentPlanForm.tsx`** — Inline create/edit form for installment plans
- **`PromoRateForm.tsx`** — Inline create/edit form for promo rates

### Backend: No changes needed

All mutations and queries already exist:
- `installmentPlans.mutations.create/update/remove`
- `promoRates.mutations.create/update/remove`
- `installmentPlans.queries.listByCard`
- `promoRates.queries.listByCard`
- `creditCards.queries.computeInterestSavingBalance` (formula is correct)

### Schema: No changes needed

`installmentPlans` and `promoRates` tables already defined.

### Data Flow

```
User enters plan → create mutation → plan saved to DB
  → PromoTracker re-renders (shows new plan)
  → computeInterestSavingBalance re-runs (subtracts protected balance)
  → InterestSavingBalance re-renders (correct ISB)
```

Everything is reactive via Convex subscriptions — no manual refresh needed.

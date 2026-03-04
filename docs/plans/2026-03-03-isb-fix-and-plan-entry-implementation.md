# ISB Fix & Plan Entry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the misleading Interest Saving Balance display and enable installment plan / promo rate entry forms so the ISB computes correctly.

**Architecture:** Guard the ISB component when Pay Over Time is enabled but no plan data exists. Add inline create/edit/delete forms to PromoTracker that call existing backend mutations. All backend code (mutations, queries, schema) already exists — this is purely a frontend task plus one prop threading change.

**Tech Stack:** React 19, Convex (useQuery/useMutation), TailwindCSS, cx() utility

**Design Doc:** `docs/plans/2026-03-03-isb-fix-and-plan-entry-design.md`

---

## Task 1: ISB Guard — Thread `payOverTimeEnabled` prop

**Files:**
- Modify: `apps/app/src/components/credit-cards/CardDetailsTab.tsx:96-99`
- Modify: `apps/app/src/components/credit-cards/details/InterestSavingBalance.tsx:8-11`

**Step 1: Add `payOverTimeEnabled` prop to InterestSavingBalance**

In `InterestSavingBalance.tsx`, update the props interface:

```tsx
interface InterestSavingBalanceProps {
  creditCardId: Id<"creditCards">;
  purchaseAprPercentage?: number | null;
  payOverTimeEnabled?: boolean;
}
```

Update the function signature to destructure it:

```tsx
export function InterestSavingBalance({ creditCardId, purchaseAprPercentage, payOverTimeEnabled }: InterestSavingBalanceProps) {
```

**Step 2: Pass the prop from CardDetailsTab**

In `CardDetailsTab.tsx`, update the `<InterestSavingBalance>` usage (around line 96):

```tsx
<InterestSavingBalance
  creditCardId={cardId}
  purchaseAprPercentage={getPurchaseApr(cardData.aprs ?? undefined)}
  payOverTimeEnabled={cardData.payOverTimeEnabled ?? undefined}
/>
```

**Step 3: Run typecheck**

Run: `bun typecheck`
Expected: No new errors (existing email JSX errors are pre-existing).

**Step 4: Commit**

```
feat(credit-cards): thread payOverTimeEnabled to InterestSavingBalance
```

---

## Task 2: ISB Guard — Implement display logic

**Files:**
- Modify: `apps/app/src/components/credit-cards/details/InterestSavingBalance.tsx`

**Step 1: Add the guard logic after the query**

Replace the current display logic (lines 29-34) with:

```tsx
export function InterestSavingBalance({ creditCardId, purchaseAprPercentage, payOverTimeEnabled }: InterestSavingBalanceProps) {
  const data = useQuery(api.creditCards.queries.computeInterestSavingBalance, { creditCardId });

  if (!data) return null;

  // Zero balance short-circuit — no nag needed
  if (data.currentBalance === 0) {
    return (
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">Interest Saving Balance</h3>
        <div className="rounded-xl border border-secondary bg-primary p-4">
          <p className="text-2xl font-semibold tabular-nums text-primary">
            {formatDisplayCurrency(0)}
          </p>
          <p className="mt-1 text-xs text-tertiary">No balance — you're all clear</p>
        </div>
      </section>
    );
  }

  // POT enabled but no plan data entered — ISB would be misleading
  if (payOverTimeEnabled && !data.hasPromos) {
    return (
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">Interest Saving Balance</h3>
        <div className="rounded-xl border border-dashed border-utility-brand-200 bg-utility-brand-50 p-4">
          <p className="text-2xl font-semibold text-primary">—</p>
          <p className="mt-1 text-xs text-utility-brand-700">
            Enter your Pay Over Time plans below to see your accurate interest saving balance
          </p>
        </div>
      </section>
    );
  }

  // Standard display — either promos exist (correct ISB) or no POT (ISB = currentBalance, correct)
  const isZeroPurchaseApr = purchaseAprPercentage === 0;
  const displayedAmount = isZeroPurchaseApr && data.hasPromos
    ? data.totalProtectedPayments
    : data.interestSavingBalance;

  return (
    // ... existing JSX unchanged from here
```

Keep the rest of the component (return JSX with the breakdown grid) exactly as-is.

**Step 2: Run typecheck**

Run: `bun typecheck`
Expected: No new errors.

**Step 3: Manual test**

Run: `bun dev:app`
- Navigate to Chase card (has `payOverTimeEnabled`) → should show `—` with prompt
- Navigate to Wells Fargo card (no POT) → should show current balance as ISB

**Step 4: Commit**

```
fix(credit-cards): guard ISB display when Pay Over Time data is missing
```

---

## Task 3: InstallmentPlanForm — Create component

**Files:**
- Create: `apps/app/src/components/credit-cards/details/InstallmentPlanForm.tsx`

**Step 1: Create the inline form component**

```tsx
"use client";

import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";

interface InstallmentPlanFormProps {
  creditCardId: Id<"creditCards">;
  onClose: () => void;
  editingPlan?: {
    _id: Id<"installmentPlans">;
    description: string;
    startDate: string;
    originalPrincipal: number;
    remainingPrincipal: number;
    totalPayments: number;
    remainingPayments: number;
    monthlyPrincipal: number;
    monthlyFee: number;
    aprPercentage: number;
  };
}

export function InstallmentPlanForm({ creditCardId, onClose, editingPlan }: InstallmentPlanFormProps) {
  const createPlan = useMutation(api.installmentPlans.mutations.create);
  const updatePlan = useMutation(api.installmentPlans.mutations.update);

  const [description, setDescription] = useState(editingPlan?.description ?? "");
  const [originalPrincipal, setOriginalPrincipal] = useState(editingPlan?.originalPrincipal?.toString() ?? "");
  const [remainingPrincipal, setRemainingPrincipal] = useState(editingPlan?.remainingPrincipal?.toString() ?? "");
  const [totalPayments, setTotalPayments] = useState(editingPlan?.totalPayments?.toString() ?? "");
  const [remainingPayments, setRemainingPayments] = useState(editingPlan?.remainingPayments?.toString() ?? "");
  const [monthlyPrincipal, setMonthlyPrincipal] = useState(editingPlan?.monthlyPrincipal?.toString() ?? "");
  const [monthlyFee, setMonthlyFee] = useState(editingPlan?.monthlyFee?.toString() ?? "0");
  const [aprPercentage, setAprPercentage] = useState(editingPlan?.aprPercentage?.toString() ?? "0");
  const [startDate, setStartDate] = useState(editingPlan?.startDate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingPlan;

  const handleSave = async () => {
    const parsed = {
      description: description.trim(),
      originalPrincipal: parseFloat(originalPrincipal),
      remainingPrincipal: parseFloat(remainingPrincipal),
      totalPayments: parseInt(totalPayments, 10),
      remainingPayments: parseInt(remainingPayments, 10),
      monthlyPrincipal: parseFloat(monthlyPrincipal),
      monthlyFee: parseFloat(monthlyFee),
      aprPercentage: parseFloat(aprPercentage),
      startDate,
    };

    // Validation
    if (!parsed.description) return;
    if (isNaN(parsed.originalPrincipal) || parsed.originalPrincipal < 0) return;
    if (isNaN(parsed.remainingPrincipal) || parsed.remainingPrincipal < 0) return;
    if (parsed.remainingPrincipal > parsed.originalPrincipal) return;
    if (isNaN(parsed.totalPayments) || parsed.totalPayments < 1) return;
    if (isNaN(parsed.remainingPayments) || parsed.remainingPayments < 0) return;
    if (parsed.remainingPayments > parsed.totalPayments) return;
    if (isNaN(parsed.monthlyPrincipal) || parsed.monthlyPrincipal < 0) return;
    if (isNaN(parsed.monthlyFee) || parsed.monthlyFee < 0) return;
    if (isNaN(parsed.aprPercentage) || parsed.aprPercentage < 0) return;
    if (!parsed.startDate) return;

    setError(null);
    setSaving(true);
    try {
      if (isEditing) {
        await updatePlan({
          planId: editingPlan._id,
          description: parsed.description,
          remainingPrincipal: parsed.remainingPrincipal,
          remainingPayments: parsed.remainingPayments,
          monthlyPrincipal: parsed.monthlyPrincipal,
          monthlyFee: parsed.monthlyFee,
        });
      } else {
        await createPlan({
          creditCardId,
          ...parsed,
        });
      }
      onClose();
    } catch {
      setError("Could not save installment plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-secondary bg-primary px-3 py-1.5 text-sm tabular-nums text-primary placeholder:text-tertiary focus:border-utility-brand-500 focus:outline-none focus:ring-1 focus:ring-utility-brand-500";
  const labelClass = "block text-xs font-medium text-tertiary mb-1";

  return (
    <div className="rounded-xl border border-secondary bg-primary p-4">
      <h4 className="mb-3 text-sm font-semibold text-primary">
        {isEditing ? "Edit Installment Plan" : "New Installment Plan"}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. MacBook Pro - My Chase Plan" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Original Amount</label>
          <input type="number" min={0} step={0.01} value={originalPrincipal} onChange={(e) => setOriginalPrincipal(e.target.value)} placeholder="1200.00" className={inputClass} disabled={isEditing} />
        </div>
        <div>
          <label className={labelClass}>Remaining Balance</label>
          <input type="number" min={0} step={0.01} value={remainingPrincipal} onChange={(e) => setRemainingPrincipal(e.target.value)} placeholder="800.00" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Total Payments</label>
          <input type="number" min={1} value={totalPayments} onChange={(e) => setTotalPayments(e.target.value)} placeholder="12" className={inputClass} disabled={isEditing} />
        </div>
        <div>
          <label className={labelClass}>Remaining Payments</label>
          <input type="number" min={0} value={remainingPayments} onChange={(e) => setRemainingPayments(e.target.value)} placeholder="8" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Monthly Payment</label>
          <input type="number" min={0} step={0.01} value={monthlyPrincipal} onChange={(e) => setMonthlyPrincipal(e.target.value)} placeholder="100.00" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Monthly Fee</label>
          <input type="number" min={0} step={0.01} value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="1.67" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>APR %</label>
          <input type="number" min={0} step={0.01} value={aprPercentage} onChange={(e) => setAprPercentage(e.target.value)} placeholder="0" className={inputClass} disabled={isEditing} />
        </div>
        <div>
          <label className={labelClass}>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} disabled={isEditing} />
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-utility-error-700">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-tertiary transition-colors hover:text-primary">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving || !description} className="rounded-lg bg-utility-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-utility-brand-700 disabled:opacity-50">
          {saving ? "Saving..." : isEditing ? "Update" : "Save"}
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Run typecheck**

Run: `bun typecheck`
Expected: No new errors.

**Step 3: Commit**

```
feat(credit-cards): add InstallmentPlanForm component
```

---

## Task 4: PromoRateForm — Create component

**Files:**
- Create: `apps/app/src/components/credit-cards/details/PromoRateForm.tsx`

**Step 1: Create the inline form component**

```tsx
"use client";

import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";

interface PromoRateFormProps {
  creditCardId: Id<"creditCards">;
  onClose: () => void;
  editingPromo?: {
    _id: Id<"promoRates">;
    description: string;
    aprPercentage: number;
    originalBalance: number;
    remainingBalance: number;
    startDate: string;
    expirationDate: string;
    isDeferredInterest: boolean;
    accruedDeferredInterest?: number;
    monthlyMinimumPayment?: number;
  };
}

export function PromoRateForm({ creditCardId, onClose, editingPromo }: PromoRateFormProps) {
  const createPromo = useMutation(api.promoRates.mutations.create);
  const updatePromo = useMutation(api.promoRates.mutations.update);

  const [description, setDescription] = useState(editingPromo?.description ?? "");
  const [aprPercentage, setAprPercentage] = useState(editingPromo?.aprPercentage?.toString() ?? "0");
  const [originalBalance, setOriginalBalance] = useState(editingPromo?.originalBalance?.toString() ?? "");
  const [remainingBalance, setRemainingBalance] = useState(editingPromo?.remainingBalance?.toString() ?? "");
  const [startDate, setStartDate] = useState(editingPromo?.startDate ?? "");
  const [expirationDate, setExpirationDate] = useState(editingPromo?.expirationDate ?? "");
  const [isDeferredInterest, setIsDeferredInterest] = useState(editingPromo?.isDeferredInterest ?? false);
  const [accruedDeferredInterest, setAccruedDeferredInterest] = useState(editingPromo?.accruedDeferredInterest?.toString() ?? "");
  const [monthlyMinimumPayment, setMonthlyMinimumPayment] = useState(editingPromo?.monthlyMinimumPayment?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingPromo;

  const handleSave = async () => {
    const parsed = {
      description: description.trim(),
      aprPercentage: parseFloat(aprPercentage),
      originalBalance: parseFloat(originalBalance),
      remainingBalance: parseFloat(remainingBalance),
      startDate,
      expirationDate,
      isDeferredInterest,
      accruedDeferredInterest: accruedDeferredInterest ? parseFloat(accruedDeferredInterest) : undefined,
      monthlyMinimumPayment: monthlyMinimumPayment ? parseFloat(monthlyMinimumPayment) : undefined,
    };

    // Validation
    if (!parsed.description) return;
    if (isNaN(parsed.aprPercentage) || parsed.aprPercentage < 0) return;
    if (isNaN(parsed.originalBalance) || parsed.originalBalance < 0) return;
    if (isNaN(parsed.remainingBalance) || parsed.remainingBalance < 0) return;
    if (parsed.remainingBalance > parsed.originalBalance) return;
    if (!parsed.startDate || !parsed.expirationDate) return;
    if (parsed.expirationDate <= parsed.startDate) return;

    setError(null);
    setSaving(true);
    try {
      if (isEditing) {
        await updatePromo({
          promoRateId: editingPromo._id,
          description: parsed.description,
          remainingBalance: parsed.remainingBalance,
          accruedDeferredInterest: parsed.accruedDeferredInterest,
          monthlyMinimumPayment: parsed.monthlyMinimumPayment,
        });
      } else {
        await createPromo({
          creditCardId,
          ...parsed,
        });
      }
      onClose();
    } catch {
      setError("Could not save promotional rate. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-secondary bg-primary px-3 py-1.5 text-sm tabular-nums text-primary placeholder:text-tertiary focus:border-utility-brand-500 focus:outline-none focus:ring-1 focus:ring-utility-brand-500";
  const labelClass = "block text-xs font-medium text-tertiary mb-1";

  return (
    <div className="rounded-xl border border-secondary bg-primary p-4">
      <h4 className="mb-3 text-sm font-semibold text-primary">
        {isEditing ? "Edit Promotional Rate" : "New Promotional Rate"}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Balance Transfer - 0% intro" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>APR %</label>
          <input type="number" min={0} step={0.01} value={aprPercentage} onChange={(e) => setAprPercentage(e.target.value)} placeholder="0" className={inputClass} disabled={isEditing} />
        </div>
        <div>
          <label className={labelClass}>Original Balance</label>
          <input type="number" min={0} step={0.01} value={originalBalance} onChange={(e) => setOriginalBalance(e.target.value)} placeholder="3000.00" className={inputClass} disabled={isEditing} />
        </div>
        <div>
          <label className={labelClass}>Remaining Balance</label>
          <input type="number" min={0} step={0.01} value={remainingBalance} onChange={(e) => setRemainingBalance(e.target.value)} placeholder="2500.00" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Monthly Minimum</label>
          <input type="number" min={0} step={0.01} value={monthlyMinimumPayment} onChange={(e) => setMonthlyMinimumPayment(e.target.value)} placeholder="25.00" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} disabled={isEditing} />
        </div>
        <div>
          <label className={labelClass}>Expiration Date</label>
          <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} className={inputClass} />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input
            id="deferred-interest"
            type="checkbox"
            checked={isDeferredInterest}
            onChange={(e) => setIsDeferredInterest(e.target.checked)}
            className="h-4 w-4 rounded border-secondary text-utility-brand-600 focus:ring-utility-brand-500"
            disabled={isEditing}
          />
          <label htmlFor="deferred-interest" className="text-xs text-tertiary">
            Deferred interest (interest accrues and is charged if balance isn't paid by expiration)
          </label>
        </div>
        {isDeferredInterest && (
          <div className="col-span-2">
            <label className={labelClass}>Accrued Deferred Interest</label>
            <input type="number" min={0} step={0.01} value={accruedDeferredInterest} onChange={(e) => setAccruedDeferredInterest(e.target.value)} placeholder="0.00" className={inputClass} />
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-utility-error-700">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-tertiary transition-colors hover:text-primary">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving || !description} className="rounded-lg bg-utility-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-utility-brand-700 disabled:opacity-50">
          {saving ? "Saving..." : isEditing ? "Update" : "Save"}
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Run typecheck**

Run: `bun typecheck`
Expected: No new errors.

**Step 3: Commit**

```
feat(credit-cards): add PromoRateForm component
```

---

## Task 5: PromoTracker — Enable "+" button with type toggle

**Files:**
- Modify: `apps/app/src/components/credit-cards/details/PromoTracker.tsx`

**Step 1: Add state and imports for forms**

At the top of `PromoTracker.tsx`, add imports and form state:

```tsx
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { InstallmentPlanForm } from "./InstallmentPlanForm";
import { PromoRateForm } from "./PromoRateForm";
```

Inside the component function, add state:

```tsx
const [showForm, setShowForm] = useState<"installment" | "promo" | null>(null);
```

Add the `useState` import if not already present (it is already imported via `react`... checking: no, it's not currently imported — add it):

```tsx
import { useState } from "react";
```

**Step 2: Replace the disabled "+" buttons**

Replace the empty-state button (lines 51-59) with:

```tsx
{showForm ? (
  <div className="space-y-3">
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setShowForm("installment")}
        className={cx(
          "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          showForm === "installment"
            ? "bg-utility-brand-600 text-white"
            : "bg-secondary text-tertiary hover:text-primary",
        )}
      >
        Installment Plan
      </button>
      <button
        type="button"
        onClick={() => setShowForm("promo")}
        className={cx(
          "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          showForm === "promo"
            ? "bg-utility-brand-600 text-white"
            : "bg-secondary text-tertiary hover:text-primary",
        )}
      >
        Promo Rate
      </button>
    </div>
    {showForm === "installment" && (
      <InstallmentPlanForm creditCardId={creditCardId} onClose={() => setShowForm(null)} />
    )}
    {showForm === "promo" && (
      <PromoRateForm creditCardId={creditCardId} onClose={() => setShowForm(null)} />
    )}
  </div>
) : (
  <button
    type="button"
    onClick={() => setShowForm("installment")}
    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-secondary bg-primary p-6 text-sm text-tertiary transition-colors hover:border-utility-brand-300 hover:text-primary"
  >
    <span className="text-lg">+</span>
    Add promotional APR or installment plan
  </button>
)}
```

Also replace the bottom "+" button (lines 150-158) with the same pattern but conditionally rendered only when `showForm` is null:

```tsx
{!showForm && (
  <button
    type="button"
    onClick={() => setShowForm("installment")}
    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-secondary bg-primary p-4 text-sm text-tertiary transition-colors hover:border-utility-brand-300 hover:text-primary"
  >
    <span className="text-lg">+</span>
    Add promotional rate or plan
  </button>
)}
{showForm && (
  <div className="space-y-3">
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setShowForm("installment")}
        className={cx(
          "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          showForm === "installment"
            ? "bg-utility-brand-600 text-white"
            : "bg-secondary text-tertiary hover:text-primary",
        )}
      >
        Installment Plan
      </button>
      <button
        type="button"
        onClick={() => setShowForm("promo")}
        className={cx(
          "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          showForm === "promo"
            ? "bg-utility-brand-600 text-white"
            : "bg-secondary text-tertiary hover:text-primary",
        )}
      >
        Promo Rate
      </button>
    </div>
    {showForm === "installment" && (
      <InstallmentPlanForm creditCardId={creditCardId} onClose={() => setShowForm(null)} />
    )}
    {showForm === "promo" && (
      <PromoRateForm creditCardId={creditCardId} onClose={() => setShowForm(null)} />
    )}
  </div>
)}
```

**Step 3: Run typecheck**

Run: `bun typecheck`
Expected: No new errors.

**Step 4: Manual test**

Run: `bun dev:app`
- Navigate to a card's details tab
- Click "+" → see toggle (Installment Plan | Promo Rate)
- Switch between forms
- Fill and save an installment plan → see it appear in the list
- Verify ISB updates reactively

**Step 5: Commit**

```
feat(credit-cards): enable plan/promo entry in PromoTracker
```

---

## Task 6: PromoTracker — Add edit/delete affordances

**Files:**
- Modify: `apps/app/src/components/credit-cards/details/PromoTracker.tsx`

**Step 1: Add state for editing and deleting**

```tsx
const removePlan = useMutation(api.installmentPlans.mutations.remove);
const removePromo = useMutation(api.promoRates.mutations.remove);

const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
```

**Step 2: Add edit/delete buttons to promo rows**

In the promo card JSX (inside the `promos?.map(...)` block), after the existing content inside the `<div className="p-4">` wrapper, add:

```tsx
<div className="mt-2 flex gap-2">
  <button type="button" onClick={() => setEditingPromoId(promo._id)} className="text-xs text-tertiary hover:text-primary">Edit</button>
  {confirmDeleteId === promo._id ? (
    <span className="flex items-center gap-1 text-xs">
      <span className="text-utility-error-700">Remove?</span>
      <button type="button" onClick={async () => { await removePromo({ promoRateId: promo._id }); setConfirmDeleteId(null); }} className="text-utility-error-700 underline">Yes</button>
      <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-tertiary underline">No</button>
    </span>
  ) : (
    <button type="button" onClick={() => setConfirmDeleteId(promo._id)} className="text-xs text-tertiary hover:text-utility-error-700">Remove</button>
  )}
</div>
```

When `editingPromoId` matches the current promo, render the form instead of the card:

```tsx
{editingPromoId === promo._id ? (
  <PromoRateForm
    creditCardId={creditCardId}
    onClose={() => setEditingPromoId(null)}
    editingPromo={promo}
  />
) : (
  // existing promo card JSX
)}
```

**Step 3: Add edit/delete buttons to installment plan rows**

Similarly, in the installment plan rows (inside `installments?.map(...)`), add edit/delete buttons and the editing conditional:

```tsx
{editingPlanId === plan._id ? (
  <InstallmentPlanForm
    creditCardId={creditCardId}
    onClose={() => setEditingPlanId(null)}
    editingPlan={plan}
  />
) : (
  <div className="px-4 py-3">
    {/* existing plan row JSX */}
    <div className="mt-2 flex gap-2">
      <button type="button" onClick={() => setEditingPlanId(plan._id)} className="text-xs text-tertiary hover:text-primary">Edit</button>
      {confirmDeleteId === plan._id ? (
        <span className="flex items-center gap-1 text-xs">
          <span className="text-utility-error-700">Remove?</span>
          <button type="button" onClick={async () => { await removePlan({ planId: plan._id }); setConfirmDeleteId(null); }} className="text-utility-error-700 underline">Yes</button>
          <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-tertiary underline">No</button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirmDeleteId(plan._id)} className="text-xs text-tertiary hover:text-utility-error-700">Remove</button>
      )}
    </div>
  </div>
)}
```

**Step 4: Run typecheck**

Run: `bun typecheck`
Expected: No new errors.

**Step 5: Manual test**

Run: `bun dev:app`
- Add a plan → see it in list
- Click Edit → form appears with pre-filled values
- Update remaining balance → save → updated in list
- Click Remove → see confirmation → confirm → plan disappears
- Verify ISB updates after each operation

**Step 6: Commit**

```
feat(credit-cards): add edit/delete for plans and promo rates
```

---

## Task 7: Final verification and cleanup

**Step 1: Full typecheck**

Run: `bun typecheck`
Expected: No new errors from this feature.

**Step 2: End-to-end manual test**

1. Navigate to Chase card → ISB shows `—` with prompt (POT enabled, no plans)
2. Add an installment plan (e.g. $4,011.63 remaining, $100/mo)
3. ISB updates reactively → should now show ~$426.90 (or close, depending on monthly payment math)
4. Edit the plan → update remaining balance → ISB updates
5. Remove the plan → ISB goes back to `—` with prompt
6. Navigate to Wells Fargo card (no POT) → ISB shows current balance (correct)
7. Navigate to a card with $0 balance → ISB shows $0.00

**Step 3: Push branch**

```bash
git push -u origin isb-fix-and-plan-entry
```

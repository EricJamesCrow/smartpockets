# React Compiler: Enable & Optimize — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable the React Compiler globally and optimize the codebase for full compiler coverage.

**Architecture:** Fix 5 files with compiler-incompatible patterns (ref mutations, raw DOM manipulation, array mutation), enable the compiler in next.config.mjs, then clean up unnecessary manual memoization across ~19 files.

**Tech Stack:** React 19.1.1, Next.js 16.1.1, Convex, UntitledUI

---

### Task 1: Fix array mutation in RecentTransactions

The simplest fix — warm up with this one.

**Files:**
- Modify: `apps/app/src/app/(app)/dashboard/components/RecentTransactions.tsx:18-51`

**Step 1: Replace mutable `.push()` with immutable spread**

In `groupByDate()`, change the mutation pattern:

```tsx
// BEFORE (lines 42-46):
const group = groups.get(label);
if (group) {
  group.push(tx);
} else {
  groups.set(label, [tx]);
}

// AFTER:
const group = groups.get(label);
groups.set(label, group ? [...group, tx] : [tx]);
```

**Step 2: Verify typecheck passes**

Run: `bun typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/app/src/app/\(app\)/dashboard/components/RecentTransactions.tsx
git commit -m "refactor(dashboard): use immutable array in groupByDate for React Compiler"
```

---

### Task 2: Fix appearance-provider ref-as-state

**Files:**
- Modify: `apps/app/src/providers/appearance-provider.tsx`

**Step 1: Replace `hasAppliedInitialTheme` ref with state**

The ref tracks whether the initial theme has been applied. Replace it with a `useState` boolean:

```tsx
// BEFORE (lines 3, 26, 35-38):
import { createContext, useContext, useEffect, useRef } from "react";
// ...
const hasAppliedInitialTheme = useRef(false);
// ...
if (appearance?.theme && !hasAppliedInitialTheme.current) {
  setTheme(appearance.theme);
  hasAppliedInitialTheme.current = true;
}

// AFTER:
import { createContext, useContext, useEffect, useState } from "react";
// ...
const [hasAppliedInitialTheme, setHasAppliedInitialTheme] = useState(false);
// ...
if (appearance?.theme && !hasAppliedInitialTheme) {
  setTheme(appearance.theme);
  setHasAppliedInitialTheme(true);
}
```

Remove `useRef` from the import (keep `useEffect`).

**Step 2: Verify typecheck passes**

Run: `bun typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/app/src/providers/appearance-provider.tsx
git commit -m "refactor(appearance): replace ref-as-state with useState for React Compiler"
```

---

### Task 3: Fix debounce ref in TransactionDetailFields

**Files:**
- Modify: `apps/app/src/components/transactions/TransactionDetailFields.tsx`

**Step 1: Replace debounce ref with useEffect cleanup**

Remove `debounceRef` and use a proper effect-based debounce for notes:

```tsx
// REMOVE these (line 3 — remove useRef import, line 59):
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// REPLACE handleNotesChange (lines 97-106) with a simple state setter:
const handleNotesChange = useCallback(
  (value: string) => {
    setNotes(value);
  },
  []
);

// REPLACE handleNotesBlur (lines 108-118) — remove debounce cleanup logic:
const handleNotesBlur = useCallback(() => {
  if (notes === undefined && overlay === undefined) return;
  const value = notes ?? overlay?.notes ?? "";
  void upsertField("notes", value || null);
}, [notes, overlay, upsertField]);

// ADD a new useEffect for debounced auto-save after the handlers:
useEffect(() => {
  if (notes === undefined) return;
  const timer = setTimeout(() => {
    void upsertField("notes", notes || null);
  }, 500);
  return () => clearTimeout(timer);
}, [notes, upsertField]);
```

Update the import line to add `useEffect` and remove `useRef`:

```tsx
import { useState, useCallback, useEffect } from "react";
```

**Step 2: Verify typecheck passes**

Run: `bun typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/app/src/components/transactions/TransactionDetailFields.tsx
git commit -m "refactor(transactions): replace debounce ref with useEffect for React Compiler"
```

---

### Task 4: Replace raw DOM context menu in InlineEditableField

This is the largest fix. The component has two compiler issues: (1) raw DOM context menu, (2) `savingRef`.

**Files:**
- Modify: `apps/app/src/components/credit-cards/details/InlineEditableField.tsx`

**Step 1: Replace `savingRef` with the existing `saving` state**

The component already has `const [saving, setSaving] = useState(false)` on line 33. The `savingRef` duplicates this. Remove the ref and use the state:

```tsx
// REMOVE line 36:
const savingRef = useRef(false);

// In handleSave (lines 87-117), replace savingRef with saving state:
const handleSave = async () => {
  if (saving) return;

  const validated = validate(draft);
  if (validated === null) {
    setError(getValidationMessage(type));
    return;
  }

  // eslint-disable-next-line eqeqeq
  if (validated == value) {
    setIsEditing(false);
    return;
  }

  setSaving(true);
  setError(null);
  try {
    await onSave(validated);
    setIsEditing(false);
  } catch {
    setError("Failed to save. Please try again.");
  } finally {
    setSaving(false);
  }
};

// In the onBlur handler (lines 179-186), replace savingRef.current with saving:
onBlur={() => {
  if (!saving) {
    if (!draft.trim()) {
      handleCancel();
    } else {
      handleSave();
    }
  }
}}
```

Remove `useRef` from the import (keep `useState, useEffect, useCallback`).

**Step 2: Replace raw DOM context menu with React state + portal**

Replace the `handleContextMenu` function (lines 134-168) with a state-driven approach:

```tsx
// ADD new state after existing state declarations (after line 35):
const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

// REPLACE handleContextMenu (lines 134-168):
const handleContextMenu = (e: React.MouseEvent) => {
  if (!isOverridden || !onRevert) return;
  e.preventDefault();
  setContextMenu({ x: e.clientX, y: e.clientY });
};

// ADD a close handler:
const closeContextMenu = useCallback(() => {
  setContextMenu(null);
}, []);

// ADD useEffect for click-away and Escape:
useEffect(() => {
  if (!contextMenu) return;
  const handleClick = () => setContextMenu(null);
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") setContextMenu(null);
  };
  document.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKey);
  return () => {
    document.removeEventListener("click", handleClick);
    document.removeEventListener("keydown", handleKey);
  };
}, [contextMenu]);
```

Add the context menu JSX at the end of the display return (before the closing `</span>` on line 228), using `createPortal`:

```tsx
import { createPortal } from "react-dom";

// Inside the display return, after line 226 (before closing </span>):
{contextMenu &&
  createPortal(
    <div
      className="fixed z-50 rounded-lg border border-secondary bg-primary py-1 text-sm shadow-lg"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      <button
        type="button"
        className="w-full cursor-pointer px-3 py-1.5 text-left text-primary hover:bg-secondary"
        onClick={async () => {
          closeContextMenu();
          await onRevert?.();
        }}
      >
        {plaidValue != null && plaidValue !== "" ? "Revert" : "Clear"}
      </button>
    </div>,
    document.body
  )}
```

Update imports:
```tsx
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
```

**Step 3: Verify typecheck passes**

Run: `bun typecheck`
Expected: No errors

**Step 4: Manual test**

Run: `bun dev:app`
- Navigate to a credit card detail page
- Double-click an editable field → verify editing works
- Right-click an overridden field → verify context menu appears at cursor position
- Click away → context menu dismisses
- Press Escape → context menu dismisses
- Click "Revert" → field reverts

**Step 5: Commit**

```bash
git add apps/app/src/components/credit-cards/details/InlineEditableField.tsx
git commit -m "refactor(inline-edit): replace raw DOM context menu and ref-as-state for React Compiler"
```

---

### Task 5: Replace raw DOM context menu in CreditCardDetailContent (ProviderLink)

**Files:**
- Modify: `apps/app/src/components/credit-cards/CreditCardDetailContent.tsx:340-441`

**Step 1: Replace raw DOM context menu in ProviderLink**

The `ProviderLink` component (lines 340-441) has the same raw DOM pattern. Replace it:

```tsx
import { createPortal } from "react-dom";

function ProviderLink({
  url,
  onSave,
  onClear,
}: {
  url: string;
  onSave: (url: string | number) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [contextMenu]);

  if (editing) {
    return (
      <InlineEditableField
        value={url}
        plaidValue={undefined}
        isOverridden={true}
        type="url"
        onSave={async (v) => {
          await onSave(v);
          setEditing(false);
        }}
        onRevert={async () => {
          await onClear();
          setEditing(false);
        }}
      />
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1"
      onDoubleClick={() => setEditing(true)}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-utility-brand-600 hover:text-utility-brand-700 hover:underline"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-3 w-3"
        >
          <path
            fillRule="evenodd"
            d="M4.22 11.78a.75.75 0 0 1 0-1.06L9.44 5.5H5.75a.75.75 0 0 1 0-1.5h5.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0V6.56l-5.22 5.22a.75.75 0 0 1-1.06 0Z"
            clipRule="evenodd"
          />
        </svg>
        Provider Dashboard
      </a>
      {contextMenu &&
        createPortal(
          <div
            className="fixed z-50 rounded-lg border border-secondary bg-primary py-1 text-sm shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              className="w-full cursor-pointer px-3 py-1.5 text-left text-primary hover:bg-secondary"
              onClick={() => {
                setContextMenu(null);
                setEditing(true);
              }}
            >
              Edit link
            </button>
            <button
              type="button"
              className="w-full cursor-pointer px-3 py-1.5 text-left text-utility-error-700 hover:bg-secondary"
              onClick={async () => {
                setContextMenu(null);
                await onClear();
              }}
            >
              Remove link
            </button>
          </div>,
          document.body
        )}
    </span>
  );
}
```

Add `useEffect` to the main component imports if not already there, and `createPortal` from `react-dom`.

**Step 2: Verify typecheck passes**

Run: `bun typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/app/src/components/credit-cards/CreditCardDetailContent.tsx
git commit -m "refactor(provider-link): replace raw DOM context menu with React portal for React Compiler"
```

---

### Task 6: Enable React Compiler

**Files:**
- Modify: `apps/app/next.config.mjs`

**Step 1: Add `reactCompiler: true`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        reactCompiler: true,
        optimizePackageImports: ["@untitledui/icons"],
    },
    transpilePackages: ["@repo/ui", "@repo/backend", "@repo/email"],
};

export default nextConfig;
```

**Step 2: Verify build succeeds**

Run: `bun build`
Expected: Successful build with no compiler errors. Check output for any "React Compiler skipped" warnings.

**Step 3: Verify typecheck**

Run: `bun typecheck`
Expected: No errors

**Step 4: Smoke test**

Run: `bun dev:app`
Test these flows:
- Dashboard loads correctly (RecentTransactions renders grouped data)
- Credit cards grid loads, clicking a card opens detail
- Card detail tabs work (Overview, Details, Transactions, Subscriptions)
- InlineEditableField: double-click to edit, Enter to save, Escape to cancel
- Right-click context menu on overridden fields works
- Provider link context menu works (edit, remove)
- Transaction detail panel opens, notes autosave, category changes
- Wallet drag-and-drop works
- Settings > Appearance theme switch works
- Plaid Link flow (if testable in dev)

**Step 5: Commit**

```bash
git add apps/app/next.config.mjs
git commit -m "feat(compiler): enable React Compiler globally"
```

---

### Task 7: Clean up unnecessary memoization — hooks

Remove `useCallback` from custom hooks where the compiler now handles memoization.

**Files:**
- Modify: `apps/app/src/hooks/useToggleCardLocked.ts` — remove `useCallback` from `lock`, `unlock`, `toggle` (3 calls)
- Modify: `apps/app/src/hooks/useTransactionOverlay.ts` — remove `useCallback` from `upsertField`, `toggleReviewed`, `toggleHidden` (3 calls)
- Modify: `apps/app/src/hooks/useExtendedView.tsx` — remove `useCallback` from `toggleExtended`, `setExtended` (2 calls)
- Modify: `apps/app/src/features/institutions/hooks/useTogglePlaidItem.ts` — remove `useCallback` from `toggle` (1 call)
- Modify: `apps/app/src/features/institutions/hooks/useDisconnectPlaidItem.ts` — remove `useCallback` from `disconnect` (1 call)

**Step 1: For each file, unwrap `useCallback`**

Pattern for each:
```tsx
// BEFORE:
const toggle = useCallback(async (...) => {
  // body
}, [deps]);

// AFTER:
const toggle = async (...) => {
  // body
};
```

Remove `useCallback` from imports where it's no longer used.

**Step 2: Verify typecheck passes**

Run: `bun typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/app/src/hooks/useToggleCardLocked.ts apps/app/src/hooks/useTransactionOverlay.ts apps/app/src/hooks/useExtendedView.tsx apps/app/src/features/institutions/hooks/useTogglePlaidItem.ts apps/app/src/features/institutions/hooks/useDisconnectPlaidItem.ts
git commit -m "refactor(hooks): remove manual useCallback now handled by React Compiler"
```

---

### Task 8: Clean up unnecessary memoization — components

Remove `useCallback` and simple `useMemo` from components where the compiler handles it.

**Files:**
- Modify: `apps/app/src/components/credit-cards/TransactionsSection.tsx` — remove `useCallback` from `handleFiltersChange`, `handleSortChange`, `handleExport`, `handleSelectTransaction` (4 calls)
- Modify: `apps/app/src/components/credit-cards/CreditCardsContent.tsx` — remove `useCallback` from `handleClearWallet`, `handleOpenAddCards`, `handlePlaidLinkSuccess` (3 calls); remove `useMemo` from `creditCardProducts`, `creditCardAccountFilters` (2 calls — these are constant arrays that never change)
- Modify: `apps/app/src/components/wallets/WalletsContent.tsx` — remove `useCallback` from `handleDragEnd` (1 call)
- Modify: `apps/app/src/components/wallets/PinnedWalletsSidebar.tsx` — remove `useCallback` from `handleDragEnd` (1 call)
- Modify: `apps/app/src/components/transactions/TransactionDetailFields.tsx` — remove remaining `useCallback` wrappers from `handleCopy`, `handleCategoryChange`, `handleDateChange`, `handleDateApply`, `handleDateCancel`, `handleNotesBlur` (6 calls, noting `handleNotesChange` was already simplified in Task 3)
- Modify: `apps/app/src/components/credit-cards/details/InlineEditableField.tsx` — remove `useCallback` from `startEditing`, `closeContextMenu` (2 calls)
- Modify: `apps/app/src/components/credit-cards/KeyMetrics.tsx` — remove `useMemo` from `pendingTotal`, `pendingCount` (2 calls — trivial computations)
- Modify: `apps/app/src/app/(app)/settings/password/page.tsx` — remove `useCallback` from `fetchSessions` (1 call)

**Step 1: For each file, unwrap `useCallback`/`useMemo`**

Same pattern as Task 7. For `useMemo`:
```tsx
// BEFORE:
const creditCardProducts = useMemo(() => ["transactions", "liabilities"], []);

// AFTER:
const creditCardProducts = ["transactions", "liabilities"];
```

Remove unused imports from each file.

**Step 2: Verify typecheck passes**

Run: `bun typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/app/src/components/credit-cards/TransactionsSection.tsx apps/app/src/components/credit-cards/CreditCardsContent.tsx apps/app/src/components/wallets/WalletsContent.tsx apps/app/src/components/wallets/PinnedWalletsSidebar.tsx apps/app/src/components/transactions/TransactionDetailFields.tsx apps/app/src/components/credit-cards/details/InlineEditableField.tsx apps/app/src/components/credit-cards/KeyMetrics.tsx apps/app/src/app/\(app\)/settings/password/page.tsx
git commit -m "refactor(components): remove manual useCallback/useMemo now handled by React Compiler"
```

---

### Task 9: Keep and verify remaining memoization

These `useMemo` calls should be **kept** because they do genuine expensive computation or are in context providers. Verify each still works correctly.

**Files to verify (no changes, just smoke test):**
- `apps/app/src/lib/context/shared-layout-animation-context.tsx` — context provider `useMemo` for value stability (keeps context consumers from re-rendering)
- `apps/app/src/hooks/useCardFiltering.ts` — filters/sorts full card array
- `apps/app/src/components/credit-cards/TransactionsSection.tsx` — `allTransactions`, `filteredTransactions`, `sortedTransactions`, `paginatedTransactions` (chain of array transformations on potentially large datasets)
- `apps/app/src/components/transactions/TransactionsContent.tsx` — `cardOptions` useMemo
- `apps/app/src/components/credit-cards/CreditCardDetailContent.tsx` — `card` useMemo (data transformation)
- `apps/app/src/app/(app)/settings/billing/billing-content.tsx` — `planItems` useMemo
- `apps/app/src/features/institutions/components/plaid-link-button.tsx` — `onSuccess` useCallback (passed to Plaid Link external API)

**Step 1: Smoke test**

Run: `bun dev:app`
Verify card grid, transaction table, wallet filtering, billing page, and Plaid Link all work correctly.

**Step 2: Commit (no changes, verification only)**

No commit needed — this is a verification-only task.

---

### Task 10: Final verification and cleanup

**Step 1: Run full typecheck**

Run: `bun typecheck`
Expected: No errors

**Step 2: Run full build**

Run: `bun build`
Expected: Successful build

**Step 3: Full smoke test**

Run through all major flows one more time:
- Dashboard (all widgets)
- Credit cards grid → card detail → all tabs
- Inline editing → context menus
- Transaction detail panel → notes, category, date
- Wallets → drag-and-drop reorder
- Settings → appearance (theme toggle)
- Plaid Link (if available)

**Step 4: Verify no regressions in dnd-kit, tiptap, motion, recharts**

These libraries were flagged as potential risks. Verify:
- dnd-kit: drag wallets in sidebar, reorder cards
- motion: page transitions, card shared layout animation
- recharts: any charts on dashboard (SpendingBreakdown)

**Step 5: Commit any final fixes if needed**

---

## Summary

| Task | Files | Change |
|------|-------|--------|
| 1 | RecentTransactions.tsx | Immutable array |
| 2 | appearance-provider.tsx | Ref → useState |
| 3 | TransactionDetailFields.tsx | Debounce ref → useEffect |
| 4 | InlineEditableField.tsx | DOM context menu → portal, savingRef → state |
| 5 | CreditCardDetailContent.tsx | DOM context menu → portal |
| 6 | next.config.mjs | Enable compiler |
| 7 | 5 hook files | Remove useCallback |
| 8 | 8 component files | Remove useCallback/useMemo |
| 9 | 7 files | Verify kept memoization |
| 10 | — | Final verification |

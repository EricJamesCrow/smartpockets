# React Compiler: Enable & Optimize

**Date:** 2026-03-04
**Status:** Approved
**Goal:** Enable the React Compiler for automatic memoization and performance gains, simplify code by removing manual memoization boilerplate.

## Current State

- React 19.1.1, Next.js 16.1.1 — fully compatible
- 100 client components (`"use client"`)
- 65 useMemo/useCallback/React.memo usages across 19 files
- 34 useEffect calls across 16 files
- No class components, no conditional hooks, no broken effect deps
- 5 files have patterns incompatible with the React Compiler

## Approach: Fix-First, Then Enable

Fix all incompatible patterns before enabling the compiler globally, then clean up unnecessary manual memoization.

## Phase 1: Fix Incompatible Patterns (5 files)

### 1a. Replace raw DOM context menus with React components

**Files:**
- `apps/app/src/components/credit-cards/details/InlineEditableField.tsx`
- `apps/app/src/components/credit-cards/CreditCardDetailContent.tsx`

**Problem:** Both files create floating context menus using `document.createElement()`, appending to `document.body`, and managing cleanup via global event listeners. The React Compiler cannot optimize components with direct DOM manipulation mixed into React state.

**Fix:** Replace with a shared React component using UntitledUI's DropdownMenu or a portal + state pattern:
- `const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null)`
- `onContextMenu` sets position, click-away or Escape closes it
- Render via React Portal at the menu position

### 1b. Replace ref-as-state patterns

**Files:**
- `apps/app/src/components/credit-cards/details/InlineEditableField.tsx` — `savingRef` used as boolean flag
- `apps/app/src/providers/appearance-provider.tsx` — `hasAppliedInitialTheme` ref

**Problem:** Using `useRef` to track boolean state that influences behavior. The compiler expects refs to not be read during render.

**Fix:**
- `savingRef` → convert to `useState<boolean>` since it controls UI behavior (disabling save while in-flight)
- `hasAppliedInitialTheme` → restructure the effect to use conditional logic based on current state rather than a tracking ref

### 1c. Fix debounce ref pattern

**File:** `apps/app/src/components/transactions/TransactionDetailFields.tsx`

**Problem:** Manual `setTimeout`/`clearTimeout` stored in a ref, mutated during event handlers.

**Fix:** Replace with an effect-based cleanup pattern where the effect's cleanup function clears the timeout, or extract a `useDebouncedCallback` utility.

### 1d. Fix array mutation in render helper

**File:** `apps/app/src/app/(app)/dashboard/components/RecentTransactions.tsx`

**Problem:** `groupByDate()` helper called during render mutates arrays with `.push()`. The compiler may inline this and detect mutation during the render phase.

**Fix:** Use immutable pattern — `Map.set(label, [...existing, tx])` instead of `group.push(tx)`.

## Phase 2: Enable React Compiler

### Configuration

Add `reactCompiler: true` to `next.config.mjs`:

```js
const nextConfig = {
    experimental: {
        reactCompiler: true,
        optimizePackageImports: ["@untitledui/icons"],
    },
    transpilePackages: ["@repo/ui", "@repo/backend", "@repo/email"],
};
```

Next.js 16 bundles the compiler plugin — no additional package install needed.

### What the compiler does

- Automatically memoizes component return values (like `React.memo`)
- Automatically memoizes expensive expressions (like `useMemo`)
- Automatically memoizes callback functions (like `useCallback`)
- Skips re-creating unchanged JSX subtrees
- Silently skips components that violate Rules of React (no breakage, just no optimization)

### Verification

- `bun build` — no compiler errors
- Check build output for compiler bailout warnings
- Manual smoke test: dashboard, card detail, transaction table, drag-and-drop wallets, Plaid Link flow

### Third-Party Library Risk

| Library | Risk | Action |
|---------|------|--------|
| `@dnd-kit/*` | HIGH | Test drag-drop wallets thoroughly |
| `@tiptap/*` | HIGH | Test rich text editing |
| `motion` | MEDIUM | Test page transition animations |
| `recharts` | MEDIUM | Test chart rendering |
| `react-plaid-link` | MEDIUM | Test Plaid Link modal flow |
| Clerk, Convex | LOW | General integration testing |

If a library causes issues, exclude it using the compiler's `sources` option to only compile app code.

## Phase 3: Clean Up Manual Memoization

### Safe to remove (~25-30 calls)

- `useCallback` wrapping simple event handlers
- `useMemo` for non-expensive computations (simple object construction, string formatting)
- `useCallback` with empty or simple dependency arrays

### Keep (~35 calls)

- `useMemo` for genuinely expensive computations (sorting/filtering large transaction lists)
- `useCallback` passed to non-React APIs (dnd-kit sensors, Plaid Link callbacks)
- Any memoization inside `packages/ui`

### Approach

- Remove in small batches per file
- Verify each with `bun typecheck`
- Only touch `apps/app`, not `packages/ui`
- Do not add `eslint-plugin-react-compiler` at this time

## Files Requiring Changes

| File | Phase | Change |
|------|-------|--------|
| `apps/app/src/components/credit-cards/details/InlineEditableField.tsx` | 1 | Replace DOM context menu + ref-as-state |
| `apps/app/src/components/credit-cards/CreditCardDetailContent.tsx` | 1 | Replace DOM context menu |
| `apps/app/src/components/transactions/TransactionDetailFields.tsx` | 1 | Replace debounce ref pattern |
| `apps/app/src/providers/appearance-provider.tsx` | 1 | Remove ref tracking flag |
| `apps/app/src/app/(app)/dashboard/components/RecentTransactions.tsx` | 1 | Immutable array operations |
| `apps/app/next.config.mjs` | 2 | Add `reactCompiler: true` |
| ~19 files with useMemo/useCallback | 3 | Remove unnecessary memoization |

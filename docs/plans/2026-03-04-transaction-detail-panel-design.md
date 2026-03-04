# TransactionDetailPanel — Monarch Money Parity (Core Editing)

**Date:** 2026-03-04
**Status:** Approved

## Objective

Upgrade the existing read-only transaction detail drawers into a single, unified, interactive TransactionDetailPanel with editable fields, review/hide toggles, and normalized amount display. This is the highest-leverage transaction feature — it touches categories, notes, review status, hide/show, and amount normalization in one component.

## Context

### Current State

- Two separate `TransactionDetailDrawer` components exist:
  - `components/credit-cards/TransactionDetailDrawer.tsx` (card detail page)
  - `components/transactions/TransactionDetailDrawer.tsx` (unified transactions page)
- Both are read-only — no fields are editable
- Amount display is inconsistent: some expenses show `-$207.94`, others show `$9.99`
- Transactions come from Plaid's component, not stored as Convex documents
- No existing infrastructure for user-editable transaction metadata

### Target State

A single `TransactionDetailPanel` used everywhere, with editable fields that persist via a Convex overlay table. Matches Monarch Money's panel layout and interaction patterns.

## Reference Prompts

This design synthesizes two implementation prompts provided by the user:

- **Document 1** (primary): Reflects actual codebase structure, file paths, naming conventions, and scope decisions
- **Document 2** (supplementary): Better data modeling decisions — specifically junction tables for future tags/attachments, `reviewedAt`/`reviewedBy` audit fields, and the rule that only manual transactions can be deleted while synced Plaid transactions can only be hidden

Where they conflict, Document 1's conventions win. Adopted from Document 2: audit fields on review toggle, delete-vs-hide distinction for synced transactions.

## Architecture Decision: Transaction Overlays

Transactions live in Plaid's component and are not Convex documents. To persist user edits without migrating all transaction data into Convex, we use an **overlay pattern**:

- A `transactionOverlays` table stores user edits keyed by Plaid's `transactionId`
- Overlays are created on first edit (no upfront migration)
- At read time, Plaid data is merged with the overlay: `overlay.userCategory ?? plaidTransaction.categoryPrimary`

This avoids sync complexity and ships fast. Future features (manual transactions, splits) may warrant a full Convex transactions table — that's a separate migration.

## Data Layer

### New Table: `transactionOverlays`

```typescript
transactionOverlays: defineTable({
  userId: v.id("users"),
  plaidTransactionId: v.string(),
  isReviewed: v.optional(v.boolean()),
  reviewedAt: v.optional(v.number()),       // timestamp, from Doc 2
  isHidden: v.optional(v.boolean()),
  notes: v.optional(v.string()),
  userCategory: v.optional(v.string()),
  userDate: v.optional(v.string()),
  userMerchantName: v.optional(v.string()),
})
.index("by_plaidTransactionId", ["plaidTransactionId"])
.index("by_userId", ["userId"])
```

### Convex Functions

```
convex/transactionOverlays/
├── queries.ts    — getByTransactionId, getByTransactionIds (batch)
├── mutations.ts  — upsertField, toggleReviewed, toggleHidden
```

**Mutation pattern:** `upsertField` gets or creates the overlay document, then patches the specified field. Uses `ctx.viewerX()` for auth, validates ownership.

**`toggleReviewed`** sets `isReviewed` and `reviewedAt` (timestamp) atomically.

## Amount Display Normalization

Replace the current `formatTransactionAmount` in `utils/transaction-helpers.ts`:

| Plaid Amount | Meaning | Display | Color |
|-------------|---------|---------|-------|
| Positive | Money out (expense) | `$207.94` (no sign) | Default text |
| Negative | Money in (income/refund) | `+$500.00` | Green (`text-success-600`) |

**Rule: Never show a negative sign to the user.**

Apply everywhere: detail panel, transaction table rows (both pages), any summary views.

## Component Architecture

### Single Unified Panel

One `TransactionDetailPanel` replaces both existing drawers. Uses UntitledUI `SlideoutMenu`.

### Panel Layout (Top to Bottom)

**Header bar:**
- Left: "Mark as reviewed" toggle (checkmark icon + text)
- Left: Hide/show toggle (eye icon)
- Right: Close button (X)

**Merchant section:**
- Merchant logo (circular — Plaid enrichment logo URL or initials fallback)
- Merchant name (bold, large text)
- Amount (large, normalized formatting)
- Account badge (card name + last 4 digits)

**Original statement:**
- Read-only raw Plaid description
- Copy-to-clipboard button

**Editable fields:**

| Field | Component | Save Behavior |
|-------|-----------|---------------|
| Date | Date picker | On selection |
| Category | Select dropdown (15 categories) | On selection |
| Notes | Textarea | On blur / 500ms debounce |

**Deferred fields (visible, disabled, "Coming soon" tooltip):**
- Split button (adjacent to category)
- Tags multi-select
- Attachments upload
- Contribute to goal dropdown
- Needs review by dropdown

**Footer:**
- "OTHER OPTIONS" divider
- "Delete transaction" button — for Plaid-synced transactions, this **hides** the transaction (with confirmation dialog explaining it can't be truly deleted). Only manual transactions (future feature) can be deleted.

### File Structure

```
components/transactions/
├── TransactionDetailPanel.tsx          ← Main panel
├── TransactionDetailHeader.tsx         ← Review + hide + close
├── TransactionDetailMerchant.tsx       ← Logo, name, amount, account
├── TransactionDetailFields.tsx         ← Date, category, notes
├── TransactionDetailActions.tsx        ← Delete/hide section
```

```
hooks/
├── useTransactionOverlay.ts            ← Fetch overlay, merge with Plaid data
├── useUpsertTransactionOverlay.ts      ← Mutation hook for field updates
```

### Props Interface

```typescript
interface TransactionDetailPanelProps {
  transaction: PlaidTransaction | null;  // null = closed
  onClose: () => void;
}
```

## Integration

### Wiring to Existing Pages

- `/transactions` page: Replace `TransactionDetailDrawer` import
- Credit card detail page: Replace its `TransactionDetailDrawer` import
- Both pass the selected transaction + onClose callback

### Transaction List Row Updates

- Amount normalization applied to all rows
- Reviewed indicator: subtle checkmark on reviewed transactions
- Hidden transactions: reduced opacity + "Hidden" badge (visible only with "Show hidden" filter active)
- New "Show hidden" toggle in filter bars on both pages

### What Stays the Same

- Existing filter logic (search, category, status, date range)
- Pagination
- Transaction queries from Plaid
- Table row components (minor updates for indicators)

## Scope

### In Scope (Fully Functional)

- Reviewed toggle with `reviewedAt` audit field
- Hidden toggle
- Notes (auto-save on blur)
- Category override (dropdown)
- Date override (date picker)
- Amount display normalization (everywhere)
- Original statement with copy button
- Consolidated single panel component
- "Show hidden" filter toggle
- Row indicators (reviewed, hidden)

### Deferred (Disabled UI with "Coming soon")

- Tags
- Attachments
- Transaction splits
- Contribute to goal
- Needs review by (requires household/team)
- Editable merchant name
- Three-dot overflow menu
- "View N transactions" merchant history link

### Out of Scope (No UI)

- Rules engine / auto-categorization
- Recurring transaction detection
- ML categorization
- Merchant merging
- Receipt scanning / OCR
- Transfer-pair matching
- Budget integration
- Bulk operations

## Technical Constraints

- React 19 — no `import React`
- `"use client"` on all interactive components
- UntitledUI components — never duplicate
- `cx()` for class merging
- Convex auth: `ctx.viewerX()`, never accept userId as arg
- Amounts stored as milliunits (÷ 1000 for dollars)
- Tailwind CSS v4
- No Next.js API routes

## Acceptance Criteria

- [ ] Single `TransactionDetailPanel` used on all transaction surfaces
- [ ] All editable fields (date, category, notes) save on blur/selection via overlays
- [ ] "Mark as reviewed" toggles correctly with `reviewedAt` timestamp
- [ ] "Hide transaction" toggles correctly, hidden transactions dimmed in list
- [ ] Amount display normalized everywhere: no negatives, green `+` for income
- [ ] Original statement displays with copy-to-clipboard
- [ ] Deferred features show disabled UI with "Coming soon"
- [ ] "Delete" on Plaid transactions hides with explanation dialog
- [ ] Panel slides in/out with animation
- [ ] Escape key closes the panel
- [ ] No TypeScript errors
- [ ] No regressions in existing transaction list functionality

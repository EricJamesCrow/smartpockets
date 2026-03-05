# Transaction Detail Panel Enhancements Design

Date: 2026-03-04

## Problem

The transaction detail panel is missing several Plaid PFC categories from the category select menu, lacks time display, has placeholder sections that need to be either implemented (attachments) or removed (tags), and needs transaction deletion support.

## Changes

### 1. Categories — Full Plaid PFC Mapping

Replace the current 11-item dropdown with all 18 Plaid primary PFC categories using friendly display names.

| Plaid Primary | Display Name | Badge Color |
|---------------|-------------|-------------|
| `FOOD_AND_DRINK` | Food & Drink | orange |
| `GENERAL_MERCHANDISE` | Shopping | purple |
| `TRAVEL` | Travel | blue |
| `TRANSPORTATION` | Transportation | indigo |
| `ENTERTAINMENT` | Entertainment | pink |
| `RECREATION` | Recreation | pink |
| `RENT_AND_UTILITIES` | Rent & Utilities | warning |
| `MEDICAL` | Healthcare | error |
| `PERSONAL_CARE` | Personal Care | orange |
| `HOME_IMPROVEMENT` | Home Improvement | warning |
| `GENERAL_SERVICES` | General Services | gray |
| `GOVERNMENT_AND_NON_PROFIT` | Government & Nonprofit | gray |
| `TRANSFER_IN` | Transfer In | blue |
| `TRANSFER_OUT` | Transfer Out | gray |
| `LOAN_PAYMENTS` | Loan Payments | success |
| `BANK_FEES` | Bank Fees | error |
| `INCOME` | Income | success |
| *(unmapped)* | Other | gray |

Changes:
- Replace `TransactionCategory` type and `TRANSACTION_CATEGORIES` array with the full 18-item list
- Update `mapPlaidCategory()` to 1:1 mapping (no more collapsing multiple PFCs into one category)
- Update `getCategoryColor()` and `getCategoryBadgeColor()` for all new categories
- Select dropdown shows all options alphabetically

Files: `apps/app/src/types/credit-cards.ts`

### 2. Time Field

Display the time extracted from Plaid's `datetime` field, inline next to the Date field.

Layout: Date on the left (existing DatePicker), Time on the right on the same row. Time only renders when `datetime` is available from Plaid. Displayed as `h:mm AM/PM` format. Double-click to edit (InlineEditableField pattern).

Schema change — add to `transactionOverlays`:
```ts
userTime: v.optional(v.string()),  // "HH:mm" 24hr stored, displayed as 12hr
```

Add `"userTime"` to the `upsertField` mutation's accepted fields.

Edge cases:
- No `datetime` from Plaid: Time field doesn't render
- User edits time: stored as override, Plaid syncs don't overwrite
- User clears time: revert to Plaid's original datetime

Files: `packages/backend/convex/schema.ts`, `packages/backend/convex/transactionOverlays/mutations.ts`, `apps/app/src/components/transactions/TransactionDetailFields.tsx`

### 3. Source Card Section

Dedicated section below Notes (moved out of merchant header badge). Shows card brand/icon, display name, last four digits, and a "View card" link to `/credit-cards/[cardId]`. Only renders when `sourceInfo` is present on the transaction.

Files: `apps/app/src/components/transactions/TransactionDetailFields.tsx` or new `TransactionDetailSourceCard.tsx`

### 4. Tags Removal

Delete the disabled Tags placeholder section (lines 196-217 in TransactionDetailFields.tsx). Remove unused imports (`Tag01`, `TagGroup`, `TagList`, `Tag`).

Files: `apps/app/src/components/transactions/TransactionDetailFields.tsx`

### 5. Attachments

New `transactionAttachments` table:
```ts
transactionAttachments: defineEnt({
  plaidTransactionId: v.string(),
  storageId: v.string(),
  fileName: v.string(),
  mimeType: v.string(),
  fileSize: v.number(),
})
  .edge("user")
  .index("by_transaction", ["plaidTransactionId"])
  .index("by_user_and_transaction", ["userId", "plaidTransactionId"])
```

Backend functions:
- `generateUploadUrl` — mutation returning a Convex upload URL
- `createAttachment` — mutation saving metadata after upload
- `deleteAttachment` — mutation removing attachment + file from storage
- `getByTransactionId` — query fetching attachments for a transaction

Upload flow:
1. User clicks "Add attachment" or drags file onto drop zone
2. Frontend calls `generateUploadUrl`
3. Frontend uploads file directly to Convex storage
4. On success, calls `createAttachment` with `storageId` + metadata
5. Attachment appears reactively

UI: Replace disabled FileUpload placeholder with functional UntitledUI FileUpload. Accepted: `image/*`, `.pdf` — max 5MB. Show attachment list with thumbnails (images) or PDF icon, file name + size, click to preview, delete button.

Validation: Frontend file type + size check. Backend ownership verification via `ctx.viewerX()`, mimeType allowlist.

Files: `packages/backend/convex/schema.ts`, new `packages/backend/convex/transactionAttachments/` directory, `apps/app/src/components/transactions/TransactionDetailFields.tsx`

### 6. Transaction Deletion (Soft Hide with Undo)

Uses existing `isHidden` flag on `transactionOverlays`. No schema changes needed.

Flow:
1. User clicks "Hide transaction" button
2. Panel closes immediately
3. UntitledUI Toast appears: "Transaction hidden" with Undo action
4. 5-second undo window
5. Undo calls `toggleHidden(false)`, transaction reappears
6. Timer expires: toast dismisses, transaction stays hidden

UI changes:
- Enable delete button in `TransactionDetailActions`, wire up `toggleHidden(true)` + close panel
- Use UntitledUI Toast component for undo notification
- Button label: "Hide transaction"
- Toast: "Transaction hidden" with Undo action

Files: `apps/app/src/components/transactions/TransactionDetailActions.tsx`, `apps/app/src/components/transactions/TransactionDetailPanel.tsx`

### 7. Panel Section Order

1. Header (reviewed/hidden toggles)
2. Merchant (logo, name, amount)
3. Original Statement
4. Date + Time (inline row)
5. Category (with Split placeholder)
6. Notes
7. Source Card
8. Attachments
9. Other Options (hide transaction)

### 8. Constraints

- All frontend changes must use UntitledUI components
- Use `cx()` for class merging
- Follow existing overlay pattern for editable fields
- Ownership verification on all backend mutations

# Transaction Panel Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the transaction detail panel with full Plaid PFC categories, time field, source card section, attachments, and soft-delete with undo.

**Architecture:** Frontend changes use UntitledUI components throughout. Backend adds `userTime` to transactionOverlays and a new `transactionAttachments` table using Convex file storage. Soft delete leverages the existing `isHidden` overlay flag with a Sonner toast for undo.

**Tech Stack:** Next.js 16, React 19, Convex (Ents), UntitledUI, Sonner (toasts), Convex File Storage

---

### Task 1: Update Transaction Categories — Types & Mapping

**Files:**
- Modify: `apps/app/src/types/credit-cards.ts:450-624`

**Step 1: Replace TransactionCategory type (line 450)**

Replace the existing type and array with all 18 Plaid primary PFCs:

```typescript
export type TransactionCategory =
  | "Bank Fees"
  | "Entertainment"
  | "Food & Drink"
  | "General Merchandise"
  | "General Services"
  | "Government & Nonprofit"
  | "Healthcare"
  | "Home Improvement"
  | "Income"
  | "Loan Payments"
  | "Personal Care"
  | "Recreation"
  | "Rent & Utilities"
  | "Shopping"
  | "Transfer In"
  | "Transfer Out"
  | "Transportation"
  | "Travel"
  | "Other";

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  "Bank Fees",
  "Entertainment",
  "Food & Drink",
  "General Merchandise",
  "General Services",
  "Government & Nonprofit",
  "Healthcare",
  "Home Improvement",
  "Income",
  "Loan Payments",
  "Personal Care",
  "Recreation",
  "Rent & Utilities",
  "Shopping",
  "Transfer In",
  "Transfer Out",
  "Transportation",
  "Travel",
  "Other",
];
```

**Step 2: Update getCategoryColor (line 520)**

```typescript
export function getCategoryColor(category: TransactionCategory): string {
  const colors: Record<TransactionCategory, string> = {
    "Bank Fees": "bg-utility-error-50 text-utility-error-700 ring-utility-error-200",
    Entertainment: "bg-utility-pink-50 text-utility-pink-700 ring-utility-pink-200",
    "Food & Drink": "bg-utility-orange-50 text-utility-orange-700 ring-utility-orange-200",
    "General Merchandise": "bg-utility-purple-50 text-utility-purple-700 ring-utility-purple-200",
    "General Services": "bg-utility-gray-50 text-utility-gray-700 ring-utility-gray-200",
    "Government & Nonprofit": "bg-utility-gray-50 text-utility-gray-700 ring-utility-gray-200",
    Healthcare: "bg-utility-error-50 text-utility-error-700 ring-utility-error-200",
    "Home Improvement": "bg-utility-warning-50 text-utility-warning-700 ring-utility-warning-200",
    Income: "bg-utility-success-50 text-utility-success-700 ring-utility-success-200",
    "Loan Payments": "bg-utility-success-50 text-utility-success-700 ring-utility-success-200",
    "Personal Care": "bg-utility-orange-50 text-utility-orange-700 ring-utility-orange-200",
    Recreation: "bg-utility-pink-50 text-utility-pink-700 ring-utility-pink-200",
    "Rent & Utilities": "bg-utility-warning-50 text-utility-warning-700 ring-utility-warning-200",
    Shopping: "bg-utility-purple-50 text-utility-purple-700 ring-utility-purple-200",
    "Transfer In": "bg-utility-blue-50 text-utility-blue-700 ring-utility-blue-200",
    "Transfer Out": "bg-utility-gray-50 text-utility-gray-700 ring-utility-gray-200",
    Transportation: "bg-utility-indigo-50 text-utility-indigo-700 ring-utility-indigo-200",
    Travel: "bg-utility-blue-light-50 text-utility-blue-light-700 ring-utility-blue-light-200",
    Other: "bg-utility-gray-50 text-utility-gray-700 ring-utility-gray-200",
  };
  return colors[category] || colors.Other;
}
```

**Step 3: Update getCategoryBadgeColor (line 544)**

```typescript
export function getCategoryBadgeColor(
  category: TransactionCategory
): "gray" | "brand" | "error" | "warning" | "success" | "blue" | "indigo" | "purple" | "pink" | "orange" {
  const colorMap: Record<TransactionCategory, "gray" | "brand" | "error" | "warning" | "success" | "blue" | "indigo" | "purple" | "pink" | "orange"> = {
    "Bank Fees": "error",
    Entertainment: "pink",
    "Food & Drink": "orange",
    "General Merchandise": "purple",
    "General Services": "gray",
    "Government & Nonprofit": "gray",
    Healthcare: "error",
    "Home Improvement": "warning",
    Income: "success",
    "Loan Payments": "success",
    "Personal Care": "orange",
    Recreation: "pink",
    "Rent & Utilities": "warning",
    Shopping: "purple",
    "Transfer In": "blue",
    "Transfer Out": "gray",
    Transportation: "indigo",
    Travel: "blue",
    Other: "gray",
  };
  return colorMap[category] || "gray";
}
```

**Step 4: Update mapPlaidCategory (line 597)**

```typescript
function mapPlaidCategory(category?: string): TransactionCategory {
  if (!category) return "Other";

  const categoryUpper = category.toUpperCase();

  const mapping: Record<string, TransactionCategory> = {
    FOOD_AND_DRINK: "Food & Drink",
    TRAVEL: "Travel",
    TRANSPORTATION: "Transportation",
    ENTERTAINMENT: "Entertainment",
    GENERAL_MERCHANDISE: "General Merchandise",
    GENERAL_SERVICES: "General Services",
    GOVERNMENT_AND_NON_PROFIT: "Government & Nonprofit",
    HOME_IMPROVEMENT: "Home Improvement",
    MEDICAL: "Healthcare",
    PERSONAL_CARE: "Personal Care",
    RENT_AND_UTILITIES: "Rent & Utilities",
    TRANSFER_IN: "Transfer In",
    TRANSFER_OUT: "Transfer Out",
    LOAN_PAYMENTS: "Loan Payments",
    BANK_FEES: "Bank Fees",
    INCOME: "Income",
    RECREATION: "Recreation",
  };

  return mapping[categoryUpper] ?? "Other";
}
```

**Step 5: Run typecheck**

Run: `bun typecheck`
Expected: Pass (or identify downstream type errors from old category names like "Dining", "Gas", "Groceries", "Subscription", "Fees", "Transfers", "Payments" that need updating)

**Step 6: Fix any downstream type errors**

Search for any hardcoded references to old category names (e.g., "Dining", "Gas", "Groceries", "Subscription") and update them to the new names. Check:
- `apps/app/src/components/transactions/` — any category filtering or display logic
- `packages/backend/convex/transactions/queries.ts` — category filter logic

**Step 7: Commit**

```bash
git add apps/app/src/types/credit-cards.ts
# + any other files with downstream fixes
git commit -m "feat(categories): replace dropdown with all 18 Plaid PFC categories"
```

---

### Task 2: Schema — Add userTime & transactionAttachments

**Files:**
- Modify: `packages/backend/convex/schema.ts:244-256`

**Step 1: Add userTime to transactionOverlays and add transactionAttachments table**

In `schema.ts`, add `userTime` field to the `transactionOverlays` entity (after `userMerchantName`):

```typescript
userTime: v.optional(v.string()),
```

Add the `transactionAttachments` entity before the closing `}` of the schema (before line 257):

```typescript
// === TRANSACTION ATTACHMENTS ===
transactionAttachments: defineEnt({
    plaidTransactionId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
})
    .edge("user")
    .index("by_transaction", ["plaidTransactionId"])
    .index("by_user_and_transaction", ["userId", "plaidTransactionId"]),
```

**Step 2: Push schema**

Run: `cd packages/backend && npx convex dev` (or wait for running dev server to pick up changes)
Expected: Schema pushed successfully with new table and field

**Step 3: Commit**

```bash
git add packages/backend/convex/schema.ts
git commit -m "feat(schema): add userTime overlay field and transactionAttachments table"
```

---

### Task 3: Backend — Update Overlay Mutations & Queries for userTime

**Files:**
- Modify: `packages/backend/convex/transactionOverlays/mutations.ts:27-31`
- Modify: `packages/backend/convex/transactionOverlays/queries.ts:12-21`
- Modify: `apps/app/src/hooks/useTransactionOverlay.ts:37`

**Step 1: Add userTime to upsertField mutation args (mutations.ts line 27-31)**

Add `v.literal("userTime")` to the field union:

```typescript
field: v.union(
  v.literal("notes"),
  v.literal("userCategory"),
  v.literal("userDate"),
  v.literal("userMerchantName"),
  v.literal("userTime")
),
```

**Step 2: Add userTime to overlay fields shape (queries.ts line 12-21)**

```typescript
const overlayFields = {
  isReviewed: v.optional(v.boolean()),
  reviewedAt: v.optional(v.number()),
  isHidden: v.optional(v.boolean()),
  notes: v.optional(v.string()),
  userCategory: v.optional(v.string()),
  userDate: v.optional(v.string()),
  userMerchantName: v.optional(v.string()),
  userTime: v.optional(v.string()),
};
```

**Step 3: Add userTime to getByTransactionIds result mapping (queries.ts line 72-83, 94-102)**

Add to the result type and the mapping:

```typescript
// In the result type (line 72-83), add:
userTime?: string;

// In the doc mapping (line 94-102), add:
userTime: doc.userTime,
```

**Step 4: Add userTime to useTransactionOverlay hook (useTransactionOverlay.ts line 37)**

Update the field type union:

```typescript
const upsertField = async (
  field: "notes" | "userCategory" | "userDate" | "userMerchantName" | "userTime",
  value: string | null
) => {
```

**Step 5: Run typecheck**

Run: `bun typecheck`
Expected: Pass

**Step 6: Commit**

```bash
git add packages/backend/convex/transactionOverlays/mutations.ts packages/backend/convex/transactionOverlays/queries.ts apps/app/src/hooks/useTransactionOverlay.ts
git commit -m "feat(overlays): add userTime to overlay mutations and queries"
```

---

### Task 4: Backend — Create transactionAttachments Functions

**Files:**
- Create: `packages/backend/convex/transactionAttachments/mutations.ts`
- Create: `packages/backend/convex/transactionAttachments/queries.ts`

**Step 1: Create mutations file**

Create `packages/backend/convex/transactionAttachments/mutations.ts`:

```typescript
/**
 * Transaction Attachment Mutations
 *
 * Upload and delete file attachments for transactions.
 * Uses Convex built-in file storage.
 *
 * SECURITY: All mutations verify ownership via authenticated user context.
 */

import { v } from "convex/values";
import { mutation } from "../functions";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Generate a signed upload URL for Convex file storage.
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  async handler(ctx) {
    ctx.viewerX(); // Ensure authenticated
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save attachment metadata after a successful file upload.
 *
 * @param plaidTransactionId - The Plaid transaction to attach to
 * @param storageId - The Convex storage ID from the upload
 * @param fileName - Original file name
 * @param mimeType - File MIME type (validated against allowlist)
 * @param fileSize - File size in bytes (validated against max)
 */
export const createAttachment = mutation({
  args: {
    plaidTransactionId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
  },
  returns: v.null(),
  async handler(ctx, { plaidTransactionId, storageId, fileName, mimeType, fileSize }) {
    const viewer = ctx.viewerX();

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`File type "${mimeType}" is not allowed`);
    }

    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum of 5MB`);
    }

    await ctx.table("transactionAttachments").insert({
      userId: viewer._id,
      plaidTransactionId,
      storageId,
      fileName,
      mimeType,
      fileSize,
    });

    return null;
  },
});

/**
 * Delete an attachment and its stored file.
 *
 * @param attachmentId - The attachment record to delete
 */
export const deleteAttachment = mutation({
  args: {
    attachmentId: v.id("transactionAttachments"),
  },
  returns: v.null(),
  async handler(ctx, { attachmentId }) {
    const viewer = ctx.viewerX();
    const attachment = await ctx.table("transactionAttachments").getX(attachmentId);

    if (attachment.userId !== viewer._id) {
      throw new Error("Not authorized");
    }

    await ctx.storage.delete(attachment.storageId);
    await attachment.delete();

    return null;
  },
});
```

**Step 2: Create queries file**

Create `packages/backend/convex/transactionAttachments/queries.ts`:

```typescript
/**
 * Transaction Attachment Queries
 *
 * Read operations for transaction file attachments.
 *
 * SECURITY: All queries verify ownership via authenticated user context.
 */

import { v } from "convex/values";
import { query } from "../functions";

/**
 * Get all attachments for a transaction, with serving URLs.
 *
 * @param plaidTransactionId - The Plaid transaction ID
 * @returns Array of attachments with file URLs
 */
export const getByTransactionId = query({
  args: {
    plaidTransactionId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("transactionAttachments"),
      fileName: v.string(),
      mimeType: v.string(),
      fileSize: v.number(),
      url: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, { plaidTransactionId }) => {
    const viewer = ctx.viewerX();

    const attachments = await ctx
      .table("transactionAttachments", "by_user_and_transaction", (q) =>
        q.eq("userId", viewer._id).eq("plaidTransactionId", plaidTransactionId)
      )
      .collect();

    return Promise.all(
      attachments.map(async (att) => ({
        _id: att._id,
        fileName: att.fileName,
        mimeType: att.mimeType,
        fileSize: att.fileSize,
        url: await ctx.storage.getUrl(att.storageId),
      }))
    );
  },
});
```

**Step 3: Run typecheck**

Run: `bun typecheck`
Expected: Pass

**Step 4: Commit**

```bash
git add packages/backend/convex/transactionAttachments/
git commit -m "feat(attachments): add transaction attachment mutations and queries"
```

---

### Task 5: Frontend — Update TransactionDetailFields (Categories, Time, Remove Tags)

**Files:**
- Modify: `apps/app/src/components/transactions/TransactionDetailFields.tsx`
- Modify: `apps/app/src/components/transactions/TransactionDetailPanel.tsx:17-41`

**Step 1: Add datetime to DetailPanelTransaction type (TransactionDetailPanel.tsx line 17-41)**

Verify `datetime?: string` is already present on the `DetailPanelTransaction` interface. It is (line 20). No change needed.

**Step 2: Rewrite TransactionDetailFields.tsx**

Replace the full file. Key changes:
- Remove Tags section and its imports (`Tag01`, `TagGroup`, `TagList`, `Tag`)
- Remove disabled Attachments placeholder (attachments will be a separate component)
- Add Time field using InlineEditableField (only when `datetime` exists)
- Date and Time on the same row
- Category dropdown already uses `TRANSACTION_CATEGORIES` which will have the new values from Task 1

```typescript
"use client";

import { useState, useEffect } from "react";
import type { Key } from "react-aria-components";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { ButtonUtility } from "@repo/ui/untitledui/base/buttons/button-utility";
import { Select } from "@repo/ui/untitledui/base/select/select";
import { DatePicker } from "@repo/ui/untitledui/application/date-picker/date-picker";
import { TextArea } from "@repo/ui/untitledui/base/textarea/textarea";
import { Copy01, ScissorsCut01 } from "@untitledui/icons";
import {
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
} from "@/types/credit-cards";
import { InlineEditableField } from "@/components/credit-cards/details/InlineEditableField";
import type { DetailPanelTransaction } from "./TransactionDetailPanel";

interface TransactionDetailFieldsProps {
  transaction: DetailPanelTransaction;
  overlay:
    | {
        notes?: string;
        userCategory?: string;
        userDate?: string;
        userMerchantName?: string;
        userTime?: string;
      }
    | null
    | undefined;
  savingField: string | null;
  upsertField: (
    field: "notes" | "userCategory" | "userDate" | "userMerchantName" | "userTime",
    value: string | null
  ) => Promise<void>;
}

const categoryItems = TRANSACTION_CATEGORIES.map((cat) => ({
  id: cat,
  label: cat,
}));

/**
 * Extract time string from ISO datetime.
 * Returns "HH:mm" format or null if no datetime.
 */
function extractTimeFromDatetime(datetime?: string): string | null {
  if (!datetime) return null;
  try {
    const date = new Date(datetime);
    if (isNaN(date.getTime())) return null;
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return null;
  }
}

/**
 * Format "HH:mm" to "h:mm AM/PM" display.
 */
function formatTime12hr(time24: string | number | null | undefined): string {
  if (time24 == null || time24 === "") return "—";
  const str = String(time24);
  const [hoursStr, minutesStr] = str.split(":");
  const hours = parseInt(hoursStr ?? "0", 10);
  const minutes = minutesStr ?? "00";
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function TransactionDetailFields({
  transaction,
  overlay,
  savingField,
  upsertField,
}: TransactionDetailFieldsProps) {
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState<string | undefined>(undefined);
  const [pendingDate, setPendingDate] = useState<DateValue | null>(null);

  // Resolved values (overlay wins over transaction defaults)
  const currentCategory = (overlay?.userCategory ??
    transaction.category) as TransactionCategory;
  const currentDate = overlay?.userDate ?? transaction.date;
  const currentNotes = notes ?? overlay?.notes ?? "";

  // Time: only show when datetime exists from Plaid
  const plaidTime = extractTimeFromDatetime(transaction.datetime);
  const currentTime = overlay?.userTime ?? plaidTime;
  const hasTime = plaidTime !== null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transaction.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCategoryChange = (key: Key | null) => {
    if (key !== null) {
      void upsertField("userCategory", key as string);
    }
  };

  const handleDateChange = (value: DateValue | null) => {
    setPendingDate(value);
  };

  const handleDateApply = () => {
    if (pendingDate) {
      void upsertField("userDate", pendingDate.toString());
      setPendingDate(null);
    }
  };

  const handleDateCancel = () => {
    setPendingDate(null);
  };

  const handleTimeSave = async (newValue: string | number) => {
    await upsertField("userTime", String(newValue));
  };

  const handleTimeRevert = async () => {
    await upsertField("userTime", null);
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
  };

  const handleNotesBlur = () => {
    if (notes === undefined && overlay === undefined) return;
    const value = notes ?? overlay?.notes ?? "";
    void upsertField("notes", value || null);
    setNotes(undefined);
  };

  // Debounced auto-save for notes
  useEffect(() => {
    if (notes === undefined) return;
    const timer = setTimeout(() => {
      void upsertField("notes", notes || null);
    }, 500);
    return () => clearTimeout(timer);
  }, [notes, upsertField]);

  const datePickerValue = pendingDate ?? parseDate(currentDate);

  return (
    <div className="flex flex-col gap-5">
      {/* Original Statement */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">
          Original Statement
        </label>
        <div className="mt-1 flex items-center gap-2">
          <span className="flex-1 truncate text-sm text-secondary">
            {transaction.name}
          </span>
          <ButtonUtility
            icon={Copy01}
            size="xs"
            color="tertiary"
            tooltip="Copy original statement"
            onClick={handleCopy}
          />
          {copied && (
            <span className="text-xs text-utility-success-600">Copied</span>
          )}
        </div>
      </div>

      {/* Date + Time row */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">
            Date
          </label>
          <div className="mt-1">
            <DatePicker
              value={datePickerValue}
              onChange={handleDateChange}
              onApply={handleDateApply}
              onCancel={handleDateCancel}
              isDisabled={savingField === "userDate"}
            />
          </div>
        </div>
        {hasTime && (
          <div className="w-28 shrink-0">
            <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">
              Time
            </label>
            <div className="mt-1">
              <InlineEditableField
                value={currentTime}
                plaidValue={plaidTime}
                isOverridden={overlay?.userTime != null}
                type="text"
                onSave={handleTimeSave}
                onRevert={handleTimeRevert}
                formatDisplay={formatTime12hr}
                placeholder="—"
              />
            </div>
          </div>
        )}
      </div>

      {/* Category */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">
            Category
          </label>
          <Button
            color="tertiary"
            size="sm"
            iconLeading={ScissorsCut01}
            isDisabled
          >
            Split
          </Button>
        </div>
        <Select
          items={categoryItems}
          selectedKey={currentCategory}
          onSelectionChange={handleCategoryChange}
          placeholder="Select category"
          size="sm"
          isDisabled={savingField === "userCategory"}
        >
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
      </div>

      {/* Notes */}
      <div>
        <TextArea
          label="Notes"
          placeholder="Add a note..."
          rows={3}
          value={currentNotes}
          onChange={handleNotesChange}
          onBlur={handleNotesBlur}
          isDisabled={savingField === "notes"}
        />
      </div>
    </div>
  );
}
```

**Step 3: Run typecheck**

Run: `bun typecheck`
Expected: Pass

**Step 4: Commit**

```bash
git add apps/app/src/components/transactions/TransactionDetailFields.tsx
git commit -m "feat(panel): add time field, full PFC categories, remove tags placeholder"
```

---

### Task 6: Frontend — Create Source Card Section

**Files:**
- Create: `apps/app/src/components/transactions/TransactionDetailSourceCard.tsx`
- Modify: `apps/app/src/components/transactions/TransactionDetailMerchant.tsx:40-47`

**Step 1: Create TransactionDetailSourceCard component**

Create `apps/app/src/components/transactions/TransactionDetailSourceCard.tsx`:

```typescript
"use client";

import Link from "next/link";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { CreditCard02 } from "@untitledui/icons";
import type { DetailPanelTransaction } from "./TransactionDetailPanel";

interface TransactionDetailSourceCardProps {
  sourceInfo: NonNullable<DetailPanelTransaction["sourceInfo"]>;
}

/**
 * Source card section showing which card a transaction belongs to.
 * Links to the card detail page.
 */
export function TransactionDetailSourceCard({
  sourceInfo,
}: TransactionDetailSourceCardProps) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">
        Source Card
      </label>
      <div className="mt-2 flex items-center gap-3 rounded-lg border border-secondary p-3">
        <CreditCard02 className="size-5 shrink-0 text-tertiary" />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-primary">
            {sourceInfo.displayName}
          </p>
          {sourceInfo.lastFour && (
            <p className="text-xs text-tertiary">
              ••{sourceInfo.lastFour}
            </p>
          )}
        </div>
        <Button
          asChild
          color="secondary"
          size="sm"
        >
          <Link href={`/credit-cards/${sourceInfo.cardId}`}>
            View card
          </Link>
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Remove source card badge from TransactionDetailMerchant (lines 40-47)**

Remove the `{transaction.sourceInfo && (...)}` Badge block from `TransactionDetailMerchant.tsx`. Also remove the `Badge` import if no longer used.

**Step 3: Run typecheck**

Run: `bun typecheck`
Expected: Pass

**Step 4: Commit**

```bash
git add apps/app/src/components/transactions/TransactionDetailSourceCard.tsx apps/app/src/components/transactions/TransactionDetailMerchant.tsx
git commit -m "feat(panel): add dedicated source card section, remove badge from merchant"
```

---

### Task 7: Frontend — Implement Attachments Component

**Files:**
- Create: `apps/app/src/components/transactions/TransactionDetailAttachments.tsx`

**Step 1: Create the attachments component**

Create `apps/app/src/components/transactions/TransactionDetailAttachments.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { FileUpload } from "@repo/ui/untitledui/application/file-upload/file-upload-base";
import { ButtonUtility } from "@repo/ui/untitledui/base/buttons/button-utility";
import { Attachment01, Trash01 } from "@untitledui/icons";
import { toast } from "sonner";

interface TransactionDetailAttachmentsProps {
  plaidTransactionId: string;
}

const ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,application/pdf";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Attachment section: upload, list, preview, and delete transaction attachments.
 * Uses Convex file storage with UntitledUI FileUpload component.
 */
export function TransactionDetailAttachments({
  plaidTransactionId,
}: TransactionDetailAttachmentsProps) {
  const [uploading, setUploading] = useState(false);

  const attachments = useQuery(
    api.transactionAttachments.queries.getByTransactionId,
    { plaidTransactionId }
  );
  const generateUploadUrl = useMutation(
    api.transactionAttachments.mutations.generateUploadUrl
  );
  const createAttachment = useMutation(
    api.transactionAttachments.mutations.createAttachment
  );
  const deleteAttachmentMutation = useMutation(
    api.transactionAttachments.mutations.deleteAttachment
  );

  const handleDropFiles = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();

      await createAttachment({
        plaidTransactionId,
        storageId,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });

      toast.success("Attachment uploaded");
    } catch {
      toast.error("Failed to upload attachment");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: Id<"transactionAttachments">, fileName: string) => {
    try {
      await deleteAttachmentMutation({ attachmentId });
      toast.success(`Removed ${fileName}`);
    } catch {
      toast.error("Failed to delete attachment");
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Attachment01 className="size-4 text-tertiary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-tertiary">
          Attachments
        </span>
      </div>

      {/* Existing attachments */}
      {attachments && attachments.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {attachments.map((att) => (
            <div
              key={att._id}
              className="flex items-center gap-3 rounded-lg border border-secondary p-2"
            >
              {att.mimeType.startsWith("image/") && att.url ? (
                <a href={att.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={att.url}
                    alt={att.fileName}
                    className="size-10 rounded object-cover"
                  />
                </a>
              ) : (
                <div className="flex size-10 items-center justify-center rounded bg-secondary text-xs font-medium text-tertiary">
                  PDF
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-primary">
                  {att.url ? (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {att.fileName}
                    </a>
                  ) : (
                    att.fileName
                  )}
                </p>
                <p className="text-xs text-tertiary">
                  {formatFileSize(att.fileSize)}
                </p>
              </div>
              <ButtonUtility
                icon={Trash01}
                size="xs"
                color="tertiary"
                tooltip="Remove attachment"
                onClick={() => handleDelete(att._id, att.fileName)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Upload drop zone */}
      <FileUpload.DropZone
        isDisabled={uploading}
        hint={uploading ? "Uploading..." : "PNG, JPG or PDF (max. 5MB)"}
        accept={ACCEPT}
        maxSize={MAX_SIZE}
        onDropFiles={handleDropFiles}
        onSizeLimitExceed={() => toast.error("File exceeds 5MB limit")}
        onDropUnacceptedFiles={() => toast.error("Only images and PDFs are allowed")}
      />
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

**Step 2: Run typecheck**

Run: `bun typecheck`
Expected: Pass

**Step 3: Commit**

```bash
git add apps/app/src/components/transactions/TransactionDetailAttachments.tsx
git commit -m "feat(attachments): add transaction attachment upload and list component"
```

---

### Task 8: Frontend — Implement Hide Transaction with Undo Toast

**Files:**
- Modify: `apps/app/src/components/transactions/TransactionDetailActions.tsx`

**Step 1: Rewrite TransactionDetailActions**

```typescript
"use client";

import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { EyeOff } from "@untitledui/icons";

interface TransactionDetailActionsProps {
  onHide: () => void;
  isHiding: boolean;
}

/**
 * "Other Options" section with hide transaction action.
 */
export function TransactionDetailActions({
  onHide,
  isHiding,
}: TransactionDetailActionsProps) {
  return (
    <div className="border-t border-secondary pt-6">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-tertiary">
        Other Options
      </p>

      <Button
        color="secondary-destructive"
        size="sm"
        iconLeading={EyeOff}
        onClick={onHide}
        isDisabled={isHiding}
      >
        Hide transaction
      </Button>

      <p className="mt-2 text-xs text-quaternary">
        Hide this transaction from all views. You can undo this action for a few
        seconds after hiding.
      </p>
    </div>
  );
}
```

Note: The icon changes from `Trash01` to `EyeOff` since this is a hide action. Check if `EyeOff` exists in `@untitledui/icons` — if not, use a similar icon like `Eye` or keep `Trash01` and update the import.

**Step 2: Run typecheck**

Run: `bun typecheck`
Expected: May fail because TransactionDetailActions now requires props. Fix in Task 9.

**Step 3: Commit (hold for Task 9)**

---

### Task 9: Frontend — Wire Up Panel Layout

**Files:**
- Modify: `apps/app/src/components/transactions/TransactionDetailPanel.tsx`

**Step 1: Update TransactionDetailPanel to wire everything together**

```typescript
"use client";

import { useRef } from "react";
import { DialogTrigger } from "react-aria-components";
import { SlideoutMenu } from "@repo/ui/untitledui/application/slideout-menus/slideout-menu";
import { toast } from "sonner";
import { useTransactionOverlay } from "@/hooks/useTransactionOverlay";
import { TransactionDetailHeader } from "./TransactionDetailHeader";
import { TransactionDetailMerchant } from "./TransactionDetailMerchant";
import { TransactionDetailFields } from "./TransactionDetailFields";
import { TransactionDetailSourceCard } from "./TransactionDetailSourceCard";
import { TransactionDetailAttachments } from "./TransactionDetailAttachments";
import { TransactionDetailActions } from "./TransactionDetailActions";

export interface DetailPanelTransaction {
  transactionId: string;
  date: string;
  datetime?: string;
  name: string;
  merchantName: string;
  amount: number;
  isoCurrencyCode?: string;
  pending: boolean;
  categoryPrimary?: string;
  category: string;
  merchantEnrichment?: {
    merchantName: string;
    logoUrl?: string;
    confidenceLevel: string;
  } | null;
  sourceInfo?: {
    cardId: string;
    displayName: string;
    lastFour?: string;
    institutionName?: string;
  };
  isRecurring?: boolean;
  recurringFrequency?: string;
}

interface TransactionDetailPanelProps {
  transaction: DetailPanelTransaction | null;
  onClose: () => void;
}

export function TransactionDetailPanel({
  transaction,
  onClose,
}: TransactionDetailPanelProps) {
  const {
    overlay,
    savingField,
    upsertField,
    toggleReviewed,
    toggleHidden,
  } = useTransactionOverlay(transaction?.transactionId ?? null);

  // Ref to track undo timeout so we can cancel it
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!transaction) return null;

  const isReviewed = overlay?.isReviewed ?? false;
  const isHidden = overlay?.isHidden ?? false;

  const handleHide = () => {
    void toggleHidden(true);
    onClose();

    // Clear any existing undo timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    const transactionId = transaction.transactionId;

    toast("Transaction hidden", {
      action: {
        label: "Undo",
        onClick: () => {
          if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
            undoTimeoutRef.current = null;
          }
          void toggleHidden(false);
        },
      },
      duration: 5000,
    });
  };

  return (
    <DialogTrigger
      isOpen={transaction !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <SlideoutMenu>
        {({ close }) => (
          <>
            <SlideoutMenu.Header onClose={close}>
              <TransactionDetailHeader
                isReviewed={isReviewed}
                isHidden={isHidden}
                savingField={savingField}
                onToggleReviewed={() => toggleReviewed(!isReviewed)}
                onToggleHidden={() => toggleHidden(!isHidden)}
                onClose={close}
              />
            </SlideoutMenu.Header>

            <SlideoutMenu.Content>
              <div className="flex flex-col gap-6 py-2">
                {/* 1. Merchant (logo, name, amount) */}
                <TransactionDetailMerchant transaction={transaction} />

                {/* 2. Fields (statement, date+time, category, notes) */}
                <TransactionDetailFields
                  transaction={transaction}
                  overlay={overlay}
                  savingField={savingField}
                  upsertField={upsertField}
                />

                {/* 3. Source Card */}
                {transaction.sourceInfo && (
                  <TransactionDetailSourceCard
                    sourceInfo={transaction.sourceInfo}
                  />
                )}

                {/* 4. Attachments */}
                <TransactionDetailAttachments
                  plaidTransactionId={transaction.transactionId}
                />

                {/* 5. Other Options (hide) */}
                <TransactionDetailActions
                  onHide={handleHide}
                  isHiding={savingField === "isHidden"}
                />
              </div>
            </SlideoutMenu.Content>
          </>
        )}
      </SlideoutMenu>
    </DialogTrigger>
  );
}
```

**Step 2: Run typecheck**

Run: `bun typecheck`
Expected: Pass

**Step 3: Commit Tasks 8 + 9 together**

```bash
git add apps/app/src/components/transactions/TransactionDetailActions.tsx apps/app/src/components/transactions/TransactionDetailPanel.tsx
git commit -m "feat(panel): wire up source card, attachments, and hide-with-undo toast"
```

---

### Task 10: Verify & Polish

**Step 1: Run full typecheck**

Run: `bun typecheck`
Expected: Pass with zero errors

**Step 2: Run build**

Run: `bun build`
Expected: Pass

**Step 3: Manual verification checklist**

Run: `bun dev:app` (and ensure Convex dev is running)

Verify in browser:
- [ ] Open a transaction detail panel
- [ ] Category dropdown shows all 18 PFC categories alphabetically
- [ ] Selecting a new category persists and shows correct badge color
- [ ] Time field appears only for transactions with datetime
- [ ] Time displays in 12hr format, double-click to edit
- [ ] Tags section is gone
- [ ] Source Card section appears with card name, last four, and View Card link
- [ ] View Card link navigates to correct card detail page
- [ ] File upload drop zone is functional (drag or click)
- [ ] Uploading an image shows it in the attachment list
- [ ] Uploading a PDF shows it with PDF icon
- [ ] Attachment delete removes it
- [ ] "Hide transaction" button closes panel and shows toast
- [ ] Clicking "Undo" on toast restores the transaction
- [ ] Letting toast expire keeps transaction hidden

**Step 4: Final commit (if any polish needed)**

```bash
git commit -m "fix(panel): polish transaction detail enhancements"
```

---

## File Summary

| Action | File |
|--------|------|
| Modify | `apps/app/src/types/credit-cards.ts` |
| Modify | `packages/backend/convex/schema.ts` |
| Modify | `packages/backend/convex/transactionOverlays/mutations.ts` |
| Modify | `packages/backend/convex/transactionOverlays/queries.ts` |
| Modify | `apps/app/src/hooks/useTransactionOverlay.ts` |
| Create | `packages/backend/convex/transactionAttachments/mutations.ts` |
| Create | `packages/backend/convex/transactionAttachments/queries.ts` |
| Modify | `apps/app/src/components/transactions/TransactionDetailFields.tsx` |
| Modify | `apps/app/src/components/transactions/TransactionDetailMerchant.tsx` |
| Modify | `apps/app/src/components/transactions/TransactionDetailActions.tsx` |
| Modify | `apps/app/src/components/transactions/TransactionDetailPanel.tsx` |
| Create | `apps/app/src/components/transactions/TransactionDetailSourceCard.tsx` |
| Create | `apps/app/src/components/transactions/TransactionDetailAttachments.tsx` |

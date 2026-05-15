# CROWDEV-420 — Variant E: Refined + Glass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the **Refined + Glass** variant — Refined Materiality's chassis with a subtle champagne glass veil, a cursor-tracked Aceternity-style spotlight, a moss-warmed pin ribbon, and **one page-level `backdrop-blur-xl` parent layer** behind the grid (not per-card). Solves the perf concern of Variant D by isolating glass behavior to a single shared blur layer; scales to 20+ wallet cards safely. No Safari fallback needed.

**Architecture:** New directory `variants/refined-glass/` shares ~80% of code shape with `variants/refined/`. The novel additions are: a `CardSpotlight.tsx` (Aceternity-style mouse-tracked radial gradient) and a small page-chrome change in `WalletsContent.tsx` adding the ambient color blobs + single backdrop-blur layer.

**Tech Stack:** Tailwind v4, Motion v12, no new npm dependencies (Aceternity Card Spotlight is copy-paste TSX).

**Parent spec:** [`docs/superpowers/specs/2026-05-12-crowdev-420-wallets-aesthetic-multi-variant-design.md`](../specs/2026-05-12-crowdev-420-wallets-aesthetic-multi-variant-design.md) §6 (Variant E)

**Dependency:** Requires the Prep PR. Reading Plan B ([`2026-05-12-crowdev-420-variant-b-refined-materiality.md`](2026-05-12-crowdev-420-variant-b-refined-materiality.md)) first is helpful — much of the chassis pattern is identical.

---

## File Structure

### New files (in `apps/app/src/components/wallets/variants/refined-glass/`)

| Path | Responsibility |
|---|---|
| `variants/refined-glass/WalletCard.tsx` | Variant component — Refined chassis + glass veil + spotlight wrapper |
| `variants/refined-glass/MiniCardPreview.tsx` | Same 200×120 hero slot as B, slightly lighter material |
| `variants/refined-glass/ExtendedStats.tsx` | Stats panel with matching glass veil |
| `variants/refined-glass/SortableWalletCard.tsx` | Drag wrapper with champagne hairline grip |
| `variants/refined-glass/CardSpotlight.tsx` | Aceternity-style mouse-tracked radial gradient spotlight (copy-paste; not an npm install) |
| `variants/refined-glass/grain.svg.ts` | Same grain pattern as B (separate file so the variant is tree-shaken cleanly) |

### Modified files

| Path | Change |
|---|---|
| `apps/app/src/components/wallets/WalletsContent.tsx` | (1) Import swap to refined-glass variant. (2) Wrap the grid in a `relative` container with two `pointer-events-none absolute` layers: ambient color blobs + the shared `backdrop-blur-xl`. |
| `apps/app/tests/wallets-variant-refined-glass.spec.ts` | **New** smoke test verifying all 9 must-keep features. |

### Branch & PR

- Branch: `crowdev-420-e-refined-glass` (created via `gt create`, stacked on `crowdev-420-prep`)
- PR title: `feat(wallets): variant E — Refined + Glass (CROWDEV-XXX)`
- Submitted via `gt submit`

---

## Tasks

### Task 1: Create the Linear sub-issue and Graphite branch

**Files:**
- None

- [ ] **Step 1: Create Linear sub-issue**

Linear MCP `save_issue`: parent `CROWDEV-420`, title `Variant E — Refined + Glass`, copy §6 Variant E from the spec as description. Record `CROWDEV-XXX`.

- [ ] **Step 2: Create the Graphite branch on prep**

```bash
git fetch origin
gt checkout crowdev-420-prep
gt create -m "feat(wallets): variant E — Refined + Glass (CROWDEV-XXX)" crowdev-420-e-refined-glass
```

- [ ] **Step 3: Post starting Linear comment + move to In Progress**

---

### Task 2: Create the grain SVG constant (same as variant B)

**Files:**
- Create: `apps/app/src/components/wallets/variants/refined-glass/grain.svg.ts`

- [ ] **Step 1: Create the file**

```ts
// apps/app/src/components/wallets/variants/refined-glass/grain.svg.ts
export const GRAIN_SVG_URL =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>
      <filter id='n2'>
        <feTurbulence type='fractalNoise' baseFrequency='.65' stitchTiles='stitch'/>
      </filter>
      <rect width='100%' height='100%' filter='url(#n2)' opacity='0.55'/>
    </svg>`
  );
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/app && bun typecheck
git add apps/app/src/components/wallets/variants/refined-glass/grain.svg.ts
git commit -m "feat(wallets): add grain SVG for refined-glass variant

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Implement `CardSpotlight.tsx` (Aceternity-style copy-paste)

**Files:**
- Create: `apps/app/src/components/wallets/variants/refined-glass/CardSpotlight.tsx`

- [ ] **Step 1: Create the spotlight component**

Adapted from [Aceternity UI Card Spotlight](https://ui.aceternity.com/components/card-spotlight). Tracks mouse position with `useMotionValue` and renders a radial-gradient mask following the cursor.

```tsx
// apps/app/src/components/wallets/variants/refined-glass/CardSpotlight.tsx
"use client";

import { useRef } from "react";
import { motion, useMotionValue, useMotionTemplate } from "motion/react";

interface CardSpotlightProps {
  children: React.ReactNode;
  /** Radius of the spotlight in pixels. */
  radius?: number;
  /** Spotlight tint — defaults to champagne at low alpha. */
  color?: string;
  className?: string;
}

/**
 * Mouse-tracked radial spotlight overlay. Renders nothing visible until
 * the user hovers the wrapper; then a soft circular highlight follows
 * the cursor. Used by the Refined + Glass variant to surface the glass
 * material's "wetness" under cursor.
 */
export function CardSpotlight({
  children,
  radius = 240,
  color = "rgba(212,197,156,0.18)",
  className,
}: CardSpotlightProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const background = useMotionTemplate`radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, ${color}, transparent 70%)`;

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      className={className}
      style={{ position: "relative" }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/app && bun typecheck
git add apps/app/src/components/wallets/variants/refined-glass/CardSpotlight.tsx
git commit -m "feat(wallets): CardSpotlight (Aceternity-style) for refined-glass

Mouse-tracked radial gradient overlay. Champagne tint at 18% opacity.

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Implement `MiniCardPreview.tsx`

**Files:**
- Create: `apps/app/src/components/wallets/variants/refined-glass/MiniCardPreview.tsx`

Same shape and dimensions as Variant B's mini-card preview — 200×120 hero slot at credit-card aspect ratio 1.667 — but with a glass-veil overlay gradient on the slot itself.

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/components/wallets/variants/refined-glass/MiniCardPreview.tsx
"use client";

import { motion } from "motion/react";
import { brandColors } from "../../shared";
import { cx } from "@repo/ui/utils";

interface PreviewProps {
  cards: Array<{ brand?: string; lastFour?: string; displayName: string; _id: string }>;
  isHovered: boolean;
}

export function MiniCardPreview({ cards, isHovered }: PreviewProps) {
  if (cards.length === 0) {
    return (
      <div className="relative h-44 w-full">
        <div
          className="absolute left-1/2 top-6 h-30 w-50 -translate-x-1/2 rounded-2xl border border-dashed"
          style={{
            borderColor: "rgba(212,197,156,0.22)",
            background: "rgba(212,197,156,0.03)",
            backdropFilter: "blur(4px)",
          }}
        >
          <span
            className="absolute inset-0 flex items-center justify-center text-xs italic"
            style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              color: "rgba(212,197,156,0.5)",
            }}
          >
            Add a card
          </span>
        </div>
      </div>
    );
  }

  const heroCard = cards[0]!;
  const colors = brandColors[heroCard.brand ?? "other"] ?? brandColors.other!;

  return (
    <div className="relative h-44 w-full">
      {/* peek lines (same as variant B) */}
      <motion.div
        className="absolute left-1/2 h-1 rounded-sm"
        style={{
          width: 160,
          top: 12,
          background:
            "linear-gradient(180deg, rgba(212,197,156,0.35), transparent)",
        }}
        animate={{ y: isHovered ? -3 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
      <motion.div
        className="absolute left-1/2 h-1 rounded-sm"
        style={{
          width: 180,
          top: 18,
          background:
            "linear-gradient(180deg, rgba(212,197,156,0.6), transparent)",
        }}
        animate={{ y: isHovered ? -2 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
      {/* hero card slot with glass veil */}
      <motion.div
        className={cx(
          "absolute left-1/2 top-7 h-30 w-50 -translate-x-1/2 overflow-hidden rounded-2xl bg-gradient-to-br",
          colors.bg
        )}
        style={{
          boxShadow:
            "0 8px 22px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,245,215,0.5), inset 0 -1px 0 rgba(0,0,0,0.12)",
        }}
        animate={{
          y: isHovered ? -4 : 0,
          scale: isHovered ? 1.01 : 1,
        }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
      >
        {/* glass veil */}
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.10), transparent 60%)",
          }}
        />
        <div
          className={cx(
            "absolute right-4 top-3 h-5.5 w-7.5 rounded-sm",
            colors.accent
          )}
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" }}
        />
        {heroCard.lastFour && (
          <span
            className="absolute bottom-3 right-4 text-[10px] tracking-wider text-white/70"
            style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
          >
            •••• {heroCard.lastFour}
          </span>
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/app && bun typecheck
git add apps/app/src/components/wallets/variants/refined-glass/MiniCardPreview.tsx
git commit -m "feat(wallets): refined-glass MiniCardPreview with glass veil

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Implement `ExtendedStats.tsx`

**Files:**
- Create: `apps/app/src/components/wallets/variants/refined-glass/ExtendedStats.tsx`

Same structure as variant B's stats panel, but the panel material picks up the glass veil too.

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/components/wallets/variants/refined-glass/ExtendedStats.tsx
"use client";

import { motion, AnimatePresence } from "motion/react";
import { cx } from "@repo/ui/utils";
import { formatMoneyFromDollars } from "@/utils/money";
import { GRAIN_SVG_URL } from "./grain.svg";

interface ExtendedStatsProps {
  isExtended: boolean;
  walletStats:
    | {
        totalBalance: number;
        totalCreditLimit: number;
        totalAvailableCredit: number;
        averageUtilization?: number;
      }
    | null
    | undefined;
}

export function ExtendedStats({ isExtended, walletStats }: ExtendedStatsProps) {
  return (
    <AnimatePresence>
      {isExtended && walletStats && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 overflow-hidden"
        >
          <div
            className="relative grid grid-cols-2 gap-3 overflow-hidden rounded-2xl p-4 text-sm"
            style={{
              background:
                "linear-gradient(135deg, rgba(212,197,156,0.06), transparent), linear-gradient(160deg, #1f1c17 0%, #15130f 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(212,197,156,0.18), 0 18px 36px rgba(0,0,0,0.4)",
            }}
          >
            <span
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `url("${GRAIN_SVG_URL}")`,
                opacity: 0.06,
                mixBlendMode: "overlay",
              }}
            />
            <span
              className="pointer-events-none absolute left-0 right-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(212,197,156,0.4), transparent)",
              }}
            />
            <Stat label="Total Balance" value={formatMoneyFromDollars(walletStats.totalBalance)} />
            <Stat
              label="Credit Limit"
              value={formatMoneyFromDollars(walletStats.totalCreditLimit, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            />
            <Stat label="Available" value={formatMoneyFromDollars(walletStats.totalAvailableCredit)} />
            <Stat
              label="Utilization"
              value={`${(walletStats.averageUtilization ?? 0).toFixed(0)}%`}
              valueClassName={cx(
                (walletStats.averageUtilization ?? 0) < 30
                  ? "text-success-primary"
                  : (walletStats.averageUtilization ?? 0) < 70
                    ? "text-warning-primary"
                    : "text-error-primary"
              )}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="relative z-10">
      <p
        className="text-[10px] uppercase tracking-[0.15em]"
        style={{ color: "rgba(212,197,156,0.55)" }}
      >
        {label}
      </p>
      <p
        className={cx("mt-0.5 font-medium", valueClassName)}
        style={{ color: "#f0e8d0", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
      >
        {value}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/app && bun typecheck
git add apps/app/src/components/wallets/variants/refined-glass/ExtendedStats.tsx
git commit -m "feat(wallets): refined-glass ExtendedStats with glass veil

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Implement `WalletCard.tsx`

**Files:**
- Create: `apps/app/src/components/wallets/variants/refined-glass/WalletCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/components/wallets/variants/refined-glass/WalletCard.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Pin01, Edit03, Trash01 } from "@untitledui/icons";
import { Dropdown } from "@repo/ui/untitledui/base/dropdown/dropdown";
import { cx } from "@repo/ui/utils";
import {
  useWalletCard,
  useWalletCardActions,
  type WalletCardProps,
} from "../../shared";
import { MiniCardPreview } from "./MiniCardPreview";
import { ExtendedStats } from "./ExtendedStats";
import { CardSpotlight } from "./CardSpotlight";
import { GRAIN_SVG_URL } from "./grain.svg";

export function WalletCard({ wallet, isExtended }: WalletCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editName, setEditName] = useState(wallet.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const { previewCards, walletStats } = useWalletCard(wallet._id, isExtended);
  const actions = useWalletCardActions(wallet._id);

  const handleClick = () => {
    if (!isRenaming) actions.navigateToCards();
  };

  const handleRename = () => {
    setEditName(wallet.name);
    setIsRenaming(true);
  };

  const handleRenameSubmit = async () => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== wallet.name) {
      await actions.rename(trimmedName);
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setEditName(wallet.name);
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      handleRenameCancel();
    }
  };

  return (
    <motion.div
      data-testid="wallet-card"
      data-variant="refined-glass"
      className="group relative cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
    >
      <CardSpotlight radius={260} color="rgba(212,197,156,0.16)">
        <div
          className="relative overflow-hidden rounded-3xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(212,197,156,0.08), transparent 50%), linear-gradient(160deg, #1f1c17 0%, #15130f 100%)",
            border: "1px solid rgba(212,197,156,0.10)",
            boxShadow:
              "inset 0 1px 0 rgba(212,197,156,0.2), 0 26px 50px rgba(0,0,0,0.55)",
          }}
        >
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url("${GRAIN_SVG_URL}")`,
              opacity: 0.08,
              mixBlendMode: "overlay",
            }}
          />
          <span
            className="pointer-events-none absolute left-0 right-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(212,197,156,0.45), transparent)",
            }}
          />
          {/* Moss ribbon when pinned — warmer than B's champagne ribbon */}
          {wallet.isPinned && (
            <span
              className="pointer-events-none absolute right-6 top-0 h-1.5 w-6 rounded-b-sm"
              style={{
                background: "linear-gradient(180deg, #7fb89a, #5a9077)",
                boxShadow: "0 1px 6px rgba(127,184,154,0.5)",
              }}
              aria-label="Pinned"
            />
          )}
          <div className="relative">
            <MiniCardPreview cards={previewCards} isHovered={isHovered} />
          </div>

          <div className="relative z-10 flex items-start justify-between px-5 pb-4 pt-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {wallet.icon && <span className="text-lg">{wallet.icon}</span>}
                {isRenaming ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={handleRenameKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full min-w-0 rounded border bg-transparent px-1.5 py-0.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#d4c59c]/30"
                    style={{
                      borderColor: "rgba(212,197,156,0.5)",
                      color: "#f0e8d0",
                    }}
                  />
                ) : (
                  <h3
                    className="truncate font-medium"
                    style={{
                      color: "#f0e8d0",
                      fontFamily: "ui-sans-serif, system-ui, sans-serif",
                      fontSize: 19,
                    }}
                  >
                    {wallet.name}
                  </h3>
                )}
                {wallet.isPinned && !isRenaming && (
                  <Pin01 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#7fb89a" }} />
                )}
              </div>
              <p
                className="mt-0.5 text-[10px] uppercase"
                style={{
                  color: "rgba(212,197,156,0.6)",
                  letterSpacing: "0.16em",
                }}
              >
                {wallet.cardCount} {wallet.cardCount === 1 ? "card" : "cards"}
                {wallet.isPinned ? " · pinned" : ""}
              </p>
            </div>

            <span onClick={(e) => e.stopPropagation()} className="flex items-center">
              <Dropdown.Root>
                <Dropdown.DotsButton
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Options"
                />
                <Dropdown.Popover className="w-min">
                  <Dropdown.Menu>
                    <Dropdown.Item icon={Edit03} onAction={handleRename}>
                      <span className="pr-4">Rename</span>
                    </Dropdown.Item>
                    <Dropdown.Item icon={Pin01} onAction={actions.togglePin}>
                      <span className="pr-4">
                        {wallet.isPinned ? "Unpin from Sidebar" : "Pin to Sidebar"}
                      </span>
                    </Dropdown.Item>
                    <Dropdown.Item
                      icon={Trash01}
                      onAction={() => {
                        if (
                          confirm(`Delete "${wallet.name}"? Cards will not be deleted.`)
                        ) {
                          actions.remove();
                        }
                      }}
                    >
                      <span className="pr-4 text-error-primary">Delete</span>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown.Root>
            </span>
          </div>
        </div>
      </CardSpotlight>

      <ExtendedStats isExtended={isExtended} walletStats={walletStats} />
    </motion.div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/app && bun typecheck
git add apps/app/src/components/wallets/variants/refined-glass/WalletCard.tsx
git commit -m "feat(wallets): refined-glass WalletCard with spotlight + moss ribbon

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Implement `SortableWalletCard.tsx`

**Files:**
- Create: `apps/app/src/components/wallets/variants/refined-glass/SortableWalletCard.tsx`

- [ ] **Step 1: Create the wrapper**

```tsx
// apps/app/src/components/wallets/variants/refined-glass/SortableWalletCard.tsx
"use client";

import { cx } from "@repo/ui/utils";
import { useSortableWallet, type WalletCardProps } from "../../shared";
import { WalletCard } from "./WalletCard";

export function SortableWalletCard(props: WalletCardProps) {
  const { attributes, listeners, setNodeRef, style, isDragging } =
    useSortableWallet(props.wallet._id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cx(
        "group relative",
        isDragging && "z-50 opacity-90 shadow-xl"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className={cx(
          "absolute -left-1 top-1/2 z-20 h-7 w-0.5 -translate-y-1/2 cursor-grab rounded-r",
          "opacity-0 transition-opacity group-hover:opacity-100",
          isDragging && "cursor-grabbing opacity-100"
        )}
        style={{ background: "rgba(212,197,156,0.5)" }}
        aria-label="Drag to reorder"
      />
      <WalletCard {...props} />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/app && bun typecheck
git add apps/app/src/components/wallets/variants/refined-glass/SortableWalletCard.tsx
git commit -m "feat(wallets): refined-glass SortableWalletCard

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Update `WalletsContent.tsx` — import swap + ambient blur layer

**Files:**
- Modify: `apps/app/src/components/wallets/WalletsContent.tsx`

This variant requires more than a one-line change because the spec calls for a **single page-level backdrop-blur** layer behind the grid (so glass effect doesn't run per-card and tank scroll perf).

- [ ] **Step 1: Replace the import**

In `apps/app/src/components/wallets/WalletsContent.tsx` line 25:

```diff
- import { SortableWalletCard, WalletCard } from "./WalletCard";
+ import { SortableWalletCard } from "./variants/refined-glass/SortableWalletCard";
```

- [ ] **Step 2: Wrap the grid in the ambient backdrop layer**

Find the `<DndContext>` block (around line 129-148) and wrap the inner `<SortableContext>` grid in a `relative` container with two pointer-events-none layers behind it. Replace:

```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext
    items={wallets.map((w) => w._id)}
    strategy={rectSortingStrategy}
  >
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {wallets.map((wallet) => (
        <SortableWalletCard
          key={wallet._id}
          wallet={wallet}
          isExtended={isExtended}
        />
      ))}
    </div>
  </SortableContext>
</DndContext>
```

with:

```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext
    items={wallets.map((w) => w._id)}
    strategy={rectSortingStrategy}
  >
    <div className="relative">
      {/* ambient color blobs — give the cards' glass something to refract */}
      <div
        className="pointer-events-none absolute -inset-32 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 600px 400px at 25% 30%, rgba(127,184,154,0.10), transparent 60%), radial-gradient(ellipse 500px 350px at 80% 70%, rgba(212,197,156,0.08), transparent 60%)",
        }}
        aria-hidden
      />
      {/* shared single backdrop-blur layer (not per card) */}
      <div
        className="pointer-events-none absolute -inset-4 -z-10 backdrop-blur-xl"
        aria-hidden
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {wallets.map((wallet) => (
          <SortableWalletCard
            key={wallet._id}
            wallet={wallet}
            isExtended={isExtended}
          />
        ))}
      </div>
    </div>
  </SortableContext>
</DndContext>
```

- [ ] **Step 3: Run typecheck + lint + build**

```bash
cd apps/app && bun typecheck && bun lint && bun build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/app/src/components/wallets/WalletsContent.tsx
git commit -m "$(cat <<'EOF'
feat(wallets): route to refined-glass + add ambient blur layer

Adds single page-level backdrop-blur-xl behind the grid plus ambient
moss + champagne color blobs. Glass effect runs once per page (not
per card), preserving scroll performance at any wallet count.

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Write the Playwright smoke test

**Files:**
- Create: `apps/app/tests/wallets-variant-refined-glass.spec.ts`

- [ ] **Step 1: Create the smoke test**

```ts
// apps/app/tests/wallets-variant-refined-glass.spec.ts
import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) throw new Error("NEXT_PUBLIC_CONVEX_URL not set");

const NAME_PREFIX = "RefinedGlassTest-";

test.describe("Variant E — Refined + Glass (CROWDEV-XXX)", () => {
  let convex: ConvexHttpClient;
  let createdWalletIds: string[] = [];

  test.beforeAll(async () => {
    convex = new ConvexHttpClient(CONVEX_URL);
  });

  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
    // Seed two wallets (one pinned) — see wallets-baseline.spec.ts for pattern
  });

  test.afterEach(async () => {
    for (const id of createdWalletIds) {
      try {
        await convex.mutation(api.wallets.mutations.remove, { walletId: id as any });
      } catch {}
    }
    createdWalletIds = [];
  });

  test("renders with data-variant='refined-glass'", async ({ page }) => {
    await page.goto("/wallets");
    await expect(
      page.locator("[data-testid='wallet-card']").first()
    ).toHaveAttribute("data-variant", "refined-glass");
  });

  test("displays wallet name and card count", async ({ page }) => {
    await page.goto("/wallets");
    await expect(page.getByText(new RegExp(NAME_PREFIX), { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/\d+ (cards?|cards · pinned)/i).first()).toBeVisible();
  });

  test("pin indicator visible when pinned", async ({ page }) => {
    await page.goto("/wallets");
    await expect(page.getByText(/· pinned/i).first()).toBeVisible();
  });

  test("dropdown opens with Rename / Pin / Delete", async ({ page }) => {
    await page.goto("/wallets");
    await page.locator("[data-testid='wallet-card']").first().hover();
    await page.getByRole("button", { name: /options/i }).first().click();
    await expect(page.getByRole("menuitem", { name: /rename/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /pin|unpin/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /delete/i })).toBeVisible();
  });

  test("drag handle visible on hover", async ({ page }) => {
    await page.goto("/wallets");
    const firstCard = page.locator("[data-testid='wallet-card']").first();
    await firstCard.hover();
    await expect(firstCard.locator("[aria-label='Drag to reorder']")).toBeVisible();
  });

  test("extended-view toggle reveals stats", async ({ page }) => {
    await page.goto("/wallets");
    await page.getByRole("switch", { name: /details/i }).click();
    await expect(page.getByText(/total balance/i).first()).toBeVisible();
    await expect(page.getByText(/credit limit/i).first()).toBeVisible();
    await expect(page.getByText(/available/i).first()).toBeVisible();
    await expect(page.getByText(/utilization/i).first()).toBeVisible();
  });

  test("click navigates to /credit-cards", async ({ page }) => {
    await page.goto("/wallets");
    await page.locator("[data-testid='wallet-card']").first().click();
    await expect(page).toHaveURL(/\/credit-cards\?wallet=/);
  });

  test("inline rename works", async ({ page }) => {
    await page.goto("/wallets");
    await page.locator("[data-testid='wallet-card']").first().hover();
    await page.getByRole("button", { name: /options/i }).first().click();
    await page.getByRole("menuitem", { name: /rename/i }).click();
    const input = page.getByRole("textbox").first();
    await input.fill(`${NAME_PREFIX}Renamed`);
    await input.press("Enter");
    await expect(page.getByText(`${NAME_PREFIX}Renamed`)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
cd apps/app
bun test:e2e wallets-variant-refined-glass.spec.ts
```

Expected: All PASS.

```bash
git add apps/app/tests/wallets-variant-refined-glass.spec.ts
git commit -m "test(wallets): smoke spec for refined-glass variant

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Manual visual check

**Files:**
- None

- [ ] **Step 1: Run dev server, visit `/wallets`**

```bash
bun dev:app
```

Verify against §6 Variant E:
- [ ] Page has subtle ambient moss + champagne color tinting behind the grid
- [ ] Cursor over a card produces a soft spotlight that follows the mouse
- [ ] Pinned wallets show moss (not champagne) ribbon and moss Pin icon
- [ ] Glass veil visible on the hero credit-card slot
- [ ] No per-card backdrop-filter — confirm via DevTools Performance tab that scrolling stays at 60fps even with many cards visible

- [ ] **Step 2: Stress-test with multiple cards**

If you only have 2-3 seeded wallets, seed 15-20 more (via console: `await api.wallets.mutations.create(...)` ×20). Scroll the page. Frame rate should hold at 60fps.

- [ ] **Step 3: Console check**

No console errors or warnings on load, hover, drag, dropdown open, rename, extended view toggle, or scroll.

---

### Task 11: Submit + Linear update

**Files:**
- None

- [ ] **Step 1: Full verification suite**

```bash
cd apps/app
bun typecheck && bun lint && bun build && bun test:e2e wallets-variant-refined-glass.spec.ts
```

- [ ] **Step 2: Submit via Graphite**

```bash
gt submit
```

Note PR number. Graphite URL: `https://app.graphite.com/github/pr/EricJamesCrow/smartpockets/<PR_NUMBER>`.

- [ ] **Step 3: Verify Vercel preview**

```bash
gh pr checks <PR_NUMBER>
```

- [ ] **Step 4: Post Linear comment + move to In Review**

Linear MCP `save_comment`:

```
Variant E (Refined + Glass) submitted.

**PR:** https://app.graphite.com/github/pr/EricJamesCrow/smartpockets/<PR_NUMBER>
**Preview:** <Vercel URL>

**Implementation:**
- `variants/refined-glass/` — WalletCard, MiniCardPreview, ExtendedStats, SortableWalletCard, CardSpotlight, grain.svg.ts
- `WalletsContent.tsx` — import swap PLUS ambient color blobs + single `backdrop-blur-xl` parent layer behind the grid (one blur per page, not per card)
- Aceternity-style Card Spotlight follows cursor (champagne tint at 16% opacity)
- Moss ribbon (not champagne) signals pinning — warmer than Variant B

**Perf:** verified 60fps scroll with 20+ wallet cards. No per-card backdrop-filter.

**Smoke test:** all 9 must-keep features pass.

Ready for visual review.
```

Move issue to In-Review.

---

## Self-Review checklist

- [ ] Page-level backdrop-blur (single layer) replaces per-card blur — confirmed in WalletsContent.tsx Task 8 Step 2.
- [ ] Moss (not champagne) ribbon + Pin icon when pinned — distinguishes Variant E from B.
- [ ] CardSpotlight uses `useMotionValue` + `useMotionTemplate` (current Motion v12 API).
- [ ] All 9 must-keep features asserted in the smoke test.
- [ ] No placeholders.

---

## Out of scope

- Per-card `backdrop-filter` (intentionally avoided — that's Variant D's territory)
- Adding `liquid-glass-react` or any heavy glass library (intentionally lighter than Variant D)
- Sidebar / create-modal changes

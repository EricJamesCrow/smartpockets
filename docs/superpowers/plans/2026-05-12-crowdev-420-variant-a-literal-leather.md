# CROWDEV-420 — Variant A: Literal Leather Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the **Literal Leather** variant — skeuomorphic cognac-leather bifold with visible stitching, embossed Fraunces italic name, champagne-foil pin dot, and 3 brand-colored cards peeking from the top of the wallet. Cards fan out on hover (existing motion preserved) with an additional ~3° 3D tilt. The extended-view stats panel renders as a parchment "receipt" sliding below the wallet.

**Architecture:** New directory `variants/leather/`. Locally-hosted leather texture PNG (downloaded from Transparent Textures, CC-licensed for commercial use). A small inline 3D-tilt wrapper (Aceternity-style copy-paste, no npm install). The wallet's mini-card stack uses the same fan-out spring motion as today but rendered with the realistic top-of-wallet "tucked in" treatment.

**Tech Stack:** Tailwind v4, Motion v12, locally-hosted PNG texture, no new npm dependencies.

**Parent spec:** [`docs/superpowers/specs/2026-05-12-crowdev-420-wallets-aesthetic-multi-variant-design.md`](../specs/2026-05-12-crowdev-420-wallets-aesthetic-multi-variant-design.md) §6 (Variant A)

**Dependency:** Requires the Prep PR.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `apps/app/public/wallet-textures/leather.png` | Transparent Textures leather pattern, downloaded locally for stability + offline dev |
| `apps/app/public/wallet-textures/LICENSE.md` | Attribution note (free for commercial use, source URL) |
| `variants/leather/WalletCard.tsx` | Variant component — leather material + stitching + cards-peeking + name |
| `variants/leather/MiniCardPreview.tsx` | 3 cards peeking from top of wallet (existing fan-out motion preserved) |
| `variants/leather/ExtendedStats.tsx` | "Receipt" panel below the wallet — parchment background, serif numerals |
| `variants/leather/SortableWalletCard.tsx` | Drag wrapper with leather-grip texture on left edge |
| `variants/leather/TiltCard.tsx` | Mouse-tracked ~3° tilt wrapper (Aceternity-3D-Card-Effect-style, copy-paste) |

### Modified files

| Path | Change |
|---|---|
| `apps/app/src/components/wallets/WalletsContent.tsx` | One-line import swap |
| `apps/app/tests/wallets-variant-leather.spec.ts` | **New** smoke test for all 9 must-keep features |

### Branch & PR

- Branch: `crowdev-420-a-leather` (stacked on `crowdev-420-prep`)
- PR title: `feat(wallets): variant A — Literal Leather (CROWDEV-XXX)`

---

## Tasks

### Task 1: Linear sub-issue + Graphite branch

**Files:**
- None

- [ ] **Step 1: Create Linear sub-issue**

Linear MCP `save_issue`: parent `CROWDEV-420`, title `Variant A — Literal Leather`, copy §6 Variant A as description. Record `CROWDEV-XXX`.

- [ ] **Step 2: Branch on prep**

```bash
git fetch origin
gt checkout crowdev-420-prep
gt create -m "feat(wallets): variant A — Literal Leather (CROWDEV-XXX)" crowdev-420-a-leather
```

- [ ] **Step 3: Linear starting comment + In Progress**

---

### Task 2: Download the leather texture asset

**Files:**
- Create: `apps/app/public/wallet-textures/leather.png`
- Create: `apps/app/public/wallet-textures/LICENSE.md`

We host the PNG locally so the variant doesn't depend on a third-party CDN at runtime.

- [ ] **Step 1: Download the PNG**

```bash
mkdir -p apps/app/public/wallet-textures
curl -o apps/app/public/wallet-textures/leather.png https://www.transparenttextures.com/patterns/leather.png
```

Confirm the file is a valid PNG and is roughly 2-15 KB (it's a small tileable pattern):

```bash
file apps/app/public/wallet-textures/leather.png
ls -lh apps/app/public/wallet-textures/leather.png
```

Expected: `PNG image data` and size in kilobytes range. If the download fails or returns HTML, manually save the PNG from a browser at the same URL and place it at that path.

- [ ] **Step 2: Add attribution**

Create `apps/app/public/wallet-textures/LICENSE.md`:

```markdown
# Wallet Texture Assets

## leather.png

- **Source:** https://www.transparenttextures.com/leather.html
- **Author:** Atle Mo
- **License:** Free for commercial use (https://www.transparenttextures.com/)
- **Use:** Wallet card background overlay for the SmartPockets "Literal Leather" variant (Linear issue CROWDEV-420, Variant A)
```

- [ ] **Step 3: Commit**

```bash
git add apps/app/public/wallet-textures/
git commit -m "chore: add leather texture asset for Literal Leather variant

Downloaded from transparenttextures.com (free for commercial use).
Hosted locally so the variant doesn't depend on a 3rd-party CDN at
runtime.

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Implement `TiltCard.tsx` (Aceternity-style 3D tilt)

**Files:**
- Create: `apps/app/src/components/wallets/variants/leather/TiltCard.tsx`

Adapted from [Aceternity 3D Card Effect](https://ui.aceternity.com/components/3d-card-effect). Small mouse-tracked 3D tilt; caps at the spec's ~3° amplitude.

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/components/wallets/variants/leather/TiltCard.tsx
"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

interface TiltCardProps {
  children: React.ReactNode;
  /** Maximum tilt angle in degrees. Default 3 per spec §6 Variant A. */
  maxTilt?: number;
  className?: string;
}

/**
 * Subtle 3D tilt wrapper for the Literal Leather variant. Mouse position
 * inside the bounds maps to a small rotation on X/Y axes (capped at ±maxTilt).
 *
 * Spring-eased so the tilt feels material — heavy bifold, not a glass card.
 */
export function TiltCard({
  children,
  maxTilt = 3,
  className,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt]);

  const springConfig = { stiffness: 250, damping: 22 };
  const rotateXSpring = useSpring(rotateX, springConfig);
  const rotateYSpring = useSpring(rotateY, springConfig);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(relX);
    y.set(relY);
  };

  const onMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        perspective: 1000,
        rotateX: rotateXSpring,
        rotateY: rotateYSpring,
        transformStyle: "preserve-3d",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/app && bun typecheck
git add apps/app/src/components/wallets/variants/leather/TiltCard.tsx
git commit -m "feat(wallets): TiltCard for leather variant (~3° max tilt)

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Implement `MiniCardPreview.tsx` (3 cards peeking from top)

**Files:**
- Create: `apps/app/src/components/wallets/variants/leather/MiniCardPreview.tsx`

Three cards visibly tucked into the top of the wallet; the existing fan-out spring motion on hover is preserved.

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/components/wallets/variants/leather/MiniCardPreview.tsx
"use client";

import { motion } from "motion/react";
import { brandColors } from "../../shared";
import { cx } from "@repo/ui/utils";

interface PreviewProps {
  cards: Array<{ brand?: string; lastFour?: string; displayName: string; _id: string }>;
  isHovered: boolean;
}

/**
 * Literal Leather mini-card preview: cards visibly tucked into the top
 * of the wallet, with brand-colored top edges showing. On hover, cards
 * fan upward like pulling them halfway out of the wallet.
 */
export function MiniCardPreview({ cards, isHovered }: PreviewProps) {
  if (cards.length === 0) {
    return null; // Empty state rendered by WalletCard, not here
  }

  const previewCards = cards.slice(0, 3);

  return (
    <div className="absolute -top-2 left-7 right-7 z-20 pointer-events-none">
      {previewCards.map((card, index) => {
        const colors = brandColors[card.brand ?? "other"] ?? brandColors.other!;
        const baseY = -index * 1; // tightly stacked at rest
        const hoverY = -(index + 1) * 14; // fan up on hover

        return (
          <motion.div
            key={card._id}
            className={cx(
              "absolute left-0 right-0 h-7 rounded-md bg-gradient-to-br",
              colors.bg
            )}
            style={{
              top: index * 6,
              zIndex: previewCards.length - index,
              boxShadow:
                "0 3px 6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
            initial={false}
            animate={{
              y: isHovered ? hoverY : baseY,
              rotate: isHovered ? (index - 1) * 4 : 0,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            {/* brand chip + last 4 visible on hover */}
            <motion.div
              className="flex h-full items-center justify-between px-3"
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <span
                className={cx("h-1.5 w-6 rounded", colors.accent)}
                style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)" }}
              />
              {card.lastFour && (
                <span
                  className="text-[9px] tracking-wider text-white/75"
                  style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
                >
                  •••• {card.lastFour}
                </span>
              )}
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/app && bun typecheck
git add apps/app/src/components/wallets/variants/leather/MiniCardPreview.tsx
git commit -m "feat(wallets): leather MiniCardPreview — 3 cards tucked in

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Implement `ExtendedStats.tsx` ("receipt" panel)

**Files:**
- Create: `apps/app/src/components/wallets/variants/leather/ExtendedStats.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/components/wallets/variants/leather/ExtendedStats.tsx
"use client";

import { motion, AnimatePresence } from "motion/react";
import { cx } from "@repo/ui/utils";
import { formatMoneyFromDollars } from "@/utils/money";

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

/**
 * Literal Leather extended stats: a parchment "receipt" sliding below
 * the wallet. Off-white background, serif numerals, dark ink.
 */
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
            className="relative grid grid-cols-2 gap-3 rounded-sm p-4 text-sm"
            style={{
              background:
                "linear-gradient(180deg, #f5efdf 0%, #ebe2cb 100%)",
              boxShadow:
                "0 2px 4px rgba(40,30,15,0.25), inset 0 1px 0 rgba(255,250,235,0.5), inset 0 -1px 0 rgba(120,90,50,0.15)",
              color: "#3a2e1b",
            }}
          >
            {/* receipt top edge — perforation effect */}
            <span
              className="pointer-events-none absolute -top-1 left-0 right-0 h-1"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 4px 0, transparent 2px, #ebe2cb 2px)",
                backgroundSize: "8px 8px",
                backgroundPosition: "0 -3px",
                backgroundRepeat: "repeat-x",
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
                  ? "text-emerald-700"
                  : (walletStats.averageUtilization ?? 0) < 70
                    ? "text-amber-700"
                    : "text-red-800"
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
    <div>
      <p
        className="text-[10px] uppercase tracking-[0.18em]"
        style={{
          color: "rgba(58,46,27,0.55)",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        {label}
      </p>
      <p
        className={cx("mt-0.5 font-medium", valueClassName)}
        style={{
          color: "#3a2e1b",
          fontFamily: "var(--font-fraunces), Georgia, serif",
          fontSize: 16,
        }}
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
git add apps/app/src/components/wallets/variants/leather/ExtendedStats.tsx
git commit -m "feat(wallets): leather ExtendedStats receipt panel

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Implement `WalletCard.tsx`

**Files:**
- Create: `apps/app/src/components/wallets/variants/leather/WalletCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/components/wallets/variants/leather/WalletCard.tsx
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
import { TiltCard } from "./TiltCard";

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

  const isEmpty = previewCards.length === 0;

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
      data-variant="leather"
      className="group relative cursor-pointer pt-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <TiltCard maxTilt={3}>
        {/* The wallet itself — leather material */}
        <div
          className="relative h-48 overflow-hidden rounded"
          style={{
            // Composite layers from outer to inner: gradient, radial highlights, leather PNG texture
            backgroundImage:
              "url('/wallet-textures/leather.png'), radial-gradient(ellipse at 30% 25%, rgba(255,200,140,0.08), transparent 50%), radial-gradient(ellipse at 75% 75%, rgba(0,0,0,0.4), transparent 60%), linear-gradient(135deg, #5a3a25 0%, #3f2818 60%, #2c1b10 100%)",
            backgroundBlendMode: "overlay, normal, normal, normal",
            boxShadow:
              "inset 0 1px 0 rgba(255,210,160,0.22), inset 0 -3px 8px rgba(0,0,0,0.55), inset 0 0 60px rgba(0,0,0,0.3), 0 22px 50px rgba(0,0,0,0.7), 0 6px 14px rgba(0,0,0,0.5)",
          }}
        >
          {/* Stitching — dashed inset border */}
          <span
            className="pointer-events-none absolute inset-3 rounded"
            style={{
              border: "1px dashed rgba(225,185,140,0.32)",
            }}
          />

          {/* Cards tucked into the wallet — uses fan-out motion from MiniCardPreview */}
          {!isEmpty && <MiniCardPreview cards={previewCards} isHovered={isHovered} />}

          {/* Empty state */}
          {isEmpty && (
            <div className="absolute inset-6 flex items-center justify-center">
              <span
                className="text-sm italic"
                style={{
                  color: "rgba(225,185,140,0.55)",
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  textShadow: "0 1px 0 rgba(0,0,0,0.4)",
                }}
              >
                Empty wallet
              </span>
            </div>
          )}

          {/* Champagne foil pin dot */}
          {wallet.isPinned && (
            <span
              className="pointer-events-none absolute right-6 top-6 h-2.5 w-2.5 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, #f0e4c0, #c4b287)",
                boxShadow:
                  "0 0 10px rgba(212,197,156,0.5), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.2)",
              }}
              aria-label="Pinned"
            />
          )}

          {/* Wallet name + count, debossed serif */}
          <div className="absolute bottom-5 left-7 right-7">
            {isRenaming ? (
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleRenameKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="w-full min-w-0 rounded border bg-transparent px-1.5 py-0.5 italic outline-none focus-visible:ring-2 focus-visible:ring-amber-200/40"
                style={{
                  borderColor: "rgba(225,185,140,0.6)",
                  color: "rgba(255,220,180,0.95)",
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  fontSize: 22,
                }}
              />
            ) : (
              <h3
                className="truncate"
                style={{
                  color: "rgba(255,220,180,0.78)",
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 22,
                  fontWeight: 400,
                  letterSpacing: "0.01em",
                  textShadow:
                    "0 1px 0 rgba(0,0,0,0.7), 0 -1px 0 rgba(255,210,160,0.1)",
                }}
              >
                {wallet.name}
              </h3>
            )}
            <p
              className="mt-1 text-[10px]"
              style={{
                color: "rgba(225,185,140,0.55)",
                fontFamily: "Georgia, 'Times New Roman', serif",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
              }}
            >
              {wallet.cardCount} {wallet.cardCount === 1 ? "card" : "cards"}
              {wallet.isPinned ? " · pinned" : ""}
            </p>
          </div>

          {/* Dropdown — top-right corner */}
          <span
            onClick={(e) => e.stopPropagation()}
            className="absolute right-3 top-3 flex items-center"
          >
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
      </TiltCard>

      <ExtendedStats isExtended={isExtended} walletStats={walletStats} />
    </motion.div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/app && bun typecheck
git add apps/app/src/components/wallets/variants/leather/WalletCard.tsx
git commit -m "feat(wallets): leather WalletCard with stitching + 3D tilt

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Implement `SortableWalletCard.tsx`

**Files:**
- Create: `apps/app/src/components/wallets/variants/leather/SortableWalletCard.tsx`

- [ ] **Step 1: Create the wrapper**

```tsx
// apps/app/src/components/wallets/variants/leather/SortableWalletCard.tsx
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
      {/* leather grip — a small embossed shape on the left edge */}
      <div
        {...attributes}
        {...listeners}
        className={cx(
          "absolute -left-2 top-1/2 z-20 h-9 w-1.5 -translate-y-1/2 cursor-grab rounded-r",
          "opacity-0 transition-opacity group-hover:opacity-100",
          isDragging && "cursor-grabbing opacity-100"
        )}
        style={{
          background: "linear-gradient(90deg, rgba(0,0,0,0.6), transparent)",
          boxShadow: "inset 0 1px 0 rgba(225,185,140,0.3)",
        }}
        aria-label="Drag to reorder"
      >
        {/* two thin tan lines suggesting stitched grip */}
        <span
          className="pointer-events-none absolute left-0.5 right-0.5 h-px"
          style={{ top: 8, background: "rgba(225,185,140,0.4)" }}
        />
        <span
          className="pointer-events-none absolute left-0.5 right-0.5 h-px"
          style={{ bottom: 8, background: "rgba(225,185,140,0.4)" }}
        />
      </div>
      <WalletCard {...props} />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/app && bun typecheck
git add apps/app/src/components/wallets/variants/leather/SortableWalletCard.tsx
git commit -m "feat(wallets): leather SortableWalletCard with embossed grip

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Swap import in `WalletsContent.tsx`

**Files:**
- Modify: `apps/app/src/components/wallets/WalletsContent.tsx`

- [ ] **Step 1: Edit the import**

```diff
- import { SortableWalletCard, WalletCard } from "./WalletCard";
+ import { SortableWalletCard } from "./variants/leather/SortableWalletCard";
```

- [ ] **Step 2: Run full verification**

```bash
cd apps/app && bun typecheck && bun lint && bun build
```

- [ ] **Step 3: Commit**

```bash
git add apps/app/src/components/wallets/WalletsContent.tsx
git commit -m "feat(wallets): route to leather variant on this branch

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Write the Playwright smoke test

**Files:**
- Create: `apps/app/tests/wallets-variant-leather.spec.ts`

- [ ] **Step 1: Create the test**

```ts
// apps/app/tests/wallets-variant-leather.spec.ts
import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) throw new Error("NEXT_PUBLIC_CONVEX_URL not set");

const NAME_PREFIX = "LeatherTest-";

test.describe("Variant A — Literal Leather (CROWDEV-XXX)", () => {
  let convex: ConvexHttpClient;
  let createdWalletIds: string[] = [];

  test.beforeAll(async () => {
    convex = new ConvexHttpClient(CONVEX_URL);
  });

  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
    // Seed two wallets (pattern from wallets-baseline.spec.ts)
  });

  test.afterEach(async () => {
    for (const id of createdWalletIds) {
      try {
        await convex.mutation(api.wallets.mutations.remove, { walletId: id as any });
      } catch {}
    }
    createdWalletIds = [];
  });

  test("renders with data-variant='leather'", async ({ page }) => {
    await page.goto("/wallets");
    await expect(
      page.locator("[data-testid='wallet-card']").first()
    ).toHaveAttribute("data-variant", "leather");
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

  test("extended-view toggle reveals stats receipt", async ({ page }) => {
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

  test("leather texture asset loads (no broken image)", async ({ page }) => {
    const failedResources: string[] = [];
    page.on("response", (resp) => {
      if (!resp.ok() && resp.url().includes("/wallet-textures/")) {
        failedResources.push(resp.url());
      }
    });
    await page.goto("/wallets");
    await page.waitForLoadState("networkidle");
    expect(failedResources).toEqual([]);
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
cd apps/app
bun test:e2e wallets-variant-leather.spec.ts
git add apps/app/tests/wallets-variant-leather.spec.ts
git commit -m "test(wallets): smoke spec for leather variant

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Manual visual check

**Files:**
- None

- [ ] **Step 1: Run dev server**

```bash
bun dev:app
```

- [ ] **Step 2: Visual walkthrough**

At `localhost:3000/wallets`, verify against §6 Variant A:

- [ ] Wallet has clear cognac-brown leather material with visible grain texture (from leather.png overlay)
- [ ] Dashed stitching forms an inset rectangle inside the wallet edges
- [ ] 3 cards visibly tucked at the top of the wallet, brand-colored edges showing
- [ ] On hover: cards fan up; full chip + last-4 become visible; wallet tilts subtly (~3°)
- [ ] Wallet name in Fraunces italic, looks debossed (subtle highlight + shadow)
- [ ] Card count in Georgia small caps, tan tone, letter-spaced
- [ ] Pinned wallets show champagne metal-foil dot top-right with a soft halo
- [ ] Drag grip: small embossed strip on left edge, visible on hover
- [ ] Toggle "Details" → parchment "receipt" slides below with Fraunces serif numerals
- [ ] Empty wallet (0 cards): "Empty wallet" in Fraunces italic over the leather

- [ ] **Step 3: Console check**

No console errors or warnings on `/wallets`. No broken-image requests for `/wallet-textures/leather.png`.

---

### Task 11: Submit + Linear update

- [ ] **Step 1: Full verification suite**

```bash
cd apps/app && bun typecheck && bun lint && bun build && bun test:e2e wallets-variant-leather.spec.ts
```

- [ ] **Step 2: Submit via Graphite**

```bash
gt submit
```

- [ ] **Step 3: Verify Vercel preview**

```bash
gh pr checks <PR_NUMBER>
```

- [ ] **Step 4: Post Linear comment + In Review**

```
Variant A (Literal Leather) submitted.

**PR:** https://app.graphite.com/github/pr/EricJamesCrow/smartpockets/<PR_NUMBER>
**Preview:** <Vercel URL>

**Implementation:**
- `variants/leather/` — WalletCard, MiniCardPreview, ExtendedStats, SortableWalletCard, TiltCard
- `public/wallet-textures/leather.png` — locally-hosted leather texture (CC, attribution in LICENSE.md)
- `WalletsContent.tsx` — one-line import swap

**Design choices vs spec §6:**
- Cognac leather gradient + Transparent Textures PNG via `background-blend-mode: overlay`
- Dashed stitching inset, warm-tan thread tone
- Cards fan up out of wallet on hover (preserved existing motion, layered with TiltCard's ~3° tilt)
- Fraunces italic wallet name with debossed text-shadow
- Champagne foil pin dot with radial highlight + halo
- Parchment "receipt" extended stats panel with perforated top edge
- "Empty wallet" Fraunces italic in tan on bare leather

**Smoke test:** all 9 must-keep features + a leather texture load check pass.

**Note on optional R3F upgrade:** spec §6 mentioned an optional path to render a true 3D GLTF wallet via React Three Fiber. NOT implemented in this PR (~1 extra day, +120kb bundle, drag-interop work). If desired, file a follow-up sub-issue.

Ready for visual review.
```

---

## Self-Review checklist

- [ ] Leather texture PNG downloaded locally to `apps/app/public/wallet-textures/` with attribution.
- [ ] Fraunces italic for wallet name (uses existing `--font-fraunces` CSS variable).
- [ ] 3D tilt capped at 3° via `maxTilt` prop on `TiltCard`.
- [ ] Stitching is `1px dashed` border inset, not part of the texture.
- [ ] All 9 must-keep features asserted in smoke test, plus an asset-load check.
- [ ] No new npm dependencies.

---

## Out of scope

- React Three Fiber 3D leather wallet — separate sub-issue if desired
- Multiple leather color options (e.g., black, tan) — spec calls for one cognac color
- Animation of stitching (e.g., pulsing on pin) — not in spec
- Mobile-specific touch tilt — desktop hover only

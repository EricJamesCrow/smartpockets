# CROWDEV-420 — Variant C: Champagne Leather Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the **Champagne Leather** variant — the wallet metaphor of Variant A interpreted in the app's champagne tones. Same skeuomorphic shape (stitched bifold with cards tucked at the top), but the leather is champagne-warm instead of cognac. Wallet name in dark-ink Fraunces italic with subtle foil-emboss highlight. Hybrid of A (leather metaphor) and B (in-palette discipline) — shares ~70% of A's CSS with re-coloring.

**Architecture:** New directory `variants/champagne-leather/`. Re-uses the locally-hosted leather texture from Variant A's `public/wallet-textures/`; uses CSS `background-blend-mode` + filter `hue-rotate` to recolor the brown texture to champagne. Stitching is dark-ink at 35% opacity. The same `TiltCard` pattern but at lower amplitude (~2° vs A's ~3°).

**Tech Stack:** Tailwind v4, Motion v12, locally-hosted PNG texture (Variant A's), no new npm dependencies.

**Parent spec:** [`docs/superpowers/specs/2026-05-12-crowdev-420-wallets-aesthetic-multi-variant-design.md`](../specs/2026-05-12-crowdev-420-wallets-aesthetic-multi-variant-design.md) §6 (Variant C)

**Dependency:** Requires the Prep PR. **Optionally also depends on Variant A's PR being merged first** — if A merges, the leather PNG is already on `main` and we don't need to download it again. If A hasn't merged yet, this plan re-downloads the PNG (idempotent — same file, same path).

**Build last:** Per §9 of the spec, build C last among the variants. It reuses concepts validated by A (leather material) and B (palette discipline), so building it earlier risks integrating against patterns that haven't been verified.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `apps/app/public/wallet-textures/leather.png` | Same asset as Variant A. Download if not already present. |
| `variants/champagne-leather/WalletCard.tsx` | Variant component — champagne leather material + stitching + cards-peeking + dark-ink name |
| `variants/champagne-leather/MiniCardPreview.tsx` | 2 cards peeking from top (one fewer than A — more restraint) |
| `variants/champagne-leather/ExtendedStats.tsx` | Stats panel in matching champagne-grain material |
| `variants/champagne-leather/SortableWalletCard.tsx` | Drag wrapper with subtle leather grip in dark ink |
| `variants/champagne-leather/TiltCard.tsx` | Mouse-tracked 3D tilt at ~2° (less than A) |

### Modified files

| Path | Change |
|---|---|
| `apps/app/src/components/wallets/WalletsContent.tsx` | One-line import swap |
| `apps/app/tests/wallets-variant-champagne-leather.spec.ts` | **New** smoke test for all 9 must-keep features |

### Branch & PR

- Branch: `crowdev-420-c-champagne` (stacked on `crowdev-420-prep`)
- PR title: `feat(wallets): variant C — Champagne Leather (CROWDEV-XXX)`

---

## Tasks

### Task 1: Linear sub-issue + Graphite branch

**Files:**
- None

- [ ] **Step 1: Create Linear sub-issue**

Linear MCP `save_issue`: parent `CROWDEV-420`, title `Variant C — Champagne Leather`, copy §6 Variant C as description. Record `CROWDEV-XXX`.

- [ ] **Step 2: Branch on prep**

```bash
git fetch origin
gt checkout crowdev-420-prep
gt create -m "feat(wallets): variant C — Champagne Leather (CROWDEV-XXX)" crowdev-420-c-champagne
```

- [ ] **Step 3: Linear starting comment + In Progress**

---

### Task 2: Ensure leather texture asset exists

**Files:**
- Create (if not present): `apps/app/public/wallet-textures/leather.png`
- Create (if not present): `apps/app/public/wallet-textures/LICENSE.md`

The asset may already exist if Variant A merged first. This task is idempotent.

- [ ] **Step 1: Check if the asset is present**

```bash
ls -lh apps/app/public/wallet-textures/leather.png 2>&1
```

- [ ] **Step 2: If absent, download it (same as Variant A Task 2)**

```bash
mkdir -p apps/app/public/wallet-textures
curl -o apps/app/public/wallet-textures/leather.png https://www.transparenttextures.com/patterns/leather.png
file apps/app/public/wallet-textures/leather.png
```

Then create `apps/app/public/wallet-textures/LICENSE.md`:

```markdown
# Wallet Texture Assets

## leather.png

- **Source:** https://www.transparenttextures.com/leather.html
- **Author:** Atle Mo
- **License:** Free for commercial use (https://www.transparenttextures.com/)
- **Use:** Wallet card background overlay for the SmartPockets "Literal Leather" and "Champagne Leather" variants (Linear issue CROWDEV-420, Variants A and C)
```

- [ ] **Step 3: Commit (only if files were added)**

If the texture and LICENSE.md were newly added:

```bash
git add apps/app/public/wallet-textures/
git commit -m "chore: add leather texture asset for Champagne Leather variant

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

If they were already present (because Variant A merged first), skip this commit.

---

### Task 3: Implement `TiltCard.tsx` (lower-amplitude tilt)

**Files:**
- Create: `apps/app/src/components/wallets/variants/champagne-leather/TiltCard.tsx`

Same shape as Variant A's `TiltCard`, but default `maxTilt=2` instead of 3.

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/components/wallets/variants/champagne-leather/TiltCard.tsx
"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

interface TiltCardProps {
  children: React.ReactNode;
  /** Maximum tilt angle in degrees. Default 2 (less than Variant A's 3) per spec §6 Variant C. */
  maxTilt?: number;
  className?: string;
}

/**
 * Subtle 3D tilt for the Champagne Leather variant. Smaller amplitude
 * than Variant A — champagne reads more restrained than cognac brown,
 * and reduced tilt reinforces that restraint.
 */
export function TiltCard({
  children,
  maxTilt = 2,
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
git add apps/app/src/components/wallets/variants/champagne-leather/TiltCard.tsx
git commit -m "feat(wallets): champagne-leather TiltCard (~2° max tilt)

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Implement `MiniCardPreview.tsx` (2 cards peeking — one fewer than A)

**Files:**
- Create: `apps/app/src/components/wallets/variants/champagne-leather/MiniCardPreview.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/components/wallets/variants/champagne-leather/MiniCardPreview.tsx
"use client";

import { motion } from "motion/react";
import { brandColors } from "../../shared";
import { cx } from "@repo/ui/utils";

interface PreviewProps {
  cards: Array<{ brand?: string; lastFour?: string; displayName: string; _id: string }>;
  isHovered: boolean;
}

/**
 * Champagne Leather mini-card preview: 2 cards visibly tucked into the
 * top of the wallet (one fewer than Variant A — more restrained). Same
 * fan-up-on-hover motion as A, with slightly reduced spread.
 */
export function MiniCardPreview({ cards, isHovered }: PreviewProps) {
  if (cards.length === 0) {
    return null;
  }

  const previewCards = cards.slice(0, 2); // 2 cards, not 3 like Variant A

  return (
    <div className="absolute -top-2 left-8 right-8 z-20 pointer-events-none">
      {previewCards.map((card, index) => {
        const colors = brandColors[card.brand ?? "other"] ?? brandColors.other!;
        const baseY = -index * 1;
        const hoverY = -(index + 1) * 12;

        return (
          <motion.div
            key={card._id}
            className={cx(
              "absolute left-0 right-0 h-6.5 rounded-md bg-gradient-to-br",
              colors.bg
            )}
            style={{
              top: index * 5,
              zIndex: previewCards.length - index,
              boxShadow:
                "0 3px 6px rgba(40,30,15,0.4), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
            initial={false}
            animate={{
              y: isHovered ? hoverY : baseY,
              rotate: isHovered ? (index - 0.5) * 3 : 0,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
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

**Tailwind note:** `h-6.5` may not be in Tailwind v4's default spacing scale. If it errors out, replace with `style={{ height: 26 }}` on the card div.

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/app && bun typecheck
git add apps/app/src/components/wallets/variants/champagne-leather/MiniCardPreview.tsx
git commit -m "feat(wallets): champagne-leather MiniCardPreview — 2 cards tucked

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Implement `ExtendedStats.tsx` (champagne-grain panel)

**Files:**
- Create: `apps/app/src/components/wallets/variants/champagne-leather/ExtendedStats.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/components/wallets/variants/champagne-leather/ExtendedStats.tsx
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
 * Champagne Leather stats panel: champagne-grain material matching the
 * wallet, dark-ink serif type. Same composition as the wallet to read
 * as part of the holder.
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
            className="relative grid grid-cols-2 gap-3 rounded p-4 text-sm"
            style={{
              backgroundImage:
                "url('/wallet-textures/leather.png'), radial-gradient(ellipse at 30% 25%, rgba(255,245,210,0.18), transparent 60%), linear-gradient(135deg, #d4c59c 0%, #b8a878 60%, #8c7e54 100%)",
              backgroundBlendMode: "overlay, normal, normal",
              boxShadow:
                "0 8px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,245,215,0.5), inset 0 -1px 0 rgba(80,65,30,0.18)",
              color: "#2a2218",
            }}
          >
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
                  ? "text-emerald-800"
                  : (walletStats.averageUtilization ?? 0) < 70
                    ? "text-amber-800"
                    : "text-red-900"
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
          color: "rgba(50,40,20,0.55)",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        {label}
      </p>
      <p
        className={cx("mt-0.5 font-medium", valueClassName)}
        style={{
          color: "#2a2218",
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
git add apps/app/src/components/wallets/variants/champagne-leather/ExtendedStats.tsx
git commit -m "feat(wallets): champagne-leather ExtendedStats with champagne-grain

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Implement `WalletCard.tsx`

**Files:**
- Create: `apps/app/src/components/wallets/variants/champagne-leather/WalletCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/components/wallets/variants/champagne-leather/WalletCard.tsx
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
      data-variant="champagne-leather"
      className="group relative cursor-pointer pt-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <TiltCard maxTilt={2}>
        <div
          className="relative h-48 overflow-hidden rounded"
          style={{
            backgroundImage:
              "url('/wallet-textures/leather.png'), radial-gradient(ellipse at 30% 25%, rgba(255,245,210,0.18), transparent 60%), linear-gradient(135deg, #d4c59c 0%, #b8a878 60%, #8c7e54 100%)",
            backgroundBlendMode: "overlay, normal, normal",
            boxShadow:
              "inset 0 1px 0 rgba(255,245,215,0.55), inset 0 -3px 10px rgba(50,40,20,0.35), inset 0 0 50px rgba(80,65,30,0.15), 0 22px 50px rgba(0,0,0,0.55), 0 6px 14px rgba(0,0,0,0.4)",
          }}
        >
          {/* Stitching — dashed in dark ink at 35% */}
          <span
            className="pointer-events-none absolute inset-3 rounded"
            style={{
              border: "1px dashed rgba(80,65,30,0.35)",
            }}
          />

          {!isEmpty && <MiniCardPreview cards={previewCards} isHovered={isHovered} />}

          {isEmpty && (
            <div className="absolute inset-6 flex items-center justify-center">
              <span
                className="text-sm italic"
                style={{
                  color: "rgba(50,40,20,0.55)",
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  textShadow: "0 1px 0 rgba(255,245,215,0.4)",
                }}
              >
                Empty
              </span>
            </div>
          )}

          {/* Champagne metal-foil pin dot */}
          {wallet.isPinned && (
            <span
              className="pointer-events-none absolute right-6 top-6 h-2.5 w-2.5 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, #fffaeb, #c4b287)",
                boxShadow:
                  "0 1px 3px rgba(50,40,20,0.4), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(0,0,0,0.2)",
              }}
              aria-label="Pinned"
            />
          )}

          {/* Wallet name + count, dark-ink Fraunces italic with foil-emboss */}
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
                className="w-full min-w-0 rounded border bg-transparent px-1.5 py-0.5 italic outline-none focus-visible:ring-2 focus-visible:ring-amber-900/30"
                style={{
                  borderColor: "rgba(80,65,30,0.5)",
                  color: "#2a2218",
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  fontSize: 22,
                }}
              />
            ) : (
              <h3
                className="truncate"
                style={{
                  color: "#2a2218",
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: "0.005em",
                  textShadow:
                    "0 1px 0 rgba(255,245,215,0.5), 0 -1px 0 rgba(80,65,30,0.2)",
                }}
              >
                {wallet.name}
              </h3>
            )}
            <p
              className="mt-1 text-[10px]"
              style={{
                color: "rgba(50,40,20,0.6)",
                fontFamily: "Georgia, 'Times New Roman', serif",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
              }}
            >
              {wallet.cardCount} {wallet.cardCount === 1 ? "card" : "cards"}
              {wallet.isPinned ? " · pinned" : ""}
            </p>
          </div>

          {/* Dropdown */}
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
git add apps/app/src/components/wallets/variants/champagne-leather/WalletCard.tsx
git commit -m "feat(wallets): champagne-leather WalletCard with dark-ink serif name

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Implement `SortableWalletCard.tsx`

**Files:**
- Create: `apps/app/src/components/wallets/variants/champagne-leather/SortableWalletCard.tsx`

- [ ] **Step 1: Create the wrapper**

```tsx
// apps/app/src/components/wallets/variants/champagne-leather/SortableWalletCard.tsx
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
      {/* Subtle leather grip in dark ink */}
      <div
        {...attributes}
        {...listeners}
        className={cx(
          "absolute -left-2 top-1/2 z-20 h-9 w-1.5 -translate-y-1/2 cursor-grab rounded-r",
          "opacity-0 transition-opacity group-hover:opacity-100",
          isDragging && "cursor-grabbing opacity-100"
        )}
        style={{
          background:
            "linear-gradient(90deg, rgba(80,65,30,0.5), transparent)",
          boxShadow: "inset 0 1px 0 rgba(255,245,215,0.3)",
        }}
        aria-label="Drag to reorder"
      >
        <span
          className="pointer-events-none absolute left-0.5 right-0.5 h-px"
          style={{ top: 8, background: "rgba(80,65,30,0.5)" }}
        />
        <span
          className="pointer-events-none absolute left-0.5 right-0.5 h-px"
          style={{ bottom: 8, background: "rgba(80,65,30,0.5)" }}
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
git add apps/app/src/components/wallets/variants/champagne-leather/SortableWalletCard.tsx
git commit -m "feat(wallets): champagne-leather SortableWalletCard

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
+ import { SortableWalletCard } from "./variants/champagne-leather/SortableWalletCard";
```

- [ ] **Step 2: Full verification**

```bash
cd apps/app && bun typecheck && bun lint && bun build
```

- [ ] **Step 3: Commit**

```bash
git add apps/app/src/components/wallets/WalletsContent.tsx
git commit -m "feat(wallets): route to champagne-leather variant

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Write the Playwright smoke test

**Files:**
- Create: `apps/app/tests/wallets-variant-champagne-leather.spec.ts`

- [ ] **Step 1: Create the test**

```ts
// apps/app/tests/wallets-variant-champagne-leather.spec.ts
import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) throw new Error("NEXT_PUBLIC_CONVEX_URL not set");

const NAME_PREFIX = "ChampagneLeatherTest-";

test.describe("Variant C — Champagne Leather (CROWDEV-XXX)", () => {
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

  test("renders with data-variant='champagne-leather'", async ({ page }) => {
    await page.goto("/wallets");
    await expect(
      page.locator("[data-testid='wallet-card']").first()
    ).toHaveAttribute("data-variant", "champagne-leather");
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
bun test:e2e wallets-variant-champagne-leather.spec.ts
git add apps/app/tests/wallets-variant-champagne-leather.spec.ts
git commit -m "test(wallets): smoke spec for champagne-leather variant

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

At `localhost:3000/wallets`, verify against §6 Variant C. The key question this variant has to answer:

> **Does it land as "premium champagne leather" or "tacky gold"?**

If the brown undertones of the leather PNG show through too strongly under the champagne gradient, the variant will read as cheap. The mitigation in the spec is the dark-ink stitching at 35% opacity + the strong gradient that overpowers the texture except in highlights.

Verify:
- [ ] Wallet color reads as champagne — warm, restrained, not orange or yellow
- [ ] Leather grain is visible only at close range (the `background-blend-mode: overlay` keeps it subtle)
- [ ] Dashed dark-ink stitching is visible but quiet — not a brown thread that fights the palette
- [ ] Wallet name in Fraunces italic dark ink with soft foil-emboss highlight
- [ ] Champagne pin dot at top-right, lighter than Variant A's (more cream/pearl, less brown)
- [ ] Cards peeking at the top: 2 (not 3 like A)
- [ ] Hover: subtle ~2° tilt (less than A), cards fan up
- [ ] Extended-view receipt panel matches the wallet's champagne material
- [ ] No console errors

**If the variant feels tacky/cheap:** the spec acknowledged this as the highest aesthetic risk (§12). Decide during review whether to ship anyway or note it as "missed" for the decision phase.

---

### Task 11: Submit + Linear update

- [ ] **Step 1: Full verification**

```bash
cd apps/app && bun typecheck && bun lint && bun build && bun test:e2e wallets-variant-champagne-leather.spec.ts
```

- [ ] **Step 2: Submit**

```bash
gt submit
```

- [ ] **Step 3: Verify Vercel preview**

```bash
gh pr checks <PR_NUMBER>
```

- [ ] **Step 4: Post Linear comment + In Review**

```
Variant C (Champagne Leather) submitted.

**PR:** https://app.graphite.com/github/pr/EricJamesCrow/smartpockets/<PR_NUMBER>
**Preview:** <Vercel URL>

**Implementation:**
- `variants/champagne-leather/` — WalletCard, MiniCardPreview, ExtendedStats, SortableWalletCard, TiltCard
- Reuses `public/wallet-textures/leather.png` (same asset as Variant A, hosted locally)
- `WalletsContent.tsx` — one-line import swap

**Design choices vs spec §6:**
- Champagne gradient (`#d4c59c → #b8a878 → #8c7e54`) + leather PNG via `background-blend-mode: overlay`
- Dashed stitching in dark ink at 35% opacity — visible but quiet
- 2 cards peek at top (fewer than A's 3 — more restraint)
- Fraunces italic dark-ink wallet name with foil-emboss text-shadow
- Champagne metal-foil pin dot, lighter than A
- Smaller ~2° tilt (vs A's ~3°) reinforces restraint
- Receipt-panel extended stats matches the champagne material

**Aesthetic risk acknowledged (spec §12):** this is the variant most likely to miss — could read "tacky gold" rather than "premium champagne tonal." Visual review recommended.

**Smoke test:** all 9 must-keep features + texture-load check pass.

Ready for visual review.
```

---

## Self-Review checklist

- [ ] Re-uses Variant A's leather PNG asset (no duplicate file).
- [ ] Stitching is dark-ink at 35%, not brown at full opacity (would fight the champagne gradient).
- [ ] 2 cards peek (not 3 — restraint vs A).
- [ ] Tilt amplitude is 2° (not 3°).
- [ ] Wallet name uses Fraunces italic in dark ink with foil-emboss text-shadow.
- [ ] All 9 must-keep features asserted in smoke test.
- [ ] No new npm dependencies.

---

## Out of scope

- Re-coloring the leather PNG with CSS `filter: hue-rotate(...)` (tried in §6 mockups but produces inconsistent results across the gradient; spec settled on background-blend-mode overlay instead)
- Champagne color variations (e.g., rose champagne, pale gold) — spec calls for one champagne tone
- 3D R3F option (same as Variant A — out of scope for this PR)

# CROWDEV-420 — Variant D: Architectural Glass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the **Architectural Glass** variant — Vision Pro / iOS 26 Liquid Glass aesthetic. Default per-card pure-CSS Vision-OS glass (cheap `backdrop-filter` blur + edge SVG filters); the *active/hovered* card temporarily upgrades to `liquid-glass-react` with true `feDisplacementMap` + chromatic aberration. **One displacement-instance max per visible viewport.** Chromium-only for full effect; Safari/Firefox fall back to flat tinted glass.

**Architecture:** New directory `variants/glass/`. Three layered components: `GlassCard` (pure-CSS default per-card), `LiquidGlassHover` (drop-in wrapper that swaps in `liquid-glass-react` on hover/focus), and the variant's `WalletCard` composes them. Page-level ambient color blobs added to `WalletsContent.tsx` (stronger than Variant E's). Browser feature detection via `navigator.userAgent` + `CSS.supports("backdrop-filter: url(#filter)")` runs once on mount; non-Chromium gets the flat fallback.

**Tech Stack:** New dependency `liquid-glass-react` (MIT). Tailwind v4, Motion v12, inline SVG `feDisplacementMap`.

**Parent spec:** [`docs/superpowers/specs/2026-05-12-crowdev-420-wallets-aesthetic-multi-variant-design.md`](../specs/2026-05-12-crowdev-420-wallets-aesthetic-multi-variant-design.md) §6 (Variant D)

**Dependency:** Requires the Prep PR. Reading Plan B and Plan E first is helpful — most of the wallet-card shell is shared.

---

## File Structure

### New files (in `apps/app/src/components/wallets/variants/glass/`)

| Path | Responsibility |
|---|---|
| `variants/glass/WalletCard.tsx` | Variant component; composes `GlassCard` + `LiquidGlassHover` |
| `variants/glass/GlassCard.tsx` | Pure-CSS Vision-OS glass card — `backdrop-filter`, inner highlight, edge SVG light. Default render for non-hover, non-Chromium. |
| `variants/glass/LiquidGlassHover.tsx` | Hover-state wrapper that mounts `liquid-glass-react` only while hovered (one instance at a time, max one visible). |
| `variants/glass/MiniCardPreview.tsx` | 3 translucent glass mini-panels stacked inside the wallet (different from B's single hero slot) |
| `variants/glass/ExtendedStats.tsx` | Stats panel as a secondary glass layer (slightly less blurred than the main card) |
| `variants/glass/SortableWalletCard.tsx` | Drag wrapper with semi-transparent grip |
| `variants/glass/use-is-chromium.ts` | Single-mount feature-detection hook for true backdrop-filter SVG support. |

### Modified files

| Path | Change |
|---|---|
| `apps/app/package.json` | Add `liquid-glass-react` to dependencies |
| `apps/app/src/components/wallets/WalletsContent.tsx` | Import swap + ambient color blobs (stronger than E's: moss 32%, champagne 22%) |
| `apps/app/tests/wallets-variant-glass.spec.ts` | **New** smoke test for all 9 must-keep features |

### Branch & PR

- Branch: `crowdev-420-d-glass` (stacked on `crowdev-420-prep`)
- PR title: `feat(wallets): variant D — Architectural Glass (CROWDEV-XXX)`

---

## Tasks

### Task 1: Linear sub-issue + Graphite branch

**Files:**
- None

- [ ] **Step 1: Create Linear sub-issue**

Linear MCP `save_issue`: parent `CROWDEV-420`, title `Variant D — Architectural Glass`, copy §6 Variant D as description. Record `CROWDEV-XXX`.

- [ ] **Step 2: Branch on prep**

```bash
git fetch origin
gt checkout crowdev-420-prep
gt create -m "feat(wallets): variant D — Architectural Glass (CROWDEV-XXX)" crowdev-420-d-glass
```

- [ ] **Step 3: Linear starting comment + In Progress**

---

### Task 2: Install `liquid-glass-react`

**Files:**
- Modify: `apps/app/package.json`
- Modify: `bun.lock`

- [ ] **Step 1: Add the dependency**

```bash
cd apps/app
bun add liquid-glass-react
```

Confirm in `apps/app/package.json` the version is recorded (likely `^1.x.x`). MIT license per the research findings.

- [ ] **Step 2: Verify it builds**

```bash
bun typecheck && bun build
```

Expected: PASS. If TypeScript can't find types, check the package's README for whether to install `@types/...` separately or if types ship inline.

- [ ] **Step 3: Commit**

```bash
git add apps/app/package.json ../../bun.lock
git commit -m "chore: add liquid-glass-react for wallet glass variant

MIT. Used only for the active-hover state of the wallet card (one
instance at a time max). Reference:
https://github.com/rdev/liquid-glass-react

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Implement `use-is-chromium.ts` (feature detection)

**Files:**
- Create: `apps/app/src/components/wallets/variants/glass/use-is-chromium.ts`

- [ ] **Step 1: Create the hook**

```ts
// apps/app/src/components/wallets/variants/glass/use-is-chromium.ts
"use client";

import { useEffect, useState } from "react";

/**
 * Feature-detect support for SVG-as-backdrop-filter (the technique
 * required for true Liquid Glass displacement). Only Chromium-family
 * browsers support it today.
 *
 * Returns `false` initially (SSR-safe) and `true` after mount if both
 * conditions hold:
 *   1. CSS.supports("backdrop-filter: blur(1px)") — base feature
 *   2. user agent is Chrome/Edge/Brave/Arc (not Safari/Firefox)
 *
 * Used by the Glass variant to decide whether to mount `liquid-glass-react`
 * (Chromium) or fall back to a flat tinted glass card (Safari/Firefox).
 */
export function useIsChromium(): boolean {
  const [isChromium, setIsChromium] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent;
    const isFirefox = ua.includes("Firefox");
    const isSafari =
      ua.includes("Safari") && !ua.includes("Chrome") && !ua.includes("Chromium");

    const supportsBackdrop =
      typeof CSS !== "undefined" &&
      CSS.supports("backdrop-filter", "blur(1px)");

    setIsChromium(!isFirefox && !isSafari && supportsBackdrop);
  }, []);

  return isChromium;
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/app && bun typecheck
git add apps/app/src/components/wallets/variants/glass/use-is-chromium.ts
git commit -m "feat(wallets): add useIsChromium feature detect for glass variant

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Implement `GlassCard.tsx` (pure-CSS Vision-OS glass)

**Files:**
- Create: `apps/app/src/components/wallets/variants/glass/GlassCard.tsx`

This is the default per-card render (used outside of hover, and as the fallback for non-Chromium).

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/components/wallets/variants/glass/GlassCard.tsx
"use client";

import { cx } from "@repo/ui/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Pure-CSS Vision-OS-style glass card. Uses backdrop-filter blur, inner
 * highlights, and an edge gradient. Renders without any JS dependency
 * and without the per-element SVG displacement filter (which would
 * tank scroll perf if applied per-card).
 *
 * The Glass variant wraps this in `LiquidGlassHover` which only swaps
 * to the real-displacement `liquid-glass-react` while a single card is
 * hovered.
 */
export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div
      className={cx("relative overflow-hidden rounded-[22px]", className)}
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
        backdropFilter: "blur(28px) saturate(1.3)",
        WebkitBackdropFilter: "blur(28px) saturate(1.3)",
        border: "1px solid rgba(255,255,255,0.16)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(255,255,255,0.05), inset 0 0 50px rgba(127,184,154,0.08), 0 30px 60px rgba(0,0,0,0.5), 0 6px 16px rgba(0,0,0,0.3)",
      }}
    >
      {/* edge light */}
      <span
        className="pointer-events-none absolute left-0 right-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
        }}
      />
      {/* upper-left glow */}
      <span
        className="pointer-events-none absolute -left-8 -top-8 h-32 w-32"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)",
          filter: "blur(20px)",
        }}
      />
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/app && bun typecheck
git add apps/app/src/components/wallets/variants/glass/GlassCard.tsx
git commit -m "feat(wallets): pure-CSS GlassCard for glass variant default

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Implement `LiquidGlassHover.tsx` (hover-only displacement upgrade)

**Files:**
- Create: `apps/app/src/components/wallets/variants/glass/LiquidGlassHover.tsx`

- [ ] **Step 1: Inspect the liquid-glass-react API**

```bash
cat /Users/itsjusteric/Developer/smartpockets/.claude/worktrees/gracious-allen-67a1ab/node_modules/liquid-glass-react/README.md | head -100
```

Confirm the prop names: `displacementScale`, `blurAmount`, `saturation`, `aberrationIntensity`, `elasticity`, `cornerRadius`. (Per research findings — but verify against actual package.)

- [ ] **Step 2: Create the wrapper**

```tsx
// apps/app/src/components/wallets/variants/glass/LiquidGlassHover.tsx
"use client";

import { useState } from "react";
import LiquidGlass from "liquid-glass-react";
import { useIsChromium } from "./use-is-chromium";

interface LiquidGlassHoverProps {
  children: React.ReactNode;
  /** Currently-hovered state from the parent. When true and isChromium, mount LiquidGlass. */
  isHovered: boolean;
  /** Same border-radius as the wrapped card. */
  cornerRadius?: number;
}

/**
 * Renders children inside `liquid-glass-react` ONLY when hovered AND
 * Chromium. Otherwise renders children directly (the parent GlassCard
 * already provides flat backdrop-filter blur).
 *
 * This enforces the "one displacement instance max" rule from the spec:
 * because only the actively-hovered card mounts LiquidGlass, you can
 * never have more than one displacement filter active in the DOM.
 */
export function LiquidGlassHover({
  children,
  isHovered,
  cornerRadius = 22,
}: LiquidGlassHoverProps) {
  const isChromium = useIsChromium();
  const [hasEntered, setHasEntered] = useState(false);

  // Defer mounting LiquidGlass until first hover so SSR + initial paint
  // is unaffected by the heavy filter.
  if (isHovered && !hasEntered) setHasEntered(true);

  if (!isChromium || !hasEntered) {
    return <>{children}</>;
  }

  return (
    <LiquidGlass
      displacementScale={isHovered ? 64 : 0}
      blurAmount={0.1}
      saturation={140}
      aberrationIntensity={isHovered ? 2 : 0}
      elasticity={0.35}
      cornerRadius={cornerRadius}
    >
      {children}
    </LiquidGlass>
  );
}
```

**API note:** If the actual `liquid-glass-react` package exports a default `LiquidGlass` and the prop names differ from above, adjust accordingly. The intent is: mount only on hover, on Chromium only, and use displacement values from the spec.

- [ ] **Step 3: Typecheck**

```bash
cd apps/app && bun typecheck
```

If types fail because `liquid-glass-react` doesn't ship types, add a minimal declaration in `apps/app/src/types/liquid-glass-react.d.ts`:

```ts
declare module "liquid-glass-react" {
  import type { ReactNode, ComponentType } from "react";
  interface LiquidGlassProps {
    children?: ReactNode;
    displacementScale?: number;
    blurAmount?: number;
    saturation?: number;
    aberrationIntensity?: number;
    elasticity?: number;
    cornerRadius?: number;
  }
  const LiquidGlass: ComponentType<LiquidGlassProps>;
  export default LiquidGlass;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/app/src/components/wallets/variants/glass/LiquidGlassHover.tsx apps/app/src/types/liquid-glass-react.d.ts
git commit -m "feat(wallets): LiquidGlassHover for hover-only displacement

Mounts liquid-glass-react only when hovered AND Chromium. Caps the
displacement-instance count at 1 (only the hovered card mounts it).

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Implement `MiniCardPreview.tsx` (3 inner glass panels)

**Files:**
- Create: `apps/app/src/components/wallets/variants/glass/MiniCardPreview.tsx`

Variant D shows **3 translucent glass mini-panels** inside the wallet (different from B's single hero slot). Each mini-panel is itself a softer-glass card with the brand color chip visible through it.

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/components/wallets/variants/glass/MiniCardPreview.tsx
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
      <div className="relative flex h-32 w-full items-center justify-center">
        <span
          className="text-xs italic"
          style={{
            color: "rgba(255,255,255,0.45)",
            fontFamily: "var(--font-fraunces), Georgia, serif",
          }}
        >
          Add a card
        </span>
      </div>
    );
  }

  // Display up to 3 cards as inner glass panels
  const visibleCards = cards.slice(0, 3);

  return (
    <div className="relative px-6 pt-6">
      <div className="flex flex-col gap-1.5">
        {visibleCards.map((card, index) => {
          const colors = brandColors[card.brand ?? "other"] ?? brandColors.other!;
          return (
            <motion.div
              key={card._id}
              className="relative h-7 overflow-hidden rounded-md"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02))",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 0 16px rgba(255,255,255,0.04)",
              }}
              animate={{
                x: isHovered ? 0 : 0,
                y: isHovered ? -index * 1 : 0,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 26, delay: index * 0.02 }}
            >
              {/* brand chip — visible through the glass */}
              <span
                className={cx("absolute left-2.5 top-1.5 h-3 w-4 rounded-sm bg-gradient-to-br", colors.bg)}
                style={{ opacity: 0.85 }}
              />
              {/* last 4 */}
              {card.lastFour && (
                <span
                  className="absolute bottom-1 right-2.5 text-[9px] tracking-wider text-white/55"
                  style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
                >
                  •••• {card.lastFour}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/app && bun typecheck
git add apps/app/src/components/wallets/variants/glass/MiniCardPreview.tsx
git commit -m "feat(wallets): glass MiniCardPreview — 3 inner glass panels

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Implement `ExtendedStats.tsx`

**Files:**
- Create: `apps/app/src/components/wallets/variants/glass/ExtendedStats.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/components/wallets/variants/glass/ExtendedStats.tsx
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
            className="relative grid grid-cols-2 gap-3 rounded-2xl p-4 text-sm"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              backdropFilter: "blur(16px) saturate(1.2)",
              WebkitBackdropFilter: "blur(16px) saturate(1.2)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.20), 0 18px 36px rgba(0,0,0,0.4)",
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
        className="text-[10px] uppercase tracking-[0.08em]"
        style={{ color: "rgba(255,255,255,0.55)" }}
      >
        {label}
      </p>
      <p
        className={cx("mt-0.5 font-medium", valueClassName)}
        style={{ color: "rgba(255,255,255,0.96)", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
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
git add apps/app/src/components/wallets/variants/glass/ExtendedStats.tsx
git commit -m "feat(wallets): glass ExtendedStats panel

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Implement `WalletCard.tsx`

**Files:**
- Create: `apps/app/src/components/wallets/variants/glass/WalletCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/components/wallets/variants/glass/WalletCard.tsx
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
import { GlassCard } from "./GlassCard";
import { LiquidGlassHover } from "./LiquidGlassHover";
import { MiniCardPreview } from "./MiniCardPreview";
import { ExtendedStats } from "./ExtendedStats";

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
      data-variant="glass"
      className="group relative cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <LiquidGlassHover isHovered={isHovered} cornerRadius={22}>
        <GlassCard>
          {/* moss glowing pin dot */}
          {wallet.isPinned && (
            <span
              className="pointer-events-none absolute right-5 top-5 h-2 w-2 rounded-full"
              style={{
                background: "#7fb89a",
                boxShadow:
                  "0 0 16px rgba(127,184,154,0.95), 0 0 6px rgba(127,184,154,0.6), inset 0 1px 0 rgba(255,255,255,0.4)",
              }}
              aria-label="Pinned"
            />
          )}

          <MiniCardPreview cards={previewCards} isHovered={isHovered} />

          <div className="relative z-10 flex items-start justify-between px-5 pb-4 pt-4">
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
                    className="w-full min-w-0 rounded border bg-transparent px-1.5 py-0.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                    style={{
                      borderColor: "rgba(255,255,255,0.4)",
                      color: "rgba(255,255,255,0.96)",
                    }}
                  />
                ) : (
                  <h3
                    className="truncate font-medium"
                    style={{
                      color: "rgba(255,255,255,0.96)",
                      fontFamily: "ui-sans-serif, system-ui, sans-serif",
                      fontSize: 20,
                      letterSpacing: "-0.01em",
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
                className="mt-0.5 text-[11px]"
                style={{
                  color: "rgba(255,255,255,0.55)",
                  letterSpacing: "0.08em",
                  fontFamily: "ui-sans-serif, system-ui, sans-serif",
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
        </GlassCard>
      </LiquidGlassHover>

      <ExtendedStats isExtended={isExtended} walletStats={walletStats} />
    </motion.div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd apps/app && bun typecheck
git add apps/app/src/components/wallets/variants/glass/WalletCard.tsx
git commit -m "feat(wallets): glass WalletCard with liquid-glass hover upgrade

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Implement `SortableWalletCard.tsx`

**Files:**
- Create: `apps/app/src/components/wallets/variants/glass/SortableWalletCard.tsx`

- [ ] **Step 1: Create the wrapper**

```tsx
// apps/app/src/components/wallets/variants/glass/SortableWalletCard.tsx
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
        isDragging && "z-50 opacity-90 shadow-2xl"
      )}
    >
      {/* light semi-transparent grip on left edge */}
      <div
        {...attributes}
        {...listeners}
        className={cx(
          "absolute -left-1 top-1/2 z-20 h-8 w-0.5 -translate-y-1/2 cursor-grab rounded-r",
          "opacity-0 transition-opacity group-hover:opacity-100",
          isDragging && "cursor-grabbing opacity-100"
        )}
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(255,255,255,0.5), transparent)",
        }}
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
git add apps/app/src/components/wallets/variants/glass/SortableWalletCard.tsx
git commit -m "feat(wallets): glass SortableWalletCard

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Update `WalletsContent.tsx` — import swap + stronger ambient blobs

**Files:**
- Modify: `apps/app/src/components/wallets/WalletsContent.tsx`

- [ ] **Step 1: Replace the import**

```diff
- import { SortableWalletCard, WalletCard } from "./WalletCard";
+ import { SortableWalletCard } from "./variants/glass/SortableWalletCard";
```

- [ ] **Step 2: Wrap the grid with ambient color blobs (stronger than E's)**

Replace the `<DndContext>` grid block (same location as Plan E Task 8 Step 2) with:

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
      {/* stronger ambient blobs than Variant E — gives the glass real content to refract */}
      <div
        className="pointer-events-none absolute -inset-32 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 700px 500px at 18% 28%, rgba(127,184,154,0.32), transparent 60%), radial-gradient(ellipse 600px 400px at 82% 72%, rgba(212,197,156,0.22), transparent 60%), radial-gradient(ellipse 400px 300px at 50% 50%, rgba(120,160,200,0.15), transparent 60%)",
        }}
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

**Note:** Unlike Variant E, this variant does NOT add a page-level `backdrop-blur` parent. Each glass card runs its own `backdrop-filter` (handled by `GlassCard.tsx`), so adding another blur layer would create nested filters that conflict per the spec's perf rules.

- [ ] **Step 3: Run full verification suite**

```bash
cd apps/app && bun typecheck && bun lint && bun build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/app/src/components/wallets/WalletsContent.tsx
git commit -m "feat(wallets): route to glass variant + ambient color blobs

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Write the Playwright smoke test

**Files:**
- Create: `apps/app/tests/wallets-variant-glass.spec.ts`

- [ ] **Step 1: Create the test**

```ts
// apps/app/tests/wallets-variant-glass.spec.ts
import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) throw new Error("NEXT_PUBLIC_CONVEX_URL not set");

const NAME_PREFIX = "GlassTest-";

test.describe("Variant D — Architectural Glass (CROWDEV-XXX)", () => {
  let convex: ConvexHttpClient;
  let createdWalletIds: string[] = [];

  test.beforeAll(async () => {
    convex = new ConvexHttpClient(CONVEX_URL);
  });

  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
    // Seed wallets (pattern from wallets-baseline.spec.ts)
  });

  test.afterEach(async () => {
    for (const id of createdWalletIds) {
      try {
        await convex.mutation(api.wallets.mutations.remove, { walletId: id as any });
      } catch {}
    }
    createdWalletIds = [];
  });

  test("renders with data-variant='glass'", async ({ page }) => {
    await page.goto("/wallets");
    await expect(
      page.locator("[data-testid='wallet-card']").first()
    ).toHaveAttribute("data-variant", "glass");
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
bun test:e2e wallets-variant-glass.spec.ts
git add apps/app/tests/wallets-variant-glass.spec.ts
git commit -m "test(wallets): smoke spec for glass variant

Refs CROWDEV-XXX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Manual cross-browser smoke

**Files:**
- None

- [ ] **Step 1: Chrome smoke**

```bash
bun dev:app
```

In Chrome at `localhost:3000/wallets`:
- [ ] Cards show frosted-glass effect with edge light
- [ ] Hover a card — it gains liquid-glass displacement (cards behind warp slightly at the edges)
- [ ] Only ONE card at a time has the displacement effect
- [ ] Mini-cards inside the wallet look like inner glass panels with brand chips visible through them
- [ ] Moss-glowing dot on pinned wallets
- [ ] Scrolling 20+ cards stays at 60fps (DevTools Performance tab)

- [ ] **Step 2: Safari smoke**

Open the same URL in Safari:
- [ ] Cards show flat tinted-glass fallback (no displacement on hover)
- [ ] All other behaviors identical to Chrome
- [ ] No console errors related to `liquid-glass-react`

- [ ] **Step 3: Firefox smoke**

Open in Firefox:
- [ ] Same fallback as Safari — flat tinted glass, no displacement
- [ ] All behaviors identical

- [ ] **Step 4: Verify the Chromium gate worked**

In Chrome DevTools, search the DOM for `<svg>` elements with `<feDisplacementMap>` — exactly 0 on initial load, exactly 1 while a card is hovered. In Safari/Firefox, exactly 0 always.

---

### Task 13: Submit + Linear update

- [ ] **Step 1: Full verification suite**

```bash
cd apps/app && bun typecheck && bun lint && bun build && bun test:e2e wallets-variant-glass.spec.ts
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
Variant D (Architectural Glass) submitted.

**PR:** https://app.graphite.com/github/pr/EricJamesCrow/smartpockets/<PR_NUMBER>
**Preview:** <Vercel URL>

**Implementation:**
- `variants/glass/` — WalletCard, GlassCard (pure-CSS), LiquidGlassHover (hover-only displacement), MiniCardPreview (3 inner glass panels), ExtendedStats, SortableWalletCard, use-is-chromium
- New dependency: `liquid-glass-react` (MIT)
- `WalletsContent.tsx` — import swap + ambient moss + champagne + blue color blobs behind the grid

**Cross-browser:** Chromium gets full liquid-glass with displacement + chromatic aberration on hover. Safari/Firefox get flat tinted-glass fallback (still premium-feeling). Verified in all three on local dev.

**Perf:** ONE `liquid-glass-react` instance at a time — only the hovered card mounts it. Confirmed via DOM inspection. Scrolling 20+ cards stays at 60fps on Chrome and Safari.

**Smoke test:** all 9 must-keep features pass.

Ready for visual review.
```

---

## Self-Review checklist

- [ ] `liquid-glass-react` only mounts when hovered AND Chromium — enforced in `LiquidGlassHover.tsx`.
- [ ] Safari/Firefox fall back gracefully via `useIsChromium`.
- [ ] No nested `backdrop-filter` — page chrome has no blur layer (unlike Variant E).
- [ ] Glass mini-cards show brand chips through them.
- [ ] Moss glowing pin dot (not champagne).
- [ ] All 9 must-keeps in the smoke test.

---

## Out of scope

- iOS Safari behavior beyond fallback (mobile testing is a separate accessibility pass)
- Tuning `liquid-glass-react`'s exact prop values beyond the spec defaults
- WebGL or `react-three-fiber` for higher-fidelity glass (out of scope; would push the variant beyond the planned effort)

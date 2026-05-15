---
linear: CROWDEV-420
title: Wallets aesthetic pass — five-variant exploration
date: 2026-05-12
status: draft
parent_issue: CROWDEV-420
---

# Wallets aesthetic pass — five-variant exploration

Spec for a multi-branch design exploration of the SmartPockets wallets feature. Addresses Linear issue [CROWDEV-420](https://linear.app/crowdevelopment/issue/CROWDEV-420) ("Improve wallets feature aesthetic quality").

## 1. Goal & bar

The wallets feature is functional but visually generic compared to the rest of the SmartPockets app — Fraunces serif accents, moss/champagne palette, calibrated motion. This spec produces **five distinct premium directions** for the wallet card and `/wallets` page, each fully implemented on its own branch with a Vercel preview, so the owner can pick the winner from interactive previews rather than mockups.

Aesthetic neighbors, in order of dominance:
- **Loro Piana / Hermès / Rimowa product pages** — quiet luxury, exquisite type spacing, single accent gestures (relevant to Refined Materiality and Refined + Glass)
- **Apple Vision Pro / iOS 26 Liquid Glass** — true `feDisplacementMap` refraction, not 2020 glassmorphism throwback (relevant to Architectural Glass)
- **Physical leather goods photography (Tanner Goods, Loewe, Ghurka)** — skeuomorphic luxury, restrained stitching, premium leather grain (relevant to Literal Leather and Champagne Leather)
- **Linear settings panels / Vercel dashboards** — restrained dark surface materiality, calibrated shadows (relevant to Refined Materiality)

The wallets page shares a route with the rest of the app; whichever variant wins must feel native to the moss/champagne chrome already established in [CROWDEV-306](https://linear.app/crowdevelopment/issue/CROWDEV-306) (1B retheme).

## 2. Scope

### In scope

- `apps/app/src/components/wallets/WalletCard.tsx` — replaced per variant
- `apps/app/src/components/wallets/WalletsContent.tsx` — minimal change (import swap only)
- New `apps/app/src/components/wallets/shared/` directory with extracted hooks (prep PR)
- New `apps/app/src/components/wallets/variants/<variant>/` per variant branch
- Per-variant external dependencies (`liquid-glass-react`, Aceternity copy-paste components, texture asset URLs)
- Per-variant motion treatment using existing Motion v12 (`motion/react`)
- Drag-handle visual per variant (still wired through `@dnd-kit/sortable`)
- Extended-view stats panel per variant (same 4 stats, variant-specific material)
- Empty-wallet state per variant (when the wallet exists but has 0 cards)

### Out of scope (flagged, not touched)

- `apps/app/src/components/wallets/PinnedWalletsSidebar.tsx` — sidebar mini-rep, lives in app chrome. Fast-follower PR after a variant wins, not part of this spec.
- `apps/app/src/components/wallets/CreateWalletModal.tsx` — separate aesthetic pass.
- `/credit-cards?wallet={id}` filtered view treatment — separate work.
- The `/wallets` **page header** (kicker, Fraunces "Wallets" h1, subtitle, toggle, Create-Wallet CTA) — already on-brand; left as-is across all variants.
- Skeleton loader card design — kept generic (loading state too brief to justify per-variant design).
- Empty-state page (when user has zero wallets) — kept generic (rarely seen).
- Dropdown menu, inline rename input — kept structurally shared (utility UI).
- Mobile-specific gestures (long-press, swipe-to-delete) — separate accessibility/mobile pass.
- Storybook stories / `/wallets/compare` harness — out of scope initially; the workflow is "open 5 tabs."
- A/B testing infrastructure — not built; this is a design-driven decision.
- Path 2 detailed spec (style picker UI, schema migration) — separate work IF Path 2 wins (see §10).

### Done means

All 5 variant branches merged or closed. One variant on `main` (Path 1) OR multiple variants on `main` behind a `walletStyle` user preference (Path 2). The chosen path is documented in the "Decision" sub-issue's closing comment with links to the merged PR(s).

## 3. Architecture orientation (current state)

### Files

- `apps/app/src/app/(app)/wallets/page.tsx` — route entry; renders `WalletsContent`
- `apps/app/src/components/wallets/WalletsContent.tsx` — page header, grid, DnD wiring, extended toggle, create-modal trigger
- `apps/app/src/components/wallets/WalletCard.tsx` — the card itself + mini-card stack + dropdown + extended stats + `SortableWalletCard` drag wrapper
- `apps/app/src/components/wallets/CreateWalletModal.tsx` — create flow (out of scope)
- `apps/app/src/components/wallets/PinnedWalletsSidebar.tsx` — sidebar rep (out of scope)

### Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind v4 with custom CSS variables (`--sp-moss-bg`, `--sp-moss-mint`, `--sp-champagne`, etc.)
- Motion v12 (`import { motion } from "motion/react"`)
- UntitledUI base components in `@repo/ui` (already used)
- `@dnd-kit/sortable` for drag/reorder
- Convex queries (`api.wallets.queries.list`, `getWithCards`, `get`) and mutations (`updateSortOrder`, `togglePin`, `remove`, `rename`)
- Fonts: Geist (body), Fraunces (italic accents)

### Current WalletCard features (all preserved across variants)

1. Wallet name displayed; click name → inline rename (Enter saves, Escape cancels)
2. Card count text ("3 cards")
3. Mini-card stack preview — 3 cards peek from top, fan out on hover
4. Pin indicator (Pin01 icon) when `wallet.isPinned`
5. Dropdown menu (Dots button → Rename / Pin-Unpin / Delete)
6. Drag handle (DotsGrid icon) on left edge, visible on hover
7. Extended stats panel toggled at page level (Balance / Limit / Available / Utilization)
8. Whole card click → navigates to `/credit-cards?wallet={id}`
9. Empty wallet state — dashed bordered placeholder when `cardCount === 0`

## 4. Design decisions (locked during brainstorm)

| Decision | Value |
|---|---|
| Variant intent | Design exploration → pick winner(s) (not a runtime theme system from day 1) |
| Surfaces in scope | Wallet card + `/wallets` page treatment (sidebar deferred) |
| Variant spread | 6 directions originally proposed; **5 locked**: Literal Leather, Refined Materiality, Champagne Leather (hybrid), Architectural Glass, Refined + Glass (hybrid). Editorial / Brutalist / Museum Vitrine dropped. |
| Palette constraint | Card material/texture can break palette per variant; page chrome stays in moss/graphite (option C from brainstorm Q4) |
| Must-keep features | All 9 current features preserved; presentation may be reinterpreted per variant |
| Page chrome | 100% shared across all 5 variants (header, grid, skeleton, empty state, dropdown, inline rename, DnD wiring) |
| Decision shape | Fork-shaped: Path 1 (single winner) OR Path 2 (multi-ship as user-selectable styles). Decided after all 5 are previewable. |

## 5. Architecture — branch structure

### Topology

```
main
 └─ crowdev-420-prep ............ Extract shared hooks (lands first)
     ├─ crowdev-420-a-leather ........ Variant A
     ├─ crowdev-420-b-refined ........ Variant B
     ├─ crowdev-420-c-champagne ...... Variant C (hybrid)
     ├─ crowdev-420-d-glass .......... Variant D
     └─ crowdev-420-e-refined-glass .. Variant E (hybrid)
```

Five **peer** variant branches, all stacked on a single prep PR. Stacking on prep (not on each other) because the variants are independent answers to the same question — stacking them sequentially would force review order that doesn't match how the owner evaluates them.

### Prep PR contents

Extracted to `apps/app/src/components/wallets/shared/`:

- `use-wallet-card.ts` — wraps `useQuery(api.wallets.queries.getWithCards, ...)` and `useQuery(api.wallets.queries.get, ...)` for stats; returns typed wallet + previewCards + walletStats
- `use-wallet-card-actions.ts` — `togglePin`, `removeWallet`, `renameWallet` mutations + navigation helper for `/credit-cards?wallet=<id>`
- `use-sortable-wallet.ts` — `useSortable({ id })` from `@dnd-kit/sortable` returning `attributes`, `listeners`, `setNodeRef`, `transform`, `transition`, `isDragging`
- Shared TypeScript types — `WalletCardProps`, `MiniCardPreviewProps`, brand color map

After prep merges, each variant branch contains only the variant's visual code, importing the shared hooks.

### Per-branch file layout

```
apps/app/src/components/wallets/
├── shared/                            (prep PR; reused by all variants)
│   ├── use-wallet-card.ts
│   ├── use-wallet-card-actions.ts
│   ├── use-sortable-wallet.ts
│   ├── brand-colors.ts
│   └── types.ts
└── variants/<variant>/                 (variant branch only)
    ├── WalletCard.tsx                  (variant's component, uses shared hooks)
    ├── SortableWalletCard.tsx          (sortable wrapper, drag affordance)
    ├── MiniCardPreview.tsx             (variant's mini-card stack treatment)
    ├── ExtendedStats.tsx               (variant's stats panel)
    ├── styles.module.css               (if needed)
    └── assets/                         (textures, lottie JSON, GLTF, etc.)
```

`WalletsContent.tsx` on each variant branch is identical to `main` except for one line:

```diff
- import { SortableWalletCard } from "./WalletCard";
+ import { SortableWalletCard } from "./variants/leather/SortableWalletCard";
```

This isolates the per-variant diff to ~300 lines of well-bounded visual code.

### Linear structure

- **CROWDEV-420** stays as the parent epic
- 7 sub-issues created from CROWDEV-420:
  - `Prep: extract shared WalletCard hooks` (~2h)
  - `Variant A — Literal Leather` (~2h CSS path; +1 day if R3F option)
  - `Variant B — Refined Materiality` (~3h)
  - `Variant C — Champagne Leather` (~3h)
  - `Variant D — Architectural Glass` (~2h + ~3h Safari fallback)
  - `Variant E — Refined + Glass` (~2h)
  - `Decide & cleanup` (fork-shaped; Path 1 OR Path 2)

## 6. Per-variant visual spec

All five variants preserve the 9 must-keep features and use the shared hooks from the prep PR. They differ only in visual treatment, motion gesture on top of the shared fan-out, and material foundation.

### Variant A — Literal Leather

Skeuomorphic bifold. Maximum "actual wallet" feel.

| Attribute | Treatment |
|---|---|
| Material | Cognac brown gradient + [Transparent Textures `leather.png`](https://www.transparenttextures.com/patterns/leather.png) overlay + radial highlights + inset shadows for dimensionality |
| Stitching | `1px dashed` inset border in warm tan (`rgba(225,185,140,0.32)`) |
| Mini-card stack | 3 cards peek from top edge of wallet; fan out on hover (existing motion preserved) |
| Wallet name | Fraunces italic ~20–22px, debossed via `text-shadow: 0 1px 0 rgba(0,0,0,0.7), 0 -1px 0 rgba(255,210,160,0.1)` |
| Card count | Fraunces small caps in tan tone, letter-spaced |
| Pin indicator | Champagne foil dot, top-right, with radial highlight |
| Drag affordance | Leather grip texture on left edge, visible on hover |
| Hover gesture | Existing card-stack fan-out + ~3° 3D tilt via Aceternity-style transform |
| Extended view | "Receipt" panel below the wallet — parchment-textured background, 4 stats with serif numerals |
| Empty wallet | Stitched dashed rectangle in dark leather tone with "Empty wallet" in serif italic |
| Implementation stack | [Transparent Textures Leather](https://www.transparenttextures.com/leather.html) PNG overlay · [Unsplash leather photo](https://unsplash.com/s/photos/brown-leather-texture) via `mix-blend-mode: overlay` for sheen variation · [Aceternity 3D Card Effect](https://ui.aceternity.com/components/3d-card-effect) for motion shell · Custom CSS for stitch/emboss |
| Effort | ~2h CSS path. Optional R3F upgrade: +1 day, +120kb bundle, drag/reorder interop work. Decide during implementation. |

### Variant B — Refined Materiality

In palette. Quiet luxury — Loro Piana / Linear / Hermès energy.

| Attribute | Treatment |
|---|---|
| Material | UntitledUI gray-dark chassis (`@repo/ui` credit-card component as base) + SVG `feTurbulence` grain overlay at ~10% opacity, `mix-blend-mode: overlay` |
| Holder | Graphite slot (rounded-2xl, 14px corners) with inner shadow; champagne card sits inside |
| Card aspect | **200 × 120** (1.667), matching UntitledUI's `316 × 190` (1.663) — credit-card-accurate |
| Mini-card stack | One hero card visible; 2 suggested by edge-hint lines above (180px and 160px wide, narrower than the slot) |
| Wallet name | Geist medium ~19px, warm white (`#f0e8d0`) |
| Card count | Geist small caps ~10px, champagne 60% opacity, letter-spaced 0.16em |
| Pin indicator | Champagne ribbon descending from top edge |
| Drag affordance | Hairline grip on left edge, visible on hover |
| Hover gesture | Subtle elevation lift + champagne edge highlight intensifies + cursor-tracked highlight via `gradientOpacity ≤ 0.15` |
| Extended view | Slot below the wallet in matching holder material; same 4 stats in Geist |
| Empty wallet | Slot visible but empty; "Add a card" hint in champagne tone |
| Implementation stack | [UntitledUI credit-card](https://www.untitledui.com/react/components/credit-cards) (Gray-dark variant) as chassis · [Cult UI TextureOverlay](https://www.cult-ui.com/docs/components/texture-card) · [ibelick `feTurbulence` grain](https://ibelick.com/blog/create-grainy-backgrounds-with-css) · optional [Magic UI MagicCard](https://magicui.design/docs/components/magic-card) for cursor-tracked hairline |
| Effort | ~3h. Lowest risk in the lineup. Safest perf (no `backdrop-filter`, no heavy textures). |

### Variant C — Champagne Leather

Leather metaphor in the app's palette. Hybrid of A + B; shares ~70% of either's CSS.

| Attribute | Treatment |
|---|---|
| Material | Champagne-toned warm gradient (`#d4c59c → #b8a878 → #8c7e54`) + [Transparent Textures `dark-leather.png`](https://www.transparenttextures.com/patterns/dark-leather.png) overlay with `background-blend-mode: overlay` + radial highlights |
| Stitching | `1px dashed` border in dark ink at 35% opacity — visible but quiet |
| Mini-card stack | 2 cards peek (more restraint than A); fan out on hover |
| Card aspect | Same as A — peek treatment, no proper-aspect hero card |
| Wallet name | Fraunces italic ~22px, dark ink with foil-emboss text-shadow |
| Card count | Fraunces small caps ~10px, dark ink 60%, letter-spaced 0.25em |
| Pin indicator | Champagne metal dot, lighter than A (warmer radial gradient) |
| Drag affordance | Subtle leather grip on left edge, ink-shadow |
| Hover gesture | Existing fan-out + ~2° 3D tilt (less than A) + edge sheen |
| Extended view | Stats panel in matching champagne-grain material |
| Empty wallet | Stitched dashed rectangle in champagne tone with "Empty" in serif italic |
| Implementation stack | Transparent Textures dark-leather (filtered) · UntitledUI chassis · same Aceternity 3D Card Effect as A but with reduced tilt amplitude |
| Effort | ~3h. Most aesthetic risk — could miss the line between "champagne leather" and "tacky gold." |

### Variant D — Architectural Glass

Vision Pro / iOS 26 Liquid Glass. True refraction, not 2020 throwback.

| Attribute | Treatment |
|---|---|
| Material | All wallet cards use pure-CSS Vision OS glass ([`nikdelvin/liquid-glass`](https://github.com/nikdelvin/liquid-glass) pattern — `backdrop-filter: blur(28px) saturate(1.3)` + edge SVG filters + inner highlight). Active/hovered card temporarily upgrades to [`liquid-glass-react`](https://github.com/rdev/liquid-glass-react) with true `feDisplacementMap` + chromatic aberration. **One displacement-instance maximum per visible viewport.** |
| Backdrop | Ambient color blobs (moss at 32% + champagne at 22%) behind the page grid, giving the glass refraction content |
| Mini-card stack | 3 translucent glass mini-panels inside the wallet, each a softer-glass card with brand-color chip and subtle inner glow |
| Wallet name | Geist medium ~20px, semi-transparent white (`rgba(255,255,255,0.96)`) |
| Card count | Geist regular ~11px, white 55%, letter-spaced 0.08em |
| Pin indicator | Moss glowing dot, top-right (`box-shadow: 0 0 16px rgba(127,184,154,0.95)` halo + inner highlight) |
| Drag affordance | Light grip on left edge, semi-transparent vertical gradient |
| Hover gesture | Glass elasticity squish via `liquid-glass-react` built-in spring; mini-cards lift inside |
| Extended view | Secondary glass panel below the card, slightly less blurred (depth hierarchy) |
| Empty wallet | Glass wallet outline with content area dimmed |
| Implementation stack | `liquid-glass-react` (MIT, ~1–2h install) for hero/active card · `nikdelvin/liquid-glass` (MIT, pure CSS) as default per-card glass · [Aceternity Card Spotlight](https://ui.aceternity.com/components/card-spotlight) + [Glowing Effect](https://ui.aceternity.com/components/glowing-effect) for scroll-perf-friendly companions on nested elements |
| Effort | ~2h install + ~3h Safari/Firefox fallback. **Chromium-only for full effect**; Safari/Firefox fall back to flat-tinted glass over the same ambient blobs. `backdrop-filter` creates a new compositing layer per element and repaints every scroll frame — strict rule: one true-glass card displacement at a time. |
| Perf notes | Confirmed via Mozilla bug 1718471 and vitepress scroll-jank reports. Animate `transform`/`opacity` only, never blur radius. Nested `backdrop-filter` blocks inner layers from seeing original page content. |

### Variant E — Refined + Glass

Restrained glass. Hybrid of B + D; solves Glass's perf concern by moving the blur to a single page-level layer.

| Attribute | Treatment |
|---|---|
| Material | UntitledUI gray-dark chassis + glass veil overlay (`linear-gradient(rgba(212,197,156,0.08), transparent)`) + ibelick `feTurbulence` grain at very low opacity; **single shared `backdrop-blur-xl` parent** behind the grid (not per-card) |
| Backdrop | Ambient moss + champagne color blobs at lower opacity than D |
| Card aspect | **200 × 120** (1.667), matching B and UntitledUI |
| Mini-card stack | Same hero-slot treatment as B |
| Wallet name | Geist medium ~19px, warm white |
| Card count | Geist small caps ~10px, champagne 60% |
| Pin indicator | Moss ribbon descending from top edge (warmer than B's champagne ribbon — signals pinning) |
| Drag affordance | Hairline grip on left edge, champagne tone |
| Hover gesture | [Aceternity Card Spotlight](https://ui.aceternity.com/components/card-spotlight) follows cursor (champagne tint) + subtle elevation lift |
| Extended view | Glass-veiled panel matching the card material |
| Empty wallet | Veiled slot, "Add a card" hint |
| Implementation stack | UntitledUI chassis · Aceternity Card Spotlight · single page-level `backdrop-blur-xl` parent · champagne tinted gradient overlay · ibelick grain |
| Effort | ~2h. Scales to 20+ wallet cards safely (only one blur layer per page). No Safari fallback needed. |

## 7. Page chrome & shared behaviors

### 100% shared across all 5 variants

| Element | Treatment |
|---|---|
| Page header | "Section" kicker + moss dot + Fraunces italic "Wallets" h1 + subtitle — unchanged |
| Extended-view toggle | UntitledUI `Toggle` labelled "Details", page-level state passed to each card via `isExtended` prop |
| Create Wallet CTA | UntitledUI primary `Button` with `Plus` icon — unchanged |
| Grid layout | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6` — unchanged |
| Skeleton | 8 × `h-48 rounded-xl bg-tertiary/20 animate-pulse` — unchanged |
| Empty state (no wallets) | Centered icon + heading + CTA — unchanged |
| DnD wiring | `DndContext` + `closestCenter` + `SortableContext` + `rectSortingStrategy`, 8px activation distance, `arrayMove` + `updateSortOrder` mutation — unchanged |
| Dropdown menu | UntitledUI `Dropdown` with same 3 items (Rename / Pin-Unpin / Delete) and same icons — unchanged |
| Active drag state | `z-50 + opacity-90 + shadow-xl` — generic across variants |
| Inline rename input | Same input structure, Geist sans (utility font). Displayed name (when not editing) uses variant typography. |
| Convex queries/mutations | Same `useQuery`/`useMutation` calls via shared hooks |

### Per-variant overrides

Only the wallet card visual + 6 card-level affordances (drag grip, pin, mini-card stack, hover gesture, extended panel material, empty-wallet state) — all specified in §6.

## 8. Component research summary

Three background research agents surveyed the React ecosystem (libraries, snippets, 3D, Lottie, textures, design inspiration) for each base aesthetic. Findings:

### Leather (Variant A, C)

No drop-in production-grade React leather-wallet component exists. The space is split between (a) generic flat fintech "wallet UI" dashboards (irrelevant), (b) CSS skeuo experiments at CodePen-tier quality (lift techniques only), and (c) 3D model assets requiring a Three.js scene around them.

**Best path:** assemble Transparent Textures leather PNG overlay + Unsplash leather photo via `mix-blend-overlay` for sheen + Aceternity 3D Card Effect for motion shell. ~2h to a card that looks like real leather, holds live mini-cards as children, and works with `@dnd-kit`.

**Higher-ceiling path:** React Three Fiber + drei + [diegart's GLTF wallet](https://sketchfab.com/3d-models/single-leather-wallet-c71312f9c0e447608d8010a9022775d6) (CC-BY). +120kb bundle, full day of R3F work plus drag-transform interop.

**Disqualified:** [Brown Leather Wallet by Ersan Design](https://sketchfab.com/3d-models/brown-leather-wallet-dcd91921a2a74f69bb92241b6d593725) (CC-BY-NC-SA), [moorch Open Wallet](https://sketchfab.com/3d-models/wallet-e850eb5b3d0449bd916c91644cd99583) (CC-BY-NC-ND), Lottie wallets (all cartoony, can't hold live children).

### Refined Materiality (Variant B, E)

No drop-in component nails the brief exactly; most libraries claiming "premium" chase shine, neon, or holography. **Primitives exist that compress the work to ~3h.**

**Top stack:** UntitledUI credit-card (Gray-dark) as chassis (already in `@repo/ui`) + Cult UI TextureOverlay for paper-grain + ibelick `feTurbulence` for fine surface noise + top-only `border-color: color-mix(in oklch, champagne 8%, transparent)` as the single accent gesture.

**Alternative:** Magic UI MagicCard with `gradientOpacity ≤ 0.15` and `gradientColor: champagne@5%` — cursor-aware hairline highlight without glow.

**Disqualified:** Aceternity GlareCard, Magic UI NeonGradientCard, ReactBits Reflective/Spotlight/Pixel/Tilted cards — all on the showy side of the line.

### Glass (Variant D, E)

[`liquid-glass-react` (rdev)](https://github.com/rdev/liquid-glass-react) is the genuine bar — true `feDisplacementMap` + chromatic aberration + spring elasticity + Apple-accurate lighting. MIT. Chromium-only for full effect; Safari/Firefox fall back to flat glassmorphism. Heavy per-instance — fine for a single hero, not for a grid of 20.

[`nikdelvin/liquid-glass`](https://github.com/nikdelvin/liquid-glass) is the pure-CSS lighter alternative — same iOS 26 aesthetic, no JS dependencies, Chromium-only.

[`@callstack/liquid-glass`](https://github.com/callstack/liquid-glass) is React Native only — skip.

[Aceternity Card Spotlight](https://ui.aceternity.com/components/card-spotlight) + [Glowing Effect](https://ui.aceternity.com/components/glowing-effect) are the scroll-perf-friendly companions — Motion v12 compatible, no per-card `backdrop-filter`. The strongest non-WebGL option for the tech-luxury vibe.

**Disqualified:** `glasscn-ui`, `frostglass`, `@mawtech/glass-ui` — all generic 2020 glassmorphism, will drag the brand toward throwback.

### Performance constraints applicable to D and E

- `backdrop-filter` creates a new compositing layer per element and repaints on every scroll frame (confirmed via Mozilla bug 1718471). Use on the **outer wallet card only**, not on nested elements.
- Nested `backdrop-filter` creates stacking contexts that block inner layers from seeing original page content. Apply to the final layer only.
- For animation, prefer `transform`/`opacity` over animating blur radius.
- SVG-as-backdrop-filter (the true Liquid Glass technique) is Chromium-only. Safari/Firefox fallback to flat tinted glass.

### References

Component libraries surveyed: shadcn/ui, Magic UI, Aceternity UI, Park UI, Mantine, NextUI, HeroUI, Origin UI, Cult UI, Tremor, ReUI, ReactBits, 21st.dev, Glasscn-ui, frostglass, `@mawtech/glass-ui`, UntitledUI free + Pro, Tailwind UI, Linear / Vercel open-source examples.

Reference designs (not code): Loro Piana, Hermès, Rimowa product pages; Linear's redesign writeup ([linear.app/now/how-we-redesigned-the-linear-ui](https://linear.app/now/how-we-redesigned-the-linear-ui)); Apple Vision Pro UI; iOS 26 Liquid Glass demos; Josh W. Comeau's backdrop-filter article; kube.io and LogRocket Liquid Glass tutorials.

## 9. Build sequencing

Recommended order — easiest first, validates patterns before hardest variants. Sub-agents can build variants A–E in parallel (each has its own worktree, zero file overlap).

| # | Sub-issue | Effort | Why this position |
|---|---|---|---|
| 1 | Prep — extract shared hooks | ~2h | Foundation. Lands first; all variants stack on this. |
| 2 | Variant B — Refined Materiality | ~3h | Lowest risk. Validates architecture + component picks. |
| 3 | Variant E — Refined + Glass | ~2h | Reuses B's chassis. Validates hybrid pattern. |
| 4 | Variant D — Architectural Glass | ~2h + ~3h Safari | Net-new components (`liquid-glass-react`), perf considerations. |
| 5 | Variant A — Literal Leather | ~2h CSS (+1 day if R3F) | Texture-heavy custom work. |
| 6 | Variant C — Champagne Leather | ~3h | Reuses A and B. Comes last because depends on both. |
| 7 | Decide & cleanup | varies | Fork-shaped (see §10). |

Realistic parallel timeline: **~1 day with 3–5 parallel sub-agents**, vs ~2 days serial.

Per CLAUDE.md: parallel sub-agents must each run with `isolation: "worktree"`.

## 10. Decision process (fork-shaped)

After all 5 variant PRs are previewable on Vercel, the owner reviews and decides between two paths:

### Path 1 — single winner ("I like one")

1. Approve the winning PR.
2. Merge winning branch to `main` via Graphite.
3. Close the other 4 PRs with comment `Not selected. Winner: [Graphite link]`.
4. `gt delete` the other 4 branches.
5. Mark the other 4 Linear sub-issues Canceled with closing comment citing the winner.
6. Optional follow-up: clean up any commented-out variant references.

### Path 2 — multi-ship ("I like multiple")

1. Pick 2–N favorites + the default for new users.
2. **Schema migration PR:** add `walletStyle` field to `users` table (or `userPreferences` if one exists; probe during planning):
   ```ts
   walletStyle: v.optional(
     v.union(
       v.literal("leather"),
       v.literal("refined"),
       v.literal("champagne-leather"),
       v.literal("glass"),
       v.literal("refined-glass"),
     )
   )
   ```
3. **Settings UI PR:** wallet style picker (radio cards with thumbnails of each shipped variant) in user settings.
4. **Render-site PR:** update `WalletsContent.tsx`:
   ```ts
   const Variant = VARIANTS[user.walletStyle ?? DEFAULT];
   <Variant ... />
   ```
5. Merge selected variant PRs (any order, they're independent).
6. Close + `gt delete` losing variant PRs.
7. End-to-end test: change style in settings → reload → `/wallets` shows new variant.
8. **Additional budget:** ~half-day to one day on top of variant work.

### Preview deployment per variant

Each branch's Vercel preview deploys automatically via existing project setup (preview env vars, sandbox Clerk, dev Convex per CLAUDE.md). PR checks expose the preview URL. The shared preview domain `app.preview.smartpockets.com` is rotated to each variant in turn for manual review.

## 11. Acceptance criteria — per variant

A variant branch is "done enough to evaluate" when:

- [ ] `bun typecheck` passes (no type errors)
- [ ] `bun lint` passes
- [ ] `bun build` succeeds
- [ ] Vercel preview deploys successfully
- [ ] All 9 must-keep features functional:
  - [ ] Wallet name displayed; inline-editable (Enter saves, Escape cancels)
  - [ ] Card count visible
  - [ ] Mini-card stack preview renders per variant spec
  - [ ] Pin indicator shows when `wallet.isPinned`
  - [ ] Dropdown menu opens; Rename / Pin-Unpin / Delete all act correctly
  - [ ] Drag handle visible on hover; reorder persists via `updateSortOrder`
  - [ ] Extended stats render when page toggle is on (Balance / Limit / Available / Utilization, color-coded utilization)
  - [ ] Card click navigates to `/credit-cards?wallet={walletId}`
  - [ ] Inline rename UI works
- [ ] Variant works at all responsive breakpoints (sm/lg/xl)
- [ ] Empty wallet (0 cards) renders without breaking layout
- [ ] No console errors on `/wallets` or after interactions
- [ ] Visually matches the §6 spec (subjective review)

## 12. Risks & open questions

### Risks

1. **Champagne Leather (Variant C) aesthetic risk.** Hybrid concepts are harder to land than pure expressions. Could read as "tacky gold leather" instead of "premium tonal" if the brown undertones aren't quiet enough. Mitigation: build C last, after seeing how A and B land independently. If C misses, drop it.
2. **Architectural Glass Safari fallback.** Real Liquid Glass (`liquid-glass-react`) is Chromium-only. Safari/Firefox users see a flat-tinted glass fallback that lacks the displacement. If the Safari fallback isn't strong enough on its own, Variant D becomes a Chromium-favored variant — Path 2 default should be different.
3. **R3F option for Leather (A).** If we pursue real 3D, the +120kb bundle and drag-transform interop are real costs. Decide during implementation, not now.
4. **`backdrop-filter` scroll perf for D.** Even with the "one displacement at a time" rule, multiple per-card CSS glass overlays could tank scroll perf at high card counts. Test with 20+ wallet cards before merging.
5. **5 implementations is meaningful work even with great primitives.** Estimated ~12–14h core + ~3h Safari fallback + ~4h per-branch preview verification. ~2 days for one engineer; ~1 day with parallel sub-agents.

### Open questions

1. **Default for Path 2.** If multi-ship wins, which variant is the default for new users? Likely Refined Materiality (safest, in-palette, lowest perf risk) but worth deciding during the decision phase.
2. **Linear sub-issue numbering.** The actual `CROWDEV-XXX` IDs are assigned at issue creation. To be resolved when the parent issue is decomposed.
3. **Aceternity license enforcement.** Aceternity's free components are MIT-ish (copy-paste, no enforcement), but Pro is $199 lifetime. If we want any Pro components, that's a paid line item. Currently no Pro components are needed by the spec.
4. **Reference image.** The Linear issue includes [a reference image](https://uploads.linear.app/e85931a1-33eb-44b6-8807-c7194a7c05c8/6b264012-ecf0-433e-9dd4-058891384413/30c945fc-946d-4aed-9895-e54321507a2d) (signed URL, expires). Not consulted during brainstorm; the variants follow the user's verbal direction ("actual wallets, leather, premium"). Worth reviewing during implementation in case the image points toward a specific variant.

## 13. References

- Linear issue: [CROWDEV-420](https://linear.app/crowdevelopment/issue/CROWDEV-420)
- Current wallet card: `apps/app/src/components/wallets/WalletCard.tsx`
- Current wallets page: `apps/app/src/components/wallets/WalletsContent.tsx`
- UntitledUI credit card chassis: `packages/ui/src/components/untitledui/shared-assets/credit-card/credit-card.tsx`
- Prior 1B retheme spec (palette established): [CROWDEV-306](https://linear.app/crowdevelopment/issue/CROWDEV-306)
- Brainstorm visual companion mockups: `.superpowers/brainstorm/81206-1778603283/content/` (final = `variant-specs.html`)

### Component library URLs

- [Aceternity 3D Card Effect](https://ui.aceternity.com/components/3d-card-effect)
- [Aceternity Card Spotlight](https://ui.aceternity.com/components/card-spotlight)
- [Aceternity Glowing Effect](https://ui.aceternity.com/components/glowing-effect)
- [`liquid-glass-react`](https://github.com/rdev/liquid-glass-react)
- [`nikdelvin/liquid-glass`](https://github.com/nikdelvin/liquid-glass)
- [Cult UI Texture Card](https://www.cult-ui.com/docs/components/texture-card)
- [Magic UI MagicCard](https://magicui.design/docs/components/magic-card)
- [UntitledUI credit-card components](https://www.untitledui.com/react/components/credit-cards)
- [ibelick grainy backgrounds article](https://ibelick.com/blog/create-grainy-backgrounds-with-css)
- [Transparent Textures Leather](https://www.transparenttextures.com/leather.html) · [Dark Leather](https://www.transparenttextures.com/dark-leather.html)
- [Josh W. Comeau — Next-level frosted glass with backdrop-filter](https://www.joshwcomeau.com/css/backdrop-filter/)
- [kube.io — Liquid Glass with CSS and SVG](https://kube.io/blog/liquid-glass-css-svg/)

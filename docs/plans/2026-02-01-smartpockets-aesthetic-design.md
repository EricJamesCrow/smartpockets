# SmartPockets Brand Aesthetic Design

**Date:** 2026-02-01
**Status:** Ready for implementation
**Scope:** Alpha launch visual identity

## Overview

Define the SmartPockets visual identity for alpha launch. The goal is a clean, premium, Apple-like aesthetic using light backgrounds and green as the primary brand color—while leveraging existing UntitledUI components to ship fast.

## Design Principles

1. **Minimalist & Premium** - Clean like Apple, not dark like traditional fintech
2. **Light backgrounds** - White/light gray primary surfaces
3. **Green brand color** - Fresh, money-adjacent without being cliché
4. **Stock UntitledUI** - Don't reinvent components during alpha
5. **Ship fast** - Minimal changes, maximum impact

## Brand Color System

### Current State
Brand colors use a purple scale (`--color-brand-600: rgb(127 86 217)`).

### Target State
Brand colors use the existing UntitledUI green scale.

### Color Mapping

| Variable | Current (Purple) | New (Green) |
|----------|------------------|-------------|
| `--color-brand-25` | `rgb(252 250 255)` | `rgb(246 254 249)` |
| `--color-brand-50` | `rgb(249 245 255)` | `rgb(237 252 242)` |
| `--color-brand-100` | `rgb(244 235 255)` | `rgb(211 248 223)` |
| `--color-brand-200` | `rgb(233 215 254)` | `rgb(170 240 196)` |
| `--color-brand-300` | `rgb(214 187 251)` | `rgb(115 226 163)` |
| `--color-brand-400` | `rgb(182 146 246)` | `rgb(60 203 127)` |
| `--color-brand-500` | `rgb(158 119 237)` | `rgb(22 179 100)` |
| `--color-brand-600` | `rgb(127 86 217)` | `rgb(9 146 80)` |
| `--color-brand-700` | `rgb(105 65 198)` | `rgb(8 116 67)` |
| `--color-brand-800` | `rgb(83 56 158)` | `rgb(9 92 55)` |
| `--color-brand-900` | `rgb(66 48 125)` | `rgb(8 76 46)` |
| `--color-brand-950` | `rgb(44 28 95)` | `rgb(5 46 28)` |

### Implementation

Update `packages/ui/src/styles/theme.css`:

```css
/* Replace brand color definitions */
--color-brand-25: rgb(246 254 249);
--color-brand-50: rgb(237 252 242);
--color-brand-100: rgb(211 248 223);
--color-brand-200: rgb(170 240 196);
--color-brand-300: rgb(115 226 163);
--color-brand-400: rgb(60 203 127);
--color-brand-500: rgb(22 179 100);
--color-brand-600: rgb(9 146 80);
--color-brand-700: rgb(8 116 67);
--color-brand-800: rgb(9 92 55);
--color-brand-900: rgb(8 76 46);
--color-brand-950: rgb(5 46 28);
```

### What Changes Automatically

Once brand colors are swapped, these update globally:
- Primary buttons
- Link colors
- Focus rings
- Badge accents (brand color)
- Brand section backgrounds (CTAs, hero sections)
- Featured icons (brand theme)
- Navigation active states

### What Stays Unchanged

- Success states (separate `--color-success-*` scale)
- Error, warning states
- Gray scale
- All spacing, typography, component structure

## Logo Wordmark

### Design

Text-based logo using existing Inter font:
- **"Smart"** - `text-primary` (gray-900 in light mode)
- **"Pockets"** - `text-green-600` / `--color-brand-600`
- **Weight** - `font-semibold`

### Component

Create `packages/ui/src/untitledui/foundations/logo/smartpockets-logo.tsx`:

```tsx
import { cx } from "@/utils/cx";

interface SmartPocketsLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function SmartPocketsLogo({ className, size = "md" }: SmartPocketsLogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <span className={cx("font-semibold", sizeClasses[size], className)}>
      <span className="text-primary">Smart</span>
      <span className="text-fg-brand-primary">Pockets</span>
    </span>
  );
}
```

### Usage Locations

1. `apps/web` - Marketing site header and footer
2. `apps/app` - App header/sidebar
3. Email templates (future)

Replace all `UntitledLogo` imports with `SmartPocketsLogo`.

## Alpha Badge

### Design

Small badge next to the logo indicating alpha status.

### Implementation

Use UntitledUI's existing `Badge` component:

```tsx
<div className="flex items-center gap-2">
  <SmartPocketsLogo />
  <Badge size="sm" color="gray">Alpha</Badge>
</div>
```

### Placement

- Marketing site header (next to logo)
- App sidebar/header (next to logo)
- Optionally on pricing page

### Tone

Subtle but visible. Not apologetic—users should feel like early adopters, not beta testers.

## Files to Modify

### Phase 1: Brand Colors
- [ ] `packages/ui/src/styles/theme.css` - Swap brand color scale

### Phase 2: Logo Component
- [ ] Create `packages/ui/src/untitledui/foundations/logo/smartpockets-logo.tsx`
- [ ] Export from `packages/ui/src/untitledui/foundations/logo/index.ts`

### Phase 3: Update Headers/Footers
- [ ] `apps/web/src/app/layout.tsx` - Use SmartPocketsLogo
- [ ] Marketing header component - Add alpha badge
- [ ] Marketing footer component - Use SmartPocketsLogo
- [ ] `apps/app` sidebar/header - Use SmartPocketsLogo + alpha badge

## Out of Scope (Future Work)

These are explicitly NOT part of this design:

- Custom typography (keep Inter)
- Dark mode emphasis (light mode primary)
- Custom illustrations or graphics
- Email template styling (separate task in TODO.md)
- Animation/motion design
- Custom icon set

## Success Criteria

After implementation:
1. All purple accents are now green throughout the app
2. Logo displays as "Smart" (black) + "Pockets" (green) text
3. Alpha badge visible in headers
4. No visual regressions in existing components
5. Both light and dark modes work correctly with new brand colors

## References

- UntitledUI color system: `packages/ui/src/styles/theme.css`
- Current landing page: `apps/app/src/app/landing-page.tsx`
- Dashboard: `apps/app/src/app/(app)/dashboard/page.tsx`

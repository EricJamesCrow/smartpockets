# SmartPockets Aesthetic Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebrand SmartPockets from purple to green, add text-based logo, and alpha badge indicator.

**Architecture:** CSS variable swap for brand colors (12 variables), new logo component using existing Inter font, Badge component for alpha indicator. No structural changes to existing components.

**Tech Stack:** Tailwind CSS v4 with CSS custom properties, React components, UntitledUI component library.

**Design Doc:** `docs/plans/2026-02-01-smartpockets-aesthetic-design.md`

---

### Task 1: Swap Brand Colors in Theme

**Files:**
- Modify: `packages/ui/src/styles/theme.css:124-135` (light mode brand colors)

**Step 1: Update light mode brand color variables**

In `packages/ui/src/styles/theme.css`, replace the brand color definitions (lines ~124-135):

```css
/* Find and replace these values */
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

**Step 2: Verify the change**

Run: `cd /home/itsjusteric/Developer/smartpockets/.worktrees/smartpockets-aesthetic && npx tsc --noEmit`
Expected: No errors (CSS changes don't affect TypeScript)

**Step 3: Commit**

```bash
git add packages/ui/src/styles/theme.css
git commit -m "style: Change brand colors from purple to green

Swap brand color scale to use UntitledUI green palette:
- brand-600 is now rgb(9 146 80) for primary actions
- Full scale from brand-25 to brand-950 updated

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Create SmartPockets Logo Component

**Files:**
- Create: `packages/ui/src/untitledui/foundations/logo/smartpockets-logo.tsx`
- Modify: `packages/ui/src/untitledui/foundations/logo/index.ts`

**Step 1: Create the logo component**

Create `packages/ui/src/untitledui/foundations/logo/smartpockets-logo.tsx`:

```tsx
import { cx } from "../../../utils/cx";

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
    <span className={cx("font-semibold tracking-tight", sizeClasses[size], className)}>
      <span className="text-primary">Smart</span>
      <span className="text-fg-brand-primary">Pockets</span>
    </span>
  );
}
```

**Step 2: Export from index**

Add to `packages/ui/src/untitledui/foundations/logo/index.ts`:

```tsx
export { SmartPocketsLogo } from "./smartpockets-logo";
```

**Step 3: Verify TypeScript**

Run: `cd /home/itsjusteric/Developer/smartpockets/.worktrees/smartpockets-aesthetic && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/ui/src/untitledui/foundations/logo/smartpockets-logo.tsx packages/ui/src/untitledui/foundations/logo/index.ts
git commit -m "feat(ui): Add SmartPocketsLogo component

Text-based logo with 'Smart' in primary color and 'Pockets' in brand green.
Supports sm, md, lg sizes.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Create Alpha Badge Component

**Files:**
- Create: `packages/ui/src/untitledui/foundations/logo/alpha-badge.tsx`
- Modify: `packages/ui/src/untitledui/foundations/logo/index.ts`

**Step 1: Create the alpha badge component**

Create `packages/ui/src/untitledui/foundations/logo/alpha-badge.tsx`:

```tsx
import { Badge } from "../../base/badges/badges";
import { SmartPocketsLogo } from "./smartpockets-logo";
import { cx } from "../../../utils/cx";

interface SmartPocketsLogoWithBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showBadge?: boolean;
}

export function SmartPocketsLogoWithBadge({
  className,
  size = "md",
  showBadge = true
}: SmartPocketsLogoWithBadgeProps) {
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <SmartPocketsLogo size={size} />
      {showBadge && (
        <Badge size="sm" color="gray">
          Alpha
        </Badge>
      )}
    </div>
  );
}
```

**Step 2: Export from index**

Add to `packages/ui/src/untitledui/foundations/logo/index.ts`:

```tsx
export { SmartPocketsLogoWithBadge } from "./alpha-badge";
```

**Step 3: Verify TypeScript**

Run: `cd /home/itsjusteric/Developer/smartpockets/.worktrees/smartpockets-aesthetic && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/ui/src/untitledui/foundations/logo/alpha-badge.tsx packages/ui/src/untitledui/foundations/logo/index.ts
git commit -m "feat(ui): Add SmartPocketsLogoWithBadge component

Combines SmartPocketsLogo with optional Alpha badge.
Badge visibility controlled via showBadge prop.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Update Marketing Header

**Files:**
- Modify: `packages/ui/src/untitledui/marketing/header-navigation/header.tsx` (or equivalent marketing header)

**Step 1: Find the marketing header**

Run: `grep -r "UntitledLogo" packages/ui/src/untitledui/marketing/ --include="*.tsx" -l`

This will identify which header files use UntitledLogo.

**Step 2: Replace UntitledLogo import and usage**

In the header file(s), replace:
- `import { UntitledLogo } from "..."` → `import { SmartPocketsLogoWithBadge } from "@/untitledui/foundations/logo"`
- `<UntitledLogo ... />` → `<SmartPocketsLogoWithBadge size="md" />`

**Step 3: Verify TypeScript**

Run: `cd /home/itsjusteric/Developer/smartpockets/.worktrees/smartpockets-aesthetic && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/ui/src/untitledui/marketing/
git commit -m "feat(marketing): Use SmartPockets logo in header

Replace UntitledLogo with SmartPocketsLogoWithBadge in marketing header.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Update Marketing Footer

**Files:**
- Modify: Marketing footer component (location found via grep)

**Step 1: Find the marketing footer**

Run: `grep -r "UntitledLogo" packages/ui/src/untitledui/marketing/ --include="*.tsx" -l`

**Step 2: Replace UntitledLogo in footer**

In footer file(s), replace:
- `import { UntitledLogo } from "..."` → `import { SmartPocketsLogo } from "@/untitledui/foundations/logo"`
- `<UntitledLogo ... />` → `<SmartPocketsLogo size="md" />`

Note: Footer uses `SmartPocketsLogo` without badge (cleaner).

**Step 3: Verify TypeScript**

Run: `cd /home/itsjusteric/Developer/smartpockets/.worktrees/smartpockets-aesthetic && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/ui/src/untitledui/marketing/
git commit -m "feat(marketing): Use SmartPockets logo in footer

Replace UntitledLogo with SmartPocketsLogo in marketing footer.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Update App Sidebar/Header

**Files:**
- Modify: App layout components in `apps/app/src/`

**Step 1: Find app layout with logo**

Run: `grep -r "UntitledLogo\|Logo" apps/app/src/ --include="*.tsx" -l | head -10`

**Step 2: Replace logo in app layout**

In app header/sidebar, replace with `SmartPocketsLogoWithBadge`:

```tsx
import { SmartPocketsLogoWithBadge } from "@repo/ui/untitledui/foundations/logo";

// In JSX:
<SmartPocketsLogoWithBadge size="md" />
```

**Step 3: Verify TypeScript**

Run: `cd /home/itsjusteric/Developer/smartpockets/.worktrees/smartpockets-aesthetic && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/app/src/
git commit -m "feat(app): Use SmartPockets logo in app header

Replace generic logo with SmartPocketsLogoWithBadge in authenticated app.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Update SpendingBreakdown Chart Colors

**Files:**
- Modify: `apps/app/src/app/(app)/dashboard/components/SpendingBreakdown.tsx:12-19`

**Step 1: Update chart colors to use green primary**

Replace the COLORS array to use green as the primary color:

```tsx
const COLORS = [
  "#099250", // Green (brand-600)
  "#0BA5EC", // Blue
  "#F79009", // Orange
  "#7F56D9", // Purple
  "#F04438", // Red
  "#667085", // Gray (Other)
];
```

**Step 2: Verify TypeScript**

Run: `cd /home/itsjusteric/Developer/smartpockets/.worktrees/smartpockets-aesthetic && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/app/src/app/(app)/dashboard/components/SpendingBreakdown.tsx
git commit -m "style(dashboard): Update chart colors to use green primary

Change SpendingBreakdown pie chart to use brand green as primary color.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Final Verification

**Step 1: Run full TypeScript check**

Run: `cd /home/itsjusteric/Developer/smartpockets/.worktrees/smartpockets-aesthetic && npx tsc --noEmit`
Expected: No errors

**Step 2: Visual verification (manual)**

Start dev server and check:
- [ ] Buttons are green instead of purple
- [ ] Links are green instead of purple
- [ ] Logo shows "Smart" (black) + "Pockets" (green)
- [ ] Alpha badge appears next to logo in headers
- [ ] Focus rings are green
- [ ] Pie chart uses green as primary color

**Step 3: Create summary commit (if any missed files)**

```bash
git status
# If any unstaged changes:
git add -A
git commit -m "chore: Complete SmartPockets aesthetic rebrand

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Checklist

After all tasks complete:

- [ ] Brand colors are green throughout (buttons, links, focus rings)
- [ ] SmartPocketsLogo renders correctly in all sizes
- [ ] Alpha badge appears in marketing header
- [ ] Alpha badge appears in app header
- [ ] Footer shows logo without badge
- [ ] Chart colors use green as primary
- [ ] TypeScript passes with no errors
- [ ] No visual regressions in existing components

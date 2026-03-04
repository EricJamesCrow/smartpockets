# Auth and Routing Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move sign-in/sign-up to marketing site, rename dashboard to home at `/`, and redirect unauthenticated app users to marketing site.

**Architecture:** Marketing site (smartpockets.com) handles auth with Clerk's pre-built components. App (app.smartpockets.com) is authenticated-only and redirects unauth users to marketing homepage. Dashboard content moves to root `/` with "Home" at top of sidebar.

**Tech Stack:** Next.js 16, Clerk (pre-built components), React 19

---

## Phase 1: Set up auth on marketing site (apps/web)

### Task 1: Add Clerk dependencies to apps/web

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Add Clerk packages**

Run from worktree root:
```bash
cd apps/web && bun add @clerk/nextjs @clerk/themes
```

**Step 2: Verify packages added**

Run: `grep clerk apps/web/package.json`
Expected: Lines showing `@clerk/nextjs` and `@clerk/themes`

**Step 3: Commit**

```bash
git add apps/web/package.json bun.lock
git commit -m "$(cat <<'EOF'
chore(web): add Clerk dependencies

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Update layout.tsx with ClerkProvider

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

**Step 1: Update layout to wrap with ClerkProvider**

Replace the entire file with:

```tsx
import { ClerkProvider } from "@clerk/nextjs";
import "@repo/ui/globals.css";
import "@repo/ui/theme.css";

export const metadata = {
  title: "SmartPockets - Smart Credit Card Management",
  description: "Organize your credit cards into wallets, track spending, and never miss a payment.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-primary text-primary antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd apps/web && bun run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "$(cat <<'EOF'
feat(web): wrap layout with ClerkProvider

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Create sign-in page

**Files:**
- Create: `apps/web/src/app/sign-in/[[...sign-in]]/page.tsx`

**Step 1: Create directory structure**

```bash
mkdir -p apps/web/src/app/sign-in/\[\[...sign-in\]\]
```

**Step 2: Create sign-in page**

Create `apps/web/src/app/sign-in/[[...sign-in]]/page.tsx`:

```tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
      <SignIn />
    </div>
  );
}
```

**Step 3: Verify file created**

Run: `ls apps/web/src/app/sign-in/*/page.tsx`
Expected: Shows the page.tsx file

**Step 4: Commit**

```bash
git add apps/web/src/app/sign-in
git commit -m "$(cat <<'EOF'
feat(web): add sign-in page with Clerk component

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Create sign-up page

**Files:**
- Create: `apps/web/src/app/sign-up/[[...sign-up]]/page.tsx`

**Step 1: Create directory structure**

```bash
mkdir -p apps/web/src/app/sign-up/\[\[...sign-up\]\]
```

**Step 2: Create sign-up page**

Create `apps/web/src/app/sign-up/[[...sign-up]]/page.tsx`:

```tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
      <SignUp />
    </div>
  );
}
```

**Step 3: Verify file created**

Run: `ls apps/web/src/app/sign-up/*/page.tsx`
Expected: Shows the page.tsx file

**Step 4: Commit**

```bash
git add apps/web/src/app/sign-up
git commit -m "$(cat <<'EOF'
feat(web): add sign-up page with Clerk component

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Create .env.local for marketing site

**Files:**
- Create: `apps/web/.env.local`

**Step 1: Create env file**

Create `apps/web/.env.local`:

```bash
# Clerk Authentication (same keys as apps/app)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Z3VpZGVkLXBhcnJvdC04MS5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_DDTfET2A88IyXjeKfBf6L2iH8OpBaHTB8cQAHLdXfI

# Redirect to app subdomain after auth
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=https://app.smartpockets.com/
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=https://app.smartpockets.com/
```

**Step 2: Verify .env.local is gitignored**

Run: `git check-ignore apps/web/.env.local && echo "ignored" || echo "NOT ignored"`
Expected: "ignored"

**Note:** Do NOT commit this file. This is for local development only.

---

### Task 6: Update header buttons to use relative paths

**Files:**
- Modify: `apps/web/src/components/marketing/header-navigation/header.tsx`

**Step 1: Update header.tsx**

Find and replace all instances of `${APP_URL}/sign-in` with `/sign-in` and `${APP_URL}/sign-up` with `/sign-up`.

Remove the `APP_URL` constant at the top of the file.

The button hrefs should change from:
```tsx
<Button href={`${APP_URL}/sign-in`} ...>Log in</Button>
<Button href={`${APP_URL}/sign-up`} ...>Sign up</Button>
```

To:
```tsx
<Button href="/sign-in" ...>Log in</Button>
<Button href="/sign-up" ...>Sign up</Button>
```

**Step 2: Verify no TypeScript errors**

Run: `cd apps/web && bun run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/web/src/components/marketing/header-navigation/header.tsx
git commit -m "$(cat <<'EOF'
feat(web): update auth buttons to use relative paths

Sign-in and sign-up now route to local pages instead of
external app subdomain.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Update landing page CTA buttons

**Files:**
- Modify: `apps/web/src/app/page.tsx`

**Step 1: Update page.tsx**

Find all hrefs that point to `${APP_URL}/sign-up` or `${APP_URL}/sign-in` and replace with relative paths `/sign-up` and `/sign-in`.

Remove the `APP_URL` constant if it exists.

**Step 2: Verify no TypeScript errors**

Run: `cd apps/web && bun run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "$(cat <<'EOF'
feat(web): update landing page CTAs to use relative auth paths

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: Update app routing (apps/app)

### Task 8: Create home page at root of (app) route group

**Files:**
- Create: `apps/app/src/app/(app)/page.tsx`

**Step 1: Create home page**

Create `apps/app/src/app/(app)/page.tsx` with the dashboard content:

```tsx
"use client";

import { AlertBanner } from "./dashboard/components/AlertBanner";
import { HeroMetrics } from "./dashboard/components/HeroMetrics";
import { UpcomingPayments } from "./dashboard/components/UpcomingPayments";
import { YourCards } from "./dashboard/components/YourCards";
import { ConnectedBanks } from "./dashboard/components/ConnectedBanks";
import { SpendingBreakdown } from "./dashboard/components/SpendingBreakdown";
import { RecentTransactions } from "./dashboard/components/RecentTransactions";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      {/* Critical Alert Banner */}
      <AlertBanner />

      {/* Hero Metrics */}
      <HeroMetrics />

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          <UpcomingPayments />
          <ConnectedBanks />
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <YourCards />
          <SpendingBreakdown />
        </div>
      </div>

      {/* Recent Transactions - Full Width */}
      <RecentTransactions />
    </div>
  );
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd apps/app && bun run typecheck`
Expected: No errors (may have some unrelated warnings)

**Step 3: Commit**

```bash
git add "apps/app/src/app/(app)/page.tsx"
git commit -m "$(cat <<'EOF'
feat(app): add home page at root of authenticated routes

Home page contains the same content as dashboard, now at "/" path.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Add Home to sidebar navigation

**Files:**
- Modify: `apps/app/src/components/application/dashboard-sidebar.tsx`

**Step 1: Update imports**

Add `Home03` to the icon imports:

```tsx
import {
    BarChartSquare02,
    CreditCard01,
    Home03,
    Receipt,
    SearchLg,
    Settings01,
    Wallet01,
} from "@untitledui/icons";
```

**Step 2: Update navItemsSimple array**

Add Home as the first item:

```tsx
const navItemsSimple: NavItemType[] = [
    {
        label: "Home",
        href: "/",
        icon: Home03,
    },
    {
        label: "Credit Cards",
        href: "/credit-cards",
        icon: CreditCard01,
    },
    {
        label: "Transactions",
        href: "/transactions",
        icon: Receipt,
    },
    {
        label: "Wallets",
        href: "/wallets",
        icon: Wallet01,
    },
];
```

**Step 3: Update commandRoutes**

Change `dashboard` to `home` and update the path:

```tsx
const commandRoutes: Record<string, string> = {
    home: "/",
    "credit-cards": "/credit-cards",
    transactions: "/transactions",
    wallets: "/wallets",
    settings: "/settings",
};
```

**Step 4: Update CommandMenu items**

Change the Dashboard command menu item to Home:

```tsx
<CommandMenu.Item id="home" label="Home" type="icon" icon={Home03} />
```

**Step 5: Verify no TypeScript errors**

Run: `cd apps/app && bun run typecheck`
Expected: No errors

**Step 6: Commit**

```bash
git add apps/app/src/components/application/dashboard-sidebar.tsx
git commit -m "$(cat <<'EOF'
feat(app): add Home to sidebar navigation

- Add Home as first nav item with Home03 icon
- Update command menu routing from /dashboard to /
- Update command palette to show Home instead of Dashboard

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Delete dashboard route

**Files:**
- Delete: `apps/app/src/app/(app)/dashboard/` (entire directory)

**Step 1: Move dashboard components to shared location**

First, we need to keep the components but remove the route. The components are already imported by relative path from the new home page, so we just need to keep the components directory.

Actually, looking at Task 8, we import from `./dashboard/components/`. This means the dashboard folder must stay as a components folder. Let's keep the components but delete just the page.tsx.

**Step 1 (revised): Delete only the dashboard page.tsx**

```bash
rm "apps/app/src/app/(app)/dashboard/page.tsx"
```

**Step 2: Verify components still exist**

Run: `ls "apps/app/src/app/(app)/dashboard/components/"`
Expected: Shows AlertBanner.tsx, HeroMetrics.tsx, etc.

**Step 3: Commit**

```bash
git add "apps/app/src/app/(app)/dashboard/page.tsx"
git commit -m "$(cat <<'EOF'
refactor(app): remove /dashboard route

Dashboard content now served at "/" via home page.
Components kept in dashboard/components/ for import.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Delete landing page from app

**Files:**
- Delete: `apps/app/src/app/page.tsx`
- Delete: `apps/app/src/app/landing-page.tsx`

**Step 1: Delete landing page files**

```bash
rm apps/app/src/app/page.tsx
rm apps/app/src/app/landing-page.tsx
```

**Step 2: Verify files deleted**

Run: `ls apps/app/src/app/page.tsx apps/app/src/app/landing-page.tsx 2>&1`
Expected: "No such file or directory" errors

**Step 3: Commit**

```bash
git add apps/app/src/app/page.tsx apps/app/src/app/landing-page.tsx
git commit -m "$(cat <<'EOF'
refactor(app): remove duplicate landing page

Landing page now only exists on marketing site (apps/web).
App root will be handled by (app) route group.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Update auth redirects (apps/app)

### Task 12: Create middleware to redirect unauth users

**Files:**
- Create: `apps/app/src/middleware.ts`

**Step 1: Create middleware**

Create `apps/app/src/middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// API routes should not redirect (they return 401 instead)
const isApiRoute = createRouteMatcher(["/api/(.*)"]);

// Marketing site URL
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || "https://smartpockets.com";

export default clerkMiddleware(async (auth, req) => {
  // Skip redirect for API routes
  if (isApiRoute(req)) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  const { userId } = await auth();

  // Redirect unauthenticated users to marketing site
  if (!userId) {
    return NextResponse.redirect(MARKETING_URL);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

**Step 2: Verify no TypeScript errors**

Run: `cd apps/app && bun run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/app/src/middleware.ts
git commit -m "$(cat <<'EOF'
feat(app): add middleware to redirect unauth users to marketing

Unauthenticated users visiting the app subdomain are redirected
to the marketing site homepage.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Update Clerk env vars

**Files:**
- Modify: `apps/app/.env.local`

**Step 1: Update redirect URLs**

Update the following env vars in `apps/app/.env.local`:

```bash
# Change from /dashboard to /
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# Add marketing URL for middleware
NEXT_PUBLIC_MARKETING_URL=https://smartpockets.com
```

**Step 2: Note for Vercel**

**IMPORTANT:** These same env vars must be updated in Vercel dashboard for production:
- `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/`
- `NEXT_PUBLIC_MARKETING_URL=https://smartpockets.com`

Also add to Vercel for apps/web:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=https://app.smartpockets.com/`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=https://app.smartpockets.com/`

**Note:** Do NOT commit .env.local files.

---

## Phase 4: Cleanup

### Task 14: Verify and test

**Step 1: Run typecheck for both apps**

```bash
cd apps/app && bun run typecheck
cd ../web && bun run typecheck
```

Expected: No errors

**Step 2: Test locally**

1. Start both apps: `bun run dev`
2. Visit `localhost:3001` (marketing) - should show landing page
3. Click "Sign up" - should go to `/sign-up` on same domain
4. Visit `localhost:3000` (app) while logged out - should redirect to marketing
5. After signing in - should land on home page at `/`
6. Home button in sidebar should navigate to `/`
7. `/dashboard` should 404

**Step 3: Final commit with all cleanup**

```bash
git status  # Check for any uncommitted changes
# If any cleanup needed, stage and commit
```

---

## Summary of Files Changed

**apps/web (Marketing Site):**
- `package.json` - Added Clerk dependencies
- `src/app/layout.tsx` - Added ClerkProvider
- `src/app/sign-in/[[...sign-in]]/page.tsx` - Created
- `src/app/sign-up/[[...sign-up]]/page.tsx` - Created
- `src/components/marketing/header-navigation/header.tsx` - Relative auth paths
- `src/app/page.tsx` - Relative auth paths
- `.env.local` - Created (not committed)

**apps/app (Authenticated App):**
- `src/app/(app)/page.tsx` - Created (home page)
- `src/app/(app)/dashboard/page.tsx` - Deleted
- `src/app/page.tsx` - Deleted
- `src/app/landing-page.tsx` - Deleted
- `src/components/application/dashboard-sidebar.tsx` - Added Home nav item
- `src/middleware.ts` - Created
- `.env.local` - Modified (not committed)

---

## Vercel Env Vars Checklist

**apps/web:**
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`
- [ ] `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=https://app.smartpockets.com/`
- [ ] `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=https://app.smartpockets.com/`

**apps/app:**
- [ ] `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/`
- [ ] `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/`
- [ ] `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/`
- [ ] `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/`
- [ ] `NEXT_PUBLIC_MARKETING_URL=https://smartpockets.com`

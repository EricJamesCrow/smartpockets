# Auth and Routing Consolidation Design

## Summary

Consolidate authentication on the marketing site (smartpockets.com) and restructure the app (app.smartpockets.com) routing so the dashboard becomes the home page at `/`.

## Goals

1. Move sign-in/sign-up to marketing site using Clerk's pre-built components
2. Rename "Dashboard" to "Home" and move it to root `/` path
3. Add "Home" button to top of sidebar navigation
4. Redirect unauthenticated app users to marketing homepage
5. Remove duplicate landing page from apps/app

## Architecture

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│   smartpockets.com (marketing)  │     │  app.smartpockets.com (app)     │
├─────────────────────────────────┤     ├─────────────────────────────────┤
│  /           → Landing page     │     │  /           → Home (auth req)  │
│  /sign-in    → Clerk <SignIn/>  │     │  /credit-cards → Cards          │
│  /sign-up    → Clerk <SignUp/>  │     │  /transactions → Transactions   │
│  /pricing    → Pricing          │     │  /wallets      → Wallets        │
│  ...                            │     │  /settings     → Settings       │
├─────────────────────────────────┤     ├─────────────────────────────────┤
│  Clerk: YES (handles auth)      │     │  Clerk: YES (checks auth)       │
│  Unauth users: Welcome here     │     │  Unauth users: → smartpockets.com│
└─────────────────────────────────┘     └─────────────────────────────────┘
```

### Auth Flow

1. User visits `smartpockets.com`, clicks "Sign up"
2. Goes to `smartpockets.com/sign-up`, sees Clerk's `<SignUp />` component
3. After sign-up, redirected to `app.smartpockets.com/`
4. If session expires and they try to access app, they're sent to `smartpockets.com`

## Changes by App

### apps/web (Marketing Site)

**New files:**

| File | Purpose |
|------|---------|
| `src/app/sign-in/[[...sign-in]]/page.tsx` | Clerk `<SignIn />` component |
| `src/app/sign-up/[[...sign-up]]/page.tsx` | Clerk `<SignUp />` component |

**Modified files:**

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Wrap with `<ClerkProvider>` |
| `src/components/marketing/header-navigation/header.tsx` | Change `${APP_URL}/sign-in` to `/sign-in` (relative) |
| `src/app/page.tsx` | Change sign-up button hrefs to relative `/sign-up` |

**Environment variables to add:**

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=https://app.smartpockets.com/
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=https://app.smartpockets.com/
```

### apps/app (Authenticated App)

**Route changes:**

| Action | Details |
|--------|---------|
| Move | `src/app/(app)/dashboard/` content → `src/app/(app)/page.tsx` |
| Delete | `src/app/page.tsx` (landing page export) |
| Delete | `src/app/landing-page.tsx` (landing page component) |
| Delete | `src/app/(app)/dashboard/` directory |

**Modified files:**

| File | Change |
|------|--------|
| `src/middleware.ts` | Redirect unauth users to `https://smartpockets.com` |
| `src/components/application/dashboard-sidebar.tsx` | Add "Home" nav item at top, update routes |

**Environment variable changes:**

```bash
# Change from /dashboard to /
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

### Sidebar Navigation (After)

```typescript
const navItems: NavItemType[] = [
    { label: "Home", href: "/", icon: Home03 },
    { label: "Credit Cards", href: "/credit-cards", icon: CreditCard01 },
    { label: "Transactions", href: "/transactions", icon: Receipt },
    { label: "Wallets", href: "/wallets", icon: Wallet01 },
];
```

## Implementation Order

### Phase 1: Set up auth on marketing site (apps/web)

1. Add Clerk dependencies to apps/web
2. Update layout.tsx with ClerkProvider
3. Create `/sign-in` and `/sign-up` pages with Clerk components
4. Add environment variables to .env.local
5. Update header buttons to use relative `/sign-in` and `/sign-up` paths
6. Update landing page CTA buttons to use relative paths

### Phase 2: Update app routing (apps/app)

1. Create new home page at `src/app/(app)/page.tsx` with dashboard content
2. Add "Home" to sidebar navigation (top of list, with icon)
3. Update command menu routes (dashboard → home at `/`)
4. Delete `/dashboard` route directory
5. Delete landing page files (`src/app/page.tsx`, `src/app/landing-page.tsx`)

### Phase 3: Update auth redirects (apps/app)

1. Update middleware to redirect unauth users to marketing site
2. Update Clerk env vars to redirect to `/` instead of `/dashboard`
3. Update Vercel env vars for both apps

### Phase 4: Cleanup

1. Remove dead code/imports referencing old routes
2. Remove `APP_URL` constant from marketing site (no longer needed for auth links)
3. Test full auth flow end-to-end

## Testing Checklist

- [ ] Unauthenticated user on `app.smartpockets.com/*` → redirected to `smartpockets.com`
- [ ] Sign up on marketing site → lands on `app.smartpockets.com/`
- [ ] Sign in on marketing site → lands on `app.smartpockets.com/`
- [ ] Home button in sidebar navigates to `/`
- [ ] `/` shows home page content (formerly dashboard)
- [ ] `/dashboard` returns 404
- [ ] All other app routes still work (`/credit-cards`, `/transactions`, `/wallets`, `/settings`)
- [ ] Sign out → redirected to marketing site

## Decisions Made

| Question | Decision |
|----------|----------|
| Where does auth live? | Marketing site (smartpockets.com) |
| Unauth user on app subdomain? | Redirect to marketing homepage |
| Post-auth redirect behavior? | Always home (`/`), no "return to destination" |
| Home button placement? | Top of sidebar nav list |
| What happens to `/dashboard`? | Removed, content moves to `/` |
| Auth page implementation? | Clerk's pre-built `<SignIn/>` and `<SignUp/>` components |

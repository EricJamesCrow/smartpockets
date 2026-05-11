import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// API routes should not redirect (they return 401 instead)
const isApiRoute = createRouteMatcher(["/api/(.*)"]);

// Test-only entry point that loads `<ClerkProvider>` so `window.Clerk` is
// available for Playwright's `clerk.signIn` helper. The route is gated to
// non-production at the page level (`apps/app/src/app/e2e-bootstrap/page.tsx`
// 404s in production) and the matcher here mirrors that — we never let the
// route bypass auth in production, even if the page file were accidentally
// shipped. See `apps/app/tests/helpers/auth.ts` for the helper that uses it.
const isE2eBootstrapRoute = createRouteMatcher(["/e2e-bootstrap"]);

// Marketing site URL (use localhost in development)
const MARKETING_URL =
  process.env.NODE_ENV === "development"
    ? process.env.NEXT_PUBLIC_LOCAL_MARKETING_URL || "http://localhost:3001"
    : process.env.NEXT_PUBLIC_MARKETING_URL || "https://smartpockets.com";

export default clerkMiddleware(async (auth, req) => {
  // Skip redirect for API routes
  if (isApiRoute(req)) {
    return NextResponse.next();
  }

  // Skip redirect for the e2e bootstrap route in non-production only. The
  // route itself 404s in production; this guard is belt-and-suspenders so a
  // misbuilt prod bundle can't be coerced into serving an unauthenticated
  // page with `<ClerkProvider>` loaded.
  if (
    process.env.NODE_ENV !== "production" &&
    isE2eBootstrapRoute(req)
  ) {
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

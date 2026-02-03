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

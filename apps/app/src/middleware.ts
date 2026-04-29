import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// API routes should not redirect (they return 401 instead)
const isApiRoute = createRouteMatcher(["/api/(.*)"]);
const DEFAULT_LOCAL_MARKETING_URL = "http://localhost:3001";
const DEFAULT_PREVIEW_MARKETING_URL = "https://preview.smartpockets.com";
const DEFAULT_PRODUCTION_MARKETING_URL = "https://smartpockets.com";

function getAuthHostUrl() {
    if (process.env.NODE_ENV === "development") {
        return process.env.NEXT_PUBLIC_LOCAL_MARKETING_URL || DEFAULT_LOCAL_MARKETING_URL;
    }

    if (process.env.VERCEL_ENV === "preview") {
        return DEFAULT_PREVIEW_MARKETING_URL;
    }

    return process.env.NEXT_PUBLIC_MARKETING_URL || DEFAULT_PRODUCTION_MARKETING_URL;
}

function buildAuthPageUrl(pathname: "/sign-in" | "/sign-up") {
    return new URL(pathname, getAuthHostUrl()).toString();
}

const CLERK_SIGN_IN_URL = buildAuthPageUrl("/sign-in");
const CLERK_SIGN_UP_URL = buildAuthPageUrl("/sign-up");

export default clerkMiddleware(
    async (auth, req) => {
        // Skip redirect for API routes
        if (isApiRoute(req)) {
            return NextResponse.next();
        }

        // Check if user is authenticated
        const { userId } = await auth();

        // Redirect unauthenticated users to the stable auth host. The auth host owns
        // post-login fallback routing, which avoids custom redirect state loops.
        if (!userId) {
            return NextResponse.redirect(CLERK_SIGN_IN_URL);
        }

        return NextResponse.next();
    },
    (req) => ({
        domain: req.nextUrl.host,
        isSatellite: true,
        signInUrl: CLERK_SIGN_IN_URL,
        signUpUrl: CLERK_SIGN_UP_URL,
    }),
);

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};

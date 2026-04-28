import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { buildAuthPageUrl, buildSignInRedirectUrl, getAuthHostUrl } from "@/lib/auth-routing";

// API routes should not redirect (they return 401 instead)
const isApiRoute = createRouteMatcher(["/api/(.*)"]);
const AUTH_HOST_URL = getAuthHostUrl();
const CLERK_SIGN_IN_URL = buildAuthPageUrl(AUTH_HOST_URL, "/sign-in");
const CLERK_SIGN_UP_URL = buildAuthPageUrl(AUTH_HOST_URL, "/sign-up");

export default clerkMiddleware(
    async (auth, req) => {
        // Skip redirect for API routes
        if (isApiRoute(req)) {
            return NextResponse.next();
        }

        // Check if user is authenticated
        const { userId } = await auth();

        // Redirect unauthenticated users to the auth host, then back to this app URL.
        if (!userId) {
            return NextResponse.redirect(
                buildSignInRedirectUrl({
                    authHostUrl: AUTH_HOST_URL,
                    requestUrl: req.nextUrl,
                }),
            );
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

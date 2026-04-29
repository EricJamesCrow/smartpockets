"use client";

import { ClerkProvider } from "@clerk/nextjs";

const DEFAULT_LOCAL_APP_ORIGIN = "http://localhost:3000";
const DEFAULT_PREVIEW_APP_ORIGIN = "https://app.preview.smartpockets.com";
const DEFAULT_PRODUCTION_APP_ORIGIN = "https://app.smartpockets.com";

function getOrigin(url: string, fallback: string) {
    try {
        return new URL(url).origin;
    } catch {
        return fallback;
    }
}

export function SmartPocketsClerkProvider({ appOrigin, children }: { appOrigin: string; children: React.ReactNode }) {
    const safeAppOrigin = getOrigin(appOrigin, DEFAULT_PRODUCTION_APP_ORIGIN);
    const allowedRedirectOrigins = Array.from(
        new Set([
            safeAppOrigin,
            DEFAULT_PRODUCTION_APP_ORIGIN,
            DEFAULT_PREVIEW_APP_ORIGIN,
            DEFAULT_LOCAL_APP_ORIGIN,
        ]),
    );

    return (
        <ClerkProvider
            allowedRedirectOrigins={allowedRedirectOrigins}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl={safeAppOrigin}
            signUpFallbackRedirectUrl={safeAppOrigin}
        >
            {children}
        </ClerkProvider>
    );
}

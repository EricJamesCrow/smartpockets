"use client";

import { ClerkProvider } from "@clerk/nextjs";

const APP_PREVIEW_ORIGIN_PATTERN = /^https:\/\/smartpockets-app(?:-git)?-[a-z0-9-]+-crow-commerce\.vercel\.app$/;

function getOrigin(url: string) {
    try {
        return new URL(url).origin;
    } catch {
        return url;
    }
}

export function SmartPocketsClerkProvider({ appUrl, children }: { appUrl: string; children: React.ReactNode }) {
    const appOrigin = getOrigin(appUrl);
    const allowedRedirectOrigins: Array<string | RegExp> = [appOrigin, "https://app.smartpockets.com", "http://localhost:3000", APP_PREVIEW_ORIGIN_PATTERN];

    return (
        <ClerkProvider
            allowedRedirectOrigins={allowedRedirectOrigins}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl={appUrl}
            signUpFallbackRedirectUrl={appUrl}
        >
            {children}
        </ClerkProvider>
    );
}

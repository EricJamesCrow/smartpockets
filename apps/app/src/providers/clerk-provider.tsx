"use client";

import { ClerkProvider } from "@clerk/nextjs";

export function SmartPocketsAppClerkProvider({
    children,
    domain,
    signInUrl,
    signUpUrl,
}: {
    children: React.ReactNode;
    domain: string;
    signInUrl: string;
    signUpUrl: string;
}) {
    return (
        <ClerkProvider domain={domain} isSatellite signInUrl={signInUrl} signUpUrl={signUpUrl}>
            {children}
        </ClerkProvider>
    );
}

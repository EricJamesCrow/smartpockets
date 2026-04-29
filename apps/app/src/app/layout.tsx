import { ClerkProvider } from "@clerk/nextjs";
import "@repo/ui/globals.css";
import { Toaster } from "@repo/ui/untitledui/application/notifications/toaster";
import { cx } from "@repo/ui/utils";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { AppearanceProvider } from "@/providers/appearance-provider";
import { ConvexClientProvider } from "@/providers/convex-provider";
import { RouteProvider } from "@/providers/router-provider";
import { Theme } from "@/providers/theme";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});
const DEFAULT_LOCAL_MARKETING_URL = "http://localhost:3001";
const DEFAULT_PREVIEW_MARKETING_URL = "https://preview.smartpockets.com";
const DEFAULT_PRODUCTION_MARKETING_URL = "https://smartpockets.com";
const DEFAULT_PRODUCTION_APP_HOST = "app.smartpockets.com";

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

async function getClerkSatelliteDomain() {
    const headersList = await headers();

    return headersList.get("x-forwarded-host") || headersList.get("host") || DEFAULT_PRODUCTION_APP_HOST;
}

export const metadata: Metadata = {
    title: "SmartPockets - Smart Credit Card Management",
    description: "Organize your credit cards into wallets, track spending, and never miss a payment.",
};

export const viewport: Viewport = {
    themeColor: "#7f56d9",
    colorScheme: "light dark",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const clerkSatelliteDomain = await getClerkSatelliteDomain();

    return (
        <html lang="en" suppressHydrationWarning>
            <body className={cx(inter.variable, "bg-primary antialiased")}>
                <ClerkProvider domain={clerkSatelliteDomain} isSatellite signInUrl={CLERK_SIGN_IN_URL} signUpUrl={CLERK_SIGN_UP_URL}>
                    <ConvexClientProvider>
                        <RouteProvider>
                            <Theme>
                                <AppearanceProvider>
                                    {children}
                                    <Toaster />
                                </AppearanceProvider>
                            </Theme>
                        </RouteProvider>
                    </ConvexClientProvider>
                </ClerkProvider>
            </body>
        </html>
    );
}

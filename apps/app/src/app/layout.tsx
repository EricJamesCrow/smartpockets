import { ClerkProvider } from "@clerk/nextjs";
import "@repo/ui/globals.css";
import { Toaster } from "@repo/ui/untitledui/application/notifications/toaster";
import { cx } from "@repo/ui/utils";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { buildAuthPageUrl, getAuthHostUrl } from "@/lib/auth-routing";
import { AppearanceProvider } from "@/providers/appearance-provider";
import { ConvexClientProvider } from "@/providers/convex-provider";
import { RouteProvider } from "@/providers/router-provider";
import { Theme } from "@/providers/theme";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});
const AUTH_HOST_URL = getAuthHostUrl();
const CLERK_SIGN_IN_URL = buildAuthPageUrl(AUTH_HOST_URL, "/sign-in");
const CLERK_SIGN_UP_URL = buildAuthPageUrl(AUTH_HOST_URL, "/sign-up");
const DEFAULT_PRODUCTION_APP_HOST = "app.smartpockets.com";

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

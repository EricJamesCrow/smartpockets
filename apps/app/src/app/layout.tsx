import { ClerkProvider } from "@clerk/nextjs";
import "@repo/ui/globals.css";
import "./globals.css";
import { Toaster } from "@repo/ui/untitledui/application/notifications/toaster";
import { cx } from "@repo/ui/utils";
import type { Metadata, Viewport } from "next";
import { Geist, IBM_Plex_Sans_Condensed, JetBrains_Mono } from "next/font/google";
import { AppearanceProvider } from "@/providers/appearance-provider";
import { ConvexClientProvider } from "@/providers/convex-provider";
import { RouteProvider } from "@/providers/router-provider";
import { Theme } from "@/providers/theme";

// 2B Bloomberg-Terminal cockpit fonts. Display = IBM Plex Sans Condensed
// (industrial readout face that pairs with JetBrains Mono numerals). Body =
// Geist for human prose. Mono = JetBrains Mono for tabular figures, codes,
// and live-data deltas.
const ibmPlexCondensed = IBM_Plex_Sans_Condensed({
    subsets: ["latin"],
    weight: ["500", "600", "700"],
    variable: "--font-display",
    display: "swap",
});

const geist = Geist({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    variable: "--font-geist",
    display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    variable: "--font-jetbrains-mono",
    display: "swap",
});

export const metadata: Metadata = {
    title: "SmartPockets - Smart Credit Card Management",
    description: "Organize your credit cards into wallets, track spending, and never miss a payment.",
};

export const viewport: Viewport = {
    themeColor: "#0c0e12",
    colorScheme: "dark",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark-mode" suppressHydrationWarning>
            <body
                className={cx(
                    ibmPlexCondensed.variable,
                    geist.variable,
                    jetbrainsMono.variable,
                    "bg-primary text-primary antialiased",
                )}
            >
                <ClerkProvider>
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

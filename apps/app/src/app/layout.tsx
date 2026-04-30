import { ClerkProvider } from "@clerk/nextjs";
import "@repo/ui/globals.css";
import "./globals.css";
import { Toaster } from "@repo/ui/untitledui/application/notifications/toaster";
import { cx } from "@repo/ui/utils";
import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { AppearanceProvider } from "@/providers/appearance-provider";
import { ConvexClientProvider } from "@/providers/convex-provider";
import { RouteProvider } from "@/providers/router-provider";
import { Theme } from "@/providers/theme";

// Body sans is Geist, exposed as --font-inter so existing UntitledUI
// tokens (which read --font-body → --font-inter) pick it up automatically.
const geist = Geist({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

const geistMono = Geist_Mono({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-geist-mono",
});

// Fraunces is opt-in via the .sp-fraunces utility (or the Tailwind arbitrary
// font-[family-name:var(--font-fraunces)] pattern) — never used as a body or
// display sans replacement, only for one-word italic accents.
const fraunces = Fraunces({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-fraunces",
    axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
    title: "SmartPockets - Smart Credit Card Management",
    description: "Organize your credit cards into wallets, track spending, and never miss a payment.",
};

export const viewport: Viewport = {
    themeColor: "#080a0c",
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
                    geist.variable,
                    geistMono.variable,
                    fraunces.variable,
                    "bg-primary antialiased",
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

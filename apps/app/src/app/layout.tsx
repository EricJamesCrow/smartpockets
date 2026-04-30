import { ClerkProvider } from "@clerk/nextjs";
import "@repo/ui/globals.css";
import "./globals.css";
import { Toaster } from "@repo/ui/untitledui/application/notifications/toaster";
import { cx } from "@repo/ui/utils";
import type { Metadata, Viewport } from "next";
import { Geist, Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { AppearanceProvider } from "@/providers/appearance-provider";
import { ConvexClientProvider } from "@/providers/convex-provider";
import { RouteProvider } from "@/providers/router-provider";
import { Theme } from "@/providers/theme";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

const geist = Geist({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-geist",
    weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-jetbrains-mono",
    weight: ["400", "500", "600"],
});

const sourceSerif = Source_Serif_4({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-source-serif",
    weight: ["300", "400", "500", "600"],
    style: ["normal", "italic"],
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
        <html lang="en" suppressHydrationWarning>
            <body
                className={cx(
                    inter.variable,
                    geist.variable,
                    jetbrainsMono.variable,
                    sourceSerif.variable,
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

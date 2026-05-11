import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "@repo/ui/globals.css";
import "./globals.css";
import { Toaster } from "@repo/ui/untitledui/application/notifications/toaster";
import { cx } from "@repo/ui/utils";
import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
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
//
// IMPORTANT: must include `style: ["italic"]` so the italic axis is actually
// downloaded for the variable font. Without this, every `italic` accent
// silently falls back to a synthetic italic over the system serif.
const fraunces = Fraunces({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-fraunces",
    style: ["italic"],
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

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // CROWDEV-390: a11y audit harness pages at /a11y-audit/* need to render
    // outside the Theme/AppearanceProvider stack. next-themes' ThemeProvider
    // overrides our html.class via localStorage on first paint, defeating the
    // audit-mode hint we pass through the `x-pathname` request header. For
    // /a11y-audit/*-light we emit `light-mode` and skip the providers
    // entirely so Lighthouse renders the light tokens. Production paths still
    // get the full provider tree.
    const headerList = await headers();
    const pathname = headerList.get("x-pathname") ?? "";
    const isAuditPath =
        process.env.NEXT_PUBLIC_A11Y_AUDIT === "1" &&
        pathname.startsWith("/a11y-audit/");
    const auditMode = isAuditPath && /\/a11y-audit\/.*-light/.test(pathname)
        ? "light-mode"
        : "dark-mode";

    if (isAuditPath) {
        return (
            <html lang="en" className={auditMode} suppressHydrationWarning>
                <body
                    className={cx(
                        geist.variable,
                        geistMono.variable,
                        fraunces.variable,
                        "bg-primary antialiased",
                    )}
                >
                    {children}
                </body>
            </html>
        );
    }

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
                <ClerkProvider
                    appearance={{
                        baseTheme: dark,
                        variables: {
                            colorPrimary: "#3d6649",
                            colorBackground: "#0a1014",
                            colorText: "#e8e4d6",
                            colorInputBackground: "rgba(255,255,255,0.04)",
                            colorInputText: "#e8e4d6",
                            fontFamily: "var(--font-inter), system-ui, sans-serif",
                        },
                        elements: {
                            card: "bg-[#0a1014] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-[0_24px_60px_rgba(8,10,12,0.45)]",
                            formButtonPrimary:
                                "bg-[#3d6649] hover:bg-[#4a7a57] text-white",
                            headerTitle:
                                "font-medium tracking-[-0.02em] text-stone-100",
                            headerSubtitle: "text-stone-400",
                            socialButtonsBlockButton:
                                "border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)]",
                        },
                    }}
                >
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

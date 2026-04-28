import { ClerkProvider } from "@clerk/nextjs";
import "@repo/ui/globals.css";
import "@repo/ui/theme.css";
import "./globals.css";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

const geist = Geist({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

const geistMono = Geist_Mono({
    subsets: ["latin"],
    variable: "--font-geist-mono",
    display: "swap",
});

const fraunces = Fraunces({
    subsets: ["latin"],
    variable: "--font-fraunces",
    display: "swap",
    axes: ["opsz", "SOFT"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smartpockets.com";

export const metadata = {
    title: "SmartPockets - Smart Credit Card Management",
    description: "Open-source personal finance for people who manage more than one card. Built for clarity, ownership, and careful agent-assist.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider allowedRedirectOrigins={[APP_URL]} signInForceRedirectUrl={APP_URL} signUpForceRedirectUrl={APP_URL}>
            <html lang="en" className="dark-mode scroll-smooth bg-[#080a0c]">
                <body className={`${geist.variable} ${geistMono.variable} ${fraunces.variable} text-primary bg-[#080a0c] antialiased`}>{children}</body>
            </html>
        </ClerkProvider>
    );
}

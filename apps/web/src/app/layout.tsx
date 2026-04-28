import { ClerkProvider } from "@clerk/nextjs";
import { Fraunces, Familjen_Grotesk, JetBrains_Mono } from "next/font/google";
import "@repo/ui/globals.css";
import "@repo/ui/theme.css";
import "./atelier.css";

// Obsidian Atelier — fonts you wouldn't expect in fintech.
// Fraunces (display, optical-size + SOFT axis) gives ledger/serif gravity.
// Familjen Grotesk (Swedish state grotesk) handles UI without ever feeling tech-startup.
// JetBrains Mono is reserved for ledger numerics on the data-plate.
const fraunces = Fraunces({
    subsets: ["latin"],
    variable: "--font-fraunces",
    axes: ["SOFT", "WONK", "opsz"],
    display: "swap",
});

const familjen = Familjen_Grotesk({
    subsets: ["latin"],
    variable: "--font-familjen",
    display: "swap",
});

const jetbrains = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-jetbrains",
    display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smartpockets.com";

export const metadata = {
    title: "SmartPockets — Obsidian Atelier",
    description: "Open source personal finance, engineered with the precision of a watchmaker. Organize cards, track wealth, own your data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider allowedRedirectOrigins={[APP_URL]} signInForceRedirectUrl={APP_URL} signUpForceRedirectUrl={APP_URL}>
            <html lang="en">
                <body
                    className={`${fraunces.variable} ${familjen.variable} ${jetbrains.variable} antialiased`}
                    style={{ fontFamily: "var(--font-familjen), system-ui, sans-serif", backgroundColor: "#08090c", color: "white" }}
                >
                    {children}
                </body>
            </html>
        </ClerkProvider>
    );
}

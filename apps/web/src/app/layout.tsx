import { ClerkProvider } from "@clerk/nextjs";
import { IBM_Plex_Sans_Condensed, JetBrains_Mono, Sora } from "next/font/google";
import "@repo/ui/globals.css";
import "@repo/ui/theme.css";

// IBM Plex Sans Condensed — IBM's own engineering typeface. Condensed, industrial,
// and engineered for status readouts. Pairs cleanly with JetBrains Mono and
// pushes the cockpit further into hardware-blueprint brutalism without veering
// into poster territory.
const ibmPlexCondensed = IBM_Plex_Sans_Condensed({
    subsets: ["latin"],
    weight: ["500", "600", "700"],
    variable: "--font-display",
    display: "swap",
});

const sora = Sora({
    subsets: ["latin"],
    variable: "--font-sora",
    display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-jetbrains-mono",
    display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smartpockets.com";

export const metadata = {
    title: "SmartPockets — Open source personal finance terminal",
    description:
        "The terminal-grade personal finance platform for power users. Plaid-native, self-hostable, agentic. Built for people tracking 12+ cards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider allowedRedirectOrigins={[APP_URL]} signInForceRedirectUrl={APP_URL} signUpForceRedirectUrl={APP_URL}>
            <html lang="en">
                <body className={`${ibmPlexCondensed.variable} ${sora.variable} ${jetbrainsMono.variable} bg-primary text-primary antialiased`}>
                    {children}
                </body>
            </html>
        </ClerkProvider>
    );
}

import { ClerkProvider } from "@clerk/nextjs";
import { Geist, JetBrains_Mono, Source_Serif_4, Space_Grotesk } from "next/font/google";
import "@repo/ui/globals.css";
import "@repo/ui/theme.css";

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-space-grotesk",
});

const geist = Geist({
    subsets: ["latin"],
    variable: "--font-geist",
    weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-jetbrains-mono",
    weight: ["400", "500", "600"],
});

const sourceSerif = Source_Serif_4({
    subsets: ["latin"],
    variable: "--font-source-serif",
    weight: ["300", "400", "500", "600"],
    style: ["normal", "italic"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smartpockets.com";

export const metadata = {
    title: "SmartPockets — Open source personal finance for power users",
    description:
        "Self-hosted, agent-assisted credit card and net-worth tracking. Plaid-native, Convex-backed, and built by someone with twelve cards in their wallet.",
    openGraph: {
        title: "SmartPockets — Open source personal finance for power users",
        description: "Self-hosted, agent-assisted credit card and net-worth tracking, without the subscription trap.",
        type: "website",
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider allowedRedirectOrigins={[APP_URL]} signInForceRedirectUrl={APP_URL} signUpForceRedirectUrl={APP_URL}>
            <html lang="en">
                <body
                    className={`${spaceGrotesk.variable} ${geist.variable} ${jetbrainsMono.variable} ${sourceSerif.variable} bg-primary text-primary antialiased`}
                >
                    {children}
                </body>
            </html>
        </ClerkProvider>
    );
}

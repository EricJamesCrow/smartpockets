import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Space_Grotesk } from "next/font/google";
import "@repo/ui/globals.css";
import "@repo/ui/theme.css";

const geist = Geist({
    subsets: ["latin"],
    variable: "--font-inter",
    weight: ["300", "400", "500", "600", "700"],
    display: "swap",
});

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-space-grotesk",
    display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smartpockets.com";

export const metadata = {
    title: "SmartPockets — open-source money OS for card-heavy spenders",
    description: "Wallets, balances, utilization, and reminders for people juggling 12+ cards. Open source, self-hostable, agent-assisted on the roadmap.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider allowedRedirectOrigins={[APP_URL]} signInForceRedirectUrl={APP_URL} signUpForceRedirectUrl={APP_URL}>
            <html lang="en" className="dark-mode scroll-smooth bg-[#05070a]">
                <body className={`${geist.variable} ${spaceGrotesk.variable} bg-[#05070a] text-primary tabular-nums antialiased`}>{children}</body>
            </html>
        </ClerkProvider>
    );
}

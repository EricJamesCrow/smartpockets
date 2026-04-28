import { ClerkProvider } from "@clerk/nextjs";
import "@repo/ui/globals.css";
import "@repo/ui/theme.css";
import { Geist, Space_Grotesk } from "next/font/google";

const geist = Geist({
    subsets: ["latin"],
    variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-space-grotesk",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smartpockets.com";

export const metadata = {
    title: "SmartPockets - Smart Credit Card Management",
    description: "Organize your credit cards into wallets, track spending, and never miss a payment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider allowedRedirectOrigins={[APP_URL]} signInForceRedirectUrl={APP_URL} signUpForceRedirectUrl={APP_URL}>
            <html lang="en" className="dark-mode scroll-smooth bg-[#05070a]">
                <body className={`${geist.variable} ${spaceGrotesk.variable} text-primary bg-[#05070a] antialiased`}>{children}</body>
            </html>
        </ClerkProvider>
    );
}

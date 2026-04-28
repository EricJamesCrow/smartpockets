import "@repo/ui/globals.css";
import "@repo/ui/theme.css";
import { Space_Grotesk } from "next/font/google";
import { SmartPocketsClerkProvider } from "@/providers/clerk-provider";

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
        <html lang="en">
            <body className={`${spaceGrotesk.variable} bg-primary text-primary antialiased`}>
                <SmartPocketsClerkProvider appUrl={APP_URL}>{children}</SmartPocketsClerkProvider>
            </body>
        </html>
    );
}

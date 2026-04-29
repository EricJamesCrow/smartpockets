import "@repo/ui/globals.css";
import "@repo/ui/theme.css";
import { Space_Grotesk } from "next/font/google";
import { SmartPocketsClerkProvider } from "@/providers/clerk-provider";

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-space-grotesk",
});

const DEFAULT_LOCAL_APP_ORIGIN = "http://localhost:3000";
const DEFAULT_PREVIEW_APP_ORIGIN = "https://app.preview.smartpockets.com";
const DEFAULT_PRODUCTION_APP_ORIGIN = "https://app.smartpockets.com";

function getAppOrigin() {
    if (process.env.NODE_ENV === "development") {
        return process.env.NEXT_PUBLIC_APP_ORIGIN ?? DEFAULT_LOCAL_APP_ORIGIN;
    }

    if (process.env.VERCEL_ENV === "preview") {
        return process.env.NEXT_PUBLIC_APP_ORIGIN ?? DEFAULT_PREVIEW_APP_ORIGIN;
    }

    return process.env.NEXT_PUBLIC_APP_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_PRODUCTION_APP_ORIGIN;
}

export const metadata = {
    title: "SmartPockets - Smart Credit Card Management",
    description: "Organize your credit cards into wallets, track spending, and never miss a payment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const appOrigin = getAppOrigin();

    return (
        <html lang="en">
            <body className={`${spaceGrotesk.variable} bg-primary text-primary antialiased`}>
                <SmartPocketsClerkProvider appOrigin={appOrigin}>{children}</SmartPocketsClerkProvider>
            </body>
        </html>
    );
}

import { ClerkProvider } from "@clerk/nextjs";
import "@repo/ui/globals.css";
import "@repo/ui/theme.css";
import { Header } from "@/components/marketing/header-navigation/header";
import { Footer } from "@/components/marketing/footer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smartpockets.com";

export const metadata = {
    title: "SmartPockets - Smart Credit Card Management",
    description: "Organize your credit cards into wallets, track spending, and never miss a payment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider allowedRedirectOrigins={[APP_URL]} signInForceRedirectUrl={APP_URL} signUpForceRedirectUrl={APP_URL}>
            <html lang="en">
                <body className="bg-primary text-primary antialiased">
                    <Header />
                    <main>{children}</main>
                    <Footer />
                </body>
            </html>
        </ClerkProvider>
    );
}

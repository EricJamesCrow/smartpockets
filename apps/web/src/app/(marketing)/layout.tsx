import { Footer } from "@/components/marketing/footer";
import { Header } from "@/components/marketing/header-navigation/header";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="dark-mode text-primary relative min-h-screen overflow-x-hidden bg-[#080a0c]">
            <a
                href="#main-content"
                className="sr-only z-50 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            >
                Skip to content
            </a>
            <Header />
            <main id="main-content" className="w-full max-w-full overflow-x-hidden">
                {children}
            </main>
            <Footer />
        </div>
    );
}

import { ArrowRight } from "@untitledui/icons";
import Link from "next/link";
import { Footer } from "@/components/marketing/footer";
import { Header } from "@/components/marketing/header-navigation/header";

const AlphaBanner = () => (
    <div className="relative z-40 flex w-full items-center justify-center border-b border-white/10 bg-[#07100d]/90 px-4 py-2 text-center text-sm font-medium text-emerald-50 sm:px-6 lg:px-8">
        <p className="text-pretty">
            SmartPockets is in early access alpha.{" "}
            <Link
                href="/sign-up"
                className="outline-focus-ring inline-flex items-center rounded-full font-semibold text-white underline-offset-4 transition-colors duration-200 hover:text-emerald-200 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
                Join the waitlist <ArrowRight aria-hidden="true" className="ml-1 size-3.5" />
            </Link>
        </p>
    </div>
);

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="dark-mode text-primary min-h-screen overflow-x-hidden bg-[#05070a]">
            <a
                href="#main-content"
                className="sr-only z-50 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            >
                Skip to content
            </a>
            <AlphaBanner />
            <Header />
            <main id="main-content" className="w-full max-w-full overflow-x-hidden">
                {children}
            </main>
            <Footer />
        </div>
    );
}

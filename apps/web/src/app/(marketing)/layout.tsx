import { ArrowUpRight } from "@untitledui/icons";
import Link from "next/link";
import { Footer } from "@/components/marketing/footer";
import { Header } from "@/components/marketing/header-navigation/header";

const AlphaBanner = () => (
    <div className="relative z-40 flex w-full items-center justify-center border-b border-white/[0.06] bg-[#05070a]/85 px-4 py-2.5 text-center text-xs font-medium tracking-[0.01em] text-gray-300 backdrop-blur-md sm:px-6 sm:text-sm lg:px-8">
        <p className="text-pretty">
            <span
                aria-hidden="true"
                className="mr-2 inline-flex size-1.5 -translate-y-px rounded-full bg-brand-400 align-middle shadow-[0_0_12px_rgba(34,211,141,0.7)]"
            />
            Alpha is open. Cards first, agentic next.{" "}
            <Link
                href="/sign-up"
                className="outline-focus-ring ml-1 inline-flex items-center gap-0.5 rounded-full font-semibold text-white underline-offset-4 transition-colors duration-200 hover:text-brand-200 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
                Request access <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
        </p>
    </div>
);

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="dark-mode relative min-h-[100dvh] w-full overflow-x-hidden bg-[#05070a] text-primary">
            <a
                href="#main-content"
                className="sr-only z-50 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            >
                Skip to content
            </a>
            <AlphaBanner />
            <Header />
            <main id="main-content" className="relative w-full max-w-full overflow-x-hidden">
                {children}
            </main>
            <Footer />
        </div>
    );
}

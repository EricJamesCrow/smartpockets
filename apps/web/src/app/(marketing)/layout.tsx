import { ArrowUpRight } from "@untitledui/icons";
import Link from "next/link";
import { Footer } from "@/components/marketing/footer";
import { Header } from "@/components/marketing/header-navigation/header";

const AlphaBanner = () => (
    <div className="relative z-40 flex w-full items-center justify-center border-b border-white/10 bg-[#070b0d]/95 px-4 py-2.5 text-center text-[0.78rem] font-medium tracking-wide text-stone-200 sm:px-6 lg:px-8">
        <p className="text-pretty">
            <span className="mr-2 inline-flex h-1.5 w-1.5 translate-y-[-1px] animate-pulse rounded-full bg-[#7fb89a] align-middle shadow-[0_0_10px_2px_rgba(127,184,154,0.45)]" />
            <span className="font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.2em] text-[#9fbeae]">private alpha</span>
            <span className="mx-3 text-white/30">/</span>
            <Link
                href="/sign-up"
                className="outline-focus-ring inline-flex items-center gap-1 rounded-full font-semibold text-white underline-offset-4 transition-colors duration-200 hover:text-[#a3d7bf] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
                Request your invitation
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
        </p>
    </div>
);

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="dark-mode text-primary relative min-h-screen overflow-x-hidden bg-[#080a0c]">
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

import Link from "next/link";
import { Header } from "@/components/marketing/header-navigation/header";
import { Footer } from "@/components/marketing/footer";

const StatusStrip = () => (
    <div className="relative z-50 border-b border-[#7fb89a]/[0.10] bg-[#0a1014]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-center gap-3 px-4 py-2.5 md:px-8">
            <span className="relative inline-flex size-1.5 shrink-0 items-center justify-center">
                <span className="absolute inline-flex size-3 animate-ping rounded-full bg-[#7fb89a] opacity-35" />
                <span className="relative inline-flex size-1.5 rounded-full bg-[#7fb89a] shadow-[0_0_8px_2px_rgba(127,184,154,0.5)]" />
            </span>
            <p className="font-[family-name:var(--font-geist)] text-[11px] font-medium tracking-[0.18em] text-[#a3d7bf]/75 uppercase">
                <span className="hidden sm:inline">Closed alpha · v0.4.2 · seven seats remaining</span>
                <span className="sm:hidden">Closed alpha · 7 seats</span>
                <span className="mx-2 text-[#d4c59c]/35">/</span>
                <Link
                    href="/sign-up"
                    className="rounded-xs underline-offset-4 transition-colors duration-150 outline-focus-ring hover:text-stone-50 focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    Request access
                </Link>
            </p>
        </div>
    </div>
);

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="dark-mode relative min-h-dvh w-full overflow-x-hidden bg-[#080a0c] text-primary">
            <a
                href="#main-content"
                className="sr-only z-[60] rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            >
                Skip to content
            </a>
            <StatusStrip />
            <Header />
            <main id="main-content" className="font-[family-name:var(--font-geist)] w-full max-w-full overflow-x-hidden">
                {children}
            </main>
            <Footer />
        </div>
    );
}

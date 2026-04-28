import Link from "next/link";
import { Header } from "@/components/marketing/header-navigation/header";
import { Footer } from "@/components/marketing/footer";

const StatusStrip = () => (
    <div className="relative z-50 border-b border-white/[0.06] bg-[#08090b]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-center gap-3 px-4 py-2.5 md:px-8">
            <span className="relative inline-flex size-1.5 shrink-0 items-center justify-center">
                <span className="absolute inline-flex size-3 animate-ping rounded-full bg-brand-500 opacity-30" />
                <span className="relative inline-flex size-1.5 rounded-full bg-brand-500" />
            </span>
            <p className="font-[family-name:var(--font-geist)] text-[11px] font-medium tracking-[0.18em] text-white/55 uppercase">
                <span className="hidden sm:inline">Closed alpha · v0.4.2 · seven seats remaining</span>
                <span className="sm:hidden">Closed alpha · 7 seats</span>
                <span className="mx-2 text-white/20">/</span>
                <Link
                    href="/sign-up"
                    className="rounded-xs underline-offset-4 transition-colors duration-150 outline-focus-ring hover:text-white focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    Request access
                </Link>
            </p>
        </div>
    </div>
);

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="dark-mode relative min-h-dvh w-full overflow-x-hidden bg-[#0a0b0d] text-primary">
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

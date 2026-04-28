import Link from "next/link";
import { ArrowRight } from "@untitledui/icons";
import { Footer } from "@/components/marketing/footer";
import { Header } from "@/components/marketing/header-navigation/header";

const TerminalBanner = () => (
    <div className="dark-mode relative z-40 flex w-full items-center justify-center gap-3 overflow-hidden border-b border-white/[0.06] bg-[#06090b] px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-400 sm:gap-4 sm:px-6 sm:text-[11px] lg:px-8">
        <span className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400 shadow-[0_0_10px_rgba(60,203,127,0.65)] sm:inline-block" aria-hidden="true" />
        <span className="hidden text-zinc-500 sm:inline">SP_ALPHA_01</span>
        <span className="hidden text-zinc-700 sm:inline" aria-hidden="true">
            //
        </span>
        <span className="text-pretty text-zinc-300">
            Early access cohort open
            <span className="hidden sm:inline"> — limited seats / NYC</span>
        </span>
        <span className="text-zinc-700" aria-hidden="true">
            //
        </span>
        <Link
            href="/sign-up"
            className="outline-focus-ring group inline-flex items-center gap-1 rounded-xs text-brand-400 transition-colors duration-150 hover:text-brand-300 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
            Request access
            <ArrowRight aria-hidden="true" className="size-3 -translate-x-0.5 transition-transform duration-150 group-hover:translate-x-0" />
        </Link>
    </div>
);

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="dark-mode min-h-screen overflow-x-hidden bg-[#05070a] font-[family-name:var(--font-sora)] text-primary">
            <TerminalBanner />
            <Header />
            <main>{children}</main>
            <Footer />
        </div>
    );
}

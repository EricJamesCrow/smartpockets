import { Header } from "@/components/marketing/header-navigation/header";
import { Footer } from "@/components/marketing/footer";
import { AtelierBackdrop } from "@/components/marketing/atelier-backdrop";
import Link from "next/link";

const AlphaTicker = () => (
    <div className="atelier-ticker dark-mode relative z-50 flex w-full items-center justify-center overflow-hidden border-b border-white/[0.06] bg-[#08090c] px-4 py-1.5 text-center text-[11px] tracking-[0.32em] text-amber-200/80 uppercase">
        <span className="atelier-ticker-flicker mr-3 inline-block size-[6px] rounded-full bg-amber-300 shadow-[0_0_18px_2px_rgba(252,211,77,0.55)]" aria-hidden />
        <span className="font-[family-name:var(--font-familjen)]">
            Atelier no.04 · Early access alpha
        </span>
        <span className="mx-3 text-white/20">/</span>
        <Link
            href="/sign-up"
            className="font-[family-name:var(--font-familjen)] underline-offset-4 hover:text-amber-100 hover:underline"
        >
            Reserve a seat
        </Link>
    </div>
);

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="atelier-scope dark-mode relative isolate min-h-screen overflow-x-hidden bg-[#08090c] text-white">
            <AtelierBackdrop />
            <AlphaTicker />
            <Header />
            <main className="relative z-10">{children}</main>
            <Footer />
        </div>
    );
}

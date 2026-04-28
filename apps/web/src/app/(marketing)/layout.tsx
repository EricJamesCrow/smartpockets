import { Header } from "@/components/marketing/header-navigation/header";
import { Footer } from "@/components/marketing/footer";
import Link from "next/link";

const AlphaBanner = () => (
    <div className="border-b border-white/[0.06] bg-[#0b0c0e]">
        <div className="max-w-container mx-auto flex w-full items-center justify-center gap-3 px-4 py-2 text-center md:px-8">
            <span className="relative inline-flex size-1.5 shrink-0 items-center justify-center">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-500 opacity-50" />
                <span className="relative inline-flex size-1.5 rounded-full bg-brand-500" />
            </span>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55 font-[family-name:var(--font-geist)]">
                <span className="hidden sm:inline">Closed alpha · By invitation</span>
                <span className="sm:hidden">Closed alpha</span>
                <span className="mx-2 hidden text-white/20 sm:inline">/</span>
                <Link
                    href="/sign-up"
                    className="rounded-xs underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                    Request access
                </Link>
            </p>
        </div>
    </div>
);

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="dark-mode bg-[#0b0c0e] text-primary">
            <AlphaBanner />
            <Header />
            <main className="font-[family-name:var(--font-geist)]">{children}</main>
            <Footer />
        </div>
    );
}

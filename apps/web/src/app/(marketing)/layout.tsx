import { Header } from "@/components/marketing/header-navigation/header";
import { Footer } from "@/components/marketing/footer";
import Link from "next/link";
import { ArrowRight } from "@untitledui/icons";

const AlphaBanner = () => (
    <div className="bg-brand-section flex w-full items-center justify-center px-4 py-2 text-center text-sm font-medium text-primary_on-brand sm:px-6 lg:px-8">
        <p>
            SmartPockets is currently in early access alpha.{" "}
            <Link href="/sign-up" className="inline-flex items-center font-semibold hover:underline">
                Join the waitlist <ArrowRight className="ml-1 size-3.5" />
            </Link>
        </p>
    </div>
);

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <AlphaBanner />
            <Header />
            <main>{children}</main>
            <Footer />
        </>
    );
}

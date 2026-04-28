import { AtelierHero } from "@/components/marketing/atelier-hero";
import { AtelierMechanism } from "@/components/marketing/atelier-mechanism";
import { AtelierSpecimens } from "@/components/marketing/atelier-specimens";
import { AtelierLedger } from "@/components/marketing/atelier-ledger";
import { AtelierConcierge } from "@/components/marketing/atelier-concierge";

export default function HomePage() {
    return (
        <div className="relative overflow-hidden">
            <AtelierHero />
            <AtelierMechanism />
            <AtelierSpecimens />
            <AtelierLedger />
            <AtelierConcierge />
        </div>
    );
}

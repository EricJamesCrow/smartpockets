import { GitHub, LinkedIn, X } from "@repo/ui/untitledui/foundations/social-icons/index";
import { SmartPocketsLogo } from "@repo/ui/untitledui/foundations/logo/smartpockets-logo";
import Link from "next/link";

const socials = [
    { label: "X (formerly Twitter)", icon: X, href: "https://x.com/ericjamescrow" },
    { label: "LinkedIn", icon: LinkedIn, href: "https://www.linkedin.com/in/ericcrow/" },
    { label: "GitHub", icon: GitHub, href: "https://github.com/EricJamesCrow" },
];

const provenance: Array<[string, string]> = [
    ["Atelier", "no.04"],
    ["Casework", "Onyx · Brushed Graphite"],
    ["Movement", "Convex · Plaid · Next 16"],
    ["Run", "Open source, hand-tuned"],
];

const ledger: Array<{ heading: string; items: Array<{ label: string; href: string }> }> = [
    {
        heading: "Mechanism",
        items: [
            { label: "Wallets", href: "/" },
            { label: "Plaid sync", href: "/" },
            { label: "Card detail", href: "/" },
            { label: "Ledger view", href: "/" },
        ],
    },
    {
        heading: "Cabinet",
        items: [
            { label: "About", href: "/about" },
            { label: "Roadmap", href: "/" },
            { label: "Changelog", href: "/" },
            { label: "Press kit", href: "/" },
        ],
    },
    {
        heading: "Provenance",
        items: [
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
            { label: "Security", href: "/" },
            { label: "Contact", href: "/" },
        ],
    },
];

export const Footer = () => {
    return (
        <footer className="dark-mode relative z-10 mt-24 overflow-hidden border-t border-white/[0.07] bg-[#08090c]/80 backdrop-blur-sm">
            {/* Hairline trim */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />

            <div className="mx-auto max-w-[1280px] px-4 pt-20 pb-12 md:px-8">
                {/* Atelier signature row */}
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
                    {/* Mark + signature */}
                    <div className="lg:col-span-5">
                        <SmartPocketsLogo size="lg" />
                        <p className="mt-6 max-w-sm font-[family-name:var(--font-fraunces)] text-2xl font-light text-white/70 [font-variation-settings:'opsz'_72,'SOFT'_100]">
                            Open source personal finance, engineered with the precision of a watchmaker.
                        </p>
                        <p className="mt-6 font-[family-name:var(--font-jetbrains)] text-[11px] tracking-[0.32em] text-amber-200/70 uppercase">
                            Atelier no.04 · Edition of one
                        </p>
                    </div>

                    {/* Provenance plate */}
                    <div className="lg:col-span-3">
                        <p className="mb-4 font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.32em] text-white/40 uppercase">
                            Provenance
                        </p>
                        <dl className="space-y-2">
                            {provenance.map(([label, value]) => (
                                <div key={label} className="flex items-baseline gap-3 border-b border-white/[0.04] pb-2 text-[13px]">
                                    <dt className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.18em] text-white/35 uppercase">
                                        {label}
                                    </dt>
                                    <dd className="ml-auto font-[family-name:var(--font-familjen)] text-white/85">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>

                    {/* Ledger of links */}
                    <div className="grid grid-cols-3 gap-6 lg:col-span-4">
                        {ledger.map((column) => (
                            <div key={column.heading}>
                                <p className="mb-4 font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.32em] text-white/40 uppercase">
                                    {column.heading}
                                </p>
                                <ul className="space-y-2.5">
                                    {column.items.map((item) => (
                                        <li key={item.label}>
                                            <Link
                                                href={item.href}
                                                className="font-[family-name:var(--font-familjen)] text-[13px] text-white/70 outline-focus-ring transition hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2"
                                            >
                                                {item.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Marquee — atelier credo */}
                <div className="mt-20 overflow-hidden rounded-[2rem] border border-white/[0.06] bg-black/30 px-6 py-10 backdrop-blur-md md:px-12 md:py-14">
                    <p className="font-[family-name:var(--font-fraunces)] text-3xl leading-[1.05] font-light tracking-[-0.02em] text-white/85 [font-variation-settings:'opsz'_144,'SOFT'_60] sm:text-5xl md:text-6xl lg:text-7xl">
                        <span className="block text-amber-200/85">No subscription traps.</span>
                        <span className="block text-white/55">No data selling.</span>
                        <span className="block text-white/30">No artificial gates.</span>
                    </p>
                </div>

                {/* Hallmark row */}
                <div className="mt-12 flex flex-col items-start gap-6 border-t border-white/[0.06] pt-8 md:flex-row md:items-center md:justify-between">
                    <p className="font-[family-name:var(--font-jetbrains)] text-[11px] tracking-[0.18em] text-white/40 uppercase">
                        © 2026 SmartPockets · Hand-finished in the open
                    </p>

                    <ul className="flex items-center gap-2">
                        {socials.map(({ label, icon: Icon, href }) => (
                            <li key={label}>
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={label}
                                    className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/60 outline-focus-ring transition hover:border-amber-200/40 hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2"
                                >
                                    <Icon size={16} />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </footer>
    );
};

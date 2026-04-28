import { SmartPocketsLogo } from "@repo/ui/untitledui/foundations/logo/smartpockets-logo";
import { GitHub, LinkedIn, X } from "@repo/ui/untitledui/foundations/social-icons/index";

const footerSocials = [
    { label: "X (formerly Twitter)", icon: X, href: "https://x.com/ericjamescrow" },
    { label: "LinkedIn", icon: LinkedIn, href: "https://www.linkedin.com/in/ericcrow/" },
    { label: "GitHub", icon: GitHub, href: "https://github.com/EricJamesCrow" },
];

const footerColumns: { title: string; code: string; links: { title: string; href: string }[] }[] = [
    {
        title: "Product",
        code: "01",
        links: [
            { title: "Overview", href: "/" },
            { title: "Features", href: "/features" },
            { title: "Changelog", href: "https://github.com/EricJamesCrow/smartpockets/releases" },
        ],
    },
    {
        title: "Resources",
        code: "02",
        links: [
            { title: "GitHub", href: "https://github.com/EricJamesCrow/smartpockets" },
            { title: "Docs", href: "https://github.com/EricJamesCrow/smartpockets#readme" },
            { title: "License (GPL-3.0)", href: "https://github.com/EricJamesCrow/smartpockets/blob/main/LICENSE" },
        ],
    },
    {
        title: "Legal",
        code: "03",
        links: [
            { title: "Privacy", href: "/privacy" },
            { title: "Terms", href: "/terms" },
            { title: "Security", href: "https://github.com/EricJamesCrow/smartpockets/security" },
        ],
    },
];

export const Footer = () => {
    return (
        <footer className="relative isolate overflow-hidden border-t border-white/[0.06] bg-[#04070a] py-14 md:pt-20">
            <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-screen [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_60%_70%_at_50%_0%,black,transparent_70%)]"
            />

            <div className="relative mx-auto w-full max-w-container px-4 md:px-8">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
                    <div className="flex flex-col gap-6">
                        <SmartPocketsLogo size="lg" />
                        <p className="max-w-sm text-sm text-zinc-400">
                            Open-source personal finance terminal. Plaid-native, self-hostable, agentic.
                            Built by a power user for the people running real ledgers.
                        </p>

                        <div className="inline-flex items-center gap-2 self-start border border-white/10 bg-white/[0.02] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-300">
                            <span className="size-1.5 animate-pulse rounded-full bg-brand-400 shadow-[0_0_10px_rgba(60,203,127,0.7)]" />
                            STATUS · ALPHA
                        </div>
                    </div>

                    <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                        {footerColumns.map((column) => (
                            <div key={column.title} className="flex flex-col gap-3">
                                <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-500">
                                    <span className="text-brand-400/70">{column.code}</span>
                                    <span>{column.title}</span>
                                </div>
                                <ul className="flex flex-col gap-2">
                                    {column.links.map((link) => (
                                        <li key={link.title}>
                                            <a
                                                href={link.href}
                                                className="outline-focus-ring inline-flex items-center gap-1 rounded-xs text-sm text-zinc-300 transition-colors duration-150 hover:text-brand-300 focus-visible:outline-2 focus-visible:outline-offset-2"
                                            >
                                                {link.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </div>

                <div className="mt-14 flex flex-col-reverse items-start justify-between gap-6 border-t border-white/[0.06] pt-6 md:flex-row md:items-center">
                    <div className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                        <span>© {new Date().getFullYear()} SmartPockets · Built by CrowDevelopment</span>
                        <span className="text-zinc-600">// last sync: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                    </div>

                    <ul className="flex items-center gap-3">
                        {footerSocials.map(({ label, icon: Icon, href }) => (
                            <li key={label}>
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={label}
                                    className="outline-focus-ring inline-flex size-9 items-center justify-center border border-white/10 bg-white/[0.02] text-zinc-400 transition-colors duration-150 hover:border-brand-500/40 hover:bg-white/[0.04] hover:text-brand-300 focus-visible:outline-2 focus-visible:outline-offset-2"
                                >
                                    <Icon size={16} aria-hidden="true" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </footer>
    );
};

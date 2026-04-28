import Link from "next/link";
import { SmartPocketsLogo } from "@repo/ui/untitledui/foundations/logo/smartpockets-logo";
import { GitHub, LinkedIn, X } from "@repo/ui/untitledui/foundations/social-icons/index";

const socials = [
    { label: "GitHub", icon: GitHub, href: "https://github.com/EricJamesCrow/smartpockets" },
    { label: "X (formerly Twitter)", icon: X, href: "https://x.com/ericjamescrow" },
    { label: "LinkedIn", icon: LinkedIn, href: "https://www.linkedin.com/in/ericcrow/" },
];

const navColumns = [
    {
        heading: "Product",
        items: [
            { label: "Overview", href: "/" },
            { label: "Architecture", href: "#stack" },
            { label: "Roadmap", href: "#roadmap" },
            { label: "Changelog", href: "#" },
        ],
    },
    {
        heading: "Engineering",
        items: [
            { label: "Source", href: "https://github.com/EricJamesCrow/smartpockets" },
            { label: "Self-host guide", href: "#" },
            { label: "API reference", href: "#" },
            { label: "Status", href: "#" },
        ],
    },
    {
        heading: "Legal",
        items: [
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
            { label: "Security", href: "#" },
            { label: "Acknowledgements", href: "#" },
        ],
    },
];

export const Footer = () => {
    return (
        <footer className="relative isolate overflow-hidden border-t border-[#7fb89a]/[0.10] bg-[#0a1014]">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#7fb89a]/40 to-transparent"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[#7fb89a]/[0.06] blur-3xl"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-32 right-[10%] h-[260px] w-[420px] rounded-full bg-[#d4c59c]/[0.04] blur-3xl"
            />
            <div className="relative mx-auto w-full max-w-[1280px] px-4 pt-16 pb-10 md:px-8 md:pt-20">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12">
                    <div className="md:col-span-5">
                        <SmartPocketsLogo size="lg" />
                        <p className="mt-6 max-w-xs font-[family-name:var(--font-geist)] text-[15px] leading-relaxed text-stone-50/55">
                            An open source workbench for the credit curious. Built quietly out of Cape Cod by a developer with twelve cards in his
                            wallet.
                        </p>

                        <div className="mt-8 flex items-center gap-3">
                            {socials.map(({ label, icon: Icon, href }) => (
                                <a
                                    key={label}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={label}
                                    className="grid size-10 place-items-center rounded-md border border-[#7fb89a]/[0.12] bg-[#7fb89a]/[0.04] text-[#a3d7bf]/70 outline-focus-ring transition-all duration-200 hover:border-[#7fb89a]/[0.30] hover:bg-[#7fb89a]/[0.10] hover:text-[#a3d7bf] focus-visible:outline-2 focus-visible:outline-offset-2"
                                >
                                    <Icon size={16} aria-hidden="true" />
                                </a>
                            ))}
                        </div>
                    </div>

                    <nav aria-label="Footer" className="md:col-span-7">
                        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                            {navColumns.map((column) => (
                                <div key={column.heading}>
                                    <p className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] tracking-[0.18em] text-[#a3d7bf]/55 uppercase">
                                        {column.heading}
                                    </p>
                                    <ul className="mt-4 flex flex-col gap-3">
                                        {column.items.map((item) => (
                                            <li key={item.label}>
                                                <Link
                                                    href={item.href}
                                                    className="font-[family-name:var(--font-geist)] text-[14px] font-medium text-stone-50/65 outline-focus-ring transition-colors duration-150 hover:text-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2"
                                                >
                                                    {item.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </nav>
                </div>

                <div className="mt-14 grid grid-cols-1 gap-4 border-t border-[#7fb89a]/[0.10] pt-8 md:grid-cols-2 md:items-center md:gap-6">
                    <p className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] tracking-[0.14em] text-stone-50/35 uppercase">
                        © 2026 SmartPockets · Cape Cod, MA · Made by{" "}
                        <a
                            href="https://www.crowdevelopment.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#a3d7bf]/65 outline-focus-ring transition-colors duration-150 hover:text-[#a3d7bf] focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            CrowDevelopment
                        </a>
                    </p>
                    <p className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] tracking-[0.14em] text-[#d4c59c]/30 uppercase md:justify-self-end">
                        commit a1c4f29 · branch main · build verified
                    </p>
                </div>
            </div>
        </footer>
    );
};

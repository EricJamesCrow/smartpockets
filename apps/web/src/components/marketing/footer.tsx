import { SmartPocketsLogo } from "@repo/ui/untitledui/foundations/logo/smartpockets-logo";
import { GitHub, LinkedIn, X } from "@repo/ui/untitledui/foundations/social-icons/index";

const socials = [
    { label: "GitHub", icon: GitHub, href: "https://github.com/EricJamesCrow" },
    { label: "X (formerly Twitter)", icon: X, href: "https://x.com/ericjamescrow" },
    { label: "LinkedIn", icon: LinkedIn, href: "https://www.linkedin.com/in/ericcrow/" },
];

const productLinks = [
    { label: "Product", href: "/products" },
    { label: "Manifesto", href: "/about" },
    { label: "Sign in", href: "/sign-in" },
];

const legalLinks = [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Press kit", href: "/about" },
];

export const Footer = () => {
    return (
        <footer className="relative border-t border-white/[0.06] bg-[#0b0c0e] pt-20 md:pt-28">
            <div className="max-w-container mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 gap-y-14 lg:grid-cols-12 lg:gap-x-12">
                    <div className="flex flex-col gap-8 lg:col-span-6">
                        <SmartPocketsLogo size="md" />
                        <p className="max-w-md font-[family-name:var(--font-source-serif)] text-2xl font-light leading-tight text-white/85 md:text-3xl">
                            <span className="italic text-white/60">An open ledger </span>
                            <span className="text-white">for the cards in your wallet, the goals in your year, and the bills you would rather forget.</span>
                        </p>
                        <p className="text-sm leading-relaxed text-white/45 md:max-w-md">
                            SmartPockets is built and maintained by an independent operator. The hosted plan covers Plaid and infrastructure costs. The code is yours.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-12 lg:col-span-6 lg:grid-cols-3">
                        <FooterColumn label="Read" links={productLinks} />
                        <FooterColumn label="Trust" links={legalLinks} />
                        <div>
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Off-platform</p>
                            <ul className="mt-5 space-y-3">
                                {socials.map(({ label, icon: Icon, href }) => (
                                    <li key={label}>
                                        <a
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group inline-flex items-center gap-2.5 text-sm text-white/65 outline-focus-ring transition duration-200 ease-out hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                                        >
                                            <Icon size={14} aria-hidden="true" className="opacity-60 transition-opacity duration-200 group-hover:opacity-100" />
                                            {label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mt-20 border-t border-white/[0.06] pt-8 pb-12">
                    <div className="flex flex-col gap-y-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-[0.16em] text-white/40">
                            © 2026 SmartPockets · A CrowDevelopment study
                        </p>
                        <p className="font-[family-name:var(--font-geist-mono)] text-xs tracking-[0.04em] text-white/35">
                            v0.4.2 · alpha · last sync 04/27/26
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

function FooterColumn({ label, links }: { label: string; links: { label: string; href: string }[] }) {
    return (
        <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">{label}</p>
            <ul className="mt-5 space-y-3">
                {links.map((link) => (
                    <li key={link.label}>
                        <a
                            href={link.href}
                            className="text-sm text-white/65 outline-focus-ring transition duration-200 ease-out hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            {link.label}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}

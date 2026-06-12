import { SmartPocketsLogo } from "@repo/ui/untitledui/foundations/logo/smartpockets-logo";
import { GitHub, LinkedIn, X } from "@repo/ui/untitledui/foundations/social-icons/index";
import Link from "next/link";

const footerSocials = [
    { label: "X (formerly Twitter)", icon: X, href: "https://x.com/ericjamescrow" },
    { label: "LinkedIn", icon: LinkedIn, href: "https://www.linkedin.com/in/ericcrow/" },
    { label: "GitHub", icon: GitHub, href: "https://github.com/EricJamesCrow" },
];

const footerLinks = [
    { title: "Principles", href: "/#manifesto" },
    { title: "Capabilities", href: "/#features" },
    { title: "Roadmap", href: "/#agentic" },
    { title: "About", href: "/about" },
    { title: "Privacy", href: "/privacy" },
    { title: "Terms", href: "/terms" },
];

export const Footer = () => {
    return (
        <footer className="border-t border-white/[0.08] bg-[#080a0c] px-4 py-14 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                <div className="flex flex-col justify-between gap-10 md:flex-row md:items-start">
                    <div className="max-w-sm">
                        <Link
                            href="/"
                            className="outline-focus-ring inline-flex rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
                        >
                            <SmartPocketsLogo size="md" />
                        </Link>
                        <p className="mt-4 text-sm leading-6 text-stone-400">
                            Open-source credit card management. Balances, utilization, and due dates for every card you carry.
                        </p>
                    </div>

                    <div className="flex flex-col gap-8 md:items-end">
                        <nav aria-label="Footer navigation">
                            <ul className="flex flex-wrap gap-x-6 gap-y-3 md:justify-end">
                                {footerLinks.map((item) => (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className="outline-focus-ring rounded-sm text-sm text-stone-400 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
                                        >
                                            {item.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        <ul className="flex gap-5">
                            {footerSocials.map(({ label, icon: Icon, href }) => (
                                <li key={label}>
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={label}
                                        className="outline-focus-ring inline-flex text-stone-500 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                                    >
                                        <Icon size={18} aria-hidden="true" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-12 flex flex-col gap-2 border-t border-white/[0.06] pt-6 text-[13px] text-stone-500 md:flex-row md:items-center md:justify-between">
                    <p>&copy; 2026 SmartPockets</p>
                    <p>Built by CrowDevelopment</p>
                </div>
            </div>
        </footer>
    );
};

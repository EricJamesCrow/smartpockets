import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { SmartPocketsLogo } from "@repo/ui/untitledui/foundations/logo/smartpockets-logo";
import { GitHub, LinkedIn, X } from "@repo/ui/untitledui/foundations/social-icons/index";
import Link from "next/link";

const footerSocials = [
    { label: "X (formerly Twitter)", icon: X, href: "https://x.com/ericjamescrow" },
    { label: "LinkedIn", icon: LinkedIn, href: "https://www.linkedin.com/in/ericcrow/" },
    { label: "GitHub", icon: GitHub, href: "https://github.com/EricJamesCrow" },
];

const footerLinks = [
    { title: "Features", href: "/#features" },
    { title: "Agent assist", href: "/#agentic" },
    { title: "About", href: "/about" },
    { title: "Privacy", href: "/privacy" },
    { title: "Terms", href: "/terms" },
];

export const Footer = () => {
    return (
        <footer className="bg-[#05070a] px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-24">
            <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.1)] md:p-8">
                <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                    <div className="max-w-xl">
                        <Link href="/" className="outline-focus-ring inline-flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-4">
                            <SmartPocketsLogo size="lg" />
                        </Link>
                        <p className="mt-5 max-w-md text-pretty text-base leading-7 text-gray-400">
                            Open-source personal finance for people who want their credit cards, transactions, and future agent-assisted workflows in one place.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Button href="/sign-up" size="lg" className="rounded-full bg-white text-gray-950 hover:bg-emerald-100">
                                Join early access
                            </Button>
                            <Button
                                href="https://github.com/EricJamesCrow/smartpockets"
                                target="_blank"
                                rel="noopener noreferrer"
                                color="secondary"
                                size="lg"
                                className="rounded-full bg-white/[0.06] text-white ring-white/10 hover:bg-white/[0.12]"
                            >
                                View GitHub
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-8 lg:items-end">
                        <nav aria-label="Footer navigation">
                            <ul className="flex flex-wrap gap-x-5 gap-y-3 lg:justify-end">
                                {footerLinks.map((item) => (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className="outline-focus-ring rounded-full text-sm font-medium text-gray-400 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
                                        >
                                            {item.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        <ul className="flex gap-3">
                            {footerSocials.map(({ label, icon: Icon, href }) => (
                                <li key={label}>
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={label}
                                        className="outline-focus-ring inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-gray-300 transition-colors duration-200 hover:bg-white/[0.12] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                                    >
                                        <Icon size={20} aria-hidden="true" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
                    <p>&copy; 2026 SmartPockets. All rights reserved.</p>
                    <p className="text-gray-500">Built by CrowDevelopment for people who manage more than one wallet.</p>
                </div>
            </div>
        </footer>
    );
};

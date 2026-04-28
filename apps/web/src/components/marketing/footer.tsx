import Link from "next/link";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { SmartPocketsLogo } from "@repo/ui/untitledui/foundations/logo/smartpockets-logo";
import { GitHub, LinkedIn, X } from "@repo/ui/untitledui/foundations/social-icons/index";

const footerSocials = [
    { label: "X (formerly Twitter)", icon: X, href: "https://x.com/ericjamescrow" },
    { label: "LinkedIn", icon: LinkedIn, href: "https://www.linkedin.com/in/ericcrow/" },
    { label: "GitHub", icon: GitHub, href: "https://github.com/EricJamesCrow" },
];

const footerNav = [
    { title: "Features", href: "/#features" },
    { title: "Agent assist", href: "/#agentic" },
    { title: "About", href: "/about" },
    { title: "Privacy", href: "/privacy" },
    { title: "Terms", href: "/terms" },
];

export const Footer = () => {
    const year = new Date().getFullYear();

    return (
        <footer className="relative z-10 bg-[#05070a] px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-24">
            <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-6 shadow-[0_24px_90px_-30px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] md:p-10">
                <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
                    <div className="max-w-xl">
                        <Link
                            href="/"
                            className="outline-focus-ring inline-flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-4"
                            aria-label="SmartPockets home"
                        >
                            <SmartPocketsLogo size="lg" />
                        </Link>
                        <p className="mt-5 max-w-md text-pretty text-[0.95rem] leading-7 text-gray-400">
                            Open-source personal finance for people who want their credit cards, transactions, and future agent-assisted workflows in one
                            place.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-2.5">
                            <Button
                                href="/sign-up"
                                size="md"
                                className="rounded-full bg-white text-gray-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] hover:bg-brand-50"
                            >
                                Join early access
                            </Button>
                            <Button
                                href="https://github.com/EricJamesCrow/smartpockets"
                                target="_blank"
                                rel="noopener noreferrer"
                                color="secondary"
                                size="md"
                                className="rounded-full bg-white/[0.04] text-white ring-white/10 hover:bg-white/[0.10]"
                            >
                                View GitHub
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-8 lg:items-end">
                        <nav aria-label="Footer">
                            <ul className="flex flex-wrap gap-x-5 gap-y-2.5 lg:justify-end" role="list">
                                {footerNav.map((item) => (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className="outline-focus-ring rounded-full text-[0.875rem] font-medium text-gray-400 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
                                        >
                                            {item.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        <ul className="flex gap-2.5" role="list">
                            {footerSocials.map(({ label, icon: Icon, href }) => (
                                <li key={label}>
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={label}
                                        className="outline-focus-ring inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-gray-300 transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-white/[0.10] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97]"
                                    >
                                        <Icon size={20} aria-hidden="true" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-10 flex flex-col-reverse items-start justify-between gap-4 border-t border-white/[0.06] pt-6 text-[0.78rem] text-gray-500 md:flex-row md:items-center">
                    <p className="font-mono tabular-nums">&copy; {year} SmartPockets · built by Eric Crow</p>
                    <div className="flex items-center gap-2.5">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-400 shadow-[0_0_10px_rgba(34,211,141,0.7)]" />
                        <span className="font-mono uppercase tracking-[0.2em]">alpha · open source · self-hostable</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

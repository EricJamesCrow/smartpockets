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
    { title: "Capabilities", href: "/#features" },
    { title: "Agent assist", href: "/#agentic" },
    { title: "About", href: "/about" },
    { title: "Privacy", href: "/privacy" },
    { title: "Terms", href: "/terms" },
];

export const Footer = () => {
    return (
        <footer className="relative bg-[#080a0c] px-4 pb-10 pt-20 sm:px-6 lg:px-8 lg:pt-28">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
            />
            <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl md:p-10">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-20 -top-32 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(127,184,154,0.18),transparent_60%)] blur-3xl"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(212,197,156,0.10),transparent_60%)] blur-3xl"
                />
                <div className="relative grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
                    <div className="max-w-xl">
                        <Link href="/" className="outline-focus-ring inline-flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-4">
                            <SmartPocketsLogo size="lg" />
                        </Link>
                        <p className="mt-6 max-w-md text-pretty font-[family-name:var(--font-fraunces)] text-[1.45rem] italic leading-[1.25] tracking-[-0.01em] text-stone-200">
                            A private workshop for people whose money has more than one address.
                        </p>
                        <p className="mt-4 max-w-md text-pretty text-[0.95rem] leading-7 text-stone-400">
                            Open-source personal finance with careful agent-assist. Card balances, utilization, due dates, and reminders held in one calm place.
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Button
                                href="/sign-up"
                                size="lg"
                                className="rounded-full bg-gradient-to-b from-stone-50 to-stone-200 text-[#0a1410] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] hover:from-white hover:to-stone-100"
                            >
                                Join early access
                            </Button>
                            <Button
                                href="https://github.com/EricJamesCrow/smartpockets"
                                target="_blank"
                                rel="noopener noreferrer"
                                color="secondary"
                                size="lg"
                                className="rounded-full bg-white/[0.06] text-stone-100 ring-white/10 hover:bg-white/[0.12]"
                            >
                                Inspect on GitHub
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
                                            className="outline-focus-ring rounded-full text-[13px] font-medium uppercase tracking-[0.16em] text-stone-400 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
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
                                        className="outline-focus-ring inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-stone-300 transition-[background-color,transform,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-white/[0.12] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                                    >
                                        <Icon size={18} aria-hidden="true" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="relative mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-stone-500 md:flex-row md:items-center md:justify-between">
                    <p className="font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-[0.2em] text-stone-500">
                        &copy; 2026 SmartPockets &middot; v0.1 alpha
                    </p>
                    <p className="text-xs text-stone-500">
                        Crafted by <span className="text-stone-300">CrowDevelopment</span> for people who keep more than one wallet open.
                    </p>
                </div>
            </div>
        </footer>
    );
};

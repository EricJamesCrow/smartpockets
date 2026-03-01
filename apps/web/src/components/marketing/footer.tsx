import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { SmartPocketsLogo } from "@repo/ui/untitledui/foundations/logo/smartpockets-logo";
import { GitHub, LinkedIn, X } from "@repo/ui/untitledui/foundations/social-icons/index";
import { TextType } from "@/components/ui/text-type";

const footerSocials = [
    { label: "X (formerly Twitter)", icon: X, href: "https://x.com/ericjamescrow" },
    { label: "LinkedIn", icon: LinkedIn, href: "https://www.linkedin.com/in/ericcrow/" },
    { label: "GitHub", icon: GitHub, href: "https://github.com/EricJamesCrow" },
];

const footerLinks = [
    { title: "Overview", href: "/" },
    { title: "Features", href: "/features" },
    { title: "Privacy", href: "/privacy" },
];

export const Footer = () => {
    return (
        <footer className="dark-mode bg-primary py-12 md:pt-16">
            <div className="max-w-container mx-auto px-4 md:px-8">
                <div className="flex flex-col justify-between gap-x-8 gap-y-12 lg:flex-row">
                    <div className="flex flex-col gap-8 md:items-start">
                        <div className="flex w-full flex-col gap-6 md:max-w-xs md:gap-8">
                            <SmartPocketsLogo size="lg" />
                            <p className="text-md text-tertiary">Smart credit card management for everyone.</p>
                        </div>
                        <nav>
                            <ul className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-[repeat(3,max-content)]">
                                {footerLinks.map((item) => (
                                    <li key={item.title}>
                                        <Button color="link-gray" size="lg" href={item.href}>
                                            {item.title}
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>

                    <div className="flex flex-col items-start md:items-end justify-end">
                        <p className="text-xs text-quaternary font-medium uppercase tracking-wider mb-0.5">Currently in development by</p>
                        <TextType
                            text="CrowDevelopment"
                            className="text-lg font-semibold tracking-tight text-white font-[family-name:var(--font-space-grotesk)]"
                            delay={2}
                            speed={0.08}
                            keepCursor
                        />
                    </div>
                </div>
                
                <div className="border-secondary mt-12 flex flex-col-reverse justify-between gap-6 border-t pt-8 md:mt-12 md:flex-row md:items-end">
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-quaternary">&copy; 2026 SmartPockets. All rights reserved.</p>
                    </div>

                    <ul className="flex gap-6 mt-2">
                        {footerSocials.map(({ label, icon: Icon, href }) => (
                            <li key={label}>
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-fg-quaternary outline-focus-ring hover:text-fg-quaternary_hover transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2"
                                >
                                    <Icon size={24} aria-label={label} />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </footer>
    );
};

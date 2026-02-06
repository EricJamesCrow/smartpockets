"use client";

import type { FC, FormEvent, ReactNode } from "react";
import { BadgeGroup } from "@repo/ui/untitledui/base/badges/badge-groups";
import { AppStoreButton, GooglePlayButton } from "@repo/ui/untitledui/base/buttons/app-store-buttons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { FeaturedIcon } from "@repo/ui/untitledui/foundations/featured-icon/featured-icon";
import { SmartPocketsLogo } from "@repo/ui/untitledui/foundations/logo/smartpockets-logo";
import { AngelList, Dribbble, Facebook, GitHub, Layers, LinkedIn, X } from "@repo/ui/untitledui/foundations/social-icons/index";
import { CreditCard } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";
import { cx } from "@repo/ui/utils";
import { ArrowRight, ChartBreakoutSquare, MessageChatCircle, MessageSmileCircle, Zap } from "@untitledui/icons";
import { Header } from "@/components/marketing/header-navigation/header";

const footerSocials = [
    { label: "X (formerly Twitter)", icon: X, href: "https://x.com/ericjamescrow" },
    { label: "LinkedIn", icon: LinkedIn, href: "https://www.linkedin.com/in/ericcrow/" },
    { label: "GitHub", icon: GitHub, href: "https://github.com/EricJamesCrow" },
];

const HeroCardMockup11 = () => {
    return (
        <div className="bg-primary relative overflow-hidden">
            <Header />

            <section className="lg:min-h-180 relative overflow-hidden py-16 lg:flex lg:py-0">
                <div className="max-w-container mx-auto w-full px-4 md:px-8">
                    <div className="flex flex-col items-start md:max-w-3xl lg:w-1/2 lg:pb-24 lg:pr-8 lg:pt-32">
                        <a href="#" className="outline-focus-ring rounded-[10px] focus-visible:outline-2 focus-visible:outline-offset-2">
                            <BadgeGroup className="hidden md:flex" size="lg" addonText="Early Access" iconTrailing={ArrowRight} theme="modern" color="brand">
                                Join our alpha
                            </BadgeGroup>
                            <BadgeGroup className="md:hidden" size="md" addonText="Early Access" iconTrailing={ArrowRight} theme="modern" color="brand">
                                Join our alpha
                            </BadgeGroup>
                        </a>

                        <h1 className="text-display-md text-primary md:text-display-lg lg:text-display-xl mt-4 font-semibold">Smart credit card management</h1>
                        <p className="text-tertiary mt-4 text-lg md:mt-6 md:max-w-lg md:text-xl">
                            Organize your credit cards into wallets, track spending, and never miss a payment. Take control of your finances.
                        </p>

                        <Form
                            onSubmit={(e: FormEvent<HTMLFormElement>) => {
                                e.preventDefault();
                                const data = Object.fromEntries(new FormData(e.currentTarget));
                                console.log("Form data:", data);
                            }}
                            className="md:max-w-120 mt-8 flex w-full flex-col items-stretch gap-4 md:mt-12 md:flex-row md:items-start"
                        >
                            <Input
                                isRequired
                                size="md"
                                name="email"
                                type="email"
                                wrapperClassName="py-0.5"
                                placeholder="Enter your email"
                                hint={
                                    <span>
                                        We care about your data in our{" "}
                                        <a
                                            href="/privacy"
                                            className="rounded-xs underline-offset-3 outline-focus-ring underline focus-visible:outline-2 focus-visible:outline-offset-2"
                                        >
                                            privacy policy
                                        </a>
                                        .
                                    </span>
                                }
                            />
                            <Button type="submit" size="xl">
                                Get started
                            </Button>
                        </Form>
                    </div>
                </div>
                <div className="bg-secondary md:h-95 relative mt-16 h-80 w-full px-4 md:px-8 lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:h-full lg:w-1/2 lg:px-0">
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden sm:pl-[30vw] lg:overflow-visible lg:pl-0">
                        <div
                            className="flex w-max flex-col gap-4 [transform:var(--transform-mobile)] lg:[transform:var(--transform-desktop)]"
                            style={
                                {
                                    "--transform-mobile": "scale(0.9) rotate(30deg) translate(30px, 80px)",
                                    "--transform-desktop": "rotate(30deg) translate(186px, 291px)",
                                } as React.CSSProperties
                            }
                        >
                            <div className="flex gap-4 pl-40">
                                <CreditCard type="brand-dark" cardHolder="Eric Crow" width={316} />
                                <CreditCard type="gray-dark" cardHolder="Eric Crow" width={316} />
                                <CreditCard type="brand-dark" cardHolder="Eric Crow" width={316} />
                            </div>
                            <div className="flex gap-4">
                                <CreditCard type="gradient-strip-vertical" cardHolder="Eric Crow" width={316} />
                                <CreditCard type="gradient-strip" cardHolder="Eric Crow" width={316} />
                                <CreditCard type="salmon-strip" cardHolder="Eric Crow" width={316} />
                            </div>
                            <div className="flex gap-4 pl-40">
                                <CreditCard type="gray-dark" cardHolder="Eric Crow" width={316} />
                                <CreditCard type="brand-dark" cardHolder="Eric Crow" width={316} />
                            </div>
                            <div className="flex gap-4">
                                <CreditCard type="salmon-strip" cardHolder="Eric Crow" width={316} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

const SocialProofFullWidth = () => {
    return (
        <section className="bg-secondary py-16 md:py-24">
            <div className="max-w-container mx-auto px-4 md:px-8">
                <div className="flex flex-col gap-8">
                    <p className="text-md text-tertiary text-center font-medium">Join 4,000+ companies already growing</p>
                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 xl:gap-x-6">
                        <img alt="Odeaolabs" src="https://www.untitledui.com/logos/logotype/color/odeaolabs.svg" className="h-9 md:h-12 dark:hidden" />
                        <img alt="Kintsugi" src="https://www.untitledui.com/logos/logotype/color/kintsugi.svg" className="h-9 md:h-12 dark:hidden" />
                        <img alt="Stackedlab" src="https://www.untitledui.com/logos/logotype/color/stackedlab.svg" className="h-9 md:h-12 dark:hidden" />
                        <img alt="Magnolia" src="https://www.untitledui.com/logos/logotype/color/magnolia.svg" className="h-9 md:h-12 dark:hidden" />
                        <img alt="Warpspeed" src="https://www.untitledui.com/logos/logotype/color/warpspeed.svg" className="h-9 md:h-12 dark:hidden" />
                        <img alt="Sisyphus" src="https://www.untitledui.com/logos/logotype/color/sisyphus.svg" className="h-9 md:h-12 dark:hidden" />
                        <img
                            alt="Odeaolabs"
                            src="https://www.untitledui.com/logos/logotype/white/odeaolabs.svg"
                            className="hidden h-9 opacity-85 md:h-12 dark:block"
                        />
                        <img
                            alt="Kintsugi"
                            src="https://www.untitledui.com/logos/logotype/white/kintsugi.svg"
                            className="hidden h-9 opacity-85 md:h-12 dark:block"
                        />
                        <img
                            alt="Stackedlab"
                            src="https://www.untitledui.com/logos/logotype/white/stackedlab.svg"
                            className="hidden h-9 opacity-85 md:h-12 dark:block"
                        />
                        <img
                            alt="Magnolia"
                            src="https://www.untitledui.com/logos/logotype/white/magnolia.svg"
                            className="hidden h-9 opacity-85 md:h-12 dark:block"
                        />
                        <img
                            alt="Warpspeed"
                            src="https://www.untitledui.com/logos/logotype/white/warpspeed.svg"
                            className="hidden h-9 opacity-85 md:h-12 dark:block"
                        />
                        <img
                            alt="Sisyphus"
                            src="https://www.untitledui.com/logos/logotype/white/sisyphus.svg"
                            className="hidden h-9 opacity-85 md:h-12 dark:block"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

interface TextCentered {
    title: string;
    subtitle: string;
    footer?: ReactNode;
}

interface FeatureTextIcon extends TextCentered {
    icon: FC<{ className?: string }>;
}

const FeatureTextFeaturedIconLeft = ({ icon, title, subtitle, footer }: FeatureTextIcon) => (
    <div className="max-w-140 flex gap-4">
        <FeaturedIcon icon={icon} size="lg" color="gray" theme="modern" className="hidden md:inline-flex" />
        <FeaturedIcon icon={icon} size="md" color="gray" theme="modern" className="inline-flex md:hidden" />

        <div className="flex flex-col items-start gap-4">
            <div>
                <h3 className="text-primary mt-1.5 text-lg font-semibold md:mt-2.5">{title}</h3>
                <p className="text-md text-tertiary mt-1">{subtitle}</p>
            </div>

            {footer}
        </div>
    </div>
);

const IconsAndMockup07 = () => {
    return (
        <section className="bg-primary overflow-hidden py-16 md:py-24">
            <div className="max-w-container mx-auto w-full px-4 md:px-8">
                <div className="flex w-full flex-col lg:max-w-3xl">
                    <span className="text-brand-secondary md:text-md text-sm font-semibold">Features</span>

                    <h2 className="text-display-sm text-primary md:text-display-md mt-3 font-semibold">Stop losing track of your cards</h2>
                    <p className="text-tertiary mt-4 text-lg md:mt-5 md:text-xl">
                        Organize cards into wallets, track balances, and get payment reminders. <br />
                        All your credit cards in one place.
                    </p>
                </div>

                <div className="mt-12 grid grid-cols-1 gap-12 md:mt-16 md:gap-16 lg:grid-cols-2 lg:items-center">
                    <ul className="grid grid-cols-1 gap-x-8 gap-y-10 md:gap-y-12">
                        {[
                            {
                                title: "Unlimited wallets",
                                subtitle:
                                    "Organize your cards into wallets that make sense for you. Travel cards, daily spend, rewards maximizers - you decide.",
                                icon: MessageChatCircle,
                            },
                            {
                                title: "Payment tracking",
                                subtitle: "Never miss a payment. Track due dates, minimum payments, and autopay status across all your cards.",
                                icon: Zap,
                            },
                            {
                                title: "Spending insights",
                                subtitle: "See where your money goes with automatic transaction categorization and spending breakdowns.",
                                icon: ChartBreakoutSquare,
                            },
                        ].map((item) => (
                            <li key={item.title}>
                                <FeatureTextFeaturedIconLeft
                                    icon={item.icon}
                                    title={item.title}
                                    subtitle={item.subtitle}
                                    footer={
                                        <Button color="link-color" size="lg" href="#" iconTrailing={ArrowRight}>
                                            Learn more
                                        </Button>
                                    }
                                />
                            </li>
                        ))}
                    </ul>

                    <div className="bg-tertiary md:h-120 lg:h-140 relative -mx-4 flex h-80 items-center justify-center md:mr-0 md:rounded-2xl">
                        <div className="-space-y-[146px] md:-translate-x-2 md:translate-y-3.5 md:-space-y-[126px]">
                            <div
                                className="z-4 relative [--scale:1.13] md:[--scale:1.641]"
                                style={{ transform: "scale(var(--scale)) rotateX(63deg) rotateY(1deg) rotateZ(51deg) skewX(14deg)" }}
                            >
                                <CreditCard type="transparent-gradient" cardHolder="Eric Crow" width={316} />
                            </div>
                            <div
                                className="z-3 relative [--scale:1.13] md:[--scale:1.641]"
                                style={{ transform: "scale(var(--scale)) rotateX(63deg) rotateY(1deg) rotateZ(51deg) skewX(14deg)" }}
                            >
                                <CreditCard type="brand-dark" cardHolder="Eric Crow" width={316} />
                            </div>
                            <div
                                className="z-2 relative [--scale:1.13] md:[--scale:1.641]"
                                style={{ transform: "scale(var(--scale)) rotateX(63deg) rotateY(1deg) rotateZ(51deg) skewX(14deg)" }}
                            >
                                <CreditCard type="transparent" cardHolder="Eric Crow" width={316} />
                            </div>
                            <div
                                className="z-1 relative [--scale:1.13] md:[--scale:1.641]"
                                style={{ transform: "scale(var(--scale)) rotateX(63deg) rotateY(1deg) rotateZ(51deg) skewX(14deg)" }}
                            >
                                <CreditCard type="gray-dark" cardHolder="Eric Crow" width={316} />
                            </div>
                            <div
                                className="relative z-0 [--scale:1.13] md:[--scale:1.641]"
                                style={{ transform: "scale(var(--scale)) rotateX(63deg) rotateY(1deg) rotateZ(51deg) skewX(14deg)" }}
                            >
                                <div className="h-47.5 w-79 rounded-2xl bg-gray-900 opacity-15 blur-md"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const FeatureTextFeaturedIconCard = ({ icon, title, subtitle, footer }: FeatureTextIcon) => (
    <div className="bg-secondary flex flex-col gap-12 p-5 md:inline-flex md:gap-16 md:p-6">
        <FeaturedIcon icon={icon} size="lg" color="brand" theme="dark" />

        <div className="flex flex-col gap-4">
            <div>
                <h3 className="text-primary text-lg font-semibold">{title}</h3>
                <p className="text-md text-tertiary mt-1">{subtitle}</p>
            </div>

            {footer}
        </div>
    </div>
);

const FeaturesIconCards01 = () => {
    return (
        <section className="bg-primary py-16 md:py-24">
            <div className="max-w-container mx-auto w-full px-4 md:px-8">
                <div className="flex w-full max-w-3xl flex-col">
                    <span className="text-brand-secondary md:text-md text-sm font-semibold">Why SmartPockets?</span>
                    <h2 className="text-display-sm text-primary md:text-display-md mt-3 font-semibold">Get your finances organized</h2>
                    <p className="text-tertiary mt-4 text-lg md:mt-5 md:text-xl">Finally, a simple way to track and organize all your credit cards.</p>
                </div>

                <div className="mt-12 md:mt-16">
                    <ul className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                title: "Connect your banks",
                                subtitle: "Securely connect your bank accounts with Plaid. Your cards sync automatically and stay up to date.",
                                icon: MessageChatCircle,
                            },
                            {
                                title: "Track due dates",
                                subtitle: "Never miss a payment with automatic due date tracking and smart reminders before payments are due.",
                                icon: Zap,
                            },
                            {
                                title: "Spending breakdown",
                                subtitle: "See exactly where your money goes with automatic categorization and visual spending reports.",
                                icon: ChartBreakoutSquare,
                            },
                            {
                                title: "Organize into wallets",
                                subtitle: "Group cards into custom wallets. Keep travel cards separate from daily drivers. Your cards, your way.",
                                icon: MessageSmileCircle,
                            },
                        ].map((item) => (
                            <li key={item.title}>
                                <FeatureTextFeaturedIconCard
                                    icon={item.icon}
                                    title={item.title}
                                    subtitle={item.subtitle}
                                    footer={
                                        <Button color="link-color" size="lg" href="#" iconTrailing={ArrowRight} className="hidden md:inline-flex">
                                            Learn more
                                        </Button>
                                    }
                                />
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
};

const NewsletterCardVertical = () => {
    return (
        <section className="bg-primary py-16 md:py-24">
            <div className="max-w-container mx-auto px-4 md:px-8">
                <div className="bg-secondary flex flex-col items-center rounded-2xl px-6 py-10 text-center lg:p-16">
                    <h2 className="text-display-sm text-primary xl:text-display-md font-semibold">
                        Still thinking <br className="md:hidden" /> about it?
                    </h2>
                    <p className="text-tertiary mt-4 text-lg md:mt-5 lg:text-xl">Sign up for our newsletter and get early access to new features.</p>
                    <Form
                        onSubmit={(e: FormEvent<HTMLFormElement>) => {
                            e.preventDefault();
                            const data = Object.fromEntries(new FormData(e.currentTarget));
                            console.log("Form data:", data);
                        }}
                        className="md:max-w-120 mt-8 flex w-full flex-col gap-4 md:flex-row"
                    >
                        <Input
                            isRequired
                            size="md"
                            name="email"
                            type="email"
                            placeholder="Enter your email"
                            wrapperClassName="py-0.5 md:max-w-[345px]"
                            hint={
                                <span>
                                    Read about our{" "}
                                    <a
                                        href="/privacy"
                                        className="rounded-xs underline-offset-3 outline-focus-ring underline focus-visible:outline-2 focus-visible:outline-offset-2"
                                    >
                                        privacy policy
                                    </a>
                                    .
                                </span>
                            }
                        />
                        <Button type="submit" size="xl">
                            Subscribe
                        </Button>
                    </Form>
                </div>
            </div>
        </section>
    );
};

const CTACardVerticalBrand = () => {
    return (
        <section className="bg-primary pb-16 md:pb-24">
            <div className="max-w-container mx-auto px-4 md:px-8">
                <div className="bg-brand-section flex flex-col items-center rounded-2xl px-6 py-10 text-center lg:p-16">
                    <h2 className="text-display-sm text-primary_on-brand xl:text-display-md font-semibold">
                        <span className="hidden md:inline">Start organizing your cards today</span>
                        <span className="md:hidden">Start organizing today</span>
                    </h2>
                    <p className="text-tertiary_on-brand mt-4 text-lg md:mt-5 lg:text-xl">Join the alpha and help shape the future of SmartPockets.</p>
                    <div className="mt-8 flex flex-col-reverse gap-3 self-stretch sm:flex-row sm:self-center">
                        <Button color="secondary" size="xl" className="shadow-xs! ring-0">
                            Learn more
                        </Button>
                        <Button href="/sign-up" size="xl">
                            Get started
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
};

const FooterLarge07 = () => {
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
                            <ul className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-[repeat(6,max-content)]">
                                {[
                                    { title: "Overview", href: "/" },
                                    { title: "Features", href: "/features" },
                                    { title: "Pricing", href: "/pricing" },
                                    { title: "Careers", href: "/careers" },
                                    { title: "Help", href: "/help" },
                                    { title: "Privacy", href: "/privacy" },
                                ].map((item) => (
                                    <li key={item.title}>
                                        <Button color="link-gray" size="lg" href={item.href}>
                                            {item.title}
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>

                    <div>
                        <h4 className="text-md text-brand-secondary font-medium">Get the app</h4>
                        <div className="mt-4 flex w-max flex-row gap-4 lg:flex-col">
                            <AppStoreButton href="#" className="w-[135px]" />
                            <GooglePlayButton href="#" className="w-[135px]" />
                        </div>
                    </div>
                </div>
                <div className="border-secondary mt-12 flex flex-col-reverse justify-between gap-6 border-t pt-8 md:mt-16 md:flex-row">
                    <p className="text-md text-quaternary">© 2026 SmartPockets. All rights reserved.</p>
                    <ul className="flex gap-6">
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

export default function HomePage() {
    return (
        <div className="bg-primary">
            <HeroCardMockup11 />
            <SocialProofFullWidth />
            <IconsAndMockup07 />
            <FeaturesIconCards01 />
            <NewsletterCardVertical />
            <CTACardVerticalBrand />
            <FooterLarge07 />
        </div>
    );
}

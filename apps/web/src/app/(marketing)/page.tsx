"use client";

import type { FC, FormEvent, ReactNode } from "react";
import { BadgeGroup } from "@repo/ui/untitledui/base/badges/badge-groups";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { FeaturedIcon } from "@repo/ui/untitledui/foundations/featured-icon/featured-icon";
import { CreditCard } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";
import { ArrowRight, ChartBreakoutSquare, MessageChatCircle, MessageSmileCircle, Zap } from "@untitledui/icons";
import { TextType } from "@/components/ui/text-type";
const HeroCardMockup11 = () => {
    return (
        <div className="bg-primary relative overflow-hidden">
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

                        <h1 className="text-display-md text-primary md:text-display-lg lg:text-display-xl mt-4 font-semibold">Open source personal finance for people who care.</h1>
                        <p className="text-tertiary mt-4 text-lg md:mt-6 md:max-w-lg md:text-xl">
                            The open source alternative to YNAB and Monarch. Built by a power user for those who want complete data ownership and intelligent tracking, without the subscription traps.
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
                <div className="flex flex-col items-center gap-6">
                    <p className="text-md text-tertiary text-center font-medium tracking-wide uppercase">Currently in development by</p>
                    <div className="flex flex-col items-center">
                        <TextType
                            text="CrowDevelopment"
                            className="text-display-md md:text-display-xl font-semibold tracking-tight text-primary font-[family-name:var(--font-space-grotesk)]"
                            delay={0.5}
                            speed={0.06}
                            keepCursor
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

                    <h2 className="text-display-sm text-primary md:text-display-md mt-3 font-semibold">Credit card management for power users</h2>
                    <p className="text-tertiary mt-4 text-lg md:mt-5 md:text-xl">
                        The foundation is built for those juggling multiple cards, optimizing rewards, and tracking complex utilization across banks.
                    </p>
                </div>

                <div className="mt-12 grid grid-cols-1 gap-12 md:mt-16 md:gap-16 lg:grid-cols-2 lg:items-center">
                    <ul className="grid grid-cols-1 gap-x-8 gap-y-10 md:gap-y-12">
                        {[
                            {
                                title: "Real-time Plaid sync",
                                subtitle:
                                    "Connect your banks to see every card's balance, APR, payment due date, and credit utilization — updated automatically.",
                                icon: MessageChatCircle,
                            },
                            {
                                title: "Wallet organization",
                                subtitle: "Group cards into custom wallets like \"Daily Drivers\" or \"Business\". Pin favorites and organize with drag-and-drop.",
                                icon: Zap,
                            },
                            {
                                title: "Card detail pages",
                                subtitle: "Track lock and autopay status, view full transaction history, and monitor utilization progress for every individual card.",
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
    <div className="bg-secondary flex h-full flex-col gap-12 p-5 md:gap-16 md:p-6">
        <div className="flex-shrink-0">
            <FeaturedIcon icon={icon} size="lg" color="brand" theme="dark" />
        </div>

        <div className="flex flex-1 flex-col gap-4">
            <div>
                <h3 className="text-primary text-lg font-semibold">{title}</h3>
                <p className="text-md text-tertiary mt-1">{subtitle}</p>
            </div>

            <div className="mt-auto">
                {footer}
            </div>
        </div>
    </div>
);

const FeaturesIconCards01 = () => {
    return (
        <section className="bg-primary py-16 md:py-24">
            <div className="max-w-container mx-auto w-full px-4 md:px-8">
                <div className="flex w-full max-w-3xl flex-col">
                    <span className="text-brand-secondary md:text-md text-sm font-semibold">Why SmartPockets?</span>
                    <h2 className="text-display-sm text-primary md:text-display-md mt-3 font-semibold">Own your data. Track your wealth.</h2>
                    <p className="text-tertiary mt-4 text-lg md:mt-5 md:text-xl">A fully open source platform designed as a power tool, not a lecture. No debt shaming, no data selling, no artificial feature gates.</p>
                </div>

                <div className="mt-12 md:mt-16">
                    <ul className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                title: "Open Source & Self-Hostable",
                                subtitle: "Not a subscription trap. Free to use, modify, and host yourself. The hosted version only covers real API costs—no artificial feature gates.",
                                icon: MessageChatCircle,
                            },
                            {
                                title: "Data Ownership",
                                subtitle: "We are not a data broker. Your financial data stays yours. No selling to advertisers, and no opaque \"anonymized\" aggregation.",
                                icon: Zap,
                            },
                            {
                                title: "Modern Tech Stack",
                                subtitle: "100% Convex-Native and Next.js. Zero API routes, real-time database subscriptions, and production-grade Plaid integration.",
                                icon: ChartBreakoutSquare,
                            },
                            {
                                title: "Built by users, for users",
                                subtitle: "Frustrated by expensive, unreliable alternatives, SmartPockets was built by a user managing 12+ cards who wanted something better.",
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
                        Tired of paying a premium <br className="md:hidden" /> to track your own money?
                    </h2>
                    <p className="text-tertiary mt-4 text-lg md:mt-5 lg:text-xl">Join our early access alpha. We're building the open source personal finance platform the community actually deserves.</p>
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
                        <span className="hidden md:inline">Take control of your finances today</span>
                        <span className="md:hidden">Take control today</span>
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

export default function HomePage() {
    return (
        <div className="bg-primary">
            <HeroCardMockup11 />
            <IconsAndMockup07 />
            <FeaturesIconCards01 />
            <NewsletterCardVertical />
            <CTACardVerticalBrand />
        </div>
    );
}

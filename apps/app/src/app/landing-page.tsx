"use client";

import type { FC, ReactNode } from "react";
import { ArrowRight, ChartBreakoutSquare, CheckCircle, LayersTwo01, MessageChatCircle, MessageSmileCircle, Zap } from "@untitledui/icons";
import { BadgeGroup } from "@repo/ui/untitledui/base/badges/badge-groups";
import { AppStoreButton, GooglePlayButton } from "@repo/ui/untitledui/base/buttons/app-store-buttons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { FeaturedIcon } from "@repo/ui/untitledui/foundations/featured-icon/featured-icon";
import { SmartPocketsLogo } from "@repo/ui/untitledui/foundations/logo";
import { AngelList, Dribbble, Facebook, GitHub, Layers, LinkedIn, X } from "@repo/ui/untitledui/foundations/social-icons";
import { Header } from "@/components/marketing/header-navigation/header";
import { CreditCard } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";
import { cx } from "@repo/ui/utils";

const footerSocials = [
    { label: "X (formerly Twitter)", icon: X, href: "https://x.com/" },
    { label: "LinkedIn", icon: LinkedIn, href: "https://www.linkedin.com/" },
    { label: "Facebook", icon: Facebook, href: "https://www.facebook.com/" },
    { label: "GitHub", icon: GitHub, href: "https://github.com/" },
    { label: "AngelList", icon: AngelList, href: "https://angel.co/" },
    { label: "Dribbble", icon: Dribbble, href: "https://dribbble.com/" },
    { label: "Layers", icon: Layers, href: "https://layers.com/" },
];

const HeroCardMockup11 = () => {
    return (
        <div className="relative overflow-hidden bg-primary">
            <Header />

            <section className="relative overflow-hidden py-16 lg:flex lg:min-h-180 lg:py-0">
                <div className="mx-auto w-full max-w-container px-4 md:px-8">
                    <div className="flex flex-col items-start md:max-w-3xl lg:w-1/2 lg:pt-32 lg:pr-8 lg:pb-24">
                        <a href="#" className="rounded-[10px] outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2">
                            <BadgeGroup className="hidden md:flex" size="lg" addonText="Early Access" iconTrailing={ArrowRight} theme="modern" color="brand">
                                Join our alpha
                            </BadgeGroup>
                            <BadgeGroup className="md:hidden" size="md" addonText="Early Access" iconTrailing={ArrowRight} theme="modern" color="brand">
                                Join our alpha
                            </BadgeGroup>
                        </a>

                        <h1 className="mt-4 text-display-md font-semibold text-primary md:text-display-lg lg:text-display-xl">Smart credit card management</h1>
                        <p className="mt-4 text-lg text-tertiary md:mt-6 md:max-w-lg md:text-xl">
                            Organize your credit cards into wallets, track spending, and never miss a payment. Take control of your finances.
                        </p>

                        <Form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const data = Object.fromEntries(new FormData(e.currentTarget));
                                console.log("Form data:", data);
                            }}
                            className="mt-8 flex w-full flex-col items-stretch gap-4 md:mt-12 md:max-w-120 md:flex-row md:items-start"
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
                                            href="#"
                                            className="rounded-xs underline underline-offset-3 outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
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
                <div className="relative mt-16 h-80 w-full bg-secondary px-4 md:h-95 md:px-8 lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:h-full lg:w-1/2 lg:px-0">
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden sm:pl-[30vw] lg:overflow-visible lg:pl-0">
                        <div
                            className="flex w-max [transform:var(--transform-mobile)] flex-col gap-4 lg:[transform:var(--transform-desktop)]"
                            style={
                                {
                                    "--transform-mobile": "scale(0.9) rotate(30deg) translate(30px, 80px)",
                                    "--transform-desktop": "rotate(30deg) translate(186px, 291px)",
                                } as React.CSSProperties
                            }
                        >
                            <div className="flex gap-4 pl-40">
                                <CreditCard type="brand-dark" cardHolder="Phoenix baker" />
                                <CreditCard type="gray-dark" cardHolder="Phoenix baker" />
                                <CreditCard type="brand-dark" cardHolder="Phoenix baker" />
                            </div>
                            <div className="flex gap-4">
                                <CreditCard type="gradient-strip-vertical" cardHolder="Phoenix baker" />
                                <CreditCard type="gradient-strip" cardHolder="Phoenix baker" />
                                <CreditCard type="salmon-strip" cardHolder="Phoenix baker" />
                            </div>
                            <div className="flex gap-4 pl-40">
                                <CreditCard type="gray-dark" cardHolder="Phoenix baker" />
                                <CreditCard type="brand-dark" cardHolder="Phoenix baker" />
                            </div>
                            <div className="flex gap-4">
                                <CreditCard type="salmon-strip" cardHolder="Phoenix baker" />
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
            <div className="mx-auto max-w-container px-4 md:px-8">
                <div className="flex flex-col gap-8">
                    <p className="text-center text-md font-medium text-tertiary">Join 4,000+ companies already growing</p>
                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 xl:gap-x-6">
                        {/* Light mode images (hidden in dark mode) */}
                        <img alt="Odeaolabs" src="https://www.untitledui.com/logos/logotype/color/odeaolabs.svg" className="h-9 md:h-12 dark:hidden" />
                        <img alt="Kintsugi" src="https://www.untitledui.com/logos/logotype/color/kintsugi.svg" className="h-9 md:h-12 dark:hidden" />
                        <img alt="Stackedlab" src="https://www.untitledui.com/logos/logotype/color/stackedlab.svg" className="h-9 md:h-12 dark:hidden" />
                        <img alt="Magnolia" src="https://www.untitledui.com/logos/logotype/color/magnolia.svg" className="h-9 md:h-12 dark:hidden" />
                        <img alt="Warpspeed" src="https://www.untitledui.com/logos/logotype/color/warpspeed.svg" className="h-9 md:h-12 dark:hidden" />
                        <img alt="Sisyphus" src="https://www.untitledui.com/logos/logotype/color/sisyphus.svg" className="h-9 md:h-12 dark:hidden" />

                        {/* Dark mode images (hidden in light mode) */}
                        <img
                            alt="Odeaolabs"
                            src="https://www.untitledui.com/logos/logotype/white/odeaolabs.svg"
                            className="h-9 opacity-85 not-dark:hidden md:h-12"
                        />
                        <img
                            alt="Kintsugi"
                            src="https://www.untitledui.com/logos/logotype/white/kintsugi.svg"
                            className="h-9 opacity-85 not-dark:hidden md:h-12"
                        />
                        <img
                            alt="Stackedlab"
                            src="https://www.untitledui.com/logos/logotype/white/stackedlab.svg"
                            className="h-9 opacity-85 not-dark:hidden md:h-12"
                        />
                        <img
                            alt="Magnolia"
                            src="https://www.untitledui.com/logos/logotype/white/magnolia.svg"
                            className="h-9 opacity-85 not-dark:hidden md:h-12"
                        />
                        <img
                            alt="Warpspeed"
                            src="https://www.untitledui.com/logos/logotype/white/warpspeed.svg"
                            className="h-9 opacity-85 not-dark:hidden md:h-12"
                        />
                        <img
                            alt="Sisyphus"
                            src="https://www.untitledui.com/logos/logotype/white/sisyphus.svg"
                            className="h-9 opacity-85 not-dark:hidden md:h-12"
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
    <div className="flex max-w-140 gap-4">
        <FeaturedIcon icon={icon} size="lg" color="gray" theme="modern" className="hidden md:inline-flex" />
        <FeaturedIcon icon={icon} size="md" color="gray" theme="modern" className="inline-flex md:hidden" />

        <div className="flex flex-col items-start gap-4">
            <div>
                <h3 className="mt-1.5 text-lg font-semibold text-primary md:mt-2.5">{title}</h3>
                <p className="mt-1 text-md text-tertiary">{subtitle}</p>
            </div>

            {footer}
        </div>
    </div>
);

const IconsAndMockup07 = () => {
    return (
        <section className="overflow-hidden bg-primary py-16 md:py-24">
            <div className="mx-auto w-full max-w-container px-4 md:px-8">
                <div className="flex w-full flex-col lg:max-w-3xl">
                    <span className="text-sm font-semibold text-brand-secondary md:text-md">Features</span>

                    <h2 className="mt-3 text-display-sm font-semibold text-primary md:text-display-md">Stop losing track of your cards</h2>
                    <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">
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
                                subtitle:
                                    "Never miss a payment. Track due dates, minimum payments, and autopay status across all your cards.",
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

                    <div className="relative -mx-4 flex h-80 items-center justify-center bg-tertiary md:mr-0 md:h-120 md:rounded-2xl lg:h-140">
                        <div className="-space-y-[146px] md:-translate-x-2 md:translate-y-3.5 md:-space-y-[126px]">
                            <div
                                className="relative z-4 [--scale:1.13] md:[--scale:1.641]"
                                style={{ transform: "scale(var(--scale)) rotateX(63deg) rotateY(1deg) rotateZ(51deg) skewX(14deg)" }}
                            >
                                <CreditCard type="transparent-gradient" cardHolder="Demi Wilkinson" />
                            </div>
                            <div
                                className="relative z-3 [--scale:1.13] md:[--scale:1.641]"
                                style={{ transform: "scale(var(--scale)) rotateX(63deg) rotateY(1deg) rotateZ(51deg) skewX(14deg)" }}
                            >
                                <CreditCard type="brand-dark" cardHolder="Lana Steiner" />
                            </div>
                            <div
                                className="relative z-2 [--scale:1.13] md:[--scale:1.641]"
                                style={{ transform: "scale(var(--scale)) rotateX(63deg) rotateY(1deg) rotateZ(51deg) skewX(14deg)" }}
                            >
                                <CreditCard type="transparent" cardHolder="OLIVIA RHYE" />
                            </div>
                            <div
                                className="relative z-1 [--scale:1.13] md:[--scale:1.641]"
                                style={{ transform: "scale(var(--scale)) rotateX(63deg) rotateY(1deg) rotateZ(51deg) skewX(14deg)" }}
                            >
                                <CreditCard type="gray-dark" cardHolder="Phoenix Baker" />
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

const CTAAbstractImages = () => {
    return (
        <section className="bg-secondary py-16 lg:py-24">
            <div className="mx-auto grid max-w-container grid-cols-1 gap-16 overflow-hidden px-4 md:px-8 lg:grid-cols-2 lg:items-center">
                <div className="flex max-w-3xl flex-col items-start">
                    <h2 className="text-display-sm font-semibold text-primary md:text-display-md lg:text-display-lg">No long-term contracts. No catches.</h2>
                    <p className="mt-4 text-lg text-tertiary md:mt-6 md:text-xl">Start your 30-day free trial today.</p>

                    <div className="mt-8 flex w-full flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-start md:mt-12">
                        <Button color="secondary" size="xl">
                            Learn more
                        </Button>
                        <Button size="xl">Get started</Button>
                    </div>
                </div>

                <div className="grid h-122 w-[150%] grid-cols-[repeat(12,1fr)] grid-rows-[repeat(12,1fr)] gap-2 justify-self-center sm:h-124 sm:w-[120%] md:w-auto md:gap-4">
                    <img
                        src="https://www.untitledui.com/marketing/abstract-image-01.webp"
                        className="size-full object-cover"
                        alt="Abstract geometric pattern with colorful spiral shapes"
                        style={{ gridArea: "3 / 3 / 7 / 7" }}
                    />
                    <img
                        src="https://www.untitledui.com/marketing/abstract-image-02.webp"
                        className="size-full object-cover"
                        alt="Modern abstract design with flowing curves and vibrant colors"
                        style={{ gridArea: "1 / 7 / 7 / 11" }}
                    />
                    <img
                        src="https://www.untitledui.com/marketing/abstract-image-03.webp"
                        className="size-full object-cover"
                        alt="Contemporary abstract artwork featuring dynamic shapes and gradients"
                        style={{ gridArea: "7 / 5 / 13 / 9" }}
                    />
                    <img
                        src="https://www.untitledui.com/marketing/abstract-image-04.webp"
                        className="size-full object-cover"
                        alt="Minimalist abstract composition with geometric elements"
                        style={{ gridArea: "7 / 9 / 10 / 13" }}
                    />
                    <img
                        src="https://www.untitledui.com/marketing/smiling-girl-2.webp"
                        className="size-full object-cover"
                        alt="Professional woman smiling confidently in business attire"
                        style={{ gridArea: "7 / 1 / 10 / 5" }}
                    />
                </div>
            </div>
        </section>
    );
};

const FeatureTextFeaturedIconCard = ({ icon, title, subtitle, footer }: FeatureTextIcon) => (
    <div className="flex flex-col gap-12 bg-secondary p-5 md:inline-flex md:gap-16 md:p-6">
        <FeaturedIcon icon={icon} size="lg" color="brand" theme="dark" />

        <div className="flex flex-col gap-4">
            <div>
                <h3 className="text-lg font-semibold text-primary">{title}</h3>
                <p className="mt-1 text-md text-tertiary">{subtitle}</p>
            </div>

            {footer}
        </div>
    </div>
);

const FeaturesIconCards01 = () => {
    return (
        <section className="bg-primary py-16 md:py-24">
            <div className="mx-auto w-full max-w-container px-4 md:px-8">
                <div className="flex w-full max-w-3xl flex-col">
                    <span className="text-sm font-semibold text-brand-secondary md:text-md">Why SmartPockets?</span>
                    <h2 className="mt-3 text-display-sm font-semibold text-primary md:text-display-md">Get your finances organized</h2>
                    <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">Finally, a simple way to track and organize all your credit cards.</p>
                </div>

                <div className="mt-12 md:mt-16">
                    <ul className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                title: "Connect your banks",
                                subtitle: "Securely connect your bank accounts with Plaid. Your cards sync automatically and stay up to date.",
                                icon: MessageChatCircle,
                                href: "#",
                            },
                            {
                                title: "Track due dates",
                                subtitle: "Never miss a payment with automatic due date tracking and smart reminders before payments are due.",
                                icon: Zap,
                                href: "#",
                            },
                            {
                                title: "Spending breakdown",
                                subtitle: "See exactly where your money goes with automatic categorization and visual spending reports.",
                                icon: ChartBreakoutSquare,
                                href: "#",
                            },
                            {
                                title: "Organize into wallets",
                                subtitle:
                                    "Group cards into custom wallets. Keep travel cards separate from daily drivers. Your cards, your way.",
                                icon: MessageSmileCircle,
                                href: "#",
                            },
                        ].map((item) => (
                            <li key={item.title}>
                                <FeatureTextFeaturedIconCard
                                    icon={item.icon}
                                    title={item.title}
                                    subtitle={item.subtitle}
                                    footer={
                                        <Button color="link-color" size="lg" href={item.href} iconTrailing={ArrowRight} className="hidden md:inline-flex">
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

const plans = [
    {
        title: "Free plan",
        subtitle: "$0/mth",
        description: "Forever free.",
        features: [
            "Up to 5 credit cards",
            "Basic spending insights",
            "Payment reminders",
            "1 wallet",
            "Community support",
        ],
        icon: Zap,
    },
    {
        title: "Pro plan",
        subtitle: "$5/mth",
        description: "Billed monthly.",
        features: ["Unlimited credit cards", "Advanced analytics", "Unlimited wallets", "Priority support", "Early access to features"],
        icon: LayersTwo01,
    },
];

const CheckItemText = (props: {
    size?: "sm" | "md" | "lg" | "xl";
    text?: string;
    color?: "primary" | "success";
    iconStyle?: "outlined" | "contained" | "filled";
    textClassName?: string;
}) => {
    const { text, color, size, iconStyle = "contained" } = props;

    return (
        <li className="flex gap-3">
            {iconStyle === "contained" && (
                <div
                    className={cx(
                        "flex shrink-0 items-center justify-center rounded-full",
                        color === "success" ? "bg-success-secondary text-featured-icon-light-fg-success" : "bg-brand-primary text-featured-icon-light-fg-brand",
                        size === "lg" ? "size-7 md:h-8 md:w-8" : size === "md" ? "size-7" : "size-6",
                    )}
                >
                    <svg
                        width={size === "lg" ? 16 : size === "md" ? 15 : 13}
                        height={size === "lg" ? 14 : size === "md" ? 13 : 11}
                        viewBox="0 0 13 11"
                        fill="none"
                    >
                        <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M11.0964 0.390037L3.93638 7.30004L2.03638 5.27004C1.68638 4.94004 1.13638 4.92004 0.736381 5.20004C0.346381 5.49004 0.236381 6.00004 0.476381 6.41004L2.72638 10.07C2.94638 10.41 3.32638 10.62 3.75638 10.62C4.16638 10.62 4.55638 10.41 4.77638 10.07C5.13638 9.60004 12.0064 1.41004 12.0064 1.41004C12.9064 0.490037 11.8164 -0.319963 11.0964 0.380037V0.390037Z"
                            fill="currentColor"
                        />
                    </svg>
                </div>
            )}

            {iconStyle === "filled" && (
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-solid text-white">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                        <path d="M1.5 4L4.5 7L10.5 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            )}

            {iconStyle === "outlined" && (
                <CheckCircle
                    className={cx(
                        "shrink-0",
                        color === "success" ? "text-fg-success-primary" : "text-fg-brand-primary",
                        size === "lg" ? "size-7 md:h-8 md:w-8" : size === "md" ? "size-7" : "size-6",
                    )}
                />
            )}

            <span
                className={cx(
                    "text-tertiary",
                    size === "lg" ? "pt-0.5 text-lg md:pt-0" : size === "md" ? "pt-0.5 text-md md:pt-0 md:text-lg" : "text-md",
                    iconStyle === "filled" && "text-brand-secondary",
                    props.textClassName,
                )}
            >
                {text}
            </span>
        </li>
    );
};

interface PricingTierCardProps {
    icon: FC<{ className?: string }>;
    iconTheme?: "light" | "gradient" | "dark" | "outline" | "modern";
    iconColor?: "brand" | "gray" | "success" | "warning" | "error";
    title: string;
    subtitle: string;
    description?: string;
    features: string[];
    className?: string;
}

const PricingTierCardIcon = (props: PricingTierCardProps) => {
    return (
        <div className={cx("flex flex-col overflow-hidden rounded-2xl bg-primary shadow-lg ring-1 ring-secondary_alt", props.className)}>
            <div className="flex flex-col items-center px-6 pt-6 text-center md:px-8 md:pt-8">
                <FeaturedIcon icon={props.icon} color={props.iconColor || "brand"} theme={props.iconTheme || "light"} size="lg" />

                <h2 className="mt-4 text-xl font-semibold text-brand-secondary">{props.title}</h2>
                <p className="mt-2 text-display-md font-semibold text-primary md:text-display-lg">{props.subtitle}</p>
                <p className="mt-2 text-md text-tertiary">{props.description}</p>
            </div>

            <ul className="flex flex-col gap-4 px-6 pt-8 pb-6 md:p-8 md:pb-10">
                {props.features.map((feat) => (
                    <CheckItemText key={feat} text={feat} />
                ))}
            </ul>

            <div className="mt-auto flex flex-col gap-3 rounded-b-2xl border-t border-secondary bg-secondary px-6 pt-6 pb-8 md:p-8">
                <Button size="xl">Get started</Button>
            </div>
        </div>
    );
};

const PricingSectionFeaturedCards01 = () => {
    return (
        <section className="bg-secondary py-16 md:py-24">
            <div className="mx-auto max-w-container px-4 md:px-8">
                <div className="flex flex-col gap-12 md:gap-16 xl:flex-row">
                    <div className="w-full max-w-3xl xl:max-w-md">
                        <span className="block text-sm font-semibold text-brand-secondary md:text-md">Pricing</span>
                        <h2 className="mt-3 hidden text-display-sm font-semibold text-primary md:flex md:text-display-md">Simple, affordable pricing</h2>
                        <h2 className="mt-3 flex text-display-sm font-semibold text-primary md:hidden md:text-display-md">Simple pricing</h2>
                        <p className="mt-4 text-lg text-tertiary md:mt-5">Start free, upgrade when you need more. No hidden fees.</p>
                    </div>

                    <div className="grid w-full grid-cols-1 items-start gap-4 md:-ml-2 md:grid-cols-2 md:gap-8">
                        {plans.map((plan) => (
                            <PricingTierCardIcon key={plan.title} {...plan} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

const NewsletterCardVertical = () => {
    return (
        <section className="bg-primary py-16 md:py-24">
            <div className="mx-auto max-w-container px-4 md:px-8">
                <div className="flex flex-col items-center rounded-2xl bg-secondary px-6 py-10 text-center lg:p-16">
                    <h2 className="text-display-sm font-semibold text-primary xl:text-display-md">
                        Still thinking <br className="md:hidden" /> about it?
                    </h2>
                    <p className="mt-4 text-lg text-tertiary md:mt-5 lg:text-xl">Sign up for our newsletter and get early access to new features.</p>
                    <Form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const data = Object.fromEntries(new FormData(e.currentTarget));
                            console.log("Form data:", data);
                        }}
                        className="mt-8 flex w-full flex-col gap-4 md:max-w-120 md:flex-row"
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
                                        href="#"
                                        className="rounded-xs underline underline-offset-3 outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
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
            <div className="mx-auto max-w-container px-4 md:px-8">
                <div className="flex flex-col items-center rounded-2xl bg-brand-section px-6 py-10 text-center lg:p-16">
                    <h2 className="text-display-sm font-semibold text-primary_on-brand xl:text-display-md">
                        <span className="hidden md:inline">Start organizing your cards today</span>
                        <span className="md:hidden">Start organizing today</span>
                    </h2>
                    <p className="mt-4 text-lg text-tertiary_on-brand md:mt-5 lg:text-xl">Join the alpha and help shape the future of SmartPockets.</p>
                    <div className="mt-8 flex flex-col-reverse gap-3 self-stretch sm:flex-row sm:self-center">
                        <Button color="secondary" size="xl" className="shadow-xs! ring-0">
                            Learn more
                        </Button>
                        <Button size="xl">Get started</Button>
                    </div>
                </div>
            </div>
        </section>
    );
};

const FooterLarge07 = () => {
    return (
        <footer className="dark-mode bg-primary py-12 md:pt-16">
            <div className="mx-auto max-w-container px-4 md:px-8">
                <div className="flex flex-col justify-between gap-x-8 gap-y-12 lg:flex-row">
                    <div className="flex flex-col gap-8 md:items-start">
                        <div className="flex w-full flex-col gap-6 md:max-w-xs md:gap-8">
                            <SmartPocketsLogo size="lg" />
                            <p className="text-md text-tertiary">Smart credit card management for everyone.</p>
                        </div>
                        <nav>
                            <ul className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-[repeat(6,max-content)]">
                                {[
                                    { title: "Overview", href: "#" },
                                    { title: "Features", href: "#" },
                                    { title: "Pricing", href: "#" },
                                    { title: "Careers", href: "#" },
                                    { title: "Help", href: "#" },
                                    { title: "Privacy", href: "#" },
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
                        <h4 className="text-md font-medium text-brand-secondary">Get the app</h4>
                        <div className="mt-4 flex w-max flex-row gap-4 lg:flex-col">
                            <AppStoreButton href="#" className="w-[135px]" />
                            <GooglePlayButton href="#" className="w-[135px]" />
                        </div>
                    </div>
                </div>
                <div className="mt-12 flex flex-col-reverse justify-between gap-6 border-t border-secondary pt-8 md:mt-16 md:flex-row">
                    <p className="text-md text-quaternary">© 2026 SmartPockets. All rights reserved.</p>
                    <ul className="flex gap-6">
                        {footerSocials.map(({ label, icon: Icon, href }) => (
                            <li key={label}>
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
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

const LandingPage07 = () => {
    return (
        <div className="bg-primary">
            <HeroCardMockup11 />

            <SocialProofFullWidth />

            <IconsAndMockup07 />

            <CTAAbstractImages />

            <FeaturesIconCards01 />

            <PricingSectionFeaturedCards01 />

            <NewsletterCardVertical />

            <CTACardVerticalBrand />

            <FooterLarge07 />
        </div>
    );
};

export default LandingPage07;

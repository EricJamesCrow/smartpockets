"use client";

import type { CSSProperties, FC, FormEvent, ReactNode } from "react";
import { BadgeGroup } from "@repo/ui/untitledui/base/badges/badge-groups";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { FeaturedIcon } from "@repo/ui/untitledui/foundations/featured-icon/featured-icon";
import { CreditCard } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";
import { ArrowRight, ChartBreakoutSquare, MessageChatCircle, MessageSmileCircle, Zap } from "@untitledui/icons";
import { TextType } from "@/components/ui/text-type";

const grainStyle: CSSProperties = {
    backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
    backgroundSize: "180px 180px",
};

const Grain = ({ opacity = 0.06, className = "" }: { opacity?: number; className?: string }) => (
    <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 mix-blend-overlay ${className}`}
        style={{ ...grainStyle, opacity }}
    />
);

const HeroCardMockup11 = () => {
    return (
        <div className="bg-primary relative isolate overflow-hidden">
            {/* Ambient brand glow — top-right, behind the cards */}
            <div
                aria-hidden
                className="pointer-events-none absolute -top-32 right-[-10%] -z-10 h-[640px] w-[640px] rounded-full opacity-50 blur-3xl"
                style={{
                    background:
                        "radial-gradient(closest-side, rgba(22, 179, 100, 0.28), rgba(22, 179, 100, 0) 70%)",
                }}
            />
            {/* Cool secondary glow — left, behind the headline */}
            <div
                aria-hidden
                className="pointer-events-none absolute -bottom-40 left-[-15%] -z-10 h-[520px] w-[520px] rounded-full opacity-40 blur-3xl"
                style={{
                    background:
                        "radial-gradient(closest-side, rgba(13, 99, 140, 0.18), rgba(13, 99, 140, 0) 70%)",
                }}
            />
            <Grain opacity={0.05} className="-z-10" />

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

                        <h1
                            className="text-display-md text-primary md:text-display-lg lg:text-display-xl mt-4 font-semibold tracking-tight"
                            style={{ textWrap: "balance" } as CSSProperties}
                        >
                            Open source personal finance for people who care.
                        </h1>
                        <p
                            className="text-tertiary mt-4 text-lg md:mt-6 md:max-w-lg md:text-xl"
                            style={{ textWrap: "pretty" } as CSSProperties}
                        >
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

                {/* Card showcase — glass surface to give the floating cards a stage */}
                <div className="md:h-95 relative mt-16 h-80 w-full overflow-hidden lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:h-full lg:w-1/2 lg:overflow-visible">
                    {/* Frosted gradient base */}
                    <div
                        aria-hidden
                        className="absolute inset-0 lg:left-8"
                        style={{
                            background:
                                "linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(245,247,250,0.55) 50%, rgba(232,240,236,0.7) 100%)",
                        }}
                    />
                    {/* Inner highlight ring on desktop */}
                    <div
                        aria-hidden
                        className="absolute inset-0 hidden lg:block lg:left-8 ring-1 ring-inset ring-black/5"
                    />

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden sm:pl-[30vw] lg:overflow-visible lg:pl-0">
                        <div
                            className="flex w-max flex-col gap-4 [transform:var(--transform-mobile)] lg:[transform:var(--transform-desktop)]"
                            style={
                                {
                                    "--transform-mobile": "scale(0.9) rotate(30deg) translate(30px, 80px)",
                                    "--transform-desktop": "rotate(30deg) translate(186px, 291px)",
                                    filter: "drop-shadow(0 30px 40px rgba(8, 76, 46, 0.18)) drop-shadow(0 8px 12px rgba(10, 13, 18, 0.08))",
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
        <section className="bg-secondary relative overflow-hidden py-16 md:py-24">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/8 to-transparent"
            />
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
        <section className="bg-primary relative overflow-hidden py-16 md:py-24">
            <div className="max-w-container mx-auto w-full px-4 md:px-8">
                <div className="flex w-full flex-col lg:max-w-3xl">
                    <span className="text-brand-secondary md:text-md text-sm font-semibold tracking-wide uppercase">Features</span>

                    <h2
                        className="text-display-sm text-primary md:text-display-md mt-3 font-semibold tracking-tight"
                        style={{ textWrap: "balance" } as CSSProperties}
                    >
                        Credit card management for power users
                    </h2>
                    <p
                        className="text-tertiary mt-4 text-lg md:mt-5 md:text-xl"
                        style={{ textWrap: "pretty" } as CSSProperties}
                    >
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

                    {/* Mockup stage — overflow-hidden fixes mobile bleed; ambient brand glow + grain elevate it */}
                    <div className="md:h-120 lg:h-140 relative -mx-4 flex h-80 items-center justify-center overflow-hidden rounded-3xl md:mx-0 md:rounded-3xl">
                        <div
                            aria-hidden
                            className="absolute inset-0"
                            style={{
                                background:
                                    "linear-gradient(135deg, #f6f8fb 0%, #eef2f6 50%, #e8efe9 100%)",
                            }}
                        />
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 opacity-80"
                            style={{
                                background:
                                    "radial-gradient(60% 50% at 70% 30%, rgba(22, 179, 100, 0.18), transparent 65%)",
                            }}
                        />
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 opacity-70"
                            style={{
                                background:
                                    "radial-gradient(40% 40% at 20% 80%, rgba(13, 99, 140, 0.14), transparent 65%)",
                            }}
                        />
                        <Grain opacity={0.07} />
                        <div
                            aria-hidden
                            className="absolute inset-0 ring-1 ring-inset ring-black/5"
                        />

                        <div className="relative -space-y-[146px] md:-translate-x-2 md:translate-y-3.5 md:-space-y-[126px]">
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
    <div
        className="group relative flex h-full flex-col gap-12 overflow-hidden rounded-2xl bg-white/65 p-6 ring-1 ring-black/5 backdrop-blur-xl transition duration-300 ease-out hover:-translate-y-0.5 hover:ring-black/10 md:gap-16 md:p-7"
        style={{
            boxShadow:
                "0 1px 0 rgba(255,255,255,0.65) inset, 0 8px 24px -8px rgba(10, 13, 18, 0.08), 0 2px 6px -2px rgba(10, 13, 18, 0.05)",
        }}
    >
        {/* Subtle hover glow */}
        <div
            aria-hidden
            className="pointer-events-none absolute -inset-px opacity-0 transition duration-500 ease-out group-hover:opacity-100"
            style={{
                background:
                    "radial-gradient(60% 80% at 50% 0%, rgba(22, 179, 100, 0.18), transparent 70%)",
            }}
        />

        <div className="relative flex-shrink-0">
            <FeaturedIcon icon={icon} size="lg" color="brand" theme="dark" />
        </div>

        <div className="relative flex flex-1 flex-col gap-4">
            <div>
                <h3 className="text-primary text-lg font-semibold tracking-tight">{title}</h3>
                <p className="text-md text-tertiary mt-1" style={{ textWrap: "pretty" } as CSSProperties}>
                    {subtitle}
                </p>
            </div>

            <div className="mt-auto">
                {footer}
            </div>
        </div>
    </div>
);

const FeaturesIconCards01 = () => {
    return (
        <section className="bg-secondary relative overflow-hidden py-16 md:py-24">
            {/* Ambient brand wash */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-60"
                style={{
                    background:
                        "radial-gradient(60% 60% at 50% 0%, rgba(22, 179, 100, 0.12), transparent 70%)",
                }}
            />
            <Grain opacity={0.05} />

            <div className="max-w-container relative mx-auto w-full px-4 md:px-8">
                <div className="flex w-full max-w-3xl flex-col">
                    <span className="text-brand-secondary md:text-md text-sm font-semibold tracking-wide uppercase">Why SmartPockets?</span>
                    <h2
                        className="text-display-sm text-primary md:text-display-md mt-3 font-semibold tracking-tight"
                        style={{ textWrap: "balance" } as CSSProperties}
                    >
                        Own your data. Track your wealth.
                    </h2>
                    <p
                        className="text-tertiary mt-4 text-lg md:mt-5 md:text-xl"
                        style={{ textWrap: "pretty" } as CSSProperties}
                    >
                        A fully open source platform designed as a power tool, not a lecture. No debt shaming, no data selling, no artificial feature gates.
                    </p>
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
        <section className="bg-primary relative overflow-hidden py-16 md:py-24">
            <div className="max-w-container mx-auto px-4 md:px-8">
                <div
                    className="relative flex flex-col items-center overflow-hidden rounded-3xl px-6 py-12 text-center ring-1 ring-black/5 lg:p-16"
                    style={{
                        background:
                            "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(245,247,250,0.7) 100%)",
                        boxShadow:
                            "0 1px 0 rgba(255,255,255,0.7) inset, 0 24px 48px -16px rgba(10, 13, 18, 0.10), 0 4px 12px -4px rgba(10, 13, 18, 0.05)",
                    }}
                >
                    {/* Brand-tinted halo */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full opacity-70 blur-3xl"
                        style={{
                            background:
                                "radial-gradient(closest-side, rgba(22, 179, 100, 0.22), rgba(22, 179, 100, 0) 70%)",
                        }}
                    />
                    <Grain opacity={0.06} />

                    <h2
                        className="text-display-sm text-primary xl:text-display-md relative font-semibold tracking-tight"
                        style={{ textWrap: "balance" } as CSSProperties}
                    >
                        Tired of paying a premium <br className="md:hidden" /> to track your own money?
                    </h2>
                    <p
                        className="text-tertiary relative mt-4 max-w-xl text-lg md:mt-5 lg:text-xl"
                        style={{ textWrap: "pretty" } as CSSProperties}
                    >
                        Join our early access alpha. We're building the open source personal finance platform the community actually deserves.
                    </p>
                    <Form
                        onSubmit={(e: FormEvent<HTMLFormElement>) => {
                            e.preventDefault();
                            const data = Object.fromEntries(new FormData(e.currentTarget));
                            console.log("Form data:", data);
                        }}
                        className="md:max-w-120 relative mt-8 flex w-full flex-col gap-4 md:flex-row"
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
        <section className="bg-primary relative pb-16 md:pb-24">
            <div className="max-w-container mx-auto px-4 md:px-8">
                <div
                    className="relative flex flex-col items-center overflow-hidden rounded-3xl px-6 py-12 text-center lg:p-16"
                    style={{
                        background:
                            "linear-gradient(135deg, #084c2e 0%, #095c37 45%, #16b364 130%)",
                        boxShadow:
                            "0 1px 0 rgba(255,255,255,0.08) inset, 0 28px 64px -16px rgba(8, 76, 46, 0.45), 0 8px 16px -4px rgba(8, 76, 46, 0.25)",
                    }}
                >
                    {/* Soft mesh accent */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -top-32 right-[-15%] h-[420px] w-[420px] rounded-full opacity-60 blur-3xl"
                        style={{
                            background:
                                "radial-gradient(closest-side, rgba(115, 226, 163, 0.55), rgba(22, 179, 100, 0) 70%)",
                        }}
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -bottom-32 left-[-10%] h-[360px] w-[360px] rounded-full opacity-60 blur-3xl"
                        style={{
                            background:
                                "radial-gradient(closest-side, rgba(22, 179, 100, 0.5), rgba(22, 179, 100, 0) 70%)",
                        }}
                    />
                    <Grain opacity={0.08} />

                    <h2
                        className="text-display-sm text-primary_on-brand xl:text-display-md relative font-semibold tracking-tight"
                        style={{ textWrap: "balance" } as CSSProperties}
                    >
                        <span className="hidden md:inline">Take control of your finances today</span>
                        <span className="md:hidden">Take control today</span>
                    </h2>
                    <p
                        className="text-tertiary_on-brand relative mt-4 max-w-xl text-lg md:mt-5 lg:text-xl"
                        style={{ textWrap: "pretty" } as CSSProperties}
                    >
                        Join the alpha and help shape the future of SmartPockets.
                    </p>
                    <div className="relative mt-8 flex flex-col-reverse gap-3 self-stretch sm:flex-row sm:self-center">
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

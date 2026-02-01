import { Container, Html, Img, Preview, Row } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAlignedActions as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAlignedSocials as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

/**
 * Props for Mockup01 email template
 */
export interface Mockup01Props {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Hero image URL */
    heroImageUrl?: string;
    /** Custom headline */
    headline?: string;
    /** Custom body text */
    bodyText?: string;
    /** CTA URL */
    ctaUrl: string;
    /** CTA button text */
    ctaText?: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const Mockup01 = ({
    theme,
    heroImageUrl = "https://www.untitledui.com/images/email/mockup-01.webp",
    headline,
    bodyText,
    ctaUrl,
    ctaText = "Download now",
    brandConfig,
}: Mockup01Props) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const defaultHeadline = `Meet ${config.companyName}: a clean, modern UI kit for beautiful interfaces`;
    const defaultBodyText = `We're glad to have you onboard! You're already on your way to creating beautiful visual products.

Whether you're here for your brand, for a cause, or just for fun—welcome! If there's anything you need, we'll be here every step of the way.

Thanks,
The ${config.companyName} team`;

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>{headline || defaultHeadline}</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-secondary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Container align="left" className="max-w-full bg-primary px-6 py-8">
                            <Row className="mb-8 max-w-full">
                                <Img
                                    aria-hidden
                                    src={heroImageUrl}
                                    alt="Product mockup"
                                    className="w-full"
                                />
                            </Row>
                            <Row className="mb-6">
                                <Text className="text-display-xs font-semibold text-primary md:text-display-sm">
                                    {headline || defaultHeadline}
                                </Text>
                            </Row>
                            <Row className="mb-8">
                                <Text className="whitespace-pre-line text-sm text-tertiary md:text-md">
                                    {bodyText || defaultBodyText}
                                </Text>
                            </Row>

                            <Row>
                                <Button href={ctaUrl} className="pr-4">
                                    <span className="mr-2">{ctaText}</span>
                                    <Img
                                        aria-hidden
                                        src="https://www.untitledui.com/images/email/arrow-right.webp"
                                        alt="Arrow Right"
                                        className="inline size-5 align-middle opacity-70"
                                    />
                                </Button>
                            </Row>
                        </Container>
                        <Footer
                            companyName={config.companyName}
                            copyrightYear={config.copyrightYear}
                            legalLinks={config.legalLinks}
                        />
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

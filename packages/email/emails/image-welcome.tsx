import { Container, Html, Img, Preview, Row } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAligned as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

/**
 * Props for ImageWelcome email template
 */
export interface ImageWelcomeProps {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName?: string;
    /** Hero image URL */
    heroImageUrl?: string;
    /** Login/CTA URL */
    loginUrl: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const ImageWelcome = ({
    theme,
    recipientName,
    heroImageUrl = "https://www.untitledui.com/images/email/image-welcome.webp",
    loginUrl,
    brandConfig,
}: ImageWelcomeProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,";

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>Welcome to {config.companyName}!</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-secondary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Container align="left" className="max-w-full bg-primary px-6 py-8">
                            <Row className="mb-12 max-w-full">
                                <Img
                                    aria-hidden
                                    src={heroImageUrl}
                                    alt="Welcome"
                                    className="h-80 w-full"
                                />
                            </Row>
                            <Row className="mb-6">
                                <Text className="text-display-xs font-semibold text-primary md:text-display-sm">
                                    {greeting}
                                </Text>
                            </Row>
                            <Row className="mb-12">
                                <Text className="text-md text-tertiary md:text-lg">
                                    We're glad to have you onboard! You're already on your way to creating
                                    beautiful visual products.
                                    <br />
                                    <br />
                                    Whether you're here for your brand, for a cause, or just for fun—welcome!
                                    If there's anything you need, we'll be here every step of the way.
                                    <br />
                                    <br />
                                    Thanks,
                                    <br />
                                    The {config.companyName} team
                                </Text>
                            </Row>

                            <Button href={loginUrl}>
                                <Text className="text-md font-semibold">Log in</Text>
                            </Button>
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

import { Column, Container, Button as EmailButton, Html, Img, Preview, Row } from "@react-email/components";
import { Body } from "./_components/body";
import { CenterAlignedDivider as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { CenterAligned as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

/**
 * Props for Mockup02 email template
 */
export interface Mockup02Props {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName?: string;
    /** Hero image URL */
    heroImageUrl?: string;
    /** App Store URL */
    appStoreUrl?: string;
    /** Google Play URL */
    googlePlayUrl?: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const Mockup02 = ({
    theme,
    recipientName,
    heroImageUrl = "https://www.untitledui.com/images/email/mockup-02.webp",
    appStoreUrl,
    googlePlayUrl,
    brandConfig,
}: Mockup02Props) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const greeting = recipientName ? `Hi ${recipientName}, thanks` : "Thanks";

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>Welcome to {config.companyName}!</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-secondary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Container align="left" className="max-w-full bg-primary px-6 py-8">
                            <Row className="mb-8 max-w-full">
                                <Img
                                    aria-hidden
                                    src={heroImageUrl}
                                    alt="Mobile app mockup"
                                    className="w-full"
                                />
                            </Row>
                            <Row className="mb-4">
                                <Text className="text-center text-display-xs font-semibold text-primary md:text-display-sm">
                                    Welcome to {config.companyName}!
                                </Text>
                            </Row>
                            <Row className="mb-8">
                                <Text className="text-center text-md text-tertiary md:text-lg">
                                    {greeting} for checking out {config.companyName}. Get the most of{" "}
                                    {config.companyName} by installing our new mobile app.
                                </Text>
                            </Row>
                            {(appStoreUrl || googlePlayUrl) && (
                                <Row align="left" className="mb-8">
                                    {appStoreUrl && (
                                        <Column align="right" className="pr-1.5">
                                            <EmailButton aria-label="Download in App Store" href={appStoreUrl}>
                                                <Img
                                                    aria-hidden
                                                    src="https://www.untitledui.com/images/email/app-store.webp"
                                                    alt="App Store"
                                                    className="h-10"
                                                />
                                            </EmailButton>
                                        </Column>
                                    )}
                                    {googlePlayUrl && (
                                        <Column align="left" className="pl-1.5">
                                            <EmailButton
                                                aria-label="Download in Google Play"
                                                href={googlePlayUrl}
                                            >
                                                <Img
                                                    aria-hidden
                                                    src="https://www.untitledui.com/images/email/google-play.webp"
                                                    alt="Google play"
                                                    className="h-10"
                                                />
                                            </EmailButton>
                                        </Column>
                                    )}
                                </Row>
                            )}
                            <Row>
                                <Text className="text-center text-md text-tertiary md:text-lg">
                                    If you have any questions, just reply to this email—we'll be happy to
                                    hear from you!
                                </Text>
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

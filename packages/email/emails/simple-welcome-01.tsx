import { Container, Html, Preview } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAlignedLinks as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

/**
 * Props for SimpleWelcome01 email template
 */
export interface SimpleWelcome01Props {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName: string;
    /** URL for login button */
    loginUrl: string;
    /** Text for login button */
    loginButtonText?: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const SimpleWelcome01 = ({
    theme,
    recipientName = "there",
    loginUrl,
    loginButtonText = "Log in",
    brandConfig,
}: SimpleWelcome01Props) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const finalLoginUrl = loginUrl || config.appUrl || config.websiteUrl;

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>Welcome to {config.companyName}!</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header
                            logoUrl={config.logoUrl}
                            logoAlt={config.logoAlt}
                            homeUrl={config.websiteUrl}
                            navLinks={config.navLinks}
                        />
                        <Container align="left" className="max-w-full px-6 py-8">
                            <Text className="text-sm text-tertiary md:text-md">
                                Hi {recipientName},
                                <br />
                                <br />
                                We're glad to have you onboard! You're already on your way to creating beautiful visual products.
                                <br />
                                <br />
                                Whether you're here for your brand, for a cause, or just for fun—welcome! If there's anything you need, we'll be here every step
                                of the way.
                                <br />
                                <br />
                                Thanks,
                                <br />
                                The {config.companyName} team
                            </Text>
                            <Button href={finalLoginUrl} className="mt-8">
                                <Text className="text-md font-semibold">{loginButtonText}</Text>
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

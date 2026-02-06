import { Container, Html, Preview, Row, Section } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAligned as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

/**
 * Props for MagicLink email template
 */
export interface MagicLinkProps {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName?: string;
    /** Magic link URL for sign-in */
    magicLinkUrl: string;
    /** Link expiry time in minutes (Clerk default: 10) */
    expiryMinutes?: number;
    /** Text for the action button (e.g. "Sign in", "Sign up", "Verify email") */
    actionButtonText?: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const MagicLink = ({
    theme,
    recipientName,
    magicLinkUrl,
    expiryMinutes = 10,
    actionButtonText = "Sign in",
    brandConfig,
}: MagicLinkProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,";

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>Sign in to {config.companyName}</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Section align="left" className="max-w-full px-6 py-8">
                            <Row className="mb-6">
                                <Text className="text-tertiary">
                                    {greeting}
                                    <br />
                                    <br />
                                    Click the button below to sign in to your account. No password needed!
                                </Text>
                            </Row>
                            <Row className="mb-6">
                                <Button href={magicLinkUrl} className="mb-6">
                                    <Text className="text-md font-semibold">{actionButtonText}</Text>
                                </Button>
                            </Row>
                            <Row className="mb-6">
                                <Text className="text-md text-tertiary">
                                    This link will expire in {expiryMinutes} minutes. If you didn't request this email, you can safely ignore it.
                                </Text>
                            </Row>
                            <Row>
                                <Text className="text-md text-tertiary">
                                    Thanks,
                                    <br />
                                    The {config.companyName} team
                                </Text>
                            </Row>
                        </Section>
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

export default MagicLink;

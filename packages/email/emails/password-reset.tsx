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
 * Props for PasswordReset email template
 */
export interface PasswordResetProps {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName?: string;
    /** Password reset URL */
    resetUrl: string;
    /** Link expiry time in minutes */
    expiryMinutes?: number;
    /** Text for reset button */
    resetButtonText?: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const PasswordReset = ({
    theme,
    recipientName,
    resetUrl,
    expiryMinutes = 60,
    resetButtonText = "Reset password",
    brandConfig,
}: PasswordResetProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,";

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>Reset your password</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Section align="left" className="max-w-full px-6 py-8">
                            <Row className="mb-6">
                                <Text className="text-tertiary">
                                    {greeting}
                                    <br />
                                    <br />
                                    We received a request to reset your password. Click the button below to choose a new password:
                                </Text>
                            </Row>
                            <Row className="mb-6">
                                <Button href={resetUrl} className="mb-6">
                                    <Text className="text-md font-semibold">{resetButtonText}</Text>
                                </Button>
                            </Row>
                            <Row className="mb-6">
                                <Text className="text-md text-tertiary">
                                    This link will expire in {expiryMinutes} minutes. If you didn't request a password reset, you can safely ignore this email.
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

export default PasswordReset;

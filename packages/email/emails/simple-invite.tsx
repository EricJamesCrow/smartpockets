import { Container, Html, Preview } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAligned as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

/**
 * Props for SimpleInvite email template
 */
export interface SimpleInviteProps {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName: string;
    /** Name of the person who sent the invite */
    inviterName: string;
    /** Name of the organization/team */
    organizationName: string;
    /** URL for accepting the invite */
    acceptInviteUrl: string;
    /** Text for accept button */
    acceptButtonText?: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const SimpleInvite = ({
    theme,
    recipientName = "there",
    inviterName,
    organizationName,
    acceptInviteUrl,
    acceptButtonText = "Accept the invite",
    brandConfig,
}: SimpleInviteProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>{inviterName} invited you to join {organizationName}</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Container align="left" className="max-w-full px-6 py-8">
                            <Text className="text-md text-tertiary">
                                Hi {recipientName},
                                <br />
                                <br />
                                {inviterName} has invited you to join the team on <span className="text-md font-semibold">{organizationName}</span>.
                            </Text>
                            <Button href={acceptInviteUrl} className="my-6">
                                <Text className="text-md font-semibold">{acceptButtonText}</Text>
                            </Button>
                            <Text className="text-md text-tertiary">
                                Thanks,
                                <br />
                                The {config.companyName} team
                            </Text>
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

export default SimpleInvite;

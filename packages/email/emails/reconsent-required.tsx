import { Container, Html, Preview } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAlignedLinks as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

export interface ReconsentRequiredProps {
    theme?: "light" | "dark";
    firstName: string;
    institutionName: string;
    plaidItemId: string;
    reason: "ITEM_LOGIN_REQUIRED" | "PENDING_EXPIRATION";
    brandConfig?: Partial<EmailBrandConfig>;
}

export const ReconsentRequired = ({
    theme,
    firstName = "there",
    institutionName,
    plaidItemId,
    reason,
    brandConfig,
}: ReconsentRequiredProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const appUrl = config.appUrl ?? config.websiteUrl;

    const preview =
        reason === "ITEM_LOGIN_REQUIRED"
            ? "Your bank requires a fresh sign-in before we can sync transactions."
            : "Reconfirm access so your balances and transactions keep syncing.";

    const opening =
        reason === "ITEM_LOGIN_REQUIRED"
            ? `Your ${institutionName} connection needs a fresh sign-in. This happens when a bank rotates credentials, changes their security policy, or sees an unusual pattern. Until you reconnect, SmartPockets cannot sync new balances, statements, or transactions from ${institutionName}.`
            : `Your ${institutionName} connection will expire soon. Banks periodically require you to reauthorize third-party access. If you do not reauthorize, SmartPockets will stop syncing ${institutionName} data after the expiration date.`;

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>{preview}</Preview>
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
                                Hi {firstName},
                                <br />
                                <br />
                                {opening}
                            </Text>

                            <Container align="left" className="mt-6 max-w-full">
                                <Text className="text-md font-semibold">What happens next</Text>
                                <Text className="text-sm text-tertiary">
                                    &bull; Click the button below to open Settings &gt; Institutions.
                                </Text>
                                <Text className="text-sm text-tertiary">&bull; Find {institutionName} in the list.</Text>
                                <Text className="text-sm text-tertiary">
                                    &bull; Click Reconnect and sign in with your {institutionName} credentials.
                                </Text>
                                <Text className="text-sm text-tertiary">
                                    &bull; Balances resume syncing immediately after the reconnect completes.
                                </Text>
                            </Container>

                            <Text className="mt-6 text-xs text-tertiary">
                                Your credentials do not pass through SmartPockets. Plaid brokers the read-only connection.
                                SmartPockets only stores the encrypted access token.
                            </Text>

                            <Button
                                href={`${appUrl}/settings/institutions?reconnect=${encodeURIComponent(plaidItemId)}`}
                                className="mt-8"
                            >
                                <Text className="text-md font-semibold">Reconnect {institutionName}</Text>
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

ReconsentRequired.PreviewProps = {
    firstName: "Eric",
    institutionName: "Chase",
    plaidItemId: "plaid_item_abc",
    reason: "ITEM_LOGIN_REQUIRED",
} satisfies ReconsentRequiredProps;

export default ReconsentRequired;

import { Container, Html, Preview } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAlignedLinks as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

export interface ItemErrorPersistentProps {
    theme?: "light" | "dark";
    firstName: string;
    institutionName: string;
    plaidItemId: string;
    firstErrorAtLabel: string;
    lastSeenErrorAtLabel: string;
    errorCode: string;
    brandConfig?: Partial<EmailBrandConfig>;
}

export const ItemErrorPersistent = ({
    theme,
    firstName = "there",
    institutionName,
    plaidItemId,
    firstErrorAtLabel,
    lastSeenErrorAtLabel,
    errorCode,
    brandConfig,
}: ItemErrorPersistentProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const appUrl = config.appUrl ?? config.websiteUrl;
    const supportMailto = `mailto:${config.supportEmail}?subject=Item%20error%20${encodeURIComponent(plaidItemId)}`;

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>{`${institutionName} has been unreachable for 24 hours. Here is what might be happening.`}</Preview>
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
                                We have been unable to sync your {institutionName} connection since {firstErrorAtLabel}. That
                                is longer than the usual transient hiccup, so this message goes to you rather than sitting
                                silent in the logs.
                            </Text>

                            <Container align="left" className="mt-6 max-w-full">
                                <Text className="text-md font-semibold">What this usually means</Text>
                                <Text className="text-sm text-tertiary">
                                    &bull; {institutionName} might be doing scheduled maintenance.
                                </Text>
                                <Text className="text-sm text-tertiary">
                                    &bull; Your bank might have rotated its credentials internally.
                                </Text>
                                <Text className="text-sm text-tertiary">
                                    &bull; Plaid's connection to {institutionName} could be temporarily degraded.
                                </Text>
                                <Text className="text-sm text-tertiary">&bull; There could be a rate limit or throttling.</Text>
                            </Container>

                            <Container align="left" className="mt-6 max-w-full">
                                <Text className="text-md font-semibold">What to try</Text>
                                <Text className="text-sm text-tertiary">1. Open Settings &gt; Institutions.</Text>
                                <Text className="text-sm text-tertiary">2. Find {institutionName} in the list.</Text>
                                <Text className="text-sm text-tertiary">
                                    3. Click Refresh. If you see a reconnect prompt, complete it.
                                </Text>
                                <Text className="text-sm text-tertiary">
                                    4. If the refresh fails with the same error, wait a few hours and try again.
                                </Text>
                                <Text className="text-sm text-tertiary">
                                    5. If the error persists after 48 hours, you may want to remove and re-add the connection.
                                </Text>
                            </Container>

                            <Text className="mt-6 text-xs text-tertiary">
                                Last successful sync on file for {institutionName} was {lastSeenErrorAtLabel}. Recent
                                transactions from {institutionName} may be missing from SmartPockets until this resolves.
                            </Text>
                            <Text className="mt-2 text-xs text-tertiary">
                                Error code from Plaid: {errorCode}. If you contact support and want to share a reference,
                                include that code.
                            </Text>

                            <Button href={`${appUrl}/settings/institutions`} className="mt-8">
                                <Text className="text-md font-semibold">Open Settings &gt; Institutions</Text>
                            </Button>

                            <Text className="mt-4 text-sm text-tertiary">
                                Need help? <a href={supportMailto}>Email support</a>
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

ItemErrorPersistent.PreviewProps = {
    firstName: "Eric",
    institutionName: "Chase",
    plaidItemId: "plaid_item_abc",
    firstErrorAtLabel: "Saturday, April 19",
    lastSeenErrorAtLabel: "2 hours ago",
    errorCode: "ITEM_LOCKED",
} satisfies ItemErrorPersistentProps;

export default ItemErrorPersistent;

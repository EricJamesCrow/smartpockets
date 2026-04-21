import { Container, Html, Preview } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAlignedLinks as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

export interface WelcomeOnboardingProps {
    theme?: "light" | "dark";
    firstName: string;
    variant: "signup-only" | "plaid-linked";
    firstLinkedInstitutionName?: string;
    brandConfig?: Partial<EmailBrandConfig>;
}

export const WelcomeOnboarding = ({
    theme,
    firstName = "there",
    variant,
    firstLinkedInstitutionName,
    brandConfig,
}: WelcomeOnboardingProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const appUrl = config.appUrl ?? config.websiteUrl;

    const preview =
        variant === "plaid-linked"
            ? `Your cards from ${firstLinkedInstitutionName ?? "your bank"} are syncing. Here is a quick tour.`
            : "Link a bank in a few minutes and we will do the rest.";

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
                                {variant === "plaid-linked" ? (
                                    <>
                                        Your {firstLinkedInstitutionName ?? "bank"} account is connected and your cards are
                                        syncing. This usually completes in under a minute, then you will see balances, APRs,
                                        and statements in your dashboard.
                                        <br />
                                        <br />A few things the SmartPockets agent can do for you starting right now:
                                        <br />
                                        <br />
                                        &bull; Show me every Doordash charge this month.
                                        <br />
                                        &bull; Which of my cards has the earliest deferred interest expiration?
                                        <br />
                                        &bull; What did I spend on groceries last month, by card?
                                        <br />
                                        &bull; Remind me 30 days before my Citi promo expires.
                                        <br />
                                        <br />
                                        Just type a question on the home page. The agent will answer with live tables, charts,
                                        and cards backed by your actual data.
                                        <br />
                                        <br />
                                        If you manage more than one bank, connect the rest from Settings &gt; Institutions.
                                        SmartPockets is built for people who carry ten or more cards, so the more you link,
                                        the more useful the picture.
                                    </>
                                ) : (
                                    <>
                                        Welcome to SmartPockets. To start using the app, you need to connect at least one
                                        bank or credit card account so we have something to track.
                                        <br />
                                        <br />
                                        Connecting takes about a minute:
                                        <br />
                                        <br />
                                        1. Click the button below.
                                        <br />
                                        2. Pick your bank in the Plaid dialog.
                                        <br />
                                        3. Sign in with your existing bank credentials.
                                        <br />
                                        4. Come back to SmartPockets and your balances are already loading.
                                        <br />
                                        <br />
                                        Your credentials never touch our servers. We use Plaid, which brokers the read-only
                                        connection, and we store only the access tokens (encrypted at rest).
                                        <br />
                                        <br />
                                        When you are set up, the home page becomes an agentic chat surface: ask questions in
                                        plain English and get answers as tables, charts, and cards.
                                    </>
                                )}
                                <br />
                                <br />
                                Thanks,
                                <br />
                                The {config.companyName} team
                            </Text>
                            <Button
                                href={
                                    variant === "plaid-linked"
                                        ? appUrl
                                        : `${appUrl}/settings/institutions`
                                }
                                className="mt-8"
                            >
                                <Text className="text-md font-semibold">
                                    {variant === "plaid-linked" ? "Open SmartPockets" : "Connect a bank"}
                                </Text>
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

WelcomeOnboarding.PreviewProps = {
    firstName: "Eric",
    variant: "plaid-linked",
    firstLinkedInstitutionName: "Chase",
} satisfies WelcomeOnboardingProps;

export default WelcomeOnboarding;

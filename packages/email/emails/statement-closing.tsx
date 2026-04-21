import { Container, Html, Preview } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAlignedLinks as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

export interface StatementClosingProps {
    theme?: "light" | "dark";
    firstName: string;
    cadence: 3 | 1;
    cadenceLabel: string;
    statements: Array<{
        cardId: string;
        cardName: string;
        closingDate: string;
        projectedBalanceCents: number;
        minimumDueCents: number;
        dueDate: string;
        cardDetailUrl: string;
    }>;
    unsubscribeUrl?: string;
    preferencesUrl?: string;
    brandConfig?: Partial<EmailBrandConfig>;
}

const dollars = (cents: number) =>
    `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const StatementClosing = ({
    theme,
    firstName = "there",
    cadence,
    cadenceLabel,
    statements,
    unsubscribeUrl,
    preferencesUrl,
    brandConfig,
}: StatementClosingProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const appUrl = config.appUrl ?? config.websiteUrl;

    const preview =
        cadence === 3
            ? "A few days to pay down before closing balances set the statement."
            : "Your statement closes in a day. Here is what is on it.";

    const opening =
        cadence === 3
            ? "Heads up. These statements close in the next three days. Any payment you make before the closing date reduces the statement balance, which lowers reported utilization."
            : "These statements close tomorrow. Payments made after the closing date will apply to the next cycle.";

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
                                <Text className="text-md font-semibold">Closing {cadenceLabel}</Text>
                                {statements.map((row) => (
                                    <Text key={row.cardId} className="text-sm text-tertiary">
                                        {row.cardName}: closes {row.closingDate}, projected {dollars(row.projectedBalanceCents)}
                                        , minimum {dollars(row.minimumDueCents)} due {row.dueDate}
                                    </Text>
                                ))}
                            </Container>

                            <Text className="mt-6 text-xs text-tertiary">
                                For credit-reporting purposes, card issuers typically send the statement balance to the credit
                                bureaus. If you want to report a lower utilization, pay down the balance before the closing
                                date.
                            </Text>

                            {cadence === 1 && (
                                <Text className="mt-2 text-xs text-tertiary">
                                    If you pay the full statement balance on time each cycle, purchase transactions do not
                                    accrue interest. Cash advances and some promotional balances are excluded; see your card
                                    agreement for specifics.
                                </Text>
                            )}

                            <Button href={`${appUrl}/credit-cards`} className="mt-8">
                                <Text className="text-md font-semibold">See my statements</Text>
                            </Button>
                        </Container>
                        <Footer
                            companyName={config.companyName}
                            copyrightYear={config.copyrightYear}
                            legalLinks={{
                                ...config.legalLinks,
                                unsubscribe: unsubscribeUrl,
                                preferences: preferencesUrl,
                            }}
                        />
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

StatementClosing.PreviewProps = {
    firstName: "Eric",
    cadence: 3,
    cadenceLabel: "in 3 days",
    statements: [
        {
            cardId: "c1",
            cardName: "Chase Sapphire",
            closingDate: "2026-04-23",
            projectedBalanceCents: 124500,
            minimumDueCents: 3500,
            dueDate: "2026-05-18",
            cardDetailUrl: "https://app.smartpockets.com/credit-cards/c1",
        },
    ],
} satisfies StatementClosingProps;

export default StatementClosing;

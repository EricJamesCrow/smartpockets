import { Container, Html, Preview } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAlignedLinks as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

export interface WeeklyDigestProps {
    theme?: "light" | "dark";
    firstName: string;
    weekEndingLabel: string;
    topSpendByCategory: Array<{ category: string; amountCents: number; changeVsPriorWeekPct: number }>;
    upcomingStatements: Array<{ cardName: string; closingDate: string; projectedBalanceCents: number }>;
    activeAnomalies: Array<{ anomalyId: string; merchantName: string; amountCents: number; transactionUrl: string }>;
    expiringPromos: Array<{ promoId: string; cardName: string; expirationDate: string; balanceCents: number }>;
    expiringTrials: Array<{ merchantName: string; renewsOn: string }>;
    unsubscribeUrl?: string;
    preferencesUrl?: string;
    brandConfig?: Partial<EmailBrandConfig>;
}

const dollars = (cents: number) =>
    `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const WeeklyDigest = ({
    theme,
    firstName = "there",
    weekEndingLabel,
    topSpendByCategory,
    upcomingStatements,
    activeAnomalies,
    expiringPromos,
    expiringTrials,
    unsubscribeUrl,
    preferencesUrl,
    brandConfig,
}: WeeklyDigestProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const appUrl = config.appUrl ?? config.websiteUrl;
    const topCategory = topSpendByCategory[0]?.category ?? "This week";
    const preview =
        topSpendByCategory.length > 0
            ? `${topCategory} led your spend; ${expiringPromos.length} promos expire soon.`
            : `${upcomingStatements.length} statements close this week.`;

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
                                Here is what happened across your accounts this past week (ending {weekEndingLabel}).
                            </Text>

                            {topSpendByCategory.length > 0 && (
                                <Container align="left" className="mt-6 max-w-full">
                                    <Text className="text-md font-semibold">Top spend by category</Text>
                                    {topSpendByCategory.slice(0, 5).map((row) => (
                                        <Text key={row.category} className="text-sm text-tertiary">
                                            {row.category}: {dollars(row.amountCents)} ({row.changeVsPriorWeekPct > 0 ? "+" : ""}
                                            {row.changeVsPriorWeekPct.toFixed(0)}% vs prior week)
                                        </Text>
                                    ))}
                                </Container>
                            )}

                            {upcomingStatements.length > 0 && (
                                <Container align="left" className="mt-6 max-w-full">
                                    <Text className="text-md font-semibold">Closing this week</Text>
                                    {upcomingStatements.map((row) => (
                                        <Text key={row.cardName + row.closingDate} className="text-sm text-tertiary">
                                            {row.cardName}: closes {row.closingDate}, projected {dollars(row.projectedBalanceCents)}
                                        </Text>
                                    ))}
                                </Container>
                            )}

                            {activeAnomalies.length > 0 && (
                                <Container align="left" className="mt-6 max-w-full">
                                    <Text className="text-md font-semibold">Transactions worth a second look</Text>
                                    {activeAnomalies.map((row) => (
                                        <Text key={row.anomalyId} className="text-sm text-tertiary">
                                            &bull; {row.merchantName}: {dollars(row.amountCents)}
                                        </Text>
                                    ))}
                                    <Text className="text-sm text-tertiary">
                                        If any of these are expected, mark them so your digest does not flag them again.
                                    </Text>
                                </Container>
                            )}

                            {expiringPromos.length > 0 && (
                                <Container align="left" className="mt-6 max-w-full">
                                    <Text className="text-md font-semibold">
                                        Deferred interest and introductory rates expiring soon
                                    </Text>
                                    {expiringPromos.map((row) => (
                                        <Text key={row.promoId} className="text-sm text-tertiary">
                                            {row.cardName}: {dollars(row.balanceCents)} (expires {row.expirationDate})
                                        </Text>
                                    ))}
                                    <Text className="text-sm text-tertiary">
                                        Pay these balances before the expiration date to avoid retroactive interest.
                                    </Text>
                                </Container>
                            )}

                            {expiringTrials.length > 0 && (
                                <Container align="left" className="mt-6 max-w-full">
                                    <Text className="text-md font-semibold">Free trials renewing soon</Text>
                                    {expiringTrials.map((row) => (
                                        <Text key={row.merchantName + row.renewsOn} className="text-sm text-tertiary">
                                            {row.merchantName}: renews {row.renewsOn}
                                        </Text>
                                    ))}
                                </Container>
                            )}

                            <Text className="mt-8 text-sm text-tertiary">
                                Ask the agent follow-up questions anytime.
                            </Text>

                            <Button href={appUrl} className="mt-8">
                                <Text className="text-md font-semibold">Open the agent</Text>
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

WeeklyDigest.PreviewProps = {
    firstName: "Eric",
    weekEndingLabel: "April 20",
    topSpendByCategory: [
        { category: "Groceries", amountCents: 32400, changeVsPriorWeekPct: -12 },
        { category: "Dining", amountCents: 18900, changeVsPriorWeekPct: 4 },
    ],
    upcomingStatements: [
        { cardName: "Chase Sapphire", closingDate: "2026-04-25", projectedBalanceCents: 124500 },
    ],
    activeAnomalies: [
        {
            anomalyId: "anom_1",
            merchantName: "Unknown Charge",
            amountCents: 4599,
            transactionUrl: "https://app.smartpockets.com/transactions/tx_1",
        },
    ],
    expiringPromos: [
        { promoId: "p1", cardName: "Citi Double Cash", expirationDate: "2026-05-15", balanceCents: 250000 },
    ],
    expiringTrials: [{ merchantName: "Netflix", renewsOn: "2026-05-01" }],
} satisfies WeeklyDigestProps;

export default WeeklyDigest;

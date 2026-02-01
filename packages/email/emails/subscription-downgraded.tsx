import { Container, Html, Preview, Row, Section } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAligned as Header } from "./_components/header";
import { PlanComparison } from "./_components/pricing-table";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

/**
 * Props for SubscriptionDowngraded email template
 */
export interface SubscriptionDowngradedProps {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName?: string;
    /** Previous plan name */
    oldPlanName: string;
    /** Previous plan amount */
    oldPlanAmount: string;
    /** New plan name */
    newPlanName: string;
    /** New plan amount */
    newPlanAmount: string;
    /** Billing interval */
    interval?: "month" | "year";
    /** Effective date of change */
    effectiveDate?: string;
    /** URL to dashboard */
    dashboardUrl: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const SubscriptionDowngraded = ({
    theme,
    recipientName,
    oldPlanName,
    oldPlanAmount,
    newPlanName,
    newPlanAmount,
    interval = "month",
    effectiveDate,
    dashboardUrl,
    brandConfig,
}: SubscriptionDowngradedProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,";

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>Your plan has been changed to {newPlanName}</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Section align="left" className="max-w-full px-6 py-8">
                            <Row className="mb-6">
                                <Text className="text-tertiary">
                                    {greeting}
                                    <br />
                                    <br />
                                    Your subscription has been changed to <strong>{newPlanName}</strong>.
                                    {effectiveDate && (
                                        <> This change will take effect on {effectiveDate}.</>
                                    )}
                                </Text>
                            </Row>

                            <PlanComparison
                                oldPlan={{ name: oldPlanName, amount: oldPlanAmount }}
                                newPlan={{ name: newPlanName, amount: newPlanAmount }}
                                interval={interval}
                            />

                            <Row className="mb-6">
                                <Text className="text-tertiary">
                                    Some features from your previous plan may no longer be available. You can upgrade
                                    anytime from your dashboard.
                                </Text>
                            </Row>

                            <Row className="mb-6">
                                <Button href={dashboardUrl}>
                                    <Text className="text-md font-semibold">Go to dashboard</Text>
                                </Button>
                            </Row>

                            <Row>
                                <Text className="text-md text-tertiary">
                                    Your next billing amount will be {newPlanAmount}/{interval}.
                                    <br />
                                    <br />
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

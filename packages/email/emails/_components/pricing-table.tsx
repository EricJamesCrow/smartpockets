import { Column, Row, Section } from "@react-email/components";
import { Text } from "./text";

/**
 * Props for PricingTable component
 */
export interface PricingTableProps {
    /** Plan name */
    planName: string;
    /** Price amount (formatted, e.g., "$29") */
    amount: string;
    /** Billing interval */
    interval?: "month" | "year";
    /** List of features included in the plan */
    features?: string[];
    /** Whether to show the features list */
    showFeatures?: boolean;
}

/**
 * Reusable pricing table component for subscription emails.
 * Displays plan name, price, and optionally a list of features.
 */
export const PricingTable = ({
    planName,
    amount,
    interval = "month",
    features = [],
    showFeatures = true,
}: PricingTableProps) => {
    return (
        <Section className="my-6 rounded-lg border border-solid border-secondary bg-secondary p-6">
            <Row>
                <Column>
                    <Text className="m-0 text-lg font-semibold text-primary">{planName}</Text>
                </Column>
                <Column align="right">
                    <Text className="m-0 text-lg font-semibold text-primary">
                        {amount}
                        <span className="text-sm font-normal text-tertiary">/{interval}</span>
                    </Text>
                </Column>
            </Row>
            {showFeatures && features.length > 0 && (
                <Row className="mt-4">
                    <Column>
                        {features.map((feature, index) => (
                            <Text key={index} className="m-0 mb-2 text-sm text-tertiary">
                                &#10003; {feature}
                            </Text>
                        ))}
                    </Column>
                </Row>
            )}
        </Section>
    );
};

/**
 * Props for PlanComparison component
 */
export interface PlanComparisonProps {
    /** Previous plan details */
    oldPlan: {
        name: string;
        amount: string;
    };
    /** New plan details */
    newPlan: {
        name: string;
        amount: string;
    };
    /** Billing interval */
    interval?: "month" | "year";
}

/**
 * Component showing plan upgrade/downgrade comparison
 */
export const PlanComparison = ({
    oldPlan,
    newPlan,
    interval = "month",
}: PlanComparisonProps) => {
    return (
        <Section className="my-6">
            <Row>
                <Column className="w-[45%] rounded-lg border border-solid border-secondary bg-secondary p-4">
                    <Text className="m-0 mb-1 text-xs font-medium uppercase text-tertiary">Previous Plan</Text>
                    <Text className="m-0 text-md font-semibold text-primary">{oldPlan.name}</Text>
                    <Text className="m-0 text-sm text-tertiary">{oldPlan.amount}/{interval}</Text>
                </Column>
                <Column className="w-[10%] text-center">
                    <Text className="m-0 text-xl text-tertiary">&rarr;</Text>
                </Column>
                <Column className="w-[45%] rounded-lg border border-solid border-brand-secondary bg-brand-secondary/10 p-4">
                    <Text className="m-0 mb-1 text-xs font-medium uppercase text-brand-secondary">New Plan</Text>
                    <Text className="m-0 text-md font-semibold text-primary">{newPlan.name}</Text>
                    <Text className="m-0 text-sm text-tertiary">{newPlan.amount}/{interval}</Text>
                </Column>
            </Row>
        </Section>
    );
};

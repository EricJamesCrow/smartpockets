"use client";

import { useState, useMemo, useEffect } from "react";
import { usePlans, useSubscription, useCheckout } from "@clerk/nextjs/experimental";
import { LayersTwo01, LayersThree01, Zap } from "@untitledui/icons";
import type { FC } from "react";
import { toast } from "sonner";
import { IconNotification } from "@repo/ui/untitledui/application/notifications/notifications";
import { SectionHeader } from "@repo/ui/untitledui/application/section-headers/section-headers";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import * as RadioGroups from "@repo/ui/untitledui/base/radio-groups/radio-groups";

// Icon mapping for plan names to UntitledUI icons
const PLAN_ICON_MAP: Record<string, FC<{ className?: string }>> = {
    basic: LayersTwo01,
    starter: LayersTwo01,
    free: LayersTwo01,
    business: LayersThree01,
    pro: LayersThree01,
    premium: LayersThree01,
    enterprise: Zap,
    default: LayersTwo01,
};

const getPlanIcon = (planName: string): FC<{ className?: string }> => {
    const key = planName.toLowerCase();
    return PLAN_ICON_MAP[key] ?? PLAN_ICON_MAP["default"]!;
};

const formatPlanPrice = (fee: { amount: number; currency: string } | null | undefined): string => {
    if (!fee) return "$0";
    // Default to USD if currency is missing or invalid
    const currency = fee.currency && fee.currency.length === 3 ? fee.currency : "USD";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
    }).format(fee.amount / 100); // Clerk returns amounts in cents
};

export function BillingContent() {
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

    // Clerk Billing hooks
    const { data: plans, isLoading: plansLoading } = usePlans({ for: "user" });
    const { data: subscription } = useSubscription({ for: "user" });
    const { checkout } = useCheckout({
        planId: selectedPlanId ?? "",
        planPeriod: "month",
        for: "user",
    });
    const checkoutLoading = checkout.fetchStatus === "fetching";

    // Get current subscription item and plan
    const currentSubscriptionItem = subscription?.subscriptionItems?.[0];
    const currentPlan = currentSubscriptionItem?.plan;
    const currentPlanId = currentPlan?.id ?? null;

    // Initialize selection to current plan
    useEffect(() => {
        if (currentPlanId && !selectedPlanId) {
            setSelectedPlanId(currentPlanId);
        }
    }, [currentPlanId, selectedPlanId]);

    // Transform Clerk plans to RadioGroups.IconCard format
    const planItems = useMemo(() => {
        if (!plans) return [];
        return plans.map((plan) => ({
            value: plan.id,
            title: plan.name,
            price: formatPlanPrice(plan.fee),
            secondaryTitle: "per month",
            description: plan.description ?? "",
            icon: getPlanIcon(plan.name),
            badge: plan.id === currentPlanId ? "Current plan" : undefined,
        }));
    }, [plans, currentPlanId]);

    const handleConfirmChange = async () => {
        if (!selectedPlanId || selectedPlanId === currentPlanId) return;

        try {
            await checkout.start();
            toast.custom((t) => (
                <IconNotification
                    title="Subscription updated"
                    description="Your plan has been changed successfully."
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        } catch (error) {
            toast.custom((t) => (
                <IconNotification
                    title="Update failed"
                    description="Unable to change your plan. Please try again."
                    color="error"
                    onClose={() => toast.dismiss(t)}
                />
            ));
            setSelectedPlanId(currentPlanId);
        }
    };

    const hasChanges = selectedPlanId && selectedPlanId !== currentPlanId;

    // Loading state
    if (plansLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <p className="text-tertiary">Loading billing information...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            {/* Current subscription header */}
            {currentPlan && (
                <div className="px-4 lg:px-8">
                    <SectionHeader.Root className="border-none pb-0">
                        <SectionHeader.Group>
                            <div className="flex flex-1 flex-col gap-0.5">
                                <SectionHeader.Heading>Current plan</SectionHeader.Heading>
                                <SectionHeader.Subheading>
                                    {currentPlan.name} - {currentSubscriptionItem?.status}
                                </SectionHeader.Subheading>
                            </div>
                        </SectionHeader.Group>
                    </SectionHeader.Root>
                </div>
            )}

            {/* Plan selection */}
            <div className="px-4 lg:px-8">
                <RadioGroups.IconCard
                    aria-label="Billing plans"
                    value={selectedPlanId ?? undefined}
                    onChange={setSelectedPlanId}
                    items={planItems}
                    isDisabled={checkoutLoading}
                />
            </div>

            {/* Confirm button (only show when plan changed) */}
            {hasChanges && (
                <div className="flex justify-end gap-3 px-4 lg:px-8">
                    <Button
                        color="secondary"
                        size="md"
                        onClick={() => setSelectedPlanId(currentPlanId)}
                    >
                        Cancel
                    </Button>
                    <Button
                        color="primary"
                        size="md"
                        onClick={handleConfirmChange}
                        isDisabled={checkoutLoading}
                    >
                        {checkoutLoading ? "Processing..." : "Confirm change"}
                    </Button>
                </div>
            )}
        </div>
    );
}
